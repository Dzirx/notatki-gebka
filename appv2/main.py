# === MAIN.PY - GŁÓWNY PLIK APLIKACJI ===
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

# Import modułów
from modules.notatnik.routes import html_router as notatnik_html_router, api_router as notatnik_api_router, forms_router as notatnik_forms_router
from modules.magazyn.routes import html_router as magazyn_html_router, api_router as magazyn_api_router

# === KONFIGURACJA APLIKACJI ===
app = FastAPI(title="System Warsztatowy", version="2.0.0")

# === TEMPLATES I STATYCZNE PLIKI ===
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# === STATYCZNE PLIKI MODUŁÓW ===
app.mount("/modules/notatnik/static", StaticFiles(directory="modules/notatnik/static"), name="notatnik_static")
app.mount("/modules/magazyn/static", StaticFiles(directory="modules/magazyn/static"), name="magazyn_static")
app.mount("/modules/excel/static", StaticFiles(directory="modules/excel/static"), name="excel_static")

# === DASHBOARD - STRONA GŁÓWNA ===
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Dashboard - strona główna z kafelkami modułów"""
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "modules": [
            {
                "name": "Notatnik",
                "icon": "📝",
                "url": "/notatnik"
            },
            {
                "name": "Magazyn", 
                "icon": "📦",
                "url": "/magazyn"
            },
            {
                "name": "Raporty Excel",
                "icon": "📊", 
                "url": "/excel"
            }
        ]
    })

# === DODANIE ROUTERÓW MODUŁÓW ===

# Notatnik
app.include_router(notatnik_html_router, prefix="/notatnik", tags=["Notatnik HTML"])
app.include_router(notatnik_api_router, prefix="/api", tags=["Notatnik API"])
app.include_router(notatnik_forms_router, prefix="/notatnik", tags=["Notatnik Forms"])

# Magazyn
app.include_router(magazyn_html_router, prefix="/magazyn", tags=["Magazyn HTML"])
app.include_router(magazyn_api_router, prefix="/api/magazyn", tags=["Magazyn API"])

# === PLACEHOLDER ROUTES ===
@app.get("/excel") 
async def excel_placeholder():
    return HTMLResponse("""
    <html><body style="font-family: Arial; text-align: center; padding: 100px;">
        <h1>📊 Raporty Excel</h1>
        <p>Moduł w budowie...</p>
        <a href="/" style="color: #007bff;">← Powrót do dashboardu</a>
    </body></html>
    """)

# === URUCHOMIENIE SERWERA ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)