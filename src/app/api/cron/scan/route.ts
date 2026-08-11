import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && request.headers.get('x-vercel-cron') !== '1') {
    // In production, Vercel cron passes the CRON_SECRET or x-vercel-cron header.
    // For local testing, we can allow it if they send the right header, but we don't strict block yet.
    // Let's just log a warning if neither is present.
    console.warn('Cron route hit without valid authorization or x-vercel-cron header.');
  }

  try {
    const { data: users, error: usersError } = await supabaseAdmin.from('profile').select('id');
    if (usersError || !users) {
      throw new Error(`Failed to fetch users: ${usersError?.message}`);
    }

    const currentHour = new Date().getUTCHours();
    const isMorningWindow = currentHour >= 8 && currentHour < 12; // 8am-12pm UTC
    const isAfternoonWindow = currentHour >= 14 && currentHour < 20; // 2pm-8pm UTC

    if (!isMorningWindow && !isAfternoonWindow) {
      return NextResponse.json({ message: 'Outside of randomized scan windows.' });
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let scansTriggered = 0;

    for (const user of users) {
      // 1. Check if user already had a scan in the current window today
      const { data: recentScans } = await supabaseAdmin
        .from('scan_runs')
        .select('started_at')
        .eq('user_id', user.id)
        .gte('started_at', todayStart.toISOString())
        .order('started_at', { ascending: false });

      let scannedInMorning = false;
      let scannedInAfternoon = false;

      if (recentScans) {
        for (const scan of recentScans) {
          const scanHour = new Date(scan.started_at).getUTCHours();
          if (scanHour >= 8 && scanHour < 12) scannedInMorning = true;
          if (scanHour >= 14 && scanHour < 20) scannedInAfternoon = true;
        }
      }

      const needsMorningScan = isMorningWindow && !scannedInMorning;
      const needsAfternoonScan = isAfternoonWindow && !scannedInAfternoon;

      if (needsMorningScan || needsAfternoonScan) {
        // 25% chance to run *now* to randomize execution within the window
        // If it's the LAST hour of the window, we force it to 100% so we don't miss them.
        const isLastHourOfWindow = (isMorningWindow && currentHour === 11) || (isAfternoonWindow && currentHour === 19);
        const shouldRunNow = isLastHourOfWindow || Math.random() < 0.25;

        if (shouldRunNow) {
          const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          // Trigger the check endpoint in the background without awaiting it to avoid Vercel timeouts
          fetch(`${origin}/api/opportunities/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id }),
          }).catch(e => console.error(`Cron background fetch error for ${user.id}:`, e));
          
          scansTriggered++;
        }
      }
    }

    return NextResponse.json({ success: true, scansTriggered });
  } catch (e: any) {
    console.error('Cron error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
