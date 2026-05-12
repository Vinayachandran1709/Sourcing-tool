"""
Candidate Conversation Agent
AI-driven technical verification and career preference discovery.
"""

import os
import json
import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def _call_groq(system_prompt: str, user_message: str, max_tokens: int = 500) -> Optional[str]:
    """Call Groq API and return the response text. Returns None on failure."""
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY not found!")
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.4
                }
            )
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Groq call failed: {e}")
    return None


def start_conversation(github_analysis: dict, resume_data: dict) -> Dict:
    """
    Initialize conversation state and return the welcome message.
    Returns: {"conversation_data": {...}, "ai_message": "..."}
    """
    # Build welcome message mentioning their specific data
    name = github_analysis.get("name", "there")
    role = github_analysis.get("detected_role", "developer")
    top_langs = github_analysis.get("primary_languages", [])
    
    welcome = f"Hi {name}! I'm your AI interviewer at TalentBox. I've already analyzed your GitHub profile and I can see you're a {role}"
    if top_langs:
        welcome += f" working primarily with {', '.join(top_langs[:3])}"
    welcome += ".\n\nI'll ask you a few technical questions about your experience, then we'll talk about what you're looking for in your next role. This usually takes about 10 minutes.\n\nLet's start \u2014 tell me briefly about the most interesting engineering problem you've solved recently."

    conversation_data = {
        "state": "technical_verification",
        "messages": [
            {
                "role": "assistant",
                "content": welcome,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stage": "welcome"
            }
        ],
        "current_question_index": 0,
        "technical_questions_asked": 0,
        "career_questions_asked": 0,
        "stages_completed": ["welcome"],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }

    return {
        "conversation_data": conversation_data,
        "ai_message": welcome
    }


