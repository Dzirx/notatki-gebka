// === MODULES/NOTATNIK/STATIC/JS/NOTE-ADD.JS ===
// Funkcje dodawania nowych notatek

console.log('📝 Moduł note-add załadowany');
let isLoadingIntegra = false;
let klientSearchTimeout;
let vehicleCheckTimeout;
let vehicleSearchTimeout;

// ZMIENNE GLOBALNE DLA DODAWANIA
window.selectedTowary = [];
window.selectedUslugi = [];
window.integraKosztorysy = [];
window.wybraneKosztorysy = [];
// towaryData i uslugiData usunięte - używamy wyszukiwarek

// WYBÓR TYPU NOTATKI
function selectNoteType(type) {
    // Reset wszystkich przycisków
    document.querySelectorAll('.note-type-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    
    // Aktywuj wybrany przycisk
    const selectedBtn = document.querySelector(`[data-type="${type}"]`);
    if (selectedBtn) {
        selectedBtn.classList.remove('btn-secondary');
        selectedBtn.classList.add('btn-primary', 'active');
    }
    
    // Ustaw wartość
    document.getElementById('typ_notatki').value = type;
    
    // Załaduj pracowników dla wszystkich typów notatek
    loadEmployeeData();
    
    // Pokaż odpowiednie sekcje
    if (type === 'szybka') {
        // Szybka notatka - treść na początku + załączniki i przypomnienia
        showSection('quickContentSection');
        hideSection('vehicleSection');
        hideSection('vehicleContentSection');
        showSection('attachmentsRemindersSection');
        showSection('actionButtons');
        
    } else if (type === 'pojazd') {
        // Notatka do pojazdu - pojazd, potem treść, potem załączniki
        hideSection('quickContentSection');
        showSection('vehicleSection');
        showSection('vehicleContentSection');
        showSection('attachmentsRemindersSection');
        showSection('actionButtons');
        
        // Towary i usługi ładowane są przez wyszukiwarki
    }
}

// ŁADOWANIE PRACOWNIKÓW (dla wszystkich typów notatek)
async function loadEmployeeData() {
    try {
        const response = await fetch('/api/pracownicy');
        window.pracownicyData = await response.json();
        
        const pracownikSelect = document.getElementById('pracownik_id');
        if (pracownikSelect) {
            pracownikSelect.innerHTML = '<option value="">-- Wybierz pracownika --</option>';
            window.pracownicyData.forEach(pracownik => {
                pracownikSelect.innerHTML += `<option value="${pracownik.id}">${pracownik.pelne_imie}</option>`;
            });
        }
    } catch (error) {
        console.error('Błąd ładowania pracowników:', error);
        const pracownikSelect = document.getElementById('pracownik_id');
        if (pracownikSelect) pracownikSelect.innerHTML = '<option value="">❌ Błąd ładowania</option>';
    }
}

function populateSelects() {
    // Towary i usługi używają wyszukiwarek - nie potrzebujemy wypełniania select'ów
    return;
}

// DODAWANIE TOWARÓW
function addTowarToCost() {
    const selectedTowarId = document.getElementById('selectedTowarId');
    const selectedTowarData = document.getElementById('selectedTowarData');
    const iloscInput = document.getElementById('towarIlosc');
    const cenaInput = document.getElementById('towarCena');
    
    if (!selectedTowarId.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola (wybierz towar, ilość i cenę)');
        return;
    }
    
    const selectedTowar = JSON.parse(selectedTowarData.value);
    if (!selectedTowar) return;
    
    const newItem = {
        id: selectedTowar.id,
        nazwa: selectedTowar.nazwa,
        ilosc: parseFloat(iloscInput.value),
        cena: parseFloat(cenaInput.value),
        isCustom: false
    };
    
    window.selectedTowary.push(newItem);
    
    // Reset pól
    document.getElementById('searchTowar').value = '';
    selectedTowarId.value = '';
    selectedTowarData.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderSelectedTowary();
    updateCostSummary();
}

function addCustomTowarToCost() {
    const nazwaInput = document.getElementById('customTowarNazwa');
    const numerInput = document.getElementById('customTowarNumer');
    const producentInput = document.getElementById('customTowarProducent');
    const rodzajSelect = document.getElementById('customTowarRodzaj');
    const typSelect = document.getElementById('customTowarTyp');
    const indeksInput = document.getElementById('customTowarIndeks');
    const iloscInput = document.getElementById('customTowarIlosc');
    const cenaInput = document.getElementById('customTowarCena');
    
    if (!nazwaInput.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola obowiązkowe (nazwa, ilość, cena)');
        return;
    }
    
    const newItem = {
        id: null,
        nazwa: nazwaInput.value,
        numer_katalogowy: numerInput.value || null,
        nazwa_producenta: producentInput.value || null,
        rodzaj_opony: rodzajSelect.value || null,
        typ_opony: typSelect.value || null,
        opona_indeks_nosnosci: indeksInput.value || null,
        ilosc: parseFloat(iloscInput.value),
        cena: parseFloat(cenaInput.value),
        zrodlo: 'local',
        external_id: null,
        isCustom: true
    };
    
    window.selectedTowary.push(newItem);
    
    // Reset pól
    nazwaInput.value = '';
    numerInput.value = '';
    producentInput.value = '';
    rodzajSelect.value = '';
    typSelect.value = '';
    indeksInput.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderSelectedTowary();
    updateCostSummary();
}

// DODAWANIE USŁUG
function addUslugaToCost() {
    const selectedUslugaId = document.getElementById('selectedUslugaId');
    const selectedUslugaData = document.getElementById('selectedUslugaData');
    const iloscInput = document.getElementById('uslugaIlosc');
    const cenaInput = document.getElementById('uslugaCena');
    
    if (!selectedUslugaId.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola (wybierz usługę, ilość i cenę)');
        return;
    }
    
    const selectedUsluga = JSON.parse(selectedUslugaData.value);
    if (!selectedUsluga) return;
    
    const newItem = {
        id: selectedUsluga.id,
        nazwa: selectedUsluga.nazwa,
        ilosc: parseFloat(iloscInput.value),
        cena: parseFloat(cenaInput.value),
        isCustom: false
    };
    
    window.selectedUslugi.push(newItem);
    
    // Reset pól
    document.getElementById('searchUsluga').value = '';
    selectedUslugaId.value = '';
    selectedUslugaData.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderSelectedUslugi();
    updateCostSummary();
}

function addCustomUslugaToCost() {
    const nazwaInput = document.getElementById('customUslugaNazwa');
    const iloscInput = document.getElementById('customUslugaIlosc');
    const cenaInput = document.getElementById('customUslugaCena');
    
    if (!nazwaInput.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola');
        return;
    }
    
    const newItem = {
        id: null,
        nazwa: nazwaInput.value,
        ilosc: parseFloat(iloscInput.value),
        cena: parseFloat(cenaInput.value),
        zrodlo: 'local',
        external_id: null,
        isCustom: true
    };
    
    window.selectedUslugi.push(newItem);
    
    // Reset pól
    nazwaInput.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderSelectedUslugi();
    updateCostSummary();
}

// RENDEROWANIE WYBRANYCH POZYCJI
function renderSelectedTowary() {
    const container = document.getElementById('selectedTowary');
    
    if (!container) return;
    
    if (window.selectedTowary.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych towarów</p>';
        return;
    }
    
    container.innerHTML = window.selectedTowary.map((item, index) => `
        <div class="cost-item">
            <div class="item-info">
                <strong>${item.nazwa}</strong>${item.numer_katalogowy ? ` <span style="color: #666; font-size: 0.9em;">${item.numer_katalogowy}</span>` : ''}<br>
                <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
            </div>
            <div class="item-actions">
                <button type="button" class="btn btn-sm btn-warning" onclick="editTowarItem(${index})">✏️</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeTowar(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderSelectedUslugi() {
    const container = document.getElementById('selectedUslugi');
    
    if (!container) return;
    
    if (window.selectedUslugi.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych usług</p>';
        return;
    }
    
    container.innerHTML = window.selectedUslugi.map((item, index) => `
        <div class="cost-item">
            <div class="item-info">
                <strong>${item.nazwa}</strong><br>
                <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
            </div>
            <div class="item-actions">
                <button type="button" class="btn btn-sm btn-warning" onclick="editUslugaItem(${index})">✏️</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeUsluga(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// USUWANIE POZYCJI
function removeTowar(index) {
    window.selectedTowary.splice(index, 1);
    renderSelectedTowary();
    updateCostSummary();
}

function removeUsluga(index) {
    window.selectedUslugi.splice(index, 1);
    renderSelectedUslugi();
    updateCostSummary();
}

// EDYCJA POZYCJI
function editTowarItem(index) {
    const item = window.selectedTowary[index];
    const newIlosc = prompt('Nowa ilość:', item.ilosc);
    const newCena = prompt('Nowa cena:', item.cena);
    
    if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
        window.selectedTowary[index].ilosc = parseFloat(newIlosc);
        window.selectedTowary[index].cena = parseFloat(newCena);
        renderSelectedTowary();
        updateCostSummary();
    }
}

function editUslugaItem(index) {
    const item = window.selectedUslugi[index];
    const newIlosc = prompt('Nowa ilość:', item.ilosc);
    const newCena = prompt('Nowa cena:', item.cena);
    
    if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
        window.selectedUslugi[index].ilosc = parseFloat(newIlosc);
        window.selectedUslugi[index].cena = parseFloat(newCena);
        renderSelectedUslugi();
        updateCostSummary();
    }
}

// OBLICZANIE I WYŚWIETLANIE SUMY
function calculateCostTotal() {
    let total = 0;
    
    window.selectedTowary.forEach(item => {
        total += item.ilosc * item.cena;
    });
    
    window.selectedUslugi.forEach(item => {
        total += item.ilosc * item.cena;
    });
    
    return total;
}

function updateCostSummary() {
    const total = calculateCostTotal();
    const hasItems = window.selectedTowary.length > 0 || window.selectedUslugi.length > 0;
    
    const summaryDiv = document.getElementById('costSummary');
    const totalDiv = document.getElementById('costTotal');
    
    if (summaryDiv && totalDiv) {
        if (hasItems) {
            summaryDiv.style.display = 'block';
            totalDiv.innerHTML = `Łączna kwota: <span style="color: #28a745;">${total.toFixed(2)} zł</span>`;
        } else {
            summaryDiv.style.display = 'none';
        }
    }
}

// POBIERANIE KOSZTORYSÓW Z INTEGRA
async function pobierzKosztorysyZIntegra() {
    // Zapobiegnij wielokrotnym wywołaniom
    if (isLoadingIntegra) {
        console.log('⏳ Pobieranie już w toku...');
        return;
    }
    
    const nrRej = document.getElementById('nr_rejestracyjny').value.trim();
    if (!nrRej) {
        alert('Wprowadź numer rejestracyjny');
        return;
    }
    
    isLoadingIntegra = true; // Zablokuj kolejne wywołania
    
    const resultsDiv = document.getElementById('integraResults');
    showSection('integraSection');
    showLoading('integraResults', 'Pobieranie danych z systemu integra...');
    
    try {
        console.log(`🔍 Pobieranie kosztorysów dla: ${nrRej}`);
        
        const response = await fetch(`/api/kosztorysy-zewnetrzne/${nrRej}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Błąd pobierania danych');
        }
        
        // === SPRAWDŹ KONFLIKT WŁAŚCICIELA ===
        if (data.sync_conflict && data.sync_conflict.conflict) {
            handleOwnerConflict(data.sync_conflict, nrRej);
            return;
        }
        
        // === POKAŻ INFO O SYNCHRONIZACJI ===
        if (data.sync_result) {
            console.log('Sync result:', data.sync_result);
        }
        
        if (data.kosztorysy.length === 0) {
            resultsDiv.innerHTML = `<p>❌ Brak kosztorysów w systemie integra dla pojazdu ${nrRej}</p>`;
            return;
        }
        
        console.log(`✅ Znaleziono ${data.kosztorysy.length} kosztorysów`);
        
        let html = `<p>✅ Znaleziono ${data.kosztorysy.length} kosztorysów:</p>`;
        
        data.kosztorysy.forEach((kosztorys, index) => {
            html += `
                <div class="integra-kosztorys" style="border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; background: #f9f9f9; width: 100%; box-sizing: border-box;">
                    <!-- NAGŁÓWEK KOSZTORYSU W JEDNEJ LINII -->
                    <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 12px; margin: -1px -1px 15px -1px; border-radius: 5px 5px 0 0;">
                        <label for="integra_${index}" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="integra_${index}" value="${index}" onchange="toggleIntegraKosztorys(${index})" style="transform: scale(1.2);">
                                <h5 style="margin: 0; font-size: 16px; font-weight: bold;">${kosztorys.numer_kosztorysu}</h5>
                            </div>
                            <div style="font-size: 18px; font-weight: bold; color: #fff3e0;">
                                ${kosztorys.kwota_kosztorysu.toFixed(2)} zł
                            </div>
                        </label>
                    </div>
                    <!-- ZAWARTOŚĆ KOSZTORYSU -->
                    <div style="padding: 0 15px 15px 15px;">
                            
                            <div style="margin-top: 8px; width: 100%;">
                                <details style="cursor: pointer; width: 100%;">
                                    <summary style="font-weight: bold; color: #495057; padding: 5px; border-radius: 4px; background: #e9ecef;">📋 Pozycje (${kosztorys.towary.length} towarów, ${kosztorys.uslugi.length} usług)</summary>
                                    <div style="margin-top: 8px; padding: 12px; background: white; border-radius: 4px; border: 1px solid #e9ecef; width: 100%; box-sizing: border-box;">
                                        ${kosztorys.towary.length > 0 ? `
                                            <p style="margin: 0 0 8px 0; font-weight: bold; color: #28a745;">📦 Towary:</p>
                                            <ul style="margin: 0 0 12px 20px; padding: 0; font-size: 13px;">
                                                ${kosztorys.towary.map(t => `<li style="margin-bottom: 4px; line-height: 1.4;">${t.nazwa} - ${t.ilosc}x  ${parseFloat(t.cena).toFixed(2)} zł</li>`).join('')}
                                            </ul>
                                        ` : ''}
                                        ${kosztorys.uslugi.length > 0 ? `
                                            <p style="margin: 0 0 8px 0; font-weight: bold; color: #fd7e14;">🔧 Usługi:</p>
                                            <ul style="margin: 0 0 8px 20px; padding: 0; font-size: 13px;">
                                                ${kosztorys.uslugi.map(u => `<li style="margin-bottom: 4px; line-height: 1.4;">${u.nazwa} - ${u.ilosc}x  ${parseFloat(u.cena).toFixed(2)} zł</li>`).join('')}
                                            </ul>
                                        ` : ''}
                                    </div>
                                </details>
                            </div>
                    </div>
                </div>
            `;
        });
        
        html += `
            <button type="button" class="btn btn-success" onclick="importujWybraneKosztorysy()" style="margin-top: 15px;">
                📥 Importuj wybrane kosztorysy
            </button>
        `;
        
        resultsDiv.innerHTML = html;
        window.integraKosztorysy = data.kosztorysy;
        window.wybraneKosztorysy = [];
        
    } catch (error) {
        console.error('❌ Błąd pobierania kosztorysów:', error);
        showError('integraResults', error.message);
    } finally {
        isLoadingIntegra = false; // Odblokuj
    }
}

// OBSŁUGA CHECKBOXÓW KOSZTORYSÓW Z INTEGRA
function toggleIntegraKosztorys(index) {
    const checkbox = document.getElementById(`integra_${index}`);
    if (checkbox && checkbox.checked) {
        if (!window.wybraneKosztorysy.includes(index)) {
            window.wybraneKosztorysy.push(index);
        }
    } else {
        window.wybraneKosztorysy = window.wybraneKosztorysy.filter(i => i !== index);
    }
    console.log('Wybrane kosztorysy:', window.wybraneKosztorysy);
}

function importujWybraneKosztorysy() {
    if (!window.wybraneKosztorysy || window.wybraneKosztorysy.length === 0) {
        alert('Wybierz przynajmniej jeden kosztorys do importu');
        return;
    }
    
    // Przygotuj dane kosztorysów do importu
    const wybraneKosztorysyData = window.wybraneKosztorysy.map(index => window.integraKosztorysy[index]);
    
    // Zapisz wybrane kosztorysy w ukrytym polu formularza
    document.getElementById('importowane_kosztorysy').value = JSON.stringify(wybraneKosztorysyData);
    
    // Pokaż podsumowanie
    const podsumowanie = wybraneKosztorysyData.map(k => 
        `• ${k.numer_kosztorysu} - ${k.kwota_kosztorysu.toFixed(2)} zł`
    ).join('\n');
    
    const potwierdz = confirm(`Zostaną zaimportowane kosztorysy:\n\n${podsumowanie}\n\nKontynuować?`);
    
    if (potwierdz) {
        const resultsDiv = document.getElementById('integraResults');
        resultsDiv.innerHTML += `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin-top: 15px; border-radius: 6px;">
                ✅ <strong>Gotowe do importu:</strong> ${window.wybraneKosztorysy.length} kosztorysów
                <br><small>Kosztorysy zostaną zaimportowane po zapisaniu notatki.</small>
            </div>
        `;
    }
}

// RESET FORMULARZA DODAWANIA
function resetModalForm() {
    // Reset podstawowych pól
    const typNotatki = document.getElementById('typ_notatki');
    const nrRej = document.getElementById('nr_rejestracyjny');
    const quickNoteTresc = document.getElementById('quickNoteTresc');
    const vehicleNoteTresc = document.getElementById('vehicleNoteTresc');
    const customCostNumber = document.getElementById('customCostNumber');
    const customCostDescription = document.getElementById('customCostDescription');
    
    if (typNotatki) typNotatki.value = '';
    if (nrRej) nrRej.value = '';
    if (quickNoteTresc) quickNoteTresc.value = '';
    if (vehicleNoteTresc) vehicleNoteTresc.value = '';
    if (customCostNumber) customCostNumber.value = '';
    if (customCostDescription) customCostDescription.value = '';
    
    // Ukryj wszystkie sekcje
    hideSection('vehicleSection');
    hideSection('integraSection');
    hideSection('quickContentSection');
    hideSection('vehicleContentSection');
    hideSection('attachmentsRemindersSection');
    hideSection('actionButtons');
    
    // Reset ukrytych pól
    const importowaneKosztorysy = document.getElementById('importowane_kosztorysy');
    const towaryJson = document.getElementById('towary_json');
    const uslugiJson = document.getElementById('uslugi_json');
    const numerKosztorysu = document.getElementById('numer_kosztorysu');
    const opisKosztorysu = document.getElementById('opis_kosztorysu');
    
    if (importowaneKosztorysy) importowaneKosztorysy.value = '';
    if (towaryJson) towaryJson.value = '[]';
    if (uslugiJson) uslugiJson.value = '[]';
    if (numerKosztorysu) numerKosztorysu.value = '';
    if (opisKosztorysu) opisKosztorysu.value = '';
    
    // Reset zmiennych globalnych
    window.selectedTowary = [];
    window.selectedUslugi = [];
    window.integraKosztorysy = [];
    window.wybraneKosztorysy = [];
    
    // Reset przycisków typu
    document.querySelectorAll('.note-type-btn').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-secondary');
    });
    
    // Reset wyświetlanych list
    const selectedTowary = document.getElementById('selectedTowary');
    const selectedUslugi = document.getElementById('selectedUslugi');
    const integraResults = document.getElementById('integraResults');
    const costSummary = document.getElementById('costSummary');
    
    // Reset pól dodawania własnych towarów
    const customTowarNazwa = document.getElementById('customTowarNazwa');
    const customTowarNumer = document.getElementById('customTowarNumer');
    const customTowarProducent = document.getElementById('customTowarProducent');
    const customTowarRodzaj = document.getElementById('customTowarRodzaj');
    const customTowarTyp = document.getElementById('customTowarTyp');
    const customTowarIndeks = document.getElementById('customTowarIndeks');
    const customTowarIlosc = document.getElementById('customTowarIlosc');
    const customTowarCena = document.getElementById('customTowarCena');
    
    if (customTowarNazwa) customTowarNazwa.value = '';
    if (customTowarNumer) customTowarNumer.value = '';
    if (customTowarProducent) customTowarProducent.value = '';
    if (customTowarRodzaj) customTowarRodzaj.value = '';
    if (customTowarTyp) customTowarTyp.value = '';
    if (customTowarIndeks) customTowarIndeks.value = '';
    if (customTowarIlosc) customTowarIlosc.value = '';
    if (customTowarCena) customTowarCena.value = '';
    
    // Reset pól samochodu i klienta
    const carNrRej = document.getElementById('carNrRej');
    const carMarka = document.getElementById('carMarka');
    const carModel = document.getElementById('carModel');
    const carRok = document.getElementById('carRok');
    const searchKlient = document.getElementById('searchKlient');
    const selectedKlientId = document.getElementById('selectedKlientId');
    const klientSearchResults = document.getElementById('klientSearchResults');
    const newKlientNazwa = document.getElementById('newKlientNazwa');
    const newKlientTelefon = document.getElementById('newKlientTelefon');
    const newKlientEmail = document.getElementById('newKlientEmail');
    const newKlientNip = document.getElementById('newKlientNip');
    const newKlientFirma = document.getElementById('newKlientFirma');
    
    if (carNrRej) carNrRej.value = '';
    if (carMarka) carMarka.value = '';
    if (carModel) carModel.value = '';
    if (carRok) carRok.value = '';
    if (searchKlient) searchKlient.value = '';
    if (selectedKlientId) selectedKlientId.value = '';
    if (klientSearchResults) klientSearchResults.style.display = 'none';
    if (newKlientNazwa) newKlientNazwa.value = '';
    if (newKlientTelefon) newKlientTelefon.value = '';
    if (newKlientEmail) newKlientEmail.value = '';
    if (newKlientNip) newKlientNip.value = '';
    if (newKlientFirma) newKlientFirma.value = '';
    
    // Reset statusu sprawdzania pojazdu i wyszukiwania
    const vehicleCheckStatus = document.getElementById('vehicleCheckStatus');
    const searchPojazd = document.getElementById('searchPojazd');
    const selectedVehicleId = document.getElementById('selectedVehicleId');
    const selectedVehicleInfo = document.getElementById('selectedVehicleInfo');
    const vehicleSearchResults = document.getElementById('vehicleSearchResults');
    
    if (vehicleCheckStatus) vehicleCheckStatus.style.display = 'none';
    if (searchPojazd) searchPojazd.value = '';
    if (selectedVehicleId) selectedVehicleId.value = '';
    if (selectedVehicleInfo) selectedVehicleInfo.style.display = 'none';
    if (vehicleSearchResults) vehicleSearchResults.style.display = 'none';
    
    if (selectedTowary) selectedTowary.innerHTML = '';
    if (selectedUslugi) selectedUslugi.innerHTML = '';
    if (integraResults) integraResults.innerHTML = '';
    if (costSummary) costSummary.style.display = 'none';
    
    // Reset wszystkich input'ów w formularzu
    const form = document.getElementById('addNoteForm');
    if (form) {
        form.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
            if (!input.name || input.name !== 'typ_notatki') { // Nie resetuj typu notatki
                input.value = '';
            }
        });
        
        // Ukryj wyniki wyszukiwania
        form.querySelectorAll('.search-results, #towarSearchResults, #uslugaSearchResults').forEach(results => {
            results.style.display = 'none';
        });
    }
}

// PRZYGOTOWANIE DANYCH PRZED WYSŁANIEM FORMULARZA
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addNoteForm');
    if (form) {
        // Inicjalizuj wyszukiwanie klientów
        const searchKlient = document.getElementById('searchKlient');
        if (searchKlient) {
            searchKlient.addEventListener('input', function() {
                clearTimeout(klientSearchTimeout);
                klientSearchTimeout = setTimeout(searchKlienci, 300);
            });
        }
        
        // Inicjalizuj wyszukiwanie pojazdów
        const searchPojazd = document.getElementById('searchPojazd');
        if (searchPojazd) {
            searchPojazd.addEventListener('input', function() {
                clearTimeout(vehicleSearchTimeout);
                vehicleSearchTimeout = setTimeout(searchVehicles, 300);
            });
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault(); // Zatrzymaj normalne wysłanie formularza
            
            // Skopiuj treść z odpowiedniego pola do głównego pola "tresc"
            const typNotatki = document.getElementById('typ_notatki').value;
            const quickTresc = document.getElementById('quickNoteTresc');
            const vehicleTresc = document.getElementById('vehicleNoteTresc');
            
            // Utwórz ukryte pole "tresc" jeśli nie istnieje
            let mainTrescField = document.querySelector('input[name="tresc"], textarea[name="tresc"]');
            if (!mainTrescField) {
                mainTrescField = document.createElement('input');
                mainTrescField.type = 'hidden';
                mainTrescField.name = 'tresc';
                form.appendChild(mainTrescField);
            }
            
            // Skopiuj odpowiednią treść
            if (typNotatki === 'szybka' && quickTresc) {
                mainTrescField.value = quickTresc.value;
            } else if (typNotatki === 'pojazd' && vehicleTresc) {
                mainTrescField.value = vehicleTresc.value;
            }
            
            // Przygotuj dane własnego kosztorysu jeśli został utworzony
            if (window.selectedTowary.length > 0 || window.selectedUslugi.length > 0) {
                const customCostNumber = document.getElementById('customCostNumber');
                const customCostDescription = document.getElementById('customCostDescription');
                
                if (!customCostNumber || !customCostNumber.value.trim()) {
                    alert('Podaj numer kosztorysu');
                    return false;
                }
                
                // Zapisz dane kosztorysu w ukrytych polach
                const towaryJson = document.getElementById('towary_json');
                const uslugiJson = document.getElementById('uslugi_json');
                const numerKosztorysu = document.getElementById('numer_kosztorysu');
                const opisKosztorysu = document.getElementById('opis_kosztorysu');
                
                if (towaryJson) towaryJson.value = JSON.stringify(window.selectedTowary);
                if (uslugiJson) uslugiJson.value = JSON.stringify(window.selectedUslugi);
                if (numerKosztorysu) numerKosztorysu.value = customCostNumber.value.trim();
                if (opisKosztorysu) opisKosztorysu.value = customCostDescription ? customCostDescription.value.trim() : '';
            }
            
            // Pokaż loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '💾 Zapisywanie...';
            
            try {
                // Wyślij formularz jako AJAX
                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Notatka została zapisana, teraz prześlij pliki
                    submitBtn.textContent = '📎 Przesyłanie plików...';
                    await uploadPendingFiles(result.notatka_id);
                    
                    // Sukces!
                    submitBtn.textContent = '✅ Zapisano!';
                    closeModal();
                    location.reload();
                } else {
                    throw new Error(result.message || 'Błąd zapisywania notatki');
                }
                
            } catch (error) {
                console.error('Błąd:', error);
                alert(`Błąd zapisywania: ${error.message}`);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});

// === OBSŁUGA ZAŁĄCZNIKÓW ===

// Zmienne globalne dla załączników
window.uploadedFiles = [];
window.pendingFiles = [];

// Inicjalizacja upload zone
document.addEventListener('DOMContentLoaded', function() {
    initFileUpload();
});

function initFileUpload() {
    const uploadZone = document.getElementById('fileUploadZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadZone || !fileInput) return;
    
    // Kliknięcie w upload zone
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Wybór plików przez input
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
}

function handleFiles(files) {
    for (let file of files) {
        if (validateFile(file)) {
            addFileToList(file);
        }
    }
}

function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
    ];
    
    if (file.size > maxSize) {
        alert(`Plik "${file.name}" jest za duży (max 10MB)`);
        return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
        alert(`Plik "${file.name}" ma nieobsługiwany format`);
        return false;
    }
    
    return true;
}

function addFileToList(file) {
    const fileList = document.getElementById('fileList');
    const fileId = Date.now() + Math.random();
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = `file-${fileId}`;
    
    fileItem.innerHTML = `
        <div class="file-info">
            <div class="file-icon">${getFileIcon(file.type)}</div>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
        </div>
        <div class="file-actions">
            <span class="file-status uploading">Gotowy do wysłania</span>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeFile('${fileId}')">🗑️</button>
        </div>
    `;
    
    fileList.appendChild(fileItem);
    
    // Dodaj plik do listy oczekujących
    window.pendingFiles.push({
        id: fileId,
        file: file,
        element: fileItem
    });
}

function removeFile(fileId) {
    const element = document.getElementById(`file-${fileId}`);
    if (element) {
        element.remove();
    }
    
    // Usuń z listy oczekujących
    window.pendingFiles = window.pendingFiles.filter(f => f.id !== fileId);
    
    // Usuń z uploadowanych (jeśli była już wysłana)
    window.uploadedFiles = window.uploadedFiles.filter(f => f.tempId !== fileId);
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.startsWith('text/')) return '📃';
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Funkcja wywoływana po zapisaniu notatki - przesyła pliki
async function uploadPendingFiles(noteId) {
    if (window.pendingFiles.length === 0) return;
    
    for (let pendingFile of window.pendingFiles) {
        try {
            const statusElement = pendingFile.element.querySelector('.file-status');
            statusElement.textContent = 'Wysyłanie...';
            statusElement.className = 'file-status uploading';
            
            const formData = new FormData();
            formData.append('file', pendingFile.file);
            
            const response = await fetch(`/api/notatka/${noteId}/upload`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                statusElement.textContent = 'Wysłano';
                statusElement.className = 'file-status uploaded';
                
                window.uploadedFiles.push({
                    id: result.zalacznik_id,
                    tempId: pendingFile.id,
                    nazwa: result.nazwa_pliku,
                    rozmiar: result.rozmiar
                });
            } else {
                throw new Error(result.detail || 'Błąd wysyłania');
            }
            
        } catch (error) {
            const statusElement = pendingFile.element.querySelector('.file-status');
            statusElement.textContent = 'Błąd';
            statusElement.className = 'file-status error';
            console.error('Błąd wysyłania pliku:', error);
        }
    }
    
    // Wyczyść listę oczekujących
    window.pendingFiles = [];
}

// === FUNKCJE DODAWANIA SAMOCHODU I KLIENTA ===

// Wyszukiwanie klientów
async function searchKlienci() {
    const query = document.getElementById('searchKlient').value.trim();
    const resultsDiv = document.getElementById('klientSearchResults');
    
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/api/klienci/search?q=${encodeURIComponent(query)}&limit=10`);
        const klienci = await response.json();
        
        if (klienci.length === 0) {
            resultsDiv.innerHTML = '<div style="padding: 10px; color: #6c757d;">Brak wyników</div>';
            resultsDiv.style.display = 'block';
            return;
        }
        
        resultsDiv.innerHTML = klienci.map(k => `
            <div onclick="selectKlient(${k.id}, '${k.nazwapelna}', '${k.nr_telefonu || ''}', '${k.email || ''}')" 
                 style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;" 
                 onmouseover="this.style.backgroundColor='#f8f9fa'" 
                 onmouseout="this.style.backgroundColor='white'">
                <strong>${k.nazwapelna}</strong><br>
                <small>Tel: ${k.nr_telefonu || 'brak'} | Email: ${k.email || 'brak'}</small>
                ${k.nazwa_firmy ? `<br><small>Firma: ${k.nazwa_firmy}</small>` : ''}
            </div>
        `).join('');
        
        resultsDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Błąd wyszukiwania klientów:', error);
        resultsDiv.innerHTML = '<div style="padding: 10px; color: #dc3545;">Błąd wyszukiwania</div>';
        resultsDiv.style.display = 'block';
    }
}

// Wybór klienta z wyników wyszukiwania
function selectKlient(id, nazwa, telefon, email) {
    document.getElementById('searchKlient').value = `${nazwa} (${telefon})`;
    document.getElementById('selectedKlientId').value = id;
    document.getElementById('klientSearchResults').style.display = 'none';
}

// Dodanie samochodu do istniejącego klienta
async function addCarToDatabase() {
    const marka = document.getElementById('carMarka').value.trim();
    const model = document.getElementById('carModel').value.trim();
    const rok = document.getElementById('carRok').value;
    const nrRej = document.getElementById('carNrRej').value.trim();
    const klientId = document.getElementById('selectedKlientId').value;
    
    
    if (!marka || !model || !nrRej) {
        alert('Wypełnij wszystkie pola samochodu (marka, model, numer rejestracyjny)');
        return;
    }
    
    if (!klientId) {
        alert('Wybierz klienta z listy wyszukiwania');
        return;
    }
    
    try {
        const response = await fetch('/api/samochody', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                klient_id: parseInt(klientId),
                nr_rejestracyjny: nrRej,
                marka: marka,
                model: model,
                rok_produkcji: rok ? parseInt(rok) : null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ Samochód ${marka} ${model} (${nrRej}) został dodany do bazy!`);
            
            // AUTOMATYCZNIE PRZYPISZ DO NOTATKI
            const nrRejInput = document.getElementById('nr_rejestracyjny');
            const searchPojazdInput = document.getElementById('searchPojazd');
            if (nrRejInput && searchPojazdInput) {
                nrRejInput.value = nrRej.toUpperCase();
                searchPojazdInput.value = `${nrRej.toUpperCase()} - ${marka} ${model}`;
                
                // Pokaż informacje o dodanym pojeździe
                const infoDiv = document.getElementById('selectedVehicleInfo');
                infoDiv.innerHTML = `
                    <div style="padding: 10px; background: #e8f5e8; border: 1px solid #c3e6cb; border-radius: 4px;">
                        <strong>Nowo dodany pojazd:</strong><br>
                        🚗 ${marka} ${model} ${rok ? `(${rok})` : ''}<br>
                        📋 ${nrRej.toUpperCase()}<br>
                        👤 Klient wybrany
                    </div>
                `;
                infoDiv.style.display = 'block';
                
                // Sprawdź status w Integrze
                checkVehicleInIntegra();
            }
            
            // Reset formularza samochodu
            document.getElementById('carNrRej').value = '';
            document.getElementById('carMarka').value = '';
            document.getElementById('carModel').value = '';
            document.getElementById('carRok').value = '';
            document.getElementById('searchKlient').value = '';
            document.getElementById('selectedKlientId').value = '';
        } else {
            alert(`❌ Błąd: ${data.detail}`);
        }
        
    } catch (error) {
        console.error('Błąd dodawania samochodu:', error);
        alert('❌ Błąd podczas dodawania samochodu');
    }
}

// Dodanie nowego klienta wraz z samochodem
async function addCarWithNewClient() {
    const nazwapelna = document.getElementById('newKlientNazwa').value.trim();
    const telefon = document.getElementById('newKlientTelefon').value.trim();
    const email = document.getElementById('newKlientEmail').value.trim();
    const nip = document.getElementById('newKlientNip').value.trim();
    const firma = document.getElementById('newKlientFirma').value.trim();
    
    const marka = document.getElementById('carMarka').value.trim();
    const model = document.getElementById('carModel').value.trim();
    const rok = document.getElementById('carRok').value;
    const nrRej = document.getElementById('carNrRej').value.trim();
    
    if (!nazwapelna || !telefon) {
        alert('Wypełnij nazwisko i telefon nowego klienta');
        return;
    }
    
    if (!marka || !model || !nrRej) {
        alert('Wypełnij wszystkie pola samochodu (marka, model, numer rejestracyjny)');
        return;
    }
    
    try {
        // Najpierw dodaj klienta
        const klientResponse = await fetch('/api/klienci', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nazwapelna: nazwapelna,
                nr_telefonu: telefon,
                email: email || null,
                nip: nip || null,
                nazwa_firmy: firma || null
            })
        });
        
        const klientData = await klientResponse.json();
        
        if (!klientResponse.ok) {
            alert(`❌ Błąd dodawania klienta: ${klientData.detail}`);
            return;
        }
        
        // Potem dodaj samochód
        const samochodResponse = await fetch('/api/samochody', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                klient_id: klientData.id,
                nr_rejestracyjny: nrRej,
                marka: marka,
                model: model,
                rok_produkcji: rok ? parseInt(rok) : null
            })
        });
        
        const samochodData = await samochodResponse.json();
        
        if (samochodResponse.ok) {
            alert(`✅ Klient "${nazwapelna}" i samochód ${marka} ${model} (${nrRej}) zostały dodane do bazy!`);
            
            // AUTOMATYCZNIE PRZYPISZ DO NOTATKI
            const nrRejInput = document.getElementById('nr_rejestracyjny');
            const searchPojazdInput = document.getElementById('searchPojazd');
            if (nrRejInput && searchPojazdInput) {
                nrRejInput.value = nrRej.toUpperCase();
                searchPojazdInput.value = `${nrRej.toUpperCase()} - ${marka} ${model}`;
                
                // Pokaż informacje o dodanym pojeździe
                const infoDiv = document.getElementById('selectedVehicleInfo');
                infoDiv.innerHTML = `
                    <div style="padding: 10px; background: #e8f5e8; border: 1px solid #c3e6cb; border-radius: 4px;">
                        <strong>Nowo dodany pojazd:</strong><br>
                        🚗 ${marka} ${model} ${rok ? `(${rok})` : ''}<br>
                        📋 ${nrRej.toUpperCase()}<br>
                        👤 Klient wybrany
                    </div>
                `;
                infoDiv.style.display = 'block';
                
                // Sprawdź status w Integrze
                checkVehicleInIntegra();
            }
            
            // Reset wszystkich pól
            document.getElementById('newKlientNazwa').value = '';
            document.getElementById('newKlientTelefon').value = '';
            document.getElementById('newKlientEmail').value = '';
            document.getElementById('newKlientNip').value = '';
            document.getElementById('newKlientFirma').value = '';
            document.getElementById('carNrRej').value = '';
            document.getElementById('carMarka').value = '';
            document.getElementById('carModel').value = '';
            document.getElementById('carRok').value = '';
        } else {
            alert(`❌ Klient dodany, ale błąd z samochodem: ${samochodData.detail}`);
        }
        
    } catch (error) {
        console.error('Błąd dodawania klienta i samochodu:', error);
        alert('❌ Błąd podczas dodawania danych');
    }
}

// === WYSZUKIWANIE POJAZDÓW W LOKALNEJ BAZIE ===

// Debounced wyszukiwanie pojazdów
function debounceSearchVehicle() {
    clearTimeout(vehicleSearchTimeout);
    vehicleSearchTimeout = setTimeout(searchVehicles, 300);
}

// Sprawdzanie pojazdu w Integrze (bez wyszukiwania w lokalnej bazie)
async function searchVehicles() {
    const query = document.getElementById('searchPojazd').value.trim();
    const resultsDiv = document.getElementById('vehicleSearchResults');
    
    // Ukryj wyniki - nie pokazujemy listy, tylko sprawdzamy
    resultsDiv.style.display = 'none';
    
    if (query.length < 3) {
        return;
    }
    
    // Ustaw numer rejestracyjny do sprawdzenia w Integrze
    document.getElementById('nr_rejestracyjny').value = query.toUpperCase();
    
    // Sprawdź w Integrze (używamy istniejącej funkcji)
    checkVehicleInIntegra();
}

// Wybór pojazdu z wyników wyszukiwania
function selectVehicle(id, nrRej, marka, model, rok, klientNazwa) {
    // Ukryj wyniki wyszukiwania
    document.getElementById('vehicleSearchResults').style.display = 'none';
    
    // Wypełnij pola
    document.getElementById('searchPojazd').value = `${nrRej} - ${marka} ${model}`;
    document.getElementById('selectedVehicleId').value = id;
    document.getElementById('nr_rejestracyjny').value = nrRej;
    
    // Pokaż informacje o wybranym pojeździe
    const infoDiv = document.getElementById('selectedVehicleInfo');
    infoDiv.innerHTML = `
        <div style="padding: 10px; background: #e8f5e8; border: 1px solid #c3e6cb; border-radius: 4px;">
            <strong>Wybrany pojazd:</strong><br>
            🚗 ${marka} ${model} ${rok ? `(${rok})` : ''}<br>
            📋 ${nrRej}<br>
            👤 ${klientNazwa}
        </div>
    `;
    infoDiv.style.display = 'block';
    
    // Sprawdź status w Integrze
    checkVehicleInIntegra();
}

// === SPRAWDZANIE POJAZDU W INTEGRZE ===

// Debounced sprawdzanie pojazdu podczas pisania
function debounceCheckVehicle() {
    clearTimeout(vehicleCheckTimeout);
    vehicleCheckTimeout = setTimeout(checkVehicleInIntegra, 1000); // 1 sekunda opóźnienia
}

// Sprawdź czy pojazd istnieje w bazie Integry
async function checkVehicleInIntegra() {
    const nrRej = document.getElementById('nr_rejestracyjny').value.trim();
    const statusDiv = document.getElementById('vehicleCheckStatus');
    
    if (!nrRej || nrRej.length < 3) {
        statusDiv.style.display = 'none';
        return;
    }
    
    // Pokaż status sprawdzania
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `
        <div style="padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 13px; color: #666;">
            🔍 Sprawdzanie w bazie Integra...
        </div>
    `;
    
    try {
        const response = await fetch(`/api/sprawdz-pojazd-integra/${encodeURIComponent(nrRej)}`, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.found) {
                // Pojazd znaleziony w Integrze
                statusDiv.innerHTML = `
                    <div style="padding: 8px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; font-size: 13px; color: #155724;">
                        ✅ <strong>Pojazd znaleziony w Integrze!</strong><br>
                        <small>${data.marka} ${data.model} (${data.rok_produkcji || 'brak roku'})</small><br>
                        <small>Klient: ${data.nazwa_klienta}</small>
                    </div>
                `;
            } else {
                // Pojazd nie znaleziony
                statusDiv.innerHTML = `
                    <div style="padding: 8px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; font-size: 13px; color: #856404;">
                        ⚠️ Pojazd nie znaleziony w bazie Integra.<br>
                        <small>Możesz go dodać do lokalnej bazy poniżej.</small>
                    </div>
                `;
            }
        } else {
            throw new Error(data.detail || 'Błąd sprawdzania');
        }
        
    } catch (error) {
        console.error('Błąd sprawdzania pojazdu:', error);
        statusDiv.innerHTML = `
            <div style="padding: 8px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; font-size: 13px; color: #721c24;">
                ❌ Błąd połączenia z bazą Integra.<br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// === WYSZUKIWANIE W LOKALNEJ BAZIE (NOWE POLE) ===

let vehicleSearchLocalTimeout;

// Debounced wyszukiwanie pojazdów tylko w lokalnej bazie
function debounceSearchVehicleLocal() {
    clearTimeout(vehicleSearchLocalTimeout);
    vehicleSearchLocalTimeout = setTimeout(searchVehiclesLocal, 300);
}

// Wyszukiwanie pojazdów tylko w lokalnej bazie (bez Integra)
async function searchVehiclesLocal() {
    const query = document.getElementById('searchPojazdLocal').value.trim();
    const resultsDiv = document.getElementById('vehicleSearchResultsLocal');
    
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/api/samochody/search-local?q=${encodeURIComponent(query)}&limit=10`);
        const pojazdy = await response.json();
        
        if (pojazdy.length === 0) {
            resultsDiv.innerHTML = '<div style="padding: 10px; color: #6c757d;">Brak pojazdów w lokalnej bazie</div>';
            resultsDiv.style.display = 'block';
            return;
        }
        
        resultsDiv.innerHTML = pojazdy.map(p => `
            <div onclick="selectVehicleLocal('${p.id}', '${p.nr_rejestracyjny}', '${p.marka}', '${p.model}', '${p.rok_produkcji || ''}', '${p.klient.nazwapelna}')" 
                 style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; background: #fff8dc;" 
                 onmouseover="this.style.backgroundColor='#f5f5dc'" 
                 onmouseout="this.style.backgroundColor='#fff8dc'">
                <strong>${p.display}</strong><br>
                <small>Klient: ${p.klient.nazwapelna}</small>
            </div>
        `).join('');
        
        resultsDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Błąd wyszukiwania pojazdów lokalnie:', error);
        resultsDiv.innerHTML = '<div style="padding: 10px; color: #dc3545;">Błąd wyszukiwania lokalnego</div>';
        resultsDiv.style.display = 'block';
    }
}

// Wybór pojazdu z wyników lokalnego wyszukiwania
function selectVehicleLocal(id, nrRej, marka, model, rok, klientNazwa) {
    // Ukryj wyniki wyszukiwania lokalnego
    document.getElementById('vehicleSearchResultsLocal').style.display = 'none';
    
    // Wypełnij główne pola
    document.getElementById('searchPojazd').value = `${nrRej}`;
    document.getElementById('selectedVehicleId').value = id;
    document.getElementById('nr_rejestracyjny').value = nrRej;
    
    // Pokaż informacje w lokalnym polu
    const localInfoDiv = document.getElementById('selectedVehicleInfoLocal');
    localInfoDiv.innerHTML = `
        <div style="padding: 10px;">
            <strong>💾 Wybrany pojazd z lokalnej bazy:</strong><br>
            🚗 ${marka} ${model} ${rok ? `(${rok})` : ''}<br>
            📋 ${nrRej}<br>
            👤 ${klientNazwa}
        </div>
    `;
    localInfoDiv.style.display = 'block';
    
    // Ukryj główne pole informacyjne (żeby nie dublować informacji)
    const mainInfoDiv = document.getElementById('selectedVehicleInfo');
    mainInfoDiv.style.display = 'none';
    
    // Ukryj status sprawdzania w Integrze (nie sprawdzamy dla lokalnej bazy)
    const statusDiv = document.getElementById('vehicleCheckStatus');
    statusDiv.style.display = 'none';
    
    // Wyczyść lokalne pole wyszukiwania
    document.getElementById('searchPojazdLocal').value = '';
}

// Inicjalizacja lokalnego wyszukiwania przy ładowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    const searchPojazdLocal = document.getElementById('searchPojazdLocal');
    if (searchPojazdLocal) {
        searchPojazdLocal.addEventListener('input', function() {
            clearTimeout(vehicleSearchLocalTimeout);
            vehicleSearchLocalTimeout = setTimeout(searchVehiclesLocal, 300);
        });
    }
});

// === OBSŁUGA KONFLIKTU WŁAŚCICIELA ===

function handleOwnerConflict(conflictData, nrRej) {
    const resultsDiv = document.getElementById('integraResults');
    
    const localData = conflictData.local_data;
    const integraData = conflictData.integra_data;
    
    resultsDiv.innerHTML = `
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
            <h5 style="color: #856404; margin-bottom: 15px;">⚠️ Konflikt danych pojazdu ${nrRej}</h5>
            <p style="color: #856404; margin-bottom: 15px;">
                Pojazd istnieje już w lokalnej bazie z innymi danymi właściciela. 
                Co chcesz zrobić?
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: #e8f4fd; padding: 15px; border-radius: 6px; border: 1px solid #bee5eb;">
                    <h6 style="color: #0c5460; margin-bottom: 10px;">💾 Dane lokalne:</h6>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Pojazd:</strong> ${localData.marka} ${localData.model} (${localData.rok_produkcji || 'brak roku'})</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Klient:</strong> ${localData.klient}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Telefon:</strong> ${localData.telefon || 'brak'}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${localData.email || 'brak'}</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6;">
                    <h6 style="color: #495057; margin-bottom: 10px;">🏢 Dane z Integry:</h6>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Pojazd:</strong> ${integraData.marka} ${integraData.model} (${integraData.rok_produkcji || 'brak roku'})</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Klient:</strong> ${integraData.klient}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Telefon:</strong> ${integraData.telefon || 'brak'}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${integraData.email || 'brak'}</p>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button type="button" class="btn btn-outline-primary" onclick="syncWithOverwrite(false, '${nrRej}')">
                    💾 Zostaw lokalne dane
                </button>
                <button type="button" class="btn btn-warning" onclick="syncWithOverwrite(true, '${nrRej}')">
                    🏢 Nadpisz danymi z Integry
                </button>
                <button type="button" class="btn btn-secondary" onclick="cancelSync()">
                    ❌ Anuluj
                </button>
            </div>
        </div>
    `;
}

// Synchronizacja z wyborem overwrite
async function syncWithOverwrite(overwrite, nrRej) {
    const resultsDiv = document.getElementById('integraResults');
    
    try {
        resultsDiv.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p style="margin-top: 10px;">
                    ${overwrite ? '🏢 Nadpisuję danymi z Integry...' : '💾 Synchronizuję bez nadpisywania...'}
                </p>
            </div>
        `;
        
        // Wywołaj API z parametrem overwrite
        const response = await fetch(`/api/sync-pojazd-integra/${nrRej}?overwrite=${overwrite}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            resultsDiv.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                    ✅ <strong>Synchronizacja zakończona pomyślnie!</strong><br>
                    <small>${data.message}</small>
                </div>
            `;
            
            // Teraz pobierz kosztorysy
            setTimeout(() => pobierzKosztorysyZIntegra(), 1000);
            
        } else {
            throw new Error(data.message || 'Błąd synchronizacji');
        }
        
    } catch (error) {
        console.error('Błąd synchronizacji:', error);
        resultsDiv.innerHTML = `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px;">
                ❌ <strong>Błąd synchronizacji:</strong><br>
                <small>${error.message}</small><br><br>
                <button type="button" class="btn btn-outline-secondary" onclick="cancelSync()">Zamknij</button>
            </div>
        `;
    }
}

// Anulowanie synchronizacji
function cancelSync() {
    const resultsDiv = document.getElementById('integraResults');
    resultsDiv.innerHTML = `
        <p style="color: #6c757d; font-style: italic;">Synchronizacja anulowana. Możesz spróbować ponownie.</p>
    `;
}

console.log('✅ note-add.js załadowany - funkcje dodawania gotowe!');