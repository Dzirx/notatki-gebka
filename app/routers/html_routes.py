# === ROUTERS/HTML_ROUTES.PY - STRONY HTML ===
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload
import crud
from database import get_db
from models import Notatka, Samochod

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/home", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    """STRONA GŁÓWNA - Lista wszystkich notatek"""
    
    # Pobieranie notatek z eager loading 
    notatki = db.query(Notatka).options(
        joinedload(Notatka.samochod).joinedload(Samochod.klient)
    ).order_by(Notatka.created_at.desc()).all()
    
    # Lista klientów dla interfejsu
    klienci = crud.get_klienci(db)
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "notatki": notatki,
        "klienci": klienci
    })

@router.get("/klient/{klient_id}", response_class=HTMLResponse)
def klient_detail(klient_id: int, request: Request, db: Session = Depends(get_db)):
    """STRONA KLIENTA - Szczegóły klienta, samochody, notatki"""
    
    klient = crud.get_klient(db, klient_id)
    if not klient:
        return HTMLResponse("<h1>Klient nie znaleziony</h1>", status_code=404)
    
    samochody = crud.get_samochody_klienta(db, klient_id)
    
    # Zbieranie wszystkich notatek ze wszystkich samochodów klienta
    wszystkie_notatki = []
    for samochod in samochody:
        notatki_samochodu = crud.get_notatki_samochodu(db, samochod.id)
        wszystkie_notatki.extend(notatki_samochodu)
    
    wszystkie_notatki.sort(key=lambda x: x.created_at, reverse=True)
    
    return templates.TemplateResponse("klient.html", {
        "request": request,
        "klient": klient,
        "samochody": samochody,
        "notatki": wszystkie_notatki
    })

@router.get("/samochod/{nr_rejestracyjny}", response_class=HTMLResponse)  
def samochod_detail(nr_rejestracyjny: str, request: Request, db: Session = Depends(get_db)):
    """STRONA SAMOCHODU - Notatki z kosztorysami dla pojazdu"""
    
    samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
    if not samochod:
        return HTMLResponse(f"""
        <html><body>
            <h1>Błąd</h1>
            <p>Nie znaleziono pojazdu {nr_rejestracyjny}</p>
            <a href="/home">← Powrót</a>
        </body></html>
        """, status_code=404)
    
    # Dane pojazdu
    pojazd_data = {
        "nr_rejestracyjny": samochod.nr_rejestracyjny,
        "marka": samochod.marka,
        "model": samochod.model,
        "rok_produkcji": samochod.rok_produkcji,
        "wlasciciel": samochod.klient.nazwapelna if samochod.klient else "Nieznany"
    }
    
    # Notatki pojazdu z kosztorysami
    notatki = crud.get_notatki_samochodu(db, samochod.id)
    notatki_z_kosztorysami = []
    
    for n in notatki:
        kosztorysy = crud.get_kosztorysy_z_towarami_dla_notatki(db, n.id)
        notatki_z_kosztorysami.append({
            "notatka": n,
            "kosztorysy": kosztorysy
        })
    
    return templates.TemplateResponse("samochod.html", {
        "request": request,
        "pojazd": pojazd_data,
        "notatki_z_kosztorysami": notatki_z_kosztorysami
    })

@router.get("/search")
def search_page(request: Request, db: Session = Depends(get_db)):
    """STRONA WYSZUKIWANIA"""
    return templates.TemplateResponse("search.html", {
        "request": request
    })