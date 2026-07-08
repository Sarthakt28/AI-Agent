# AI Agent Platform 🤖

An autonomous, production-ready AI Agent Hub featuring **Retrieval-Augmented Generation (RAG)**, **SSE Streaming**, a secure **Docker Sandbox** for python execution, and custom **Redis-backed rate limiting**. 

The platform is designed around a decoupled architecture:
*   **FastAPI Backend:** Runs a LangGraph ReAct agent executor using Gemini models, integrated with ChromaDB, Redis, and PostgreSQL.
*   **React Frontend (Vite):** A stunning, modern interface utilizing styled glassmorphic UI components and responsive vanilla CSS layouts.

---

## 🚀 Key Features

*   **Autonomous Agent Executor:** Powered by LangGraph and Google Gemini (`google-genai` / `langchain-google-genai`), dynamically deciding when to search the web, execute custom scripts, or retrieve vector data.
*   **Secure Python Code Sandbox:** Executed in isolated, resource-constrained, and network-disabled `python:3.11-alpine` Docker containers (with limits on memory and processes to prevent attacks). Fallbacks gracefully to a local subprocess if Docker is unavailable.
*   **Real-time Response Streaming:** Real-time Server-Sent Events (SSE) stream agent tokens, tool call initiations, execution status updates, and completed JSON payloads.
*   **Retrieval-Augmented Generation (RAG)**: Document upload support (`.pdf`, `.docx`, `.txt`) with text chunking, Gemini/OpenAI embeddings, and vector indexing inside **ChromaDB**.
*   **Redis Rate Limiting Middleware:** Protects message and stream endpoints with a sliding/fixed-window rate limiter (default: 10 requests per 60 seconds per user/IP), bypassing gracefully if Redis goes offline.
*   **JWT User Authentication:** Robust authentication flow (Login/Signup/Profile state) using JSON Web Tokens (JWT) for secure routing and session handling.
*   **Session Management & Chat Editing:** Supports creating persistent session threads, deleting threads, and editing previous chat queries (which deletes subsequent messages and triggers a clean agent regeneration).
*   **Fail-Safe Backing Services:** Fallbacks allow you to run and test core API features locally even if Redis or PostgreSQL is not configured or online.

---

## 🛠️ Tech Stack

| Layer | Component / Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | **FastAPI** | High-performance Python web framework (Python 3.10+) |
| | **LangGraph / LangChain** | Agent state & ReAct tool-calling orchestration |
| | **PostgreSQL & SQLAlchemy** | Session logs, message history, user profile storage |
| | **Redis** | Caching and sliding-window API rate limiting |
| | **ChromaDB** | Vector database for RAG document indexing |
| | **Docker Python SDK** | Isolated runtime execution sandbox for python code tools |
| **Frontend**| **React 19 + Vite** | Next-generation React build tooling (JavaScript) |
| | **Lucide React** | Clean, modern svg icon set |
| | **Nginx** | Reverse proxy / server for production frontend assets |

---

## 📂 Project Structure

```text
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── agent/            # LangGraph agent definitions & executors
│   │   │   └── brain.py      # Core agent logic and tool registry
│   │   ├── api/              # API router endpoints
│   │   │   └── v1/
│   │   │       ├── agent.py  # Agent runs, messaging, streams, and file uploads
│   │   │       └── auth.py   # JWT user signup, login, and profile
│   │   ├── core/             # Security, rate limiter, & system configs
│   │   │   ├── config.py     # Pydantic Settings configuration load
│   │   │   ├── rate_limit.py # Redis rate limit class middleware
│   │   │   ├── redis.py      # Redis client connection setup & availability check
│   │   │   └── security.py   # Password hashing and JWT encoding/decoding
│   │   ├── db/               # PostgreSQL session, models, and base schema
│   │   ├── schemas/          # Pydantic models for request/response validation
│   │   └── tools/            # Agent tool actions
│   │       ├── code_executor.py # Docker sandbox / Local subprocess executor
│   │       ├── rag.py        # Vector embedding store search (ChromaDB)
│   │       └── web_search.py # DuckDuckGo web search integration
│   ├── main.py               # Backend main entrypoint (Uvicorn)
│   ├── requirements.txt      # Backend Python dependencies
│   └── test_all_apis.py      # Comprehensive API integration test suite
│
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── pages/            # View components (Auth, Dashboard)
│   │   ├── App.jsx           # App shell and routing controller
│   │   └── main.jsx          # Vite React index entrypoint
│   ├── nginx.conf            # Nginx config for frontend container routing
│   └── vite.config.js        # Vite compilation config
│
├── docker-compose.yml        # Development infrastructure container definition (Databases only)
└── docker-compose.prod.yml   # Production full-stack container definition (DBs + App Services)
```

