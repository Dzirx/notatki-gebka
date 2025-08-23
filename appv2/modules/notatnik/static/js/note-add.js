// === MODULES/NOTATNIK/STATIC/JS/NOTE-ADD.JS ===
// Funkcje dodawania nowych notatek

console.log('📝 Moduł note-add załadowany');
let isLoadingIntegra = false;

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
    
    // Załaduj pracowników dla wszystkich typów notatek
    loadEmployeeData();
    
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

// ŁADOWANIE DANYCH DO DROPDOWNÓW (tylko towary i usługi)
async function loadDropdownData() {
    try {
        const [towaryResponse, uslugiResponse] = await Promise.all([
            fetch('/api/towary'),
            fetch('/api/uslugi')
        ]);
        
        window.towaryData = await towaryResponse.json();
        window.uslugiData = await uslugiResponse.json();
        
        // Niepotrzebne już wypełnianie select'ów - używamy wyszukiwarek
        
    } catch (error) {
        console.error('Błąd ładowania danych:', error);
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
        
        if (data.kosztorysy.length === 0) {
            resultsDiv.innerHTML = `<p>❌ Brak kosztorysów w systemie integra dla pojazdu ${nrRej}</p>`;
            return;
        }
        
        console.log(`✅ Znaleziono ${data.kosztorysy.length} kosztorysów`);
        
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
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); // Zatrzymaj normalne wysłanie formularza
            
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

console.log('✅ note-add.js załadowany');