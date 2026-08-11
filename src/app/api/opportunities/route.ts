import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { evaluateOpportunityFit } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';

const PROFILES_PATH = path.join(process.cwd(), 'agent', 'profiles.json');

// GET /api/opportunities - Fetch opportunities with status and profile filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'new';
    const userId = searchParams.get('userId') || searchParams.get('userEmail') || 'user';

    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('status', status)
      .order('fit_score', { ascending: false })
      .order('discovered_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch active applications to filter out already drafted opportunities
    const { data: apps } = await supabaseAdmin
      .from('applications')
      .select('opportunity_id');

    const draftedIds = new Set(apps?.map((a) => a.opportunity_id).filter(Boolean) || []);

    let filteredData = data || [];
    
    // Filter out already drafted/applied opportunities
    filteredData = filteredData.filter((opp) => !draftedIds.has(opp.id));

    // Filter strictly by user ID in dedupe_key
    if (userId && userId !== 'all') {
      const userKey = userId.toLowerCase().trim();
      filteredData = filteredData.filter((opp) => {
        if (!opp.dedupe_key) return false;
        return opp.dedupe_key.toLowerCase().includes(userKey);
      });
    } else {
      // Default to empty array for unauthenticated / new users
      filteredData = [];
    }

    return NextResponse.json({ opportunities: filteredData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/opportunities - Update status (e.g., dismiss or shortlist)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing opportunity ID or status' }, { status: 400 });
    }

    if (!['new', 'shortlisted', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ opportunity: data, message: `Opportunity moved to ${status}.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/opportunities - Add opportunity manually (form) and score it with Gemini
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kind, title, org, location, url, description, deadline, profileType } = body;

    if (!kind || !title || !org || !url) {
      return NextResponse.json({ error: 'Missing required fields (kind, title, org, url)' }, { status: 400 });
    }

    const targetProfile = profileType || 'user';

    // 1. Fetch local profile to run fit evaluation
    let profile: any = null;
    try {
      if (fs.existsSync(PROFILES_PATH)) {
        const profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
        profile = profiles[targetProfile];
      }
    } catch (err) {
      console.error('Error loading local profile for manual entry:', err);
    }

    let fit_score = 70; // default fallback
    let fit_reasons = 'Added manually by candidate.';

    if (profile) {
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

      try {
        const evaluation = await evaluateOpportunityFit(
          profileContext,
          title,
          org,
          description || 'No description provided.'
        );
        fit_score = evaluation.fit_score;
        fit_reasons = evaluation.fit_reasons.join('\n');
      } catch (err) {
        console.error('Error scoring manual opportunity with Gemini:', err);
      }
    }

    // Generate a unique dedupe key with profile prefix for manual entry
    const timestampHash = Math.random().toString(36).substr(2, 9);
    const dedupe_key = `${targetProfile}:manual:${timestampHash}`;

    // 2. Insert manual opportunity
    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .insert([{
        kind,
        title,
        org,
        location: location || 'Remote/Unknown',
        url,
        description: description || 'No details provided.',
        deadline: deadline || 'N/A',
        provider: 'manual',
        fit_score,
        fit_reasons,
        dedupe_key,
        status: 'new',
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ opportunity: data, message: 'Manual opportunity added and scored successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

