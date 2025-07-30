# === MAIN.PY - GŁÓWNY PLIK APLIKACJI ===
from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

# Import modułów z endpointami
from routers import html_routes, api_routes, form_routes

# === KONFIGURACJA APLIKACJI ===
app = FastAPI(title="Notatnik Warsztatowy", version="1.0.0")
templates = Jinja2Templates(directory="templates")

# === STATYCZNE PLIKI ===
app.mount("/static", StaticFiles(directory="static"), name="static")

# === DODANIE ROUTERÓW ===
app.include_router(html_routes.router, tags=["HTML Pages"])
app.include_router(form_routes.router, tags=["Form Actions"])  
app.include_router(api_routes.router, prefix="/api", tags=["API"])

# === ROOT ENDPOINT ===
@app.get("/")
def root():
    """Przekierowanie na główną stronę"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/home")

# === URUCHOMIENIE SERWERA ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)