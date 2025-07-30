from sqlalchemy.orm import Session
from sqlalchemy import text
from models import Kosztorys
from typing import List, Dict, Any

def create_kosztorys(db: Session, notatka_id: int, kwota: float, 
                    opis: str = None, numer_kosztorysu: str = None):
    """Tworzy nowy kosztorys dla notatki"""
    db_kosztorys = Kosztorys(
        notatka_id=notatka_id, 
        kwota_calkowita=kwota, 
        opis=opis, 
        numer_kosztorysu=numer_kosztorysu
    )
    db.add(db_kosztorys)
    db.commit()
    db.refresh(db_kosztorys)
    return db_kosztorys




def get_kosztorysy_z_towarami_dla_notatki(db: Session, notatka_id: int) -> List[Dict[str, Any]]:
    """Pobiera kosztorysy notatki wraz z towarami i usługami"""
    
    query = text("""
        SELECT 
            k.id as kosztorys_id,
            k.numer_kosztorysu,
            k.kwota_calkowita,
            k.opis as kosztorys_opis,
            k.status,
            k.created_at,
            
            t.nazwa as towar_nazwa,
            kt.ilosc as towar_ilosc,
            kt.cena as towar_cena,
            
            u.nazwa as usluga_nazwa,
            ku.ilosc as usluga_ilosc,
            ku.cena as usluga_cena
            
        FROM kosztorysy k
        LEFT JOIN kosztorysy_towary kt ON k.id = kt.kosztorys_id
        LEFT JOIN towary t ON kt.towar_id = t.id
        LEFT JOIN kosztorysy_uslug ku ON k.id = ku.kosztorys_id
        LEFT JOIN uslugi u ON ku.uslugi_id = u.id
        WHERE k.notatka_id = :notatka_id
        ORDER BY k.created_at DESC, t.nazwa ASC, u.nazwa ASC
    """)
    
    result = db.execute(query, {"notatka_id": notatka_id})
    rows = result.fetchall()
    
    kosztorysy_dict = {}
    
    for row in rows:
        kosztorys_id = row.kosztorys_id
        
        if kosztorys_id not in kosztorysy_dict:
            kosztorysy_dict[kosztorys_id] = {
                "id": kosztorys_id,
                "numer": row.numer_kosztorysu,
                "kwota_calkowita": float(row.kwota_calkowita) if row.kwota_calkowita else 0.0,
                "opis": row.kosztorys_opis,
                "status": row.status,
                "created_at": row.created_at,
                "towary": [],
                "uslugi": []
            }
        
        if row.towar_nazwa and row.towar_nazwa not in [t["nazwa"] for t in kosztorysy_dict[kosztorys_id]["towary"]]:
            kosztorysy_dict[kosztorys_id]["towary"].append({
                "nazwa": row.towar_nazwa,
                "ilosc": float(row.towar_ilosc),
                "cena": float(row.towar_cena)
            })
        
        if row.usluga_nazwa and row.usluga_nazwa not in [u["nazwa"] for u in kosztorysy_dict[kosztorys_id]["uslugi"]]:
            kosztorysy_dict[kosztorys_id]["uslugi"].append({
                "nazwa": row.usluga_nazwa,
                "ilosc": float(row.usluga_ilosc),
                "cena": float(row.usluga_cena)
            })
    
    return list(kosztorysy_dict.values())

