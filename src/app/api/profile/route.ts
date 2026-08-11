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
        .from('profile')
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
    
    // Construct interests as a plain text string or JSON string to match schema
    const combinedInterests = `Target: ${interests}\nJobs: ${job_queries.join(', ')}\nScholarships: ${scholarship_queries.join(', ')}`;

    // 1. Save to Supabase profiles table
    const dbPayload = {
      name,
      contact: contact, // Using the raw contact
      headline,
      education,
      experience,
      interests: combinedInterests,
      cv_master,
      updated_at: new Date().toISOString(),
    };

    // Since there's no unique constraint on contact, we manually check and update/insert
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profile')
      .select('id')
      .eq('contact', key)
      .maybeSingle();

    if (checkError) {
      console.error('Supabase profile check error:', checkError);
    }

    if (existingProfile) {
      const { error: updateError } = await supabaseAdmin
        .from('profile')
        .update(dbPayload)
        .eq('id', existingProfile.id);
        
      if (updateError) {
        console.error(`Database update error: ${updateError.message}`);
      }
    } else {
      // The id column in this DB is an integer without auto-increment.
      // We must fetch the max ID and increment it manually.
      const { data: maxIdData } = await supabaseAdmin
        .from('profile')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
        
      let nextId = 1;
      if (maxIdData && maxIdData.length > 0 && maxIdData[0].id) {
        nextId = parseInt(maxIdData[0].id) + 1;
      }

      const { error: insertError } = await supabaseAdmin
        .from('profile')
        .insert([{ ...dbPayload, id: nextId }]);
        
      if (insertError) {
        console.error(`Database insert error: ${insertError.message}`);
      }
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
