# === MODULES/MAGAZYN/ROUTES/HTML.PY - ROUTER MAGAZYNU ===
from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database import get_samochody_db
from datetime import datetime, date
import sys
import os

# Dodaj ścieżkę do głównego katalogu żeby móc importować modele
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Import CRUD magazynu
from modules.magazyn import crud

router = APIRouter()

# Templates dla modułu magazyn
templates = Jinja2Templates(directory="modules/magazyn/templates")

@router.get("/", response_class=HTMLResponse)
async def magazyn_home(request: Request, db: Session = Depends(get_samochody_db)):
    """Strona główna modułu magazyn - kalendarz opon"""
    
    # Pobierz dostępne daty
    dostepne_daty = crud.get_dostepne_daty_opon(db)
    dzisiejsza_data = datetime.now().strftime('%Y-%m-%d')
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "dostepne_daty": dostepne_daty,
        "dzisiejsza_data": dzisiejsza_data,
        "opony_data": [],
        "selected_date": None
    })

@router.post("/", response_class=HTMLResponse) 
async def magazyn_search(request: Request, selected_date: str = Form(...), db: Session = Depends(get_samochody_db)):
    """Wyszukiwanie opon na wybrany dzień"""
    
    # Pobierz dane opon na wybrany dzień
    opony_data = crud.get_opony_na_dzien(db, selected_date)
    dostepne_daty = crud.get_dostepne_daty_opon(db)
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "dostepne_daty": dostepne_daty,
        "dzisiejsza_data": datetime.now().strftime('%Y-%m-%d'),
        "opony_data": opony_data,
        "selected_date": selected_date
    })