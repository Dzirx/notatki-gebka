// === MODULES/NOTATNIK/STATIC/JS/NOTE-ADD.JS ===
// Funkcje dodawania nowych notatek

console.log('📝 Moduł note-add załadowany');

// ZMIENNE GLOBALNE DLA DODAWANIA
window.selectedTowary = [];
window.selectedUslugi = [];
window.towaryData = [];
window.uslugiData = [];
window.integraKosztorysy = [];
window.wybraneKosztorysy = [];

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
    
    // Pokaż odpowiednie sekcje
    if (type === 'szybka') {
        // Tylko treść notatki
        showSection('noteContentSection');
        hideSection('vehicleSection');
        showSection('actionButtons');
    } else if (type === 'pojazd') {
        // Wszystkie sekcje pojazdu
        showSection('vehicleSection');
        showSection('noteContentSection');
        showSection('actionButtons');
        
        // Załaduj dane towarów i usług
        loadDropdownData();
    }
}

// ŁADOWANIE DANYCH DO DROPDOWNÓW
async function loadDropdownData() {
    try {
        const [towaryResponse, uslugiResponse] = await Promise.all([
            fetch('/api/towary'),
            fetch('/api/uslugi')
        ]);
        
        window.towaryData = await towaryResponse.json();
        window.uslugiData = await uslugiResponse.json();
        
        populateSelects();
        
    } catch (error) {
        console.error('Błąd ładowania danych:', error);
        const towarSelect = document.getElementById('selectTowar');
        const uslugaSelect = document.getElementById('selectUsluga');
        
        if (towarSelect) towarSelect.innerHTML = '<option value="">❌ Błąd ładowania</option>';
        if (uslugaSelect) uslugaSelect.innerHTML = '<option value="">❌ Błąd ładowania</option>';
    }
}

function populateSelects() {
    const towarSelect = document.getElementById('selectTowar');
    const uslugaSelect = document.getElementById('selectUsluga');
    
    if (towarSelect) {
        // Wypełnij towary
        towarSelect.innerHTML = '<option value="">-- Wybierz towar --</option>';
        window.towaryData.forEach(towar => {
            towarSelect.innerHTML += `<option value="${towar.id}">${towar.nazwa} - ${parseFloat(towar.cena).toFixed(2)}zł</option>`;
        });
    }
    
    if (uslugaSelect) {
        // Wypełnij usługi
        uslugaSelect.innerHTML = '<option value="">-- Wybierz usługę --</option>';
        window.uslugiData.forEach(usluga => {
            uslugaSelect.innerHTML += `<option value="${usluga.id}">${usluga.nazwa} - ${parseFloat(usluga.cena).toFixed(2)}zł</option>`;
        });
    }
}

// DODAWANIE TOWARÓW
function addTowarToCost() {
    const selectTowar = document.getElementById('selectTowar');
    const iloscInput = document.getElementById('towarIlosc');
    const cenaInput = document.getElementById('towarCena');
    
    if (!selectTowar.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola');
        return;
    }
    
    const selectedTowar = window.towaryData.find(t => t.id == selectTowar.value);
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
    selectTowar.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderSelectedTowary();
    updateCostSummary();
}

function addCustomTowarToCost() {
    const nazwaInput = document.getElementById('customTowarNazwa');
    const iloscInput = document.getElementById('customTowarIlosc');
    const cenaInput = document.getElementById('customTowarCena');
    
    if (!nazwaInput.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola');
        return;
    }
    
    const newItem = {
        id: null,
        nazwa: nazwaInput.value,
        ilosc: parseFloat(iloscInput.value),
        cena: parseFloat(cenaInput.value),
        isCustom: true
    };
    
    window.selectedTowary.push(newItem);
    
    // Reset pól
    nazwaInput.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderSelectedTowary();
    updateCostSummary();
}

