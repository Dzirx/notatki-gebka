# === ROUTERS/FORM_ROUTES.PY - AKCJE FORMULARZY ===
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import crud
from database import get_db
from models import Samochod
from typing import Optional, List
import json

router = APIRouter()

@router.post("/notatka/add")
async def add_notatka(
    request: Request,
    typ_notatki: str = Form(...),
    tresc: str = Form(...),
    nr_rejestracyjny: Optional[str] = Form(None),
    # NOWE POLA KOSZTORYSU
    numer_kosztorysu: Optional[str] = Form(None),
    opis_kosztorysu: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """DODAWANIE NOTATKI - Szybka lub do pojazdu + opcjonalny kosztorys"""
    
    # Sprawdź czy dodano kosztorys (sprawdź czy numer_kosztorysu został wypełniony)
    ma_kosztorys = bool(numer_kosztorysu and numer_kosztorysu.strip())
    
    # Pobierz wybrane towary i usługi z formularza (jeśli są)
    form_data = await request.form()
    wybrane_towary = []
    wybrane_uslugi = []
    
    if ma_kosztorys:
        # Parsuj dane towarów i usług z formularza
        # Te dane będą przesłane jako hidden fields z JavaScript
        towary_data = form_data.get('towary_json', '[]')
        uslugi_data = form_data.get('uslugi_json', '[]')
        
        try:
            wybrane_towary = json.loads(towary_data) if towary_data else []
            wybrane_uslugi = json.loads(uslugi_data) if uslugi_data else []
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
            # Sprawdź zewnętrzną bazę
            samochod_zewn = crud.get_samochod_zewnetrzny(nr_rejestracyjny)
            if samochod_zewn:
                notatka = crud.create_notatka_szybka(db, f"Pojazd {nr_rejestracyjny}: {tresc}")
            else:
                notatka = crud.create_notatka_szybka(db, f"Nieznany pojazd {nr_rejestracyjny}: {tresc}")
    else:
        notatka = crud.create_notatka_szybka(db, tresc)
    
    # TWORZENIE KOSZTORYSU (jeśli zaznaczono)
    if ma_kosztorys and notatka:
        # Oblicz kwotę całkowitą
        kwota_calkowita = 0.0
        for towar in wybrane_towary:
            kwota_calkowita += float(towar.get('ilosc', 0)) * float(towar.get('cena', 0))
        for usluga in wybrane_uslugi:
            kwota_calkowita += float(usluga.get('ilosc', 0)) * float(usluga.get('cena', 0))
        
        # Utwórz kosztorys
        kosztorys = crud.create_kosztorys(
            db=db,
            notatka_id=notatka.id,
            kwota=kwota_calkowita,
            opis=opis_kosztorysu,
            numer_kosztorysu=numer_kosztorysu
        )
        
        # Dodaj towary do kosztorysu
        for towar in wybrane_towary:
            crud.add_towar_do_kosztorysu(
                db=db,
                kosztorys_id=kosztorys.id,
                towar_id=int(towar['id']),
                ilosc=float(towar['ilosc']),
                cena=float(towar['cena'])
            )
        
        # Dodaj usługi do kosztorysu
        for usluga in wybrane_uslugi:
            crud.add_usluge_do_kosztorysu(
                db=db,
                kosztorys_id=kosztorys.id,
                usluga_id=int(usluga['id']),
                ilosc=float(usluga['ilosc']),
                cena=float(usluga['cena'])
            )
    
    return RedirectResponse(url="/home", status_code=303)

@router.post("/samochod/add/{klient_id}")
def add_samochod(
    klient_id: int,
    nr_rejestracyjny: str = Form(...),
    marka: str = Form(...),
    model: str = Form(...),
    rok_produkcji: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """DODAWANIE SAMOCHODU"""
    crud.create_samochod(db, klient_id, nr_rejestracyjny, marka, model, rok_produkcji)
    return RedirectResponse(url=f"/klient/{klient_id}", status_code=303)

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

@router.post("/notatka/samochod/{samochod_id}")
def add_notatka_samochod(
    samochod_id: int,
    tresc: str = Form(...),
    db: Session = Depends(get_db)
):
    """NOTATKA DO SAMOCHODU"""
    crud.create_notatka_samochod(db, samochod_id, tresc)
    
    # Przekieruj do klienta właściciela samochodu
    samochod = db.query(Samochod).filter(Samochod.id == samochod_id).first()
    if samochod and samochod.klient_id:
        return RedirectResponse(url=f"/klient/{samochod.klient_id}", status_code=303)
    else:
        return RedirectResponse(url="/home", status_code=303)

@router.post("/kosztorys/add/{notatka_id}")
def add_kosztorys(
    notatka_id: int,
    numer_kosztorysu: str = Form(...),
    kwota: float = Form(...),
    opis: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """DODAWANIE KOSZTORYSU"""
    crud.create_kosztorys(db, notatka_id, kwota, opis, numer_kosztorysu)
    return RedirectResponse(url="/home", status_code=303)

@router.get("/search/pojazd")
def search_by_registration(nr_rejestracyjny: str, db: Session = Depends(get_db)):
    """WYSZUKIWANIE PO NUMERZE REJESTRACYJNYM"""
    samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
    if samochod:
        return RedirectResponse(url=f"/samochod/{nr_rejestracyjny}", status_code=303)
    else:
        return RedirectResponse(url="/search?error=not_found", status_code=303)