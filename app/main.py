# === IMPORTY ===
from fastapi import FastAPI, Depends, Form, Request
from fastapi.templating import Jinja2Templates  # Renderowanie HTML
from fastapi.responses import HTMLResponse, RedirectResponse  # Typy odpowiedzi
from fastapi.staticfiles import StaticFiles  # Pliki statyczne (CSS, JS)
from sqlalchemy.orm import Session
import crud
from database import get_db
from models import Notatka, Samochod, Kosztorys, Klient
from sqlalchemy.orm import joinedload

# === KONFIGURACJA FASTAPI ===
app = FastAPI()
templates = Jinja2Templates(directory="templates")  # Folder z szablonami HTML

# === STRONY HTML ===

@app.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    """STRONA GŁÓWNA - Lista wszystkich notatek z informacjami o samochodach i klientach"""
    
    # Pobieranie notatek z eager loading (optymalizacja - unika N+1 queries)
    notatki = db.query(Notatka).options(
        joinedload(Notatka.samochod).joinedload(Samochod.klient)
    ).order_by(Notatka.created_at.desc()).all()
    
    # Lista klientów dla interfejsu
    klienci = crud.get_klienci(db)
    
    # Renderowanie szablonu HTML z przekazaniem danych
    return templates.TemplateResponse("index.html", {
        "request": request,  # Wymagane przez Jinja2
        "notatki": notatki,
        "klienci": klienci
    })

@app.get("/klient/{klient_id}", response_class=HTMLResponse)
def klient_detail(klient_id: int, request: Request, db: Session = Depends(get_db)):
    """STRONA KLIENTA - Szczegóły klienta, jego samochody, notatki i kosztorysy"""
    
    klient = crud.get_klient(db, klient_id)
    samochody = crud.get_samochody_klienta(db, klient_id)
    kosztorysy = crud.get_kosztorysy_z_towarami_dla_klienta(db, klient_id)
    
    # Zbieranie wszystkich notatek ze wszystkich samochodów klienta
    wszystkie_notatki = []
    for samochod in samochody:
        notatki_samochodu = crud.get_notatki_samochodu(db, samochod.id)
        wszystkie_notatki.extend(notatki_samochodu)
    
    # Sortowanie notatek od najnowszych
    wszystkie_notatki.sort(key=lambda x: x.created_at, reverse=True)
    
    return templates.TemplateResponse("klient.html", {
        "request": request,
        "klient": klient,
        "samochody": samochody,
        "notatki": wszystkie_notatki,
        "kosztorysy": kosztorysy
    })

@app.get("/kosztorysy/{nr_rejestracyjny}", response_class=HTMLResponse)
def kosztorysy_page(nr_rejestracyjny: str, request: Request, db: Session = Depends(get_db)):
    """STRONA KOSZTORYSÓW - Kosztorysy właściciela pojazdu o danym numerze rejestracyjnym"""
    
    # Sprawdzenie czy pojazd istnieje w głównej bazie
    samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
    if not samochod:
        # Zwracanie prostego HTML z błędem jeśli pojazd nie znaleziony
        return HTMLResponse(f"""
        <html><body>
            <h1>Błąd</h1>
            <p>Nie znaleziono pojazdu o numerze rejestracyjnym {nr_rejestracyjny}</p>
            <a href="/">← Powrót</a>
        </body></html>
        """, status_code=404)
    
    # Przygotowanie danych pojazdu dla szablonu
    pojazd_data = {
        "nr_rejestracyjny": samochod.nr_rejestracyjny,
        "marka": samochod.marka,
        "model": samochod.model,
        "rok_produkcji": samochod.rok_produkcji,
        "wlasciciel": f"{samochod.klient.imie} {samochod.klient.nazwisko}" if samochod.klient else "Nieznany"
    }
    
    # Pobieranie kosztorysów właściciela pojazdu
    kosztorysy_z_towarami = crud.get_kosztorysy_z_towarami_dla_samochodu(db, nr_rejestracyjny)
    
    return templates.TemplateResponse("kosztorys.html", {
        "request": request,
        "pojazd": pojazd_data,
        "kosztorysy": kosztorysy_z_towarami
    })

