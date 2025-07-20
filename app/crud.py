from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, and_
from models import (
    Klient, Samochod, Notatka,  # USUNIĘTO: NotatkaSamochod
    Przypomnienie, Kosztorys, Towar, KosztorysTowar
)
from database import get_samochody_db
from datetime import datetime, date, timedelta
from typing import List, Dict, Any

# === SAMOCHODY Z ZEWNĘTRZNEJ BAZY ===
def get_samochod_zewnetrzny(nr_rejestracyjny: str):
    """Pobiera dane samochodu z zewnętrznej bazy"""
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

# === KLIENCI ===
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

# === SAMOCHODY ===
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

# === NOTATKI - PRZEPISANE! ===
def create_notatka_szybka(db: Session, tresc: str):
    """Szybka notatka bez samochodu (samochod_id = None)"""
    db_notatka = Notatka(samochod_id=None, typ_notatki="szybka", tresc=tresc)
    db.add(db_notatka)
    db.commit()
    db.refresh(db_notatka)
    return db_notatka

def create_notatka_samochod(db: Session, samochod_id: int, tresc: str):
    """Notatka do konkretnego samochodu"""
    db_notatka = Notatka(samochod_id=samochod_id, typ_notatki="pojazd", tresc=tresc)
    db.add(db_notatka)
    db.commit()
    db.refresh(db_notatka)
    return db_notatka

# USUNIĘTO: create_notatka_pojazd - niepotrzebne!

def get_notatki_samochodu(db: Session, samochod_id: int):
    """Pobiera wszystkie notatki dla samochodu"""
    return db.query(Notatka).filter(Notatka.samochod_id == samochod_id).order_by(Notatka.created_at.desc()).all()

def get_wszystkie_notatki(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Notatka).order_by(Notatka.created_at.desc()).offset(skip).limit(limit).all()

def delete_notatka(db: Session, notatka_id: int):
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if notatka:
        db.delete(notatka)
        db.commit()
        return True
    return False

# === KOSZTORYSY - PRZEPISANE! ===
def create_kosztorys(db: Session, klient_id: int, kwota: float, 
                    opis: str = None, numer_kosztorysu: str = None):
    """Tworzy kosztorys dla klienta"""
    db_kosztorys = Kosztorys(
        klient_id=klient_id, kwota_calkowita=kwota, opis=opis, numer_kosztorysu=numer_kosztorysu
    )
    db.add(db_kosztorys)
    db.commit()
    db.refresh(db_kosztorys)
    return db_kosztorys

def get_kosztorysy_klienta(db: Session, klient_id: int) -> List[Dict[str, Any]]:
    """Pobiera wszystkie kosztorysy klienta"""
    kosztorysy = db.query(Kosztorys).filter(Kosztorys.klient_id == klient_id).order_by(Kosztorys.created_at.desc()).all()
    return [
        {
            "id": k.id,
            "numer": k.numer_kosztorysu,
            "kwota_calkowita": float(k.kwota_calkowita) if k.kwota_calkowita else 0.0,
            "opis": k.opis,
            "status": k.status
        }
        for k in kosztorysy
    ]

def get_kosztorysy_samochodu(db: Session, nr_rejestracyjny: str) -> List[Dict[str, Any]]:
    """Pobiera kosztorysy dla właściciela samochodu - UPROSZCZONE!"""
    query = text("""
        SELECT k.id, k.numer_kosztorysu, k.kwota_calkowita, k.opis, k.status
        FROM kosztorysy k
        JOIN klienci c ON k.klient_id = c.id
        JOIN samochody s ON s.klient_id = c.id
        WHERE s.nr_rejestracyjny = :nr_rej
        ORDER BY k.created_at DESC
    """)
    
    result = db.execute(query, {"nr_rej": nr_rejestracyjny})
    return [
        {
            "id": row.id,
            "numer": row.numer_kosztorysu,
            "kwota_calkowita": float(row.kwota_calkowita) if row.kwota_calkowita else 0.0,
            "opis": row.opis,
            "status": row.status
        }
        for row in result
    ]

def get_towary_w_kosztorysach(db: Session, nr_rejestracyjny: str) -> List[Dict[str, Any]]:
    """Pobiera towary z kosztorysów dla właściciela samochodu - UPROSZCZONE!"""
    query = text("""
        SELECT 
            k.numer_kosztorysu as kosztorys,
            t.kod,
            t.nazwa,
            kt.ilosc,
            t.jednostka,
            kt.cena_jednostkowa as cena,
            kt.wartosc
        FROM kosztorysy k
        JOIN kosztorysy_towary kt ON k.id = kt.kosztorys_id
        JOIN towary t ON kt.towar_id = t.id
        JOIN klienci c ON k.klient_id = c.id
        JOIN samochody s ON s.klient_id = c.id
        WHERE s.nr_rejestracyjny = :nr_rej
        ORDER BY k.numer_kosztorysu, t.nazwa
    """)
    
    result = db.execute(query, {"nr_rej": nr_rejestracyjny})
    return [
        {
            "kosztorys": row.kosztorys,
            "kod": row.kod,
            "nazwa": row.nazwa,
            "ilosc": float(row.ilosc),
            "jednostka": row.jednostka,
            "cena": float(row.cena),
            "wartosc": float(row.wartosc)
        }
        for row in result
    ]

