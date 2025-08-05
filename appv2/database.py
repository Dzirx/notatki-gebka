from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func

# === BAZY DANYCH ===

# Główna baza - notatki (PostgreSQL)
DATABASE_URL = "postgresql://postgres:password@localhost:5432/notatki_db"

# Druga baza - samochody (SQL Server) - WYŁĄCZONA LOKALNIE
try:
    # Spróbuj utworzyć połączenie z SQL Server
    SAMOCHODY_DB_URL = "mssql+pyodbc://readonlygebka:ZAQ!2wsx@192.168.1.5/integra_test?driver=ODBC+Driver+17+for+SQL+Server"
    samochody_engine = create_engine(SAMOCHODY_DB_URL)
    print("✅ SQL Server engine utworzony")
except ImportError as e:
    # Brak pyodbc lub sterowników ODBC
    print(f"⚠️ Brak sterowników ODBC: {e}")
    print("🔧 Używam mock engine dla SQL Server")
    samochody_engine = None
except Exception as e:
    # Inne błędy połączenia
    print(f"⚠️ Błąd SQL Server: {e}")
    samochody_engine = None

# === ENGINES ===
engine = create_engine(DATABASE_URL)

# === SESSION MAKERS ===
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if samochody_engine:
    SamochodySession = sessionmaker(autocommit=False, autoflush=False, bind=samochody_engine)
else:
    SamochodySession = None

Base = declarative_base()

# === DEPENDENCY FUNCTIONS ===
def get_db():
    """Dependency dla głównej bazy danych (notatki) - PostgreSQL"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_samochody_db():
    """Dependency dla bazy danych samochodów (magazyn) - SQL Server"""
    if SamochodySession is None:
        # Mock session gdy brak połączenia
        print("⚠️ Brak połączenia z SQL Server - używam mock session")
        yield None
    else:
        db = SamochodySession()
        try:
            yield db
        finally:
            db.close()