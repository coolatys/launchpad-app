import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session_token')?.value;

    if (token !== 'admin_authenticated_session_secret_key_2026') {
      return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
    }

    // 1. Fetch Feedback Submissions
    let feedback: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      feedback = data || [];
    } catch (e) {
      console.log('Error fetching feedback from Supabase:', e);
    }

    // 2. Fetch Usage Stats
    let totalProfiles = 0;
    let totalOpportunities = 0;
    let totalApplications = 0;

    try {
      const { count: profileCount } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
      const { count: oppCount } = await supabaseAdmin.from('opportunities').select('*', { count: 'exact', head: true });
      const { count: appCount } = await supabaseAdmin.from('applications').select('*', { count: 'exact', head: true });

      totalProfiles = profileCount || 0;
      totalOpportunities = oppCount || 0;
      totalApplications = appCount || 0;
    } catch (e) {
      console.log('Error fetching admin counts:', e);
    }

    return NextResponse.json({
      stats: {
        totalProfiles,
        totalOpportunities,
        totalApplications,
        totalFeedback: feedback.length,
      },
      feedback,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
