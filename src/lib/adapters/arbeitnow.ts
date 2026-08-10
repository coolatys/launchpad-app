import { Opportunity } from '../types';

export async function fetchArbeitnowOpportunities(
  query: string,
  location?: string,
  kind: 'job' | 'scholarship' = 'job'
): Promise<Opportunity[]> {
  // Arbeitnow is EU + remote jobs. No API key needed.
  const url = 'https://www.arbeitnow.com/api/job-board-api';

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Arbeitnow API returned status ${res.status}`);
      return [];
    }

    const json = await res.json();
    const jobs = json.data || [];

    // Filter jobs matching query and location locally if API doesn't support query parameters
    const lowerQuery = query.toLowerCase();
    const lowerLoc = location ? location.toLowerCase() : '';

    const filtered = jobs.filter((job: any) => {
      const titleMatch = job.title?.toLowerCase().includes(lowerQuery);
      const companyMatch = job.company_name?.toLowerCase().includes(lowerQuery);
      const descMatch = job.description?.toLowerCase().includes(lowerQuery);
      const isQueryMatch = titleMatch || companyMatch || descMatch;

      let isLocMatch = true;
      if (lowerLoc) {
        const jobLoc = job.location?.toLowerCase() || '';
        isLocMatch = jobLoc.includes(lowerLoc) || (lowerLoc === 'remote' && job.remote);
      }

      return isQueryMatch && isLocMatch;
    });

    return filtered.slice(0, 10).map((job: any) => {
      const dedupeKey = `arbeitnow:${job.slug || Math.random().toString(36).substr(2, 9)}`;
      
      // Clean HTML tags from description
      const cleanDesc = job.description
        ? job.description.replace(/<\/?[^>]+(>|$)/g, "")
        : 'No description provided.';

      return {
        kind,
        title: job.title || 'Untitled Role',
        org: job.company_name || 'Unknown Company',
        location: job.location || (job.remote ? 'Remote' : 'Germany/Europe'),
        url: job.url || '',
        description: cleanDesc,
        deadline: 'N/A', // Arbeitnow API does not return a application deadline
        provider: 'arbeitnow',
        fit_score: null,
        fit_reasons: null,
        dedupe_key: dedupeKey,
        status: 'new',
      } as Opportunity;
    });
  } catch (error) {
    console.error('Error fetching from Arbeitnow API:', error);
    return [];
  }
}
