import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { evaluateOpportunityFit, extractSearchQueries } from '@/lib/gemini';
import { fetchGoogleJobs } from '@/lib/serpapi';
import webpush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@example.com',
    process.env.NEXT_PUBLIC_VAPID_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

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

    let userIndustry = 'Technology';
    let userLocation = 'Remote';
    let userKind = 'both';
    let jobQueries = profile.job_queries || [];
    
    // 1. Read from actual columns first
    if (profile.location) userLocation = profile.location;
    if (profile.search_preference) userKind = profile.search_preference;

    // 2. Fallback backwards compatibility (parsing old interests string)
    if (profile.interests) {
      if (!profile.location) {
        const matchLoc = profile.interests.match(/Location:\s*([^|\n]+)/);
        if (matchLoc && matchLoc[1].trim() && matchLoc[1].trim().toLowerCase() !== 'ff') {
          userLocation = matchLoc[1].trim();
        }
      }
      if (!profile.search_preference) {
        const matchKind = profile.interests.match(/Preference:\s*([^|\n]+)/);
        if (matchKind && matchKind[1].trim()) {
          userKind = matchKind[1].trim();
        }
      }
      const matchInd = profile.interests.match(/Industry:\s*([^|\n]+)/);
      if (matchInd && matchInd[1].trim() && matchInd[1].trim().toLowerCase() !== 'ff') {
        userIndustry = matchInd[1].trim();
      }
    }

    // 3. Fallback to Gemini extraction if queries are completely unknown or junk
    if (!jobQueries || jobQueries.length === 0 || userIndustry === 'Technology' || userIndustry.toLowerCase() === 'ff') {
        const profileText = `Headline: ${profile.headline || ''}\nCV: ${profile.cv_master || ''}`;
        jobQueries = await extractSearchQueries(profileText);
    }

    const scanPayload = {
      user_id: userId,
      full_name: profile.full_name || profile.name || 'Candidate',
      industry: jobQueries[0] || userIndustry,
      location: userLocation,
      kindPreference: userKind,
      job_queries: jobQueries,
    };

    // 1.5 Rate Limiting (2 minute cooldown)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentScan, error: recentScanError } = await supabaseAdmin
      .from('scan_runs')
      .select('started_at')
      .eq('user_id', userId)
      .gte('started_at', twoMinutesAgo)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentScanError) {
      console.warn(`Could not check rate limit for ${userId}:`, recentScanError.message);
    } else if (recentScan) {
      return NextResponse.json({ 
        error: 'Too Many Requests: Please wait at least 2 minutes between manual scans.' 
      }, { status: 429 });
    }

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
    
    let queryTopic = 'Technology';
    if (scanPayload.job_queries && scanPayload.job_queries.length > 0) {
      const randomIndex = Math.floor(Math.random() * scanPayload.job_queries.length);
      queryTopic = scanPayload.job_queries[randomIndex];
    } else {
      queryTopic = scanPayload.industry;
    }
    
    const query = `${queryTopic} ${kindToSearch === 'scholarship' ? 'scholarships' : 'jobs'} in ${scanPayload.location}`;
    const queryKey = query.toLowerCase().trim();
    console.log(`[ScanRun ${scanRunId}] SerpApi Query: "${query}" (Key: "${queryKey}")`);

    // 5. Fetch from SerpApi with Shared Cache Check
    let discoveredItems = [];
    
    // Check Cache
    const { data: cached } = await supabaseAdmin
      .from('serpapi_cache')
      .select('raw_response, created_at')
      .eq('query_key', queryKey)
      .single();

    if (cached && new Date(cached.created_at).getTime() > Date.now() - 12 * 60 * 60 * 1000) {
      console.log(`[ScanRun ${scanRunId}] Cache HIT for "${queryKey}"`);
      discoveredItems = cached.raw_response;
    } else {
      console.log(`[ScanRun ${scanRunId}] Cache MISS for "${queryKey}". Fetching external...`);
      try {
        discoveredItems = await fetchGoogleJobs(query);
        
        // Upsert to cache
        await supabaseAdmin.from('serpapi_cache').upsert({
            query_key: queryKey,
            raw_response: discoveredItems,
            created_at: new Date().toISOString()
        });
      } catch (e: any) {
        throw new Error(`SerpApi fetch failed: ${e.message}`);
      }
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
          `Name: ${profile.name}\nHeadline: ${profile.headline || ''}\nExperience/Bio: ${profile.experience || ''}\nCV: ${profile.cv_master || ''}`,
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
        // Insert into legacy opportunities table for frontend backwards compatibility
        const dedupeKey = `${userId}:adzuna:${sourceUrl}`;
        try {
          await supabaseAdmin.from('opportunities').upsert([
            {
              kind: 'job',
              title: item.title,
              org: item.company_name,
              location: item.location,
              url: sourceUrl,
              description: item.description,
              deadline: '',
              provider: 'adzuna',
              fit_score: fitScore,
              fit_reasons: Array.isArray(fitReasons) ? fitReasons.join('\n') : fitReasons,
              dedupe_key: dedupeKey,
              status: 'new',
            },
          ], { onConflict: 'dedupe_key' });
        } catch (e) {
          console.error('Opportunities legacy table insert error:', e);
        }

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

    // 7. Trigger In-App Notification if there are new matches
    if (newMatchesCount > 0) {
      const message = `${newMatchesCount} new ${kindToSearch === 'scholarship' ? 'scholarship' : 'job'} matches found based on your profile.`;
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert([{ user_id: userId, message: message }]);
        
      if (notifError) {
        console.error('Failed to insert notification:', notifError);
      }

      // Send Web Push to all user devices
      if (process.env.NEXT_PUBLIC_VAPID_KEY && process.env.VAPID_PRIVATE_KEY) {
        const { data: subscriptions } = await supabaseAdmin
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', userId);

        if (subscriptions && subscriptions.length > 0) {
          const pushPayload = JSON.stringify({
            title: 'New Matches Found!',
            body: message,
          });

          await Promise.all(
            subscriptions.map(async (sub) => {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: { auth: sub.auth, p256dh: sub.p256dh }
              };
              try {
                await webpush.sendNotification(pushSubscription, pushPayload);
              } catch (error: any) {
                console.error('Web Push Error:', error);
                // 410 Gone means subscription expired or revoked
                if (error.statusCode === 410 || error.statusCode === 404) {
                  await supabaseAdmin
                    .from('push_subscriptions')
                    .delete()
                    .eq('id', sub.id);
                }
              }
            })
          );
        }
      }

      // Email disabled for now based on implementation plan feedback
      /*
      if (process.env.RESEND_API_KEY) {
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
          const postingIds = matchedJobsForEmail.map(m => m.postingId);
          await supabaseAdmin.from('user_matches')
            .update({ notified_at: new Date().toISOString() })
            .eq('user_id', userId)
            .in('posting_id', postingIds);
        }
      }
      */
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
