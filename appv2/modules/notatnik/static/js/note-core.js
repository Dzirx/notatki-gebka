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

console.log('✅ note-core.js załadowany');