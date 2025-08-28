// === MODULES/NOTATNIK/STATIC/JS/KOSZTORYS-SINGLE.JS ===
// Funkcje dla widoku pojedynczego kosztorysu

console.log('💰 Moduł kosztorys-single załadowany');

// ZMIENNE GLOBALNE EDYCJI
let editTowaryList = [];
let editUslugiList = [];

// EDYCJA KOSZTORYSU - OTWÓRZ MODAL
async function editKosztorys(kosztorysId) {
    const modal = document.getElementById('editKosztorysModal');
    
    // Załaduj dane kosztorysu do formularza
    loadKosztorysDataToModal();
    
    // Pokaż modal
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}

// ZAMKNIJ MODAL EDYCJI
function closeEditKosztorysModal() {
    const modal = document.getElementById('editKosztorysModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

// ZAŁADUJ DANE KOSZTORYSU DO MODALA
function loadKosztorysDataToModal() {
    const data = window.kosztorysData;
    if (!data) return;
    
    // Podstawowe dane
    document.getElementById('editKosztorysNumer').value = data.numer || '';
    document.getElementById('editKosztorysOpis').value = data.opis || '';
    document.getElementById('editKosztorysStatus').value = data.status || 'draft';
    
    // Załaduj towary i usługi
    editTowaryList = [...(data.towary || [])];
    editUslugiList = [...(data.uslugi || [])];
    
    renderEditTowary();
    renderEditUslugi();
    updateEditTotal();
}

// RENDERUJ TOWARY W EDYCJI
function renderEditTowary() {
    const container = document.getElementById('editTowaryList');
    
    if (editTowaryList.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak towarów</p>';
        return;
    }
    
    container.innerHTML = editTowaryList.map((towar, index) => `
        <div class="edit-item-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
            <input type="text" value="${towar.nazwa || ''}" onchange="updateEditTowar(${index}, 'nazwa', this.value)" class="form-control">
            <input type="number" value="${towar.ilosc || 1}" onchange="updateEditTowar(${index}, 'ilosc', parseInt(this.value))" class="form-control" step="1" min="1">
            <input type="number" value="${towar.cena || 0}" onchange="updateEditTowar(${index}, 'cena', parseFloat(this.value))" class="form-control" step="0.01" min="0">
            <span style="font-weight: bold;">${((towar.ilosc || 1) * (towar.cena || 0)).toFixed(2)} zł</span>
            <button type="button" data-remove-towar="${index}" class="btn btn-sm btn-danger">🗑️</button>
        </div>
    `).join('');
    
    // Dodaj event listenery do przycisków usuwania
    container.querySelectorAll('[data-remove-towar]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-remove-towar'));
            removeEditTowar(index);
        });
    });
}

// RENDERUJ USŁUGI W EDYCJI
function renderEditUslugi() {
    const container = document.getElementById('editUslugiList');
    
    if (editUslugiList.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak usług</p>';
        return;
    }
    
    container.innerHTML = editUslugiList.map((usluga, index) => `
        <div class="edit-item-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
            <input type="text" value="${usluga.nazwa || ''}" onchange="updateEditUsluga(${index}, 'nazwa', this.value)" class="form-control">
            <input type="number" value="${usluga.ilosc || 1}" onchange="updateEditUsluga(${index}, 'ilosc', parseInt(this.value))" class="form-control" step="1" min="1">
            <input type="number" value="${usluga.cena || 0}" onchange="updateEditUsluga(${index}, 'cena', parseFloat(this.value))" class="form-control" step="0.01" min="0">
            <span style="font-weight: bold;">${((usluga.ilosc || 1) * (usluga.cena || 0)).toFixed(2)} zł</span>
            <button type="button" data-remove-usluga="${index}" class="btn btn-sm btn-danger">🗑️</button>
        </div>
    `).join('');
    
    // Dodaj event listenery do przycisków usuwania
    container.querySelectorAll('[data-remove-usluga]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-remove-usluga'));
            removeEditUsluga(index);
        });
    });
}

// AKTUALIZUJ TOWAR
function updateEditTowar(index, field, value) {
    if (editTowaryList[index]) {
        editTowaryList[index][field] = value;
        renderEditTowary();
        updateEditTotal();
    }
}

// AKTUALIZUJ USŁUGĘ
function updateEditUsluga(index, field, value) {
    if (editUslugiList[index]) {
        editUslugiList[index][field] = value;
        renderEditUslugi();
        updateEditTotal();
    }
}