// DODAWANIE USŁUG
function addUslugaToCost() {
    const selectUsluga = document.getElementById('selectUsluga');
    const iloscInput = document.getElementById('uslugaIlosc');
    const cenaInput = document.getElementById('uslugaCena');
    
    if (!selectUsluga.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola');
        return;
    }
    
    const selectedUsluga = window.uslugiData.find(u => u.id == selectUsluga.value);
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
    selectUsluga.value = '';
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
                <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własny)</span>' : ''}<br>
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
                <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własna)</span>' : ''}<br>
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
    const nrRej = document.getElementById('nr_rejestracyjny').value.trim();
    if (!nrRej) {
        alert('Wprowadź numer rejestracyjny');
        return;
    }
    
    const resultsDiv = document.getElementById('integraResults');
    showSection('integraSection');
    showLoading('integraResults', 'Pobieranie danych z systemu integra...');
    
    try {
        const response = await fetch(`/api/kosztorysy-zewnetrzne/${nrRej}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Błąd pobierania danych');
        }
        
        if (data.kosztorysy.length === 0) {
            resultsDiv.innerHTML = `<p>❌ Brak kosztorysów w systemie integra dla pojazdu ${nrRej}</p>`;
            return;
        }
        
        let html = `<p>✅ Znaleziono ${data.kosztorysy.length} kosztorysów:</p>`;
        
        data.kosztorysy.forEach((kosztorys, index) => {
            html += `
                <div class="integra-kosztorys">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="integra_${index}" value="${index}" onchange="toggleIntegraKosztorys(${index})">
                        <label for="integra_${index}" style="cursor: pointer; flex: 1;">
                            <h5 style="margin: 0;">${kosztorys.numer_kosztorysu} - ${kosztorys.kwota_kosztorysu.toFixed(2)} zł</h5>
                        </label>
                    </div>
                    <p><strong>Klient:</strong> ${kosztorys.nazwa_klienta}</p>
                    <p><strong>Pozycje:</strong> ${kosztorys.towary.length} towarów, ${kosztorys.uslugi.length} usług</p>
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
        console.error('Błąd:', error);
        showError('integraResults', error.message);
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
        
        alert('Kosztorysy przygotowane do importu!\nTeraz wypełnij treść notatki i kliknij "Zapisz notatkę".');
    }
}

// RESET FORMULARZA DODAWANIA
function resetModalForm() {
    // Reset podstawowych pól
    const typNotatki = document.getElementById('typ_notatki');
    const nrRej = document.getElementById('nr_rejestracyjny');
    const noteTresc = document.getElementById('noteTresc');
    const customCostNumber = document.getElementById('customCostNumber');
    const customCostDescription = document.getElementById('customCostDescription');
    
    if (typNotatki) typNotatki.value = '';
    if (nrRej) nrRej.value = '';
    if (noteTresc) noteTresc.value = '';
    if (customCostNumber) customCostNumber.value = '';
    if (customCostDescription) customCostDescription.value = '';
    
    // Ukryj wszystkie sekcje
    hideSection('vehicleSection');
    hideSection('integraSection');
    hideSection('noteContentSection');
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
    
    if (selectedTowary) selectedTowary.innerHTML = '';
    if (selectedUslugi) selectedUslugi.innerHTML = '';
    if (integraResults) integraResults.innerHTML = '';
    if (costSummary) costSummary.style.display = 'none';
}

// PRZYGOTOWANIE DANYCH PRZED WYSŁANIEM FORMULARZA
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addNoteForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            // Przygotuj dane własnego kosztorysu jeśli został utworzony
            if (window.selectedTowary.length > 0 || window.selectedUslugi.length > 0) {
                const customCostNumber = document.getElementById('customCostNumber');
                const customCostDescription = document.getElementById('customCostDescription');
                
                if (!customCostNumber || !customCostNumber.value.trim()) {
                    e.preventDefault();
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
            
            return true;
        });
    }
});

console.log('✅ note-add.js załadowany');