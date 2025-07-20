-- Inicjalizacja bazy danych Notatnik Gębka - POPRAWNA STRUKTURA

-- Tabela klientów
CREATE TABLE klienci (
    id SERIAL PRIMARY KEY,
    imie VARCHAR(100),
    nazwisko VARCHAR(100),
    nr_telefonu VARCHAR(20),
    nip VARCHAR(15),
    nazwa_firmy VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela samochodów
CREATE TABLE samochody (
    id SERIAL PRIMARY KEY,
    klient_id INTEGER REFERENCES klienci(id) ON DELETE SET NULL,
    nr_rejestracyjny VARCHAR(50) UNIQUE,
    marka VARCHAR(100),
    model VARCHAR(100),
    rok_produkcji INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela notatek - ZMIENIONA: samochod_id zamiast klient_id
CREATE TABLE notatki (
    id SERIAL PRIMARY KEY,
    samochod_id INTEGER REFERENCES samochody(id) ON DELETE SET NULL, -- NOTATKA DO SAMOCHODU
    typ_notatki VARCHAR(20) NOT NULL CHECK (typ_notatki IN ('szybka', 'pojazd')),
    tresc TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USUNIĘTO tabelę notatki_samochody - niepotrzebna!

-- Tabela kosztorysów - ZMIENIONA: klient_id zamiast notatka_id
CREATE TABLE kosztorysy (
    id SERIAL PRIMARY KEY,
    klient_id INTEGER REFERENCES klienci(id) ON DELETE CASCADE, -- KOSZTORYS DLA KLIENTA
    numer_kosztorysu VARCHAR(50) UNIQUE,
    kwota_calkowita DECIMAL(10,2) DEFAULT 0.00,
    opis TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela przypomnień - bez zmian
CREATE TABLE przypomnienia (
    id SERIAL PRIMARY KEY,
    notatka_id INTEGER NOT NULL REFERENCES notatki(id) ON DELETE CASCADE,
    data_przypomnienia TIMESTAMP NOT NULL,
    wyslane INTEGER DEFAULT 0 CHECK (wyslane IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela towarów - bez zmian
CREATE TABLE towary (
    id SERIAL PRIMARY KEY,
    kod VARCHAR(50) UNIQUE NOT NULL,
    nazwa VARCHAR(200) NOT NULL,
    cena_zakupu DECIMAL(10,2),
    cena_sprzedazy DECIMAL(10,2),
    stan_magazynowy INTEGER DEFAULT 0,
    jednostka VARCHAR(20) DEFAULT 'szt',
    kategoria VARCHAR(100),
    opis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela pozycji kosztorysowych - bez zmian
CREATE TABLE kosztorysy_towary (
    id SERIAL PRIMARY KEY,
    kosztorys_id INTEGER REFERENCES kosztorysy(id) ON DELETE CASCADE,
    towar_id INTEGER REFERENCES towary(id),
    ilosc DECIMAL(10,2) NOT NULL,
    cena_jednostkowa DECIMAL(10,2) NOT NULL,
    wartosc DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Przykładowe dane
INSERT INTO klienci (imie, nazwisko, nr_telefonu, nip, nazwa_firmy, email) VALUES
('Jan', 'Kowalski', '123-456-789', '1234567890', 'Kowalski Sp. z o.o.', 'jan@kowalski.pl'),
('Anna', 'Nowak', '987-654-321', '0987654321', 'Nowak & Partners', 'anna@nowak.pl'),
('Piotr', 'Wiśniewski', '555-666-777', NULL, NULL, 'piotr@email.com');

INSERT INTO samochody (klient_id, nr_rejestracyjny, marka, model, rok_produkcji) VALUES
(1, 'WAW12345', 'Toyota', 'Corolla', 2020),
(2, 'KRA98765', 'BMW', 'X5', 2019),
(3, 'GDA55555', 'Audi', 'A4', 2021);

-- ZMIENIONE: notatki teraz mają samochod_id
INSERT INTO notatki (samochod_id, typ_notatki, tresc) VALUES
(NULL, 'szybka', 'Sprawdzić dostępność części do BMW'), -- szybka notatka bez samochodu
(1, 'pojazd', 'Wymiana oleju w Toyocie WAW12345'),      -- notatka do Toyoty
(2, 'pojazd', 'Przegląd techniczny BMW X5'),            -- notatka do BMW
(3, 'pojazd', 'Diagnostyka układu zapłonowego Audi'),   -- notatka do Audi
(NULL, 'szybka', 'Zamówić olej do magazynu');           -- kolejna szybka notatka

INSERT INTO towary (kod, nazwa, cena_zakupu, cena_sprzedazy, stan_magazynowy, kategoria) VALUES 
('OL001', 'Olej silnikowy 5W30', 45.00, 65.00, 50, 'Oleje'),
('FIL001', 'Filtr oleju', 12.00, 18.00, 30, 'Filtry'),
('KLO001', 'Klocki hamulcowe przód', 80.00, 120.00, 20, 'Hamulce'),
('TAR001', 'Tarcze hamulcowe przód', 150.00, 220.00, 15, 'Hamulce'),
('SWI001', 'Świeca zapłonowa', 8.00, 15.00, 100, 'Zapłon');

-- ZMIENIONE: kosztorysy teraz dla klientów
INSERT INTO kosztorysy (klient_id, numer_kosztorysu, kwota_calkowita, opis) VALUES 
(1, 'KOS/2024/001', 343.00, 'Serwis Toyota Corolla - wymiana oleju'),
(2, 'KOS/2024/002', 560.00, 'Naprawa BMW X5 - hamulce'),
(2, 'KOS/2024/003', 120.00, 'BMW X5 - przegląd podstawowy'),
(1, 'KOS/2024/004', 85.00, 'Toyota - drobne naprawy');

INSERT INTO kosztorysy_towary (kosztorys_id, towar_id, ilosc, cena_jednostkowa, wartosc) VALUES 
-- Kosztorys 1 (Toyota - wymiana oleju)
(1, 1, 5.0, 65.00, 325.00),  -- Olej 5L
(1, 2, 1.0, 18.00, 18.00),   -- Filtr oleju

-- Kosztorys 2 (BMW - hamulce)
(2, 3, 1.0, 120.00, 120.00), -- Klocki hamulcowe
(2, 4, 2.0, 220.00, 440.00), -- Tarcze hamulcowe x2

-- Kosztorys 3 (BMW - przegląd)
(3, 5, 4.0, 15.00, 60.00),   -- Świece zapłonowe x4
(3, 2, 1.0, 18.00, 18.00),   -- Filtr oleju
(3, 1, 4.0, 65.00, 260.00),  -- Olej 4L

-- Kosztorys 4 (Toyota - drobne)
(4, 5, 4.0, 15.00, 60.00),   -- Świece zapłonowe
(4, 2, 1.0, 18.00, 18.00);   -- Filtr oleju

-- Dodaj przypomnienia do notatek
INSERT INTO przypomnienia (notatka_id, data_przypomnienia, wyslane) VALUES
(2, '2024-08-15 10:00:00', 0), -- Przypomnienie o następnej wymianie oleju Toyota
(3, '2024-12-20 09:00:00', 0), -- Przypomnienie o następnym przeglądzie BMW
(4, '2024-09-01 14:30:00', 0); -- Przypomnienie o kontroli Audi

-- Dodatkowe indeksy dla wydajności
CREATE INDEX idx_notatki_samochod ON notatki(samochod_id);
CREATE INDEX idx_kosztorysy_klient ON kosztorysy(klient_id);
CREATE INDEX idx_przypomnienia_data ON przypomnienia(data_przypomnienia);
CREATE INDEX idx_samochody_rejestracja ON samochody(nr_rejestracyjny);