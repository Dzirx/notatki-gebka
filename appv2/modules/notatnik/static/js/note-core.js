// === MODULES/NOTATNIK/STATIC/JS/NOTE-CORE.JS ===
// Podstawowe funkcje notatnika

console.log('📝 Moduł note-core załadowany');

// MODALE - podstawowe funkcje
function openModal() {
    document.getElementById('noteModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('noteModal').style.display = 'none';
    resetModalForm();
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    resetEditModal();
}

// FUNKCJE POKAZYWANIA/UKRYWANIA SEKCJI
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        section.classList.add('slide-in');
    }
}

function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('hidden');
        section.classList.remove('slide-in');
    }
}

// WYSZUKIWANIE I FILTROWANIE
function filterNotatkiByRej() {
    const filter = document.getElementById('searchRejInput').value.toUpperCase();
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        // Pobierz numer rejestracyjny
        const nrRej = (row.getAttribute('data-nr-rej') || '').toUpperCase();
        
        // Pobierz treść notatki z komórki
        const trescCell = row.querySelector('.note-content');
        const tresc = trescCell ? trescCell.textContent.toUpperCase() : '';
        
        // Pokaż wiersz jeśli filter pasuje do numeru rej. LUB treści
        const pokazWiersz = nrRej.includes(filter) || tresc.includes(filter);
        row.style.display = pokazWiersz ? '' : 'none';
    });
    
    // Pokaż ile znaleziono
    const visibleRows = document.querySelectorAll('tbody tr[style=""], tbody tr:not([style])').length;
    const totalRows = document.querySelectorAll('tbody tr').length;
    
    // Dodaj/zaktualizuj info o wyszukiwaniu
    let searchInfo = document.getElementById('search-info');
    if (!searchInfo) {
        searchInfo = document.createElement('div');
        searchInfo.id = 'search-info';
        searchInfo.style.cssText = 'margin-top: 10px; color: #6c757d; font-size: 14px;';
        document.querySelector('.search-rej').appendChild(searchInfo);
    }
    
    if (filter) {
        searchInfo.textContent = `Znaleziono: ${visibleRows} z ${totalRows} notatek`;
    } else {
        searchInfo.textContent = '';
    }
}

function clearRejSearch() {
    document.getElementById('searchRejInput').value = '';
    filterNotatkiByRej();
}

// CHECKBOXY - obsługa zaznaczania
function toggleAllCheckboxes() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.note-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });
}

