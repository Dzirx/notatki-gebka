# === MODULES/MAGAZYN/ROUTES/HTML.PY - ROUTER MAGAZYNU ===
from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database import get_samochody_db
from datetime import datetime, date
from typing import Optional
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
    """Strona główna modułu magazyn z zakładkami"""
    
    dzisiejsza_data = datetime.now().strftime('%Y-%m-%d')
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "dzisiejsza_data": dzisiejsza_data,
        "pojazdy_grouped": [],
        "selected_date": None,
        "active_tab": "zlecenia"  # Domyślna zakładka
    })

@router.post("/", response_class=HTMLResponse) 
async def magazyn_search(
    request: Request, 
    selected_date: str = Form(...),
    tab: Optional[str] = Form("terminarz"),
    db: Session = Depends(get_samochody_db)
):
    """Wyszukiwanie w wybranej zakładce"""
    
    dzisiejsza_data = datetime.now().strftime('%Y-%m-%d')
    
    if tab == "terminarz":
        # Pobierz pogrupowane dane dla terminarz
        pojazdy_grouped = crud.get_pojazdy_grouped_for_terminarz(db, selected_date)
        
        return templates.TemplateResponse("index.html", {
            "request": request,
            "dzisiejsza_data": dzisiejsza_data,
            "pojazdy_grouped": pojazdy_grouped,
            "selected_date": selected_date,
            "active_tab": "terminarz"
        })
    
    elif tab == "zlecenia":
        # TODO: Implementacja zleceń
        return templates.TemplateResponse("index.html", {
            "request": request,
            "dzisiejsza_data": dzisiejsza_data,
            "pojazdy_grouped": [],
            "selected_date": selected_date,
            "active_tab": "zlecenia"
        })
    
    else:
        # Fallback na terminarz
        pojazdy_grouped = crud.get_pojazdy_grouped_for_terminarz(db, selected_date)
        
        return templates.TemplateResponse("index.html", {
            "request": request,
            "dzisiejsza_data": dzisiejsza_data,
            "pojazdy_grouped": pojazdy_grouped,
            "selected_date": selected_date,
            "active_tab": "terminarz"
        })