-- Inicjalizacja bazy danych Notatnik Gębka - POPRAWNA STRUKTURA

CREATE TABLE klienci (
    id SERIAL PRIMARY KEY,
    nazwapelna VARCHAR(255),
    nr_telefonu VARCHAR(20),
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

CREATE TABLE notatki (
    id SERIAL PRIMARY KEY,
    samochod_id INTEGER REFERENCES samochody(id) ON DELETE SET NULL,
    typ_notatki VARCHAR(20) NOT NULL CHECK (typ_notatki IN ('szybka', 'pojazd')),
    tresc TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'nowa' CHECK (status IN ('nowa', 'w_trakcie', 'zakonczona', 'anulowana', 'oczekuje')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kosztorysy (
    id SERIAL PRIMARY KEY,
    notatka_id INTEGER REFERENCES notatki(id) ON DELETE CASCADE,
    numer_kosztorysu VARCHAR(50) UNIQUE,
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
    cena DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE uslugi (
    id SERIAL PRIMARY KEY,
    nazwa VARCHAR(200) NOT NULL,
    cena DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

INSERT INTO klienci (nazwapelna, nr_telefonu, nip, nazwa_firmy) VALUES
('Jan Kowalski', '123-456-789', '1234567890', 'Kowalski Sp. z o.o.'),
('Anna Nowak', '987-654-321', '0987654321', 'Nowak & Partners'),
('Piotr Wiśniewski', '555-666-777', NULL, NULL);

INSERT INTO samochody (klient_id, nr_rejestracyjny, marka, model, rok_produkcji) VALUES
(1, 'WAW12345', 'Toyota', 'Corolla', 2020),
(2, 'KRA98765', 'BMW', 'X5', 2019),
(3, 'GDA55555', 'Audi', 'A4', 2021);

INSERT INTO notatki (samochod_id, typ_notatki, tresc) VALUES
(NULL, 'szybka', 'Sprawdzić dostępność części do BMW'),
(1, 'pojazd', 'Wymiana oleju w Toyocie WAW12345'),
(2, 'pojazd', 'Przegląd techniczny BMW X5'),
(3, 'pojazd', 'Diagnostyka układu zapłonowego Audi'),
(NULL, 'szybka', 'Zamówić olej do magazynu');

INSERT INTO towary (nazwa, cena) VALUES 
('Olej silnikowy 5W30', 65.00),
('Filtr oleju', 18.00),
('Klocki hamulcowe przód', 120.00),
('Tarcze hamulcowe przód', 220.00),
('Świeca zapłonowa', 15.00);

INSERT INTO uslugi (nazwa, cena) VALUES 
('Wymiana oleju silnikowego', 80.00),
('Przegląd techniczny', 150.00),
('Diagnostyka komputerowa', 120.00),
('Wymiana klocków hamulcowych', 200.00),
('Naprawa układu zapłonowego', 300.00);

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