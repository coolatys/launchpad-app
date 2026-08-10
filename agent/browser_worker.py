import asyncio
import os
import sys
import json
import hashlib
import argparse
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional

# Force stdout/stderr to use UTF-8 on Windows to avoid UnicodeEncodeError
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Load env variables from root .env.local
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    print(f"Warning: .env.local not found at {env_path}")
    load_dotenv()

# Set up standard Google API Key env variable
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    os.environ["GOOGLE_API_KEY"] = api_key

# Verify required credentials
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY) must be defined in env.")
    sys.exit(1)

if not api_key:
    print("Error: GEMINI_API_KEY must be defined in env.")
    sys.exit(1)

# Import third-party packages only after verifying env so we fail fast
try:
    from supabase import create_client, Client
    from browser_use import Agent, Browser, ChatGoogle
    from browser_use.llm.messages import UserMessage
except ImportError as e:
    print(f"Error importing dependencies: {e}. Please ensure agent/requirements.txt is fully installed.")
    sys.exit(1)

# Supabase client
supabase: Client = create_client(supabase_url, supabase_key)

# Pydantic models for structured output
class OpportunityMatch(BaseModel):
    title: str = Field(description="The job title or scholarship name")
    org: str = Field(description="The company, university, or organization offering it")
    location: str = Field(description="Location of the opportunity (e.g. Lagos, Nigeria, Remote, Japan, Europe, etc.)")
    url: str = Field(description="The direct web URL to the opportunity detail/application page")
    description: str = Field(description="Detailed description, requirements, or qualifications")
    deadline: str = Field(default="N/A", description="Application deadline date or 'N/A' if not found")

class SearchResult(BaseModel):
    opportunities: List[OpportunityMatch] = Field(default_factory=list)

class FitEvaluation(BaseModel):
    fit_score: int = Field(description="Score the fit from 0 to 100 based on matching education, skills, experience, and interests")
    fit_reasons: List[str] = Field(description="3 short, bullet-point reasons justifying your score")

async def evaluate_fit(llm: ChatGoogle, profile_data: dict, match: OpportunityMatch) -> dict:
    """Evaluate fit score and reasons for a match against candidate profile using Gemini."""
    profile_context = f"""
    Name: {profile_data.get('name', 'N/A')}
    Headline: {profile_data.get('headline', 'N/A')}
    Education: {profile_data.get('education', 'N/A')}
    Certifications: {profile_data.get('certifications', 'N/A')}
    Skills: {profile_data.get('skills', 'N/A')}
    Experience: {profile_data.get('experience', 'N/A')}
    Projects: {profile_data.get('project', 'N/A')}
    Interests: {profile_data.get('interests', 'N/A')}
    """
    
    prompt = f"""
    You are an expert career counselor. Evaluate the fit between the candidate profile and the opportunity description below.
    
    CANDIDATE PROFILE:
    {profile_context}
    
    OPPORTUNITY:
    Title: {match.title}
    Organization: {match.org}
    Location: {match.location}
    Description: {match.description}
    
    Score the fit from 0 to 100 based on matching education, skills, experience, and interests.
    
    STRICT AVAILABILITY CONSTRAINT:
    - If the candidate is currently an undergraduate/student (still in school, education shows future expected graduation) seeking a student internship, placement, or SIWES role, and the opportunity is a full-time permanent graduate job, graduate trainee program, or requires a completed degree/graduation, you MUST score the fit as Low Fit (0 to 45) because the candidate cannot commit to a full-time permanent role while still in school.
    - Conversely, if the candidate has already graduated and is seeking career/graduate roles, penalize short-term undergraduate student-only placements.
    
    Be honest:
    - High fit (80-100): Candidate has matching key skills, education, and relevant experience/projects.
    - Medium fit (50-79): Candidate matches some aspects but lacks major requirements.
    - Low fit (0-49): Candidate does not match the opportunity well or fails the availability constraint.
    
    Provide 3 short, bullet-point reasons justifying your score.
    """
    try:
        response = await llm.ainvoke(
            messages=[UserMessage(content=prompt)],
            output_format=FitEvaluation
        )
        res_data = response.completion
        return {
            "fit_score": int(res_data.fit_score),
            "fit_reasons": res_data.fit_reasons
        }
    except Exception as e:
        print(f"    Error evaluating fit for '{match.title}': {e}")
        return {
            "fit_score": 50,
            "fit_reasons": [f"Error during fit evaluation: {str(e)}"]
        }

