import { Opportunity } from '../types';

const reedApiKey = process.env.REED_API_KEY || '';

export async function fetchReedOpportunities(
  query: string,
  location?: string,
  kind: 'job' | 'scholarship' = 'job'
): Promise<Opportunity[]> {
  if (!reedApiKey) {
    console.warn('Reed API key (REED_API_KEY) is not set. Skipping Reed search.');
    return [];
  }

  let url = `https://api.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(query)}`;
  if (location) {
    url += `&locationName=${encodeURIComponent(location)}`;
  }

  try {
    // Reed uses Basic Authentication with the API key as the username, and the password blank.
    const authHeader = 'Basic ' + btoa(reedApiKey + ':');

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Reed API returned status ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];

    return results.slice(0, 10).map((job: any) => {
      const dedupeKey = `reed:${job.jobId || Math.random().toString(36).substr(2, 9)}`;

      return {
        kind,
        title: job.jobTitle || 'Untitled Role',
        org: job.employerName || 'Unknown Employer',
        location: job.locationName || (location || 'UK'),
        url: job.jobUrl || '',
        description: job.jobDescription || 'No description provided.',
        deadline: job.expirationDate || 'N/A', // Reed provides expirationDate
        provider: 'reed',
        fit_score: null,
        fit_reasons: null,
        dedupe_key: dedupeKey,
        status: 'new',
      } as Opportunity;
    });
  } catch (error) {
    console.error('Error fetching from Reed API:', error);
    return [];
  }
}
