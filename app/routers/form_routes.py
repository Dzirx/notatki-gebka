from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import crud
from database import get_db
from typing import Optional
import json

router = APIRouter()

@router.post("/notatka/add")
async def add_notatka(
    request: Request,
    typ_notatki: str = Form(...),
    tresc: str = Form(...),
    nr_rejestracyjny: Optional[str] = Form(None),
    numer_kosztorysu: Optional[str] = Form(None),
    opis_kosztorysu: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """DODAWANIE NOTATKI - Szybka lub do pojazdu + opcjonalny kosztorys"""
    
    ma_kosztorys = bool(numer_kosztorysu and numer_kosztorysu.strip())
    
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
        notatka = crud.create_notatka_szybka(db, tresc)
    elif typ_notatki == "pojazd" and nr_rejestracyjny:
        samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
        if samochod:
            notatka = crud.create_notatka_samochod(db, samochod.id, tresc)
        else:
            notatka = crud.create_notatka_szybka(db, f"Pojazd {nr_rejestracyjny}: {tresc}")
    else:
        notatka = crud.create_notatka_szybka(db, tresc)
    
    # TWORZENIE KOSZTORYSU
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
            crud.add_towar_do_kosztorysu(
                db=db,
                kosztorys_id=kosztorys.id,
                towar_id=int(towar['id']),
                ilosc=float(towar['ilosc']),
                cena=float(towar['cena'])
            )
        
        for usluga in wybrane_uslugi:
            crud.add_usluge_do_kosztorysu(
                db=db,
                kosztorys_id=kosztorys.id,
                usluga_id=int(usluga['id']),
                ilosc=float(usluga['ilosc']),
                cena=float(usluga['cena'])
            )
    
    return RedirectResponse(url="/home", status_code=303)

@router.post("/klient/add")
def add_klient(
    nazwapelna: str = Form(...),
    nr_telefonu: Optional[str] = Form(None),
    nip: Optional[str] = Form(None),
    nazwa_firmy: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """DODAWANIE KLIENTA"""
    klient = crud.create_klient(db, nazwapelna, nr_telefonu, nip, nazwa_firmy)
    return RedirectResponse(url=f"/klient/{klient.id}", status_code=303)