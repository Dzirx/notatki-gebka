// === MODULES/NOTATNIK/STATIC/JS/NOTE-EDIT.JS ===
// Funkcje edycji istniejących notatek

console.log('📝 Moduł note-edit załadowany');

// ZMIENNE GLOBALNE DLA EDYCJI
window.currentEditNoteId = null;
window.editSelectedTowary = [];
window.editSelectedUslugi = [];
window.editExistingCosts = [];
window.editNoteData = null;
window.editIntegraKosztorysy = [];
// editTowaryData i editUslugiData usunięte - używamy wyszukiwarek

// OTWIERANIE MODALA EDYCJI
async function openEditModal(noteId) {
    try {
        // Reset zmiennych
        window.currentEditNoteId = noteId;
        window.editSelectedTowary = [];
        window.editSelectedUslugi = [];
        
        // Pokaż modal
        document.getElementById('editModal').style.display = 'block';
        const noteIdElement = document.getElementById('editNoteId');
        if (noteIdElement) noteIdElement.textContent = noteId;
        
        // Pobierz szczegółowe dane notatki
        const noteResponse = await fetch(`/api/notatka-szczegoly/${noteId}`);
        const noteData = await noteResponse.json();
        if (!noteResponse.ok) throw new Error(noteData.detail || 'Nie udało się pobrać notatki');
        
        window.editNoteData = noteData;
        
        // Wypełnij treść notatki
        const editTresc = document.getElementById('edit_tresc');
        if (editTresc) editTresc.value = noteData.tresc || '';
        
        // Pobierz szczegółowe dane notatki z pracownikiem (dla wszystkich notatek)
        const detailResponse = await fetch(`/api/notatka/${noteId}`);
        const detailData = await detailResponse.json();
        const editPracownikId = document.getElementById('edit_pracownik_id');
        if (editPracownikId) {
            editPracownikId.value = detailData.pracownik_id || '';
        }
        
        // Pokaż przycisk importu z integra jeśli to pojazd
        const editImportSection = document.getElementById('editImportSection');
        if (editImportSection) {
            if (noteData.samochod) {
                editImportSection.style.display = 'block';
            } else {
                editImportSection.style.display = 'none';
            }
        }
        
        // Załaduj dane towarów i usług
        await loadEditDropdownData();
        
        // Inicjalizuj upload zone dla załączników
        initEditFileUpload();
        
        // Załaduj istniejące załączniki
        await loadExistingAttachments(noteId);
        
        // Załaduj istniejące kosztorysy
        await loadExistingCosts();
        
        // Załaduj istniejące przypomnienia
        await loadExistingReminders(noteId);
        
    } catch (error) {
        console.error('Błąd otwierania modala:', error);
        alert(`Błąd pobrania notatki: ${error.message}`);
        closeEditModal();
    }
}

// ŁADOWANIE DANYCH PRACOWNIKÓW (EDYCJA)
async function loadEditDropdownData() {
    try {
        // Tylko pracownicy - towary i usługi używają wyszukiwarek
        const pracownicyResponse = await fetch('/api/pracownicy');
        window.editPracownicyData = await pracownicyResponse.json();
        
        populateEditSelects();
        
    } catch (error) {
        console.error('Błąd ładowania danych pracowników:', error);
    }
}

function populateEditSelects() {
    // editSelectTowar i editSelectUsluga zastąpione wyszukiwarkami
    const pracownikSelect = document.getElementById('edit_pracownik_id');
    
    if (pracownikSelect) {
        // Wypełnij pracowników (zachowaj current value)
        const currentValue = pracownikSelect.value;
        pracownikSelect.innerHTML = '<option value="">-- Wybierz pracownika --</option>';
        window.editPracownicyData.forEach(pracownik => {
            const selected = pracownik.id == currentValue ? 'selected' : '';
            pracownikSelect.innerHTML += `<option value="${pracownik.id}" ${selected}>${pracownik.pelne_imie}</option>`;
        });
    }
}

