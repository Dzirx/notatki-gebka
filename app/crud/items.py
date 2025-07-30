from sqlalchemy.orm import Session
from models import Towar, Usluga, KosztorysTowar, KosztorysUsluga

def get_towary(db: Session):
    """Pobiera wszystkie towary z magazynu"""
    return db.query(Towar).all()

def get_uslugi(db: Session):
    """Pobiera wszystkie usługi"""
    return db.query(Usluga).all()

def add_towar_do_kosztorysu(db: Session, kosztorys_id: int, towar_id: int, 
                           ilosc: float, cena: float):
    """Dodaje towar do kosztorysu"""
    kosztorys_towar = KosztorysTowar(
        kosztorys_id=kosztorys_id,
        towar_id=towar_id,
        ilosc=ilosc,
        cena=cena
    )
    db.add(kosztorys_towar)
    db.commit()
    db.refresh(kosztorys_towar)
    return kosztorys_towar

def add_usluge_do_kosztorysu(db: Session, kosztorys_id: int, usluga_id: int, 
                            ilosc: float, cena: float):
    """Dodaje usługę do kosztorysu"""
    kosztorys_usluga = KosztorysUsluga(
        kosztorys_id=kosztorys_id,
        uslugi_id=usluga_id,
        ilosc=ilosc,
        cena=cena
    )
    db.add(kosztorys_usluga)
    db.commit()
    db.refresh(kosztorys_usluga)
    return kosztorys_usluga