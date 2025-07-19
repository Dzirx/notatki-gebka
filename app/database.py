from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:password@localhost:5432/notatki_db"
SAMOCHODY_DB_URL = "postgresql://postgres:password@localhost:5433/samochody_db"  # Druga baza

engine = create_engine(DATABASE_URL)
samochody_engine = create_engine(SAMOCHODY_DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SamochodySession = sessionmaker(autocommit=False, autoflush=False, bind=samochody_engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_samochody_db():
    db = SamochodySession()
    try:
        yield db
    finally:
        db.close()