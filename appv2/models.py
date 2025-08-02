from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Klient(Base):
    __tablename__ = "klienci"
    
    id = Column(Integer, primary_key=True, index=True)
    nazwapelna = Column(String(255))
    nr_telefonu = Column(String(20))
    nip = Column(String(15))
    nazwa_firmy = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relacje
    samochody = relationship("Samochod", back_populates="klient")

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
    kosztorysy = relationship("Kosztorys", back_populates="notatka")
    samochod = relationship("Samochod", back_populates="notatki")
    przypomnienia = relationship(
        "Przypomnienie",
        back_populates="notatka",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

class Przypomnienie(Base):
    __tablename__ = "przypomnienia"
    
    id = Column(Integer, primary_key=True, index=True)
    notatka_id = Column(Integer, ForeignKey("notatki.id", ondelete="CASCADE"))
    data_przypomnienia = Column(DateTime, nullable=False)
    wyslane = Column(Integer, default=0)  # 0=nie, 1=tak
    created_at = Column(DateTime, server_default=func.now())
    
    # Relacje
    notatka = relationship("Notatka", back_populates="przypomnienia")

class Kosztorys(Base):
    __tablename__ = "kosztorysy"
    
    id = Column(Integer, primary_key=True, index=True)
    notatka_id = Column(Integer, ForeignKey("notatki.id"))
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
    notatka = relationship("Notatka", back_populates="kosztorysy")
    kosztorysy_towary = relationship("KosztorysTowar", back_populates="kosztorys")
    kosztorysy_uslug = relationship("KosztorysUsluga", back_populates="kosztorys")

class Towar(Base):
    __tablename__ = "towary"
    
    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String(200), nullable=False)  
    cena = Column(DECIMAL(10, 2))                
    created_at = Column(DateTime, server_default=func.now())
    
    kosztorysy_towary = relationship("KosztorysTowar", back_populates="towar")

class Usluga(Base):
    __tablename__ = "uslugi"
    
    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String(200), nullable=False)  
    cena = Column(DECIMAL(10, 2))
    created_at = Column(DateTime, server_default=func.now())
    
    kosztorysy_uslug = relationship("KosztorysUsluga", back_populates="usluga")

class KosztorysTowar(Base):
    __tablename__ = "kosztorysy_towary"
    
    id = Column(Integer, primary_key=True, index=True)
    kosztorys_id = Column(Integer, ForeignKey("kosztorysy.id"))
    towar_id = Column(Integer, ForeignKey("towary.id"))
    ilosc = Column(DECIMAL(10, 2), nullable=False)
    cena = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    kosztorys = relationship("Kosztorys", back_populates="kosztorysy_towary")
    towar = relationship("Towar", back_populates="kosztorysy_towary")

class KosztorysUsluga(Base):
    __tablename__ = "kosztorysy_uslug"
    
    id = Column(Integer, primary_key=True, index=True)
    kosztorys_id = Column(Integer, ForeignKey("kosztorysy.id"))
    uslugi_id = Column(Integer, ForeignKey("uslugi.id"))
    ilosc = Column(DECIMAL(10, 2), nullable=False)
    cena = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    kosztorys = relationship("Kosztorys", back_populates="kosztorysy_uslug")
    usluga = relationship("Usluga", back_populates="kosztorysy_uslug")