import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import webpush from 'web-push';

// Configure Web Push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@example.com', // Change this to a real email in production
    process.env.NEXT_PUBLIC_VAPID_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_VAPID_KEY || !process.env.VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured on server');
    }

    const body = await request.json();
    const { action, userId, subscription } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    if (action === 'subscribe') {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
      }

      // 1. Save subscription to DB
      const { error: subError } = await supabaseAdmin
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
        }, { onConflict: 'endpoint' });

      if (subError) throw subError;

      // 2. Update profile to enable scheduled scans
      const { error: profileError } = await supabaseAdmin
        .from('profile')
        .update({ scheduled_scan_enabled: true })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 3. Send confirmation push
      try {
        const payload = JSON.stringify({
          title: 'Auto Scan is On',
          body: "You'll be alerted when new jobs are found.",
        });
        await webpush.sendNotification(subscription, payload);
      } catch (pushError) {
        console.error('Failed to send confirmation push:', pushError);
        // We still return success because the subscription was saved, 
        // but log the error. Or we could fail the request.
        // Let's fail it so the frontend knows it didn't work.
        return NextResponse.json({ error: 'Failed to send confirmation push', details: pushError }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } 
    else if (action === 'unsubscribe') {
      // 1. Delete subscription if provided
      if (subscription && subscription.endpoint) {
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }

      // 2. Disable scheduled scans on profile
      const { error: profileError } = await supabaseAdmin
        .from('profile')
        .update({ scheduled_scan_enabled: false })
        .eq('id', userId);

      if (profileError) throw profileError;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Push Subscribe API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
