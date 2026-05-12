"""
Portfolio Fetcher
Simple utility that fetches a portfolio URL and extracts basic info.
"""

import logging
import httpx
from typing import Dict
import re

logger = logging.getLogger(__name__)

async def fetch_portfolio(url: str) -> Dict:
    """Fetch a portfolio URL and extract basic content."""
    
    if not url or not url.startswith('http'):
        url = 'https://' + url if url else ""
        if not url:
            return {"error": "Invalid URL"}
            
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            # We use a standard User-Agent so we don't get blocked easily
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                return {"url": url, "error": f"HTTP {response.status_code}"}
                
            html = response.text
            
            # Extract title
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else ""
            
            # Extract meta description
            desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\'][^>]*>', html, re.IGNORECASE)
            if not desc_match:
                # Some sites put content before name
                desc_match = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\'][^>]*>', html, re.IGNORECASE)
            description = desc_match.group(1).strip() if desc_match else ""
            
            # Extract body text (very naive strip HTML)
            body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.IGNORECASE | re.DOTALL)
            body_html = body_match.group(1) if body_match else html
            
            # Remove scripts and styles
            body_html = re.sub(r'<script[^>]*>.*?</script>', ' ', body_html, flags=re.IGNORECASE | re.DOTALL)
            body_html = re.sub(r'<style[^>]*>.*?</style>', ' ', body_html, flags=re.IGNORECASE | re.DOTALL)
            
            # Remove HTML tags
            text_content = re.sub(r'<[^>]+>', ' ', body_html)
            
            # Clean up whitespace
            text_content = re.sub(r'\s+', ' ', text_content).strip()
            
            return {
                "url": url,
                "title": title[:200],
                "description": description[:500],
                "content_preview": text_content[:2000]
            }
            
    except Exception as e:
        logger.error(f"Portfolio fetch error for {url}: {e}")
        return {"url": url, "error": "Failed to fetch"}