// ŁADOWANIE ISTNIEJĄCYCH KOSZTORYSÓW
async function loadExistingCosts() {
    try {
        const response = await fetch(`/api/kosztorysy-notatki/${window.currentEditNoteId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Błąd pobierania kosztorysów');
        }
        
        window.editExistingCosts = data.kosztorysy || [];
        renderExistingCosts();
        
    } catch (error) {
        console.error('Błąd ładowania kosztorysów:', error);
        showError('editExistingList', 'Błąd ładowania kosztorysów');
    }
}

function renderExistingCosts() {
    const container = document.getElementById('editExistingList');
    
    if (!container) return;
    
    if (window.editExistingCosts.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak kosztorysów dla tej notatki</p>';
        return;
    }
    
    container.innerHTML = window.editExistingCosts.map(cost => `
        <div class="edit-existing-cost">
            <h5>💰 ${cost.numer || 'Brak numeru'} - ${parseFloat(cost.kwota_calkowita).toFixed(2)} zł</h5>
            <p><strong>Status:</strong> ${cost.status} | <strong>Data:</strong> ${new Date(cost.created_at).toLocaleDateString()}</p>
            ${cost.opis ? `<p><strong>Opis:</strong> ${cost.opis}</p>` : ''}
            
            ${cost.towary && cost.towary.length > 0 ? `
                <p><strong>Towary:</strong> ${cost.towary.map(t => `${t.nazwa} (${t.ilosc}x)`).join(', ')}</p>
            ` : ''}
            
            ${cost.uslugi && cost.uslugi.length > 0 ? `
                <p><strong>Usługi:</strong> ${cost.uslugi.map(u => `${u.nazwa} (${u.ilosc}x)`).join(', ')}</p>
            ` : ''}
            
            <div class="edit-existing-actions">
                <a href="/notatnik/kosztorys/${window.currentEditNoteId}" class="btn btn-sm btn-info" target="_blank">👁️ Zobacz szczegóły</a>
                <button type="button" class="btn btn-sm btn-danger" onclick="deleteExistingCost(${cost.id})">🗑️ Usuń</button>
            </div>
        </div>
    `).join('');
}

// DODAWANIE TOWARÓW (EDYCJA)
function addTowarToEditCost() {
    const selectedTowarId = document.getElementById('editSelectedTowarId');
    const selectedTowarData = document.getElementById('editSelectedTowarData');
    const iloscInput = document.getElementById('editTowarIlosc');
    const cenaInput = document.getElementById('editTowarCena');
    
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
    
    window.editSelectedTowary.push(newItem);
    
    // Reset pól
    document.getElementById('editSearchTowar').value = '';
    selectedTowarId.value = '';
    selectedTowarData.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderEditSelectedTowary();
}

function addCustomTowarToEditCost() {
    const nazwaInput = document.getElementById('editCustomTowarNazwa');
    const numerInput = document.getElementById('editCustomTowarNumer');
    const producentInput = document.getElementById('editCustomTowarProducent');
    const rodzajSelect = document.getElementById('editCustomTowarRodzaj');
    const typSelect = document.getElementById('editCustomTowarTyp');
    const indeksInput = document.getElementById('editCustomTowarIndeks');
    const iloscInput = document.getElementById('editCustomTowarIlosc');
    const cenaInput = document.getElementById('editCustomTowarCena');
    
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
    
    window.editSelectedTowary.push(newItem);
    
    // Reset pól
    nazwaInput.value = '';
    numerInput.value = '';
    producentInput.value = '';
    rodzajSelect.value = '';
    typSelect.value = '';
    indeksInput.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderEditSelectedTowary();
}

// DODAWANIE USŁUG (EDYCJA)
function addUslugaToEditCost() {
    const selectedUslugaId = document.getElementById('editSelectedUslugaId');
    const selectedUslugaData = document.getElementById('editSelectedUslugaData');
    const iloscInput = document.getElementById('editUslugaIlosc');
    const cenaInput = document.getElementById('editUslugaCena');
    
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
    
    window.editSelectedUslugi.push(newItem);
    
    // Reset pól
    document.getElementById('editSearchUsluga').value = '';
    selectedUslugaId.value = '';
    selectedUslugaData.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderEditSelectedUslugi();
}

function addCustomUslugaToEditCost() {
    const nazwaInput = document.getElementById('editCustomUslugaNazwa');
    const iloscInput = document.getElementById('editCustomUslugaIlosc');
    const cenaInput = document.getElementById('editCustomUslugaCena');
    
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
    
    window.editSelectedUslugi.push(newItem);
    
    // Reset pól
    nazwaInput.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderEditSelectedUslugi();
}

// RENDEROWANIE WYBRANYCH POZYCJI (EDYCJA)
function renderEditSelectedTowary() {
    const container = document.getElementById('editSelectedTowary');
    
    if (!container) return;
    
    if (window.editSelectedTowary.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych towarów</p>';
        updateEditCostSummary();
        return;
    }
    
    container.innerHTML = window.editSelectedTowary.map((item, index) => `
        <div class="edit-cost-item">
            <div class="item-info">
                <strong>${item.nazwa}</strong>${item.numer_katalogowy ? ` <span style="color: #666; font-size: 0.9em;">${item.numer_katalogowy}</span>` : ''}<br>
                <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
            </div>
            <div class="item-actions">
                <button type="button" class="btn btn-sm btn-warning" onclick="editTowarItem(${index})">✏️</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeEditTowar(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
    
    updateEditCostSummary();
}

function renderEditSelectedUslugi() {
    const container = document.getElementById('editSelectedUslugi');
    
    if (!container) return;
    
    if (window.editSelectedUslugi.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych usług</p>';
        updateEditCostSummary();
        return;
    }
    
    container.innerHTML = window.editSelectedUslugi.map((item, index) => `
        <div class="edit-cost-item">
            <div class="item-info">
                <strong>${item.nazwa}</strong><br>
                <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
            </div>
            <div class="item-actions">
                <button type="button" class="btn btn-sm btn-warning" onclick="editUslugaItem(${index})">✏️</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeEditUsluga(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
    
    updateEditCostSummary();
}

// USUWANIE POZYCJI (EDYCJA)
function removeEditTowar(index) {
    window.editSelectedTowary.splice(index, 1);
    renderEditSelectedTowary();
}

function removeEditUsluga(index) {
    window.editSelectedUslugi.splice(index, 1);
    renderEditSelectedUslugi();
}

// EDYCJA POZYCJI (EDYCJA)
function editTowarItem(index) {
    const item = window.editSelectedTowary[index];
    const newIlosc = prompt('Nowa ilość:', item.ilosc);
    const newCena = prompt('Nowa cena:', item.cena);
    
    if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
        window.editSelectedTowary[index].ilosc = parseFloat(newIlosc);
        window.editSelectedTowary[index].cena = parseFloat(newCena);
        renderEditSelectedTowary();
    }
}

function editUslugaItem(index) {
    const item = window.editSelectedUslugi[index];
    const newIlosc = prompt('Nowa ilość:', item.ilosc);
    const newCena = prompt('Nowa cena:', item.cena);
    
    if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
        window.editSelectedUslugi[index].ilosc = parseFloat(newIlosc);
        window.editSelectedUslugi[index].cena = parseFloat(newCena);
        renderEditSelectedUslugi();
    }
}

// OBLICZANIE SUMY (EDYCJA)
function calculateEditCostTotal() {
    let total = 0;
    
    window.editSelectedTowary.forEach(item => {
        total += item.ilosc * item.cena;
    });
    
    window.editSelectedUslugi.forEach(item => {
        total += item.ilosc * item.cena;
    });
    
    return total;
}

function updateEditCostSummary() {
    const total = calculateEditCostTotal();
    const hasItems = window.editSelectedTowary.length > 0 || window.editSelectedUslugi.length > 0;
    
    const summaryDiv = document.getElementById('editNewCostSummary');
    const totalDiv = document.getElementById('editCostTotal');
    
    if (summaryDiv && totalDiv) {
        if (hasItems) {
            summaryDiv.style.display = 'block';
            totalDiv.innerHTML = `Łączna kwota: <span style="color: #28a745;">${total.toFixed(2)} zł</span>`;
        } else {
            summaryDiv.style.display = 'none';
        }
    }
}

// ZAPISYWANIE NOWEGO KOSZTORYSU
async function saveNewCostEstimate() {
    const numer = document.getElementById('editNewCostNumber').value.trim();
    const opis = document.getElementById('editNewCostDescription').value.trim();
    
    if (!numer) {
        alert('Podaj numer kosztorysu');
        return;
    }
    
    if (window.editSelectedTowary.length === 0 && window.editSelectedUslugi.length === 0) {
        alert('Dodaj przynajmniej jeden towar lub usługę');
        return;
    }
    
    try {
        const costData = {
            notatka_id: window.currentEditNoteId,
            numer_kosztorysu: numer,
            opis: opis,
            towary: window.editSelectedTowary,
            uslugi: window.editSelectedUslugi
        };
        
        const response = await fetch('/api/kosztorys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(costData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Błąd zapisywania kosztorysu');
        }
        
        alert('✅ Kosztorys został zapisany!');
        
        // Reset formularza nowego kosztorysu
        document.getElementById('editNewCostNumber').value = '';
        document.getElementById('editNewCostDescription').value = '';
        window.editSelectedTowary = [];
        window.editSelectedUslugi = [];
        renderEditSelectedTowary();
        renderEditSelectedUslugi();
        
        // Odśwież listę istniejących kosztorysów
        await loadExistingCosts();
        
    } catch (error) {
        console.error('Błąd zapisywania kosztorysu:', error);
        alert('❌ Błąd: ' + error.message);
    }
}

// USUWANIE ISTNIEJĄCEGO KOSZTORYSU
async function deleteExistingCost(costId) {
    if (!confirm('Czy na pewno chcesz usunąć ten kosztorys?')) return;
    
    try {
        const response = await fetch(`/api/kosztorys/${costId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Błąd usuwania');
        }
        
        alert('✅ Kosztorys został usunięty!');
        await loadExistingCosts();
        
    } catch (error) {
        console.error('Błąd usuwania kosztorysu:', error);
        alert('❌ Błąd: ' + error.message);
    }
}

// IMPORT Z INTEGRA (EDYCJA)
async function importFromIntegraEdit() {
    const noteData = window.editNoteData;
    if (!noteData || !noteData.samochod) {
        alert('Ta notatka nie jest przypisana do pojazdu');
        return;
    }
    
    const nrRej = noteData.samochod.nr_rejestracyjny;
    const resultsDiv = document.getElementById('editIntegraResults');
    
    showLoading('editIntegraResults', 'Pobieranie danych z systemu integra...');
    
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
        
        let html = `
            <h5>💰 Dostępne kosztorysy z integra (${data.kosztorysy.length}):</h5>
            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #f8f9fa;">
        `;
        
        data.kosztorysy.forEach((kosztorys, index) => {
            html += `
                <div style="border: 1px solid #007bff; margin: 10px 0; border-radius: 6px; background: white; box-shadow: 0 2px 4px rgba(0,123,255,0.1);">
                    <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 12px; margin: -1px -1px 15px -1px; border-radius: 5px 5px 0 0;">
                        <label for="edit_integra_${index}" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="edit_integra_${index}" value="${index}" style="transform: scale(1.2);">
                                <h5 style="margin: 0; font-size: 16px; font-weight: bold;">${kosztorys.numer_kosztorysu}</h5>
                            </div>
                            <div style="font-size: 18px; font-weight: bold; color: #fff3e0;">
                                ${kosztorys.kwota_kosztorysu.toFixed(2)} zł
                            </div>
                        </label>
                    </div>
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
                                                ${kosztorys.uslugi.map(u => `<li style="margin-bottom: 4px; line-height: 1.4;">${u.nazwa} - ${u.ilosc}x ${parseFloat(u.cena).toFixed(2)} zł</li>`).join('')}
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
            </div>
            <button type="button" class="btn btn-success" onclick="importSelectedFromIntegraEdit()" style="margin-top: 10px;">
                📥 Importuj wybrane kosztorysy
            </button>
        `;
        
        resultsDiv.innerHTML = html;
        window.editIntegraKosztorysy = data.kosztorysy;
        
    } catch (error) {
        console.error('Błąd importu z integra:', error);
        showError('editIntegraResults', error.message);
    }
}

// IMPORT WYBRANYCH KOSZTORYSÓW Z INTEGRA (EDYCJA)
async function importSelectedFromIntegraEdit() {
    const checkboxes = document.querySelectorAll('#editIntegraResults input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('Wybierz przynajmniej jeden kosztorys');
        return;
    }
    
    try {
        for (const checkbox of checkboxes) {
            const index = parseInt(checkbox.value);
            const kosztorys = window.editIntegraKosztorysy[index];
            
            const importData = {
                notatka_id: window.currentEditNoteId,
                kosztorys_data: kosztorys
            };
            
            const response = await fetch('/api/importuj-kosztorys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || 'Błąd importu');
            }
        }
        
        alert('✅ Kosztorysy zostały zaimportowane!');
        document.getElementById('editIntegraResults').innerHTML = '';
        await loadExistingCosts();
        
    } catch (error) {
        console.error('Błąd importu:', error);
        alert('❌ Błąd importu: ' + error.message);
    }
}

// RESET MODALA EDYCJI
function resetEditModal() {
    // Reset wszystkich zmiennych globalnych
    window.currentEditNoteId = null;
    window.editSelectedTowary = [];
    window.editSelectedUslugi = [];
    window.editExistingCosts = [];
    window.editNoteData = null;
    window.editIntegraKosztorysy = [];
    // editTowaryData i editUslugiData już nie istnieją
    
    // Reset pól formularza
    const editTresc = document.getElementById('edit_tresc');
    const editNewCostNumber = document.getElementById('editNewCostNumber');
    const editNewCostDescription = document.getElementById('editNewCostDescription');
    
    if (editTresc) editTresc.value = '';
    if (editNewCostNumber) editNewCostNumber.value = '';
    if (editNewCostDescription) editNewCostDescription.value = '';
    
    // Reset pól dodawania własnych towarów w edycji
    const editCustomTowarNazwa = document.getElementById('editCustomTowarNazwa');
    const editCustomTowarNumer = document.getElementById('editCustomTowarNumer');
    const editCustomTowarProducent = document.getElementById('editCustomTowarProducent');
    const editCustomTowarRodzaj = document.getElementById('editCustomTowarRodzaj');
    const editCustomTowarTyp = document.getElementById('editCustomTowarTyp');
    const editCustomTowarIndeks = document.getElementById('editCustomTowarIndeks');
    const editCustomTowarIlosc = document.getElementById('editCustomTowarIlosc');
    const editCustomTowarCena = document.getElementById('editCustomTowarCena');
    
    if (editCustomTowarNazwa) editCustomTowarNazwa.value = '';
    if (editCustomTowarNumer) editCustomTowarNumer.value = '';
    if (editCustomTowarProducent) editCustomTowarProducent.value = '';
    if (editCustomTowarRodzaj) editCustomTowarRodzaj.value = '';
    if (editCustomTowarTyp) editCustomTowarTyp.value = '';
    if (editCustomTowarIndeks) editCustomTowarIndeks.value = '';
    if (editCustomTowarIlosc) editCustomTowarIlosc.value = '';
    if (editCustomTowarCena) editCustomTowarCena.value = '';
    
    // Reset wyświetlanych kontenerów
    const editSelectedTowary = document.getElementById('editSelectedTowary');
    const editSelectedUslugi = document.getElementById('editSelectedUslugi');
    const editIntegraResults = document.getElementById('editIntegraResults');
    const editNewCostSummary = document.getElementById('editNewCostSummary');
    
    if (editSelectedTowary) editSelectedTowary.innerHTML = '';
    if (editSelectedUslugi) editSelectedUslugi.innerHTML = '';
    if (editIntegraResults) editIntegraResults.innerHTML = '';
    if (editNewCostSummary) editNewCostSummary.style.display = 'none';
}

// OBSŁUGA FORMULARZA EDYCJI TREŚCI NOTATKI
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('editForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = window.currentEditNoteId;
            if (!id) return alert('Brak ID notatki');

            const tresc = document.getElementById('edit_tresc').value.trim();
            const pracownikSelect = document.getElementById('edit_pracownik_id');
            const pracownik_id = pracownikSelect ? (pracownikSelect.value || null) : null;

            try {
                const res = await fetch(`/api/notatka/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tresc, pracownik_id }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Nie udało się zapisać');

                // Jeśli są pliki do przesłania, prześlij je
                if (window.editPendingFiles && window.editPendingFiles.length > 0) {
                    await uploadEditPendingFiles(id);
                }
                
                alert('✅ Notatka została zaktualizowana!');
                
                // Zamknij modal i odśwież stronę
                closeEditModal();
                location.reload();
                
            } catch (e) {
                alert(`Błąd zapisu: ${e.message}`);
            }
        });
    }
});

// === OBSŁUGA ZAŁĄCZNIKÓW W EDYCJI ===

// Zmienne globalne dla załączników w edycji
window.editPendingFiles = [];
window.editUploadedFiles = [];

// Inicjalizacja upload zone dla edycji
function initEditFileUpload() {
    const uploadZone = document.getElementById('editFileUploadZone');
    const fileInput = document.getElementById('editFileInput');
    
    if (!uploadZone || !fileInput) return;
    
    // Kliknięcie w upload zone
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Wybór plików przez input
    fileInput.addEventListener('change', (e) => {
        handleEditFiles(e.target.files);
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
        handleEditFiles(e.dataTransfer.files);
    });
}

function handleEditFiles(files) {
    for (let file of files) {
        if (validateEditFile(file)) {
            addEditFileToList(file);
        }
    }
}

function validateEditFile(file) {
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

function addEditFileToList(file) {
    const fileList = document.getElementById('editFileList');
    const fileId = Date.now() + Math.random();
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = `edit-file-${fileId}`;
    
    fileItem.innerHTML = `
        <div class="file-info">
            <div class="file-icon">${getEditFileIcon(file.type)}</div>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatEditFileSize(file.size)}</div>
            </div>
        </div>
        <div class="file-actions">
            <span class="file-status uploading">Gotowy do wysłania</span>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeEditFile('${fileId}')">🗑️</button>
        </div>
    `;
    
    fileList.appendChild(fileItem);
    
    // Dodaj plik do listy oczekujących
    window.editPendingFiles.push({
        id: fileId,
        file: file,
        element: fileItem
    });
}

function removeEditFile(fileId) {
    const element = document.getElementById(`edit-file-${fileId}`);
    if (element) {
        element.remove();
    }
    
    // Usuń z listy oczekujących
    window.editPendingFiles = window.editPendingFiles.filter(f => f.id !== fileId);
}

function getEditFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.startsWith('text/')) return '📃';
    return '📎';
}

function formatEditFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Funkcja wywoływana po aktualizacji notatki - przesyła pliki
async function uploadEditPendingFiles(noteId) {
    if (window.editPendingFiles.length === 0) return;
    
    for (let pendingFile of window.editPendingFiles) {
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
    window.editPendingFiles = [];
}

// Ładowanie istniejących załączników
async function loadExistingAttachments(noteId) {
    try {
        const response = await fetch(`/api/notatka/${noteId}/zalaczniki`);
        const attachments = await response.json();
        
        const container = document.getElementById('editExistingAttachments');
        
        if (attachments.length === 0) {
            container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak załączników</p>';
            return;
        }
        
        container.innerHTML = attachments.map(att => `
            <div class="existing-attachment">
                <div class="file-info">
                    <div class="file-icon">${getEditFileIcon(att.typ_mime)}</div>
                    <div class="file-details">
                        <div class="file-name">${att.nazwa_pliku}</div>
                        <div class="file-size">${formatEditFileSize(att.rozmiar)}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <a href="/api/zalacznik/${att.id}" class="btn btn-sm btn-primary" download>📥 Pobierz</a>
                    <button type="button" class="btn btn-sm btn-danger" onclick="deleteAttachment(${att.id})">🗑️</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Błąd ładowania załączników:', error);
        const container = document.getElementById('editExistingAttachments');
        container.innerHTML = '<p style="color: #dc3545;">Błąd ładowania załączników</p>';
    }
}

// Usuwanie istniejącego załącznika
async function deleteAttachment(attachmentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten załącznik?')) return;
    
    try {
        const response = await fetch(`/api/zalacznik/${attachmentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Odśwież listę załączników
            loadExistingAttachments(window.currentEditNoteId);
        } else {
            const result = await response.json();
            alert(`Błąd usuwania: ${result.detail}`);
        }
    } catch (error) {
        console.error('Błąd usuwania załącznika:', error);
        alert('Błąd usuwania załącznika');
    }
}

// === PRZYPOMNIENIA ===

// Ładowanie istniejących przypomnień
async function loadExistingReminders(noteId) {
    try {
        const response = await fetch(`/api/notatka/${noteId}/przypomnienia`);
        const reminders = await response.json();
        
        const container = document.getElementById('editExistingReminders');
        
        if (reminders.length === 0) {
            container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak przypomnień</p>';
            return;
        }
        
        container.innerHTML = reminders.map(reminder => {
            const date = new Date(reminder.data_przypomnienia);
            const formattedDate = date.toLocaleString('pl-PL');
            const statusText = reminder.wyslane ? 'Wysłane' : 'Oczekuje';
            const statusClass = reminder.wyslane ? 'text-success' : 'text-warning';
            
            return `
                <div class="existing-reminder" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div class="reminder-info">
                        <div class="reminder-date" style="font-weight: 500;">⏰ ${formattedDate}</div>
                        <div class="reminder-status ${statusClass}" style="font-size: 12px;">${statusText}</div>
                    </div>
                    <div class="reminder-actions">
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteReminder(${reminder.id})">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Błąd ładowania przypomnień:', error);
        const container = document.getElementById('editExistingReminders');
        container.innerHTML = '<p style="color: #dc3545;">Błąd ładowania przypomnień</p>';
    }
}

// Dodawanie nowego przypomnienia
async function addReminder() {
    const noteId = window.currentEditNoteId;
    if (!noteId) {
        alert('Błąd: brak ID notatki');
        return;
    }
    
    const dateInput = document.getElementById('edit_data_przypomnienia');
    const dateValue = dateInput.value;
    
    if (!dateValue) {
        alert('Proszę wybrać datę przypomnienia');
        return;
    }
    
    try {
        const response = await fetch(`/api/notatka/${noteId}/przypomnienie`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data_przypomnienia: dateValue
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Przypomnienie zostało dodane', 'success');
            dateInput.value = '';
            await loadExistingReminders(noteId);

        } else {
            showToast(result.detail || 'Błąd dodawania przypomnienia', 'error');
        }
        
    } catch (error) {
        console.error('Błąd dodawania przypomnienia:', error);
        showToast('Błąd dodawania przypomnienia', 'error');
    }
}

// Usuwanie przypomnienia
async function deleteReminder(reminderId) {
    if (!confirm('Czy na pewno chcesz usunąć to przypomnienie?')) return;
    
    try {
        const response = await fetch(`/api/przypomnienie/${reminderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Przypomnienie zostało usunięte', 'success');
            await loadExistingReminders(window.currentEditNoteId);
        } else {
            const result = await response.json();
            showToast(result.detail || 'Błąd usuwania przypomnienia', 'error');
        }
        
    } catch (error) {
        console.error('Błąd usuwania przypomnienia:', error);
        showToast('Błąd usuwania przypomnienia', 'error');
    }
}

console.log('✅ note-edit.js załadowany');