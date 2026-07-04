import time
from fastapi import Request, HTTPException, status, Depends
from app.core.redis import redis_client, redis_available

class RateLimiter:
    def __init__(self, requests_limit: int = 10, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds

    def __call__(self, request: Request):
        # If Redis is down or unavailable, bypass rate limit check
        if not redis_available or not redis_client:
            return
        
        # Extract user_id from request state (set by get_current_user dependency in endpoint)
        # If no user context available, use client IP as fallback
        user_id = getattr(request.state, "user_id", None)
        if user_id is None:
            user_id = request.client.host if request.client else "unknown"
            
        endpoint = request.url.path
        
        # Fixed window block key based on current timestamp
        current_time = int(time.time())
        window_block = current_time // self.window_seconds
        
        rate_limit_key = f"rate_limit:{user_id}:{endpoint}:{window_block}"
        
        try:
            # Increment request counter
            current_requests = redis_client.incr(rate_limit_key)
            
            # Set expiration on the first request in this block window
            if current_requests == 1:
                redis_client.expire(rate_limit_key, self.window_seconds)
                
            if current_requests > self.requests_limit:
                time_remaining = self.window_seconds - (current_time % self.window_seconds)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Please try again in {time_remaining} seconds."
                )
        except HTTPException:
            raise
        except Exception as e:
            # Bypass rate limit gracefully in case of Redis exceptions
            print(f"[RATE LIMIT WARNING] Redis rate limiter error: {e}")
            return
