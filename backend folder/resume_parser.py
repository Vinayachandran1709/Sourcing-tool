"""
Resume Parser
Extracts structured data from uploaded resumes (PDF, DOCX, TXT).
Uses Groq to extract work history, skills, education from raw text.
"""

import io
import os
import json
import logging
import httpx
from typing import Dict, Optional

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    """Extract raw text from PDF, DOCX, or TXT bytes."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    text = ""
    
    try:
        if ext == "txt":
            text = file_bytes.decode("utf-8", errors="ignore")
        elif ext == "pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception as pdf_err:
                logger.error(f"PDF extraction error: {pdf_err}")
        elif ext in ("docx", "doc"):
            try:
                import docx as _docx
                doc = _docx.Document(io.BytesIO(file_bytes))
                text = "\n".join(p.text for p in doc.paragraphs)
            except Exception as docx_err:
                logger.error(f"DOCX extraction error: {docx_err}")
                
        return text.strip()
    except Exception as e:
        logger.error(f"Resume text extraction error: {e}")
        return ""


async def parse_resume(raw_text: str) -> Dict:
    """Parse raw resume text into structured JSON using Groq."""
    if not raw_text or len(raw_text) < 50:
        return {"raw_text": raw_text, "parse_error": "Text too short or empty"}
        
    if not GROQ_API_KEY:
        return {"raw_text": raw_text[:5000], "parse_error": "AI service unavailable"}
        
    try:
        prompt = f"""Extract structured data from this resume text. Return ONLY valid JSON (no markdown):

Resume Text:
{raw_text[:4000]}

Return JSON:
{{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone or null",
  "current_title": "current job title or null",
  "current_company": "current company or null",
  "years_of_experience": 0,
  "location": "location or null",
  "work_history": [
    {{"company": "...", "title": "...", "duration": "...", "description": "1-2 sentence summary"}}
  ],
  "education": [
    {{"institution": "...", "degree": "...", "field": "...", "year": "..."}}
  ],
  "skills": ["Python", "React", "AWS"],
  "certifications": ["AWS Solutions Architect"],
  "summary": "2-3 sentence professional summary"
}}"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000,
                    "temperature": 0.1
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                result_text = data["choices"][0]["message"]["content"].strip()
                
                # Clean markdown
                if result_text.startswith("```"):
                    result_text = result_text.split("\n", 1)[1]
                    if result_text.endswith("```"):
                        result_text = result_text.rsplit("```", 1)[0]
                        
                parsed = json.loads(result_text)
                
                # Make sure years_of_experience is an integer or null
                yoe = parsed.get("years_of_experience")
                if yoe is not None and not isinstance(yoe, int):
                    try:
                        parsed["years_of_experience"] = int(str(yoe).split()[0])
                    except ValueError:
                        parsed["years_of_experience"] = None
                        
                return parsed
            else:
                logger.error(f"Groq API error parsing resume: {response.status_code}")
                return {"raw_text": raw_text[:5000], "parse_error": f"API error {response.status_code}"}
                
    except Exception as e:
        logger.error(f"Error parsing resume: {e}")
        return {"raw_text": raw_text[:5000], "parse_error": f"Exception: {str(e)}"}
