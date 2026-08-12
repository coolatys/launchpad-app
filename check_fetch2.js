const supabaseUrl = 'https://quecxpbjvbpvxdcrpjtj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1ZWN4cGJqdmJwdnhkY3JwanRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2NDUxMiwiZXhwIjoyMDk3NTQwNTEyfQ.COUWVRM00DpfG2ffgEkxwUrWpn_ba3WzkK9_iwlfaxk';

async function query() {
  console.log('--- ADZUNA JOBS ---');
  const res = await fetch(`${supabaseUrl}/rest/v1/opportunities?provider=eq.adzuna&select=id,title,dedupe_key`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log(data);

  console.log('--- SCAN RUNS ---');
  const res2 = await fetch(`${supabaseUrl}/rest/v1/scan_runs?select=scan_payload,error_message,timestamp&order=timestamp.desc&limit=3`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const data2 = await res2.json();
  console.log(JSON.stringify(data2, null, 2));
}

query();