def get_pojazd_info(db: Session, nr_rejestracyjny: str) -> Dict[str, Any]:
    """Pobiera kompletne informacje o pojeździe - UPROSZCZONE!"""
    
    # Podstawowe dane pojazdu
    samochod = db.query(Samochod).filter(Samochod.nr_rejestracyjny == nr_rejestracyjny).first()
    if not samochod:
        return None
    
    # Właściciel
    wlasciciel = "Nieznany"
    if samochod.klient:
        wlasciciel = f"{samochod.klient.imie} {samochod.klient.nazwisko}"
    
    # Kosztorysy właściciela
    kosztorysy = get_kosztorysy_samochodu(db, nr_rejestracyjny)
    
    # Towary z kosztorysów
    towary = get_towary_w_kosztorysach(db, nr_rejestracyjny)
    
    # Notatki samochodu
    notatki = get_notatki_samochodu(db, samochod.id)
    notatki_lista = [
        {
            "id": n.id,
            "tresc": n.tresc,
            "data": n.created_at.strftime('%d.%m.%Y %H:%M')
        }
        for n in notatki
    ]
    
    return {
        "nr_rejestracyjny": samochod.nr_rejestracyjny,
        "marka": samochod.marka,
        "model": samochod.model,
        "rok_produkcji": samochod.rok_produkcji,
        "wlasciciel": wlasciciel,
        "kosztorysy": kosztorysy,
        "towary": towary,
        "notatki": notatki_lista  # NOWE!
    }

def add_towar_do_kosztorysu(db: Session, kosztorys_id: int, towar_id: int, 
                           ilosc: float, cena_jednostkowa: float):
    """Dodaje towar do kosztorysu"""
    wartosc = ilosc * cena_jednostkowa
    
    kosztorys_towar = KosztorysTowar(
        kosztorys_id=kosztorys_id,
        towar_id=towar_id,
        ilosc=ilosc,
        cena_jednostkowa=cena_jednostkowa,
        wartosc=wartosc
    )
    db.add(kosztorys_towar)
    
    # Zaktualizuj kwotę całkowitą kosztorysu
    kosztorys = db.query(Kosztorys).filter(Kosztorys.id == kosztorys_id).first()
    if kosztorys:
        suma_query = text("SELECT SUM(wartosc) FROM kosztorysy_towary WHERE kosztorys_id = :kid")
        suma = db.execute(suma_query, {"kid": kosztorys_id}).scalar()
        kosztorys.kwota_calkowita = suma or 0.0  # POPRAWIONE: kwota_calkowita
    
    db.commit()
    db.refresh(kosztorys_towar)
    return kosztorys_towar

# === TOWARY ===
def get_towary(db: Session):
    return db.query(Towar).all()

def get_towar(db: Session, towar_id: int):
    return db.query(Towar).filter(Towar.id == towar_id).first()

def create_towar(db: Session, kod: str, nazwa: str, cena_zakupu: float = None, 
                cena_sprzedazy: float = None, stan_magazynowy: int = 0, 
                jednostka: str = "szt", kategoria: str = None, opis: str = None):
    towar = Towar(
        kod=kod,
        nazwa=nazwa,
        cena_zakupu=cena_zakupu,
        cena_sprzedazy=cena_sprzedazy,
        stan_magazynowy=stan_magazynowy,
        jednostka=jednostka,
        kategoria=kategoria,
        opis=opis
    )
    db.add(towar)
    db.commit()
    db.refresh(towar)
    return towar

