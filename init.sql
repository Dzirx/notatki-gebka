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

-- Tabela notatek
CREATE TABLE notatki (
    id SERIAL PRIMARY KEY,
    klient_id INTEGER REFERENCES klienci(id) ON DELETE SET NULL,
    typ_notatki VARCHAR(20) NOT NULL CHECK (typ_notatki IN ('szybka', 'pojazd')),
    tresc TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela many-to-many: notatka <-> samochody
CREATE TABLE notatki_samochody (
    id SERIAL PRIMARY KEY,
    notatka_id INTEGER REFERENCES notatki(id) ON DELETE CASCADE,
    samochod_id INTEGER REFERENCES samochody(id) ON DELETE CASCADE,
    UNIQUE(notatka_id, samochod_id)
);

-- Tabela kosztorysów
CREATE TABLE kosztorysy (
    id SERIAL PRIMARY KEY,
    notatka_id INTEGER REFERENCES notatki(id) ON DELETE CASCADE,
    numer_kosztorysu VARCHAR(50) UNIQUE,
    kwota DECIMAL(10,2),
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

-- Przykładowe dane testowe
INSERT INTO klienci (imie, nazwisko, nr_telefonu, nip, nazwa_firmy, email) VALUES
('Jan', 'Kowalski', '123-456-789', '1234567890', 'Kowalski Sp. z o.o.', 'jan@kowalski.pl'),
('Anna', 'Nowak', '987-654-321', '0987654321', 'Nowak & Partners', 'anna@nowak.pl');

INSERT INTO samochody (klient_id, nr_rejestracyjny, marka, model, rok_produkcji) VALUES
(1, 'KR12345', 'Toyota', 'Corolla', 2020),
(2, 'WA67890', 'BMW', 'X5', 2019);

INSERT INTO notatki (klient_id, typ_notatki, tresc) VALUES
(1, 'szybka', 'Klient prosi o szybki kontakt'),
(1, 'pojazd', 'Wymiana oleju w Toyocie');