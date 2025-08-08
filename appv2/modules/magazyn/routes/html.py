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

    # Pobierz dzisiejsze zlecenia (jeśli get_zlecenia_na_dzien nie istnieje, można użyć get_dzisiejsze_rozpoczete_zlecenia)
    try:
        if hasattr(crud, "get_zlecenia_na_dzien"):
            zlecenia_data = crud.get_zlecenia_na_dzien(db, dzisiejsza_data)
        else:
            zlecenia_data = crud.get_dzisiejsze_rozpoczete_zlecenia(db)
    except Exception as e:
        zlecenia_data = []
        error_message = f"Błąd podczas pobierania dzisiejszych zleceń: {e}"

    podsumowania = _build_podsumowania(zlecenia_data)

    return templates.TemplateResponse("index.html", {
        "request": request,
        "dzisiejsza_data": dzisiejsza_data,
        "active_tab": "zlecenia",
        "selected_date": None,
        "pojazdy_grouped": [],
        "zlecenia_data": zlecenia_data,
        "podsumowania_per_pojazd": podsumowania,
        "error_message": error_message,
    })


@router.post("/", response_class=HTMLResponse)
async def magazyn_search(
    request: Request,
    selected_date: str = Form(...),
    tab: Optional[str] = Form("terminarz"),
    db: Session = Depends(get_samochody_db),
):
    """
    Obsługa formularzy:
    - tab == 'terminarz'  -> render harmonogramu na wybraną datę
    - tab == 'zlecenia'   -> zlecenia na wybraną datę (jeśli brak funkcji, fallback do dzisiaj)
    """
    dzisiejsza_data = today_str()
    error_message: Optional[str] = None

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
            "zlecenia_data": [],
            "podsumowania_per_pojazd": [],
            "error_message": error_message,
        })

    if tab == "zlecenia":
        try:
            if hasattr(crud, "get_zlecenia_na_dzien"):
                zlecenia_data = crud.get_zlecenia_na_dzien(db, selected_date)
            else:
                # Fallback: jeśli nie masz jeszcze funkcji na dowolną datę, pokaż dzisiejsze
                zlecenia_data = crud.get_dzisiejsze_rozpoczete_zlecenia(db)
        except Exception as e:
            zlecenia_data = []
            error_message = f"Błąd podczas pobierania zleceń: {e}"

        podsumowania = _build_podsumowania(zlecenia_data)

        return templates.TemplateResponse("index.html", {
            "request": request,
            "dzisiejsza_data": dzisiejsza_data,
            "active_tab": "zlecenia",
            "selected_date": selected_date,
            "pojazdy_grouped": [],
            "zlecenia_data": zlecenia_data,
            "podsumowania_per_pojazd": podsumowania,
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
        "zlecenia_data": [],
        "podsumowania_per_pojazd": [],
        "error_message": error_message,
    })


# === Helpers ===

def _get_attr(obj: Any, name: str) -> Any:
    """Bezpieczne pobieranie atrybutu (ORM) lub klucza (dict)."""
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def _build_podsumowania(zlecenia: Iterable[Any]) -> List[Dict[str, Optional[str]]]:
    """
    Agreguje TOWARY + NOTATKI per pojazd (rej).
    Korzysta z pól: rej, towary_szczegoly, notatka.
    """
    by = defaultdict(lambda: {"towary": set(), "notatki": set()})
    for z in (zlecenia or []):
        rej = _get_attr(z, "rej") or "—"
        tow = _get_attr(z, "towary_szczegoly")
        notka = _get_attr(z, "notatka")
        if tow:
            by[rej]["towary"].add(str(tow))
        if notka:
            by[rej]["notatki"].add(str(notka))

    out: List[Dict[str, Optional[str]]] = []
    for rej, vals in by.items():
        out.append({
            "rej": rej,
            "towary": " | ".join(sorted(vals["towary"])) if vals["towary"] else None,
            "notatki": " | ".join(sorted(vals["notatki"])) if vals["notatki"] else None,
        })
    out.sort(key=lambda x: x["rej"])
    return out
