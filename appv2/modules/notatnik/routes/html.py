# === MODULES/NOTATNIK/ROUTES/HTML.PY - ROUTER NOTATNIKA ===
from fastapi import APIRouter, Request, Depends
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