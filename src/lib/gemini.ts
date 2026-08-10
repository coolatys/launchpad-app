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
