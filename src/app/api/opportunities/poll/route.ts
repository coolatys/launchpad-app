import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || searchParams.get('userId') || '';

    if (!userEmail) {
      return NextResponse.json({ opportunities: [], count: 0 });
    }

    const { data: opportunities, error } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('status', 'new')
      .order('fit_score', { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);

    const userKey = userEmail.toLowerCase().trim();
    const filtered = (opportunities || []).filter((opp) => {
      if (!opp.dedupe_key) return false;
      return opp.dedupe_key.toLowerCase().includes(userKey);
    });

    return NextResponse.json({
      opportunities: filtered,
      count: filtered.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
