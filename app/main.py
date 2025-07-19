from fastapi import FastAPI, Depends, Form, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
import crud
from database import get_db
from models import Notatka
from models import Notatka, Przypomnienie
from sqlalchemy import and_

app = FastAPI()
templates = Jinja2Templates(directory="templates")

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
        crud.create_notatka_szybka(db, None, tresc)  # Bez klienta
    elif typ_notatki == "pojazd" and nr_rejestracyjny:
        samochod_zewn = crud.get_samochod_zewnetrzny(nr_rejestracyjny)
        if samochod_zewn:
            # Tutaj musisz określić jak przypisać klienta na podstawie danych z zewnętrznej bazy
            # Przykład: znajdź klienta po nazwisku z pola 'wlasciciel'
            pass
    
    return RedirectResponse(url="/", status_code=303)

@app.get("/klient/{klient_id}", response_class=HTMLResponse)
def klient_detail(klient_id: int, request: Request, db: Session = Depends(get_db)):
    klient = crud.get_klient(db, klient_id)
    samochody = crud.get_samochody_klienta(db, klient_id)
    notatki = crud.get_notatki_klienta(db, klient_id)
    return templates.TemplateResponse("klient.html", {
        "request": request,
        "klient": klient,
        "samochody": samochody,
        "notatki": notatki
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
    crud.create_notatka_szybka(db, klient_id, tresc)
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

@app.get("/api/przypomnienia-dzisiaj")
def get_przypomnienia_dzisiaj_api(db: Session = Depends(get_db)):
    przypomnienia = crud.get_przypomnienia_dzisiaj(db)
    return [
        {
            "id": p.id,
            "godzina": p.data_przypomnienia.strftime('%H:%M'),
            "notatka_tresc": p.notatka.tresc[:100] + "..." if len(p.notatka.tresc) > 100 else p.notatka.tresc,
            "klient": f"{p.notatka.klient.imie} {p.notatka.klient.nazwisko}" if p.notatka.klient else None
        }
        for p in przypomnienia
    ]

@app.post("/przypomnienie/add")
def add_przypomnienie(
    notatka_id: int = Form(...),
    data_przypomnienia: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        from datetime import datetime
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

@app.get("/api/notatki")
def get_notatki_api(db: Session = Depends(get_db)):
    notatki = crud.get_wszystkie_notatki(db)
    return [{"id": n.id, "tresc": n.tresc[:50] + "..." if len(n.tresc) > 50 else n.tresc} for n in notatki]

@app.get("/api/przypomnienia-aktywne")
def get_przypomnienia_aktywne(db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    
    now = datetime.now()
    # Przypomnienia z ostatnich 5 minut (żeby nie spam)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)