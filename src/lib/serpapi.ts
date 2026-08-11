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

  const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(query)}&api_key=${apiKey}&hl=en`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`SerpApi responded with status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`SerpApi error: ${data.error}`);
  }

  return data.jobs_results || [];
}
