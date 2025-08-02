# === MODULES/NOTATNIK/CRUD.PY - OPERACJE BAZODANOWE ===
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from models import Notatka, Samochod, Kosztorys, KosztorysTowar, KosztorysUsluga, Towar, Usluga
from typing import List, Dict, Any

# === NOTATKI ===
def get_wszystkie_notatki(db: Session, skip: int = 0, limit: int = 100):
    """Pobiera wszystkie notatki z informacjami o samochodzie i klientach"""
    return db.query(Notatka).options(
        joinedload(Notatka.samochod).joinedload(Samochod.klient),
        joinedload(Notatka.kosztorysy)
    ).order_by(Notatka.created_at.desc()).offset(skip).limit(limit).all()

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

def get_notatka_by_id(db: Session, notatka_id: int):
    """Pobiera notatkę po ID"""
    return db.query(Notatka).filter(Notatka.id == notatka_id).first()

def update_notatka(db: Session, notatka_id: int, tresc: str):
    """Aktualizuje treść notatki"""
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if notatka:
        notatka.tresc = tresc
        db.commit()
        return notatka
    return None

def delete_notatka(db: Session, notatka_id: int):
    """Usuwa notatkę z bazy danych"""
    try:
        notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
        if notatka:
            db.delete(notatka)
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        print(f"Błąd usuwania notatki {notatka_id}: {e}")
        return False

# === SAMOCHODY ===
def get_samochod_by_rejestracja(db: Session, nr_rejestracyjny: str):
    """Znajduje samochód po numerze rejestracyjnym"""
    return db.query(Samochod).options(
        joinedload(Samochod.klient)
    ).filter(Samochod.nr_rejestracyjny == nr_rejestracyjny).first()

# === KOSZTORYSY ===
def create_kosztorys(db: Session, notatka_id: int, kwota: float, 
                    opis: str = None, numer_kosztorysu: str = None):
    """Tworzy nowy kosztorys dla notatki"""
    db_kosztorys = Kosztorys(
        notatka_id=notatka_id, 
        kwota_calkowita=kwota, 
        opis=opis, 
        numer_kosztorysu=numer_kosztorysu
    )
    db.add(db_kosztorys)
    db.commit()
    db.refresh(db_kosztorys)
    return db_kosztorys

def get_kosztorysy_z_towarami_dla_notatki(db: Session, notatka_id: int) -> List[Dict[str, Any]]:
    """Pobiera kosztorysy notatki wraz z towarami i usługami"""
    
    query = text("""
        SELECT 
            k.id as kosztorys_id,
            k.numer_kosztorysu,
            k.kwota_calkowita,
            k.opis as kosztorys_opis,
            k.status,
            k.created_at,
            
            t.nazwa as towar_nazwa,
            kt.ilosc as towar_ilosc,
            kt.cena as towar_cena,
            
            u.nazwa as usluga_nazwa,
            ku.ilosc as usluga_ilosc,
            ku.cena as usluga_cena
            
        FROM kosztorysy k
        LEFT JOIN kosztorysy_towary kt ON k.id = kt.kosztorys_id
        LEFT JOIN towary t ON kt.towar_id = t.id
        LEFT JOIN kosztorysy_uslug ku ON k.id = ku.kosztorys_id
        LEFT JOIN uslugi u ON ku.uslugi_id = u.id
        WHERE k.notatka_id = :notatka_id
        ORDER BY k.created_at DESC, t.nazwa ASC, u.nazwa ASC
    """)
    
    result = db.execute(query, {"notatka_id": notatka_id})
    rows = result.fetchall()
    
    kosztorysy_dict = {}
    
    for row in rows:
        kosztorys_id = row.kosztorys_id
        
        if kosztorys_id not in kosztorysy_dict:
            kosztorysy_dict[kosztorys_id] = {
                "id": kosztorys_id,
                "numer": row.numer_kosztorysu,
                "kwota_calkowita": float(row.kwota_calkowita) if row.kwota_calkowita else 0.0,
                "opis": row.kosztorys_opis,
                "status": row.status,
                "created_at": row.created_at,
                "towary": [],
                "uslugi": []
            }
        
        if row.towar_nazwa and row.towar_nazwa not in [t["nazwa"] for t in kosztorysy_dict[kosztorys_id]["towary"]]:
            kosztorysy_dict[kosztorys_id]["towary"].append({
                "nazwa": row.towar_nazwa,
                "ilosc": float(row.towar_ilosc),
                "cena": float(row.towar_cena)
            })
        
        if row.usluga_nazwa and row.usluga_nazwa not in [u["nazwa"] for u in kosztorysy_dict[kosztorys_id]["uslugi"]]:
            kosztorysy_dict[kosztorys_id]["uslugi"].append({
                "nazwa": row.usluga_nazwa,
                "ilosc": float(row.usluga_ilosc),
                "cena": float(row.usluga_cena)
            })
    
    return list(kosztorysy_dict.values())

# === TOWARY I USŁUGI ===
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