import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { fetchAdzunaOpportunities } from '@/lib/adapters/adzuna';
import { fetchArbeitnowOpportunities } from '@/lib/adapters/arbeitnow';
import { fetchRemotiveOpportunities } from '@/lib/adapters/remotive';
import { fetchReedOpportunities } from '@/lib/adapters/reed';
import { fetchReliefWebOpportunities } from '@/lib/adapters/reliefweb';
import { fetchEuraxessOpportunities } from '@/lib/adapters/euraxess';
import { fetchRssOpportunities } from '@/lib/adapters/rss';
import { Opportunity } from '@/lib/types';

export async function GET() {
  try {
    // 1. Fetch active sources
    const { data: sources, error } = await supabaseAdmin
      .from('sources')
      .select('*')
      .eq('active', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json({
        message: 'No active sources found. Please create and enable a source first.',
        results: [],
      });
    }

    let allResults: Opportunity[] = [];

    // 2. Query each active source using its adapter
    for (const source of sources) {
      let results: Opportunity[] = [];
      
      switch (source.provider) {
        case 'adzuna':
          results = await fetchAdzunaOpportunities(source.query, source.location, source.kind);
          break;
        case 'arbeitnow':
          results = await fetchArbeitnowOpportunities(source.query, source.location, source.kind);
          break;
        case 'remotive':
          results = await fetchRemotiveOpportunities(source.query, source.location, source.kind);
          break;
        case 'reed':
          results = await fetchReedOpportunities(source.query, source.location, source.kind);
          break;
        case 'reliefweb':
          results = await fetchReliefWebOpportunities(source.query, source.location, source.kind);
          break;
        case 'euraxess':
          results = await fetchEuraxessOpportunities(source.query, source.location, source.kind);
          break;
        case 'rss':
          results = await fetchRssOpportunities(source.query, source.location, source.kind);
          break;
        case 'manual':
          // Manual sources have no automated API endpoint
          break;
        default:
          console.warn(`Unknown provider: "${source.provider}"`);
      }
      
      allResults = [...allResults, ...results];
    }

    return NextResponse.json({
      message: `Fetched ${allResults.length} raw results from active sources.`,
      results: allResults,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