async def process_candidate_message(
    candidate_message: str,
    conversation_data: dict,
    github_analysis: dict,
    resume_data: dict,
    last_ai_timestamp: Optional[str] = None
) -> Tuple[Dict, str, bool]:
    """
    Process a candidate's message and generate the next AI response.
    
    Args:
        candidate_message: The candidate's text response
        conversation_data: Current conversation state
        github_analysis: The candidate's GitHub analysis from their profile
        resume_data: The candidate's parsed resume data
        last_ai_timestamp: ISO timestamp of last AI message (for response timing)
    
    Returns:
        Tuple of (updated_conversation_data, ai_response_text, is_conversation_complete)
    """
    state = conversation_data.get("state", "technical_verification")
    messages = conversation_data.get("messages", [])
    
    # Calculate response time
    response_time = None
    if last_ai_timestamp:
        try:
            last_time = datetime.fromisoformat(last_ai_timestamp.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            response_time = int((now - last_time).total_seconds())
        except Exception as e:
            logger.warning(f"Could not parse timestamp: {e}")

    # Add candidate message to transcript
    messages.append({
        "role": "candidate",
        "content": candidate_message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stage": state,
        "response_time_seconds": response_time
    })

    tech_asked = conversation_data.get("technical_questions_asked", 0)
    career_asked = conversation_data.get("career_questions_asked", 0)
    is_complete = False

    if state == "technical_verification":
        tech_asked += 1
        conversation_data["technical_questions_asked"] = tech_asked
        
        if tech_asked >= 6:
            # Transition to career_preferences
            state = "career_preferences"
            conversation_data["state"] = state
            if "technical_verification" not in conversation_data.get("stages_completed", []):
                conversation_data["stages_completed"].append("technical_verification")
            
            transition_msg = "Great, thanks for walking me through those technical details. Now let's switch gears \u2014 I'd like to understand what you're looking for in your next opportunity.\n\nWhat kind of company environment excites you most right now \u2014 early-stage startup, growth-stage, or a more established company? And what matters most to you: learning, compensation, ownership, or impact?"
            
            ai_response = transition_msg
        else:
            # Generate next technical question
            ai_response = await _generate_technical_question(
                messages, github_analysis, resume_data, tech_asked
            )

    elif state == "career_preferences":
        career_asked += 1
        conversation_data["career_questions_asked"] = career_asked
        
        if career_asked >= 5:
            # Transition to summary
            state = "summary"
            conversation_data["state"] = state
            if "career_preferences" not in conversation_data.get("stages_completed", []):
                conversation_data["stages_completed"].append("career_preferences")
            conversation_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            is_complete = True
            
            ai_response = "Thank you for sharing all of that! I now have a comprehensive picture of your technical skills and career preferences. Your TalentBox profile is being finalized \u2014 you'll be matched with relevant startup opportunities based on everything we've discussed.\n\nYou can close this conversation and check your updated dashboard. Good luck with your search!"
        else:
            # Generate next career question
            ai_response = await _generate_career_question(
                messages, github_analysis, career_asked
            )

    else:
        # Already complete or unknown state
        ai_response = "Your conversation is already complete! Check your dashboard for your updated profile."
        is_complete = True

    # Add AI response to transcript
    messages.append({
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stage": state
    })

    conversation_data["messages"] = messages
    return conversation_data, ai_response, is_complete


async def _generate_technical_question(
    messages: list, github_analysis: dict, resume_data: dict, question_number: int
) -> str:
    """Generate the next technical question based on context."""
    
    top_projects = github_analysis.get("top_projects", [])
    primary_languages = github_analysis.get("primary_languages", [])
    seniority = github_analysis.get("seniority_level", "Mid-Level")
    skills = github_analysis.get("top_skills", [])
    
    # Build conversation transcript for context
    transcript = "\\n".join([
        f"{'AI' if m['role'] == 'assistant' else 'Candidate'}: {m['content'][:300]}"
        for m in messages[-6:]  # last 6 messages for context
    ])
    
    # Build project context
    project_context = ""
    if top_projects:
        project_context = "Candidate's GitHub projects:\\n"
        for p in top_projects[:3]:
            project_context += f"- {p.get('name')}: {p.get('description', 'No description')} (Language: {p.get('language', 'N/A')}, Stars: {p.get('stars', 0)})\\n"
    
    system_prompt = f"""You are a senior technical interviewer at a startup talent platform. Your job is to verify the candidate's actual technical depth through conversational questions.

Candidate profile:
- Seniority: {seniority}
- Primary languages: {', '.join(primary_languages[:5])}
- Key skills: {', '.join(skills[:8])}
{project_context}

Current question number: {question_number} of 6

RULES:
1. For questions 1-3: Ask about their SPECIFIC GitHub projects by name. Reference their repos directly.
2. For questions 4-5: Ask a debugging or system design scenario tailored to their primary language/stack.
3. For question 6: Ask an architecture tradeoff question appropriate to their seniority level.
4. ALWAYS reference the candidate's previous answer in your follow-up. If they mentioned a specific technology, ask a deeper question about it.
5. Keep questions concise (2-4 sentences max).
6. Never ask generic textbook questions. Every question must feel personalized.
7. Return ONLY the question text. No labels, no "Question X:", no markdown."""

    user_message = f"Recent conversation:\\n{transcript}\\n\\nGenerate the next interview question."
    
    response = await _call_groq(system_prompt, user_message, max_tokens=300)
    
    if not response:
        # Fallback question if Groq fails
        if top_projects and question_number <= 3:
            proj = top_projects[min(question_number - 1, len(top_projects) - 1)]
            return f"Tell me about your {proj.get('name')} project. What was the most challenging part of building it?"
        else:
            return "Can you walk me through how you would design a system to handle real-time notifications for 50,000 users?"
    
    return response


async def _generate_career_question(messages: list, github_analysis: dict, question_number: int) -> str:
    """Generate the next career preference question."""
    
    transcript = "\\n".join([
        f"{'AI' if m['role'] == 'assistant' else 'Candidate'}: {m['content'][:300]}"
        for m in messages[-4:]
    ])
    
    career_topics = [
        "work style preferences (remote/hybrid/onsite, async vs sync, team size preference)",
        "compensation expectations and what salary range they're targeting",
        "availability \u2014 notice period, when they could start a new role",
        "industries or types of products they're most excited about (AI, fintech, devtools, etc.)",
        "what they'd want to avoid in their next role \u2014 any dealbreakers or red flags"
    ]
    
    topic = career_topics[min(question_number - 1, len(career_topics) - 1)]
    
    system_prompt = f"""You are a friendly career advisor at a startup talent platform. You're having a conversational interview to understand what the candidate wants in their next role.

Current topic to explore: {topic}

RULES:
1. Ask about the topic naturally, not as a formal survey question.
2. Reference something from their previous answer to make it flow conversationally.
3. Keep it to 1-2 sentences.
4. Return ONLY the question text. No labels, no markdown."""

    user_message = f"Recent conversation:\\n{transcript}\\n\\nAsk about: {topic}"
    
    response = await _call_groq(system_prompt, user_message, max_tokens=200)
    
    if not response:
        fallback_questions = [
            "Do you prefer working remotely, in a hybrid setup, or fully onsite? And do you lean toward async communication or do you prefer more real-time collaboration?",
            "What salary range are you targeting for your next role? It's fine to give a ballpark \u2014 this helps us match you with opportunities that fit.",
            "What's your current availability? Are you actively looking, or is there a notice period to consider?",
            "Are there specific industries or types of products that excite you most?",
            "Is there anything you'd want to avoid in your next role \u2014 any dealbreakers?"
        ]
        return fallback_questions[min(question_number - 1, len(fallback_questions) - 1)]
    
    return response


async def extract_final_profile(conversation_data: dict, github_analysis: dict, resume_data: dict) -> Dict:
    """
    After conversation completes, extract structured career preferences and 
    technical assessment from the full transcript.
    Returns: {"career_preferences": {...}, "technical_assessment": {...}, "updated_summary": "..."}
    """
    messages = conversation_data.get("messages", [])
    
    # Build full transcript
    transcript = "\\n".join([
        f"{'AI' if m['role'] == 'assistant' else 'Candidate'}: {m['content']}"
        for m in messages
    ])
    
    # Calculate timing signals
    candidate_messages = [m for m in messages if m["role"] == "candidate"]
    response_times = [m.get("response_time_seconds") for m in candidate_messages if m.get("response_time_seconds") is not None]
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    fast_responses = sum(1 for t in response_times if t is not None and t < 5)
    
    # Extract career preferences via Groq
    career_prompt = f"""Extract structured career preferences from this interview transcript.
Return ONLY valid JSON (no markdown, no backticks):

Transcript:
{transcript[:6000]}

Return JSON:
{{
    "company_type_preference": "startup/growth-stage/established/any",
    "startup_stage_preference": "seed/series-a/series-b/growth/any",
    "optimizing_for": ["list of: learning, compensation, ownership, impact, work-life-balance"],
    "work_style": "remote/hybrid/onsite/flexible",
    "async_preference": "async/sync/mixed",
    "team_size_preference": "small (1-10)/medium (11-50)/large (50+)/any",
    "compensation_range": "stated range or 'not disclosed'",
    "currency": "USD/INR/EUR/other or null",
    "notice_period": "immediate/2 weeks/1 month/2 months/3 months/not stated",
    "availability": "actively looking/open to offers/not looking/not stated",
    "industries_interested": ["list of industries mentioned"],
    "industries_to_avoid": ["list of industries to avoid"],
    "dealbreakers": ["list of dealbreakers mentioned"],
    "relocation_open": true/false/null
}}"""

    career_prefs = {}
    career_response = await _call_groq(
        "You are a data extraction system. Extract structured data from interview transcripts. Return ONLY valid JSON.",
        career_prompt,
        max_tokens=600
    )
    if career_response:
        try:
            cleaned = career_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\\n", 1)[1]
                if cleaned.endswith("```"):
                    cleaned = cleaned.rsplit("```", 1)[0]
            career_prefs = json.loads(cleaned)
        except Exception as e:
            logger.error(f"Failed to parse career preferences JSON from Groq: {e}")

    # Extract technical assessment via Groq
    tech_prompt = f"""Evaluate the candidate's technical depth from this interview transcript.
Return ONLY valid JSON (no markdown, no backticks):

Candidate GitHub Skills: {json.dumps(github_analysis.get('top_skills', []))}
Candidate Seniority (from GitHub): {github_analysis.get('seniority_level', 'unknown')}

Transcript:
{transcript[:6000]}

Return JSON:
{{
    "technical_depth_score": integer 0-100,
    "communication_clarity": integer 0-100,
    "problem_solving_approach": "structured/intuitive/mixed",
    "experience_verified": true/false,
    "strongest_areas": ["list of 2-3 strongest technical areas demonstrated"],
    "growth_areas": ["list of 1-2 areas where they could improve"],
    "seniority_assessment": "Junior/Mid-Level/Senior/Staff/Expert",
    "key_observations": "2-3 sentence summary of their technical interview performance"
}}"""

    tech_assessment = {}
    tech_response = await _call_groq(
        "You are a technical interviewer evaluation system. Assess candidates based on interview transcripts. Return ONLY valid JSON.",
        tech_prompt,
        max_tokens=500
    )
    if tech_response:
        try:
            cleaned = tech_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\\n", 1)[1]
                if cleaned.endswith("```"):
                    cleaned = cleaned.rsplit("```", 1)[0]
            tech_assessment = json.loads(cleaned)
        except Exception as e:
            logger.error(f"Failed to parse technical assessment JSON from Groq: {e}")
    
    # Add timing signals to technical assessment
    tech_assessment["timing_signals"] = {
        "avg_response_time_seconds": round(avg_response_time, 1),
        "fast_responses_under_5s": fast_responses,
        "total_candidate_messages": len(candidate_messages)
    }

    # Generate updated comprehensive summary
    summary_prompt = f"""Write a 4-5 sentence professional recruiter summary for this developer.
Combine their GitHub profile data with their interview responses.

GitHub data:
- Role: {github_analysis.get('detected_role', 'Software Developer')}
- Skills: {', '.join(github_analysis.get('top_skills', [])[:8])}
- Seniority: {github_analysis.get('seniority_level', 'Mid-Level')}
- Engineering maturity: {github_analysis.get('engineering_maturity', 'developing')}

Interview findings:
- Technical depth: {tech_assessment.get('technical_depth_score', 'N/A')}/100
- Strongest areas: {', '.join(tech_assessment.get('strongest_areas', []))}
- Looking for: {career_prefs.get('company_type_preference', 'N/A')} company, {career_prefs.get('work_style', 'flexible')} work style
- Optimizing for: {', '.join(career_prefs.get('optimizing_for', []))}

Return ONLY the summary text, no labels or formatting."""

    updated_summary = await _call_groq(
        "You are a professional recruiter writing candidate summaries. Be specific and factual.",
        summary_prompt,
        max_tokens=250
    )

    return {
        "career_preferences": career_prefs,
        "technical_assessment": tech_assessment,
        "updated_summary": updated_summary or github_analysis.get("ai_summary")
    }
