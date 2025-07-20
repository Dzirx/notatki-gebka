from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from models import (
    Klient, Samochod, Notatka,
    Kosztorys, Towar, KosztorysTowar
)
from database import get_samochody_db
from typing import List, Dict, Any

# === SAMOCHODY Z ZEWNĘTRZNEJ BAZY ===
def get_samochod_zewnetrzny(nr_rejestracyjny: str):
    """Łączy się z drugą bazą PostgreSQL (port 5433) i sprawdza dane pojazdu"""
    db = next(get_samochody_db())  # Tworzy sesję do zewnętrznej bazy
    try:
        # Surowe SQL do zewnętrznej bazy - sprawdza czy pojazd istnieje
        result = db.execute(
            text("SELECT nr_rejestracyjny, marka, model, rok_produkcji, wlasciciel FROM samochody WHERE nr_rejestracyjny = :nr"),
            {"nr": nr_rejestracyjny}
        ).fetchone()
        return result  # Zwraca Row lub None
    finally:
        db.close()  # Zawsze zamyka połączenie z zewnętrzną bazą

# === KLIENCI ===
def get_klient(db: Session, klient_id: int):
    """Pobiera jednego klienta po ID"""
    return db.query(Klient).filter(Klient.id == klient_id).first()

def get_klienci(db: Session, skip: int = 0, limit: int = 100):
    """Pobiera listę wszystkich klientów z paginacją"""
    return db.query(Klient).offset(skip).limit(limit).all()

def create_klient(db: Session, imie: str, nazwisko: str, nr_telefonu: str = None, 
                  nip: str = None, nazwa_firmy: str = None, email: str = None):
    """Tworzy nowego klienta w bazie"""
    db_klient = Klient(
        imie=imie, nazwisko=nazwisko, nr_telefonu=nr_telefonu,
        nip=nip, nazwa_firmy=nazwa_firmy, email=email
    )
    db.add(db_klient)      # Dodaj obiekt do sesji SQLAlchemy
    db.commit()            # Zapisz zmiany w bazie danych
    db.refresh(db_klient)  # Odśwież obiekt (pobierz ID z bazy)
    return db_klient

# === SAMOCHODY ===
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
        klient_id=klient_id, nr_rejestracyjny=nr_rejestracyjny,
        marka=marka, model=model, rok_produkcji=rok_produkcji
    )
    db.add(db_samochod)
    db.commit()
    db.refresh(db_samochod)
    return db_samochod

# === NOTATKI ===
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
    """Pobiera wszystkie notatki z informacjami o samochodzieiklientach - optymalizowane joinedload"""
    return db.query(Notatka).options(
        # Eager loading - ładuje relacje od razu, unika N+1 queries
        joinedload(Notatka.samochod).joinedload(Samochod.klient)
    ).order_by(Notatka.created_at.desc()).offset(skip).limit(limit).all()

def delete_notatka(db: Session, notatka_id: int):
    """Usuwa notatkę z bazy danych"""
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if notatka:
        db.delete(notatka)
        db.commit()
        return True
    return False

# === KOSZTORYSY ===
def create_kosztorys(db: Session, klient_id: int, kwota: float, 
                    opis: str = None, numer_kosztorysu: str = None):
    """Tworzy nowy kosztorys dla klienta"""
    db_kosztorys = Kosztorys(
        klient_id=klient_id, kwota_calkowita=kwota, opis=opis, numer_kosztorysu=numer_kosztorysu
    )
    db.add(db_kosztorys)
    db.commit()
    db.refresh(db_kosztorys)
    return db_kosztorys

def get_kosztorysy_klienta(db: Session, klient_id: int) -> List[Dict[str, Any]]:
    """Pobiera wszystkie kosztorysy klienta jako słowniki"""
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
    """Pobiera kosztorysy właściciela samochodu używając SQL JOIN"""
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

def add_towar_do_kosztorysu(db: Session, kosztorys_id: int, towar_id: int, 
                           ilosc: float, cena_jednostkowa: float):
    """Dodaje towar do kosztorysu i automatycznie przelicza kwotę całkowitą"""
    wartosc = ilosc * cena_jednostkowa  # Kalkulacja wartości pozycji
    
    # Dodaj nową pozycję do kosztorysu
    kosztorys_towar = KosztorysTowar(
        kosztorys_id=kosztorys_id,
        towar_id=towar_id,
        ilosc=ilosc,
        cena_jednostkowa=cena_jednostkowa,
        wartosc=wartosc
    )
    db.add(kosztorys_towar)
    
    # Automatyczne przeliczenie kwoty całkowitej kosztorysu
    kosztorys = db.query(Kosztorys).filter(Kosztorys.id == kosztorys_id).first()
    if kosztorys:
        suma_query = text("SELECT SUM(wartosc) FROM kosztorysy_towary WHERE kosztorys_id = :kid")
        suma = db.execute(suma_query, {"kid": kosztorys_id}).scalar()
        kosztorys.kwota_calkowita = suma or 0.0
    
    db.commit()
    db.refresh(kosztorys_towar)
    return kosztorys_towar

