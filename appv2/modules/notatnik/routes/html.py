# === MODULES/NOTATNIK/ROUTES/HTML.PY - ROUTER NOTATNIKA ===
from fastapi import APIRouter, Request, Depends, HTTPException  # Dodaj HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database import get_db
import sys
import os

# Dodaj ścieżkę do głównego katalogu żeby móc importować modele
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Import CRUD i modeli
from modules.notatnik import crud

router = APIRouter()

# Templates dla modułu notatnik
templates = Jinja2Templates(directory="modules/notatnik/templates")

@router.get("/", response_class=HTMLResponse)
async def notatnik_home(request: Request, db: Session = Depends(get_db)):
    """Strona główna modułu notatnik - prawdziwe dane z bazy"""
    
    # Pobierz prawdziwe notatki z bazy danych
    notatki = crud.get_wszystkie_notatki(db)
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "notatki": notatki
    })

@router.get("/lista", response_class=HTMLResponse)
async def notatki_lista(request: Request, db: Session = Depends(get_db)):
    """Lista wszystkich notatek"""
    notatki = crud.get_wszystkie_notatki(db)
    
    return templates.TemplateResponse("lista.html", {
        "request": request,
        "notatki": notatki
    })

@router.get("/dodaj", response_class=HTMLResponse)
async def dodaj_notatke(request: Request):
    """Formularz dodawania notatki"""
    return templates.TemplateResponse("dodaj.html", {
        "request": request
    })

@router.get("/kosztorys/{notatka_id}", response_class=HTMLResponse)
async def szczegoly_kosztorysu(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """Szczegóły kosztorysów dla notatki"""
    
    # Pobierz notatkę
    notatka = crud.get_notatka_by_id(db, notatka_id)
    if not notatka:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    
    # Pobierz kosztorysy z towarami i usługami  
    kosztorysy = crud.get_kosztorysy_z_towarami_dla_notatki(db, notatka_id)
    
    return templates.TemplateResponse("kosztorys_detail.html", {
        "request": request,
        "notatka": notatka,
        "kosztorysy": kosztorysy
    })

@router.get("/kosztorys-detail/{kosztorys_id}", response_class=HTMLResponse)
async def szczegoly_pojedynczego_kosztorysu(kosztorys_id: int, request: Request, db: Session = Depends(get_db)):
    """Szczegóły konkretnego kosztorysu"""
    
    # Pobierz kosztorys
    kosztorys = crud.get_kosztorys_by_id(db, kosztorys_id)
    if not kosztorys:
        raise HTTPException(status_code=404, detail="Kosztorys nie znaleziony")
    
    # Pobierz notatkę powiązaną z kosztorysem
    notatka = crud.get_notatka_by_id(db, kosztorys.notatka_id)
    if not notatka:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    
    # Pobierz szczegóły kosztorysu z towarami i usługami
    kosztorys_details = crud.get_kosztorys_szczegoly(db, kosztorys_id)
    
    return templates.TemplateResponse("kosztorys_single.html", {
        "request": request,
        "notatka": notatka,
        "kosztorys": kosztorys_details
    })