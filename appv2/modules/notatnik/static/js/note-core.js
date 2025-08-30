// === MODULES/NOTATNIK/STATIC/JS/NOTE-CORE.JS ===
// Podstawowe funkcje notatnika

console.log('📝 Moduł note-core załadowany');
window.showingCompleted = false;

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
    
    // RESET BEZPIECZEŃSTWA - usuń wszystkie style display z wierszy
    rows.forEach(row => {
        row.style.display = '';
        row.removeAttribute('style');
    });
    
    let visibleCount = 0;
    
    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status') || 'nowa';
        
        // Sprawdź czy wiersz pasuje do wyszukiwania
        let matchesSearch = true;
        
        if (filter.length > 0) {
            const nrRej = (row.getAttribute('data-nr-rej') || '').toUpperCase();
            const trescCell = row.querySelector('.note-content');
            const tresc = trescCell ? trescCell.textContent.toUpperCase() : '';
            const searchContent = (row.getAttribute('data-search-content') || '').toUpperCase();
            
            matchesSearch = nrRej.includes(filter) || 
                           tresc.includes(filter) || 
                           searchContent.includes(filter);
        }
        
        // Sprawdź czy wiersz pasuje do filtru statusu
        let matchesStatusFilter = true;
        
        if (window.showingCompleted) {
            // Pokazuj TYLKO zakończone
            matchesStatusFilter = (rowStatus === 'zakonczona');
        } else {
            // Pokazuj wszystkie OPRÓCZ zakończonych
            matchesStatusFilter = (rowStatus !== 'zakonczona');
        }
        
        // Ostateczna decyzja - wiersz jest widoczny tylko gdy pasuje do OBU filtrów
        const shouldShow = matchesSearch && matchesStatusFilter;
        
        if (shouldShow) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Aktualizuj licznik
    updateSearchInfo(filter, visibleCount, rows.length);
}

