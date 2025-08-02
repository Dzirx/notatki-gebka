# === MODULES/NOTATNIK/ROUTES/API.PY - API NOTATNIKA ===
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from database import get_db
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