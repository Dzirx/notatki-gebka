from sqlalchemy.orm import Session, joinedload
from models import Notatka, Samochod

def delete_notatka(db: Session, notatka_id: int):
    """Usuwa notatkę z bazy danych wraz z powiązanymi przypomnieniami"""
    try:
        # Znajdź notatkę z powiązanymi przypomnieniami
        notatka = db.query(Notatka).options(
            joinedload(Notatka.przypomnienia)
        ).filter(Notatka.id == notatka_id).first()
        
        if notatka:
            # Usuń notatkę - przypomnienia zostaną usunięte automatycznie przez CASCADE
            db.delete(notatka)
            db.commit()
            return True
        return False
    except Exception as e:
        # Rollback w przypadku błędu
        db.rollback()
        print(f"Błąd usuwania notatki {notatka_id}: {e}")
        return False

# Pozostałe funkcje bez zmian...
def create_notatka_szybka(db: Session, tresc: str):
    """Tworzy notatkę ogólną (szybką) - nie przypisaną do konkretnego samochodu"""
    db_notatka = Notatka(samochod_id=None, typ_notatki="szybka", tresc=tresc)
    db.add(db_notatka)
    db.commit()
    db.refresh(db_notatka)
    return db_notatka

def create_notatka_samochod(db: Session, samochod_id: int, tresc: str):
    """Tworzy notatkę przypisaną do konkretnego samochodu"""
    db_notatka = Notatka(samochod_id=samochod_id, typ_notatki="pojazd", tresc=tresc)
    db.add(db_notatka)
    db.commit()
    db.refresh(db_notatka)
    return db_notatka

def get_notatki_samochodu(db: Session, samochod_id: int):
    """Pobiera wszystkie notatki dla konkretnego samochodu, sortowane od najnowszych"""
    return db.query(Notatka).filter(Notatka.samochod_id == samochod_id).order_by(Notatka.created_at.desc()).all()

def get_wszystkie_notatki(db: Session, skip: int = 0, limit: int = 100):
    """Pobiera wszystkie notatki z informacjami o samochodzie i klientach - optymalizowane joinedload"""
    return db.query(Notatka).options(
        joinedload(Notatka.samochod).joinedload(Samochod.klient)
    ).order_by(Notatka.created_at.desc()).offset(skip).limit(limit).all()

def search_notatki(db: Session, query: str):
    """Wyszukuje notatki po treści"""
    return db.query(Notatka).filter(
        Notatka.tresc.ilike(f"%{query}%")
    ).limit(10).all()