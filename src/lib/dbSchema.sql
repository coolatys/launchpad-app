-- Canonical Database Migration Schema for Launchpad App

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  full_name text,
  contact text,
  cv_file_url text,
  cv_text text,
  cv_parsed_data jsonb,
  interests jsonb,
  about_me text,
  onboarding_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Postings Table (Canonical shared postings)
CREATE TABLE IF NOT EXISTS postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL UNIQUE,
  title text NOT NULL,
  organization text,
  posting_type text CHECK (posting_type IN ('job','scholarship')),
  location text,
  description text,
  raw_content_hash text,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

-- 3. User Matches Table (Junction between User & Posting)
CREATE TABLE IF NOT EXISTS user_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  posting_id uuid REFERENCES postings(id) ON DELETE CASCADE,
  compatibility_score numeric(5,2) NOT NULL,
  match_reasons jsonb,
  status text DEFAULT 'new' CHECK (status IN ('new','viewed','shortlisted','dismissed','applied')),
  notified_at timestamptz,
  found_at timestamptz DEFAULT now(),
  UNIQUE (user_id, posting_id)
);

-- 4. Scan Runs Table (Audit Trail for End-to-End Scans)
CREATE TABLE IF NOT EXISTS scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  error_message text,
  scan_payload jsonb,
  raw_response jsonb,
  new_matches_count int DEFAULT 0
);

-- 5. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

-- 6. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text,
  rating int,
  type text,
  comments text,
  created_at timestamptz DEFAULT now()
);
