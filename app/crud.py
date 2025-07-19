from sqlalchemy.orm import Session
from sqlalchemy import text
from models import Klient, Samochod, Notatka, NotatkaSamochod, Kosztorys, Przypomnienie
from database import get_samochody_db
from datetime import datetime, date
from sqlalchemy import and_

# SAMOCHODY Z ZEWNĘTRZNEJ BAZY
def get_samochod_zewnetrzny(nr_rejestracyjny: str):
    db = next(get_samochody_db())
    try:
        # Raw SQL - dostosuj do struktury zewnętrznej tabeli
        result = db.execute(
            text("SELECT nr_rejestracyjny, marka, model, rok_produkcji, wlasciciel FROM samochody WHERE nr_rejestracyjny = :nr"),
            {"nr": nr_rejestracyjny}
        ).fetchone()
        return result
    finally:
        db.close()

# KLIENCI
def get_klient(db: Session, klient_id: int):
    return db.query(Klient).filter(Klient.id == klient_id).first()

def get_klienci(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Klient).offset(skip).limit(limit).all()

def create_klient(db: Session, imie: str, nazwisko: str, nr_telefonu: str = None, 
                  nip: str = None, nazwa_firmy: str = None, email: str = None):
    db_klient = Klient(
        imie=imie, nazwisko=nazwisko, nr_telefonu=nr_telefonu,
        nip=nip, nazwa_firmy=nazwa_firmy, email=email
    )
    db.add(db_klient)
    db.commit()
    db.refresh(db_klient)
    return db_klient

# SAMOCHODY
def get_samochod_by_rejestracja(db: Session, nr_rejestracyjny: str):
    return db.query(Samochod).filter(Samochod.nr_rejestracyjny == nr_rejestracyjny).first()

def get_samochody_klienta(db: Session, klient_id: int):
    return db.query(Samochod).filter(Samochod.klient_id == klient_id).all()

def create_samochod(db: Session, klient_id: int, nr_rejestracyjny: str, 
                   marka: str, model: str, rok_produkcji: int = None):
    db_samochod = Samochod(
        klient_id=klient_id, nr_rejestracyjny=nr_rejestracyjny,
        marka=marka, model=model, rok_produkcji=rok_produkcji
    )
    db.add(db_samochod)
    db.commit()
    db.refresh(db_samochod)
    return db_samochod

def create_notatka_szybka(db: Session, klient_id: int, tresc: str):
    # Szybka notatka może nie mieć klienta (klient_id = None)
    db_notatka = Notatka(klient_id=klient_id, typ_notatki="szybka", tresc=tresc)
    db.add(db_notatka)
    db.commit()
    db.refresh(db_notatka)
    return db_notatka

def create_notatka_pojazd(db: Session, klient_id: int, tresc: str, samochod_ids: list):
    db_notatka = Notatka(klient_id=klient_id, typ_notatki="pojazd", tresc=tresc)
    db.add(db_notatka)
    db.flush()  # Get ID without commit
    
    # Dodaj powiązania z samochodami
    for samochod_id in samochod_ids:
        db_link = NotatkaSamochod(notatka_id=db_notatka.id, samochod_id=samochod_id)
        db.add(db_link)
    
    db.commit()
    db.refresh(db_notatka)
    return db_notatka

def get_notatki_klienta(db: Session, klient_id: int):
    return db.query(Notatka).filter(Notatka.klient_id == klient_id).all()

def delete_notatka(db: Session, notatka_id: int):
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if notatka:
        db.delete(notatka)
        db.commit()
        return True
    return False

# KOSZTORYSY
def create_kosztorys(db: Session, notatka_id: int, kwota: float, 
                    opis: str = None, numer_kosztorysu: str = None):
    db_kosztorys = Kosztorys(
        notatka_id=notatka_id, kwota=kwota, opis=opis, numer_kosztorysu=numer_kosztorysu
    )
    db.add(db_kosztorys)
    db.commit()
    db.refresh(db_kosztorys)
    return db_kosztorys

def create_przypomnienie(db: Session, notatka_id: int, data_przypomnienia: datetime):
    db_przypomnienie = Przypomnienie(
        notatka_id=notatka_id, 
        data_przypomnienia=data_przypomnienia,
        wyslane=0
    )
    db.add(db_przypomnienie)
    db.commit()
    db.refresh(db_przypomnienie)
    return db_przypomnienie

def get_przypomnienia_dzisiaj(db: Session):
    from datetime import datetime, date, timedelta
    
    today = date.today()
    tomorrow = today + timedelta(days=1)
    
    return db.query(Przypomnienie).join(Notatka).filter(
        and_(
            Przypomnienie.data_przypomnienia >= datetime.combine(today, datetime.min.time()),
            Przypomnienie.data_przypomnienia < datetime.combine(tomorrow, datetime.min.time()),
            Przypomnienie.wyslane == 0
        )
    ).all()

def get_wszystkie_przypomnienia(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Przypomnienie).join(Notatka).order_by(Przypomnienie.data_przypomnienia.desc()).offset(skip).limit(limit).all()

def mark_przypomnienie_wyslane(db: Session, przypomnienie_id: int):
    przypomnienie = db.query(Przypomnienie).filter(Przypomnienie.id == przypomnienie_id).first()
    if przypomnienie:
        przypomnienie.wyslane = 1
        db.commit()
        return True
    return False

def delete_przypomnienie(db: Session, przypomnienie_id: int):
    przypomnienie = db.query(Przypomnienie).filter(Przypomnienie.id == przypomnienie_id).first()
    if przypomnienie:
        db.delete(przypomnienie)
        db.commit()
        return True
    return False

def get_wszystkie_notatki(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Notatka).order_by(Notatka.created_at.desc()).offset(skip).limit(limit).all()