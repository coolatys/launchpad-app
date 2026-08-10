import { Opportunity } from '../types';
import { parseRssXml } from './rssParser';

export async function fetchEuraxessOpportunities(
  query: string,
  location?: string,
  kind: 'job' | 'scholarship' = 'job'
): Promise<Opportunity[]> {
  // EURAXESS RSS endpoint (research/engineering roles). No key needed.
  let url = 'https://euraxess.ec.europa.eu/jobs/search/rss';
  
  if (query) {
    url += `?keywords=${encodeURIComponent(query)}`;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
      },
    });

    if (!res.ok) {
      console.error(`EURAXESS RSS returned status ${res.status}`);
      return [];
    }

    const xmlText = await res.text();
    const rssItems = parseRssXml(xmlText);

    // Apply location filtering locally
    let filteredItems = rssItems;
    if (location) {
      const lowerLoc = location.toLowerCase();
      filteredItems = rssItems.filter((item) => {
        return item.description.toLowerCase().includes(lowerLoc) ||
               item.title.toLowerCase().includes(lowerLoc);
      });
    }

    return filteredItems.slice(0, 10).map((item) => {
      const dedupeKey = `euraxess:${item.guid || Math.random().toString(36).substr(2, 9)}`;

      // Parse organization name from description if possible, or use placeholder
      // EURAXESS feed descriptions usually look like: "Organisation: University of X, Country: Germany..."
      let org = 'European Research Institution';
      const orgMatch = item.description.match(/Organisation:\s*([^,]+)/i);
      if (orgMatch) {
        org = orgMatch[1].trim();
      }

      // Parse location from description if possible
      let itemLoc = location || 'Europe';
      const locMatch = item.description.match(/Country:\s*([^,]+)/i);
      if (locMatch) {
        itemLoc = locMatch[1].trim();
      }

      return {
        kind,
        title: item.title || 'Research Position',
        org,
        location: itemLoc,
        url: item.link || '',
        description: item.description,
        deadline: 'N/A', // RSS feeds often don't contain a clean deadline, but we can parse it from description if present
        provider: 'euraxess',
        fit_score: null,
        fit_reasons: null,
        dedupe_key: dedupeKey,
        status: 'new',
      } as Opportunity;
    });
  } catch (error) {
    console.error('Error fetching from EURAXESS RSS:', error);
    return [];
  }
}
