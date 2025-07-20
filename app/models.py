from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Klient(Base):
    __tablename__ = "klienci"
    
    id = Column(Integer, primary_key=True, index=True)
    imie = Column(String(100))
    nazwisko = Column(String(100))
    nr_telefonu = Column(String(20))
    nip = Column(String(15))
    nazwa_firmy = Column(String(255))
    email = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relacje
    samochody = relationship("Samochod", back_populates="klient")
    kosztorysy = relationship("Kosztorys", back_populates="klient")

class Samochod(Base):
    __tablename__ = "samochody"
    
    id = Column(Integer, primary_key=True, index=True)
    klient_id = Column(Integer, ForeignKey("klienci.id"), nullable=True)
    nr_rejestracyjny = Column(String(50), unique=True)
    marka = Column(String(100))
    model = Column(String(100))
    rok_produkcji = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relacje
    klient = relationship("Klient", back_populates="samochody")
    notatki = relationship("Notatka", back_populates="samochod")

class Notatka(Base):
    __tablename__ = "notatki"
    
    id = Column(Integer, primary_key=True, index=True)
    samochod_id = Column(Integer, ForeignKey("samochody.id"), nullable=True)
    typ_notatki = Column(String(20), nullable=False)
    tresc = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("typ_notatki IN ('szybka', 'pojazd')", name="check_typ_notatki"),
    )
    
    # Relacje
    samochod = relationship("Samochod", back_populates="notatki")

class Kosztorys(Base):
    __tablename__ = "kosztorysy"
    
    id = Column(Integer, primary_key=True, index=True)
    klient_id = Column(Integer, ForeignKey("klienci.id"))
    numer_kosztorysu = Column(String(50), unique=True)
    kwota_calkowita = Column(DECIMAL(10, 2))
    opis = Column(Text)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'approved', 'rejected')", name="check_status"),
    )
    
    # Relacje
    klient = relationship("Klient", back_populates="kosztorysy")
    kosztorysy_towary = relationship("KosztorysTowar", back_populates="kosztorys")

class Towar(Base):
    __tablename__ = "towary"
    
    id = Column(Integer, primary_key=True, index=True)
    kod = Column(String(50), unique=True, nullable=False)
    nazwa = Column(String(200), nullable=False)
    cena_zakupu = Column(DECIMAL(10, 2))
    cena_sprzedazy = Column(DECIMAL(10, 2))
    stan_magazynowy = Column(Integer, default=0)
    jednostka = Column(String(20), default='szt')
    kategoria = Column(String(100))
    opis = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    kosztorysy_towary = relationship("KosztorysTowar", back_populates="towar")

class KosztorysTowar(Base):
    __tablename__ = "kosztorysy_towary"
    
    id = Column(Integer, primary_key=True, index=True)
    kosztorys_id = Column(Integer, ForeignKey("kosztorysy.id"))
    towar_id = Column(Integer, ForeignKey("towary.id"))
    ilosc = Column(DECIMAL(10, 2), nullable=False)
    cena_jednostkowa = Column(DECIMAL(10, 2), nullable=False)
    wartosc = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    kosztorys = relationship("Kosztorys", back_populates="kosztorysy_towary")
    towar = relationship("Towar", back_populates="kosztorysy_towary")