import hashlib
from ddgs import DDGS
from app.core.redis import redis_client, redis_available
from app.core.config import settings

def search_web(query: str, max_results: int = 5) -> str:
    # 1. Try to fetch from Redis cache if available
    cache_key = None
    if redis_available and redis_client:
        # Create a unique MD5 key for the search parameters
        query_hash = hashlib.md5(f"{query}_{max_results}".encode('utf-8')).hexdigest()
        cache_key = f"web_search:{query_hash}"
        try:
            cached_val = redis_client.get(cache_key)
            if cached_val:
                print(f"[CACHE HIT] Returning cached results for query: '{query}'")
                return cached_val
        except Exception as cache_err:
            print(f"[CACHE ERROR] Failed to read from Redis: {cache_err}")

    # 2. Perform actual search if cache miss or Redis down
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            if not results:
                return f"No search results found for query: '{query}'"
            
            formatted_results = []
            for idx, r in enumerate(results, 1):
                title = r.get("title", "No Title")
                link = r.get("href", "#")
                snippet = r.get("body", "No description available")
                formatted_results.append(
                    f"Result {idx}:\nTitle: {title}\nURL: {link}\nSnippet: {snippet}\n---"
                )
            output = "\n".join(formatted_results)
            
            # 3. Save to Redis cache for future calls
            if redis_available and redis_client and cache_key:
                try:
                    redis_client.setex(cache_key, settings.CACHE_TTL_SECONDS, output)
                    print(f"[CACHE SET] Cached search results for query: '{query}' with TTL={settings.CACHE_TTL_SECONDS}s")
                except Exception as cache_err:
                    print(f"[CACHE ERROR] Failed to write to Redis: {cache_err}")
            
            return output
            
    except Exception as e:
        return f"Error during web search: {str(e)}"
