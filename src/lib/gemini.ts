import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to get Gemini client lazily
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing. Please check your .env.local file and restart the Next.js server.');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Helper to get configured model name dynamically, default to gemini-2.5-flash-lite
function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
}

/**
 * Clean up markdown wrapper from Gemini text output if JSON parsing fails directly
 */
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

export interface FitScoreResult {
  fit_score: number;
  fit_reasons: string[];
}

export interface TailorResult {
  tailored_summary: string;
  tailored_bullets: string[];
  tailored_letter: string;
}

/**
 * Use Gemini Flash/Pro to evaluate an opportunity against the user profile.
 */
export async function evaluateOpportunityFit(
  profileText: string,
  opportunityTitle: string,
  opportunityOrg: string,
  opportunityDescription: string
): Promise<FitScoreResult> {
  try {
    const genAI = getGenAI();
    const modelName = getModelName();
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 600,
      },
    });

    const prompt = `
You are an expert career agent. Compare the candidate's profile with the job/scholarship details.
Assign a fit score between 0 and 100 based on alignment of skills, experience, and interests.

STRICT AVAILABILITY CONSTRAINT:
- If the candidate is currently an undergraduate/student (still in school, e.g. B.Sc. Expected graduation in future) looking for a student placement, SIWES, or summer internship, and the opportunity is a full-time permanent graduate job, graduate trainee program, or requires a completed degree/graduation, you MUST score the fit as Low Fit (0 to 45) because the candidate cannot commit to a full-time permanent role while still in school.
- Conversely, if the candidate has already graduated and is seeking career/graduate roles, penalize short-term undergraduate student-only placements.

Provide exactly 2 to 3 short, concrete reasons in bullet points (under 15 words each) explaining the score.

Candidate Profile:
${profileText}

Opportunity details:
Title: ${opportunityTitle}
Organization: ${opportunityOrg}
Description: ${opportunityDescription}

Output format must be strictly valid JSON without any comments:
{
  "fit_score": 85,
  "fit_reasons": ["reason 1", "reason 2", "reason 3"]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = cleanJsonString(text);
    return JSON.parse(cleaned) as FitScoreResult;
  } catch (error: any) {
    console.error('Error evaluating fit with Gemini:', error);
    return {
      fit_score: 50,
      fit_reasons: [
        `Analysis failed: ${error.message || 'Check terminal server logs for details.'}`,
        'Tip: If you recently updated your .env.local, restart your Next.js server.'
      ],
    };
  }
}

/**
 * Use Gemini Flash/Pro to tailor CV bullets and draft a motivation letter.
 */
export async function tailorApplication(
  profileText: string,
  opportunityTitle: string,
  opportunityOrg: string,
  opportunityDescription: string
): Promise<TailorResult> {
  const genAI = getGenAI();
  const modelName = getModelName();
  
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 800,
    },
  });

  const prompt = `
You are an expert career agent. Help the candidate tailor their application for this role.
Use the Candidate Profile and Opportunity details to generate:
1. A brief professional summary highlighting key alignments (2-3 sentences).
2. Exactly 4 tailored CV bullet points emphasizing relevant achievements and matching skills.
3. A cover/motivation letter written in a professional, engaging tone, capped strictly at 180 words.

Candidate Profile:
${profileText}

Opportunity details:
Title: ${opportunityTitle}
Organization: ${opportunityOrg}
Description: ${opportunityDescription}

Output format must be strictly valid JSON without any comments:
{
  "tailored_summary": "Summary text here",
  "tailored_bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "tailored_letter": "Motivation letter here (max 185 words)"
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = cleanJsonString(text);
  return JSON.parse(cleaned) as TailorResult;
}

export async function extractSearchQueries(profileText: string): Promise<string[]> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: getModelName(),
      generationConfig: { maxOutputTokens: 150 },
    });

    const prompt = `
You are an expert career agent. Read the candidate's profile and extract exactly 3 distinct, highly targeted search query variations (job titles or roles) to use for a Google Jobs search.
For example, if they have a B.Sc in Accounting, output:
Accountant
Finance Officer
Audit Trainee

Output exactly 3 lines, with one short query per line. Do not include bullet points or any other text.

Candidate Profile:
${profileText.substring(0, 3000)}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/['"*-]/g, '');
    const queries = text.split('\n').map(q => q.trim()).filter(Boolean);
    
    if (queries.length > 0) {
      return queries.slice(0, 3);
    }
    return ['Technology', 'Software Engineering', 'IT'];
  } catch (error) {
    console.error('Error extracting search query with Gemini:', error);
    return ['Technology', 'Software Engineering', 'IT'];
  }
}

export interface ProfileIntelligence {
  core_skills: string[];
  experience_level: 'student' | 'graduate' | 'junior' | 'mid' | 'senior';
  primary_domain: string[];
  adjacent_roles: string[];
  direct_titles: string[];
  education_signals: string[];
  summary: string;
}

export async function analyzeProfileIntelligence(profileText: string): Promise<ProfileIntelligence | null> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: getModelName(),
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 800,
      },
    });

    const prompt = `
You are an expert career and recruitment AI. Perform a deep structural analysis of the provided CV/profile.
Extract the following information and output strictly as a JSON object:

1. core_skills: Array of 5-10 key technical or domain skills.
2. experience_level: Must be exactly one of: "student", "graduate", "junior", "mid", "senior". Use "student" if currently enrolled and seeking placement.
3. primary_domain: Array of 1-3 broad industries/domains (e.g. "Healthcare", "Software Engineering", "Finance").
4. direct_titles: Array of 2-4 literal job titles they are obviously qualified for (e.g. "Frontend Developer").
5. adjacent_roles: Array of 2-4 transferable or related roles they could do but aren't explicitly titled (e.g. "Technical Writer", "Developer Advocate" for an engineer).
6. education_signals: Array of key education facts (e.g. "B.Sc Computer Science 2024").
7. summary: A 2-3 sentence professional summary capturing their unique value proposition.

Candidate Profile:
${profileText.substring(0, 8000)}

Output strictly valid JSON only:
{
  "core_skills": [],
  "experience_level": "junior",
  "primary_domain": [],
  "direct_titles": [],
  "adjacent_roles": [],
  "education_signals": [],
  "summary": ""
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = cleanJsonString(text);
    return JSON.parse(cleaned) as ProfileIntelligence;
  } catch (error) {
    console.error('Error in analyzeProfileIntelligence:', error);
    return null;
  }
}