---

## ⚙️ Development & Local Setup

### Method 1: Hybrid Setup (Docker Infrastructure + Local Services)
This is the recommended workflow for developing code locally while letting Docker manage database infrastructure.

#### 1. Spin up the Background Services (Postgres, Redis, ChromaDB)
Make sure you have Docker installed and running, then execute:
```bash
docker-compose up -d
```
*This starts Postgres (`5434`), Redis (`6379`), and ChromaDB (`8100`) in the background.*

#### 2. Run the Backend Locally
1. Navigate into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables template and configure your keys (e.g., `GEMINI_API_KEY`):
   ```bash
   cp .env.example .env
   ```
5. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *The Swagger interactive documentation will be available at: http://localhost:8000/docs*

#### 3. Run the Frontend Locally
1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The interface will run at: http://localhost:5173*

---

### Method 2: Full-Stack Docker Containerization (Production)
To build and run the entire application stack—including the API and frontend—inside a single virtualized network:

```bash
docker-compose -f docker-compose.prod.yml up --build
```
* Once fully booted, the frontend is served via **Nginx** at `http://localhost:80`.
* The API runs internally and links components securely within the network.
* Make sure your backend environment variable files (`.env.production`) are filled out correctly.

---

## 🔒 Environment Variables Reference

Create a `.env` file in the `backend/` directory. Here are the core configuration keys:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | `postgresql://agent:agent_password@localhost:5434/agentdb` | Connection string for PostgreSQL database |
| **`REDIS_URL`** | `redis://localhost:6379/0` | Connection string for Redis cache & rate limiting |
| **`CHROMA_HOST`** | `localhost` | Hostname for the ChromaDB instance |
| **`CHROMA_PORT`** | `8100` | Port for the ChromaDB instance |
| **`GEMINI_API_KEY`** | *Required* | API Key to authenticate with Google Gemini models |
| **`JWT_SECRET`** | `change-this-secret` | Cryptographic secret for signing auth session tokens |
| **`JWT_ALGORITHM`** | `HS256` | JWT signing algorithm |
| **`JWT_EXPIRY_MINUTES`** | `1440` | Duration (in minutes) user sessions remain valid |
| **`AGENT_MAX_STEPS`** | `10` | Maximum reasoning steps before LangGraph times out |
| **`CHUNK_SIZE`** | `500` | Character count per chunk for RAG uploads |
| **`CHUNK_OVERLAP`** | `50` | Overlap character size between chunks |
| **`CACHE_TTL_SECONDS`** | `300` | Temporary database cache timeout |
| **`ALLOWED_ORIGINS`** | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS client origins |

---

## 🌐 API Endpoint Reference

All endpoints are prefixed with `/api/v1`.

### 🔑 Authentication Routes
*   `POST /auth/signup` - Registers a new user. Returns user details and JWT access tokens.
*   `POST /auth/login` - Authenticates credentials. Returns JWT access tokens.
*   `GET /auth/me` - Retrieves profile information for the authenticated user.

### 🤖 Agent & Chat Routes
*   `POST /agent/run` - Initiates a new chat run/session thread.
*   `GET /agent/runs` - Lists all chat threads belonging to the authenticated user.
*   `DELETE /agent/run/{run_id}` - Deletes an entire chat thread and its associated message history.
*   `GET /agent/run/{run_id}/messages` - Gets all message logs inside a specific thread.
*   `POST /agent/run/{run_id}/message` - Sends a user message (Non-streaming response mode).
*   `POST /agent/run/{run_id}/message/stream` - Sends a user message (SSE streaming tokens, thoughts, and status updates). *Rate-limited.*
*   `PUT /agent/run/{run_id}/message/{message_id}` - Edits a past message in the thread. *Rate-limited.*
*   `POST /agent/run/{run_id}/upload-file` - Uploads a PDF/DOCX/TXT file for vector RAG retrieval.
