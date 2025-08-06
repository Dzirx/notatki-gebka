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
               kpo.wymianaOpis as opona_uwagi,
               ko.uwagi as karta_przechowywalni_uwagi,
               ko.numer AS numer_depozytu,
               CASE WHEN ROW_NUMBER() OVER (PARTITION BY zp.id ORDER BY kpo.id) = 1 THEN STUFF((
                   SELECT DISTINCT ', ' + t2.nazwa
                   FROM TowaryKosztorysow tk2
                   INNER JOIN Towary t2 ON tk2.idTowary = t2.id
                   WHERE tk2.idKosztorysy = k.id
                   FOR XML PATH('')
               ), 1, 2, '') ELSE NULL END AS towary_szczegoly,
               CASE WHEN ROW_NUMBER() OVER (PARTITION BY zp.id ORDER BY kpo.id) = 1 THEN STUFF((
                   SELECT DISTINCT ', ' + u2.nazwa
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
        ORDER BY p.nrRejestracyjny, ko.numer, kpo.id;
    """)
    
    try:
        result = db.execute(query, {"selected_date": selected_date})
        rows = result.fetchall()
        
        print(f"🔍 Zapytanie zwróciło {len(rows)} rekordów dla daty {selected_date}")
        
        # Konwersja wyników
        opony_data = []
        for row in rows:
            opony_data.append({
                "rej": row.rej,
                "name": row.name,
                "wheels": row.wheels,
                "rodzaj_opony": row.rodzaj_opony,
                "bieznik": convert_decimal_to_float(row.bieznik),
                "lokalizacja": row.lokalizacja,
                "data": row.data.isoformat() if row.data else None,
                "opona_uwagi": row.opona_uwagi,
                "karta_przechowywalni_uwagi": row.karta_przechowywalni_uwagi,
                "numer_depozytu": row.numer_depozytu,
                "towary_szczegoly": row.towary_szczegoly,
                "uslugi_szczegoly": row.uslugi_szczegoly
            })
        
        return opony_data
        
    except Exception as e:
        print(f"❌ Błąd podczas pobierania danych opon: {e}")
        return []

def get_pojazdy_grouped_for_terminarz(db: Session, selected_date: str) -> List[Dict[str, Any]]:
    """Grupuje pojazdy - jeden wiersz na pojazd z depozytami do rozwinięcia"""
    
    opony_data = get_opony_na_dzien(db, selected_date)
    
    # Grupuj według nr rejestracyjnego
    grouped_vehicles = {}
    
    for opona in opony_data:
        rej = opona['rej']
        
        if rej not in grouped_vehicles:
            grouped_vehicles[rej] = {
                'rej': rej,
                'total_opony': 0,
                'depozyty': {},  # Grupuj po numer_depozytu
                'combined_info': {
                    'wheels_summary': set(),
                    'lokalizacje_summary': set(),
                    'uwagi_summary': set()
                }
            }
        
        vehicle = grouped_vehicles[rej]
        numer_depozytu = opona['numer_depozytu']
        
        # Dodaj do podsumowania pojazdu
        if opona['wheels']:
            vehicle['combined_info']['wheels_summary'].add(opona['wheels'])
        if opona['lokalizacja']:
            vehicle['combined_info']['lokalizacje_summary'].add(opona['lokalizacja'])
        if opona['karta_przechowywalni_uwagi']:
            vehicle['combined_info']['uwagi_summary'].add(opona['karta_przechowywalni_uwagi'])
        
        # Grupuj po depozytach
        if numer_depozytu not in vehicle['depozyty']:
            vehicle['depozyty'][numer_depozytu] = {
                'numer_depozytu': numer_depozytu,
                'karta_uwagi': opona['karta_przechowywalni_uwagi'],
                'wheels': opona['wheels'],
                'lokalizacja': opona['lokalizacja'],
                'opony': [],
                'towary_szczegoly': opona['towary_szczegoly'],
                'uslugi_szczegoly': opona['uslugi_szczegoly']
            }
        
        # Dodaj oponę do depozytu
        vehicle['depozyty'][numer_depozytu]['opony'].append(opona)
        vehicle['total_opony'] += 1
    
    # Konwertuj sets na stringi dla wyświetlania
    result = []
    for rej, vehicle in grouped_vehicles.items():
        # Złącz unikalne wartości
        wheels_str = " / ".join(sorted(vehicle['combined_info']['wheels_summary']))
        lokalizacje_str = " / ".join(sorted(vehicle['combined_info']['lokalizacje_summary']))
        uwagi_str = " / ".join(filter(None, sorted(vehicle['combined_info']['uwagi_summary'])))
        
        result.append({
            'rej': rej,
            'wheels_summary': wheels_str,
            'lokalizacje_summary': lokalizacje_str,
            'uwagi_summary': uwagi_str or "Brak uwag",
            'total_opony': vehicle['total_opony'],
            'depozyty_count': len(vehicle['depozyty']),
            'depozyty': list(vehicle['depozyty'].values())
        })
    
    return result

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