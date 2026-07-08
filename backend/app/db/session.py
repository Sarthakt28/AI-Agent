from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Engine = Database "connection pool" with fallback to local SQLite
try:
    engine = create_engine(settings.DATABASE_URL)
    # Perform a quick connection test
    with engine.connect() as conn:
        pass
    print("[DATABASE] Connected to PostgreSQL database successfully.")
except Exception as e:
    if "postgresql" in settings.DATABASE_URL:
        fallback_db = "sqlite:///./local_fallback.db"
        print(f"[DATABASE WARNING] Failed to connect to PostgreSQL: {e}. Falling back to SQLite at: {fallback_db}")
        engine = create_engine(fallback_db, connect_args={"check_same_thread": False})
    else:
        print(f"[DATABASE ERROR] Failed to connect to database: {e}")
        raise e

# SessionLocal = for every request it gets fresh database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

