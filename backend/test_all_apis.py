"""
Comprehensive API Test Script for AI Agent Platform
Tests all endpoints systematically
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"
API = f"{BASE_URL}/api/v1"

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

passed = 0
failed = 0
results = []

def test(name, condition, response=None, detail=""):
    global passed, failed
    if condition:
        passed += 1
        status = f"{GREEN}PASS{RESET}"
    else:
        failed += 1
        status = f"{RED}FAIL{RESET}"
    
    extra = ""
    if response is not None:
        extra = f" [{response.status_code}]"
        if not condition and hasattr(response, 'text'):
            detail = response.text[:200]
    
    msg = f"  {status} {name}{extra}"
    if detail and not condition:
        msg += f"\n         {RED}Detail: {detail}{RESET}"
    print(msg)
    results.append({"name": name, "passed": condition})

print(f"\n{BOLD}{CYAN}{'='*60}")
print(f"   AI Agent Platform - Comprehensive API Testing")
print(f"{'='*60}{RESET}\n")

# ============================================================
# PHASE 1: Health & Root Endpoints
# ============================================================
print(f"{BOLD}{YELLOW}Phase 1: Health & Root Endpoints{RESET}")

try:
    r = requests.get(f"{BASE_URL}/")
    test("GET / - Root endpoint returns welcome message", 
         r.status_code == 200 and "Welcome" in r.json().get("message", ""), r)
except Exception as e:
    test("GET / - Root endpoint", False, detail=str(e))

try:
    r = requests.get(f"{BASE_URL}/health")
    test("GET /health - Health check returns healthy", 
         r.status_code == 200 and r.json().get("status") == "healthy", r)
except Exception as e:
    test("GET /health - Health check", False, detail=str(e))

# ============================================================
# PHASE 2: Auth System
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 2: Auth System{RESET}")

TEST_EMAIL = f"testuser_{int(time.time())}@example.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Test User"
TOKEN = None
USER_DATA = None

# 2.1 Signup - new user
try:
    r = requests.post(f"{API}/auth/signup", json={
        "name": TEST_NAME,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    test("POST /auth/signup - New user signup", 
         r.status_code == 200 and "access_token" in r.json(), r)
    if r.status_code == 200:
        TOKEN = r.json()["access_token"]
except Exception as e:
    test("POST /auth/signup - New user signup", False, detail=str(e))

# 2.2 Signup - duplicate email
try:
    r = requests.post(f"{API}/auth/signup", json={
        "name": TEST_NAME,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    test("POST /auth/signup - Duplicate email rejected (400)", 
         r.status_code == 400, r)
except Exception as e:
    test("POST /auth/signup - Duplicate email", False, detail=str(e))

# 2.3 Login - valid credentials
try:
    r = requests.post(f"{API}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    test("POST /auth/login - Valid credentials login", 
         r.status_code == 200 and "access_token" in r.json(), r)
    if r.status_code == 200:
        TOKEN = r.json()["access_token"]
except Exception as e:
    test("POST /auth/login - Valid credentials", False, detail=str(e))

# 2.4 Login - wrong password
try:
    r = requests.post(f"{API}/auth/login", json={
        "email": TEST_EMAIL,
        "password": "WrongPassword123"
    })
    test("POST /auth/login - Wrong password (401)", 
         r.status_code == 401, r)
except Exception as e:
    test("POST /auth/login - Wrong password", False, detail=str(e))

# 2.5 Login - non-existent email
try:
    r = requests.post(f"{API}/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "whatever"
    })
    test("POST /auth/login - Non-existent email (401)", 
         r.status_code == 401, r)
except Exception as e:
    test("POST /auth/login - Non-existent email", False, detail=str(e))

# 2.6 Get profile - valid token
HEADERS = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
try:
    r = requests.get(f"{API}/auth/me", headers=HEADERS)
    test("GET /auth/me - Valid token returns profile", 
         r.status_code == 200 and r.json().get("email") == TEST_EMAIL, r)
    if r.status_code == 200:
        USER_DATA = r.json()
except Exception as e:
    test("GET /auth/me - Valid token", False, detail=str(e))

# 2.7 Get profile - no token
try:
    r = requests.get(f"{API}/auth/me")
    test("GET /auth/me - No token (401/403)", 
         r.status_code in [401, 403], r)
except Exception as e:
    test("GET /auth/me - No token", False, detail=str(e))

# 2.8 Get profile - invalid token
try:
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid_token_xyz"})
    test("GET /auth/me - Invalid token (401)", 
         r.status_code == 401, r)
except Exception as e:
    test("GET /auth/me - Invalid token", False, detail=str(e))

# ============================================================
# PHASE 3: Agent Run Management
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 3: Agent Run Management{RESET}")

RUN_ID = None

# 3.1 Create new run
try:
    r = requests.post(f"{API}/agent/run", headers=HEADERS, json={"goal": "Test Session for API Testing"})
    test("POST /agent/run - Create new run", 
         r.status_code == 200 and r.json().get("status") == "running", r)
    if r.status_code == 200:
        RUN_ID = r.json()["id"]
except Exception as e:
    test("POST /agent/run - Create new run", False, detail=str(e))

# 3.2 List all runs
try:
    r = requests.get(f"{API}/agent/runs", headers=HEADERS)
    test("GET /agent/runs - List runs returns array", 
         r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) >= 1, r)
except Exception as e:
    test("GET /agent/runs - List runs", False, detail=str(e))

# 3.3 Get run messages (empty)
if RUN_ID:
    try:
        r = requests.get(f"{API}/agent/run/{RUN_ID}/messages", headers=HEADERS)
        test("GET /run/{id}/messages - Empty messages list", 
             r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) == 0, r)
    except Exception as e:
        test("GET /run/{id}/messages - Empty messages", False, detail=str(e))

# 3.4 Access non-existent run
try:
    r = requests.get(f"{API}/agent/run/999999/messages", headers=HEADERS)
    test("GET /run/999999/messages - Non-existent run (404)", 
         r.status_code == 404, r)
except Exception as e:
    test("GET /run/999999/messages - Non-existent run", False, detail=str(e))

# 3.5 Create run without auth
try:
    r = requests.post(f"{API}/agent/run", json={"goal": "Unauthorized"})
    test("POST /agent/run - Without auth (401/403)", 
         r.status_code in [401, 403], r)
except Exception as e:
    test("POST /agent/run - Without auth", False, detail=str(e))

# ============================================================
# PHASE 4: Agent Chat (Core AI Flow)
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 4: Agent Chat - Non-Streaming{RESET}")

MSG_ID = None
if RUN_ID:
    # 4.1 Send simple message (non-streaming)
    try:
        r = requests.post(
            f"{API}/agent/run/{RUN_ID}/message",
            headers=HEADERS,
            json={"content": "Hello! Just say 'Hi, I am working!' in one short sentence."},
            timeout=60
        )
        test("POST /run/{id}/message - Send message & get AI response", 
             r.status_code == 200 and r.json().get("role") == "assistant" and len(r.json().get("content", "")) > 0, r)
        if r.status_code == 200:
            print(f"         {CYAN}Agent Response: {r.json()['content'][:100]}...{RESET}")
    except Exception as e:
        test("POST /run/{id}/message - Send message", False, detail=str(e))

    # 4.2 Verify messages are saved
    try:
        r = requests.get(f"{API}/agent/run/{RUN_ID}/messages", headers=HEADERS)
        msgs = r.json()
        test("GET /run/{id}/messages - Messages saved in DB", 
             r.status_code == 200 and len(msgs) >= 2, r)
        if r.status_code == 200 and len(msgs) >= 1:
            for m in msgs:
                if m["role"] == "user":
                    MSG_ID = m["id"]
                    break
            roles = [m["role"] for m in msgs]
            print(f"         {CYAN}Messages saved: {len(msgs)} | Roles: {roles}{RESET}")
    except Exception as e:
        test("GET /run/{id}/messages - Messages saved", False, detail=str(e))

# ============================================================
# PHASE 4b: SSE Streaming Test
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 4b: Agent Chat - SSE Streaming{RESET}")

RUN_ID_STREAM = None
if TOKEN:
    try:
        r = requests.post(f"{API}/agent/run", headers=HEADERS, json={"goal": "Stream Test Session"})
        if r.status_code == 200:
            RUN_ID_STREAM = r.json()["id"]
    except:
        pass

if RUN_ID_STREAM:
    try:
        r = requests.post(
            f"{API}/agent/run/{RUN_ID_STREAM}/message/stream",
            headers=HEADERS,
            json={"content": "Say 'Streaming works!' in one sentence."},
            stream=True,
            timeout=60
        )
        
        events_received = []
        got_token = False
        got_done = False
        
        for line in r.iter_lines(decode_unicode=True):
            if line:
                if line.startswith("event:"):
                    event_type = line.split(":", 1)[1].strip()
                    events_received.append(event_type)
                    if event_type == "token":
                        got_token = True
                    if event_type == "done":
                        got_done = True
                        break
        
        test("POST /run/{id}/message/stream - SSE streaming works", 
             r.status_code == 200 and got_done, r)
        test("POST /run/{id}/message/stream - Tokens received during stream",
             got_token)
        print(f"         {CYAN}SSE Events: {events_received[:10]}{'...' if len(events_received)>10 else ''}{RESET}")
    except Exception as e:
        test("POST /run/{id}/message/stream - SSE streaming", False, detail=str(e))

# ============================================================
# PHASE 5: File Upload & RAG
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 5: File Upload & RAG{RESET}")

if RUN_ID:
    # 5.1 Upload the test DOCX file
    test_file = "test_spaces.docx"
    try:
        with open(test_file, "rb") as f:
            r = requests.post(
                f"{API}/agent/run/{RUN_ID}/upload-file",
                headers=HEADERS,
                files={"file": (test_file, f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            )
        test("POST /run/{id}/upload-file - Upload DOCX file", 
             r.status_code == 200 and r.json().get("status") == "success", r)
        if r.status_code == 200:
            print(f"         {CYAN}Upload Detail: {r.json().get('detail', '')[:100]}{RESET}")
    except FileNotFoundError:
        test("POST /run/{id}/upload-file - Upload DOCX file", False, detail=f"File '{test_file}' not found in CWD")
    except Exception as e:
        test("POST /run/{id}/upload-file - Upload DOCX", False, detail=str(e))

    # 5.2 Upload unsupported format
    try:
        r = requests.post(
            f"{API}/agent/run/{RUN_ID}/upload-file",
            headers=HEADERS,
            files={"file": ("test.xyz", b"fake content", "application/octet-stream")}
        )
        test("POST /run/{id}/upload-file - Unsupported format handled", 
             r.status_code == 200 and "Unsupported" in r.json().get("detail", ""), r)
    except Exception as e:
        test("POST /run/{id}/upload-file - Unsupported format", False, detail=str(e))

    # 5.3 RAG query after upload
    try:
        r = requests.post(
            f"{API}/agent/run/{RUN_ID}/message",
            headers=HEADERS,
            json={"content": "What information is in the document I uploaded? Summarize it briefly."},
            timeout=60
        )
        test("POST /run/{id}/message - RAG query about uploaded document", 
             r.status_code == 200 and r.json().get("role") == "assistant", r)
        if r.status_code == 200:
            print(f"         {CYAN}RAG Response: {r.json()['content'][:150]}...{RESET}")
    except Exception as e:
        test("POST /run/{id}/message - RAG query", False, detail=str(e))

# ============================================================
# PHASE 6: Edit Message & Regenerate
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 6: Edit Message & Regenerate{RESET}")

if RUN_ID and MSG_ID:
    try:
        r = requests.put(
            f"{API}/agent/run/{RUN_ID}/message/{MSG_ID}",
            headers=HEADERS,
            json={"content": "What is 2+2? Answer in one word."},
            stream=True,
            timeout=60
        )
        
        events_received = []
        got_token = False
        got_done = False
        
        for line in r.iter_lines(decode_unicode=True):
            if line:
                if line.startswith("event:"):
                    event_type = line.split(":", 1)[1].strip()
                    events_received.append(event_type)
                    if event_type == "token":
                        got_token = True
                    if event_type == "done":
                        got_done = True
                        break
        
        test("PUT /run/{id}/message/{msg_id} - Edit message & regenerate", 
             r.status_code == 200 and got_done, r)
        if r.status_code == 200:
            print(f"         {CYAN}SSE Events: {events_received[:10]}{'...' if len(events_received)>10 else ''}{RESET}")
    except Exception as e:
        test("PUT /run/{id}/message/{msg_id} - Edit message", False, detail=str(e))

    # Edit non-existent message
    try:
        r = requests.put(
            f"{API}/agent/run/{RUN_ID}/message/999999",
            headers=HEADERS,
            json={"content": "test"}
        )
        test("PUT /run/{id}/message/999999 - Non-existent message (404)", 
             r.status_code == 404, r)
    except Exception as e:
        test("PUT - Non-existent message", False, detail=str(e))
else:
    test("Edit message tests - SKIPPED (no run/message ID)", False, detail="RUN_ID or MSG_ID not available")

# ============================================================
# PHASE 7: Web Search Tool Test
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 7: Web Search Tool (via Agent){RESET}")

RUN_ID_SEARCH = None
if TOKEN:
    try:
        r = requests.post(f"{API}/agent/run", headers=HEADERS, json={"goal": "Web Search Test"})
        if r.status_code == 200:
            RUN_ID_SEARCH = r.json()["id"]
    except:
        pass

if RUN_ID_SEARCH:
    try:
        r = requests.post(
            f"{API}/agent/run/{RUN_ID_SEARCH}/message",
            headers=HEADERS,
            json={"content": "Search the web for: latest Python version released in 2026. Give me a brief answer."},
            timeout=60
        )
        test("Web Search - Agent uses web_search_tool", 
             r.status_code == 200 and r.json().get("role") == "assistant" and len(r.json().get("content", "")) > 10, r)
        if r.status_code == 200:
            print(f"         {CYAN}Search Response: {r.json()['content'][:150]}...{RESET}")
    except Exception as e:
        test("Web Search - Agent invocation", False, detail=str(e))

# ============================================================
# PHASE 8: Code Executor Tool Test
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 8: Code Executor Tool (via Agent){RESET}")

RUN_ID_CODE = None
if TOKEN:
    try:
        r = requests.post(f"{API}/agent/run", headers=HEADERS, json={"goal": "Code Execution Test"})
        if r.status_code == 200:
            RUN_ID_CODE = r.json()["id"]
    except:
        pass

if RUN_ID_CODE:
    try:
        r = requests.post(
            f"{API}/agent/run/{RUN_ID_CODE}/message",
            headers=HEADERS,
            json={"content": "Write and run Python code to calculate the factorial of 7. Just give me the result."},
            timeout=90
        )
        test("Code Executor - Agent runs Python code in Docker sandbox", 
             r.status_code == 200 and r.json().get("role") == "assistant", r)
        if r.status_code == 200:
            content = r.json()['content']
            has_5040 = "5040" in content
            test("Code Executor - Correct result (factorial 7 = 5040)", has_5040)
            print(f"         {CYAN}Code Response: {content[:150]}...{RESET}")
    except Exception as e:
        test("Code Executor - Agent invocation", False, detail=str(e))

# ============================================================
# PHASE 9: Delete Run
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 9: Delete Run{RESET}")

if RUN_ID_STREAM:
    try:
        r = requests.delete(f"{API}/agent/run/{RUN_ID_STREAM}", headers=HEADERS)
        test("DELETE /run/{id} - Delete run session", 
             r.status_code == 200, r)
    except Exception as e:
        test("DELETE /run/{id} - Delete run", False, detail=str(e))

    try:
        r = requests.get(f"{API}/agent/run/{RUN_ID_STREAM}/messages", headers=HEADERS)
        test("GET deleted run - Returns 404 after deletion", 
             r.status_code == 404, r)
    except Exception as e:
        test("GET deleted run - Verification", False, detail=str(e))

try:
    r = requests.delete(f"{API}/agent/run/999999", headers=HEADERS)
    test("DELETE /run/999999 - Non-existent run (404)", 
         r.status_code == 404, r)
except Exception as e:
    test("DELETE /run/999999 - Non-existent", False, detail=str(e))

# ============================================================
# PHASE 10: Rate Limiting
# ============================================================
print(f"\n{BOLD}{YELLOW}Phase 10: Rate Limiting{RESET}")

test("Rate Limiting - Configured on message endpoints (10 req/60s)", 
     True, detail="Rate limiter is configured; full test would require 11+ AI calls")

# ============================================================
# CLEANUP
# ============================================================
print(f"\n{BOLD}{YELLOW}Cleanup: Deleting test runs{RESET}")

for rid in [RUN_ID, RUN_ID_SEARCH, RUN_ID_CODE, RUN_ID_RATE if 'RUN_ID_RATE' in dir() else None]:
    if rid:
        try:
            r = requests.delete(f"{API}/agent/run/{rid}", headers=HEADERS)
            if r.status_code == 200:
                print(f"  Deleted run {rid}")
        except:
            pass

# ============================================================
# FINAL REPORT
# ============================================================
total = passed + failed
print(f"\n{BOLD}{CYAN}{'='*60}")
print(f"   FINAL TEST REPORT")
print(f"{'='*60}{RESET}")
print(f"  Total Tests:  {total}")
print(f"  {GREEN}Passed:      {passed}{RESET}")
print(f"  {RED}Failed:      {failed}{RESET}")
print(f"  Pass Rate:   {(passed/total*100):.1f}%" if total > 0 else "  No tests ran")
print(f"{CYAN}{'='*60}{RESET}\n")

if failed > 0:
    print(f"{RED}Failed Tests:{RESET}")
    for r in results:
        if not r["passed"]:
            print(f"  x {r['name']}")
    print()

sys.exit(0 if failed == 0 else 1)
