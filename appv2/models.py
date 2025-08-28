# from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey, CheckConstraint
# from sqlalchemy.orm import relationship
# from sqlalchemy.sql import func
# from database import Base

# class Klient(Base):
#     __tablename__ = "klienci"
    
#     id = Column(Integer, primary_key=True, index=True)
#     nazwapelna = Column(String(255))
#     nr_telefonu = Column(String(20))
#     email = Column(String(255))
#     nip = Column(String(15))
#     nazwa_firmy = Column(String(255))
#     created_at = Column(DateTime, server_default=func.now())
#     updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
#     # Relacje
#     samochody = relationship("Samochod", back_populates="klient")

# class Pracownik(Base):
#     __tablename__ = "pracownicy"
    
#     id = Column(Integer, primary_key=True, index=True)
#     imie = Column(String(100), nullable=False)
#     nazwisko = Column(String(100), nullable=False)
#     created_at = Column(DateTime, server_default=func.now())
#     updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
#     # Relacje
#     notatki = relationship("Notatka", back_populates="pracownik")

# class Samochod(Base):
#     __tablename__ = "samochody"
    
#     id = Column(Integer, primary_key=True, index=True)
#     klient_id = Column(Integer, ForeignKey("klienci.id"), nullable=True)
#     nr_rejestracyjny = Column(String(50), unique=True)
#     marka = Column(String(100))
#     model = Column(String(100))
#     rok_produkcji = Column(Integer)
#     created_at = Column(DateTime, server_default=func.now())
#     updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
#     # Relacje
#     klient = relationship("Klient", back_populates="samochody")
#     notatki = relationship("Notatka", back_populates="samochod")

# class Notatka(Base):
#     __tablename__ = "notatki"
    
#     id = Column(Integer, primary_key=True, index=True)
#     samochod_id = Column(Integer, ForeignKey("samochody.id"), nullable=True)
#     pracownik_id = Column(Integer, ForeignKey("pracownicy.id"), nullable=True)
#     typ_notatki = Column(String(20), nullable=False)
#     tresc = Column(Text, nullable=False)
#     status = Column(String(20), default="aktywna")
#     data_dostawy = Column(DateTime, nullable=True)
#     dostawca = Column(String(555), nullable=True)
#     nr_vat_dot = Column(String(100), nullable=True)
#     miejsce_prod = Column(String(555), nullable=True)
#     created_at = Column(DateTime, server_default=func.now())
#     updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
#     __table_args__ = (
#         CheckConstraint("typ_notatki IN ('szybka', 'pojazd')", name="check_typ_notatki"),
#         CheckConstraint("status IN ('nowa', 'w_trakcie', 'zakonczona', 'dostarczony', 'klient_poinformowany')", name="check_status_notatki"),  # ZMIENIONE - zgodne z bazą
#     )
    
#     # Relacje
#     kosztorysy = relationship("Kosztorys", back_populates="notatka", cascade="all, delete-orphan")
#     samochod = relationship("Samochod", back_populates="notatki")
#     pracownik = relationship("Pracownik", back_populates="notatki")
#     zalaczniki = relationship("Zalacznik", back_populates="notatka", cascade="all, delete-orphan")
#     przypomnienia = relationship(
#         "Przypomnienie",
#         back_populates="notatka",
#         cascade="all, delete-orphan",
#         passive_deletes=True
#     )

# class Przypomnienie(Base):
#     __tablename__ = "przypomnienia"
    
#     id = Column(Integer, primary_key=True, index=True)
#     notatka_id = Column(Integer, ForeignKey("notatki.id", ondelete="CASCADE"))
#     data_przypomnienia = Column(DateTime, nullable=False)
#     wyslane = Column(Integer, default=0)  # 0=nie, 1=tak
#     created_at = Column(DateTime, server_default=func.now())
    
#     # Relacje
#     notatka = relationship("Notatka", back_populates="przypomnienia")

