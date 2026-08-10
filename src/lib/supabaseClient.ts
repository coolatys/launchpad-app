import { createClient } from '@supabase/supabase-js';

// Provide fallbacks during build-time compilation if env variables are not present
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL is not set. Using placeholder URL for compilation.');
}

// Client-side/Anon client for general operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend operations (e.g., automated checks, bypassing RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
