from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.base import Base
from app.db.session import engine
from app.api.v1.auth import router as auth_router
from app.api.v1.agent import router as agent_router

from app.core.config import settings

# ====== Database tables create ======
Base.metadata.create_all(bind=engine)

# ====== FastAPI App ======
app = FastAPI(
    title="AI Agent Platform",
    description="Autonomous AI Agent with tool calling, web search, code execution, and RAG",
    version="1.0.0",
)

# ====== CORS Middleware ======
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],          # GET, POST, PUT, DELETE sab allow
    allow_headers=["*"],          # Saare headers allow
)

# ====== Routers register ======
app.include_router(auth_router, prefix="/api/v1")
app.include_router(agent_router, prefix="/api/v1")

# ====== Root Route ======
@app.get("/")
def read_root():
    return {"message": "Welcome to AI Agent Platform API. Go to /docs for API documentation."}

# ====== Health Check ======
@app.get("/health")
def health_check():
    """Server alive or not — for monitoring"""
    return {"status": "healthy", "service": "AI Agent Platform"}