# class Kosztorys(Base):
#     __tablename__ = "kosztorysy"
    
#     id = Column(Integer, primary_key=True, index=True)
#     notatka_id = Column(Integer, ForeignKey("notatki.id"))
#     numer_kosztorysu = Column(String(50))
#     kwota_calkowita = Column(DECIMAL(10, 2))
#     opis = Column(Text)
#     status = Column(String(20), default="draft")
#     created_at = Column(DateTime, server_default=func.now())
#     updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
#     __table_args__ = (
#         CheckConstraint("status IN ('draft', 'approved', 'rejected')", name="check_status"),
#     )
    
#     # Relacje
#     notatka = relationship("Notatka", back_populates="kosztorysy")
#     kosztorysy_towary = relationship("KosztorysTowar", back_populates="kosztorys", cascade="all, delete-orphan")
#     kosztorysy_uslug = relationship("KosztorysUsluga", back_populates="kosztorys", cascade="all, delete-orphan")

# class Towar(Base):
#     __tablename__ = "towary"
    
#     id = Column(Integer, primary_key=True, index=True)
#     nazwa = Column(String(200), nullable=False)  
#     numer_katalogowy = Column(String(100))
#     cena = Column(DECIMAL(10, 2))
#     nazwa_producenta = Column(String(200), nullable=True)
#     opona_indeks_nosnosci = Column(String(10), nullable=True)
#     rodzaj_opony = Column(String(50), nullable=True)  # letnia, zimowa, całoroczna
#     typ_opony = Column(String(50), nullable=True)     # osobowa, dostawcza, ciężarowa
#     zrodlo = Column(String(20), default="local")
#     external_id = Column(Integer, nullable=True)
#     created_at = Column(DateTime, server_default=func.now())
    
#     __table_args__ = (
#         CheckConstraint("zrodlo IN ('local', 'integra')", name="check_towar_zrodlo"),
#     )
    
#     kosztorysy_towary = relationship("KosztorysTowar", back_populates="towar")

# class Usluga(Base):
#     __tablename__ = "uslugi"
    
#     id = Column(Integer, primary_key=True, index=True)
#     nazwa = Column(String(200), nullable=False)  
#     cena = Column(DECIMAL(10, 2))
#     zrodlo = Column(String(20), default="local")
#     external_id = Column(Integer, nullable=True)
#     created_at = Column(DateTime, server_default=func.now())
    
#     __table_args__ = (
#         CheckConstraint("zrodlo IN ('local', 'integra')", name="check_usluga_zrodlo"),
#     )
    
#     kosztorysy_uslug = relationship("KosztorysUsluga", back_populates="usluga")

# class KosztorysTowar(Base):
#     __tablename__ = "kosztorysy_towary"
    
#     id = Column(Integer, primary_key=True, index=True)
#     kosztorys_id = Column(Integer, ForeignKey("kosztorysy.id", ondelete="CASCADE"))
#     towar_id = Column(Integer, ForeignKey("towary.id"))
#     ilosc = Column(DECIMAL(10, 2), nullable=False)
#     cena = Column(DECIMAL(10, 2), nullable=False)
#     created_at = Column(DateTime, server_default=func.now())
    
#     kosztorys = relationship("Kosztorys", back_populates="kosztorysy_towary")
#     towar = relationship("Towar", back_populates="kosztorysy_towary")

# class KosztorysUsluga(Base):
#     __tablename__ = "kosztorysy_uslug"
    
#     id = Column(Integer, primary_key=True, index=True)
#     kosztorys_id = Column(Integer, ForeignKey("kosztorysy.id", ondelete="CASCADE"))
#     uslugi_id = Column(Integer, ForeignKey("uslugi.id"))
#     ilosc = Column(DECIMAL(10, 2), nullable=False)
#     cena = Column(DECIMAL(10, 2), nullable=False)
#     created_at = Column(DateTime, server_default=func.now())
    
