// === MODULES/NOTATNIK/STATIC/JS/NOTE-EDIT.JS ===
// Funkcje edycji istniejących notatek

console.log('📝 Moduł note-edit załadowany');

// ZMIENNE GLOBALNE DLA EDYCJI
window.currentEditNoteId = null;
window.editSelectedTowary = [];
window.editSelectedUslugi = [];
window.editTowaryData = [];
window.editUslugiData = [];
window.editExistingCosts = [];
window.editNoteData = null;
window.editIntegraKosztorysy = [];

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
        
        // Załaduj istniejące kosztorysy
        await loadExistingCosts();
        
    } catch (error) {
        console.error('Błąd otwierania modala:', error);
        alert(`Błąd pobrania notatki: ${error.message}`);
        closeEditModal();
    }
}

// ŁADOWANIE DANYCH DO DROPDOWNÓW (EDYCJA)
async function loadEditDropdownData() {
    try {
        const [towaryResponse, uslugiResponse] = await Promise.all([
            fetch('/api/towary'),
            fetch('/api/uslugi')
        ]);
        
        window.editTowaryData = await towaryResponse.json();
        window.editUslugiData = await uslugiResponse.json();
        
        populateEditSelects();
        
    } catch (error) {
        console.error('Błąd ładowania danych:', error);
    }
}

function populateEditSelects() {
    const towarSelect = document.getElementById('editSelectTowar');
    const uslugaSelect = document.getElementById('editSelectUsluga');
    
    if (towarSelect) {
        // Wypełnij towary
        towarSelect.innerHTML = '<option value="">-- Wybierz towar --</option>';
        window.editTowaryData.forEach(towar => {
            towarSelect.innerHTML += `<option value="${towar.id}">${towar.nazwa} - ${parseFloat(towar.cena).toFixed(2)}zł</option>`;
        });
    }
    
    if (uslugaSelect) {
        // Wypełnij usługi
        uslugaSelect.innerHTML = '<option value="">-- Wybierz usługę --</option>';
        window.editUslugiData.forEach(usluga => {
            uslugaSelect.innerHTML += `<option value="${usluga.id}">${usluga.nazwa} - ${parseFloat(usluga.cena).toFixed(2)}zł</option>`;
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
    const selectTowar = document.getElementById('editSelectTowar');
    const iloscInput = document.getElementById('editTowarIlosc');
    const cenaInput = document.getElementById('editTowarCena');
    
    if (!selectTowar.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola');
        return;
    }
    
    const selectedTowar = window.editTowaryData.find(t => t.id == selectTowar.value);
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
    selectTowar.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderEditSelectedTowary();
}

function addCustomTowarToEditCost() {
    const nazwaInput = document.getElementById('editCustomTowarNazwa');
    const iloscInput = document.getElementById('editCustomTowarIlosc');
    const cenaInput = document.getElementById('editCustomTowarCena');
    
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
    
    window.editSelectedTowary.push(newItem);
    
    // Reset pól
    nazwaInput.value = '';
    iloscInput.value = '';
    cenaInput.value = '';
    
    renderEditSelectedTowary();
}

// DODAWANIE USŁUG (EDYCJA)
function addUslugaToEditCost() {
    const selectUsluga = document.getElementById('editSelectUsluga');
    const iloscInput = document.getElementById('editUslugaIlosc');
    const cenaInput = document.getElementById('editUslugaCena');
    
    if (!selectUsluga.value || !iloscInput.value || !cenaInput.value) {
        alert('Wypełnij wszystkie pola');
        return;
    }
    
    const selectedUsluga = window.editUslugiData.find(u => u.id == selectUsluga.value);
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
    selectUsluga.value = '';
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
                <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własny)</span>' : ''}<br>
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
                <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własna)</span>' : ''}<br>
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
                <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 6px; background: white;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="edit_integra_${index}" value="${index}">
                        <label for="edit_integra_${index}" style="cursor: pointer; flex: 1;">
                            <strong>${kosztorys.numer_kosztorysu}</strong> - ${kosztorys.kwota_kosztorysu.toFixed(2)} zł
                        </label>
                    </div>
                    <p><strong>Klient:</strong> ${kosztorys.nazwa_klienta}</p>
                    <p><strong>Towary:</strong> ${kosztorys.towary.length} | <strong>Usługi:</strong> ${kosztorys.uslugi.length}</p>
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
    window.editTowaryData = [];
    window.editUslugiData = [];
    window.editExistingCosts = [];
    window.editNoteData = null;
    window.editIntegraKosztorysy = [];
    
    // Reset pól formularza
    const editTresc = document.getElementById('edit_tresc');
    const editNewCostNumber = document.getElementById('editNewCostNumber');
    const editNewCostDescription = document.getElementById('editNewCostDescription');
    
    if (editTresc) editTresc.value = '';
    if (editNewCostNumber) editNewCostNumber.value = '';
    if (editNewCostDescription) editNewCostDescription.value = '';
    
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
            if (!tresc) return alert('Treść notatki nie może być pusta');

            try {
                const res = await fetch(`/api/notatka/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tresc }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Nie udało się zapisać');

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

console.log('✅ note-edit.js załadowany');