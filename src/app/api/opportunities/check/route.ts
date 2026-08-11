import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { evaluateOpportunityFit } from '@/lib/gemini';
import { fetchGoogleJobs } from '@/lib/serpapi';

const MAX_SERPAPI_CALLS_PER_MONTH = 245;

export async function POST(request: Request) {
  let scanRunId: string | null = null;
  let userId = 'default_user';

  try {
    const rawBody = await request.text();
    console.log('Raw check request body:', rawBody);
    
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.log('Failed to parse JSON:', e);
    }
    
    userId = (body.user_id || body.userId || body.userEmail || '').toLowerCase().trim();

    if (!userId) {
      return NextResponse.json({ 
        error: `Valid user_id required. DEBUG: Received rawBody='${rawBody}', parsedBody=${JSON.stringify(body)}` 
      }, { status: 400 });
    }

    // 1. Fetch user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(`Profile not found for user_id ${userId}: ${profileError?.message || 'Unknown'}`);
    }

    const scanPayload = {
      user_id: userId,
      full_name: profile.full_name || profile.name || 'Candidate',
      industry: profile.industry || 'Technology',
      location: profile.location || 'Remote',
      kindPreference: profile.kindPreference || 'job', // job, scholarship, or both
      job_queries: profile.job_queries || [],
    };

    // 2. Insert audit entry in scan_runs table (throws if table is missing)
    const { data: scanRun, error: scanRunError } = await supabaseAdmin
      .from('scan_runs')
      .insert([
        {
          user_id: userId,
          started_at: new Date().toISOString(),
          status: 'running',
          scan_payload: scanPayload,
        },
      ])
      .select('id')
      .single();

    if (scanRunError) {
      throw new Error(`Failed to create scan_runs entry: ${scanRunError.message}`);
    }
    scanRunId = scanRun.id;

    // 3. API Usage Check & Safeguard
    const currentMonth = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    
    // Try to get tracking row, if it fails maybe table doesn't exist
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('api_usage_tracking')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (usageError) {
      throw new Error(`Failed to check API usage limits: ${usageError.message}`);
    }

    if (!usageData) {
        throw new Error('API tracking table not initialized.');
    }

    let currentCallCount = usageData.call_count;
    if (usageData.current_month !== currentMonth) {
      // New month! Reset counter
      currentCallCount = 0;
      await supabaseAdmin.from('api_usage_tracking').update({ current_month: currentMonth, call_count: 0 }).eq('id', 1);
    }

    if (currentCallCount >= MAX_SERPAPI_CALLS_PER_MONTH) {
      throw new Error('Monthly scan limit reached (250 calls max). Scanning paused until next month.');
    }

    // Increment counter for the 1 call we are about to make
    await supabaseAdmin.from('api_usage_tracking').update({ call_count: currentCallCount + 1 }).eq('id', 1);

    // 4. Determine single query logic
    let kindToSearch = scanPayload.kindPreference;
    if (kindToSearch === 'both') {
      kindToSearch = Math.random() > 0.5 ? 'job' : 'scholarship';
    }
    let queryTopic = scanPayload.industry;
    if (scanPayload.job_queries && scanPayload.job_queries.length > 0) {
      queryTopic = scanPayload.job_queries[Math.floor(Math.random() * scanPayload.job_queries.length)];
    }
    
    const query = `${queryTopic} ${kindToSearch === 'scholarship' ? 'scholarships' : 'jobs'} in ${scanPayload.location}`;
    console.log(`[ScanRun ${scanRunId}] SerpApi Query: "${query}"`);

    // 5. Fetch from SerpApi
    let discoveredItems = [];
    try {
      discoveredItems = await fetchGoogleJobs(query);
    } catch (e: any) {
      throw new Error(`SerpApi fetch failed: ${e.message}`);
    }

    let newMatchesCount = 0;
    const rawResponses: any[] = [];
    const matchedJobsForEmail: any[] = [];

    // 6. Process each discovered item
    for (const item of discoveredItems) {
      let fitScore = 75;
      let fitReasons = ['Matches target role interests', 'Aligns with candidate profile'];

      // Upsert into postings table FIRST to get deduplicated posting_id
      const sourceUrl = item.share_link || item.job_id || `https://google.com/search?q=${encodeURIComponent(item.title)}`;
      const { data: posting, error: postingError } = await supabaseAdmin
        .from('postings')
        .upsert([
          {
            source_url: sourceUrl,
            title: item.title,
            organization: item.company_name,
            posting_type: kindToSearch === 'scholarship' ? 'scholarship' : 'job',
            location: item.location,
            description: item.description,
            last_seen_at: new Date().toISOString(),
          },
        ], { onConflict: 'source_url' })
        .select('id')
        .single();

      if (postingError || !posting) {
        console.error('Postings table upsert error:', postingError?.message);
        continue; // Skip this one
      }
      
      const postingId = posting.id;

      // Check if user already matched this
      const { data: existingMatch } = await supabaseAdmin
        .from('user_matches')
        .select('*')
        .eq('user_id', userId)
        .eq('posting_id', postingId)
        .maybeSingle();
        
      if (existingMatch) {
        // Already processed for this user
        continue;
      }

      // ONLY evaluate fit if it's genuinely new
      try {
        const evalResult = await evaluateOpportunityFit(
          `Name: ${profile.full_name}\nBio: ${profile.about_me || profile.experience || ''}\nCV: ${profile.cv_text || ''}`,
          item.title,
          item.company_name,
          item.description || 'No description provided'
        );
        fitScore = evalResult.fit_score;
        fitReasons = evalResult.fit_reasons;
      } catch (e) {
        console.error('Gemini fit evaluation error:', e);
      }

      // Insert into user_matches junction table
      const { data: matchResult, error: matchError } = await supabaseAdmin
        .from('user_matches')
        .upsert([
          {
            user_id: userId,
            posting_id: postingId,
            compatibility_score: fitScore,
            match_reasons: Array.isArray(fitReasons) ? fitReasons : [fitReasons],
            status: 'new',
            found_at: new Date().toISOString(),
          },
        ], { onConflict: 'user_id,posting_id' })
        .select()
        .single();

      if (matchError) {
        console.error('user_matches table insert error:', matchError.message);
      } else {
        newMatchesCount++;
        rawResponses.push({ ...item, fitScore, fitReasons });
        matchedJobsForEmail.push({
          title: item.title,
          org: item.company_name,
          location: item.location,
          fit_score: fitScore,
          postingId: postingId
        });
      }
    }

    // 7. Trigger Email if there are new matches
    if (newMatchesCount > 0 && process.env.RESEND_API_KEY) {
      // Need absolute URL for server-to-server fetch
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const emailRes = await fetch(`${origin}/api/notifications/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: profile.email || (profile.contact ? profile.contact.replace('Email:', '').trim() : null),
          candidateName: profile.full_name || 'Candidate',
          newMatches: matchedJobsForEmail,
        })
      });

      if (emailRes.ok) {
        // Update notified_at for these matches
        const postingIds = matchedJobsForEmail.map(m => m.postingId);
        await supabaseAdmin.from('user_matches')
          .update({ notified_at: new Date().toISOString() })
          .eq('user_id', userId)
          .in('posting_id', postingIds);
      }
    }

    // 8. Update scan_runs audit entry to completed
    await supabaseAdmin
      .from('scan_runs')
      .update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        new_matches_count: newMatchesCount,
        raw_response: rawResponses,
      })
      .eq('id', scanRunId);

    return NextResponse.json({
      success: true,
      scanRunId,
      newMatchesCount,
      lastScannedAt: new Date().toISOString(),
      message: `Scan completed successfully! ${newMatchesCount} new matches found.`,
    });
  } catch (err: any) {
    console.error('End-to-end scan error:', err);

    if (scanRunId) {
      const status = err.message.includes('limit reached') ? 'limit_reached' : 'failed';
      await supabaseAdmin
        .from('scan_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: status,
          error_message: err.message || 'Scan process encountered an error.',
        })
        .eq('id', scanRunId);
    }

    return NextResponse.json({ error: err.message || 'Scan failed.' }, { status: 500 });
  }
}
