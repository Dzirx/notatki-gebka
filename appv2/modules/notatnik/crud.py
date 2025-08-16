# === MODULES/NOTATNIK/CRUD.PY - OPERACJE BAZODANOWE ===
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, func
from models import Notatka, Samochod, Kosztorys, KosztorysTowar, KosztorysUsluga, Towar, Usluga, Klient
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
    db_notatka = Notatka(samochod_id=None, typ_notatki="szybka", tresc=tresc, status="nowa")
    db.add(db_notatka)
    db.commit()
    db.refresh(db_notatka)
    return db_notatka

def create_notatka_samochod(db: Session, samochod_id: int, tresc: str):
    """Tworzy notatkę przypisaną do konkretnego samochodu"""
    db_notatka = Notatka(samochod_id=samochod_id, typ_notatki="pojazd", tresc=tresc, status="nowa")
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

def get_or_create_klient(db: Session, nazwa: str, telefon: str = None, nip: str = None):
    """Znajdź klienta lub utwórz nowego"""
    from models import Klient
    
    # Spróbuj znaleźć po nazwie lub NIP
    klient = None
    if nip:
        klient = db.query(Klient).filter(Klient.nip == nip).first()
    
    if not klient and nazwa:
        klient = db.query(Klient).filter(Klient.nazwapelna == nazwa).first()
    
    # Jeśli nie znalazł, utwórz nowego
    if not klient:
        klient = Klient(
            nazwapelna=nazwa,
            nr_telefonu=telefon,
            nip=nip
        )
        db.add(klient)
        db.commit()
        db.refresh(klient)
        print(f"✅ Utworzono nowego klienta: {nazwa}")
    else:
        print(f"📋 Znaleziono istniejącego klienta: {nazwa}")
    
    return klient

def create_samochod(db: Session, klient_id: int, nr_rejestracyjny: str, 
                   marka: str = None, model: str = None, rok_produkcji: int = None):
    """Tworzy nowy samochód"""
    from models import Samochod
    
    # Sprawdź czy samochód już istnieje
    existing = db.query(Samochod).filter(Samochod.nr_rejestracyjny == nr_rejestracyjny).first()
    if existing:
        print(f"📋 Znaleziono istniejący samochód: {nr_rejestracyjny}")
        return existing
    
    samochod = Samochod(
        klient_id=klient_id,
        nr_rejestracyjny=nr_rejestracyjny,
        marka=marka,
        model=model,
        rok_produkcji=rok_produkcji
    )
    db.add(samochod)
    db.commit()
    db.refresh(samochod)
    print(f"✅ Utworzono nowy samochód: {nr_rejestracyjny} - {marka} {model}")
    return samochod

