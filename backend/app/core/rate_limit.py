import time
from fastapi import Request, HTTPException, status, Depends
from app.core.redis import redis_client, redis_available
from app.core.security import get_current_user
from app.db.models.user import User

class RateLimiter:
    def __init__(self, requests_limit: int = 10, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds

    def __call__(self, request: Request, current_user: User = Depends(get_current_user)):
        # If Redis is down or unavailable, bypass rate limit check gracefully
        if not redis_available or not redis_client:
            return

        # Use authenticated user_id; fall back to IP if somehow missing
        user_id = current_user.id if current_user else getattr(request.state, "user_id", None)
        if user_id is None:
            user_id = request.client.host if request.client else "unknown"

        endpoint = request.url.path
        now = time.time()

        # Sliding Window using a Redis Sorted Set.
        # Each request is stored as a member scored by its exact arrival timestamp.
        # On every request we:
        #   1. Remove all entries older than the window (zremrangebyscore)
        #   2. Add the current request with score = current timestamp (zadd)
        #   3. Count how many entries remain in the set (zcard)
        # All three steps run atomically via a pipeline — no race conditions.
        rate_limit_key = f"rate_limit_sw:{user_id}:{endpoint}"

        try:
            pipe = redis_client.pipeline()
            # Step 1: Evict timestamps that have fallen outside the rolling window
            pipe.zremrangebyscore(rate_limit_key, 0, now - self.window_seconds)
            # Step 2: Record this request (use str(now) as a unique member name)
            pipe.zadd(rate_limit_key, {str(now): now})
            # Step 3: Count requests currently inside the window
            pipe.zcard(rate_limit_key)
            # Step 4: Auto-expire the whole key so Redis doesn't accumulate stale keys
            pipe.expire(rate_limit_key, self.window_seconds)
            results = pipe.execute()

            current_requests = results[2]  # zcard result

            if current_requests > self.requests_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. You can send {self.requests_limit} requests "
                           f"per {self.window_seconds} seconds. Please wait before retrying."
                )
        except HTTPException:
            raise
        except Exception as e:
            # Bypass rate limit gracefully if Redis has an unexpected error
            print(f"[RATE LIMIT WARNING] Sliding window rate limiter error: {e}")
            return
