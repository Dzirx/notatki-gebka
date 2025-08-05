# === MODULES/MAGAZYN/CRUD.PY - OPERACJE NA BAZIE SAMOCHODY_DB ===
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from datetime import datetime
from decimal import Decimal

def convert_decimal_to_float(value):
    """Konwertuje Decimal na float dla JSON serialization"""
    if isinstance(value, Decimal):
        return float(value)
    return value

def get_opony_na_dzien(db: Session, selected_date: str) -> List[Dict[str, Any]]:
    """Pobiera informacje o oponach na wybrany dzień z bazy samochody_db"""
    
    query = text("""
        SELECT p.nrRejestracyjny AS rej,
               kpo.nazwa AS name,
               ko.felgiOpon AS wheels,
               ko.rodzajDepozytu AS rodzaj_opony,
               kpo.glebokoscBieznika AS bieznik,
               ko.lokalizacjeOpon AS lokalizacja,
               zp.data AS data,
               ko.numer AS numer,
               CASE WHEN ROW_NUMBER() OVER (PARTITION BY zp.id ORDER BY kpo.id) = 1 THEN STUFF((
                   SELECT DISTINCT ', ' + t2.nazwa + ' (' + CAST(tk2.ilosc AS VARCHAR) + ' szt. x ' + CAST(tk2.cena AS VARCHAR) + ' zl)'
                   FROM TowaryKosztorysow tk2
                   INNER JOIN Towary t2 ON tk2.idTowary = t2.id
                   WHERE tk2.idKosztorysy = k.id
                   FOR XML PATH('')
               ), 1, 2, '') ELSE NULL END AS towary_szczegoly,
               CASE WHEN ROW_NUMBER() OVER (PARTITION BY zp.id ORDER BY kpo.id) = 1 THEN STUFF((
                   SELECT DISTINCT ', ' + u2.nazwa + ' (' + CAST(uk2.iloscRoboczogodzin AS VARCHAR) + ' x ' + CAST(uk2.cena AS VARCHAR) + ' zl)'
                   FROM UslugiKosztorysow uk2
                   INNER JOIN Uslugi u2 ON uk2.idUslugi = u2.id
                   WHERE uk2.idKosztorysy = k.id
                   FOR XML PATH('')
               ), 1, 2, '') ELSE NULL END AS uslugi_szczegoly
        FROM ZapisyTerminarzy zp
        LEFT JOIN Pojazdy p ON p.id = zp.idPojazdy
        LEFT JOIN KartyPrzechowalniOpon ko ON ko.idPojazdy = p.id
        LEFT JOIN OponyKPO kpo ON kpo.idKartyPrzechowalniOpon = ko.id
        LEFT JOIN Felgi f ON kpo.idFelgi = f.id
        LEFT JOIN StanyOpon so ON kpo.idStanyOpon = so.id
        LEFT JOIN ProducenciOpon po ON kpo.idProducenciOpon = po.id
        LEFT JOIN Kosztorysy k ON k.id = zp.idKosztorysy
        WHERE (
            (CAST(zp.opis AS VARCHAR(100)) NOT LIKE '% %' AND CAST(zp.opis AS VARCHAR(100)) NOT LIKE '%/%'
             AND CAST(zp.opis AS VARCHAR(100)) = LEFT(ko.numer, CHARINDEX('/', ko.numer + '/') - 1))
            OR
            (CAST(zp.opis AS VARCHAR(100)) LIKE '% %' AND CAST(zp.opis AS VARCHAR(100)) NOT LIKE '%/%'
             AND LEFT(CAST(zp.opis AS VARCHAR(100)), CHARINDEX(' ', CAST(zp.opis AS VARCHAR(100)) + ' ') - 1) = LEFT(ko.numer, CHARINDEX('/', ko.numer + '/') - 1))
            OR
            (CAST(zp.opis AS VARCHAR(100)) LIKE '%/%'
             AND (
                 LEFT(CAST(zp.opis AS VARCHAR(100)), CHARINDEX('/', CAST(zp.opis AS VARCHAR(100)) + '/') - 1) = LEFT(ko.numer, CHARINDEX('/', ko.numer + '/') - 1)
                 OR
                 RIGHT(CAST(zp.opis AS VARCHAR(100)), LEN(CAST(zp.opis AS VARCHAR(100))) - CHARINDEX('/', CAST(zp.opis AS VARCHAR(100)))) = LEFT(ko.numer, CHARINDEX('/', ko.numer + '/') - 1)
             )
            )
        )
        AND CAST(zp.data AS DATE) = :selected_date
        ORDER BY kpo.id;
    """)
    
    try:
        result = db.execute(query, {"selected_date": selected_date})
        rows = result.fetchall()
        
        print(f"🔍 Zapytanie zwróciło {len(rows)} rekordów dla daty {selected_date}")
        
        # Konwersja wyników na listę słowników z obsługą Decimal
        opony_data = []
        for row in rows:
            opony_data.append({
                "rej": row.rej,
                "name": row.name,
                "wheels": row.wheels,
                "rodzaj_opony": row.rodzaj_opony,
                "bieznik": convert_decimal_to_float(row.bieznik),  # ← KONWERSJA DECIMAL
                "lokalizacja": row.lokalizacja,
                "data": row.data.isoformat() if row.data else None,  # ← KONWERSJA DATETIME
                "numer": row.numer,
                "towary_szczegoly": row.towary_szczegoly,
                "uslugi_szczegoly": row.uslugi_szczegoly
            })
        
        return opony_data
        
    except Exception as e:
        print(f"❌ Błąd podczas pobierania danych opon: {e}")
        return []

