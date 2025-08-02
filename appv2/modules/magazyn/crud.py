# === MODULES/MAGAZYN/CRUD.PY - OPERACJE NA BAZIE SAMOCHODY_DB ===
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from datetime import datetime

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
        JOIN Pojazdy p ON p.id = zp.idPojazdy
        JOIN KartyPrzechowalniOpon ko ON ko.idPojazdy = p.id
        JOIN OponyKPO kpo ON kpo.idKartyPrzechowalniOpon = ko.id
        JOIN Felgi f ON kpo.idFelgi = f.id
        LEFT JOIN StanyOpon so ON kpo.idStanyOpon = so.id
        JOIN ProducenciOpon po ON kpo.idProducenciOpon = po.id
        INNER JOIN Kosztorysy k ON k.id = zp.idKosztorysy
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
        
        # Konwersja wyników na listę słowników
        opony_data = []
        for row in rows:
            opony_data.append({
                "rej": row.rej,
                "name": row.name,
                "wheels": row.wheels,
                "rodzaj_opony": row.rodzaj_opony,
                "bieznik": row.bieznik,
                "lokalizacja": row.lokalizacja,
                "data": row.data,
                "numer": row.numer,
                "towary_szczegoly": row.towary_szczegoly,
                "uslugi_szczegoly": row.uslugi_szczegoly
            })
        
        return opony_data
        
    except Exception as e:
        print(f"Błąd podczas pobierania danych opon: {e}")
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