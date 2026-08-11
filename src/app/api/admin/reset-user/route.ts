import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

const PROFILES_PATH = path.join(process.cwd(), 'agent', 'profiles.json');

// POST /api/admin/reset-user
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userEmail = (body.email || body.user_id || '').toLowerCase().trim();

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing target user email/id to reset.' }, { status: 400 });
    }

    // 1. Delete from Supabase tables
    try {
      await supabaseAdmin.from('profile').delete().or(`user_id.eq.${userEmail},contact.eq.${userEmail}`);
      await supabaseAdmin.from('user_matches').delete().eq('user_id', userEmail);
      await supabaseAdmin.from('scan_runs').delete().eq('user_id', userEmail);
      await supabaseAdmin.from('applications').delete().filter('opportunities.dedupe_key', 'ilike', `%${userEmail}%`);
      
      // Delete opportunities containing userEmail in dedupe_key
      const { data: opps } = await supabaseAdmin.from('opportunities').select('id, dedupe_key');
      const oppsToDelete = (opps || []).filter((o) => o.dedupe_key && o.dedupe_key.toLowerCase().includes(userEmail)).map((o) => o.id);
      if (oppsToDelete.length > 0) {
        await supabaseAdmin.from('opportunities').delete().in('id', oppsToDelete);
      }
    } catch (e) {
      console.error('Supabase user reset error:', e);
    }

    // 2. Clear from local profiles.json file
    try {
      if (fs.existsSync(PROFILES_PATH)) {
        const profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
        if (profiles[userEmail]) {
          delete profiles[userEmail];
          fs.writeFileSync(PROFILES_PATH, JSON.stringify(profiles, null, 2), 'utf8');
        }
      }
    } catch (e) {
      console.error('Local JSON user reset error:', e);
    }

    return NextResponse.json({
      success: true,
      message: `All profiles, onboarding, scan_runs, and match data for ${userEmail} have been completely reset.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
