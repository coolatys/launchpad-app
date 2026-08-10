import { Opportunity } from '../types';

export async function fetchRemotiveOpportunities(
  query: string,
  location?: string,
  kind: 'job' | 'scholarship' = 'job'
): Promise<Opportunity[]> {
  // Remotive is remote jobs. No API key needed.
  let url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=10`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Remotive API returned status ${res.status}`);
      return [];
    }

    const json = await res.json();
    const jobs = json.jobs || [];

    // Filter by location if specified (e.g. US only, Europe only)
    let filteredJobs = jobs;
    if (location) {
      const lowerLoc = location.toLowerCase();
      filteredJobs = jobs.filter((job: any) => {
        const reqLoc = job.candidate_required_location?.toLowerCase() || '';
        return reqLoc.includes(lowerLoc) || reqLoc.includes('worldwide') || lowerLoc === 'remote';
      });
    }

    return filteredJobs.map((job: any) => {
      const dedupeKey = `remotive:${job.id || Math.random().toString(36).substr(2, 9)}`;
      
      // Clean HTML tags from description
      const cleanDesc = job.description
        ? job.description.replace(/<\/?[^>]+(>|$)/g, "")
        : 'No description provided.';

      return {
        kind,
        title: job.title || 'Untitled Role',
        org: job.company_name || 'Unknown Company',
        location: job.candidate_required_location || 'Remote',
        url: job.url || '',
        description: cleanDesc,
        deadline: 'N/A', // Remotive does not provide deadlines
        provider: 'remotive',
        fit_score: null,
        fit_reasons: null,
        dedupe_key: dedupeKey,
        status: 'new',
      } as Opportunity;
    });
  } catch (error) {
    console.error('Error fetching from Remotive API:', error);
    return [];
  }
}
