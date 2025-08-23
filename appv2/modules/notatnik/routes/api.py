# === MODULES/NOTATNIK/ROUTES/API.PY - API NOTATNIKA ===
from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
import time
import uuid
import os
from pathlib import Path
from sqlalchemy.orm import Session
from database import get_db, get_samochody_db
from sqlalchemy import text, or_
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
    
    return [
        {
            "id": t.id,
            "nazwa": t.nazwa,
            "numer_katalogowy": t.numer_katalogowy,
            "cena": float(t.cena) if t.cena else 0.0,
            "display": f"{t.numer_katalogowy or 'N/A'} - {t.nazwa}"
        }
        for t in towary
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
    
    return [
        {
            "id": u.id,
            "nazwa": u.nazwa,
            "cena": float(u.cena) if u.cena else 0.0,
            "display": f"{u.nazwa}"
        }
        for u in uslugi
    ]

@router.get("/uslugi")
def get_uslugi_api(db: Session = Depends(get_db)):
    """Lista wszystkich usług"""
    uslugi = crud.get_uslugi(db)
    return [
        {
            "id": u.id,
            "nazwa": u.nazwa,
            "cena": float(u.cena) if u.cena else 0.0
        }
        for u in uslugi
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
def get_kosztorysy_zewnetrzne(nr_rejestracyjny: str, db_sql: Session = Depends(get_samochody_db)):
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
        
        return {
            "kosztorysy": kosztorysy_lista,
            "pojazd_info": {
                "numer_rejestracyjny": kosztorysy[0].numer_rejestracyjny,
                "marka": kosztorysy[0].marka,
                "model": kosztorysy[0].model,
                "rok_produkcji": kosztorysy[0].rok_produkcji
            } if kosztorysy else None
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
        # Utwórz kosztorys w PostgreSQL na podstawie danych z SQL Server
        kosztorys = crud.create_kosztorys(
            db=db,
            notatka_id=notatka_id,
            kwota=float(kosztorys_externa.get("kwota_kosztorysu", 0)),
            opis=f"Importowano z systemu integra - {kosztorys_externa.get('numer_kosztorysu')}",
            numer_kosztorysu=f"IMP-{kosztorys_externa.get('numer_kosztorysu')}"
        )
        
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
        
        # Utwórz kosztorys
        kosztorys = crud.create_kosztorys(
            db=db,
            notatka_id=notatka_id,
            kwota=kwota_calkowita,
            opis=opis,
            numer_kosztorysu=numer_kosztorysu
        )
        
        # Dodaj towary
        for towar_data in towary:
            if towar_data.get('isCustom'):
                # Własny towar - utwórz nowy
                custom_towar = crud.create_custom_towar(
                    db, 
                    towar_data['nazwa'], 
                    towar_data['cena']
                )
                crud.add_towar_do_kosztorysu(
                    db=db,
                    kosztorys_id=kosztorys.id,
                    towar_id=custom_towar.id,
                    ilosc=towar_data['ilosc'],
                    cena=towar_data['cena']
                )
            else:
                # Istniejący towar
                crud.add_towar_do_kosztorysu(
                    db=db,
                    kosztorys_id=kosztorys.id,
                    towar_id=towar_data['id'],
                    ilosc=towar_data['ilosc'],
                    cena=towar_data['cena']
                )
        
        # Dodaj usługi
        for usluga_data in uslugi:
            if usluga_data.get('isCustom'):
                # Własna usługa - utwórz nową
                custom_usluga = crud.create_custom_usluga(
                    db, 
                    usluga_data['nazwa'], 
                    usluga_data['cena']
                )
                crud.add_usluge_do_kosztorysu(
                    db=db,
                    kosztorys_id=kosztorys.id,
                    usluga_id=custom_usluga.id,
                    ilosc=usluga_data['ilosc'],
                    cena=usluga_data['cena']
                )
            else:
                # Istniejąca usługa
                crud.add_usluge_do_kosztorysu(
                    db=db,
                    kosztorys_id=kosztorys.id,
                    usluga_id=usluga_data['id'],
                    ilosc=usluga_data['ilosc'],
                    cena=usluga_data['cena']
                )
        
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
        allowed_statuses = ['nowa', 'w_trakcie', 'zakonczona', 'dostarczony', 'klient_poinformowany']
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
        # Utwórz folder jeśli nie istnieje
        from datetime import datetime
        now = datetime.now()
        upload_dir = Path(f"notatnik/uploads/{now.year}/{now.month:02d}")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generuj unikalną nazwę pliku
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Zapisz plik
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Zapisz w bazie danych
        zalacznik = Zalacznik(
            notatka_id=notatka_id,
            nazwa_pliku=file.filename,
            rozmiar=len(content),
            typ_mime=file.content_type,
            sciezka=str(file_path)
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
        # Usuń plik jeśli wystąpił błąd
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Błąd przesyłania pliku: {str(e)}")

@router.get("/zalacznik/{zalacznik_id}")
def download_file(zalacznik_id: int, db: Session = Depends(get_db)):
    """Pobiera plik załącznika"""
    
    zalacznik = db.query(Zalacznik).filter(Zalacznik.id == zalacznik_id).first()
    if not zalacznik:
        raise HTTPException(status_code=404, detail="Załącznik nie znaleziony")
    
    file_path = Path(zalacznik.sciezka)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Plik nie istnieje na serwerze")
    
    return FileResponse(
        path=str(file_path),
        filename=zalacznik.nazwa_pliku,
        media_type=zalacznik.typ_mime
    )

@router.delete("/zalacznik/{zalacznik_id}")
def delete_file(zalacznik_id: int, db: Session = Depends(get_db)):
    """Usuwa załącznik"""
    
    zalacznik = db.query(Zalacznik).filter(Zalacznik.id == zalacznik_id).first()
    if not zalacznik:
        raise HTTPException(status_code=404, detail="Załącznik nie znaleziony")
    
    try:
        # Usuń plik z dysku
        file_path = Path(zalacznik.sciezka)
        if file_path.exists():
            file_path.unlink()
        
        # Usuń z bazy
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
                func.date(Przypomnienie.data_przypomnienia) == dzisiaj,
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