from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload
import crud
from database import get_db
from models import Notatka, Samochod, Kosztorys

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    """STRONA GŁÓWNA - Lista wszystkich notatek"""
    
    notatki = db.query(Notatka).options(
        joinedload(Notatka.samochod).joinedload(Samochod.klient),
        joinedload(Notatka.kosztorysy)
    ).order_by(Notatka.created_at.desc()).all()
    
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "notatki": notatki
    })

@router.get("/kosztorys/detail/{notatka_id}", response_class=HTMLResponse)
def kosztorys_detail(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """STRONA KOSZTORYSU - Szczegóły kosztorysów notatki"""
    
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if not notatka:
        return HTMLResponse("Notatka nie znaleziona", 404)
    
    kosztorysy = crud.get_kosztorysy_z_towarami_dla_notatki(db, notatka_id)
    
    return templates.TemplateResponse("kosztorys_detail.html", {
        "request": request,
        "notatka": notatka,
        "kosztorysy": kosztorysy
    })

@router.get("/search")
def search_page(request: Request, db: Session = Depends(get_db)):
    """STRONA WYSZUKIWANIA"""
    return templates.TemplateResponse("search.html", {
        "request": request
    })