# === MODULES/NOTATNIK/ROUTES/FORMS.PY - FORMULARZE NOTATNIKA ===
from fastapi import APIRouter, Depends, Form, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
from typing import Optional
import json
import sys
import os

# Dodaj ścieżkę do głównego katalogu
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from modules.notatnik import crud
from models import Przypomnienie

router = APIRouter()

@router.post("/add")
async def add_notatka(
    request: Request,
    typ_notatki: str = Form(...),
    tresc: str = Form(...),
    nr_rejestracyjny: Optional[str] = Form(None),
    pracownik_id: Optional[str] = Form(None),
    numer_kosztorysu: Optional[str] = Form(None),
    opis_kosztorysu: Optional[str] = Form(None),
    importowane_kosztorysy: Optional[str] = Form(None),  # ← NOWE POLE
    data_przypomnienia: Optional[str] = Form(None),  # ← PRZYPOMNIENIA
    db: Session = Depends(get_db)
):
    """DODAWANIE NOTATKI - Szybka lub do pojazdu + opcjonalny kosztorys + import z integra"""
    
    # Konwertuj pracownik_id - pusty string na None
    pracownik_id_int = None
    if pracownik_id and pracownik_id.strip():
        try:
            pracownik_id_int = int(pracownik_id)
        except ValueError:
            pracownik_id_int = None
    
    ma_kosztorys = bool(numer_kosztorysu and numer_kosztorysu.strip())
    ma_import_kosztorysow = bool(importowane_kosztorysy and importowane_kosztorysy.strip())
    
    form_data = await request.form()
    wybrane_towary = []
    wybrane_uslugi = []
    
    if ma_kosztorys:
        try:
            wybrane_towary = json.loads(form_data.get('towary_json', '[]'))
            wybrane_uslugi = json.loads(form_data.get('uslugi_json', '[]'))
        except:
            wybrane_towary = []
            wybrane_uslugi = []
    
    # TWORZENIE NOTATKI
    if typ_notatki == "szybka":
        notatka = crud.create_notatka_szybka(db, tresc, pracownik_id_int)
    elif typ_notatki == "pojazd" and nr_rejestracyjny:
        samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
        if samochod:
            notatka = crud.create_notatka_samochod(db, samochod.id, tresc, pracownik_id_int)
        else:
            # Utwórz samochód jeśli nie istnieje (z danych z integra)
            if ma_import_kosztorysow:
                try:
                    kosztorysy_data = json.loads(importowane_kosztorysy)
                    if kosztorysy_data:
                        pierwszy_kosztorys = kosztorysy_data[0]
                        pojazd_data = pierwszy_kosztorys.get('pojazd', {})
                        
                        # Utwórz klienta jeśli potrzeba
                        klient = crud.get_or_create_klient(
                            db, 
                            nazwa=pierwszy_kosztorys.get('nazwa_klienta'),
                            telefon=pierwszy_kosztorys.get('telefon'),
                            nip=pierwszy_kosztorys.get('nip')
                        )
                        
                        # Utwórz samochód
                        samochod = crud.create_samochod(
                            db,
                            klient_id=klient.id,
                            nr_rejestracyjny=pojazd_data.get('numer_rejestracyjny'),
                            marka=pojazd_data.get('marka'),
                            model=pojazd_data.get('model'),
                            rok_produkcji=pojazd_data.get('rok_produkcji')
                        )
                        
                        notatka = crud.create_notatka_samochod(db, samochod.id, tresc, pracownik_id_int)
                    else:
                        notatka = crud.create_notatka_szybka(db, f"Pojazd {nr_rejestracyjny}: {tresc}", pracownik_id_int)
                except Exception as e:
                    print(f"Błąd tworzenia samochodu z danych integra: {e}")
                    notatka = crud.create_notatka_szybka(db, f"Pojazd {nr_rejestracyjny}: {tresc}", pracownik_id_int)
            else:
                notatka = crud.create_notatka_szybka(db, f"Pojazd {nr_rejestracyjny}: {tresc}", pracownik_id_int)
    else:
        notatka = crud.create_notatka_szybka(db, tresc, pracownik_id_int)
    
    # TWORZENIE ZWYKŁEGO KOSZTORYSU (stara funkcjonalność)
    if ma_kosztorys and notatka:
        kwota_calkowita = 0.0
        for towar in wybrane_towary:
            kwota_calkowita += float(towar.get('ilosc', 0)) * float(towar.get('cena', 0))
        for usluga in wybrane_uslugi:
            kwota_calkowita += float(usluga.get('ilosc', 0)) * float(usluga.get('cena', 0))
        
        kosztorys = crud.create_kosztorys(
            db=db,
            notatka_id=notatka.id,
            kwota=kwota_calkowita,
            opis=opis_kosztorysu,
            numer_kosztorysu=numer_kosztorysu
        )
        
        for towar in wybrane_towary:
            if towar.get('isCustom'):
                # Własny towar - utwórz nowy
                custom_towar = crud.create_custom_towar(
                    db, 
                    towar['nazwa'], 
                    float(towar['cena'])
                )
                towar_id = custom_towar.id
            else:
                # Istniejący towar z bazy
                towar_id = int(towar['id'])
            
            crud.add_towar_do_kosztorysu(
                db=db,
                kosztorys_id=kosztorys.id,
                towar_id=towar_id,
                ilosc=float(towar['ilosc']),
                cena=float(towar['cena'])
            )
        
        for usluga in wybrane_uslugi:
            if usluga.get('isCustom'):
                # Własna usługa - utwórz nową
                custom_usluga = crud.create_custom_usluga(
                    db,
                    usluga['nazwa'], 
                    float(usluga['cena'])
                )
                usluga_id = custom_usluga.id
            else:
                # Istniejąca usługa z bazy
                usluga_id = int(usluga['id'])
            
            crud.add_usluge_do_kosztorysu(
                db=db,
                kosztorys_id=kosztorys.id,
                usluga_id=usluga_id,
                ilosc=float(usluga['ilosc']),
                cena=float(usluga['cena'])
            )
    
    # IMPORT KOSZTORYSÓW Z INTEGRA (nowa funkcjonalność)
    if ma_import_kosztorysow and notatka:
        try:
            kosztorysy_data = json.loads(importowane_kosztorysy)
            for kosztorys_data in kosztorysy_data:
                # Utwórz kosztorys w MS SQL
                kosztorys = crud.create_kosztorys(
                    db=db,
                    notatka_id=notatka.id,
                    kwota=float(kosztorys_data.get('kwota_kosztorysu', 0)),
                    opis=f"Importowano z integra - {kosztorys_data.get('numer_kosztorysu')}",
                    numer_kosztorysu=f"IMP-{kosztorys_data.get('numer_kosztorysu')}"
                )
                
                # DODAJ TOWARY (strukturalnie z ID)
                towary = kosztorys_data.get('towary', [])
                for towar_data in towary:
                    # Zapewnij że towar istnieje w MS SQL (upsert)
                    towar = crud.get_or_create_towar_by_id(
                        db, 
                        towar_data['id'], 
                        towar_data['nazwa'], 
                        towar_data['cena']
                    )
                    
                    # Dodaj do kosztorysu
                    crud.add_towar_do_kosztorysu(
                        db=db,
                        kosztorys_id=kosztorys.id,
                        towar_id=towar.id,
                        ilosc=towar_data['ilosc'],
                        cena=towar_data['cena']
                    )
                
                # DODAJ USŁUGI (strukturalnie z ID)
                uslugi = kosztorys_data.get('uslugi', [])
                for usluga_data in uslugi:
                    # Zapewnij że usługa istnieje w PostgreSQL (upsert)
                    usluga = crud.get_or_create_usluga_by_id(
                        db,
                        usluga_data['id'],
                        usluga_data['nazwa'], 
                        usluga_data['cena']
                    )
                    
                    # Dodaj do kosztorysu
                    crud.add_usluge_do_kosztorysu(
                        db=db,
                        kosztorys_id=kosztorys.id,
                        usluga_id=usluga.id,
                        ilosc=usluga_data['ilosc'],
                        cena=usluga_data['cena']
                    )
                
                print(f"✅ Zaimportowano kosztorys: {kosztorys_data.get('numer_kosztorysu')} z {len(towary)} towarami i {len(uslugi)} usługami")
        
        except Exception as e:
            print(f"❌ Błąd importu kosztorysów: {e}")
    
    # DODAJ PRZYPOMNIENIE (jeśli podano)
    if data_przypomnienia and data_przypomnienia.strip() and notatka:
        try:
            from datetime import datetime
            data_remind = datetime.fromisoformat(data_przypomnienia)
            
            przypomnienie = Przypomnienie(
                notatka_id=notatka.id,
                data_przypomnienia=data_remind,
                wyslane=0
            )
            
            db.add(przypomnienie)
            db.commit()
            print(f"✅ Dodano przypomnienie na {data_remind}")
            
        except Exception as e:
            print(f"❌ Błąd dodawania przypomnienia: {e}")
    
    # Sprawdź czy to AJAX request (sprawdź Accept header)
    accept_header = request.headers.get("accept", "")
    if "application/json" in accept_header:
        return {
            "success": True,
            "notatka_id": notatka.id,
            "message": "Notatka została zapisana"
        }
    else:
        return RedirectResponse(url="/notatnik", status_code=303)