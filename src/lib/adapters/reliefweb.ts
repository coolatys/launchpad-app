import { Opportunity } from '../types';

export async function fetchReliefWebOpportunities(
  query: string,
  location?: string,
  kind: 'job' | 'scholarship' = 'job'
): Promise<Opportunity[]> {
  // ReliefWeb is humanitarian aid postings. Free, no API key needed.
  let url = `https://api.reliefweb.int/v1/jobs?appname=launchpad&query[value]=${encodeURIComponent(query)}&limit=10&fields[include][]=title&fields[include][]=url&fields[include][]=body&fields[include][]=source&fields[include][]=country&fields[include][]=date`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`ReliefWeb API returned status ${res.status}`);
      return [];
    }

    const json = await res.json();
    const data = json.data || [];

    // Filter by country location if specified
    let filteredData = data;
    if (location) {
      const lowerLoc = location.toLowerCase();
      filteredData = data.filter((item: any) => {
        const countries = item.fields?.country || [];
        return countries.some((c: any) => c.name?.toLowerCase().includes(lowerLoc));
      });
    }

    return filteredData.map((item: any) => {
      const fields = item.fields || {};
      const dedupeKey = `reliefweb:${item.id || Math.random().toString(36).substr(2, 9)}`;

      // Source/Employer
      const sourceOrg = fields.source && fields.source[0] ? fields.source[0].name : 'NGO / UN Agency';

      // Countries
      const countryNames = fields.country ? fields.country.map((c: any) => c.name).join(', ') : 'Global';

      // Deadline (closing date)
      let deadlineStr = 'N/A';
      if (fields.date?.closing) {
        // Strip time portion to keep it clean e.g. "2026-07-20"
        deadlineStr = fields.date.closing.split('T')[0];
      }

      return {
        kind,
        title: fields.title || 'Untitled Humanitarian Role',
        org: sourceOrg,
        location: countryNames,
        url: fields.url || '',
        description: fields.body || 'No description provided.',
        deadline: deadlineStr,
        provider: 'reliefweb',
        fit_score: null,
        fit_reasons: null,
        dedupe_key: dedupeKey,
        status: 'new',
      } as Opportunity;
    });
  } catch (error) {
    console.error('Error fetching from ReliefWeb API:', error);
    return [];
  }
}
