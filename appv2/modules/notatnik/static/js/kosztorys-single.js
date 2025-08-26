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
            <input type="number" value="${towar.ilosc || 1}" onchange="updateEditTowar(${index}, 'ilosc', parseFloat(this.value))" class="form-control" step="0.1" min="0.1">
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
            <input type="number" value="${usluga.ilosc || 1}" onchange="updateEditUsluga(${index}, 'ilosc', parseFloat(this.value))" class="form-control" step="0.1" min="0.1">
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
        
        // Jeśli towar ma ID (już zapisany w bazie), usuń przez API
        if (towar.kosztorys_towar_id) {
            try {
                const kosztorysId = window.kosztorysData?.id;
                const response = await fetch(`/api/kosztorys/${kosztorysId}/towar/${towar.kosztorys_towar_id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error('Nie udało się usunąć towaru z bazy danych');
                }
                
                showToast('✅ Towar został usunięty', 'success');
                
                // Przeładuj stronę po chwili
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Błąd usuwania towaru:', error);
                showToast('❌ Błąd: ' + error.message, 'error');
                return;
            }
        } else {
            // Towar nie zapisany w bazie - usuń tylko lokalnie
            editTowaryList.splice(index, 1);
            renderEditTowary();
            updateEditTotal();
        }
    }
}

// USUŃ USŁUGĘ
async function removeEditUsluga(index) {
    if (index >= 0 && index < editUslugiList.length) {
        const usluga = editUslugiList[index];
        
        // Jeśli usługa ma ID (już zapisana w bazie), usuń przez API
        if (usluga.kosztorys_usluga_id) {
            try {
                const kosztorysId = window.kosztorysData?.id;
                const response = await fetch(`/api/kosztorys/${kosztorysId}/usluga/${usluga.kosztorys_usluga_id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error('Nie udało się usunąć usługi z bazy danych');
                }
                
                showToast('✅ Usługa została usunięta', 'success');
                
                // Przeładuj stronę po chwili
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Błąd usuwania usługi:', error);
                showToast('❌ Błąd: ' + error.message, 'error');
                return;
            }
        } else {
            // Usługa nie zapisana w bazie - usuń tylko lokalnie
            editUslugiList.splice(index, 1);
            renderEditUslugi();
            updateEditTotal();
        }
    }
}

// DODAJ NOWY TOWAR
function addNewTowarRow() {
    editTowaryList.push({
        id: null,
        nazwa: 'Nowy towar',
        ilosc: 1,
        cena: 0,
        isCustom: true
    });
    renderEditTowary();
    updateEditTotal();
}

// DODAJ NOWĄ USŁUGĘ
function addNewUslugaRow() {
    editUslugiList.push({
        id: null,
        nazwa: 'Nowa usługa',
        ilosc: 1,
        cena: 0,
        isCustom: true
    });
    renderEditUslugi();
    updateEditTotal();
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
        
        // 1. Usuń stary kosztorys
        const deleteResponse = await fetch(`/api/kosztorys/${kosztorysId}`, {
            method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
            throw new Error('Nie udało się usunąć starego kosztorysu');
        }
        
        // 2. Utwórz nowy kosztorys z edytowanymi danymi
        const costData = {
            notatka_id: noteId,
            numer_kosztorysu: numer,
            opis: opis,
            towary: editTowaryList,
            uslugi: editUslugiList
        };
        
        const createResponse = await fetch('/api/kosztorys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(costData)
        });
        
        const result = await createResponse.json();
        
        if (!createResponse.ok) {
            throw new Error(result.detail || 'Błąd tworzenia nowego kosztorysu');
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