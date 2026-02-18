"""
GitHub API Rate Limiter

- Global asyncio.Semaphore(5) to cap concurrent GitHub requests
- 0.2s delay between individual requests
- Parse Retry-After, X-RateLimit-* headers from all GitHub responses
- Detect secondary rate limits (403 abuse detection)
- Exponential backoff on 429/403
- Log rate limit events to DB
"""

import asyncio
import time
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Global semaphore: max 5 concurrent GitHub API requests
_github_semaphore = asyncio.Semaphore(5)

# Track token pause state (monotonic time when token becomes usable again)
_token_paused_until: float = 0.0


def parse_rate_limit_headers(response) -> dict:
    """Extract rate limit info from GitHub response headers."""
    headers = response.headers

    def safe_int(val, default=-1):
        try:
            return int(val)
        except (TypeError, ValueError):
            return default

    return {
        "remaining": safe_int(headers.get("X-RateLimit-Remaining")),
        "used": safe_int(headers.get("X-RateLimit-Used")),
        "limit": safe_int(headers.get("X-RateLimit-Limit")),
        "resource": headers.get("X-RateLimit-Resource", ""),
        "retry_after": safe_int(headers.get("Retry-After"), 0),
        "reset": safe_int(headers.get("X-RateLimit-Reset")),
    }


def is_secondary_rate_limit(response) -> bool:
    """Check if a 403 response is a secondary/abuse rate limit."""
    if response.status_code != 403:
        return False
    try:
        body = response.json() if response.content else {}
    except Exception:
        body = {}
    message = body.get("message", "").lower()
    return any(kw in message for kw in ["abuse", "secondary", "rate limit"])


async def execute_with_rate_limit(client, method: str, url: str, **kwargs):
    """
    Execute an HTTP request through the global rate limiter.

    - Acquires semaphore (max 5 concurrent)
    - Adds 0.2s delay between requests
    - Retries on 429/403 with exponential backoff
    - Logs rate limit events to DB
    """
    global _token_paused_until

    # Wait if token is globally paused
    now = time.monotonic()
    if _token_paused_until > now:
        wait = _token_paused_until - now
        logger.warning(f"GitHub token paused, waiting {wait:.1f}s")
        await asyncio.sleep(wait)

    async with _github_semaphore:
        # Small delay between requests to avoid burst
        await asyncio.sleep(0.2)

        for attempt in range(3):
            try:
                response = await getattr(client, method)(url, **kwargs)
            except Exception as e:
                logger.error(f"HTTP request failed: {e}")
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

            rl_headers = parse_rate_limit_headers(response)

            # Success
            if response.status_code == 200:
                if rl_headers["remaining"] != -1 and rl_headers["remaining"] < 50:
                    logger.warning(
                        f"GitHub rate limit low: {rl_headers['remaining']} remaining "
                        f"(resource: {rl_headers['resource']})"
                    )
                return response

            # Rate limited or secondary abuse
            if response.status_code == 429 or is_secondary_rate_limit(response):
                retry_after = rl_headers["retry_after"] or 60
                backoff = retry_after * (2 ** attempt)
                event_type = "secondary" if response.status_code == 403 else "429"

                logger.error(
                    f"GitHub rate limit hit! type={event_type} status={response.status_code} "
                    f"retry_after={retry_after}s backoff={backoff}s attempt={attempt + 1}/3"
                )

                # Pause token globally
                _token_paused_until = time.monotonic() + backoff

                # Log event asynchronously
                asyncio.create_task(_log_event_safe(
                    event_type=event_type,
                    status_code=response.status_code,
                    retry_after=retry_after,
                    remaining=rl_headers["remaining"],
                    resource=rl_headers["resource"],
                    endpoint=url,
                ))

                if attempt < 2:
                    await asyncio.sleep(backoff)
                    continue

            # Non-rate-limit error — return as-is (let caller handle)
            return response

        return response


async def _log_event_safe(event_type, status_code, retry_after=None,
                          remaining=None, resource=None, endpoint=None):
    """Log a rate limit event to DB. Fire-and-forget, never raises."""
    try:
        from database import SessionLocal
        from models import RateLimitEvent

        db = SessionLocal()
        try:
            event = RateLimitEvent(
                event_type=event_type,
                status_code=status_code,
                retry_after=retry_after,
                rate_limit_remaining=remaining if remaining != -1 else None,
                rate_limit_resource=resource or None,
                endpoint=endpoint,
            )
            db.add(event)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to log rate limit event: {e}")
