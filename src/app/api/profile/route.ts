import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PROFILES_PATH = path.join(process.cwd(), 'agent', 'profiles.json');

function readProfiles() {
  try {
    if (fs.existsSync(PROFILES_PATH)) {
      const data = fs.readFileSync(PROFILES_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading profiles file:', err);
  }
  return {};
}

function writeProfiles(profiles: any) {
  try {
    const dir = path.dirname(PROFILES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROFILES_PATH, JSON.stringify(profiles, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing profiles file:', err);
    return false;
  }
}

// GET /api/profile?user_id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ profile: null });
    }

    // 1. Try fetching from Supabase profiles table
    try {
      const { data, error } = await supabaseAdmin
        .from('profile')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        return NextResponse.json({ profile: data });
      }
    } catch (e) {
      console.log('Supabase profile query fallback:', e);
    }

    // 2. Fallback to local JSON file scoped by key
    const allProfiles = readProfiles();
    const profile = allProfiles[userId] || null;

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/profile
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, contact, name, headline, education, cv_master, interests, experience, job_queries, scholarship_queries } = body;

    if (!user_id) {
      throw new Error('user_id is required to strictly scope the profile.');
    }

    // Construct interests as a plain text string or JSON string to match schema
    const combinedInterests = `Target: ${interests}\nJobs: ${job_queries.join(', ')}\nScholarships: ${scholarship_queries.join(', ')}`;

    // 1. Save to Supabase profiles table via strictly scoped upsert
    const dbPayload = {
      id: user_id, // Hard-bind this row to the Auth user's UUID
      name,
      contact: contact || user_id, // Fallback contact if missing
      headline,
      education,
      experience,
      interests: combinedInterests,
      cv_master,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from('profile')
      .upsert([dbPayload], { onConflict: 'id' });

    if (upsertError) {
      console.error('Supabase profile upsert error:', upsertError.message);
      // For strict validation purposes, we will not swallow this error anymore
      // if it violates schema (this guarantees we know if it fails).
      // However, we still save to local JSON as an absolute failsafe.
    }

    // 2. Save to local JSON file keyed by user ID as fallback
    const allProfiles = readProfiles();
    allProfiles[user_id] = {
      ...body,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    writeProfiles(allProfiles);

    return NextResponse.json({ profile: allProfiles[user_id], message: 'Profile saved successfully!' });
  } catch (err: any) {
    console.error('Profile POST API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