async def process_profile(profile_key: str, profile_data: dict, llm: ChatGoogle, kind: str) -> int:
    """Run browser-use crawl and save opportunities for a profile and kind ('job' or 'scholarship')."""
    queries = profile_data.get(f"{kind}_queries", [])
    if not queries:
        print(f"No queries found for profile '{profile_key}' / kind '{kind}'.")
        return 0
        
    print(f"\nProcessing {kind} queries for {profile_data.get('name', profile_key)}:")
    inserted_count = 0
    
    for query in queries:
        print(f"  - Searching for: '{query}'")
        
        # Construct the task for the browser-use agent
        is_internship_only = "intern" in query.lower() or "siwes" in query.lower() or ("undergraduate" in profile_data.get("headline", "").lower())
        
        if kind == 'job':
            if is_internship_only:
                job_type_guidance = "Strictly look for student internships, summer placements, or SIWES roles. Avoid full-time graduate trainee programs or permanent entry-level jobs, as the candidate is still in school."
            else:
                job_type_guidance = "Look for graduate entry-level roles, graduate trainee programs, or junior positions."
                
            task = f"""
            Go directly to Indeed (indeed.com) or a similar job portal. Do NOT use search engines like Google, Bing, or Yahoo to avoid bot detection.
            Search for: "{query}" on the portal.
            To be fast, click on the job listing cards in the search results page to load their details in the preview pane. 
            Do NOT open listings in new tabs unless necessary. 
            
            GUIDANCE: {job_type_guidance}
            
            Extract the title, organization/company, location, URL, and description from the preview pane.
            Extract up to 3 matching jobs and return them.
            """
        else:
            task = f"""
            Go directly to a scholarship directory like scholarshipdb.net, studyportals.com, findaphd.com, or a university website. Do NOT use search engines like Google, Bing, or Yahoo to avoid bot detection.
            Search for: "{query}".
            To be fast, browse the search results page. Click into the details of the top 2 or 3 listings. 
            Extract the title, university/organization, country/location, URL, and description.
            Extract up to 3 matching scholarships and return them.
            """
            
        browser = Browser(
            headless=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            args=[
                '--blink-settings=imagesEnabled=false',
                '--disable-gpu',
                '--disable-infobars',
                '--disable-notifications'
            ]
        )
        try:
            # Run the agent
            agent = Agent(
                task=task,
                llm=llm,
                browser=browser,
                output_model_schema=SearchResult
            )
            
            result = await agent.run()
            matches = result.structured_output.opportunities if result and result.structured_output else []
            
            print(f"    Discovered {len(matches)} listings.")
            
            for match in matches:
                # Deduplication logic
                url_hash = hashlib.md5(match.url.encode('utf-8')).hexdigest()
                dedupe_key = f"{profile_key}:browser:{url_hash}"
                
                # Check if it already exists in Supabase
                res = supabase.table("opportunities").select("id").eq("dedupe_key", dedupe_key).execute()
                if len(res.data) > 0:
                    print(f"    Skipping (already exists): {match.title} at {match.org}")
                    continue
                    
                # Evaluate fit
                fit_eval = await evaluate_fit(llm, profile_data, match)
                
                # Prepare db payload
                opp_payload = {
                    "kind": kind,
                    "title": match.title,
                    "org": match.org,
                    "location": match.location,
                    "url": match.url,
                    "description": match.description,
                    "deadline": match.deadline,
                    "provider": "browser",
                    "fit_score": fit_eval["fit_score"],
                    "fit_reasons": "\n".join(fit_eval["fit_reasons"]),
                    "dedupe_key": dedupe_key,
                    "status": "new"
                }
                
                # Insert into database
                db_res = supabase.table("opportunities").insert([opp_payload]).execute()
                if db_res.data:
                    print(f"    Inserted: [{fit_eval['fit_score']}%] {match.title} at {match.org}")
                    inserted_count += 1
                else:
                    print(f"    Failed to insert: {match.title}")
                    
        except Exception as e:
            print(f"    Error executing agent for query '{query}': {e}")
        finally:
            await browser.close()
            
    return inserted_count

