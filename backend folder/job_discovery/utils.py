"""Shared utilities for job discovery pipeline."""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


def normalize_domain(url: str) -> str:
    """Extract and normalize domain from URL."""
    if not url:
        return ""
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        domain = parsed.netloc.lower().strip()
        domain = re.sub(r"^www\.", "", domain)
        return domain
    except Exception:
        return ""


async def fetch_page(url: str, timeout: float = 15.0) -> Optional[str]:
    """Fetch a web page and return its HTML content."""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            response = await client.get(url, headers=HEADERS)
            if response.status_code == 200:
                return response.text
            logger.warning("HTTP %s fetching %s", response.status_code, url)
    except Exception as exc:
        logger.error("Failed to fetch %s: %s", url, exc)
    return None


def extract_text_from_html(html: str, max_length: int = 5000) -> str:
    """Strip HTML tags and return clean text."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text[:max_length]


def extract_links_from_html(html: str, base_url: str = "") -> List[Dict[str, str]]:
    """Extract all links from HTML with their surrounding text."""
    soup = BeautifulSoup(html, "html.parser")
    links: List[Dict[str, str]] = []

    for anchor in soup.find_all("a", href=True):
        href = (anchor.get("href") or "").strip()
        if not href or href.startswith(("mailto:", "tel:", "#", "javascript:")):
            continue

        absolute_url = urljoin(base_url, href) if base_url else href
        text = anchor.get_text(strip=True)
        if absolute_url.startswith("http"):
            links.append({"url": absolute_url, "text": text[:200]})

    return links


async def call_groq(system_prompt: str, user_message: str, max_tokens: int = 1000) -> Optional[str]:
    """Call Groq API. Returns response text or None on failure."""
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY not set")
        return None

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.1,
                },
            )
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()

            logger.error("Groq error: %s - %s", response.status_code, response.text[:500])
    except Exception as exc:
        logger.error("Groq call failed: %s", exc)

    return None


def parse_json_from_llm(text: str) -> Optional[Any]:
    """Parse JSON from LLM response, handling markdown code blocks."""
    if not text:
        return None

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"[\[\{].*[\]\}]", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass

    logger.error("Failed to parse JSON from LLM: %s", text[:200])
    return None


def load_config(filename: str) -> list:
    """Load a JSON config file from the config/ directory."""
    config_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config")
    filepath = os.path.join(config_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_config(filename: str, data: list) -> None:
    """Save data to a JSON config file in the config/ directory."""
    config_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config")
    os.makedirs(config_dir, exist_ok=True)
    filepath = os.path.join(config_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
