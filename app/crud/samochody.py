from sqlalchemy.orm import Session
from models import Samochod

def get_samochod_by_rejestracja(db: Session, nr_rejestracyjny: str):
    """Znajduje samochód po numerze rejestracyjnym w głównej bazie"""
    return db.query(Samochod).filter(Samochod.nr_rejestracyjny == nr_rejestracyjny).first()

def get_samochody_klienta(db: Session, klient_id: int):
    """Pobiera wszystkie samochody należące do klienta"""
    return db.query(Samochod).filter(Samochod.klient_id == klient_id).all()

def create_samochod(db: Session, klient_id: int, nr_rejestracyjny: str, 
                   marka: str, model: str, rok_produkcji: int = None):
    """Dodaje nowy samochód do klienta"""
    db_samochod = Samochod(
        klient_id=klient_id, 
        nr_rejestracyjny=nr_rejestracyjny,
        marka=marka, 
        model=model, 
        rok_produkcji=rok_produkcji
    )
    db.add(db_samochod)
    db.commit()
    db.refresh(db_samochod)
    return db_samochod

def search_samochody(db: Session, query: str):
    """Wyszukuje samochody po rejestracji/marce/modelu"""
    return db.query(Samochod).filter(
        (Samochod.nr_rejestracyjny.ilike(f"%{query}%")) |
        (Samochod.marka.ilike(f"%{query}%")) |
        (Samochod.model.ilike(f"%{query}%"))
    ).limit(10).all()