async def main():
    parser = argparse.ArgumentParser(description="Autonomous Browser Agent for Jobs & Scholarships")
    parser.add_argument("--test", action="store_true", help="Run a quick test query and exit")
    parser.add_argument("--profile", type=str, default="all", choices=["all", "user", "friend"], help="Target profile to process")
    args = parser.parse_args()

    # Load profiles JSON file
    profiles_path = os.path.join(os.path.dirname(__file__), 'profiles.json')
    if not os.path.exists(profiles_path):
        print(f"Error: profiles.json not found at {profiles_path}")
        sys.exit(1)
        
    with open(profiles_path, 'r', encoding='utf-8') as f:
        profiles = json.load(f)

    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    print(f"Initializing LLM with model: {model_name}")
    llm = ChatGoogle(model=model_name, api_key=api_key)

    try:
        if args.test:
            print("Running test run...")
            # Pick the user profile and do a single test job search
            profile_data = profiles.get("user", {})
            test_match = OpportunityMatch(
                title="Mechanical Design Engineer (Test)",
                org="AeroTech Nigeria Ltd",
                location="Lagos, Nigeria",
                url="https://example.com/test-job-1234",
                description="We are seeking a graduate Mechanical Engineer to design automation systems in SolidWorks. Requires knowledge of embedded sensors, HSE compliance, and CAD modeling.",
                deadline="2026-12-31"
            )
            fit_eval = await evaluate_fit(llm, profile_data, test_match)
            print(f"Test Fit Score: {fit_eval['fit_score']}")
            print(f"Test Fit Reasons: {fit_eval['fit_reasons']}")
            
            # Try a quick wikipedia search via browser-use to verify browser engine works
            print("\nTesting browser-use crawling on wikipedia...")
            browser = Browser(
                headless=True,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                args=[
                    '--blink-settings=imagesEnabled=false',
                    '--disable-gpu',
                    '--disable-infobars',
                    '--disable-notifications'
                ]
            )
            try:
                test_agent = Agent(
                    task="Go directly to wikipedia.org, search for 'Afe Babalola University', and tell me the first sentence of the article.",
                    llm=llm,
                    browser=browser
                )
                test_result = await test_agent.run()
                print("Browser-use search test result:", test_result)
            finally:
                await browser.close()
            return

        # Normal Scheduled Run
        target_profiles = ["user", "friend"] if args.profile == "all" else [args.profile]
        total_inserted = 0

        for pk in target_profiles:
            profile_data = profiles.get(pk)
            if not profile_data:
                print(f"Profile '{pk}' not found in profiles.json.")
                continue
                
            print(f"\n==========================================")
            print(f"RUNNING AGENT FOR PROFILE: {profile_data.get('name', pk).upper()}")
            print(f"==========================================")
            
            # Process Jobs
            jobs_inserted = await process_profile(pk, profile_data, llm, "job")
            # Process Scholarships
            scholarships_inserted = await process_profile(pk, profile_data, llm, "scholarship")
            
            total_inserted += (jobs_inserted + scholarships_inserted)

        print(f"\nScan completed. Total new opportunities saved: {total_inserted}")

    except Exception as e:
        print(f"Error during main execution: {e}")

if __name__ == "__main__":
    asyncio.run(main())
