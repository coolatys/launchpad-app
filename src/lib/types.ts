export interface Profile {
  id: number;
  name: string;
  contact: string;
  headline?: string;
  education?: string;
  certifications?: string;
  skills?: string;
  experience?: string;
  project?: string;
  interests?: string;
  cv_master?: string;
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

export interface Opportunity {
  id?: string;
  kind: 'job' | 'scholarship';
  title: string;
  org: string;
  location: string;
  url: string;
  description: string;
  deadline: string; // Keep as string for flexible API date responses
  provider: SourceProvider;
  fit_score: number | null;
  fit_reasons: string | null;
  discovered_at?: string;
  dedupe_key: string; // unique hash (e.g. provider + external_id)
  status: 'new' | 'shortlisted' | 'dismissed';
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
  tailored_bullets?: string; // Text representation of tailored CV bullets
  tailored_letter?: string; // Cover letter (max 180 words)
  status: 'to_apply' | 'drafted' | 'submitted' | 'interview' | 'offer' | 'rejected';
  notes?: string;
  opportunities?: { dedupe_key?: string } | null;
  created_at?: string;
  updated_at?: string;
}