# === AKCJE FORMULARZY (POST ENDPOINTS) ===

@app.post("/notatka/add")
def add_notatka(
    typ_notatki: str = Form(...),  # Form(...) = wymagane pole formularza
    tresc: str = Form(...),
    nr_rejestracyjny: str = Form(None),  # Opcjonalne dla notatek szybkich
    db: Session = Depends(get_db)
):
    """DODAWANIE NOTATKI - Obsługuje zarówno notatki szybkie jak i do pojazdów"""
    
    if typ_notatki == "szybka":
        # Notatka ogólna, nie przypisana do pojazdu
        crud.create_notatka_szybka(db, tresc)
        
    elif typ_notatki == "pojazd" and nr_rejestracyjny:
        # Próba znalezienia pojazdu w głównej bazie
        samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
        
        if samochod:
            # Pojazd znaleziony - tworzy notatkę przypisaną do pojazdu
            crud.create_notatka_samochod(db, samochod.id, tresc)
        else:
            # Pojazd nie znaleziony - sprawdza zewnętrzną bazę
            samochod_zewn = crud.get_samochod_zewnetrzny(nr_rejestracyjny)
            if samochod_zewn:
                # Pojazd istnieje w zewnętrznej bazie - tworzy notatkę szybką z prefiksem
                crud.create_notatka_szybka(db, f"Pojazd {nr_rejestracyjny}: {tresc}")
            else:
                # Pojazd nie istnieje nigdzie - tworzy notatkę z oznaczeniem nieznany
                crud.create_notatka_szybka(db, f"Nieznany pojazd {nr_rejestracyjny}: {tresc}")
    
    # Przekierowanie z powrotem na stronę główną (pattern Post-Redirect-Get)
    return RedirectResponse(url="/", status_code=303)

@app.post("/samochod/add/{klient_id}")
def add_samochod(
    klient_id: int,  # Z URL path
    nr_rejestracyjny: str = Form(...),
    marka: str = Form(...),
    model: str = Form(...),
    rok_produkcji: int = Form(None),  # Opcjonalne
    db: Session = Depends(get_db)
):
    """DODAWANIE SAMOCHODU - Dodaje nowy pojazd do klienta"""
    crud.create_samochod(db, klient_id, nr_rejestracyjny, marka, model, rok_produkcji)
    # Przekierowanie z powrotem do strony klienta
    return RedirectResponse(url=f"/klient/{klient_id}", status_code=303)

@app.post("/notatka/szybka/{klient_id}")
def add_notatka_szybka(
    klient_id: int,
    tresc: str = Form(...),
    db: Session = Depends(get_db)
):
    """SZYBKA NOTATKA - Dodaje notatkę ogólną ze strony klienta"""
    crud.create_notatka_szybka(db, tresc)
    return RedirectResponse(url=f"/klient/{klient_id}", status_code=303)

@app.post("/notatka/samochod/{samochod_id}")
def add_notatka_samochod(
    samochod_id: int,
    tresc: str = Form(...),
    db: Session = Depends(get_db)
):
    """NOTATKA DO SAMOCHODU - Dodaje notatkę przypisaną do konkretnego pojazdu"""
    crud.create_notatka_samochod(db, samochod_id, tresc)
    
    # Znajdź samochód żeby przekierować do właściwego klienta
    samochod = db.query(Samochod).filter(Samochod.id == samochod_id).first()
    if samochod and samochod.klient_id:
        return RedirectResponse(url=f"/klient/{samochod.klient_id}", status_code=303)
    else:
        # Fallback na stronę główną jeśli nie ma przypisanego klienta
        return RedirectResponse(url="/", status_code=303)

@app.post("/kosztorys/add/{klient_id}")
def add_kosztorys(
    klient_id: int,
    numer_kosztorysu: str = Form(...),
    kwota: float = Form(...),
    opis: str = Form(None),  # Opcjonalne
    db: Session = Depends(get_db)
):
    """DODAWANIE KOSZTORYSU - Tworzy nowy kosztorys dla klienta"""
    crud.create_kosztorys(db, klient_id, kwota, opis, numer_kosztorysu)
    return RedirectResponse(url=f"/klient/{klient_id}", status_code=303)

