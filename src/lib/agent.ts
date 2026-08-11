import { supabaseAdmin } from './supabaseClient';
import { fetchAdzunaOpportunities } from './adapters/adzuna';
import { fetchArbeitnowOpportunities } from './adapters/arbeitnow';
import { fetchRemotiveOpportunities } from './adapters/remotive';
import { fetchReedOpportunities } from './adapters/reed';
import { fetchReliefWebOpportunities } from './adapters/reliefweb';
import { fetchEuraxessOpportunities } from './adapters/euraxess';
import { fetchRssOpportunities } from './adapters/rss';
import { evaluateOpportunityFit } from './gemini';
import { Opportunity, Source } from './types';

async function fetchOpportunitiesForSource(source: Source): Promise<Opportunity[]> {
  switch (source.provider) {
    case 'adzuna':
      return await fetchAdzunaOpportunities(source.query, source.location, source.kind);
    case 'arbeitnow':
      return await fetchArbeitnowOpportunities(source.query, source.location, source.kind);
    case 'remotive':
      return await fetchRemotiveOpportunities(source.query, source.location, source.kind);
    case 'reed':
      return await fetchReedOpportunities(source.query, source.location, source.kind);
    case 'reliefweb':
      return await fetchReliefWebOpportunities(source.query, source.location, source.kind);
    case 'euraxess':
      return await fetchEuraxessOpportunities(source.query, source.location, source.kind);
    case 'rss':
      return await fetchRssOpportunities(source.query, source.location, source.kind);
    case 'manual':
      // Manual sources have no automated API endpoint; they are updated by hand via form
      return [];
    default:
      console.warn(`Unknown provider: "${source.provider}"`);
      return [];
  }
}

export interface AgentRunResult {
  totalChecked: number;
  newDiscovered: number;
  inserted: number;
  highFitOpportunities: Opportunity[];
}

/**
 * Main Agent Function to run discovery, deduplicate, score with Gemini, and save to Supabase.
 */
export async function runDiscoveryAgent(userId?: string): Promise<AgentRunResult> {
  const result: AgentRunResult = {
    totalChecked: 0,
    newDiscovered: 0,
    inserted: 0,
    highFitOpportunities: [],
  };

  try {
    // 1. Fetch the master candidate profile
    let profile: any;
    let profileError: any;
    
    if (userId) {
      const res = await supabaseAdmin.from('profile').select('*').eq('id', userId).maybeSingle();
      profile = res.data;
      profileError = res.error;
    } else {
      const res = await supabaseAdmin.from('profile').select('*').limit(1).maybeSingle();
      profile = res.data;
      profileError = res.error;
    }

    if (profileError || !profile) {
      console.error('Failed to load profile. Cannot run fit scoring without candidate profile.', profileError);
      return result;
    }

    // Format profile for Gemini context
    const profileContext = `
Name: ${profile.name}
Headline: ${profile.headline || 'N/A'}
Skills: ${profile.skills || 'N/A'}
Experience: ${profile.experience || 'N/A'}
Education: ${profile.education || 'N/A'}
Certifications: ${profile.certifications || 'N/A'}
Projects: ${profile.project || 'N/A'}
Interests: ${profile.interests || 'N/A'}
Master CV: ${profile.cv_master || 'N/A'}
`.trim();

    // 2. Fetch active search sources
    const { data: activeSources, error: sourcesError } = await supabaseAdmin
      .from('sources')
      .select('*')
      .eq('active', true);

    if (sourcesError || !activeSources || activeSources.length === 0) {
      console.log('No active search sources found.');
      return result;
    }

    // 3. Fetch opportunities from all active sources
    let crawledOpportunities: Opportunity[] = [];
    for (const source of activeSources) {
      const opportunities = await fetchOpportunitiesForSource(source);
      crawledOpportunities = [...crawledOpportunities, ...opportunities];
    }

    result.totalChecked = crawledOpportunities.length;

    if (crawledOpportunities.length === 0) {
      return result;
    }

    // 4. Deduplicate against existing opportunities in Supabase
    // Extract unique dedupe keys
    const dedupeKeys = Array.from(new Set(crawledOpportunities.map(o => o.dedupe_key)));
    
    // Batch query existing keys (up to 100 at a time or in one query since list is small)
    const { data: existingOpps, error: dedupeError } = await supabaseAdmin
      .from('opportunities')
      .select('dedupe_key')
      .in('dedupe_key', dedupeKeys);

    if (dedupeError) {
      console.error('Error querying existing opportunities for deduplication:', dedupeError);
      return result;
    }

    const existingKeysSet = new Set((existingOpps || []).map(o => o.dedupe_key));

    // Filter down to genuinely new opportunities
    const newOpportunities = crawledOpportunities.filter(o => !existingKeysSet.has(o.dedupe_key));
    
    // Deduplicate within the newly crawled list itself by key (in case different searches return same job)
    const uniqueNewOpportunities: Opportunity[] = [];
    const seenKeysInBatch = new Set<string>();
    for (const opp of newOpportunities) {
      if (!seenKeysInBatch.has(opp.dedupe_key)) {
        seenKeysInBatch.add(opp.dedupe_key);
        uniqueNewOpportunities.push(opp);
      }
    }

    result.newDiscovered = uniqueNewOpportunities.length;

    // 5. Score with Gemini & Insert into Supabase
    for (const opp of uniqueNewOpportunities) {
      try {
        // Call Gemini fit-scoring (flash model)
        const evaluation = await evaluateOpportunityFit(
          profileContext,
          opp.title,
          opp.org,
          opp.description
        );

        opp.fit_score = evaluation.fit_score;
        opp.fit_reasons = evaluation.fit_reasons.join('\n');
        
        // Save to opportunities table
        const { error: insertError } = await supabaseAdmin
          .from('opportunities')
          .insert([opp]);

        if (insertError) {
          console.error(`Failed to insert opportunity "${opp.title}":`, insertError.message);
        } else {
          result.inserted += 1;
          if (opp.fit_score >= 65) {
            result.highFitOpportunities.push(opp);
          }
        }

        // Polite rate limiting buffer to avoid overloading Gemini free tier (4.5 seconds between calls ensures we stay below 15 RPM)
        await new Promise(resolve => setTimeout(resolve, 4500));

      } catch (err) {
        console.error(`Error processing fit scoring for "${opp.title}":`, err);
      }
    }

  } catch (error) {
    console.error('Error running Discovery Agent:', error);
  }

  return result;
}