# === TOWARY ===
def get_towary(db: Session):
    """Pobiera wszystkie towary z magazynu"""
    return db.query(Towar).all()

def get_towar(db: Session, towar_id: int):
    """Pobiera konkretny towar po ID"""
    return db.query(Towar).filter(Towar.id == towar_id).first()

def create_towar(db: Session, kod: str, nazwa: str, cena_zakupu: float = None, 
                cena_sprzedazy: float = None, stan_magazynowy: int = 0, 
                jednostka: str = "szt", kategoria: str = None, opis: str = None):
    """Dodaje nowy towar do magazynu"""
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

# === ZŁOŻONE ZAPYTANIA Z GRUPOWANIEM ===
def get_kosztorysy_z_towarami_dla_klienta(db: Session, klient_id: int) -> List[Dict[str, Any]]:
    """Pobiera kosztorysy klienta wraz z towarami - dane są grupowane w Pythonie"""
    
    # Surowe SQL z LEFT JOIN - kosztorysy mogą nie mieć towarów
    query = text("""
        SELECT 
            k.id as kosztorys_id,
            k.numer_kosztorysu,
            k.kwota_calkowita,
            k.opis as kosztorys_opis,
            k.status,
            k.created_at,
            
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
    
    # Grupowanie wyników w Pythonie - jeden kosztorys może mieć wiele towarów
    kosztorysy_dict = {}
    
    for row in rows:
        kosztorys_id = row.kosztorys_id
        
        # Tworzenie kosztorysu jeśli nie istnieje w słowniku
        if kosztorys_id not in kosztorysy_dict:
            kosztorysy_dict[kosztorys_id] = {
                "id": kosztorys_id,
                "numer": row.numer_kosztorysu,
                "kwota_calkowita": float(row.kwota_calkowita) if row.kwota_calkowita else 0.0,
                "opis": row.kosztorys_opis,
                "status": row.status,
                "created_at": row.created_at,
                "towary": []  # Lista towarów w kosztorysie
            }
        
        # Dodawanie towaru do kosztorysu (jeśli istnieje)
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

def get_kosztorysy_z_towarami_dla_samochodu(db: Session, nr_rejestracyjny: str) -> List[Dict[str, Any]]:
    """Pobiera kosztorysy właściciela samochodu wraz z towarami - przez JOIN z samochodami"""
    
    query = text("""
        SELECT 
            k.id as kosztorys_id,
            k.numer_kosztorysu,
            k.kwota_calkowita,
            k.opis as kosztorys_opis,
            k.status,
            k.created_at,
            
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
        JOIN samochody s ON s.klient_id = c.id  -- Join z samochodami
        WHERE s.nr_rejestracyjny = :nr_rej
        ORDER BY k.created_at DESC, t.nazwa ASC
    """)
    
    result = db.execute(query, {"nr_rej": nr_rejestracyjny})
    rows = result.fetchall()
    
    # Identyczne grupowanie jak w funkcji wyżej
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

def get_pojazd_info(db: Session, nr_rejestracyjny: str) -> Dict[str, Any]:
    """Pobiera kompletne informacje o pojeździe - używane w API"""
    
    samochod = db.query(Samochod).filter(Samochod.nr_rejestracyjny == nr_rejestracyjny).first()
    if not samochod:
        return None
    
    # Ustalenie właściciela
    wlasciciel = "Nieznany"
    if samochod.klient:
        wlasciciel = f"{samochod.klient.imie} {samochod.klient.nazwisko}"
    
    # Pobieranie powiązanych danych
    kosztorysy_z_towarami = get_kosztorysy_z_towarami_dla_samochodu(db, nr_rejestracyjny)
    
    notatki = get_notatki_samochodu(db, samochod.id)
    notatki_lista = [
        {
            "id": n.id,
            "tresc": n.tresc,
            "data": n.created_at.strftime('%d.%m.%Y %H:%M')
        }
        for n in notatki
    ]
    
    # Zwracanie kompletnego słownika z danymi pojazdu
    return {
        "nr_rejestracyjny": samochod.nr_rejestracyjny,
        "marka": samochod.marka,
        "model": samochod.model,
        "rok_produkcji": samochod.rok_produkcji,
        "wlasciciel": wlasciciel,
        "kosztorysy_z_towarami": kosztorysy_z_towarami,
        "notatki": notatki_lista
    }