def get_dostepne_daty_opon(db: Session, limit: int = 30) -> List[str]:
    """Pobiera dostępne daty z zapisami terminów (ostatnie 30 dni)"""
    
    query = text("""
        SELECT DISTINCT CAST(zp.data AS DATE) as data_string
        FROM ZapisyTerminarzy zp
        WHERE zp.data >= DATEADD(day, -30, GETDATE())
        ORDER BY data_string DESC
    """)
    
    try:
        result = db.execute(query)
        rows = result.fetchall()
        
        # Konwersja dat na stringi
        daty = [str(row.data_string) for row in rows]
        return daty
        
    except Exception as e:
        print(f"Błąd podczas pobierania dostępnych dat: {e}")
        return []

# FUNKCJA DEBUGOWA - dodaj ją tymczasowo
def debug_zapisy_na_dzien(db: Session, selected_date: str) -> List[Dict[str, Any]]:
    """Funkcja debugowa - sprawdza podstawowe dane bez skomplikowanych JOIN-ów"""
    
    query = text("""
        SELECT 
            p.nrRejestracyjny AS rej,
            zp.opis,
            zp.data,
            zp.id as zapisy_id,
            k.id as kosztorys_id,
            CASE WHEN k.id IS NOT NULL THEN 'MA_KOSZTORYS' ELSE 'BRAK_KOSZTORYSU' END as status_kosztorysu
        FROM ZapisyTerminarzy zp
        INNER JOIN Pojazdy p ON p.id = zp.idPojazdy
        LEFT JOIN Kosztorysy k ON k.id = zp.idKosztorysy
        WHERE CAST(zp.data AS DATE) = :selected_date
        ORDER BY p.nrRejestracyjny
    """)
    
    try:
        result = db.execute(query, {"selected_date": selected_date})
        rows = result.fetchall()
        
        print(f"🔍 DEBUGOWANIE dla daty {selected_date}:")
        print(f"📊 Znaleziono {len(rows)} zapisów terminów")
        
        z_kosztorysami = sum(1 for row in rows if row.kosztorys_id is not None)
        bez_kosztorysow = len(rows) - z_kosztorysami
        
        print(f"💰 Z kosztorysami: {z_kosztorysami}")
        print(f"❌ Bez kosztorysów: {bez_kosztorysow}")
        
        for row in rows:
            print(f"  - {row.rej}: {row.opis} ({row.status_kosztorysu})")
        
        # Konwersja z obsługą typów danych
        debug_data = []
        for row in rows:
            debug_data.append({
                "rej": row.rej,
                "opis": row.opis,
                "data": row.data.isoformat() if row.data else None,
                "zapisy_id": row.zapisy_id,
                "kosztorys_id": row.kosztorys_id,
                "status_kosztorysu": row.status_kosztorysu
            })
        
        return debug_data
        
    except Exception as e:
        print(f"❌ Błąd debugowania: {e}")
        return []