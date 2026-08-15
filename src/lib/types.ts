export interface Profile {
  id?: string;
  user_id: string;
  full_name: string;
  contact: string;
  headline?: string;
  education?: string;
  cv_file_url?: string;
  cv_text?: string;
  cv_parsed_data?: any;
  interests?: any;
  about_me?: string;
  location?: string;
  search_preference?: 'jobs' | 'scholarships' | 'both';
  scheduled_scan_enabled?: boolean;
  onboarding_completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type SourceProvider =
  | 'adzuna'
  | 'arbeitnow'
  | 'remotive'
  | 'reed'
  | 'reliefweb'
  | 'euraxess'
  | 'rss'
  | 'manual';

export interface Source {
  id: string;
  kind: 'job' | 'scholarship';
  provider: SourceProvider;
  query: string;
  location?: string;
  active: boolean;
  created_at?: string;
}

export interface Posting {
  id: string;
  source_url: string;
  title: string;
  organization?: string;
  posting_type: 'job' | 'scholarship';
  location?: string;
  description?: string;
  raw_content_hash?: string;
  first_seen_at?: string;
  last_seen_at?: string;
}

export interface UserMatch {
  id: string;
  user_id: string;
  posting_id: string;
  compatibility_score: number;
  match_reasons?: string[] | any;
  status: 'new' | 'viewed' | 'shortlisted' | 'dismissed' | 'applied';
  notified_at?: string;
  found_at?: string;
  posting?: Posting;
}

export interface Opportunity {
  id?: string;
  kind: 'job' | 'scholarship';
  title: string;
  org: string;
  location: string;
  url: string;
  description: string;
  deadline: string;
  provider: SourceProvider;
  fit_score: number | null;
  fit_reasons: string | null;
  discovered_at?: string;
  dedupe_key: string;
  status: 'new' | 'shortlisted' | 'dismissed' | 'applied';
}

export interface Application {
  id?: string;
  opportunity_id?: string;
  title: string;
  org: string;
  kind: 'job' | 'scholarship';
  url: string;
  deadline?: string;
  tailored_summary?: string;
  tailored_bullets?: string;
  tailored_letter?: string;
  status: 'to_apply' | 'drafted' | 'submitted' | 'interview' | 'offer' | 'rejected';
  notes?: string;
  opportunities?: { dedupe_key?: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScanRun {
  id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
  scan_payload?: any;
  raw_response?: any;
  new_matches_count: number;
}
