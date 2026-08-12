const supabaseUrl = 'https://quecxpbjvbpvxdcrpjtj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1ZWN4cGJqdmJwdnhkY3JwanRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2NDUxMiwiZXhwIjoyMDk3NTQwNTEyfQ.COUWVRM00DpfG2ffgEkxwUrWpn_ba3WzkK9_iwlfaxk';

async function query() {
  console.log('--- OPPORTUNITIES ---');
  const res = await fetch(`${supabaseUrl}/rest/v1/opportunities?select=id,title,provider,dedupe_key`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log(data);

  console.log('--- DELETING MANUAL PROVIDER ---');
  const delRes = await fetch(`${supabaseUrl}/rest/v1/opportunities?provider=eq.manual`, {
    method: 'DELETE',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  console.log(delRes.status);
  
  console.log('--- SCAN RUNS ---');
  const res2 = await fetch(`${supabaseUrl}/rest/v1/scan_runs?select=scan_payload,error_message,created_at&order=created_at.desc&limit=3`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const data2 = await res2.json();
  console.log(JSON.stringify(data2, null, 2));
}

query();
