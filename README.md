# AI Agent Platform 🤖

An autonomous, production-ready AI Agent Hub featuring **RAG (Retrieval-Augmented Generation)**, **SSE Streaming**, and secure **Docker Sandbox** execution capabilities. The platform is built using a modern decoupled architecture: a **FastAPI** backend powering a LangGraph ReAct agent executor, and a **React (Vite)** frontend with styled glassmorphic UI components.

---

## 🚀 Key Features

*   **Autonomous Agent Executor:** Powered by LangGraph and Gemini 1.5/3.5, supporting dynamic tool calling (web search, custom scripts).
*   **Real-time Response Streaming:** Real-time Server-Sent Events (SSE) stream agent tokens, tool call initiations, execution statuses, and completed payloads.
*   **Retrieval-Augmented Generation (RAG):** Document upload support (`.pdf`, `.docx`, `.txt`) with text chunking, OpenAI/Gemini embeddings, and vector indexing inside **ChromaDB**.
*   **JWT User Authentication:** Complete authentication flow (Login/Signup/Profile) with JWT tokens and automatic refresh state management.
*   **Session Management:** Interactive session creation, sidebar session history, and session deletion with custom confirmation modals.
*   **Message Editing:** Edit previous queries to automatically delete subsequent messages and regenerate replies from that execution point.
*   **Bypassing Fallbacks:** Fail-safe setups for Redis and PostgreSQL allowing local testing when specific cache or database services are unavailable.

---

## 🛠️ Tech Stack

### Backend
*   **Framework:** FastAPI (Python 3.10+)
*   **Agent Orchestration:** LangGraph & LangChain ReAct Executor
*   **Database:** PostgreSQL (with SQLAlchemy ORM)
*   **Cache & Queue:** Redis
*   **Vector Store:** ChromaDB
*   **Auth:** JWT (Jose) & Bcrypt

### Frontend
*   **Framework:** React 19 + Vite (JavaScript)
*   **Icons:** Lucide React
*   **Styling:** Modern Glassmorphism layout with Vanilla CSS

---

## 📂 Project Structure

```text
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── agent/            # LangGraph agent definitions & executors
│   │   ├── api/              # API router endpoints (V1)
│   │   ├── core/             # Security, rate limiter, & system configs
│   │   ├── db/               # PostgreSQL session, models, and base schema
│   │   ├── schemas/          # Pydantic models for request/response validation
│   │   └── tools/            # Agent tool actions (RAG, search engines, etc.)
│   ├── main.py               # Backend main entrypoint (Uvicorn)
│   └── test_all_apis.py      # Comprehensive API test suite script
│
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── pages/            # View components (Auth, Dashboard)
│   │   ├── App.jsx           # App shell and routing controller
│   │   └── main.jsx          # Vite React index entrypoint
│   └── vite.config.js        # Vite config
│
├── docker-compose.yml        # Development multi-container services definition
└── docker-compose.prod.yml   # Production deployment multi-container services definition
```

---

## ⚙️ Local Development Setup

You can run the application either using **Docker Compose** or by setting up the **Backend & Frontend manually**.

### Method 1: Running with Docker Compose (Recommended)

1.  Make sure you have **Docker** and **Docker Compose** installed.
2.  Clone the repository and configure the environment variables (see `.env` setup below).
3.  Run the following command in the root folder:
    ```bash
    docker-compose up --build
    ```
4.  The application will be accessible at:
    *   Frontend: `http://localhost:5173`
    *   Backend API Docs: `http://localhost:8000/docs`

---

### Method 2: Manual Local Setup (Without Docker)

#### Prerequisites
*   **Python 3.10+** installed.
*   **PostgreSQL** (running locally on port `5434` or configured in `.env`).
*   **Redis** (running locally on port `6379`).
*   **ChromaDB** (running locally on port `8100`).

#### 1. Setup the Backend
1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment and activate it:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure your local environment variables in a `.env` file (refer to `.env.example`).
5.  Start the FastAPI server:
    ```bash
    python main.py
    ```

#### 2. Setup the Frontend
1.  Navigate into the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
4.  The frontend will run on `http://localhost:5173`.

---

## 🔒 Environment Variables Configuration

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://agent:agent_password@localhost:5434/agentdb

# Cache & Vector Store
REDIS_URL=redis://localhost:6379/0
CHROMA_HOST=localhost
CHROMA_PORT=8100

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Auth Settings
JWT_SECRET=your_jwt_secret_token_here
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440

# Agent Settings
AGENT_MAX_STEPS=10
CHUNK_SIZE=500
CHUNK_OVERLAP=50
CACHE_TTL_SECONDS=300

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## 🌐 Production Deployment

This project is fully ready to be deployed to PaaS providers:

### Backend Deployment (e.g., Render)
1.  Connect your repository `Sarthakt28/AI-Agent` to **Render** as a **Web Service**.
2.  Specify the build context as `backend/` and use Python runtime.
3.  Add all environment variables from `.env.production` in the Render environment variables tab.
4.  Ensure your **PostgreSQL** database and **Redis** instance are provisioned and their connection strings are bound to `DATABASE_URL` and `REDIS_URL`.

### Frontend Deployment (e.g., Vercel)
1.  Connect your repository `Sarthakt28/AI-Agent` to **Vercel**.
2.  Set the **Root Directory** as `frontend`.
3.  Select the **Vite** framework preset.
4.  Set the environment variable `VITE_API_BASE` pointing to your deployed Render URL (e.g., `https://your-backend.onrender.com/api/v1`).
5.  Deploy. Vercel will automatically trigger a build whenever you push new changes to the `main` branch.
