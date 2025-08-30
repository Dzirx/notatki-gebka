# === MODULES/NOTATNIK/ROUTES/API.PY - API NOTATNIKA ===
from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
import time
import uuid
import os
from pathlib import Path
from sqlalchemy.orm import Session
from database import get_db, get_samochody_db
from sqlalchemy import text, or_, Date
import sys

# Dodaj ścieżkę do głównego katalogu
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from modules.notatnik import crud
from models import Pracownik, Zalacznik, Przypomnienie, Notatka, Towar, Usluga

router = APIRouter()

@router.get("/notatka/{notatka_id}")
def get_notatka_api(notatka_id: int, db: Session = Depends(get_db)):
    """Szczegóły notatki (dla edycji)"""
    notatka = crud.get_notatka_by_id(db, notatka_id)
    if not notatka:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    
    return {
        "id": notatka.id, 
        "tresc": notatka.tresc, 
        "typ_notatki": notatka.typ_notatki,
        "pracownik_id": notatka.pracownik_id
    }

@router.put("/notatka/{notatka_id}")
async def edit_notatka(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """Edycja notatki (AJAX)"""
    data = await request.json()
    notatka = crud.update_notatka_with_employee(
        db, 
        notatka_id, 
        data["tresc"], 
        data.get("pracownik_id")
    )
    
    if not notatka:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    
    return {"success": True}

@router.delete("/notatka/{notatka_id}")
def delete_notatka_api(notatka_id: int, db: Session = Depends(get_db)):
    """Usuwanie notatki (AJAX)"""
    success = crud.delete_notatka(db, notatka_id)
    if success:
        return {"success": True}
    else:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")

@router.get("/pojazd/{nr_rejestracyjny}")
def get_pojazd_info_api(nr_rejestracyjny: str, db: Session = Depends(get_db)):
    """Informacje o pojeździe"""
    samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
    
    if not samochod:
        raise HTTPException(status_code=404, detail="Pojazd nie znaleziony")
    
    return {
        "nr_rejestracyjny": samochod.nr_rejestracyjny,
        "marka": samochod.marka,
        "model": samochod.model,
        "rok_produkcji": samochod.rok_produkcji,
        "wlasciciel": samochod.klient.nazwapelna if samochod.klient else "Nieznany"
    }

@router.get("/towary")
def get_towary_api(db: Session = Depends(get_db)):
    """Lista wszystkich towarów"""
    towary = crud.get_towary(db)
    return [
        {
            "id": t.id,
            "nazwa": t.nazwa,
            "numer_katalogowy": t.numer_katalogowy,
            "cena": float(t.cena) if t.cena else 0.0
        }
        for t in towary
    ]

@router.get("/towary/search")
def search_towary_api(
    q: str = "", 
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Wyszukiwanie towarów po nazwie lub numerze katalogowym"""
    if not q or len(q) < 2:
        return []
    
    towary = db.query(Towar).filter(
        or_(
            Towar.nazwa.ilike(f"%{q}%"),
            Towar.numer_katalogowy.ilike(f"%{q}%")
        )
    ).limit(limit).all()
    
    # Sortuj: Integra na górze, potem własne
    towary_sorted = sorted(towary, key=lambda t: (t.zrodlo != 'integra', t.nazwa))
    
    return [
        {
            "id": t.id,
            "nazwa": t.nazwa,
            "numer_katalogowy": t.numer_katalogowy,
            "cena": float(t.cena) if t.cena else 0.0,
            "nazwa_producenta": t.nazwa_producenta,
            "opona_indeks_nosnosci": t.opona_indeks_nosnosci,
            "rodzaj_opony": t.rodzaj_opony,
            "typ_opony": t.typ_opony,
            "zrodlo": t.zrodlo,
            "external_id": t.external_id,
            "display": f"{t.numer_katalogowy or 'N/A'} - {t.nazwa} {'[INTEGRA]' if t.zrodlo == 'integra' else '[WŁASNY]'}" + 
                     (f" - {t.nazwa_producenta}" if t.nazwa_producenta else "") +
                     (f" {t.rodzaj_opony}/{t.typ_opony}" if t.rodzaj_opony and t.typ_opony else "")
        }
        for t in towary_sorted
    ]

@router.get("/uslugi/search")
def search_uslugi_api(
    q: str = "", 
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Wyszukiwanie usług po nazwie"""
    if not q or len(q) < 2:
        return []
    
    uslugi = db.query(Usluga).filter(
        Usluga.nazwa.ilike(f"%{q}%")
    ).limit(limit).all()
    
    # Sortuj: Integra na górze, potem własne
    uslugi_sorted = sorted(uslugi, key=lambda u: (u.zrodlo != 'integra', u.nazwa))
    
    return [
        {
            "id": u.id,
            "nazwa": u.nazwa,
            "cena": float(u.cena) if u.cena else 0.0,
            "zrodlo": u.zrodlo,
            "external_id": u.external_id,
            "display": f"{u.nazwa} {'[INTEGRA]' if u.zrodlo == 'integra' else '[WŁASNY]'}"
        }
        for u in uslugi_sorted
    ]

@router.get("/uslugi")
def get_uslugi_api(db: Session = Depends(get_db)):
    """Lista wszystkich usług"""
    uslugi = crud.get_uslugi(db)
    # Sortuj: Integra na górze, potem własne
    uslugi_sorted = sorted(uslugi, key=lambda u: (u.zrodlo != 'integra', u.nazwa))
    
    return [
        {
            "id": u.id,
            "nazwa": u.nazwa,
            "cena": float(u.cena) if u.cena else 0.0,
            "zrodlo": u.zrodlo,
            "external_id": u.external_id
        }
        for u in uslugi_sorted
    ]

@router.get("/pracownicy")
def get_pracownicy_api(db: Session = Depends(get_db)):
    """Lista wszystkich pracowników"""
    pracownicy = db.query(Pracownik).all()
    return [
        {
            "id": p.id,
            "imie": p.imie,
            "nazwisko": p.nazwisko,
            "pelne_imie": f"{p.imie} {p.nazwisko}"
        }
        for p in pracownicy
    ]

@router.get("/kosztorysy-zewnetrzne/{nr_rejestracyjny}")
def get_kosztorysy_zewnetrzne(
    nr_rejestracyjny: str,
    db: Session = Depends(get_db),
    db_sql: Session = Depends(get_samochody_db)
):
    """Pobiera kosztorysy z Microsoft SQL Server (baza integra)"""
    
    if db_sql is None:
        raise HTTPException(status_code=503, detail="Brak połączenia z bazą danych integra")
    
    try:
        # Query SQL Server - dokładnie Twoje zapytanie
        sql_query = """
        SELECT 
            ko.nazwaPelna as nazwa_klienta, 
            ko.telefon1 as telefon, 
            ko.nip as nip, 
            ko.email as email,
            ko.nazwaPelnaLista as nazwa_firmy,
            k.numer as numer_kosztorysu, 
            mp.nazwa as model, 
            mk.nazwa as marka, 
            p.rokProdukcji as rok_produkcji, 
            p.nrRejestracyjny as numer_rejestracyjny, 
            k.wartoscBrutto as kwota_kosztorysu,
            
            -- TOWARY Z ID (zamiast stringów)
            (SELECT 
                STRING_AGG(
                    CAST(t2.id as varchar) + '|' + t2.nazwa + '|' + CAST(tk2.ilosc as varchar) + '|' + CAST(tk2.cena as varchar), 
                    ';'
                )
            FROM TowaryKosztorysow tk2 
            INNER JOIN Towary t2 ON tk2.idTowary = t2.id 
            WHERE tk2.idKosztorysy = k.id
            ) as towary_data,
            
            -- USŁUGI Z ID (zamiast stringów)  
            (SELECT 
                STRING_AGG(
                    CAST(u2.id as varchar) + '|' + u2.nazwa + '|' + CAST(uk2.iloscRoboczogodzin as varchar) + '|' + CAST(uk2.cena as varchar), 
                    ';'
                )
            FROM UslugiKosztorysow uk2 
            INNER JOIN Uslugi u2 ON uk2.idUslugi = u2.id 
            WHERE uk2.idKosztorysy = k.id
            ) as uslugi_data
            
        FROM Kosztorysy k
        INNER JOIN Kontrahenci ko ON ko.id = k.idKontrahenci
        INNER JOIN Pojazdy p ON p.id = k.idPojazdy  
        INNER JOIN WersjePojazdow wp ON wp.id = p.idWersjePojazdow
        INNER JOIN ModelePojazdow mp ON mp.id = wp.idModelePojazdow
        INNER JOIN MarkiPojazdow mk ON mk.id = mp.idMarkiPojazdow
        WHERE p.nrRejestracyjny = :nr_rejestracyjny
        ORDER BY k.numer DESC
        """
        
        result = db_sql.execute(text(sql_query), {"nr_rejestracyjny": nr_rejestracyjny})
        kosztorysy = result.fetchall()
        
        if not kosztorysy:
            return {"kosztorysy": [], "message": f"Brak kosztorysów dla pojazdu {nr_rejestracyjny}"}
        
        def parse_towary_data(towary_str):
            """Parse: '123|FILTR OLEJU|1.0|45.0;124|OLEJ|5.5|56.0' → lista obiektów"""
            if not towary_str:
                return []
            
            towary = []
            items = towary_str.split(';')
            for item in items:
                if '|' in item:
                    parts = item.split('|')
                    if len(parts) == 4:
                        towary.append({
                            'id': int(parts[0]),
                            'nazwa': parts[1],
                            'ilosc': float(parts[2]),
                            'cena': float(parts[3])
                        })
            return towary

        def parse_uslugi_data(uslugi_str):
            """Parse: '456|Wymiana oleju|1.0|250.0;...' → lista obiektów"""
            if not uslugi_str:
                return []
            
            uslugi = []
            items = uslugi_str.split(';')
            for item in items:
                if '|' in item:
                    parts = item.split('|')
                    if len(parts) == 4:
                        uslugi.append({
                            'id': int(parts[0]),
                            'nazwa': parts[1],
                            'ilosc': float(parts[2]),
                            'cena': float(parts[3])
                        })
            return uslugi
        
        # Formatuj wyniki
        kosztorysy_lista = []
        for row in kosztorysy:
            # Parse towary i usługi do struktur
            towary_parsed = parse_towary_data(row.towary_data)
            uslugi_parsed = parse_uslugi_data(row.uslugi_data)
            
            kosztorysy_lista.append({
                "numer_kosztorysu": row.numer_kosztorysu,
                "nazwa_klienta": row.nazwa_klienta,
                "telefon": row.telefon,
                "email": row.email,
                "nip": row.nip,
                "pojazd": {
                    "marka": row.marka,
                    "model": row.model, 
                    "rok_produkcji": row.rok_produkcji,
                    "numer_rejestracyjny": row.numer_rejestracyjny
                },
                "kwota_kosztorysu": float(row.kwota_kosztorysu) if row.kwota_kosztorysu else 0.0,
                "towary": towary_parsed,  # ← STRUKTURALNE DANE
                "uslugi": uslugi_parsed   # ← STRUKTURALNE DANE
            })
        
        # === AUTOMATYCZNA SYNCHRONIZACJA POJAZDU Z INTEGRA ===
        sync_result = None
        if kosztorysy:
            try:
                # Użyj funkcji z CRUD do synchronizacji (bez nadpisywania - pokaż dialog przy konflikcie)
                sync_result = crud.sync_vehicle_from_integra(db, kosztorysy[0], overwrite=False)
                print(f"🚗 Sync result: {sync_result}")
                
                # Jeśli jest konflikt właściciela - zwróć info o konflikcie z porównaniem danych
                if not sync_result.get("success") and sync_result.get("conflict"):
                    # Pobierz lokalne dane pojazdu do porównania
                    from models import Samochod
                    local_car = db.query(Samochod).filter(Samochod.id == sync_result["car_id"]).first()
                    
                    return {
                        "kosztorysy": kosztorysy_lista,
                        "pojazd_info": {
                            "numer_rejestracyjny": kosztorysy[0].numer_rejestracyjny,
                            "marka": kosztorysy[0].marka,
                            "model": kosztorysy[0].model,
                            "rok_produkcji": kosztorysy[0].rok_produkcji
                        },
                        "sync_conflict": {
                            "conflict": True,
                            "car_id": sync_result["car_id"],
                            "local_data": {
                                "marka": local_car.marka,
                                "model": local_car.model,
                                "rok_produkcji": local_car.rok_produkcji,
                                "klient": local_car.klient.nazwapelna if local_car.klient else "Brak klienta",
                                "telefon": local_car.klient.nr_telefonu if local_car.klient else "Brak telefonu",
                                "email": local_car.klient.email if local_car.klient else "Brak emailu"
                            },
                            "integra_data": {
                                "marka": kosztorysy[0].marka,
                                "model": kosztorysy[0].model,
                                "rok_produkcji": kosztorysy[0].rok_produkcji,
                                "klient": kosztorysy[0].nazwa_klienta,
                                "telefon": kosztorysy[0].telefon,
                                "email": kosztorysy[0].email
                            },
                            "message": sync_result["message"]
                        }
                    }
                
            except Exception as e:
                print(f"⚠️ Błąd synchronizacji pojazdu: {e}")
                # Kontynuuj bez synchronizacji
                sync_result = {"success": False, "error": str(e)}

        return {
            "kosztorysy": kosztorysy_lista,
            "pojazd_info": {
                "numer_rejestracyjny": kosztorysy[0].numer_rejestracyjny,
                "marka": kosztorysy[0].marka,
                "model": kosztorysy[0].model,
                "rok_produkcji": kosztorysy[0].rok_produkcji
            } if kosztorysy else None,
            "sync_result": sync_result
        }
        
    except Exception as e:
        print(f"Błąd pobierania kosztorysów z SQL Server: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd pobierania danych: {str(e)}")

@router.post("/importuj-kosztorys")
async def importuj_kosztorys_z_externa(request: Request, db: Session = Depends(get_db)):
    """Importuje wybrany kosztorys z SQL Server do PostgreSQL"""
    
    data = await request.json()
    notatka_id = data.get("notatka_id")
    kosztorys_externa = data.get("kosztorys_data")
    
    if not notatka_id or not kosztorys_externa:
        raise HTTPException(status_code=400, detail="Brak wymaganych danych")
    
    try:
        # 1. Utwórz kosztorys w PostgreSQL (bez commitu - zostanie w transakcji)
        from models import Kosztorys
        kosztorys = Kosztorys(
            notatka_id=notatka_id,
            kwota_calkowita=float(kosztorys_externa.get("kwota_kosztorysu", 0)),
            opis=f"Importowano z systemu integra - {kosztorys_externa.get('numer_kosztorysu')}",
            numer_kosztorysu=f"IMP-{kosztorys_externa.get('numer_kosztorysu')}"
        )
        db.add(kosztorys)
        db.flush()  # Pobierz ID ale nie commituj jeszcze
        
        # 2. Importuj towary z Integry
        for towar_data in kosztorys_externa.get("towary", []):
            external_id = towar_data["id"]
            nazwa = towar_data["nazwa"]
            cena = towar_data["cena"]
            
            # Sprawdź czy towar z Integry już istnieje
            existing_towar = db.query(Towar).filter(
                Towar.external_id == external_id,
                Towar.zrodlo == 'integra'
            ).first()
            
            if not existing_towar:
                # Dodaj nowy towar z Integry
                new_towar = Towar(
                    nazwa=nazwa,
                    cena=cena,
                    zrodlo='integra',
                    external_id=external_id
                )
                db.add(new_towar)
                db.flush()  # Pobierz ID
                towar_id = new_towar.id
            else:
                # Użyj istniejącego towaru (możesz zaktualizować cenę)
                existing_towar.cena = cena
                towar_id = existing_towar.id
            
            # Dodaj towar do kosztorysu
            from models import KosztorysTowar
            kosztorys_towar = KosztorysTowar(
                kosztorys_id=kosztorys.id,
                towar_id=towar_id,
                ilosc=towar_data["ilosc"],
                cena=towar_data["cena"]
            )
            db.add(kosztorys_towar)
        
        # 3. Importuj usługi z Integry
        for usluga_data in kosztorys_externa.get("uslugi", []):
            external_id = usluga_data["id"]
            nazwa = usluga_data["nazwa"]
            cena = usluga_data["cena"]
            
            # Sprawdź czy usługa z Integry już istnieje
            existing_usluga = db.query(Usluga).filter(
                Usluga.external_id == external_id,
                Usluga.zrodlo == 'integra'
            ).first()
            
            if not existing_usluga:
                # Dodaj nową usługę z Integry
                new_usluga = Usluga(
                    nazwa=nazwa,
                    cena=cena,
                    zrodlo='integra',
                    external_id=external_id
                )
                db.add(new_usluga)
                db.flush()  # Pobierz ID
                usluga_id = new_usluga.id
            else:
                # Użyj istniejącej usługi
                existing_usluga.cena = cena
                usluga_id = existing_usluga.id
            
            # Dodaj usługę do kosztorysu
            from models import KosztorysUsluga
            kosztorys_usluga = KosztorysUsluga(
                kosztorys_id=kosztorys.id,
                uslugi_id=usluga_id,
                ilosc=usluga_data["ilosc"],
                cena=usluga_data["cena"]
            )
            db.add(kosztorys_usluga)
        
        db.commit()
        
        return {
            "success": True, 
            "kosztorys_id": kosztorys.id,
            "message": f"Zaimportowano kosztorys {kosztorys_externa.get('numer_kosztorysu')}"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd importu: {str(e)}")
    
@router.post("/sync-towary")
async def sync_towary_z_integra(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    db_sql: Session = Depends(get_samochody_db)
):
    """Synchronizuje towary i usługi z bazy integra (SQL Server) do bazy sql"""
    
    if db_sql is None:
        raise HTTPException(status_code=503, detail="Brak połączenia z bazą danych integra")
    
    start_time = time.time()
    
    try:
        print("🔄 Rozpoczynam synchronizację towarów i usług z SQL Server...")
        
        # Synchronizuj towary i usługi
        stats = await crud.sync_towary_i_uslugi(db, db_sql)
        
        end_time = time.time()
        execution_time = round(end_time - start_time, 2)
        
        print(f"✅ Synchronizacja zakończona w {execution_time}s")
        print(f"📊 Statystyki: {stats}")
        
        return {
            "success": True,
            "message": "Synchronizacja zakończona pomyślnie",
            "stats": stats,
            "czas_wykonania": execution_time
        }
        
    except Exception as e:
        print(f"❌ Błąd synchronizacji: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd synchronizacji: {str(e)}")
    
# === DODAJ TE ENDPOINTY DO modules/notatnik/routes/api.py ===

@router.get("/kosztorysy-notatki/{notatka_id}")
def get_kosztorysy_notatki(notatka_id: int, db: Session = Depends(get_db)):
    """Pobiera wszystkie kosztorysy dla notatki z towarami i usługami"""
    try:
        kosztorysy = crud.get_kosztorysy_z_towarami_dla_notatki(db, notatka_id)
        return {"kosztorysy": kosztorysy}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania kosztorysów: {str(e)}")

@router.post("/kosztorys")
async def create_kosztorys_api(request: Request, db: Session = Depends(get_db)):
    """Tworzy nowy kosztorys z towarami i usługami"""
    try:
        data = await request.json()
        
        # Walidacja danych
        notatka_id = data.get("notatka_id")
        numer_kosztorysu = data.get("numer_kosztorysu")
        opis = data.get("opis", "")
        towary = data.get("towary", [])
        uslugi = data.get("uslugi", [])
        
        if not notatka_id:
            raise HTTPException(status_code=400, detail="Brak ID notatki")
        if not numer_kosztorysu:
            raise HTTPException(status_code=400, detail="Brak numeru kosztorysu")
        if len(towary) == 0 and len(uslugi) == 0:
            raise HTTPException(status_code=400, detail="Dodaj przynajmniej jeden towar lub usługę")
        
        # Oblicz kwotę całkowitą
        kwota_calkowita = 0.0
        for towar in towary:
            kwota_calkowita += float(towar.get('ilosc', 0)) * float(towar.get('cena', 0))
        for usluga in uslugi:
            kwota_calkowita += float(usluga.get('ilosc', 0)) * float(usluga.get('cena', 0))
        
        # Utwórz kosztorys (bez commitu - zostanie w transakcji)
        from models import Kosztorys, KosztorysTowar, KosztorysUsluga, Towar, Usluga
        
        kosztorys = Kosztorys(
            notatka_id=notatka_id,
            kwota_calkowita=kwota_calkowita,
            opis=opis,
            numer_kosztorysu=numer_kosztorysu
        )
        db.add(kosztorys)
        db.flush()  # Pobierz ID ale nie commituj jeszcze
        
        # Dodaj towary
        for towar_data in towary:
            if towar_data.get('isCustom'):
                # Własny towar - utwórz nowy w tej samej transakcji
                custom_towar = Towar(
                    nazwa=towar_data['nazwa'],
                    cena=towar_data['cena'],
                    zrodlo='local',
                    external_id=None
                )
                db.add(custom_towar)
                db.flush()  # Pobierz ID
                
                kosztorys_towar = KosztorysTowar(
                    kosztorys_id=kosztorys.id,
                    towar_id=custom_towar.id,
                    ilosc=towar_data['ilosc'],
                    cena=towar_data['cena']
                )
                db.add(kosztorys_towar)
            else:
                # Istniejący towar
                kosztorys_towar = KosztorysTowar(
                    kosztorys_id=kosztorys.id,
                    towar_id=towar_data['id'],
                    ilosc=towar_data['ilosc'],
                    cena=towar_data['cena']
                )
                db.add(kosztorys_towar)
        
        # Dodaj usługi
        for usluga_data in uslugi:
            if usluga_data.get('isCustom'):
                # Własna usługa - utwórz nową w tej samej transakcji
                custom_usluga = Usluga(
                    nazwa=usluga_data['nazwa'],
                    cena=usluga_data['cena'],
                    zrodlo='local',
                    external_id=None
                )
                db.add(custom_usluga)
                db.flush()  # Pobierz ID
                
                kosztorys_usluga = KosztorysUsluga(
                    kosztorys_id=kosztorys.id,
                    uslugi_id=custom_usluga.id,
                    ilosc=usluga_data['ilosc'],
                    cena=usluga_data['cena']
                )
                db.add(kosztorys_usluga)
            else:
                # Istniejąca usługa
                kosztorys_usluga = KosztorysUsluga(
                    kosztorys_id=kosztorys.id,
                    uslugi_id=usluga_data['id'],
                    ilosc=usluga_data['ilosc'],
                    cena=usluga_data['cena']
                )
                db.add(kosztorys_usluga)
        
        # Commit wszystkiego naraz
        db.commit()
        
        return {
            "success": True,
            "kosztorys_id": kosztorys.id,
            "message": f"Kosztorys {numer_kosztorysu} został utworzony"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd tworzenia kosztorysu: {str(e)}")

@router.delete("/kosztorys/{kosztorys_id}")
def delete_kosztorys_api(kosztorys_id: int, db: Session = Depends(get_db)):
    """Usuwa kosztorys"""
    try:
        success = crud.delete_kosztorys(db, kosztorys_id)
        if success:
            return {"success": True, "message": "Kosztorys został usunięty"}
        else:
            raise HTTPException(status_code=404, detail="Kosztorys nie znaleziony")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd usuwania kosztorysu: {str(e)}")

@router.delete("/kosztorys/{kosztorys_id}/towar/{towar_kosztorys_id}")
def delete_kosztorys_towar_api(kosztorys_id: int, towar_kosztorys_id: int, db: Session = Depends(get_db)):
    """Usuwa pojedynczy towar z kosztorysu"""
    try:
        success = crud.delete_kosztorys_towar(db, towar_kosztorys_id)
        if success:
            return {"success": True, "message": "Towar został usunięty z kosztorysu"}
        else:
            raise HTTPException(status_code=404, detail="Towar nie został znaleziony")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd usuwania towaru: {str(e)}")

@router.delete("/kosztorys/{kosztorys_id}/usluga/{usluga_kosztorys_id}")
def delete_kosztorys_usluga_api(kosztorys_id: int, usluga_kosztorys_id: int, db: Session = Depends(get_db)):
    """Usuwa pojedynczą usługę z kosztorysu"""
    try:
        success = crud.delete_kosztorys_usluga(db, usluga_kosztorys_id)
        if success:
            return {"success": True, "message": "Usługa została usunięta z kosztorysu"}
        else:
            raise HTTPException(status_code=404, detail="Usługa nie została znaleziona")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd usuwania usługi: {str(e)}")

@router.post("/edit-kosztorys/{kosztorys_id}")
async def edit_kosztorys_api(kosztorys_id: int, request: Request, db: Session = Depends(get_db)):
    """Edytuje istniejący kosztorys"""
    try:
        data = await request.json()
        
        # Sprawdź czy kosztorys istnieje
        from models import Kosztorys, KosztorysTowar, KosztorysUsluga, Towar, Usluga
        kosztorys = db.query(Kosztorys).filter(Kosztorys.id == kosztorys_id).first()
        if not kosztorys:
            raise HTTPException(status_code=404, detail="Kosztorys nie znaleziony")
        
        # Walidacja danych
        numer_kosztorysu = data.get("numer_kosztorysu")
        opis = data.get("opis", "")
        towary = data.get("towary", [])
        uslugi = data.get("uslugi", [])
                
        if not numer_kosztorysu:
            raise HTTPException(status_code=400, detail="Brak numeru kosztorysu")
        if len(towary) == 0 and len(uslugi) == 0:
            raise HTTPException(status_code=400, detail="Dodaj przynajmniej jeden towar lub usługę")
            
        # Walidacja towarów
        for i, towar in enumerate(towary):
            if not towar.get('id') and not towar.get('isCustom'):
                raise HTTPException(status_code=400, detail=f"Towar {i+1}: brak ID lub flagi isCustom")
            if not towar.get('ilosc') or float(towar.get('ilosc', 0)) <= 0:
                raise HTTPException(status_code=400, detail=f"Towar {i+1}: nieprawidłowa ilość")
            if not towar.get('cena') or float(towar.get('cena', 0)) <= 0:
                raise HTTPException(status_code=400, detail=f"Towar {i+1}: nieprawidłowa cena")
                
        # Walidacja usług
        for i, usluga in enumerate(uslugi):
            if not usluga.get('id') and not usluga.get('isCustom'):
                raise HTTPException(status_code=400, detail=f"Usługa {i+1}: brak ID lub flagi isCustom")
            if not usluga.get('ilosc') or float(usluga.get('ilosc', 0)) <= 0:
                raise HTTPException(status_code=400, detail=f"Usługa {i+1}: nieprawidłowa ilość")
            if not usluga.get('cena') or float(usluga.get('cena', 0)) <= 0:
                raise HTTPException(status_code=400, detail=f"Usługa {i+1}: nieprawidłowa cena")
        
        # Usuń stare towary i usługi
        db.query(KosztorysTowar).filter(KosztorysTowar.kosztorys_id == kosztorys_id).delete()
        db.query(KosztorysUsluga).filter(KosztorysUsluga.kosztorys_id == kosztorys_id).delete()
        
        # Oblicz nową kwotę całkowitą
        kwota_calkowita = 0.0
        for towar in towary:
            kwota_calkowita += float(towar.get('ilosc', 0)) * float(towar.get('cena', 0))
        for usluga in uslugi:
            kwota_calkowita += float(usluga.get('ilosc', 0)) * float(usluga.get('cena', 0))
        
        # Aktualizuj kosztorys
        kosztorys.numer_kosztorysu = numer_kosztorysu
        kosztorys.opis = opis
        kosztorys.kwota_calkowita = kwota_calkowita
        
        # Dodaj nowe towary
        for towar_data in towary:
            if towar_data.get('isCustom'):
                # Własny towar - utwórz nowy
                custom_towar = Towar(
                    nazwa=towar_data['nazwa'],
                    cena=towar_data['cena'],
                    zrodlo='local',
                    external_id=None
                )
                db.add(custom_towar)
                db.flush()
                
                kosztorys_towar = KosztorysTowar(
                    kosztorys_id=kosztorys_id,
                    towar_id=custom_towar.id,
                    ilosc=towar_data['ilosc'],
                    cena=towar_data['cena']
                )
                db.add(kosztorys_towar)
            else:
                # Istniejący towar
                kosztorys_towar = KosztorysTowar(
                    kosztorys_id=kosztorys_id,
                    towar_id=towar_data['id'],
                    ilosc=towar_data['ilosc'],
                    cena=towar_data['cena']
                )
                db.add(kosztorys_towar)
        
        # Dodaj nowe usługi
        for usluga_data in uslugi:
            if usluga_data.get('isCustom'):
                # Własna usługa - utwórz nową
                custom_usluga = Usluga(
                    nazwa=usluga_data['nazwa'],
                    cena=usluga_data['cena'],
                    zrodlo='local',
                    external_id=None
                )
                db.add(custom_usluga)
                db.flush()
                
                kosztorys_usluga = KosztorysUsluga(
                    kosztorys_id=kosztorys_id,
                    uslugi_id=custom_usluga.id,
                    ilosc=usluga_data['ilosc'],
                    cena=usluga_data['cena']
                )
                db.add(kosztorys_usluga)
            else:
                # Istniejąca usługa
                kosztorys_usluga = KosztorysUsluga(
                    kosztorys_id=kosztorys_id,
                    uslugi_id=usluga_data['id'],
                    ilosc=usluga_data['ilosc'],
                    cena=usluga_data['cena']
                )
                db.add(kosztorys_usluga)
        
        # Commit wszystkiego
        db.commit()
        
        return {
            "success": True,
            "kosztorys_id": kosztorys_id,
            "message": f"Kosztorys {numer_kosztorysu} został zaktualizowany"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Błąd w edit_kosztorys_api: {e}")
        print(f"Dane wejściowe: {data}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd aktualizacji kosztorysu: {str(e)}")

@router.get("/notatka-szczegoly/{notatka_id}")
def get_notatka_szczegoly(notatka_id: int, db: Session = Depends(get_db)):
    """Pobiera szczegółowe dane notatki z samochodem i klientem"""
    try:
        notatka = crud.get_notatka_szczegoly(db, notatka_id)
        if not notatka:
            raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
        
        result = {
            "id": notatka.id,
            "tresc": notatka.tresc,
            "typ_notatki": notatka.typ_notatki,
            "created_at": notatka.created_at.isoformat(),
            "samochod": None
        }
        
        if notatka.samochod:
            result["samochod"] = {
                "id": notatka.samochod.id,
                "nr_rejestracyjny": notatka.samochod.nr_rejestracyjny,
                "marka": notatka.samochod.marka,
                "model": notatka.samochod.model,
                "rok_produkcji": notatka.samochod.rok_produkcji,
                "klient": {
                    "id": notatka.samochod.klient.id,
                    "nazwapelna": notatka.samochod.klient.nazwapelna,
                    "nr_telefonu": notatka.samochod.klient.nr_telefonu
                } if notatka.samochod.klient else None
            }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania szczegółów: {str(e)}")
    
@router.put("/notatka/{notatka_id}/status")
async def update_notatka_status(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """Aktualizacja statusu notatki (AJAX)"""
    try:
        data = await request.json()
        new_status = data.get("status")
        
        # Walidacja statusu
        allowed_statuses = ['nowa', 'w_trakcie', 'zakonczona', 'dostarczony', 'klient_poinformowany', 'niekompletne', 'wprowadzona_do_programu']
        if new_status not in allowed_statuses:
            raise HTTPException(status_code=400, detail="Nieprawidłowy status")
        
        # Znajdź notatkę
        notatka = crud.get_notatka_by_id(db, notatka_id)
        if not notatka:
            raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
        
        # Aktualizuj status
        notatka.status = new_status
        db.commit()
        db.refresh(notatka)
        
        return {
            "success": True,
            "message": f"Status zmieniony na '{new_status}'",
            "new_status": new_status,
            "notatka_id": notatka_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd aktualizacji statusu: {str(e)}")

@router.get("/notatki/{notatka_id}/details")
async def get_notatka_details(notatka_id: int, db: Session = Depends(get_db)):
    """Pobiera dodatkowe informacje o notatce"""
    try:
        notatka = crud.get_notatka_by_id(db, notatka_id)
        if not notatka:
            raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
        
        return {
            "data_dostawy": notatka.data_dostawy.isoformat() if notatka.data_dostawy else None,
            "dostawca": notatka.dostawca,
            "nr_vat_dot": notatka.nr_vat_dot,
            "miejsce_prod": notatka.miejsce_prod
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania dodatkowych informacji: {str(e)}")

@router.put("/notatki/{notatka_id}/details")
async def update_notatka_details(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """Aktualizuje dodatkowe informacje o notatce"""
    try:
        data = await request.json()
        
        # Znajdź notatkę
        notatka = crud.get_notatka_by_id(db, notatka_id)
        if not notatka:
            raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
        
        # Aktualizuj pola
        from datetime import datetime
        
        if data.get("data_dostawy"):
            notatka.data_dostawy = datetime.fromisoformat(data["data_dostawy"].replace('Z', '+00:00'))
        else:
            notatka.data_dostawy = None
            
        notatka.dostawca = data.get("dostawca")
        notatka.nr_vat_dot = data.get("nr_vat_dot")
        notatka.miejsce_prod = data.get("miejsce_prod")
        
        db.commit()
        db.refresh(notatka)
        
        return {
            "success": True,
            "message": "Dodatkowe informacje zostały zapisane"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd aktualizacji dodatkowych informacji: {str(e)}")

# === ZAŁĄCZNIKI ===

@router.post("/notatka/{notatka_id}/upload")
async def upload_file(
    notatka_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Przesyła plik i przypisuje do notatki"""
    
    # Sprawdź czy notatka istnieje
    notatka = crud.get_notatka_by_id(db, notatka_id)
    if not notatka:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    
    # Walidacja pliku
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_TYPES = [
        "image/jpeg", "image/png", "image/gif",
        "application/pdf", 
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv"
    ]
    
    if file.size > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Plik jest za duży (max 10MB)")
    
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Nieobsługiwany typ pliku")
    
    try:
        # Odczytaj zawartość pliku
        content = await file.read()
        
        # Zapisz plik bezpośrednio w bazie danych jako BLOB
        zalacznik = Zalacznik(
            notatka_id=notatka_id,
            nazwa_pliku=file.filename,
            rozmiar=len(content),
            typ_mime=file.content_type,
            dane=content  # Zapisz dane binarne w bazie
        )
        db.add(zalacznik)
        db.commit()
        db.refresh(zalacznik)
        
        return {
            "success": True,
            "zalacznik_id": zalacznik.id,
            "nazwa_pliku": zalacznik.nazwa_pliku,
            "rozmiar": zalacznik.rozmiar
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd przesyłania pliku: {str(e)}")

@router.get("/zalacznik/{zalacznik_id}")
def download_file(zalacznik_id: int, db: Session = Depends(get_db)):
    """Pobiera plik załącznika"""
    from fastapi.responses import Response
    
    zalacznik = db.query(Zalacznik).filter(Zalacznik.id == zalacznik_id).first()
    if not zalacznik:
        raise HTTPException(status_code=404, detail="Załącznik nie znaleziony")
    
    # Zwróć dane binarne z bazy danych
    return Response(
        content=zalacznik.dane,
        media_type=zalacznik.typ_mime,
        headers={
            "Content-Disposition": f"attachment; filename={zalacznik.nazwa_pliku}"
        }
    )

@router.delete("/zalacznik/{zalacznik_id}")
def delete_file(zalacznik_id: int, db: Session = Depends(get_db)):
    """Usuwa załącznik"""
    
    zalacznik = db.query(Zalacznik).filter(Zalacznik.id == zalacznik_id).first()
    if not zalacznik:
        raise HTTPException(status_code=404, detail="Załącznik nie znaleziony")
    
    try:
        # Usuń tylko z bazy danych (nie ma już plików na dysku)
        db.delete(zalacznik)
        db.commit()
        
        return {"success": True, "message": "Załącznik został usunięty"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd usuwania załącznika: {str(e)}")

@router.get("/notatka/{notatka_id}/zalaczniki")
def get_note_attachments(notatka_id: int, db: Session = Depends(get_db)):
    """Pobiera listę załączników dla notatki"""
    
    zalaczniki = db.query(Zalacznik).filter(Zalacznik.notatka_id == notatka_id).all()
    
    return [
        {
            "id": z.id,
            "nazwa_pliku": z.nazwa_pliku,
            "rozmiar": z.rozmiar,
            "typ_mime": z.typ_mime,
            "created_at": z.created_at.isoformat()
        }
        for z in zalaczniki
    ]

# === PRZYPOMNIENIA ===

@router.post("/notatka/{notatka_id}/przypomnienie")
async def add_reminder(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """Dodaje przypomnienie do notatki"""
    try:
        data = await request.json()
        data_przypomnienia_str = data.get("data_przypomnienia")
        
        if not data_przypomnienia_str:
            raise HTTPException(status_code=400, detail="Brak daty przypomnienia")
        
        # Sprawdź czy notatka istnieje
        notatka = crud.get_notatka_by_id(db, notatka_id)
        if not notatka:
            raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
        
        # Parse daty
        from datetime import datetime
        data_przypomnienia = datetime.fromisoformat(data_przypomnienia_str.replace('Z', '+00:00'))
        
        # Utwórz przypomnienie
        przypomnienie = Przypomnienie(
            notatka_id=notatka_id,
            data_przypomnienia=data_przypomnienia,
            wyslane=0
        )
        
        db.add(przypomnienie)
        db.commit()
        db.refresh(przypomnienie)
        
        return {
            "success": True,
            "przypomnienie_id": przypomnienie.id,
            "message": "Przypomnienie zostało dodane"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd dodawania przypomnienia: {str(e)}")

@router.get("/notatka/{notatka_id}/przypomnienia")
def get_note_reminders(notatka_id: int, db: Session = Depends(get_db)):
    """Pobiera wszystkie przypomnienia dla notatki"""
    try:
        przypomnienia = db.query(Przypomnienie).filter(
            Przypomnienie.notatka_id == notatka_id
        ).order_by(Przypomnienie.data_przypomnienia).all()
        
        return [
            {
                "id": p.id,
                "data_przypomnienia": p.data_przypomnienia.isoformat(),
                "wyslane": bool(p.wyslane),
                "created_at": p.created_at.isoformat()
            }
            for p in przypomnienia
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania przypomnień: {str(e)}")

@router.delete("/przypomnienie/{przypomnienie_id}")
def delete_reminder(przypomnienie_id: int, db: Session = Depends(get_db)):
    """Usuwa przypomnienie"""
    try:
        przypomnienie = db.query(Przypomnienie).filter(
            Przypomnienie.id == przypomnienie_id
        ).first()
        
        if not przypomnienie:
            raise HTTPException(status_code=404, detail="Przypomnienie nie znalezione")
        
        db.delete(przypomnienie)
        db.commit()
        
        return {"success": True, "message": "Przypomnienie zostało usunięte"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd usuwania przypomnienia: {str(e)}")

@router.get("/przypomnienia/dzisiaj")
def get_today_reminders(db: Session = Depends(get_db)):
    """Pobiera notatki które mają przypomnienie na dzisiaj"""
    try:
        from datetime import date, datetime
        from sqlalchemy import and_, func
        
        dzisiaj = date.today()
        
        # Pobierz notatki z przypomnieniami na dzisiaj (niewyslane)
        query = db.query(
            Notatka.id,
            Notatka.tresc,
            Notatka.typ_notatki,
            Notatka.status,
            Notatka.created_at,
            Przypomnienie.data_przypomnienia,
            Przypomnienie.id.label('przypomnienie_id')
        ).join(
            Przypomnienie, Notatka.id == Przypomnienie.notatka_id
        ).filter(
            and_(
                func.cast(Przypomnienie.data_przypomnienia, Date) == dzisiaj,
                Przypomnienie.wyslane == 0
            )
        ).order_by(Przypomnienie.data_przypomnienia)
        
        results = query.all()
        
        notatki_dzisiaj = []
        for result in results:
            # Pobierz dodatkowe dane o notatce
            notatka_details = crud.get_notatka_szczegoly(db, result.id)
            
            notatka_data = {
                "id": result.id,
                "tresc": result.tresc,
                "typ_notatki": result.typ_notatki,
                "status": result.status,
                "created_at": result.created_at.isoformat(),
                "data_przypomnienia": result.data_przypomnienia.isoformat(),
                "przypomnienie_id": result.przypomnienie_id,
                "samochod": None
            }
            
            # Dodaj info o samochodzie jeśli istnieje
            if notatka_details and notatka_details.samochod:
                notatka_data["samochod"] = {
                    "nr_rejestracyjny": notatka_details.samochod.nr_rejestracyjny,
                    "marka": notatka_details.samochod.marka,
                    "model": notatka_details.samochod.model,
                    "klient": {
                        "nazwapelna": notatka_details.samochod.klient.nazwapelna if notatka_details.samochod.klient else None
                    }
                }
            
            notatki_dzisiaj.append(notatka_data)
        
        return {
            "notatki": notatki_dzisiaj,
            "count": len(notatki_dzisiaj),
            "date": dzisiaj.isoformat()
        }
        
    except Exception as e:
        print(f"Błąd pobierania dzisiejszych przypomnień: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd pobierania przypomnień: {str(e)}")

# === API KLIENTÓW ===

@router.get("/klienci/search")
def search_klienci_api(q: str = "", limit: int = 10, db: Session = Depends(get_db)):
    """Wyszukiwanie klientów"""
    from models import Klient
    
    if len(q.strip()) < 2:
        return []
    
    # Wyszukaj po nazwie, telefonie, emailu lub NIP
    klienci = db.query(Klient).filter(
        or_(
            Klient.nazwapelna.ilike(f"%{q}%"),
            Klient.nr_telefonu.ilike(f"%{q}%"),
            Klient.email.ilike(f"%{q}%"),
            Klient.nip.ilike(f"%{q}%"),
            Klient.nazwa_firmy.ilike(f"%{q}%")
        )
    ).limit(limit).all()
    
    return [
        {
            "id": k.id,
            "nazwapelna": k.nazwapelna,
            "nr_telefonu": k.nr_telefonu,
            "email": k.email,
            "nip": k.nip,
            "nazwa_firmy": k.nazwa_firmy
        }
        for k in klienci
    ]

@router.post("/klienci")
async def create_klient_api(request: Request, db: Session = Depends(get_db)):
    """Dodaj nowego klienta"""
    from models import Klient
    
    data = await request.json()
    
    try:
        nowy_klient = Klient(
            nazwapelna=data["nazwapelna"],
            nr_telefonu=data["nr_telefonu"],
            email=data.get("email"),
            nip=data.get("nip"),
            nazwa_firmy=data.get("nazwa_firmy")
        )
        
        db.add(nowy_klient)
        db.commit()
        db.refresh(nowy_klient)
        
        return {
            "id": nowy_klient.id,
            "nazwapelna": nowy_klient.nazwapelna,
            "nr_telefonu": nowy_klient.nr_telefonu,
            "email": nowy_klient.email,
            "nip": nowy_klient.nip,
            "nazwa_firmy": nowy_klient.nazwa_firmy
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd dodawania klienta: {str(e)}")

# === API SAMOCHODÓW ===

@router.post("/samochody")
async def create_samochod_api(request: Request, db: Session = Depends(get_db)):
    """Dodaj nowy samochód"""
    from models import Samochod, Klient
    
    data = await request.json()
    
    try:
        # Sprawdź czy klient istnieje
        klient = db.query(Klient).filter(Klient.id == data["klient_id"]).first()
        if not klient:
            raise HTTPException(status_code=404, detail="Klient nie znaleziony")
        
        # Sprawdź czy samochód o takim numerze rejestracyjny już istnieje (ignoruj wielkość liter)
        istniejacy = db.query(Samochod).filter(
            Samochod.nr_rejestracyjny.ilike(data["nr_rejestracyjny"])
        ).first()
        
        if istniejacy:
            raise HTTPException(
                status_code=400, 
                detail=f"Samochód o numerze {data['nr_rejestracyjny']} już istnieje w bazie"
            )
        
        nowy_samochod = Samochod(
            klient_id=data["klient_id"],
            nr_rejestracyjny=data["nr_rejestracyjny"],
            marka=data["marka"],
            model=data["model"],
            rok_produkcji=data.get("rok_produkcji")
        )
        
        db.add(nowy_samochod)
        db.commit()
        db.refresh(nowy_samochod)
        
        return {
            "id": nowy_samochod.id,
            "klient_id": nowy_samochod.klient_id,
            "nr_rejestracyjny": nowy_samochod.nr_rejestracyjny,
            "marka": nowy_samochod.marka,
            "model": nowy_samochod.model,
            "rok_produkcji": nowy_samochod.rok_produkcji
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd dodawania samochodu: {str(e)}")

# === SPRAWDZANIE POJAZDU W INTEGRZE ===

@router.get("/sprawdz-pojazd-integra/{nr_rejestracyjny}")
def sprawdz_pojazd_integra(nr_rejestracyjny: str, db_sql: Session = Depends(get_samochody_db)):
    """Sprawdź czy pojazd istnieje w bazie Integra"""
    
    if db_sql is None:
        raise HTTPException(status_code=503, detail="Brak połączenia z bazą danych integra")
    
    try:
        # Proste zapytanie SELECT do sprawdzenia istnienia pojazdu
        sql_query = text("""
            SELECT TOP 1
                p.nrRejestracyjny as nr_rejestracyjny,
                ko.nazwaPelna AS wlasciciel
            FROM Pojazdy p
            INNER JOIN dbo.Kontrahenci ko on p.idKontrahenciWlasciciel = ko.id
            WHERE p.nrRejestracyjny = :nr_rej
        """)
        
        result = db_sql.execute(sql_query, {"nr_rej": nr_rejestracyjny}).fetchone()
        
        if result:
            return {
                "found": True,
                "nr_rejestracyjny": result.nr_rejestracyjny,
                "wlasciciel": result.wlasciciel,
            }
        else:
            return {
                "found": False,
                "message": f"Pojazd {nr_rejestracyjny} nie znaleziony w bazie Integra"
            }
            
    except Exception as e:
        print(f"Błąd sprawdzania pojazdu w Integrze: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd sprawdzania pojazdu: {str(e)}")


@router.get("/samochody/search-local")
def search_samochody_local_api(q: str = "", limit: int = 10, db: Session = Depends(get_db)):
    """Wyszukiwanie samochodów tylko w lokalnej bazie (bez sprawdzania Integra)"""
    from models import Samochod, Klient
    
    if len(q.strip()) < 2:
        return []
    
    # Wyszukaj po numerze rejestracyjnym tylko w lokalnej bazie
    samochody = db.query(Samochod, Klient).outerjoin(
        Klient, Samochod.klient_id == Klient.id
    ).filter(
        Samochod.nr_rejestracyjny.ilike(f"%{q}%")
    ).limit(limit).all()
    
    return [
        {
            "id": s.Samochod.id,
            "nr_rejestracyjny": s.Samochod.nr_rejestracyjny,
            "marka": s.Samochod.marka,
            "model": s.Samochod.model,
            "rok_produkcji": s.Samochod.rok_produkcji,
            "klient": {
                "id": s.Klient.id if s.Klient else None,
                "nazwapelna": s.Klient.nazwapelna if s.Klient else "Brak klienta",
                "nr_telefonu": s.Klient.nr_telefonu if s.Klient else None
            } if s.Klient else {"nazwapelna": "Brak klienta"},
            "display": f"{s.Samochod.nr_rejestracyjny} - {s.Samochod.marka} {s.Samochod.model} ({s.Samochod.rok_produkcji or 'brak roku'}) [LOKALNA BAZA]",
            "source": "local"
        }
        for s in samochody
    ]

@router.post("/sync-pojazd-integra/{nr_rejestracyjny}")
def sync_pojazd_integra_api(
    nr_rejestracyjny: str,
    overwrite: bool = False,
    db: Session = Depends(get_db),
    db_sql: Session = Depends(get_samochody_db)
):
    """Synchronizuje pojazd z Integry z opcją overwrite"""
    
    if db_sql is None:
        raise HTTPException(status_code=503, detail="Brak połączenia z bazą danych integra")
    
    try:
        # Pobierz dane pojazdu z Integry
        sql_query = """
        SELECT 
            ko.nazwaPelna as nazwa_klienta, 
            ko.telefon1 as telefon, 
            ko.nip as nip, 
            ko.email as email,
            ko.nazwaPelnaLista as nazwa_firmy,
            mp.nazwa as model, 
            mk.nazwa as marka, 
            p.rokProdukcji as rok_produkcji, 
            p.nrRejestracyjny as numer_rejestracyjny
        FROM Pojazdy p
        INNER JOIN Kontrahenci ko ON ko.id = p.idKontrahenciWlasciciel
        INNER JOIN WersjePojazdow wp ON wp.id = p.idWersjePojazdow
        INNER JOIN ModelePojazdow mp ON mp.id = wp.idModelePojazdow
        INNER JOIN MarkiPojazdow mk ON mk.id = mp.idMarkiPojazdow
        WHERE p.nrRejestracyjny = :nr_rejestracyjny
        """
        
        result = db_sql.execute(text(sql_query), {"nr_rejestracyjny": nr_rejestracyjny})
        pojazd_integra = result.fetchone()
        
        if not pojazd_integra:
            raise HTTPException(status_code=404, detail=f"Pojazd {nr_rejestracyjny} nie znaleziony w Integrze")
        
        # Wywołaj synchronizację
        sync_result = crud.sync_vehicle_from_integra(db, pojazd_integra, overwrite=overwrite)
        
        return {
            "success": sync_result.get("success", True),
            "message": sync_result.get("message", "Synchronizacja zakończona pomyślnie"),
            "car_id": sync_result.get("car_id"),
            "overwrite": overwrite
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Błąd synchronizacji pojazdu: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd synchronizacji: {str(e)}")