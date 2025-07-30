from sqlalchemy.orm import Session
from models import Klient

def get_klient(db: Session, klient_id: int):
    """Pobiera jednego klienta po ID"""
    return db.query(Klient).filter(Klient.id == klient_id).first()

def get_klienci(db: Session, skip: int = 0, limit: int = 100):
    """Pobiera listę wszystkich klientów z paginacją"""
    return db.query(Klient).offset(skip).limit(limit).all()

def create_klient(db: Session, nazwapelna: str, nr_telefonu: str = None, 
                  nip: str = None, nazwa_firmy: str = None):
    """Tworzy nowego klienta w bazie"""
    db_klient = Klient(
        nazwapelna=nazwapelna, 
        nr_telefonu=nr_telefonu,
        nip=nip, 
        nazwa_firmy=nazwa_firmy
    )
    db.add(db_klient)
    db.commit()
    db.refresh(db_klient)
    return db_klient

def search_klienci(db: Session, query: str):
    """Wyszukuje klientów po nazwie/firmie/telefonie"""
    return db.query(Klient).filter(
        (Klient.nazwapelna.ilike(f"%{query}%")) |
        (Klient.nazwa_firmy.ilike(f"%{query}%")) |
        (Klient.nr_telefonu.ilike(f"%{query}%"))
    ).limit(10).all()