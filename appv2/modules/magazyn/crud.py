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
    
def get_zlecenia_na_dzien(db: Session, selected_date: str) -> List[Dict[str, Any]]:
    """
    Zlecenia rozpoczęte na wskazany dzień.
    ZAPYTANIE 1: Opony z notatkami
    ZAPYTANIE 2: Towary/Usługi wszystkich zleceń
    ZAPYTANIE 3: Zlecenia które mają tylko towary (bez notatek/opon)
    """
    
    # ZAPYTANIE 1: Opony (tylko te z notatkami)
    query_opony = text("""
        SELECT 
            p.nrRejestracyjny as rej,
            kpo.nazwa AS name,
            ko.felgiOpon AS wheels,
            ko.rodzajDepozytu AS rodzaj_opony,
            kpo.glebokoscBieznika AS bieznik,
            ko.lokalizacjeOpon as lokalizacja,
            kpo.wymianaOpis as opisOponyKPO,
            ko.uwagi as kartaprzechowywalniuwagi,
            ko.numer as numer_z_karty,
            nds.tresc as notatka,
            'opony' as typ_rekordu
        FROM zlecenia z 
        INNER JOIN Kontrahenci k ON z.idKontrahenci = k.id
        INNER JOIN Pojazdy p ON p.id = z.idPojazdy 
        LEFT JOIN DokSprzedazy ds ON ds.id = z.idDokSprzedazy
        LEFT JOIN NotatkiDokSprzedazy nds ON nds.idDokSprzedazy = ds.id
        LEFT JOIN KartyPrzechowalniOpon ko ON ko.idPojazdy = p.id
        LEFT JOIN OponyKPO kpo ON kpo.idKartyPrzechowalniOpon = ko.id
        WHERE
            ko.numer IS NOT NULL
            AND nds.tresc IS NOT NULL
            AND CHARINDEX('/', ko.numer) > 0
            AND CHARINDEX('/', CAST(nds.tresc AS varchar(500))) > 0
            AND EXISTS (
                SELECT 1 
                FROM 
                    (SELECT number FROM master.dbo.spt_values WHERE type = 'P' AND number <= 50) n
                WHERE 
                    n.number <= LEN(CAST(nds.tresc AS varchar(500)))
                    AND (n.number = 1 OR SUBSTRING(CAST(nds.tresc AS varchar(500)), n.number - 1, 1) = '/')
                    AND (
                        SUBSTRING(CAST(nds.tresc AS varchar(500)), n.number, 1) BETWEEN '0' AND '9'
                    )
                    AND LEFT(ko.numer, CHARINDEX('/', ko.numer) - 1) = 
                        SUBSTRING(
                            CAST(nds.tresc AS varchar(500)), 
                            n.number, 
                            CASE 
                                WHEN CHARINDEX('/', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) > n.number 
                                    AND CHARINDEX(' ', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) > n.number
                                THEN 
                                    CASE 
                                        WHEN CHARINDEX('/', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) < CHARINDEX(' ', CAST(nds.tresc AS varchar(500)) + '/ ', n.number)
                                        THEN CHARINDEX('/', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) - n.number
                                        ELSE CHARINDEX(' ', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) - n.number
                                    END
                                WHEN CHARINDEX('/', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) > n.number
                                THEN CHARINDEX('/', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) - n.number
                                ELSE CHARINDEX(' ', CAST(nds.tresc AS varchar(500)) + '/ ', n.number) - n.number
                            END
                        )
            )
            AND CAST(z.dataGodzinaZgloszenia AS DATE) = :selected_date
            AND z.idStatusyZlecen = 2
    """)
    
    # ZAPYTANIE 2: Zlecenia bez notatek ale z towarami (tylko towary)
    query_tylko_towary = text("""
        SELECT 
            p.nrRejestracyjny as rej,
            NULL as name,
            NULL as wheels,
            NULL as rodzaj_opony,
            NULL as bieznik,
            NULL as lokalizacja,
            NULL as opisOponyKPO,
            NULL as kartaprzechowywalniuwagi,
            NULL as numer_z_karty,
            nds.tresc as notatka,
            'tylko_towary' as typ_rekordu
        FROM zlecenia z 
        INNER JOIN Kontrahenci k ON z.idKontrahenci = k.id
        INNER JOIN Pojazdy p ON p.id = z.idPojazdy 
        LEFT JOIN DokSprzedazy ds ON ds.id = z.idDokSprzedazy
        LEFT JOIN NotatkiDokSprzedazy nds ON nds.idDokSprzedazy = ds.id
        WHERE
            CAST(z.dataGodzinaZgloszenia AS DATE) = :selected_date
            AND z.idStatusyZlecen = 2
            AND (nds.tresc IS NULL OR nds.tresc = '' OR CHARINDEX('/', CAST(nds.tresc AS varchar(500))) = 0)
            AND EXISTS (
                SELECT 1 
                FROM DokSprzedazy ds2
                LEFT JOIN TowaryDokSprzedazy tds2 ON tds2.idDokSprzedazy = ds2.id
                LEFT JOIN UslugiDokSprzedazy uds2 ON uds2.idDokSprzedazy = ds2.id
                WHERE ds2.id = z.idDokSprzedazy 
                AND (tds2.id IS NOT NULL OR uds2.id IS NOT NULL)
            )
    """)
    
    # ZAPYTANIE 3: Towary/Usługi wszystkich zleceń
    query_towary_uslugi = text("""
        SELECT 
            p.nrRejestracyjny as rej,
            STRING_AGG(t.nazwa + ' (' + ISNULL(t.nrKatalogowyBK, '') + ') ' + CAST(tds.ilosc as varchar) + ' szt', ', ') as towary_szczegoly,
            STRING_AGG(u.nazwa, ', ') as uslugi_szczegoly
        FROM zlecenia z
        INNER JOIN Pojazdy p ON p.id = z.idPojazdy
        LEFT JOIN DokSprzedazy ds ON ds.id = z.idDokSprzedazy
        LEFT JOIN TowaryDokSprzedazy tds ON tds.idDokSprzedazy = ds.id
        LEFT JOIN Towary t ON t.id = tds.idTowary
        LEFT JOIN UslugiDokSprzedazy uds ON uds.idDokSprzedazy = ds.id
        LEFT JOIN Uslugi u ON u.id = uds.idUslugi
        WHERE CAST(z.dataGodzinaZgloszenia AS DATE) = :selected_date
          AND z.idStatusyZlecen = 2
        GROUP BY p.nrRejestracyjny
    """)
    
    try:
        # Wykonaj wszystkie zapytania
        opony_rows = db.execute(query_opony, {"selected_date": selected_date}).fetchall()
        towary_only_rows = db.execute(query_tylko_towary, {"selected_date": selected_date}).fetchall()
        towary_rows = db.execute(query_towary_uslugi, {"selected_date": selected_date}).fetchall()
        
        print(f"🔍 Opony: {len(opony_rows)}, Tylko towary: {len(towary_only_rows)}, Towary/Usługi: {len(towary_rows)}")
        
        # Słownik towarów/usług
        towary_dict = {}
        for row in towary_rows:
            towary_dict[row.rej] = {
                'towary_szczegoly': row.towary_szczegoly,
                'uslugi_szczegoly': row.uslugi_szczegoly
            }
        
        # Łącz wszystkie dane
        data = []
        
        # Dodaj opony z notatkami
        for row in opony_rows:
            rej = row.rej
            towary_info = towary_dict.get(rej, {'towary_szczegoly': None, 'uslugi_szczegoly': None})
            
            data.append({
                "rej": rej,
                "name": row.name,
                "wheels": row.wheels,
                "rodzaj_opony": row.rodzaj_opony,
                "bieznik": convert_decimal_to_float(row.bieznik) if row.bieznik else None,
                "lokalizacja": row.lokalizacja,
                "opisOponyKPO": row.opisOponyKPO,
                "kartaprzechowywalniuwagi": row.kartaprzechowywalniuwagi,
                "numer_z_karty": row.numer_z_karty,
                "notatka": row.notatka,
                "towary_szczegoly": towary_info['towary_szczegoly'],
                "uslugi_szczegoly": towary_info['uslugi_szczegoly'],
                "typ_rekordu": "opony"
            })
        
        # Dodaj zlecenia tylko z towarami (bez opon)
        for row in towary_only_rows:
            rej = row.rej
            towary_info = towary_dict.get(rej, {'towary_szczegoly': None, 'uslugi_szczegoly': None})
            
            data.append({
                "rej": rej,
                "name": None,
                "wheels": None,
                "rodzaj_opony": None,
                "bieznik": None,
                "lokalizacja": None,
                "opisOponyKPO": None,
                "kartaprzechowywalniuwagi": None,
                "numer_z_karty": None,
                "notatka": row.notatka,
                "towary_szczegoly": towary_info['towary_szczegoly'],
                "uslugi_szczegoly": towary_info['uslugi_szczegoly'],
                "typ_rekordu": "tylko_towary"
            })
        
        return data
        
    except Exception as e:
        print(f"❌ Błąd get_zlecenia_na_dzien: {e}")
        return []

