import os
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

redis_client = None


async def init_redis():
    """Connect to Redis using REDIS_URL. On failure, log a warning and continue without Redis."""
    global redis_client

    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.warning("REDIS_URL not set - Redis caching disabled")
        return

    try:
        import redis.asyncio as aioredis

        pool = aioredis.ConnectionPool.from_url(
            redis_url,
            max_connections=20,
            decode_responses=True,
        )
        client = aioredis.Redis(connection_pool=pool)
        await client.ping()
        redis_client = client
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed - caching disabled: {e}")
        redis_client = None


# ===== PROFILE CACHE =====

async def get_cached_profile(username: str):
    """Return cached profile dict for username, or None."""
    if redis_client is None:
        return None
    try:
        raw = await redis_client.get(f"profile:{username}")
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


async def set_cached_profile(username: str, profile_data: dict, contributions: int):
    """Store profile_data in Redis with a TTL based on contribution activity."""
    if redis_client is None:
        return
    try:
        if contributions > 200:
            ttl = 86400       # 24 hours
        elif contributions >= 50:
            ttl = 172800      # 48 hours
        else:
            ttl = 604800      # 7 days

        await redis_client.set(
            f"profile:{username}",
            json.dumps(profile_data),
            ex=ttl,
        )
    except Exception:
        pass


# ===== SEARCH CACHE =====

async def get_cached_search(filter_hash: str):
    """Return cached list of usernames for a filter hash, or None."""
    if redis_client is None:
        return None
    try:
        raw = await redis_client.get(f"search:{filter_hash}")
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


async def set_cached_search(filter_hash: str, usernames: list):
    """Store usernames list in Redis with a 6-hour TTL."""
    if redis_client is None:
        return
    try:
        await redis_client.set(
            f"search:{filter_hash}",
            json.dumps(usernames),
            ex=21600,  # 6 hours
        )
    except Exception:
        pass


# ===== UTILITIES =====

def hash_filters(filters: dict) -> str:
    """Return an MD5 hex digest of a canonicalised filter dict."""
    canonical = str(sorted(filters.items()))
    return hashlib.md5(canonical.encode()).hexdigest()


async def get_redis_stats() -> dict:
    """Return basic Redis connection info."""
    if redis_client is None:
        return {"connected": False}
    try:
        await redis_client.ping()
        return {"connected": True}
    except Exception:
        return {"connected": False}