// USUŃ TOWAR
async function removeEditTowar(index) {
    if (index >= 0 && index < editTowaryList.length) {
        const towar = editTowaryList[index];
        
        // Zawsze usuń tylko lokalnie - zmiany będą zapisane dopiero po kliknięciu "Zapisz zmiany"
        editTowaryList.splice(index, 1);
        renderEditTowary();
        updateEditTotal();
        showToast('Towar usunięty z listy. Kliknij "Zapisz zmiany" aby potwierdzić.', 'info');
    }
}

// USUŃ USŁUGĘ
async function removeEditUsluga(index) {
    if (index >= 0 && index < editUslugiList.length) {
        const usluga = editUslugiList[index];
        
        // Zawsze usuń tylko lokalnie - zmiany będą zapisane dopiero po kliknięciu "Zapisz zmiany"
        editUslugiList.splice(index, 1);
        renderEditUslugi();
        updateEditTotal();
        showToast('Usługa usunięta z listy. Kliknij "Zapisz zmiany" aby potwierdzić.', 'info');
    }
}

// DODAJ WŁASNY TOWAR Z PEŁNYM FORMULARZEM
function addCustomTowarToEdit() {
    const nazwa = document.getElementById('editCustomTowarNazwa').value.trim();
    const numer = document.getElementById('editCustomTowarNumer').value.trim();
    const producent = document.getElementById('editCustomTowarProducent').value.trim();
    const rodzaj = document.getElementById('editCustomTowarRodzaj').value;
    const typ = document.getElementById('editCustomTowarTyp').value;
    const indeks = document.getElementById('editCustomTowarIndeks').value.trim();
    const ilosc = parseInt(document.getElementById('editCustomTowarIlosc').value);
    const cena = parseFloat(document.getElementById('editCustomTowarCena').value);
    
    if (!nazwa) {
        showToast('Podaj nazwę towaru', 'error');
        return;
    }
    
    if (ilosc < 1) {
        showToast('Ilość musi być większa od 0', 'error');
        return;
    }
    
    if (cena < 0) {
        showToast('Cena nie może być ujemna', 'error');
        return;
    }
    
    // Dodaj towar do listy - zapisze się jako 'local' w bazie
    editTowaryList.push({
        id: null,
        nazwa: nazwa,
        numer_katalogowy: numer || null,
        nazwa_producenta: producent || null,
        rodzaj_opony: rodzaj || null,
        typ_opony: typ || null,
        opona_indeks_nosnosci: indeks || null,
        ilosc: ilosc,
        cena: cena,
        zrodlo: 'local',
        external_id: null,
        isCustom: true
    });
    
    // Wyczyść formularz
    document.getElementById('editCustomTowarNazwa').value = '';
    document.getElementById('editCustomTowarNumer').value = '';
    document.getElementById('editCustomTowarProducent').value = '';
    document.getElementById('editCustomTowarRodzaj').value = '';
    document.getElementById('editCustomTowarTyp').value = '';
    document.getElementById('editCustomTowarIndeks').value = '';
    document.getElementById('editCustomTowarIlosc').value = '1';
    document.getElementById('editCustomTowarCena').value = '';
    
    renderEditTowary();
    updateEditTotal();
    showToast('✅ Własny towar dodany', 'success');
}

// DODAJ WYSZUKANY TOWAR
function addSearchedTowar() {
    const searchInput = document.getElementById('editSearchTowar');
    const iloscInput = document.getElementById('editTowarIlosc');
    const cenaInput = document.getElementById('editTowarCena');
    const selectedId = document.getElementById('editSelectedTowarId');
    const selectedData = document.getElementById('editSelectedTowarData');
    
    if (!selectedId.value || !selectedData.value) {
        showToast('Najpierw wyszukaj i wybierz towar', 'error');
        return;
    }
    
    const ilosc = parseInt(iloscInput.value);
    const cena = parseFloat(cenaInput.value);
    
    if (ilosc < 1) {
        showToast('Ilość musi być większa od 0', 'error');
        return;
    }
    
    if (cena < 0) {
        showToast('Cena nie może być ujemna', 'error');
        return;
    }
    
    try {
        const towarData = JSON.parse(selectedData.value);
        
        // Dodaj towar do listy
        editTowaryList.push({
            id: towarData.id,
            towar_id: towarData.id, // dla kompatybilności z backendem
            nazwa: towarData.display || towarData.nazwa,
            ilosc: ilosc,
            cena: cena,
            isCustom: false
        });
        
        // Wyczyść formularz wyszukiwania
        searchInput.value = '';
        iloscInput.value = '1';
        cenaInput.value = '0';
        selectedId.value = '';
        selectedData.value = '';
        
        renderEditTowary();
        updateEditTotal();
        showToast('✅ Towar dodany', 'success');
        
    } catch (error) {
        console.error('Błąd dodawania towaru:', error);
        showToast('Błąd dodawania towaru', 'error');
    }
}