async def sync_towary_i_uslugi_from_sql(db_pg: Session, db_sql: Session):
    """Synchronizuje towary i usługi z SQL Server do PostgreSQL (lustrzane odbicie)"""
    
    stats = {
        "towary_dodane": 0,
        "towary_zaktualizowane": 0,
        "uslugi_dodane": 0,
        "uslugi_zaktualizowane": 0
    }
    
    try:
        # === SYNCHRONIZACJA TOWARÓW ===
        print("📦 Synchronizuję towary...")
        
        # Pobierz wszystkie towary z SQL Server
        towary_sql_query = text("SELECT id, nazwa, bazowaCenaSprzedazyBrutto FROM Towary ORDER BY id")
        result = db_sql.execute(towary_sql_query)
        towary_sql = result.fetchall()
        
        print(f"📋 Znaleziono {len(towary_sql)} towarów w SQL Server")
        
        for row in towary_sql:
            # Sprawdź czy towar istnieje w PostgreSQL
            existing_towar = db_pg.query(Towar).filter(Towar.id == row.id).first()
            
            if existing_towar:
                # Zaktualizuj istniejący towar
                existing_towar.nazwa = row.nazwa
                existing_towar.cena = float(row.cena) if row.cena else 0.0
                existing_towar.updated_at = func.now()
                stats["towary_zaktualizowane"] += 1
            else:
                # Utwórz nowy towar z tym samym ID
                new_towar = Towar(
                    id=row.id,
                    nazwa=row.nazwa,
                    cena=float(row.cena) if row.cena else 0.0
                )
                db_pg.add(new_towar)
                stats["towary_dodane"] += 1
        
        # === SYNCHRONIZACJA USŁUG ===
        print("🔧 Synchronizuję usługi...")
        
        # Pobierz wszystkie usługi z SQL Server
        uslugi_sql_query = text("SELECT id, nazwa, cena FROM Uslugi ORDER BY id")
        result = db_sql.execute(uslugi_sql_query)
        uslugi_sql = result.fetchall()
        
        print(f"📋 Znaleziono {len(uslugi_sql)} usług w SQL Server")
        
        for row in uslugi_sql:
            # Sprawdź czy usługa istnieje w PostgreSQL
            existing_usluga = db_pg.query(Usluga).filter(Usluga.id == row.id).first()
            
            if existing_usluga:
                # Zaktualizuj istniejącą usługę
                existing_usluga.nazwa = row.nazwa
                existing_usluga.cena = float(row.cena) if row.cena else 0.0
                existing_usluga.updated_at = func.now()
                stats["uslugi_zaktualizowane"] += 1
            else:
                # Utwórz nową usługę z tym samym ID
                new_usluga = Usluga(
                    id=row.id,
                    nazwa=row.nazwa,
                    cena=float(row.cena) if row.cena else 0.0
                )
                db_pg.add(new_usluga)
                stats["uslugi_dodane"] += 1
        
        # Zapisz wszystkie zmiany
        db_pg.commit()
        
        print(f"✅ Synchronizacja zakończona:")
        print(f"   📦 Towary: +{stats['towary_dodane']}, ~{stats['towary_zaktualizowane']}")
        print(f"   🔧 Usługi: +{stats['uslugi_dodane']}, ~{stats['uslugi_zaktualizowane']}")
        
        return stats
        
    except Exception as e:
        db_pg.rollback()
        print(f"❌ Błąd synchronizacji: {e}")
        raise e
    
def get_or_create_towar_by_id(db: Session, towar_id: int, nazwa: str, cena: float):
    """Znajdź towar po ID lub utwórz z tym ID (lustrzane odbicie)"""
    from models import Towar
    
    # Sprawdź czy towar istnieje
    towar = db.query(Towar).filter(Towar.id == towar_id).first()
    
    if not towar:
        # Utwórz nowy towar z zadanym ID
        towar = Towar(
            id=towar_id,
            nazwa=nazwa,
            cena=cena
        )
        db.add(towar)
        db.commit()
        db.refresh(towar)
        print(f"✅ Utworzono towar: {nazwa} (ID: {towar_id})")
    else:
        # Zaktualizuj cenę jeśli się różni
        if float(towar.cena or 0) != cena:
            towar.cena = cena
            towar.updated_at = func.now()
            db.commit()
            print(f"🔄 Zaktualizowano cenę towaru: {nazwa} (ID: {towar_id})")
    
    return towar

def get_or_create_usluga_by_id(db: Session, usluga_id: int, nazwa: str, cena: float):
    """Znajdź usługę po ID lub utwórz z tym ID (lustrzane odbicie)"""
    from models import Usluga
    
    # Sprawdź czy usługa istnieje
    usluga = db.query(Usluga).filter(Usluga.id == usluga_id).first()
    
    if not usluga:
        # Utwórz nową usługę z zadanym ID
        usluga = Usluga(
            id=usluga_id,
            nazwa=nazwa,
            cena=cena
        )
        db.add(usluga)
        db.commit()
        db.refresh(usluga)
        print(f"✅ Utworzono usługę: {nazwa} (ID: {usluga_id})")
    else:
        # Zaktualizuj cenę jeśli się różni
        if float(usluga.cena or 0) != cena:
            usluga.cena = cena
            usluga.updated_at = func.now()
            db.commit()
            print(f"🔄 Zaktualizowano cenę usługi: {nazwa} (ID: {usluga_id})")
    
    return usluga

# === DODAJ TE FUNKCJE DO modules/notatnik/crud.py ===

def get_notatka_szczegoly(db: Session, notatka_id: int):
    """Pobiera notatkę z pełnymi danymi samochodu i klienta"""
    return db.query(Notatka).options(
        joinedload(Notatka.samochod).joinedload(Samochod.klient)
    ).filter(Notatka.id == notatka_id).first()

def create_custom_towar(db: Session, nazwa: str, cena: float):
    """Tworzy własny towar (nie z bazy integra)"""
    from models import Towar
    
    # Sprawdź czy towar o tej nazwie już istnieje
    existing = db.query(Towar).filter(Towar.nazwa == nazwa).first()
    if existing:
        return existing
    
    towar = Towar(
        nazwa=nazwa,
        cena=cena
    )
    db.add(towar)
    db.commit()
    db.refresh(towar)
    return towar

