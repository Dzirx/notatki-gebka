-- Inicjalizacja bazy danych Notatnik Gębka - POPRAWNA STRUKTURA

CREATE TABLE klienci (
    id SERIAL PRIMARY KEY,
    nazwapelna VARCHAR(255),
    nr_telefonu VARCHAR(20),
    email VARCHAR(255),
    nip VARCHAR(15),
    nazwa_firmy VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE pracownicy (
    id SERIAL PRIMARY KEY,
    imie VARCHAR(100) NOT NULL,
    nazwisko VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notatki (
    id SERIAL PRIMARY KEY,
    samochod_id INTEGER REFERENCES samochody(id) ON DELETE SET NULL,
    pracownik_id INTEGER REFERENCES pracownicy(id) ON DELETE SET NULL,
    typ_notatki VARCHAR(20) NOT NULL CHECK (typ_notatki IN ('szybka', 'pojazd')),
    tresc TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'nowa' CHECK (status IN ('nowa', 'w_trakcie', 'zakonczona', 'dostarczony', 'klient_poinformowany')),
    data_dostawy TIMESTAMP,
    dostawca VARCHAR(255),
    nr_vat_dot VARCHAR(100),
    miejsce_prod VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kosztorysy (
    id SERIAL PRIMARY KEY,
    notatka_id INTEGER REFERENCES notatki(id) ON DELETE CASCADE,
    numer_kosztorysu VARCHAR(50),
    kwota_calkowita DECIMAL(10,2) DEFAULT 0.00,
    opis TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE przypomnienia (
    id SERIAL PRIMARY KEY,
    notatka_id INTEGER NOT NULL REFERENCES notatki(id) ON DELETE CASCADE,
    data_przypomnienia TIMESTAMP NOT NULL,
    wyslane INTEGER DEFAULT 0 CHECK (wyslane IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE towary (
    id SERIAL PRIMARY KEY,
    nazwa VARCHAR(200) NOT NULL,
    numer_katalogowy VARCHAR(100),
    cena DECIMAL(10,2),
    nazwa_producenta VARCHAR(200),
    opona_indeks_nosnosci VARCHAR(10),
    rodzaj_opony VARCHAR(50),
    typ_opony VARCHAR(50),
    zrodlo VARCHAR(20) DEFAULT 'local' CHECK (zrodlo IN ('local', 'integra')),
    external_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX idx_towary_numer_katalogowy ON towary(numer_katalogowy);
CREATE INDEX idx_towary_nazwa ON towary(nazwa);
CREATE INDEX idx_towary_external ON towary(external_id, zrodlo);
CREATE INDEX idx_towary_zrodlo ON towary(zrodlo);

CREATE TABLE uslugi (
    id SERIAL PRIMARY KEY,
    nazwa VARCHAR(200) NOT NULL,
    cena DECIMAL(10,2),
    zrodlo VARCHAR(20) DEFAULT 'local' CHECK (zrodlo IN ('local', 'integra')),
    external_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeksy dla usług
CREATE INDEX idx_uslugi_nazwa ON uslugi(nazwa);
CREATE INDEX idx_uslugi_external ON uslugi(external_id, zrodlo);
CREATE INDEX idx_uslugi_zrodlo ON uslugi(zrodlo);

CREATE TABLE kosztorysy_towary (
    id SERIAL PRIMARY KEY,
    kosztorys_id INTEGER REFERENCES kosztorysy(id) ON DELETE CASCADE,
    towar_id INTEGER REFERENCES towary(id),
    ilosc DECIMAL(10,2) NOT NULL,
    cena DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kosztorysy_uslug (
    id SERIAL PRIMARY KEY,
    kosztorys_id INTEGER REFERENCES kosztorysy(id) ON DELETE CASCADE,
    uslugi_id INTEGER REFERENCES uslugi(id),
    ilosc DECIMAL(10,2) NOT NULL,
    cena  DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zalaczniki (
    id SERIAL PRIMARY KEY,
    notatka_id INTEGER REFERENCES notatki(id) ON DELETE CASCADE NOT NULL,
    nazwa_pliku VARCHAR(255) NOT NULL,
    rozmiar INTEGER NOT NULL,
    typ_mime VARCHAR(100) NOT NULL,
    sciezka VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO klienci (nazwapelna, nr_telefonu, email, nip, nazwa_firmy) VALUES
('Jan Kowalski', '123-456-789', 'jan.kowalski@example.com', '1234567890', 'Kowalski Sp. z o.o.'),
('Anna Nowak', '987-654-321', 'anna.nowak@nowakpartners.pl', '0987654321', 'Nowak & Partners'),
('Piotr Wiśniewski', '555-666-777', 'piotr.wisniewski@gmail.com', NULL, NULL);

INSERT INTO samochody (klient_id, nr_rejestracyjny, marka, model, rok_produkcji) VALUES
(1, 'WAW12345', 'Toyota', 'Corolla', 2020),
(2, 'KRA98765', 'BMW', 'X5', 2019),
(3, 'GDA55555', 'Audi', 'A4', 2021);

INSERT INTO pracownicy (imie, nazwisko) VALUES
('Jan', 'Kowalski'),
('Anna', 'Nowak'),
('Piotr', 'Wiśniewski'),
('Marek', 'Zalewski');

INSERT INTO notatki (samochod_id, pracownik_id, typ_notatki, tresc) VALUES
(NULL, 1, 'szybka', 'Sprawdzić dostępność części do BMW'),
(1, 2, 'pojazd', 'Wymiana oleju w Toyocie WAW12345'),
(2, 3, 'pojazd', 'Przegląd techniczny BMW X5'),
(3, 1, 'pojazd', 'Diagnostyka układu zapłonowego Audi'),
(NULL, NULL, 'szybka', 'Zamówić olej do magazynu');

-- Własne towary (zrodlo = 'local', external_id = NULL)
INSERT INTO towary (nazwa, numer_katalogowy, cena, nazwa_producenta, opona_indeks_nosnosci, rodzaj_opony, typ_opony, zrodlo, external_id) VALUES 
('Olej silnikowy 5W30', 'OL-5W30-5L', 65.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Filtr oleju', 'FO-1234', 18.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Klocki hamulcowe przód', 'KH-FR-567', 120.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Tarcze hamulcowe przód', 'TH-FR-890', 220.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Świeca zapłonowa', 'SZ-NGK-123', 15.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Amortyzator przód', 'AM-PR-456', 180.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Pasek rozrządu', 'PR-TIM-789', 95.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Chłodnica silnika', 'CH-RAD-321', 350.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Akumulator 12V 60Ah', 'AK-60AH-12V', 280.00, NULL, NULL, NULL, NULL, 'local', NULL),
('Opony letnie 195/65R15', 'OP-LET-195', 320.00, 'Michelin', '91H', 'letnia', 'osobowa', 'local', NULL),

-- Przykładowe towary z Integry (zrodlo = 'integra', external_id = ID z SQL Server)
('Olej Shell Helix 5W30', 'SH-5W30-4L', 72.50, 'Shell', NULL, NULL, NULL, 'integra', 123),
('Filtr Mann W712/52', 'MN-W712', 22.80, 'Mann', NULL, NULL, NULL, 'integra', 124),
('Klocki Brembo P85020', 'BR-P85020', 135.60, 'Brembo', NULL, NULL, NULL, 'integra', 125),
('Opona Michelin 205/55R16', 'MI-205-55-16', 450.00, 'Michelin', '91V', 'letnia', 'osobowa', 'integra', 126),
('Opona Bridgestone 225/45R17', 'BR-225-45-17', 520.00, 'Bridgestone', '94W', 'zimowa', 'osobowa', 'integra', 127),
('Opona Continental 195/75R16', 'CO-195-75-16', 380.00, 'Continental', '107R', 'całoroczna', 'dostawcza', 'integra', 128);

-- Własne usługi (zrodlo = 'local', external_id = NULL)
INSERT INTO uslugi (nazwa, cena, zrodlo, external_id) VALUES 
('Wymiana oleju silnikowego', 80.00, 'local', NULL),
('Przegląd techniczny', 150.00, 'local', NULL),
('Diagnostyka komputerowa', 120.00, 'local', NULL),
('Wymiana klocków hamulcowych', 200.00, 'local', NULL),
('Naprawa układu zapłonowego', 300.00, 'local', NULL),

-- Przykładowe usługi z Integry (zrodlo = 'integra', external_id = ID z SQL Server)
('Wymiana oleju Express', 65.00, 'integra', 201),
('Diagnostyka OBD2', 90.00, 'integra', 202),
('Wymiana klocków + tarcz', 350.00, 'integra', 203);

INSERT INTO kosztorysy (notatka_id, numer_kosztorysu, kwota_calkowita, opis) VALUES 
(2, 'KOS/2024/001', 343.00, 'Wymiana oleju Toyota WAW12345'),
(3, 'KOS/2024/002', 150.00, 'Przegląd techniczny BMW X5'),
(4, 'KOS/2024/003', 420.00, 'Diagnostyka Audi A4'),
(1, 'KOS/2024/004', 65.00, 'Części BMW - zamówienie');

INSERT INTO kosztorysy_towary (kosztorys_id, towar_id, ilosc, cena) VALUES 
(1, 1, 5.0, 65.00),
(1, 2, 1.0, 18.00),
(3, 5, 4.0, 15.00);

INSERT INTO kosztorysy_uslug (kosztorys_id, uslugi_id, ilosc, cena) VALUES
(1, 1, 1.0, 80.00),
(2, 2, 1.0, 150.00),
(3, 3, 1.0, 120.00),
(3, 5, 1.0, 300.00);

INSERT INTO przypomnienia (notatka_id, data_przypomnienia, wyslane) VALUES
(2, '2024-08-15 10:00:00', 0),
(3, '2024-12-20 09:00:00', 0),
(4, '2024-09-01 14:30:00', 0);

CREATE INDEX idx_notatki_samochod ON notatki(samochod_id);
CREATE INDEX idx_kosztorysy_notatka ON kosztorysy(notatka_id);
CREATE INDEX idx_przypomnienia_data ON przypomnienia(data_przypomnienia);
CREATE INDEX idx_samochody_rejestracja ON samochody(nr_rejestracyjny);