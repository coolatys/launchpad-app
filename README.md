# Launchpad 🚀

Launchpad is your personal, automated job and scholarship search agent. It crawls official APIs and RSS feeds for matching listings, evaluates them against your candidate profile using **Google Gemini Flash**, and prepares tailored application materials (summary, cover letter, and CV bullets) while tracking progress on a single dashboard. 

The entire stack is designed to run **100% on free-tier services** (€0/month).

---

## 🛠️ Tech Stack & Services

- **Frontend/Backend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- **Database**: Supabase (Postgres)
- **AI Agent**: Google Gemini API (gemini-2.5-flash) via Google AI Studio
- **Email Digest**: Resend
- **Scheduler**: GitHub Actions (runs crawls every 8 hours)
- **Hosting**: Vercel

---

## 📋 Database Setup (Supabase)

Initialize your Supabase project by running the following schema in the **SQL Editor** of your Supabase Dashboard:

```sql
-- Create profile table (limited to 1 row for personal use)
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    contact TEXT,
    headline TEXT,
    education TEXT,
    certifications TEXT,
    skills TEXT,
    experience TEXT,
    project TEXT,
    interests TEXT,
    cv_master TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default placeholder profile row
INSERT INTO profile (id, name, contact)
VALUES (1, 'Your Name', 'your.email@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('job', 'scholarship')),
    provider TEXT NOT NULL CHECK (provider IN ('adzuna', 'arbeitnow', 'remotive', 'reed', 'reliefweb', 'euraxess', 'rss', 'manual')),
    query TEXT NOT NULL,
    location TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('job', 'scholarship')),
    title TEXT NOT NULL,
    org TEXT NOT NULL,
    location TEXT,
    url TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    provider TEXT NOT NULL,
    fit_score INTEGER,
    fit_reasons TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dedupe_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('new', 'shortlisted', 'dismissed')) DEFAULT 'new'
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    org TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('job', 'scholarship')),
    url TEXT NOT NULL,
    deadline TEXT,
    tailored_summary TEXT,
    tailored_bullets TEXT,
    tailored_letter TEXT,
    status TEXT NOT NULL CHECK (status IN ('to_apply', 'drafted', 'submitted', 'interview', 'offer', 'rejected')) DEFAULT 'to_apply',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 💻 Local Setup & Installation

1. **Clone the repository** (or navigate to this folder).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```
   * **GEMINI_API_KEY**: Get a free key from [Google AI Studio](https://aistudio.google.com).
   * **SUPABASE_URL / ANON_KEY / SERVICE_KEY**: Obtain from your Supabase Project Settings -> API.
   * **ADZUNA_APP_ID / KEY**: Sign up for a free developer account at [Adzuna Developers](https://developer.adzuna.com/).
   * **REED_API_KEY**: Get a free API key at [Reed Developer Portal](https://www.reed.co.uk/developers).
   * **RESEND_API_KEY**: Sign up at [Resend](https://resend.com) for free transactional emails.
   * **CHECK_SECRET**: Generate a random secure token (e.g. `openssl rand -hex 16` or any password string) to guard your scheduled API.
4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deployed Hosting (Vercel)

1. Push your code to a private GitHub repository.
2. Sign up on [Vercel](https://vercel.com) and click **Add New** -> **Project**.
3. Select your repository and import it.
4. Add all environment variables from `.env.local` into **Environment Variables** in Vercel.
5. Click **Deploy**. Vercel will output your live URL (e.g. `https://your-app.vercel.app`).

---

## ⏰ Scheduled Crawler (GitHub Actions)

To schedule crawls every 8 hours, configure secrets in your GitHub repository:

1. In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
2. Add the following secrets:
   - `APP_URL`: Your live Vercel URL (e.g., `https://your-app.vercel.app`). **Do not add a trailing slash**.
   - `CHECK_SECRET`: The exact token value matching the `CHECK_SECRET` environment variable in Vercel.
3. The workflow defined in `.github/workflows/check-openings.yml` will automatically query the API every 8 hours, score new jobs, and send HTML summaries directly to your contact email.

---

## ⚠️ Important Compliance & Rate Limits

- **No Scraping**: In compliance with Terms of Service, this application does not crawl, scrape, or automate LinkedIn, Glassdoor, or Indeed.
- **Human Submission**: There is **no automated submit action**. All applications must be finalized manually by you on the official landing pages.
- **Polite Polling**: Searches are limited to 10 results per query to stay comfortably within free tier API rate limits.
- **Gemini Prompts**: The fit scoring model limits output tokens to `600` to conserve your API quota.
