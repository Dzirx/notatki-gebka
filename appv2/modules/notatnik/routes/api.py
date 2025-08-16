# === MODULES/NOTATNIK/ROUTES/API.PY - API NOTATNIKA ===
from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
import time
from sqlalchemy.orm import Session
from database import get_db, get_samochody_db
from sqlalchemy import text
import sys
import os

# Dodaj ścieżkę do głównego katalogu
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from modules.notatnik import crud

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
        "typ_notatki": notatka.typ_notatki
    }

@router.put("/notatka/{notatka_id}")
async def edit_notatka(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """Edycja notatki (AJAX)"""
    data = await request.json()
    notatka = crud.update_notatka(db, notatka_id, data["tresc"])
    
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
            "cena": float(t.cena) if t.cena else 0.0
        }
        for t in towary
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
    """Synchronizuje towary i usługi z bazy integra (SQL Server) do PostgreSQL"""
    
    if db_sql is None:
        raise HTTPException(status_code=503, detail="Brak połączenia z bazą danych integra")
    
    start_time = time.time()
    
    try:
        print("🔄 Rozpoczynam synchronizację towarów i usług z SQL Server...")
        
        # Synchronizuj towary i usługi
        stats = await crud.sync_towary_i_uslugi_from_sql(db, db_sql)
        
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
        allowed_statuses = ['nowa', 'w_trakcie', 'zakonczona', 'anulowana', 'oczekuje']
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