# === WYSZUKIWANIE ===

@app.get("/notatka/nr_rej")
def search_by_registration(nr_rejestracyjny: str, db: Session = Depends(get_db)):
    """WYSZUKIWANIE - Przekierowuje do klienta na podstawie numeru rejestracyjnego"""
    samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
    if samochod:
        return RedirectResponse(url=f"/klient/{samochod.klient_id}", status_code=303)
    else:
        # Zwracanie JSON przy braku wyników
        return {"message": "Nie znaleziono samochodu"}

# === API ENDPOINTS (JSON) ===

@app.delete("/notatka/delete/{notatka_id}")
def delete_notatka(notatka_id: int, db: Session = Depends(get_db)):
    """API - Usuwa notatkę (używane przez JavaScript)"""
    crud.delete_notatka(db, notatka_id)
    return {"success": True}

@app.get("/api/notatka/{notatka_id}")
def get_notatka_api(notatka_id: int, db: Session = Depends(get_db)):
    """API - Pobiera szczegóły notatki (dla edycji w JavaScript)"""
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if not notatka:
        return {"error": "Notatka nie znaleziona"}
    return {"id": notatka.id, "tresc": notatka.tresc, "typ_notatki": notatka.typ_notatki}

@app.put("/notatka/edit/{notatka_id}")
async def edit_notatka(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    """API - Edytuje notatkę (przyjmuje JSON z JavaScript)"""
    data = await request.json()  # Parsowanie JSON body
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if not notatka:
        return {"error": "Notatka nie znaleziona"}
    
    notatka.tresc = data["tresc"]
    db.commit()
    return {"success": True}

@app.get("/api/pojazd-info/{nr_rejestracyjny}")
def get_pojazd_info_endpoint(nr_rejestracyjny: str, db: Session = Depends(get_db)):
    """API - Pobiera kompletne informacje o pojeździe (dla JavaScript preview)"""
    pojazd_info = crud.get_pojazd_info(db, nr_rejestracyjny)
    if not pojazd_info:
        return {"error": "Pojazd nie znaleziony"}
    return pojazd_info

@app.get("/api/notatki")
def get_notatki_api(db: Session = Depends(get_db)):
    """API - Lista notatek dla dropdown (skrócone)"""
    notatki = crud.get_wszystkie_notatki(db)
    return [{"id": n.id, "tresc": n.tresc[:50] + "..." if len(n.tresc) > 50 else n.tresc} for n in notatki]

@app.get("/api/samochody/{klient_id}")
def get_samochody_klienta_api(klient_id: int, db: Session = Depends(get_db)):
    """API - Samochody klienta (dla JavaScript)"""
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

@app.get("/api/notatki/samochod/{samochod_id}")
def get_notatki_samochodu_api(samochod_id: int, db: Session = Depends(get_db)):
    """API - Notatki konkretnego samochodu"""
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

@app.get("/api/kosztorysy-z-towarami/{klient_id}")
def get_kosztorysy_klienta_z_towarami_api(klient_id: int, db: Session = Depends(get_db)):
    """API - Kosztorysy klienta z towarami (JSON)"""
    kosztorysy = crud.get_kosztorysy_z_towarami_dla_klienta(db, klient_id)
    return kosztorysy

# === NAWIGACJA/PRZEKIEROWANIA ===

@app.get("/notatka/{notatka_id}/kosztorysy")
def notatka_to_kosztorysy(notatka_id: int, db: Session = Depends(get_db)):
    """NAWIGACJA - Przechodzi z notatki do kosztorysów pojazdu"""
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()

    if not notatka or not notatka.samochod:
        # Błąd jeśli notatka nie ma przypisanego samochodu
        return RedirectResponse(url="/?error=no_vehicle", status_code=303)

    # Przekierowanie do kosztorysów pojazdu
    return RedirectResponse(url=f"/kosztorysy/{notatka.samochod.nr_rejestracyjny}", status_code=303)

# === URUCHOMIENIE SERWERA ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)  # Serwer dostępny z każdego IP na porcie 8000