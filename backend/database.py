import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Path configuration for SQLite database in backend/
BASE_DIR = Path(__file__).resolve().parent
DATABASE_FILE = BASE_DIR / "fraud_warning.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

# Engine creation: check_same_thread=False is required for SQLite with FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()


# FastAPI Dependency to get DB session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