def create_custom_usluga(db: Session, nazwa: str, cena: float):
    """Tworzy własną usługę (nie z bazy integra)"""
    from models import Usluga
    
    # Sprawdź czy usługa o tej nazwie już istnieje
    existing = db.query(Usluga).filter(Usluga.nazwa == nazwa).first()
    if existing:
        return existing
    
    usluga = Usluga(
        nazwa=nazwa,
        cena=cena
    )
    db.add(usluga)
    db.commit()
    db.refresh(usluga)
    return usluga

def delete_kosztorys(db: Session, kosztorys_id: int):
    """Usuwa kosztorys wraz z wszystkimi pozycjami"""
    try:
        # Usuń pozycje kosztorysu
        db.query(KosztorysTowar).filter(KosztorysTowar.kosztorys_id == kosztorys_id).delete()
        db.query(KosztorysUsluga).filter(KosztorysUsluga.kosztorys_id == kosztorys_id).delete()
        
        # Usuń kosztorys
        kosztorys = db.query(Kosztorys).filter(Kosztorys.id == kosztorys_id).first()
        if kosztorys:
            db.delete(kosztorys)
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        print(f"Błąd usuwania kosztorysu {kosztorys_id}: {e}")
        return False

def update_notatka_status(db: Session, notatka_id: int, new_status: str):
    """Aktualizuje status notatki"""
    try:
        # Znajdź notatkę
        notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
        
        if not notatka:
            return None
        
        # Walidacja statusu
        allowed_statuses = ['nowa', 'w_trakcie', 'zakonczona', 'anulowana', 'oczekuje']
        if new_status not in allowed_statuses:
            raise ValueError(f"Nieprawidłowy status: {new_status}")
        
        # Aktualizuj status
        notatka.status = new_status
        notatka.updated_at = datetime.utcnow()  # Jeśli masz pole updated_at
        
        db.commit()
        db.refresh(notatka)
        
        return notatka
        
    except Exception as e:
        db.rollback()
        raise e
    
def get_kosztorys_by_id(db: Session, kosztorys_id: int):
    """Pobiera kosztorys po ID"""
    return db.query(Kosztorys).filter(Kosztorys.id == kosztorys_id).first()

def get_kosztorys_szczegoly(db: Session, kosztorys_id: int) -> Dict[str, Any]:
    """Pobiera szczegóły konkretnego kosztorysu z towarami i usługami"""
    
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
        WHERE k.id = :kosztorys_id
        ORDER BY t.nazwa ASC, u.nazwa ASC
    """)
    
    result = db.execute(query, {"kosztorys_id": kosztorys_id})
    rows = result.fetchall()
    
    if not rows:
        return None
    
    # Pierwszy wiersz zawiera podstawowe dane kosztorysu
    first_row = rows[0]
    
    kosztorys_data = {
        "id": first_row.kosztorys_id,
        "numer": first_row.numer_kosztorysu,
        "kwota_calkowita": float(first_row.kwota_calkowita) if first_row.kwota_calkowita else 0.0,
        "opis": first_row.kosztorys_opis,
        "status": first_row.status,
        "created_at": first_row.created_at,
        "towary": [],
        "uslugi": []
    }
    
    # Zbierz unikalne towary i usługi
    towary_set = set()
    uslugi_set = set()
    
    for row in rows:
        if row.towar_nazwa and row.towar_nazwa not in towary_set:
            kosztorys_data["towary"].append({
                "nazwa": row.towar_nazwa,
                "ilosc": float(row.towar_ilosc),
                "cena": float(row.towar_cena),
                "wartosc": float(row.towar_ilosc) * float(row.towar_cena)
            })
            towary_set.add(row.towar_nazwa)
        
        if row.usluga_nazwa and row.usluga_nazwa not in uslugi_set:
            kosztorys_data["uslugi"].append({
                "nazwa": row.usluga_nazwa,
                "ilosc": float(row.usluga_ilosc),
                "cena": float(row.usluga_cena),
                "wartosc": float(row.usluga_ilosc) * float(row.usluga_cena)
            })
            uslugi_set.add(row.usluga_nazwa)
    
    return kosztorys_data