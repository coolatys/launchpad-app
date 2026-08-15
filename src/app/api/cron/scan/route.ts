import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && request.headers.get('x-vercel-cron') !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profile')
      .select('id')
      .eq('scheduled_scan_enabled', true);
      
    if (usersError || !users) {
      throw new Error(`Failed to fetch users: ${usersError?.message}`);
    }

    let scansTriggered = 0;
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    for (const user of users) {
      // Trigger the check endpoint in the background without awaiting it to avoid Vercel timeouts
      fetch(`${origin}/api/opportunities/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      }).catch(e => console.error(`Cron background fetch error for ${user.id}:`, e));
      
      scansTriggered++;
    }

    return NextResponse.json({ success: true, scansTriggered });
  } catch (e: any) {
    console.error('Cron error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
