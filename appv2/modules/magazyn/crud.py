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
    
    query_opony = text("""
        SELECT 
            p.nrRejestracyjny AS rej,
            kpo.nazwa AS name,
            ko.felgiOpon AS wheels,
            ko.rodzajDepozytu AS rodzaj_opony,
            kpo.glebokoscBieznika AS bieznik,
            RTRIM(LEFT(ko.lokalizacjeOpon, CHARINDEX('(', ko.lokalizacjeOpon + '(') - 1)) AS lokalizacja,
            zp.data AS data,
            kpo.wymianaOpis as opona_uwagi,
            ko.uwagi as karta_przechowywalni_uwagi,
            ko.numer AS numer_depozytu,
            zp.opis as opis_terminarza
               
        FROM ZapisyTerminarzy zp
        LEFT JOIN Pojazdy p ON p.id = zp.idPojazdy
        LEFT JOIN KartyPrzechowalniOpon ko ON ko.idPojazdy = p.id
        LEFT JOIN OponyKPO kpo ON kpo.idKartyPrzechowalniOpon = ko.id
        LEFT JOIN Felgi f ON kpo.idFelgi = f.id
        LEFT JOIN StanyOpon so ON kpo.idStanyOpon = so.id
        LEFT JOIN ProducenciOpon po ON kpo.idProducenciOpon = po.id
        LEFT JOIN Kosztorysy k ON k.id = zp.idKosztorysy
        WHERE
            ko.numer IS NOT NULL
            AND zp.opis IS NOT NULL
            AND CAST(zp.data AS DATE) = :selected_date   -- lub wstaw stałą datę

            /* Dopasuj którykolwiek segment z pierwszego tokena opisu
            do pierwszego segmentu numeru depozytu (przed '/') */
            AND EXISTS (
                /* 1) weź pierwszy token (do pierwszej spacji) z opisu */
                SELECT 1
                FROM (
                    SELECT LTRIM(RTRIM(
                            CASE
                            WHEN CHARINDEX(' ', CAST(zp.opis AS varchar(500))) > 0
                                THEN LEFT(CAST(zp.opis AS varchar(500)),
                                        CHARINDEX(' ', CAST(zp.opis AS varchar(500))) - 1)
                            ELSE CAST(zp.opis AS varchar(500))
                            END
                        )) AS token
                ) t
                /* 2) rozbij token po '/' na segmenty */
                CROSS APPLY (
                    SELECT LTRIM(RTRIM(
                            SUBSTRING(
                                t.token + '/',
                                n.number,
                                CHARINDEX('/', t.token + '/', n.number) - n.number
                            )
                        )) AS seg
                    FROM (SELECT number 
                        FROM master.dbo.spt_values 
                        WHERE type = 'P' AND number BETWEEN 1 AND 200) n
                    WHERE n.number <= LEN(t.token)
                    AND (n.number = 1 OR SUBSTRING(t.token, n.number - 1, 1) = '/')
                    AND CHARINDEX('/', t.token + '/', n.number) > n.number
                ) parts
                /* 3) porównanie segmentu do pierwszego segmentu ko.numer */
                WHERE parts.seg <> ''
                -- jeśli segmenty mają być liczbowe, odkomentuj:
                -- AND TRY_CONVERT(int, parts.seg) IS NOT NULL
                AND parts.seg = LEFT(ko.numer, CHARINDEX('/', ko.numer + '/') - 1)
            )
    """)

    query_towary = text("""
        SELECT 
            UPPER(LTRIM(RTRIM(p.nrRejestracyjny))) AS rej_norm,
            p.nrRejestracyjny AS rej,
            STUFF((SELECT DISTINCT ', ' + t.nazwa + ' (nr katalogowy: ' + ISNULL(t.nrKatalogowy, '') + ') ' + CAST(tk.ilosc AS varchar) + ' szt'
                    FROM TowaryKosztorysow tk 
                    JOIN Towary t ON t.id = tk.idTowary 
                    WHERE tk.idKosztorysy = k.id
                    FOR XML PATH('')), 1, 2, '') AS towary_szczegoly,
            STUFF((SELECT DISTINCT ', ' + u.nazwa 
                    FROM UslugiKosztorysow uk 
                    JOIN Uslugi u ON u.id = uk.idUslugi 
                    WHERE uk.idKosztorysy = k.id
                    FOR XML PATH('')), 1, 2, '') AS uslugi_szczegoly
                        FROM ZapisyTerminarzy zp
            JOIN Pojazdy p ON p.id = zp.idPojazdy
            LEFT JOIN Kosztorysy k ON k.id = zp.idKosztorysy
            WHERE CAST(zp.data AS DATE) = :selected_date
            GROUP BY p.nrRejestracyjny, k.id;
                        
        """)
    
    try:
        # Wykonaj oba zapytania
        opony_result = db.execute(query_opony, {"selected_date": selected_date})
        opony_rows = opony_result.fetchall()
        
        towary_result = db.execute(query_towary, {"selected_date": selected_date})
        towary_rows = towary_result.fetchall()
        
        print(f"🔍 Opony: {len(opony_rows)}, Towary: {len(towary_rows)} rekordów dla daty {selected_date}")
        
        # Słownik towarów według nr rejestracyjnego
        towary_dict = {}
        for row in towary_rows:
            towary_dict[row.rej] = {
                'towary_szczegoly': row.towary_szczegoly,
                'uslugi_szczegoly': row.uslugi_szczegoly
            }
        
        # Łącz opony z towarami
        opony_data = []
        for row in opony_rows:
            rej = row.rej
            towary_info = towary_dict.get(rej, {'towary_szczegoly': None, 'uslugi_szczegoly': None})
            
            opony_data.append({
                "rej": rej,
                "name": row.name,
                "wheels": row.wheels,
                "rodzaj_opony": row.rodzaj_opony,
                "bieznik": convert_decimal_to_float(row.bieznik),
                "lokalizacja": row.lokalizacja,
                "data": row.data.isoformat() if row.data else None,
                "opona_uwagi": row.opona_uwagi,
                "karta_przechowywalni_uwagi": row.karta_przechowywalni_uwagi,
                "numer_depozytu": row.numer_depozytu,
                "opis_terminarza": row.opis_terminarza,
                "towary_szczegoly": towary_info['towary_szczegoly'],
                "uslugi_szczegoly": towary_info['uslugi_szczegoly']
            })
        
        return opony_data
        
    except Exception as e:
        print(f"❌ Błąd podczas pobierania danych opon: {e}")
        return []

