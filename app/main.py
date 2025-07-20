from fastapi import FastAPI, Depends, Form, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import crud
from database import get_db
from models import Notatka, Przypomnienie, Samochod, Kosztorys  # POPRAWIONE: Dodane importy
from sqlalchemy import and_
from datetime import datetime, timedelta

app = FastAPI()
# POPRAWIONE: Folder templates
templates = Jinja2Templates(directory="templates")

# Serwowanie plików statycznych (jeśli są)
# app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    notatki = db.query(Notatka).order_by(Notatka.created_at.desc()).all()
    klienci = crud.get_klienci(db)
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "notatki": notatki,
        "klienci": klienci
    })

@app.post("/notatka/add")
def add_notatka(
    typ_notatki: str = Form(...),
    tresc: str = Form(...),
    nr_rejestracyjny: str = Form(None),
    db: Session = Depends(get_db)
):
    if typ_notatki == "szybka":
        crud.create_notatka_szybka(db, tresc)
    elif typ_notatki == "pojazd" and nr_rejestracyjny:
        samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
        if samochod:
            crud.create_notatka_samochod(db, samochod.id, tresc)
        else:
            # Spróbuj pobrać z zewnętrznej bazy
            samochod_zewn = crud.get_samochod_zewnetrzny(nr_rejestracyjny)
            if samochod_zewn:
                crud.create_notatka_szybka(db, f"Pojazd {nr_rejestracyjny}: {tresc}")
            else:
                crud.create_notatka_szybka(db, f"Nieznany pojazd {nr_rejestracyjny}: {tresc}")
    
    return RedirectResponse(url="/", status_code=303)

@app.get("/klient/{klient_id}", response_class=HTMLResponse)
def klient_detail(klient_id: int, request: Request, db: Session = Depends(get_db)):
    klient = crud.get_klient(db, klient_id)
    samochody = crud.get_samochody_klienta(db, klient_id)
    
    # Pobierz kosztorysy klienta
    kosztorysy = crud.get_kosztorysy_z_towarami_dla_klienta(db, klient_id)  # POPRAWIONE: Użyj funkcji z towarami
    
    # Pobierz notatki dla wszystkich samochodów klienta
    wszystkie_notatki = []
    for samochod in samochody:
        notatki_samochodu = crud.get_notatki_samochodu(db, samochod.id)
        wszystkie_notatki.extend(notatki_samochodu)
    
    # Sortuj notatki po dacie
    wszystkie_notatki.sort(key=lambda x: x.created_at, reverse=True)
    
    return templates.TemplateResponse("klient.html", {
        "request": request,
        "klient": klient,
        "samochody": samochody,
        "notatki": wszystkie_notatki,
        "kosztorysy": kosztorysy
    })

# NOWY ENDPOINT: Strona kosztorysów
@app.get("/kosztorysy/{nr_rejestracyjny}", response_class=HTMLResponse)
def kosztorysy_page(nr_rejestracyjny: str, request: Request, db: Session = Depends(get_db)):
    """Strona z kosztorysami dla konkretnego pojazdu"""
    
    samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
    if not samochod:
        # POPRAWIONE: Zwróć prostą stronę błędu zamiast template
        return HTMLResponse(f"""
        <html><body>
            <h1>Błąd</h1>
            <p>Nie znaleziono pojazdu o numerze rejestracyjnym {nr_rejestracyjny}</p>
            <a href="/">← Powrót</a>
        </body></html>
        """, status_code=404)
    
    # Przygotuj dane pojazdu
    pojazd_data = {
        "nr_rejestracyjny": samochod.nr_rejestracyjny,
        "marka": samochod.marka,
        "model": samochod.model,
        "rok_produkcji": samochod.rok_produkcji,
        "wlasciciel": f"{samochod.klient.imie} {samochod.klient.nazwisko}" if samochod.klient else "Nieznany"
    }
    
    # Pobierz kosztorysy z towarami
    kosztorysy_z_towarami = crud.get_kosztorysy_z_towarami_dla_samochodu(db, nr_rejestracyjny)
    
    return templates.TemplateResponse("kosztorys.html", {
        "request": request,
        "pojazd": pojazd_data,
        "kosztorysy": kosztorysy_z_towarami
    })