def get_pojazdy_zlecenia_grouped(db: Session, selected_date: str) -> List[Dict[str, Any]]:
    """
    Grupuje zlecenia - obsługuje opony z notatkami i zlecenia tylko z towarami
    """
    
    zlecenia_data = get_zlecenia_na_dzien(db, selected_date)
    
    # Grupuj według nr rejestracyjnego
    grouped_vehicles = {}
    
    for rekord in zlecenia_data:
        rej = rekord['rej']
        
        # Inicjalizuj pojazd jeśli nie istnieje
        if rej not in grouped_vehicles:
            grouped_vehicles[rej] = {
                'rej': rej,
                'notatka': rekord['notatka'],
                'towary_szczegoly': rekord['towary_szczegoly'],
                'uslugi_szczegoly': rekord['uslugi_szczegoly'],
                'depozyty': {},  # Dla opon
                'lokalizacje_set': set(),
                'ma_opony': False,
                'ma_tylko_towary': False
            }
        
        vehicle = grouped_vehicles[rej]
        
        if rekord['typ_rekordu'] == 'opony':
            # To jest opona - dodaj do depozytów
            vehicle['ma_opony'] = True
            
            # Zbieraj lokalizacje
            if rekord['lokalizacja']:
                vehicle['lokalizacje_set'].add(rekord['lokalizacja'])
            
            # Grupuj według depozytu
            numer_depozytu = rekord['numer_z_karty']
            if numer_depozytu not in vehicle['depozyty']:
                vehicle['depozyty'][numer_depozytu] = {
                    'numer_depozytu': numer_depozytu,
                    'opony': []
                }
            
            vehicle['depozyty'][numer_depozytu]['opony'].append(rekord)
            
        elif rekord['typ_rekordu'] == 'tylko_towary':
            # To jest zlecenie tylko z towarami
            vehicle['ma_tylko_towary'] = True
    
    # Konwertuj na listę wyników
    result = []
    for rej, vehicle in grouped_vehicles.items():
        lokalizacje_summary = " / ".join(sorted(vehicle['lokalizacje_set']))
        
        if vehicle['ma_opony']:
            # Ma opony - policz je
            total_opony = sum(len(depot['opony']) for depot in vehicle['depozyty'].values())
            depozyty_list = [
                {
                    'numer_depozytu': depot_num,
                    'opony_count': len(depot_data['opony']),
                    'opony': depot_data['opony']
                }
                for depot_num, depot_data in vehicle['depozyty'].items()
            ]
        else:
            # Tylko towary - brak opon
            total_opony = 0
            depozyty_list = []
        
        result.append({
            'rej': rej,
            'opony_count': total_opony,
            'depozyty_count': len(vehicle['depozyty']),
            'lokalizacje_summary': lokalizacje_summary or "Brak lokalizacji",
            'notatka': vehicle['notatka'],
            'towary_szczegoly': vehicle['towary_szczegoly'],
            'uslugi_szczegoly': vehicle['uslugi_szczegoly'],
            'depozyty': sorted(depozyty_list, key=lambda x: x['numer_depozytu']) if depozyty_list else [],
            'ma_tylko_towary': vehicle['ma_tylko_towary']
        })
    
    return sorted(result, key=lambda x: x['rej'])