# === MODULES/MAGAZYN/ROUTES/API.PY - API MAGAZYNU ===
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_samochody_db
import sys
import os

# Dodaj ścieżkę do głównego katalogu
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from modules.magazyn import crud

router = APIRouter()

@router.get("/opony/{date}")
def get_opony_na_dzien_api(date: str, db: Session = Depends(get_samochody_db)):
    """API endpoint do pobierania opon na wybrany dzień"""
    
    try:
        opony_data = crud.get_opony_na_dzien(db, date)
        return {
            "success": True,
            "data": opony_data,
            "count": len(opony_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd podczas pobierania danych: {str(e)}")

@router.get("/daty")
def get_dostepne_daty_api(db: Session = Depends(get_samochody_db)):
    """API endpoint do pobierania dostępnych dat"""
    
    try:
        daty = crud.get_dostepne_daty_opon(db)
        return {
            "success": True,
            "dates": daty
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd podczas pobierania dat: {str(e)}")