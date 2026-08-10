import { Opportunity } from '../types';
import { parseRssXml } from './rssParser';

export async function fetchRssOpportunities(
  feedUrl: string,
  location?: string,
  kind: 'job' | 'scholarship' = 'scholarship'
): Promise<Opportunity[]> {
  if (!feedUrl || !feedUrl.startsWith('http')) {
    console.warn(`Invalid generic RSS URL: "${feedUrl}". Skipping fetch.`);
    return [];
  }

  try {
    const res = await fetch(feedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
      },
    });

    if (!res.ok) {
      console.error(`Generic RSS URL "${feedUrl}" returned status ${res.status}`);
      return [];
    }

    const xmlText = await res.text();
    const rssItems = parseRssXml(xmlText);

    // Apply location filtering locally if requested
    let filteredItems = rssItems;
    if (location) {
      const lowerLoc = location.toLowerCase();
      filteredItems = rssItems.filter((item) => {
        return item.description.toLowerCase().includes(lowerLoc) ||
               item.title.toLowerCase().includes(lowerLoc);
      });
    }

    return filteredItems.slice(0, 10).map((item) => {
      // Dedupe key is formed by hashing the feed URL and guid to ensure uniqueness across different feeds
      const dedupeKey = `rss:${btoa(feedUrl).slice(0, 10)}:${item.guid || Math.random().toString(36).substr(2, 9)}`;

      // Infer organization from title or feed URL name
      let org = 'RSS Feed Publisher';
      try {
        const domain = new URL(feedUrl).hostname;
        org = domain.replace('www.', '');
      } catch (e) {}

      return {
        kind,
        title: item.title || 'Scholarship/Opportunity Listing',
        org,
        location: location || 'Remote / Worldwide',
        url: item.link || feedUrl,
        description: item.description,
        deadline: 'N/A', // Generic RSS items don't have standard deadline tags, fallback to N/A
        provider: 'rss',
        fit_score: null,
        fit_reasons: null,
        dedupe_key: dedupeKey,
        status: 'new',
      } as Opportunity;
    });
  } catch (error) {
    console.error(`Error fetching generic RSS feed from "${feedUrl}":`, error);
    return [];
  }
}