@app.post("/samochod/add/{klient_id}")
def add_samochod(
    klient_id: int,
    nr_rejestracyjny: str = Form(...),
    marka: str = Form(...),
    model: str = Form(...),
    rok_produkcji: int = Form(None),
    db: Session = Depends(get_db)
):
    crud.create_samochod(db, klient_id, nr_rejestracyjny, marka, model, rok_produkcji)
    return RedirectResponse(url=f"/klient/{klient_id}", status_code=303)

@app.post("/notatka/szybka/{klient_id}")
def add_notatka_szybka(
    klient_id: int,
    tresc: str = Form(...),
    db: Session = Depends(get_db)
):
    crud.create_notatka_szybka(db, tresc)
    return RedirectResponse(url=f"/klient/{klient_id}", status_code=303)

@app.post("/notatka/samochod/{samochod_id}")
def add_notatka_samochod(
    samochod_id: int,
    tresc: str = Form(...),
    db: Session = Depends(get_db)
):
    crud.create_notatka_samochod(db, samochod_id, tresc)
    
    # POPRAWIONE: Użyj poprawnego importu
    samochod = db.query(Samochod).filter(Samochod.id == samochod_id).first()
    if samochod and samochod.klient_id:
        return RedirectResponse(url=f"/klient/{samochod.klient_id}", status_code=303)
    else:
        return RedirectResponse(url="/", status_code=303)

@app.post("/kosztorys/add/{klient_id}")
def add_kosztorys(
    klient_id: int,
    numer_kosztorysu: str = Form(...),
    kwota: float = Form(...),
    opis: str = Form(None),
    db: Session = Depends(get_db)
):
    crud.create_kosztorys(db, klient_id, kwota, opis, numer_kosztorysu)
    return RedirectResponse(url=f"/klient/{klient_id}", status_code=303)

@app.get("/notatka/nr_rej")
def search_by_registration(nr_rejestracyjny: str, db: Session = Depends(get_db)):
    samochod = crud.get_samochod_by_rejestracja(db, nr_rejestracyjny)
    if samochod:
        return RedirectResponse(url=f"/klient/{samochod.klient_id}", status_code=303)
    else:
        return {"message": "Nie znaleziono samochodu"}

@app.delete("/notatka/delete/{notatka_id}")
def delete_notatka(notatka_id: int, db: Session = Depends(get_db)):
    crud.delete_notatka(db, notatka_id)
    return {"success": True}

@app.get("/api/notatka/{notatka_id}")
def get_notatka_api(notatka_id: int, db: Session = Depends(get_db)):
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if not notatka:
        return {"error": "Notatka nie znaleziona"}
    return {"id": notatka.id, "tresc": notatka.tresc, "typ_notatki": notatka.typ_notatki}

