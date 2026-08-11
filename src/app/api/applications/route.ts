import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { tailorApplication } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';

const PROFILES_PATH = path.join(process.cwd(), 'agent', 'profiles.json');

// GET /api/applications - Get applications in pipeline for specific authenticated user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || searchParams.get('user_id') || searchParams.get('userId') || '';

    if (!userEmail) {
      return NextResponse.json({ applications: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*, opportunities(dedupe_key)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userKey = userEmail.toLowerCase().trim();
    const userApps = (data || []).filter((app) => {
      if (app.user_id && app.user_id.toLowerCase().trim() === userKey) return true;
      const dedupeKey = app.opportunities?.dedupe_key || '';
      return dedupeKey.toLowerCase().includes(userKey);
    });

    return NextResponse.json({ applications: userApps });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/applications - Trigger Gemini tailoring and move opportunity to applications
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: 'Missing opportunity ID' }, { status: 400 });
    }

    // 1. Fetch opportunity details
    const { data: opp, error: oppError } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opp) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Determine profile type from dedupe_key prefix
    const ownerType = (opp.dedupe_key && opp.dedupe_key.startsWith('friend:')) ? 'friend' : 'user';

    // 2. Fetch local profile details
    let profile: any = null;
    try {
      if (fs.existsSync(PROFILES_PATH)) {
        const profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
        profile = profiles[ownerType];
      }
    } catch (err) {
      console.error('Error loading local profile for tailoring:', err);
    }

    if (!profile) {
      return NextResponse.json({ error: `Profile '${ownerType}' not configured in profiles.json.` }, { status: 400 });
    }

    const profileContext = `
Name: ${profile.name}
Headline: ${profile.headline || 'N/A'}
Skills: ${profile.skills || 'N/A'}
Experience: ${profile.experience || 'N/A'}
Education: ${profile.education || 'N/A'}
Certifications: ${profile.certifications || 'N/A'}
Projects: ${profile.project || 'N/A'}
Interests: ${profile.interests || 'N/A'}
Master CV: ${profile.cv_master || 'N/A'}
`.trim();

    // 3. Call Gemini to tailor application
    const tailoring = await tailorApplication(
      profileContext,
      opp.title,
      opp.org,
      opp.description || ''
    );

    // 4. Check if an application already exists for this opportunity
    const { data: existingApp } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    let appData;

    if (existingApp) {
      // Update existing application
      const { data, error } = await supabaseAdmin
        .from('applications')
        .update({
          tailored_summary: tailoring.tailored_summary,
          tailored_bullets: tailoring.tailored_bullets.join('\n'),
          tailored_letter: tailoring.tailored_letter,
          status: 'drafted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingApp.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      appData = data;
    } else {
      // Insert new application
      const { data, error } = await supabaseAdmin
        .from('applications')
        .insert([{
          opportunity_id: opportunityId,
          title: opp.title,
          org: opp.org,
          kind: opp.kind,
          url: opp.url,
          deadline: opp.deadline || 'N/A',
          tailored_summary: tailoring.tailored_summary,
          tailored_bullets: tailoring.tailored_bullets.join('\n'),
          tailored_letter: tailoring.tailored_letter,
          status: 'drafted',
          notes: '',
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      appData = data;
    }

    // 5. Update opportunity status to shortlisted (ensures it is tracked)
    await supabaseAdmin
      .from('opportunities')
      .update({ status: 'shortlisted' })
      .eq('id', opportunityId);

    return NextResponse.json({
      application: appData,
      message: 'Tailored application materials drafted successfully!',
    });
  } catch (err: any) {
    console.error('Error tailoring application:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/applications - Update application details (status, notes, etc.)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, notes, tailored_summary, tailored_bullets, tailored_letter } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing application ID' }, { status: 400 });
    }

    const updateFields: any = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) {
      if (!['to_apply', 'drafted', 'submitted', 'interview', 'offer', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid application status value' }, { status: 400 });
      }
      updateFields.status = status;
    }
    
    if (notes !== undefined) updateFields.notes = notes;
    if (tailored_summary !== undefined) updateFields.tailored_summary = tailored_summary;
    if (tailored_bullets !== undefined) updateFields.tailored_bullets = tailored_bullets;
    if (tailored_letter !== undefined) updateFields.tailored_letter = tailored_letter;

    const { data, error } = await supabaseAdmin
      .from('applications')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ application: data, message: 'Application updated.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/applications - Delete application and revert opportunity if applicable
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing application ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Application removed from pipeline.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
