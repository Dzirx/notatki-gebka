# === MODULES/NOTATNIK/ROUTES/__INIT__.PY ===
from .html import router as html_router
from .api import router as api_router  
from .forms import router as forms_router

__all__ = ["html_router", "api_router", "forms_router"]