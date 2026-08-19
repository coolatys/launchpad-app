export interface SerpApiJob {
  title: string;
  company_name: string;
  location: string;
  via: string;
  description: string;
  job_id: string;
  share_link: string;
}

export async function fetchGoogleJobs(query: string): Promise<SerpApiJob[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is not configured');
  }

  // num=20 attempts to return 20 results instead of default 10, to increase yield per API call
  const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(query)}&api_key=${apiKey}&hl=en&num=20`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`SerpApi responded with status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    // SerpApi returns this specific error string when a search literally yields 0 results.
    // It's not an API failure, just an empty result set.
    if (data.error.includes("Google hasn't returned any results")) {
      return [];
    }
    throw new Error(`SerpApi error: ${data.error}`);
  }

  return data.jobs_results || [];
}
