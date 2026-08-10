import { Opportunity } from '../types';

const appId = process.env.ADZUNA_APP_ID || '';
const appKey = process.env.ADZUNA_APP_KEY || '';

export async function fetchAdzunaOpportunities(
  query: string,
  location?: string,
  kind: 'job' | 'scholarship' = 'job'
): Promise<Opportunity[]> {
  if (!appId || !appKey) {
    console.warn('Adzuna API credentials (ADZUNA_APP_ID/ADZUNA_APP_KEY) are not set. Skipping Adzuna search.');
    return [];
  }

  // Default to 'gb' if no country is specified in location, or if we want standard global search
  // Adzuna requires a country code in the URL (e.g. gb, us, de, ca).
  // Let's extract a country code if it looks like a 2-letter ISO code, otherwise default to 'gb' (UK)
  let country = 'gb';
  let cleanLocation = location || '';

  if (cleanLocation.trim().length === 2) {
    country = cleanLocation.trim().toLowerCase();
    cleanLocation = '';
  } else if (cleanLocation.includes(',')) {
    const parts = cleanLocation.split(',');
    const potentialCountry = parts[parts.length - 1].trim().toLowerCase();
    if (potentialCountry.length === 2) {
      country = potentialCountry;
      cleanLocation = parts.slice(0, parts.length - 1).join(',').trim();
    }
  }

  const resultsPerPage = 10;
  const page = 1;
  
  // Format URL: https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
  let url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${appId}&app_key=${appKey}&results_per_page=${resultsPerPage}&what=${encodeURIComponent(query)}`;
  
  if (cleanLocation) {
    url += `&where=${encodeURIComponent(cleanLocation)}`;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Adzuna API returned status ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];

    return results.map((job: any) => {
      // Create a unique dedupe key
      const dedupeKey = `adzuna:${job.id || Math.random().toString(36).substr(2, 9)}`;
      
      // Clean description (Adzuna highlights search terms in description with <strong> tags, clean it or leave as plain text)
      const cleanDesc = job.description
        ? job.description.replace(/<\/?[^>]+(>|$)/g, "") // Remove HTML tags
        : 'No description provided.';

      return {
        kind,
        title: job.title || 'Untitled Role',
        org: job.company?.display_name || 'Unknown Company',
        location: job.location?.display_name || (location || 'Remote/Unknown'),
        url: job.redirect_url || '',
        description: cleanDesc,
        deadline: job.contract_time || 'N/A', // Adzuna doesn't provide strict deadlines, contract_time is a useful fallback
        provider: 'adzuna',
        fit_score: null,
        fit_reasons: null,
        dedupe_key: dedupeKey,
        status: 'new',
      } as Opportunity;
    });
  } catch (error) {
    console.error('Error fetching from Adzuna API:', error);
    return [];
  }
}