# === PRZYPOMNIENIA - POPRAWIONE! ===
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
    """POPRAWIONE: Pobiera właściciela przez samochód"""
    today = date.today()
    tomorrow = today + timedelta(days=1)
    
    return db.query(Przypomnienie).join(Notatka).filter(
        and_(
            Przypomnienie.data_przypomnienia >= datetime.combine(today, datetime.min.time()),
            Przypomnienie.data_przypomnienia < datetime.combine(tomorrow, datetime.min.time()),
            Przypomnienie.wyslane == 0
        )
    ).options(
        joinedload(Przypomnienie.notatka).joinedload(Notatka.samochod).joinedload(Samochod.klient)
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

def get_kosztorysy_z_towarami_dla_klienta(db: Session, klient_id: int) -> List[Dict[str, Any]]:
    """Pobiera kosztorysy klienta wraz z towarami - ZGRUPOWANE"""
    
    # SQL z join'ami - pobierz wszystko jednym zapytaniem
    query = text("""
        SELECT 
            k.id as kosztorys_id,
            k.numer_kosztorysu,
            k.kwota_calkowita,
            k.opis as kosztorys_opis,
            k.status,
            k.created_at,
            
            -- Towary (jeśli istnieją)
            t.kod as towar_kod,
            t.nazwa as towar_nazwa,
            t.jednostka,
            kt.ilosc,
            kt.cena_jednostkowa,
            kt.wartosc
            
        FROM kosztorysy k
        LEFT JOIN kosztorysy_towary kt ON k.id = kt.kosztorys_id
        LEFT JOIN towary t ON kt.towar_id = t.id
        WHERE k.klient_id = :klient_id
        ORDER BY k.created_at DESC, t.nazwa ASC
    """)
    
    result = db.execute(query, {"klient_id": klient_id})
    rows = result.fetchall()
    
    # Grupuj wyniki po kosztorysach
    kosztorysy_dict = {}
    
    for row in rows:
        kosztorys_id = row.kosztorys_id
        
        # Jeśli pierwszy raz widzimy ten kosztorys
        if kosztorys_id not in kosztorysy_dict:
            kosztorysy_dict[kosztorys_id] = {
                "id": kosztorys_id,
                "numer": row.numer_kosztorysu,
                "kwota_calkowita": float(row.kwota_calkowita) if row.kwota_calkowita else 0.0,
                "opis": row.kosztorys_opis,
                "status": row.status,
                "created_at": row.created_at,
                "towary": []
            }
        
        # Dodaj towar (jeśli istnieje)
        if row.towar_kod:
            kosztorysy_dict[kosztorys_id]["towary"].append({
                "kod": row.towar_kod,
                "nazwa": row.towar_nazwa,
                "ilosc": float(row.ilosc),
                "jednostka": row.jednostka,
                "cena": float(row.cena_jednostkowa),
                "wartosc": float(row.wartosc)
            })
    
    # Konwertuj dictionary na listę
    return list(kosztorysy_dict.values())

def get_kosztorysy_z_towarami_dla_samochodu(db: Session, nr_rejestracyjny: str) -> List[Dict[str, Any]]:
    """Pobiera kosztorysy właściciela samochodu wraz z towarami - ZGRUPOWANE"""
    
    query = text("""
        SELECT 
            k.id as kosztorys_id,
            k.numer_kosztorysu,
            k.kwota_calkowita,
            k.opis as kosztorys_opis,
            k.status,
            k.created_at,
            
            -- Towary (jeśli istnieją)
            t.kod as towar_kod,
            t.nazwa as towar_nazwa,
            t.jednostka,
            kt.ilosc,
            kt.cena_jednostkowa,
            kt.wartosc
            
        FROM kosztorysy k
        LEFT JOIN kosztorysy_towary kt ON k.id = kt.kosztorys_id
        LEFT JOIN towary t ON kt.towar_id = t.id
        JOIN klienci c ON k.klient_id = c.id
        JOIN samochody s ON s.klient_id = c.id
        WHERE s.nr_rejestracyjny = :nr_rej
        ORDER BY k.created_at DESC, t.nazwa ASC
    """)
    
    result = db.execute(query, {"nr_rej": nr_rejestracyjny})
    rows = result.fetchall()
    
    # Grupuj wyniki po kosztorysach (ta sama logika)
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
                "towary": []
            }
        
        if row.towar_kod:
            kosztorysy_dict[kosztorys_id]["towary"].append({
                "kod": row.towar_kod,
                "nazwa": row.towar_nazwa,
                "ilosc": float(row.ilosc),
                "jednostka": row.jednostka,
                "cena": float(row.cena_jednostkowa),
                "wartosc": float(row.wartosc)
            })
    
    return list(kosztorysy_dict.values())

# ZAKTUALIZOWANA funkcja get_pojazd_info
def get_pojazd_info(db: Session, nr_rejestracyjny: str) -> Dict[str, Any]:
    """Pobiera kompletne informacje o pojeździe - ZAKTUALIZOWANE"""
    
    samochod = db.query(Samochod).filter(Samochod.nr_rejestracyjny == nr_rejestracyjny).first()
    if not samochod:
        return None
    
    # Właściciel
    wlasciciel = "Nieznany"
    if samochod.klient:
        wlasciciel = f"{samochod.klient.imie} {samochod.klient.nazwisko}"
    
    # NOWE: Kosztorysy zgrupowane z towarami
    kosztorysy_z_towarami = get_kosztorysy_z_towarami_dla_samochodu(db, nr_rejestracyjny)
    
    # Notatki samochodu
    notatki = get_notatki_samochodu(db, samochod.id)
    notatki_lista = [
        {
            "id": n.id,
            "tresc": n.tresc,
            "data": n.created_at.strftime('%d.%m.%Y %H:%M')
        }
        for n in notatki
    ]
    
    return {
        "nr_rejestracyjny": samochod.nr_rejestracyjny,
        "marka": samochod.marka,
        "model": samochod.model,
        "rok_produkcji": samochod.rok_produkcji,
        "wlasciciel": wlasciciel,
        "kosztorysy_z_towarami": kosztorysy_z_towarami,  # NOWE!
        "notatki": notatki_lista
    }
