import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/profile?user_id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ profile: null });
    }

    // 1. Fetch from Supabase profiles table strictly
    const { data, error } = await supabaseAdmin
      .from('profile')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Supabase profile query error:', error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return NextResponse.json({ profile: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/profile
export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    // PostgreSQL does not support null characters (\u0000) in text fields.
    const cleanText = rawText.replace(/\u0000/g, '');
    const body = JSON.parse(cleanText);
    const { 
      user_id, contact, name, headline, education, cv_master, 
      interests, experience, job_queries, scholarship_queries,
      certifications, skills, project, location, search_preference,
      scheduled_scan_enabled
    } = body;

    if (!user_id) {
      throw new Error('user_id is required to strictly scope the profile.');
    }

    // Construct interests as a plain text string or JSON string to match schema
    const combinedInterests = `Target: ${interests || ''}\nJobs: ${(job_queries || []).join(', ')}\nScholarships: ${(scholarship_queries || []).join(', ')}`;

    // 1. Save to Supabase profiles table via strictly scoped upsert
    const dbPayload = {
      id: user_id, // Hard-bind this row to the Auth user's UUID
      name: name || '',
      contact: contact || user_id, // Fallback contact if missing to satisfy UNIQUE NOT NULL
      headline,
      education,
      certifications,
      skills,
      experience,
      project,
      interests: combinedInterests,
      location,
      search_preference: search_preference || 'both',
      scheduled_scan_enabled: scheduled_scan_enabled ?? false,
      cv_master,
      updated_at: new Date().toISOString(),
    };

    const { data, error: upsertError } = await supabaseAdmin
      .from('profile')
      .upsert([dbPayload], { onConflict: 'id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Supabase profile upsert error:', upsertError.message, upsertError.details);
      // Strictly enforce failure. Do NOT fall back. Throw 500 immediately.
      throw new Error(`Database Error: ${upsertError.message}`);
    }

    return NextResponse.json({ profile: data, message: 'Profile saved successfully!' });
  } catch (err: any) {
    console.error('Profile POST API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