def get_pojazdy_tylko_towary_terminarz(db: Session, selected_date: str) -> List[Dict[str, Any]]:
    """Zwraca pojazdy z terminarza które mają tylko towary/usługi (bez depozytu)"""
    
    query_towary = text("""
        SELECT 
            p.nrRejestracyjny AS rej,
            STUFF((SELECT DISTINCT ', ' + t.nazwa + ' (nr katalogowy: ' + ISNULL(t.nrKatalogowy, '') + ') ' + CAST(tk.ilosc AS varchar) + ' szt'
                    FROM TowaryKosztorysow tk 
                    JOIN Towary t ON t.id = tk.idTowary 
                    WHERE tk.idKosztorysy = k.id
                    FOR XML PATH('')), 1, 2, '') AS towary_szczegoly,
            STUFF((SELECT DISTINCT ', ' + u.nazwa 
                    FROM UslugiKosztorysow uk 
                    JOIN Uslugi u ON u.id = uk.idUslugi 
                    WHERE uk.idKosztorysy = k.id
                    FOR XML PATH('')), 1, 2, '') AS uslugi_szczegoly
        FROM ZapisyTerminarzy zp
        JOIN Pojazdy p ON p.id = zp.idPojazdy
        LEFT JOIN Kosztorysy k ON k.id = zp.idKosztorysy
        WHERE CAST(zp.data AS DATE) = :selected_date
        AND k.id IS NOT NULL
        GROUP BY p.nrRejestracyjny, k.id
        HAVING (STUFF((SELECT DISTINCT ', ' + t.nazwa FROM TowaryKosztorysow tk JOIN Towary t ON t.id = tk.idTowary WHERE tk.idKosztorysy = k.id FOR XML PATH('')), 1, 2, '') IS NOT NULL
                OR STUFF((SELECT DISTINCT ', ' + u.nazwa FROM UslugiKosztorysow uk JOIN Uslugi u ON u.id = uk.idUslugi WHERE uk.idKosztorysy = k.id FOR XML PATH('')), 1, 2, '') IS NOT NULL)
    """)
    
    try:
        result = db.execute(query_towary, {"selected_date": selected_date})
        rows = result.fetchall()
        
        pojazdy = []
        for row in rows:
            pojazdy.append({
                'rej': row.rej,
                'wheels_summary': '',  # Puste
                'lokalizacje_summary': '',  # Puste
                'uwagi_summary': 'Brak uwag',
                'total_opony': 0,
                'depozyty_count': 0,
                'depozyty': [{  # Dodaj jeden "fake" depozyt z towarami
                    'towary_szczegoly': row.towary_szczegoly,
                    'uslugi_szczegoly': row.uslugi_szczegoly
                }],
                'opis_terminarza': ''
            })
        
        return pojazdy
        
    except Exception as e:
        print(f"❌ Błąd get_pojazdy_tylko_towary_terminarz: {e}")
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
                },
                'opis_terminarza': opona['opis_terminarza'] 
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
            'depozyty': list(vehicle['depozyty'].values()),
            'opis_terminarza': vehicle['opis_terminarza']
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
    """
    
    # ZAPYTANIE 1: Opony (tylko te z notatkami)
    query_opony = text("""
        SELECT 
            p.nrRejestracyjny as rej,
            kpo.nazwa AS name,
            ko.felgiOpon AS wheels,
            ko.rodzajDepozytu AS rodzaj_opony,
            kpo.glebokoscBieznika AS bieznik,
            RTRIM(LEFT(ko.lokalizacjeOpon, CHARINDEX('(', ko.lokalizacjeOpon + '(') - 1)) AS lokalizacja,
            kpo.wymianaOpis as opisOponyKPO,
            ko.uwagi as kartaprzechowywalniuwagi,
            ko.numer as numer_z_karty,
            nds.tresc as notatka
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
            AND EXISTS (
                SELECT 1
                FROM (
                    -- Wyciągnij część notatki przed pierwszą spacją
                    SELECT 
                        CASE 
                            WHEN CHARINDEX(' ', LTRIM(CAST(nds.tresc AS varchar(500)))) > 0
                            THEN LEFT(LTRIM(CAST(nds.tresc AS varchar(500))), CHARINDEX(' ', LTRIM(CAST(nds.tresc AS varchar(500)))) - 1)
                            ELSE LTRIM(CAST(nds.tresc AS varchar(500)))
                        END as numery_czesc
                ) parts
                CROSS APPLY (
                    -- Parsuj numery z tej części
                    SELECT 
                        LTRIM(RTRIM(
                            SUBSTRING(
                                parts.numery_czesc + '/',
                                n.number,
                                CHARINDEX('/', parts.numery_czesc + '/', n.number) - n.number
                            )
                        )) as pojedynczy_numer
                    FROM 
                        (SELECT number FROM master.dbo.spt_values WHERE type = 'P' AND number <= 50) n
                    WHERE 
                        n.number <= LEN(parts.numery_czesc)
                        AND (
                            n.number = 1 
                            OR SUBSTRING(parts.numery_czesc, n.number - 1, 1) = '/'
                        )
                        AND CHARINDEX('/', parts.numery_czesc + '/', n.number) > n.number
                ) parsed_numbers
                WHERE 
                    ISNUMERIC(parsed_numbers.pojedynczy_numer) = 1
                    AND parsed_numbers.pojedynczy_numer = LEFT(ko.numer, CHARINDEX('/', ko.numer) - 1)
            )
            AND CAST(z.dataGodzinaZgloszenia AS DATE) = :selected_date
            AND z.idStatusyZlecen = 2
    """)
    
    # ZAPYTANIE 2: Zlecenia bez notatek ale z towarami (tylko towary)
    query_tylko_towary_uslugi = text("""
        SELECT 
            p.nrRejestracyjny as rej,
            STRING_AGG(t.nazwa + ' (nr katalogowy: ' + ISNULL(t.nrKatalogowyBK, '') + ') '+ CAST(tds.ilosc AS varchar) + ' szt',', ') as towary_szczegoly,
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
        # Wykonaj oba zapytania
        opony_rows = db.execute(query_opony, {"selected_date": selected_date}).fetchall()
        towary_rows = db.execute(query_tylko_towary_uslugi, {"selected_date": selected_date}).fetchall()
        
        print(f"🔍 Opony: {len(opony_rows)}, Towary/Usługi: {len(towary_rows)}")
        
        # Słownik towarów/usług
        towary_dict = {}
        for row in towary_rows:
            towary_dict[row.rej] = {
                'towary_szczegoly': row.towary_szczegoly,
                'uslugi_szczegoly': row.uslugi_szczegoly
            }
        
        # Zbiór pojazdów z oponami
        pojazdy_z_oponami = set()
        data = []
        
        # Dodaj opony z notatkami
        for row in opony_rows:
            rej = row.rej
            pojazdy_z_oponami.add(rej)
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
        
        # Dodaj pojazdy które mają tylko towary (bez opon)
        for rej, towary_info in towary_dict.items():
            if rej not in pojazdy_z_oponami:  # Nie ma opon
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
                    "notatka": None,
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
                    'opony': depot_data['opony'],
                    'kartaprzechowywalniuwagi': depot_data['opony'][0]['kartaprzechowywalniuwagi'] if depot_data['opony'] else None

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