function getSelectedNotes() {
    const checkboxes = document.querySelectorAll('.note-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// AKCJE GRUPOWE
async function editSelected() {
    const selected = getSelectedNotes();
    if (selected.length === 0) return alert('Zaznacz przynajmniej jedną notatkę');
    if (selected.length > 1) return alert('Wybierz tylko jedną notatkę do edycji');
    openEditModal(selected[0]);
}

async function deleteSelected() {
    const selected = getSelectedNotes();
    if (selected.length === 0) return alert('Zaznacz przynajmniej jedną notatkę');

    if (!confirm(`Czy na pewno chcesz usunąć ${selected.length} notatkę/notatki?`)) return;

    try {
        await Promise.all(selected.map(async (id) => {
            const res = await fetch(`/api/notatka/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `Nie udało się usunąć ID ${id}`);
            }
            // Usuń wiersz z tabeli jeśli jest
            const row = document.querySelector(`tr[data-note-id="${id}"]`);
            if (row) row.remove();
        }));

        // Jeżeli nie ma wierszy w DOM (np. brak atrybutów), przeładuj
        if (document.querySelectorAll('tbody tr').length === 0) location.reload();
    } catch (e) {
        alert(`Błąd usuwania: ${e.message}`);
    }
}

// SYNCHRONIZACJA TOWARÓW (funkcja administracyjna)
async function syncTowary() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    try {
        // Pokaż spinner
        button.innerHTML = '⏳ Synchronizuję...';
        button.disabled = true;
        
        console.log('🔄 Rozpoczynam synchronizację towarów i usług...');
        
        // Wywołaj API
        const response = await fetch('/api/sync-towary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Błąd synchronizacji');
        }
        
        // Pokaż wyniki
        const stats = data.stats;
        const message = `✅ Synchronizacja zakończona!\n\n` +
                       `📦 Towary:\n` +
                       `  • Dodane: ${stats.towary_dodane}\n` +
                       `  • Zaktualizowane: ${stats.towary_zaktualizowane}\n\n` +
                       `🔧 Usługi:\n` +
                       `  • Dodane: ${stats.uslugi_dodane}\n` +
                       `  • Zaktualizowane: ${stats.uslugi_zaktualizowane}\n\n` +
                       `⏱️ Czas: ${data.czas_wykonania}s`;
        
        alert(message);
        console.log('✅ Synchronizacja zakończona:', data);
        
    } catch (error) {
        console.error('❌ Błąd synchronizacji:', error);
        alert(`❌ Błąd synchronizacji:\n${error.message}`);
        
    } finally {
        // Przywróć przycisk
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// AUTO-WYPEŁNIANIE CEN (wspólne dla obu modali)
document.addEventListener('change', function(e) {
    // Dla modala dodawania
    if (e.target.id === 'selectTowar') {
        const selectedTowar = window.towaryData?.find(t => t.id == e.target.value);
        if (selectedTowar) {
            document.getElementById('towarCena').value = parseFloat(selectedTowar.cena).toFixed(2);
        }
    }
    
    if (e.target.id === 'selectUsluga') {
        const selectedUsluga = window.uslugiData?.find(u => u.id == e.target.value);
        if (selectedUsluga) {
            document.getElementById('uslugaCena').value = parseFloat(selectedUsluga.cena).toFixed(2);
        }
    }
    
    // Dla modala edycji
    if (e.target.id === 'editSelectTowar') {
        const selectedTowar = window.editTowaryData?.find(t => t.id == e.target.value);
        if (selectedTowar) {
            document.getElementById('editTowarCena').value = parseFloat(selectedTowar.cena).toFixed(2);
        }
    }
    
    if (e.target.id === 'editSelectUsluga') {
        const selectedUsluga = window.editUslugiData?.find(u => u.id == e.target.value);
        if (selectedUsluga) {
            document.getElementById('editUslugaCena').value = parseFloat(selectedUsluga.cena).toFixed(2);
        }
    }
});

// FUNKCJE POMOCNICZE
function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2) + ' zł';
}

function isValidNumber(value) {
    return value && !isNaN(parseFloat(value)) && parseFloat(value) > 0;
}

function showLoading(elementId, message = 'Ładowanie...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<p>🔄 ${message}</p>`;
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<p style="color: #dc3545;">❌ ${message}</p>`;
    }
}

// ZAMYKANIE MODALI PRZY KLIKNIĘCIU W TŁO
window.addEventListener('click', function(e) {
    const noteModal = document.getElementById('noteModal');
    const editModal = document.getElementById('editModal');
    
    if (e.target === noteModal) {
        closeModal();
    }
    
    if (e.target === editModal) {
        closeEditModal();
    }
});

// SKRÓTY KLAWISZOWE
document.addEventListener('keydown', function(e) {
    // ESC - zamknij modiale
    if (e.key === 'Escape') {
        const noteModal = document.getElementById('noteModal');
        const editModal = document.getElementById('editModal');
        
        if (noteModal && noteModal.style.display === 'block') {
            closeModal();
        }
        
        if (editModal && editModal.style.display === 'block') {
            closeEditModal();
        }
    }
    
    // Ctrl+N - nowa notatka
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});

// OBSŁUGA STATUSÓW
function showStatusMenu(noteId, badgeElement) {
    // Ukryj wszystkie inne menu
    document.querySelectorAll('.status-menu').forEach(menu => {
        if (menu.id !== `statusMenu${noteId}`) {
            menu.style.display = 'none';
            menu.classList.remove('show', 'menu-up');
        }
    });
    
    const menu = document.getElementById(`statusMenu${noteId}`);
    if (menu.style.display === 'none') {
        // Reset klasy pozycjonowania
        menu.classList.remove('menu-up');
        
        // Pokaż menu
        menu.style.display = 'block';
        
        // Sprawdź czy menu wychodzi poza dolną krawędź ekranu
        const rect = menu.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        if (rect.bottom > viewportHeight - 10) {
            menu.classList.add('menu-up');
        }
        
        // Animacja pojawiania
        setTimeout(() => menu.classList.add('show'), 10);
    } else {
        menu.classList.remove('show');
        setTimeout(() => {
            menu.style.display = 'none';
            menu.classList.remove('menu-up');
        }, 200);
    }
}

// Nowa funkcja używająca data-atrybutów
function selectStatusFromMenu(noteId, optionElement) {
    const status = optionElement.dataset.status;
    const statusText = optionElement.dataset.text;
    
    // Mapa emoji dla statusów
    const statusEmojis = {
        'nowa': '🔵',
        'w_trakcie': '🟡',
        'zakonczona': '🟢',
        'anulowana': '🔴',
        'oczekuje': '🟠'
    };
    
    const fullStatusText = `${statusEmojis[status]} ${statusText}`;
    selectStatus(noteId, status, fullStatusText);
}

async function selectStatus(noteId, status, statusText) {
    // Znajdź badge i menu - poprawiony selektor
    const badge = document.querySelector(`[onclick*="showStatusMenu(${noteId}"]`);
    const menu = document.getElementById(`statusMenu${noteId}`);
    
    // Sprawdź czy elementy zostały znalezione
    if (!badge) {
        console.error(`❌ Nie znaleziono badge dla notatki ${noteId}`);
        return;
    }
    
    if (!menu) {
        console.error(`❌ Nie znaleziono menu dla notatki ${noteId}`);
        return;
    }
    
    try {
        // Wyślij request do API
        const response = await fetch(`/api/notatka/${noteId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: status })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Błąd aktualizacji statusu');
        }

        // Aktualizuj badge
        badge.textContent = statusText;
        badge.className = `status-badge status-${status}`;
        
        // Aktualizuj menu - zaznacz aktualny status
        menu.querySelectorAll('.status-option').forEach(option => {
            option.classList.remove('current');
        });
        const currentOption = menu.querySelector(`[data-status="${status}"]`);
        if (currentOption) {
            currentOption.classList.add('current');
        }
        
        // Ukryj menu z animacją
        menu.classList.remove('show');
        setTimeout(() => {
            menu.style.display = 'none';
            menu.classList.remove('menu-up');
        }, 200);
        
        // Pokaż toast notification
        showToast(`Status zmieniony na: ${statusText}`, 'success');
        
        console.log(`✅ Status notatki ${noteId} zmieniony na: ${status}`);
        
    } catch (error) {
        console.error('❌ Błąd aktualizacji statusu:', error);
        showToast(`Błąd: ${error.message}`, 'error');
    }
}

// SYSTEM POWIADOMIEŃ (TOAST)
function showToast(message, type = 'info') {
    // Utwórz toast container jeśli nie istnieje
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Utwórz toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transform: translateX(100%);
        transition: all 0.3s ease-out;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Animacja pojawiania
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Automatyczne usunięcie po 3 sekundach
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Ukryj menu statusów po kliknięciu poza nim
document.addEventListener('click', function(event) {
    if (!event.target.closest('.status-container')) {
        document.querySelectorAll('.status-menu').forEach(menu => {
            menu.classList.remove('show');
            setTimeout(() => {
                menu.style.display = 'none';
                menu.classList.remove('menu-up');
            }, 200);
        });
    }
});

console.log('✅ note-core.js załadowany');