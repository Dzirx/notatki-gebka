# === MODULES/MAGAZYN/ROUTES/HTML.PY - ROUTER MAGAZYNU ===
from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database import get_samochody_db
from datetime import datetime
from typing import Optional, Iterable, Any, Dict, List
import sys
import os
from collections import defaultdict

# Dodaj ścieżkę do głównego katalogu żeby móc importować modele
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Import CRUD magazynu
from modules.magazyn import crud

router = APIRouter()

# Templates dla modułu magazyn
templates = Jinja2Templates(directory="modules/magazyn/templates")


def today_str() -> str:
    return datetime.now().strftime('%Y-%m-%d')


@router.get("/", response_class=HTMLResponse)
async def magazyn_home(request: Request, db: Session = Depends(get_samochody_db)):
    """
    Strona główna modułu magazyn.
    Domyślnie aktywna zakładka: ZLECENIA (na dzisiaj).
    """
    dzisiejsza_data = today_str()
    error_message: Optional[str] = None

    # Pobierz dzisiejsze zlecenia - użyj funkcji grupującej
    try:
        pojazdy_zlecenia_grouped = crud.get_pojazdy_zlecenia_grouped(db, dzisiejsza_data)
    except Exception as e:
        pojazdy_zlecenia_grouped = []
        error_message = f"Błąd podczas pobierania dzisiejszych zleceń: {e}"

    return templates.TemplateResponse("index.html", {
        "request": request,
        "dzisiejsza_data": dzisiejsza_data,
        "active_tab": "zlecenia",
        "selected_date": None,
        "pojazdy_grouped": [],  # dla terminarza
        "pojazdy_zlecenia_grouped": pojazdy_zlecenia_grouped,  # dla zleceń
        "tylko_towar": False,  # dodane dla checkboxa
        "error_message": error_message,
    })


@router.post("/", response_class=HTMLResponse)
async def magazyn_search(
    request: Request,
    selected_date: str = Form(...),
    tab: Optional[str] = Form("terminarz"),
    tylko_towar: Optional[str] = Form(None),  # nowy parametr checkbox
    db: Session = Depends(get_samochody_db),
):
    """
    Obsługa formularzy:
    - tab == 'terminarz'  -> render harmonogramu na wybraną datę
    - tab == 'zlecenia'   -> zlecenia na wybraną datę
    - tylko_towar == '1'  -> filtrowanie tylko towarów (tylko dla terminarza)
    """
    dzisiejsza_data = today_str()
    error_message: Optional[str] = None
    
    # Konwersja checkboxa na boolean
    tylko_towar_bool = tylko_towar == "1"

    if tab == "terminarz":
        try:
            pojazdy_grouped = crud.get_pojazdy_grouped_for_terminarz(db, selected_date)
        except Exception as e:
            pojazdy_grouped = []
            error_message = f"Błąd podczas pobierania terminarza: {e}"

        return templates.TemplateResponse("index.html", {
            "request": request,
            "dzisiejsza_data": dzisiejsza_data,
            "active_tab": "terminarz",
            "selected_date": selected_date,
            "pojazdy_grouped": pojazdy_grouped,
            "pojazdy_zlecenia_grouped": [],  # puste dla terminarza
            "tylko_towar": tylko_towar_bool,  # przekaż stan checkboxa
            "error_message": error_message,
        })

    if tab == "zlecenia":
        try:
            pojazdy_zlecenia_grouped = crud.get_pojazdy_zlecenia_grouped(db, selected_date)
        except Exception as e:
            pojazdy_zlecenia_grouped = []
            error_message = f"Błąd podczas pobierania zleceń: {e}"

        return templates.TemplateResponse("index.html", {
            "request": request,
            "dzisiejsza_data": dzisiejsza_data,
            "active_tab": "zlecenia",
            "selected_date": selected_date,
            "pojazdy_grouped": [],  # puste dla zleceń
            "pojazdy_zlecenia_grouped": pojazdy_zlecenia_grouped,
            "tylko_towar": False,  # checkbox tylko w terminarzu
            "error_message": error_message,
        })

    # Fallback -> terminarz (gdyby przyszła inna wartość tab)
    try:
        pojazdy_grouped = crud.get_pojazdy_grouped_for_terminarz(db, selected_date)
    except Exception as e:
        pojazdy_grouped = []
        error_message = f"Błąd podczas pobierania terminarza: {e}"

    return templates.TemplateResponse("index.html", {
        "request": request,
        "dzisiejsza_data": dzisiejsza_data,
        "active_tab": "terminarz",
        "selected_date": selected_date,
        "pojazdy_grouped": pojazdy_grouped,
        "pojazdy_zlecenia_grouped": [],
        "tylko_towar": tylko_towar_bool,
        "error_message": error_message,
    })