import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- OPPORTUNITIES ---');
  const { data: opps } = await supabase.from('opportunities').select('title, org, kind, provider, dedupe_key');
  console.log(opps);
  
  console.log('\n--- SCAN RUNS ---');
  const { data: scans } = await supabase.from('scan_runs').select('scan_payload, error_message, created_at').order('created_at', { ascending: false }).limit(3);
  console.log(JSON.stringify(scans, null, 2));
}

checkData();
