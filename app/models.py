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
    
    samochody = relationship("Samochod", back_populates="klient")
    notatki = relationship("Notatka", back_populates="klient")

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
    
    klient = relationship("Klient", back_populates="samochody")
    notatki_samochody = relationship("NotatkaSamochod", back_populates="samochod")

class Notatka(Base):
    __tablename__ = "notatki"
    
    id = Column(Integer, primary_key=True, index=True)
    klient_id = Column(Integer, ForeignKey("klienci.id"), nullable=True)
    typ_notatki = Column(String(20), nullable=False)
    tresc = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("typ_notatki IN ('szybka', 'pojazd')", name="check_typ_notatki"),
    )
    
    klient = relationship("Klient", back_populates="notatki")
    kosztorysy = relationship("Kosztorys", back_populates="notatka")
    notatki_samochody = relationship("NotatkaSamochod", back_populates="notatka")

class NotatkaSamochod(Base):
    __tablename__ = "notatki_samochody"
    
    id = Column(Integer, primary_key=True, index=True)
    notatka_id = Column(Integer, ForeignKey("notatki.id"))
    samochod_id = Column(Integer, ForeignKey("samochody.id"))
    
    notatka = relationship("Notatka", back_populates="notatki_samochody")
    samochod = relationship("Samochod", back_populates="notatki_samochody")

class Przypomnienie(Base):
    __tablename__ = "przypomnienia"
    
    id = Column(Integer, primary_key=True, index=True)
    notatka_id = Column(Integer, ForeignKey("notatki.id"))
    data_przypomnienia = Column(DateTime, nullable=False)
    wyslane = Column(Integer, default=0)  # 0=nie, 1=tak
    created_at = Column(DateTime, server_default=func.now())
    
    notatka = relationship("Notatka")

class Kosztorys(Base):
    __tablename__ = "kosztorysy"
    
    id = Column(Integer, primary_key=True, index=True)
    notatka_id = Column(Integer, ForeignKey("notatki.id"))
    numer_kosztorysu = Column(String(50), unique=True)
    kwota = Column(DECIMAL(10, 2))
    opis = Column(Text)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'approved', 'rejected')", name="check_status"),
    )
    
    notatka = relationship("Notatka", back_populates="kosztorysy")