#     kosztorys = relationship("Kosztorys", back_populates="kosztorysy_uslug")
#     usluga = relationship("Usluga", back_populates="kosztorysy_uslug")

# class Zalacznik(Base):
#     __tablename__ = "zalaczniki"
    
#     id = Column(Integer, primary_key=True, index=True)
#     notatka_id = Column(Integer, ForeignKey("notatki.id", ondelete="CASCADE"), nullable=False)
#     nazwa_pliku = Column(String(255), nullable=False)  # oryginalna nazwa z rozszerzeniem
#     rozmiar = Column(Integer, nullable=False)  # w bajtach
#     typ_mime = Column(String(100), nullable=False)
#     sciezka = Column(String(500), nullable=False)  # np. "notatnik/uploads/2024/12/uuid.pdf"
#     created_at = Column(DateTime, server_default=func.now())
    
#     # Relacje
#     notatka = relationship("Notatka", back_populates="zalaczniki")


### TO JEST MSQL
from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey, CheckConstraint, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Klient(Base):
    __tablename__ = "klienci"
    
    id = Column(Integer, primary_key=True, index=True)
    nazwapelna = Column(String(255))
    nr_telefonu = Column(String(20))
    email = Column(String(255))
    nip = Column(String(15))
    nazwa_firmy = Column(String(255))
    created_at = Column(DateTime, server_default=func.getdate())
    updated_at = Column(DateTime, server_default=func.getdate(), onupdate=func.getdate())
    
    # Relacje
    samochody = relationship("Samochod", back_populates="klient")

class Pracownik(Base):
    __tablename__ = "pracownicy"
    
    id = Column(Integer, primary_key=True, index=True)
    imie = Column(String(100), nullable=False)
    nazwisko = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.getdate())
    updated_at = Column(DateTime, server_default=func.getdate(), onupdate=func.getdate())
    
    # Relacje
    notatki = relationship("Notatka", back_populates="pracownik")

class Samochod(Base):
    __tablename__ = "samochody"
    
    id = Column(Integer, primary_key=True, index=True)
    klient_id = Column(Integer, ForeignKey("klienci.id"), nullable=True)
    nr_rejestracyjny = Column(String(50), unique=True)
    marka = Column(String(100))
    model = Column(String(100))
    rok_produkcji = Column(Integer)
    created_at = Column(DateTime, server_default=func.getdate())
    updated_at = Column(DateTime, server_default=func.getdate(), onupdate=func.getdate())
    
    # Relacje
    klient = relationship("Klient", back_populates="samochody")
    notatki = relationship("Notatka", back_populates="samochod")

class Notatka(Base):
    __tablename__ = "notatki"
    
    id = Column(Integer, primary_key=True, index=True)
    samochod_id = Column(Integer, ForeignKey("samochody.id"), nullable=True)
    pracownik_id = Column(Integer, ForeignKey("pracownicy.id"), nullable=True)
    typ_notatki = Column(String(20), nullable=False)
    tresc = Column(Text, nullable=False)
    status = Column(String(20), default="nowa")
    data_dostawy = Column(DateTime, nullable=True)
    dostawca = Column(String(255), nullable=True)
    nr_vat_dot = Column(String(100), nullable=True)
    miejsce_prod = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.getdate())
    updated_at = Column(DateTime, server_default=func.getdate(), onupdate=func.getdate())
    
    __table_args__ = (
        CheckConstraint("typ_notatki IN ('szybka', 'pojazd')", name="check_typ_notatki"),
        CheckConstraint("status IN ('nowa', 'w_trakcie', 'zakonczona', 'dostarczony', 'klient_poinformowany')", name="check_status_notatki"),
    )
    
    # Relacje
    kosztorysy = relationship("Kosztorys", back_populates="notatka", cascade="all, delete-orphan")
    samochod = relationship("Samochod", back_populates="notatki")
    pracownik = relationship("Pracownik", back_populates="notatki")
    zalaczniki = relationship("Zalacznik", back_populates="notatka", cascade="all, delete-orphan")
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
    wyslane = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.getdate())
    
    # Relacje
    notatka = relationship("Notatka", back_populates="przypomnienia")

