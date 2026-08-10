import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profile = searchParams.get('profile') || 'all';

    let query = supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('status', 'new')
      .order('fit_score', { ascending: false, nullsFirst: false });

    if (profile === 'user') {
      query = query.or('dedupe_key.like.user:%,dedupe_key.not.like.friend:%');
    } else if (profile === 'friend') {
      query = query.like('dedupe_key', 'friend:%');
    }

    const { data: opportunities, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      opportunities: opportunities || [],
      count: opportunities?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