// DODAJ WŁASNĄ USŁUGĘ Z FORMULARZEM
function addCustomUslugaToEdit() {
    const nazwa = document.getElementById('editCustomUslugaNazwa').value.trim();
    const ilosc = parseInt(document.getElementById('editCustomUslugaIlosc').value);
    const cena = parseFloat(document.getElementById('editCustomUslugaCena').value);
    
    if (!nazwa) {
        showToast('Podaj nazwę usługi', 'error');
        return;
    }
    
    if (ilosc < 1) {
        showToast('Ilość musi być większa od 0', 'error');
        return;
    }
    
    if (cena < 0) {
        showToast('Cena nie może być ujemna', 'error');
        return;
    }
    
    // Dodaj usługę do listy - zapisze się jako 'local' w bazie
    editUslugiList.push({
        id: null,
        nazwa: nazwa,
        ilosc: ilosc,
        cena: cena,
        zrodlo: 'local',
        external_id: null,
        isCustom: true
    });
    
    // Wyczyść formularz
    document.getElementById('editCustomUslugaNazwa').value = '';
    document.getElementById('editCustomUslugaIlosc').value = '1';
    document.getElementById('editCustomUslugaCena').value = '';
    
    renderEditUslugi();
    updateEditTotal();
    showToast('✅ Własna usługa dodana', 'success');
}

// DODAJ WYSZUKANĄ USŁUGĘ
function addSearchedUsluga() {
    const searchInput = document.getElementById('editSearchUsluga');
    const iloscInput = document.getElementById('editUslugaIlosc');
    const cenaInput = document.getElementById('editUslugaCena');
    const selectedId = document.getElementById('editSelectedUslugaId');
    const selectedData = document.getElementById('editSelectedUslugaData');
    
    if (!selectedId.value || !selectedData.value) {
        showToast('Najpierw wyszukaj i wybierz usługę', 'error');
        return;
    }
    
    const ilosc = parseInt(iloscInput.value);
    const cena = parseFloat(cenaInput.value);
    
    if (ilosc < 1) {
        showToast('Ilość musi być większa od 0', 'error');
        return;
    }
    
    if (cena < 0) {
        showToast('Cena nie może być ujemna', 'error');
        return;
    }
    
    try {
        const uslugaData = JSON.parse(selectedData.value);
        
        // Dodaj usługę do listy
        editUslugiList.push({
            id: uslugaData.id,
            uslugi_id: uslugaData.id, // dla kompatybilności z backendem
            nazwa: uslugaData.display || uslugaData.nazwa,
            ilosc: ilosc,
            cena: cena,
            isCustom: false
        });
        
        // Wyczyść formularz wyszukiwania
        searchInput.value = '';
        iloscInput.value = '1';
        cenaInput.value = '0';
        selectedId.value = '';
        selectedData.value = '';
        
        renderEditUslugi();
        updateEditTotal();
        showToast('✅ Usługa dodana', 'success');
        
    } catch (error) {
        console.error('Błąd dodawania usługi:', error);
        showToast('Błąd dodawania usługi', 'error');
    }
}

// AKTUALIZUJ ŁĄCZNĄ KWOTĘ
function updateEditTotal() {
    let total = 0;
    
    editTowaryList.forEach(towar => {
        total += (towar.ilosc || 0) * (towar.cena || 0);
    });
    
    editUslugiList.forEach(usluga => {
        total += (usluga.ilosc || 0) * (usluga.cena || 0);
    });
    
    document.getElementById('editTotalAmount').textContent = total.toFixed(2) + ' zł';
}

// OBSŁUGA FORMULARZA EDYCJI
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editKosztorysForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditKosztorysSubmit);
    }
});