class Kosztorys(Base):
    __tablename__ = "kosztorysy"
    
    id = Column(Integer, primary_key=True, index=True)
    notatka_id = Column(Integer, ForeignKey("notatki.id"))
    numer_kosztorysu = Column(String(50))
    kwota_calkowita = Column(DECIMAL(10, 2))
    opis = Column(Text)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, server_default=func.getdate())
    updated_at = Column(DateTime, server_default=func.getdate(), onupdate=func.getdate())
    
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'approved', 'rejected')", name="check_status"),
    )
    
    # Relacje
    notatka = relationship("Notatka", back_populates="kosztorysy")
    kosztorysy_towary = relationship("KosztorysTowar", back_populates="kosztorys", cascade="all, delete-orphan")
    kosztorysy_uslug = relationship("KosztorysUsluga", back_populates="kosztorys", cascade="all, delete-orphan")

class Towar(Base):
    __tablename__ = "towary"
    
    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String(200), nullable=False)
    numer_katalogowy = Column(String(100))
    cena = Column(DECIMAL(10, 2))
    nazwa_producenta = Column(String(200), nullable=True)
    opona_indeks_nosnosci = Column(String(10), nullable=True)
    rodzaj_opony = Column(String(50), nullable=True)
    typ_opony = Column(String(50), nullable=True)
    zrodlo = Column(String(20), default="local")
    external_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.getdate())
    
    __table_args__ = (
        CheckConstraint("zrodlo IN ('local', 'integra')", name="check_towar_zrodlo"),
    )
    
    kosztorysy_towary = relationship("KosztorysTowar", back_populates="towar")

class Usluga(Base):
    __tablename__ = "uslugi"
    
    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String(200), nullable=False)
    cena = Column(DECIMAL(10, 2))
    zrodlo = Column(String(20), default="local")
    external_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.getdate())
    
    __table_args__ = (
        CheckConstraint("zrodlo IN ('local', 'integra')", name="check_usluga_zrodlo"),
    )
    
    kosztorysy_uslug = relationship("KosztorysUsluga", back_populates="usluga")

class KosztorysTowar(Base):
    __tablename__ = "kosztorysy_towary"
    
    id = Column(Integer, primary_key=True, index=True)
    kosztorys_id = Column(Integer, ForeignKey("kosztorysy.id", ondelete="CASCADE"))
    towar_id = Column(Integer, ForeignKey("towary.id"))
    ilosc = Column(DECIMAL(10, 2), nullable=False)
    cena = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.getdate())
    
    kosztorys = relationship("Kosztorys", back_populates="kosztorysy_towary")
    towar = relationship("Towar", back_populates="kosztorysy_towary")

class KosztorysUsluga(Base):
    __tablename__ = "kosztorysy_uslug"
    
    id = Column(Integer, primary_key=True, index=True)
    kosztorys_id = Column(Integer, ForeignKey("kosztorysy.id", ondelete="CASCADE"))
    uslugi_id = Column(Integer, ForeignKey("uslugi.id"))
    ilosc = Column(DECIMAL(10, 2), nullable=False)
    cena = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.getdate())
    
    kosztorys = relationship("Kosztorys", back_populates="kosztorysy_uslug")
    usluga = relationship("Usluga", back_populates="kosztorysy_uslug")

class Zalacznik(Base):
    __tablename__ = "zalaczniki"
    
    id = Column(Integer, primary_key=True, index=True)
    notatka_id = Column(Integer, ForeignKey("notatki.id", ondelete="CASCADE"), nullable=False)
    nazwa_pliku = Column(String(255), nullable=False)
    rozmiar = Column(Integer, nullable=False)
    typ_mime = Column(String(100), nullable=False)
    dane = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, server_default=func.getdate())
    
    # Relacje
    notatka = relationship("Notatka", back_populates="zalaczniki")