@app.put("/notatka/edit/{notatka_id}")
async def edit_notatka(notatka_id: int, request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()
    if not notatka:
        return {"error": "Notatka nie znaleziona"}
    
    notatka.tresc = data["tresc"]
    db.commit()
    return {"success": True}

@app.get("/api/pojazd-info/{nr_rejestracyjny}")
def get_pojazd_info_endpoint(nr_rejestracyjny: str, db: Session = Depends(get_db)):
    pojazd_info = crud.get_pojazd_info(db, nr_rejestracyjny)
    if not pojazd_info:
        return {"error": "Pojazd nie znaleziony"}
    return pojazd_info

# === API ENDPOINTS ===
@app.get("/api/przypomnienia-dzisiaj")
def get_przypomnienia_dzisiaj_api(db: Session = Depends(get_db)):
    przypomnienia = crud.get_przypomnienia_dzisiaj(db)
    result = []
    
    for p in przypomnienia:
        klient_info = None
        if p.notatka.samochod and p.notatka.samochod.klient:
            klient = p.notatka.samochod.klient
            klient_info = f"{klient.imie} {klient.nazwisko}"
        
        result.append({
            "id": p.id,
            "godzina": p.data_przypomnienia.strftime('%H:%M'),
            "notatka_tresc": p.notatka.tresc[:100] + "..." if len(p.notatka.tresc) > 100 else p.notatka.tresc,
            "klient": klient_info
        })
    
    return result

@app.get("/api/przypomnienia-aktywne")
def get_przypomnienia_aktywne(db: Session = Depends(get_db)):
    now = datetime.now()
    start_time = now - timedelta(minutes=5)
    
    przypomnienia = db.query(Przypomnienie).join(Notatka).filter(
        and_(
            Przypomnienie.data_przypomnienia >= start_time,
            Przypomnienie.data_przypomnienia <= now,
            Przypomnienie.wyslane == 0
        )
    ).all()
    
    # Oznacz jako wysłane
    for p in przypomnienia:
        p.wyslane = 1
    db.commit()
    
    return [
        {
            "id": p.id,
            "godzina": p.data_przypomnienia.strftime('%H:%M'),
            "notatka_tresc": p.notatka.tresc[:100] + "..." if len(p.notatka.tresc) > 100 else p.notatka.tresc
        }
        for p in przypomnienia
    ]

@app.get("/api/notatki")
def get_notatki_api(db: Session = Depends(get_db)):
    notatki = crud.get_wszystkie_notatki(db)
    return [{"id": n.id, "tresc": n.tresc[:50] + "..." if len(n.tresc) > 50 else n.tresc} for n in notatki]

# === PRZYPOMNIENIA ===
@app.post("/przypomnienie/add")
def add_przypomnienie(
    notatka_id: int = Form(...),
    data_przypomnienia: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        data = datetime.fromisoformat(data_przypomnienia)
        crud.create_przypomnienie(db, notatka_id, data)
        return RedirectResponse(url="/", status_code=303)
    except ValueError:
        return RedirectResponse(url="/?error=invalid_date", status_code=303)

@app.post("/przypomnienie/mark/{przypomnienie_id}")
def mark_przypomnienie(przypomnienie_id: int, db: Session = Depends(get_db)):
    crud.mark_przypomnienie_wyslane(db, przypomnienie_id)
    return {"success": True}

@app.delete("/przypomnienie/delete/{przypomnienie_id}")
def delete_przypomnienie_endpoint(przypomnienie_id: int, db: Session = Depends(get_db)):
    crud.delete_przypomnienie(db, przypomnienie_id)
    return {"success": True}

# === API ENDPOINTS - CLEANED UP ===
@app.get("/api/samochody/{klient_id}")
def get_samochody_klienta_api(klient_id: int, db: Session = Depends(get_db)):
    """API do pobierania samochodów klienta"""
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
    """API do pobierania notatek samochodu"""
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

# USUNIĘTO DUPLIKATY - zostaje tylko jeden endpoint dla kosztorysów
@app.get("/api/kosztorysy-z-towarami/{klient_id}")
def get_kosztorysy_klienta_z_towarami_api(klient_id: int, db: Session = Depends(get_db)):
    """API endpoint dla kosztorysów z towarami"""
    kosztorysy = crud.get_kosztorysy_z_towarami_dla_klienta(db, klient_id)
    return kosztorysy

@app.get("/notatka/{notatka_id}/kosztorysy")
def notatka_to_kosztorysy(notatka_id: int, db: Session = Depends(get_db)):
    """Przekierowanie z notatki do kosztorysów pojazdu"""
    notatka = db.query(Notatka).filter(Notatka.id == notatka_id).first()

    if not notatka or not notatka.samochod:
        return RedirectResponse(url="/?error=no_vehicle", status_code=303)

    return RedirectResponse(url=f"/kosztorysy/{notatka.samochod.nr_rejestracyjny}", status_code=303)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)