// ZAPISZ ZMIANY KOSZTORYSU
async function handleEditKosztorysSubmit(e) {
    e.preventDefault();
    
    const kosztorysId = window.kosztorysData?.id;
    const noteId = window.kosztorysData?.noteId;
    
    if (!kosztorysId || !noteId) {
        showToast('Błąd: Brak danych kosztorysu', 'error');
        return;
    }
    
    // Zbierz dane z formularza
    const numer = document.getElementById('editKosztorysNumer').value.trim();
    const opis = document.getElementById('editKosztorysOpis').value.trim();
    const status = document.getElementById('editKosztorysStatus').value;
    
    if (!numer) {
        showToast('Podaj numer kosztorysu', 'error');
        return;
    }
    
    if (editTowaryList.length === 0 && editUslugiList.length === 0) {
        showToast('Dodaj przynajmniej jeden towar lub usługę', 'error');
        return;
    }
    
    try {
        showToast('Zapisywanie zmian...', 'info');
        
        // Przygotuj dane - usuń kosztorys_towar_id i kosztorys_usluga_id, ale zachowaj id i isCustom
        const towaryData = editTowaryList.map(towar => {
            const { kosztorys_towar_id, towar_id, ...cleanTowar } = towar;
            // Jeśli ma towar_id, użyj go jako id (z bazy danych)
            if (towar_id && !cleanTowar.isCustom) {
                cleanTowar.id = towar_id;
            }
            // Jeśli nie ma id ani isCustom, oznacz jako custom
            if (!cleanTowar.id && !cleanTowar.isCustom) {
                cleanTowar.isCustom = true;
            }
            return cleanTowar;
        });
        
        const uslugiData = editUslugiList.map(usluga => {
            const { kosztorys_usluga_id, uslugi_id, ...cleanUsluga } = usluga;
            // Jeśli ma uslugi_id, użyj go jako id (z bazy danych)
            if (uslugi_id && !cleanUsluga.isCustom) {
                cleanUsluga.id = uslugi_id;
            }
            // Jeśli nie ma id ani isCustom, oznacz jako custom
            if (!cleanUsluga.id && !cleanUsluga.isCustom) {
                cleanUsluga.isCustom = true;
            }
            return cleanUsluga;
        });
        
        const costData = {
            notatka_id: noteId,
            numer_kosztorysu: numer,
            opis: opis,
            towary: towaryData,
            uslugi: uslugiData
        };
        
        // Zaktualizuj kosztorys używając nowego endpointu
        const updateResponse = await fetch(`/api/edit-kosztorys/${kosztorysId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(costData)
        });
        
        const result = await updateResponse.json();
        
        if (!updateResponse.ok) {
            throw new Error(result.detail || 'Błąd aktualizacji kosztorysu');
        }
        
        showToast('✅ Kosztorys został zaktualizowany!', 'success');
        
        // Przeładuj stronę po chwili
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Błąd zapisywania kosztorysu:', error);
        showToast('❌ Błąd: ' + error.message, 'error');
    }
}

// USUWANIE KOSZTORYSU
async function deleteKosztorys(kosztorysId, noteId) {
    if (!confirm('Czy na pewno chcesz usunąć ten kosztorys?')) {
        return;
    }

    try {
        showToast('Usuwanie kosztorysu...', 'info');
        
        const response = await fetch(`/api/kosztorys/${kosztorysId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showToast('✅ Kosztorys został usunięty!', 'success');
            
            // Po krótkiej chwili przekieruj do strony głównej
            setTimeout(() => {
                window.location.href = `/notatnik`;
            }, 1500);
            
        } else {
            throw new Error(result.detail || 'Błąd usuwania kosztorysu');
        }
        
    } catch (error) {
        console.error('Błąd usuwania kosztorysu:', error);
        showToast('❌ Błąd: ' + error.message, 'error');
    }
}

// SYSTEM POWIADOMIEŃ (TOAST) - uproszczona wersja
function showToast(message, type = 'info') {
    // Usuń poprzednie toasty
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    // Utwórz nowy toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        transform: translateX(100%);
        transition: all 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animacja pojawiania
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Automatyczne usunięcie
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// FUNKCJE POMOCNICZE
function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2) + ' zł';
}

// EKSPORT DO KONSOLI DEWELOPERSKIEJ
if (typeof window !== 'undefined') {
    window.debug_kosztorys_single = function() {
        console.log('=== DEBUG KOSZTORYS SINGLE ===');
        console.log('Dane kosztorysu:', window.kosztorysData);
        console.log('Dostępne funkcje:', {
            editKosztorys: typeof editKosztorys,
            deleteKosztorys: typeof deleteKosztorys,
            showToast: typeof showToast
        });
    };
}

console.log('✅ kosztorys-single.js załadowany');