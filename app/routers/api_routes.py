# === ROUTERS/API_ROUTES.PY - ENDPOINTY API (JSON) ===
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import crud
from database import get_db
from models import Notatka

router = APIRouter()

# === NOTATKI API ===

@router.get("/notatki")
def get_notatki_api(db: Session = Depends(get_db)):
    """Lista notatek dla dropdown"""
    notatki = crud.get_wszystkie_notatki(db)
    return [
        {
            "id": n.id, 
            "tresc": n.tresc[:50] + "..." if len(n.tresc) > 50 else n.tresc
        } 
        for n in notatki
    ]

@router.get("/notatka/{notatka_id}")
def get_notatka_api(notatka_id: int, db: Session = Depends(get_db)):
    """Szczegóły notatki (dla edycji)"""
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
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
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    
    if not notatka:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    
    notatka.tresc = data["tresc"]
    db.commit()
    return {"success": True}

@router.delete("/notatka/{notatka_id}")
def delete_notatka(notatka_id: int, db: Session = Depends(get_db)):
    """Usuwanie notatki (AJAX)"""
    success = crud.delete_notatka(db, notatka_id)
    if success:
        return {"success": True}
    else:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")

# === POJAZDY API ===

@router.get("/pojazd/{nr_rejestracyjny}")
def get_pojazd_info_api(nr_rejestracyjny: str, db: Session = Depends(get_db)):
    """Kompletne informacje o pojeździe"""
    pojazd_info = crud.get_pojazd_info(db, nr_rejestracyjny)
    if not pojazd_info:
        raise HTTPException(status_code=404, detail="Pojazd nie znaleziony")
    return pojazd_info

@router.get("/samochody/{klient_id}")
def get_samochody_klienta_api(klient_id: int, db: Session = Depends(get_db)):
    """Samochody klienta"""
    samochody = crud.get_samochody_klienta(db, klient_id)
    return [
        {
            "id": s.id,
            "nr_rejestracyjny": s.nr_rejestracyjny,
            "marka": s.marka,
            "model": s.model,
            "rok_produkcji": s.rok_produkcji
        }
        for s in samochody
    ]

@router.get("/notatki/samochod/{samochod_id}")
def get_notatki_samochodu_api(samochod_id: int, db: Session = Depends(get_db)):
    """Notatki konkretnego samochodu"""
    notatki = crud.get_notatki_samochodu(db, samochod_id)
    return [
        {
            "id": n.id,
            "tresc": n.tresc,
            "typ_notatki": n.typ_notatki,
            "created_at": n.created_at.strftime('%d.%m.%Y %H:%M')
        }
        for n in notatki
    ]

# === KOSZTORYSY API ===

@router.get("/kosztorysy/notatka/{notatka_id}")
def get_kosztorysy_notatki_api(notatka_id: int, db: Session = Depends(get_db)):
    """Kosztorysy notatki z towarami i usługami"""
    kosztorysy = crud.get_kosztorysy_z_towarami_dla_notatki(db, notatka_id)
    return kosztorysy

# === TOWARY/USŁUGI API ===

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

# === WYSZUKIWANIE API ===

@router.get("/search")
def search_api(
    q: str = None,
    type: str = "all",
    db: Session = Depends(get_db)
):
    """Uniwersalne wyszukiwanie"""
    if not q:
        return {"results": []}
    
    results = []
    
    if type in ["all", "klienci"]:
        klienci = crud.search_klienci(db, q)
        results.extend([
            {"type": "klient", "id": k.id, "nazwa": k.nazwapelna, "url": f"/klient/{k.id}"}
            for k in klienci
        ])
    
    if type in ["all", "samochody"]:
        samochody = crud.search_samochody(db, q)
        results.extend([
            {"type": "samochod", "id": s.id, "nazwa": f"{s.marka} {s.model} {s.nr_rejestracyjny}", "url": f"/samochod/{s.nr_rejestracyjny}"}
            for s in samochody
        ])
    
    if type in ["all", "notatki"]:
        notatki = crud.search_notatki(db, q)
        results.extend([
            {"type": "notatka", "id": n.id, "nazwa": n.tresc[:50] + "...", "url": f"/notatka/{n.id}"}
            for n in notatki
        ])
    
    return {"results": results}