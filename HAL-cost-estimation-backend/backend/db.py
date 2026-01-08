from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 🔹 Update these with your actual DB credentials
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/hal_cost_estimation"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
