import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the path to the local profiles file
const PROFILES_PATH = path.join(process.cwd(), 'agent', 'profiles.json');

// Helper to read profiles from JSON file
function readProfiles() {
  try {
    if (fs.existsSync(PROFILES_PATH)) {
      const data = fs.readFileSync(PROFILES_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading profiles file:', err);
  }
  return { user: {}, friend: {} };
}

// Helper to write profiles to JSON file
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

// GET /api/profile
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'user'; // 'user' or 'friend'
    
    const profiles = readProfiles();
    const profile = profiles[type] || {};

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/profile
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'user';
    
    const body = await request.json();
    const profiles = readProfiles();
    
    profiles[type] = {
      ...profiles[type],
      ...body,
    };
    
    const success = writeProfiles(profiles);
    if (!success) {
      return NextResponse.json({ error: 'Failed to write profiles JSON to disk' }, { status: 500 });
    }

    return NextResponse.json({ profile: profiles[type], message: 'Profile saved successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

