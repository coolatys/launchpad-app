import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

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

// GET /api/profile?user_id=...&userEmail=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userEmail = searchParams.get('userEmail');

    const key = (userId || userEmail || '').toLowerCase().trim();

    if (!key) {
      return NextResponse.json({ profile: null });
    }

    // 1. Try fetching from Supabase profiles table
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`user_id.eq.${key},contact.eq.${key}`)
        .maybeSingle();

      if (data) {
        return NextResponse.json({ profile: data });
      }
    } catch (e) {
      console.log('Supabase profile query fallback:', e);
    }

    // 2. Fallback to local JSON file scoped by key
    const allProfiles = readProfiles();
    const profile = allProfiles[key] || null;

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

    const key = (user_id || contact || 'default').toLowerCase().trim();

    // 1. Save to Supabase profiles table
    const dbPayload = {
      user_id: key,
      full_name: name,
      contact: contact,
      cv_text: cv_master,
      about_me: experience,
      interests: {
        raw: interests,
        job_queries,
        scholarship_queries
      },
      cv_parsed_data: {
        headline,
        education
      },
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabaseAdmin.from('profiles').upsert([dbPayload], { onConflict: 'user_id' });
    
    if (dbError) {
      console.error('Supabase profile upsert error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // 2. Save to local JSON file keyed by user ID/email as fallback
    const allProfiles = readProfiles();
    allProfiles[key] = {
      ...body,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    writeProfiles(allProfiles);

    return NextResponse.json({ profile: allProfiles[key], message: 'Profile saved successfully!' });
  } catch (err: any) {
    console.error('Profile POST API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