function updateSearchInfo(filter, visibleCount, totalCount) {
    let searchInfo = document.getElementById('search-info');
    if (!searchInfo) {
        searchInfo = document.createElement('div');
        searchInfo.id = 'search-info';
        searchInfo.style.cssText = 'margin-top: 10px; color: #6c757d; font-size: 14px;';
        const searchContainer = document.querySelector('.search-rej');
        if (searchContainer) {
            searchContainer.appendChild(searchInfo);
        }
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
    // selectTowar i selectUsluga zastąpione wyszukiwarkami - auto-wypełnianie w towar-search.js i usluga-search.js
    // editSelectTowar i editSelectUsluga zastąpione wyszukiwarkami - auto-wypełnianie w towar-search.js i usluga-search.js
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

// SKRÓTY KLAWISZOWE - ESC WYŁĄCZONY
// Modale zamykają się tylko przez przyciski ❌ i "Anuluj"
document.addEventListener('keydown', function(e) {
    // ESC - zamknij modiale - WYŁĄCZONE
    // if (e.key === 'Escape') {
    //     const noteModal = document.getElementById('noteModal');
    //     const editModal = document.getElementById('editModal');
    //     
    //     if (noteModal && noteModal.style.display === 'block') {
    //         closeModal();
    //     }
    //     
    //     if (editModal && editModal.style.display === 'block') {
    //         closeEditModal();
    //     }
    // }
    
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
        'dostarczony': '🟠',
        'klient_poinformowany': '🔴',
        'niekompletne': '🟨',
        'wprowadzona_do_programu': '✅'
    };
    
    const emoji = statusEmojis[status] || '❓'; // Fallback emoji jeśli status nie istnieje
    const fullStatusText = `${emoji} ${statusText}`;
    selectStatus(noteId, status, fullStatusText);
}

async function selectStatus(noteId, status, statusText) {
    // Znajdź wiersz notatki - bardziej precyzyjny sposób
    const noteRow = document.querySelector(`tr[data-note-id="${noteId}"]`);
    if (!noteRow) {
        console.error(`❌ Nie znaleziono wiersza dla notatki ${noteId}`);
        return;
    }
    
    // Znajdź badge w tym konkretnym wierszu
    const badge = noteRow.querySelector('.status-badge');
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
        
        // KLUCZOWA POPRAWKA: Aktualizuj data-status wiersza
        noteRow.setAttribute('data-status', status);
        
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

function toggleCompletedNotes() {
    const btn = document.getElementById('toggleCompletedBtn');
    
    window.showingCompleted = !window.showingCompleted;
    
    if (window.showingCompleted) {
        // Tryb: Pokazuj TYLKO zakończone
        btn.textContent = '📋 Wszystkie notatki';
        btn.classList.add('active');
    } else {
        // Tryb: Pokazuj wszystkie OPRÓCZ zakończonych
        btn.textContent = '✅ Tylko zakończone';
        btn.classList.remove('active');
    }
    
    // KLUCZOWA POPRAWKA: Uruchom filtrowanie po zmianie stanu
    filterNotatkiByRej();
    
    console.log(`🔄 Przełączono na: ${window.showingCompleted ? 'tylko zakończone' : 'wszystkie oprócz zakończonych'}`);
}

function updateNotesCounter() {
    const totalNotes = document.querySelectorAll('tbody tr').length;
    const visibleNotes = document.querySelectorAll('tbody tr:not([style*="display: none"])').length;
    
    // Znajdź lub utwórz licznik
    let counter = document.getElementById('notes-counter');
    if (!counter) {
        counter = document.createElement('span');
        counter.id = 'notes-counter';
        counter.style.cssText = 'margin-left: 15px; color: #28a745; font-weight: bold;';
        document.querySelector('.actions-bar').appendChild(counter);
    }
    
    if (window.showingCompleted) {
        counter.textContent = `📊 Widoczne: ${visibleNotes}/${totalNotes} notatek`;
    } else {
        const completedCount = totalNotes - visibleNotes;
        counter.textContent = `📊 Widoczne: ${visibleNotes}/${totalNotes} (ukryte: ${completedCount} zakończone)`;
    }
}

// Ukryj menu statusów po kliknięciu poza nim
document.addEventListener('DOMContentLoaded', function() {
    // Dodaj atrybut data-status do wierszy na podstawie klasy
    document.querySelectorAll('tbody tr').forEach(row => {
        const statusBadge = row.querySelector('.status-badge');
        if (statusBadge) {
            // Sprawdź klasę CSS badge'a
            if (statusBadge.classList.contains('status-zakonczona')) {
                row.setAttribute('data-status', 'zakonczona');
            }
        }
    });
    
    // Uruchom filtrowanie na starcie (ukryje zakończone notatki)
    filterNotatkiByRej();
    
    // Załaduj dzisiejsze przypomnienia przy starcie strony
    loadTodayReminders();
});

// === FUNKCJE PRZYPOMNIEŃ ===

async function loadTodayReminders() {
    try {
        const response = await fetch('/api/przypomnienia/dzisiaj');
        const data = await response.json();
        
        const reminderSection = document.getElementById('todayReminders');
        const remindersList = document.getElementById('todayRemindersList');
        
        if (data.notatki && data.notatki.length > 0) {
            // Pokaż sekcję
            reminderSection.style.display = 'block';
            
            // Stwórz karty przypomnień
            remindersList.innerHTML = data.notatki.map(notatka => {
                const date = new Date(notatka.data_przypomnienia);
                const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                
                const pojazd = notatka.samochod ? 
                    `<strong>${notatka.samochod.nr_rejestracyjny}</strong> ${notatka.samochod.marka} ${notatka.samochod.model}` : 
                    'Szybka notatka';
                
                const klient = notatka.samochod && notatka.samochod.klient ? 
                    `👤 ${notatka.samochod.klient.nazwapelna}` : '';
                
                return `
                    <div class="reminder-card" onclick="highlightNote(${notatka.id})">
                        <div class="reminder-time">⏰ ${timeStr}</div>
                        <div class="reminder-vehicle">${pojazd}</div>
                        <div class="reminder-client">${klient}</div>
                        <div class="reminder-content">${notatka.tresc}</div>
                        <div class="reminder-actions">
                            <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); markReminderDone(${notatka.przypomnienie_id})">✅ Wykonane</button>
                            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openEditModal(${notatka.id})">✏️ Edytuj</button>
                        </div>
                    </div>
                `;
            }).join('');
            
        } else {
            // Ukryj sekcję jeśli brak przypomnień
            reminderSection.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Błąd ładowania dzisiejszych przypomnień:', error);
    }
}

function highlightNote(noteId) {
    // Znajdź wiersz notatki i podświetl go
    const row = document.querySelector(`tr[data-note-id="${noteId}"]`);
    if (row) {
        // Usuń poprzednie podświetlenia
        document.querySelectorAll('.highlighted-note').forEach(el => {
            el.classList.remove('highlighted-note');
        });
        
        // Dodaj podświetlenie
        row.classList.add('highlighted-note');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Usuń podświetlenie po 3 sekundach
        setTimeout(() => {
            row.classList.remove('highlighted-note');
        }, 3000);
    }
}

async function markReminderDone(reminderId) {
    if (!confirm('Czy chcesz oznaczyć to przypomnienie jako wykonane?')) return;
    
    try {
        const response = await fetch(`/api/przypomnienie/${reminderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Przypomnienie zostało oznaczone jako wykonane', 'success');
            await loadTodayReminders(); // Odśwież listę przypomnień
        } else {
            const result = await response.json();
            showToast(result.detail || 'Błąd oznaczania przypomnienia', 'error');
        }
        
    } catch (error) {
        console.error('Błąd oznaczania przypomnienia:', error);
        showToast('Błąd oznaczania przypomnienia', 'error');
    }
}

console.log('✅ Filtr zakończonych notatek załadowany');