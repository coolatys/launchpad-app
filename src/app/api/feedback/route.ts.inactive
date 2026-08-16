import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

const FEEDBACK_PATH = path.join(process.cwd(), 'agent', 'feedback.json');

function readLocalFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_PATH)) {
      const data = fs.readFileSync(FEEDBACK_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading feedback file:', err);
  }
  return [];
}

function writeLocalFeedback(feedbackList: any[]) {
  try {
    const dir = path.dirname(FEEDBACK_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(feedbackList, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing feedback file:', err);
    return false;
  }
}

// GET /api/feedback - Retrieve all submitted tester feedback
export async function GET() {
  try {
    // Try Supabase first
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return NextResponse.json({ feedback: data });
    }

    // Fallback to local JSON storage
    const localData = readLocalFeedback();
    return NextResponse.json({ feedback: localData });
  } catch (err: any) {
    const localData = readLocalFeedback();
    return NextResponse.json({ feedback: localData });
  }
}

// POST /api/feedback - Submit new feedback from a tester
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, rating, type, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Feedback message is required' }, { status: 400 });
    }

    const newFeedback = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name?.trim() || 'Anonymous Tester',
      email: email?.trim() || 'N/A',
      rating: Number(rating) || 5,
      type: type || 'general',
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    // Try storing in Supabase
    let storedInSupabase = false;
    try {
      const { error } = await supabaseAdmin.from('feedback').insert([newFeedback]);
      if (!error) storedInSupabase = true;
    } catch (e) {
      console.log('Supabase feedback insert bypassed, using local storage fallback.');
    }

    // Always keep a local copy in feedback.json for offline reliability
    const localFeedback = readLocalFeedback();
    localFeedback.unshift(newFeedback);
    writeLocalFeedback(localFeedback);

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! It has been submitted successfully.',
      feedback: newFeedback,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
