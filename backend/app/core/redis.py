import redis
from app.core.config import settings

try:
    # Fail fast after 2 seconds if Redis is not running
    redis_client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=2.0,
        socket_timeout=2.0
    )
    redis_client.ping()
    redis_available = True
    print("[REDIS] Connected to Redis successfully.")
except Exception as e:
    print(f"[REDIS WARNING] Failed to connect to Redis: {e}. Caching and rate limiting will be bypassed.")
    redis_client = None
    redis_available = False
