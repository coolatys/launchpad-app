import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session_token')?.value;

    if (token !== 'admin_authenticated_session_secret_key_2026') {
      return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');

    // 1. Fetch list of all registered candidates
    let usersList: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, full_name, contact, created_at, onboarding_completed_at')
        .order('created_at', { ascending: false });
      usersList = data || [];
    } catch (e) {
      console.error('Error fetching profiles list:', e);
    }

    const selectedUserId = (targetUserId || usersList[0]?.user_id || usersList[0]?.contact || 'default_user').toLowerCase().trim();

    // 2. Raw profile data
    let rawProfileData: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`user_id.eq.${selectedUserId},contact.eq.${selectedUserId}`)
        .maybeSingle();
      rawProfileData = data;
    } catch (e) {
      console.error('Raw profile fetch error:', e);
    }

    // 3. Scan History from scan_runs
    let scanHistory: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('scan_runs')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('started_at', { ascending: false });
      scanHistory = data || [];
    } catch (e) {
      console.error('scan_runs history fetch error:', e);
    }

    const lastScanRun = scanHistory[0] || null;
    const lastScanPayload = lastScanRun?.scan_payload || null;
    const lastScanResponse = lastScanRun?.raw_response || null;

    // 4. Matched postings from user_matches / opportunities
    let matchedPostings: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('opportunities')
        .select('*')
        .order('fit_score', { ascending: false });
      
      matchedPostings = (data || []).filter((opp) => {
        if (!opp.dedupe_key) return false;
        return opp.dedupe_key.toLowerCase().includes(selectedUserId);
      });
    } catch (e) {
      console.error('Matched postings fetch error:', e);
    }

    return NextResponse.json({
      selectedUserId,
      usersList,
      rawProfileData,
      lastScanPayload,
      lastScanResponse,
      scanHistory,
      matchedPostings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
