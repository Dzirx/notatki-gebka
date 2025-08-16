// === MAGAZYN.JS - LOGIKA MODUŁU MAGAZYN ===

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
    // Ustaw dzisiejszą datę jako domyślną (dla terminarza)
    const dateInput = document.getElementById('selected_date');
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Obsługa przycisku "🔄 Odśwież"
    const refreshZleceniaBtn = document.getElementById('refresh-zlecenia-btn');
    if (refreshZleceniaBtn) {
        refreshZleceniaBtn.addEventListener('click', odswiez);
    }

    // Obsługa checkboxa "Tylko towar" w terminarzu
    initTowarFilter();
});

// Inicjalizacja filtra towarów
function initTowarFilter() {
    const towarCheckbox = document.getElementById('tylko_towar');
    if (!towarCheckbox) return;

    // USUŃ automatyczną zmianę widoku przy zmianie checkboxa
    // Widok zmieni się dopiero po submit formularza
    
    // Opcjonalnie: zastosuj widok towarów tylko jeśli checkbox jest zaznaczony 
    // I są już wyświetlone wyniki (po submit)
    const hasResults = document.querySelector('#terminarz .results-container .table-responsive');
    if (towarCheckbox.checked && hasResults) {
        toggleTowarView(true);
    }
}

// Przełącza widok towarów (ukrywa/pokazuje elementy)
function toggleTowarView(isTowarMode) {
    if (isTowarMode) {
        // Tryb towarów - pokazuj tylko zawartość towarów w szczegółach
        const vehicleDetails = document.querySelectorAll('.pojazd-details-content');
        vehicleDetails.forEach(content => {
            // Ukryj sekcje opon
            const oponyElements = content.querySelectorAll('.depozyt-section, .opony-table-details, .depozyt-opony-section, h4:not(:has(+ .depozyt-info))');
            oponyElements.forEach(el => {
                if (!el.textContent.includes('Towary') && !el.textContent.includes('Usługi')) {
                    el.style.display = 'none';
                }
            });
            
            // Pokaż tylko sekcje z towarami/usługami
            const towarElements = content.querySelectorAll('.depozyt-info');
            towarElements.forEach(el => el.style.display = 'block');
        });
        
        // Ukryj kolumny z oponami w tabeli głównej
        hideOponyColumns(true);
    } else {
        // Tryb normalny - pokaż wszystko
        const vehicleDetails = document.querySelectorAll('.pojazd-details-content');
        vehicleDetails.forEach(content => {
            const allElements = content.querySelectorAll('*');
            allElements.forEach(el => el.style.display = '');
        });
        
        // Pokaż kolumny z oponami w tabeli głównej
        hideOponyColumns(false);
    }
}

// Ukryj/pokaż kolumny z informacjami o oponach w głównej tabeli
function hideOponyColumns(hide) {
    const terminarzeTable = document.querySelector('#terminarz .opony-table');
    if (!terminarzeTable) return;
    
    // Znajdź wiersze pojazdów (nie szczegóły)
    const vehicleRows = terminarzeTable.querySelectorAll('tr.vehicle-header');
    
    vehicleRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            // Kolumna "Felgi/Opony" (index 1)
            const oponyCell = cells[1];
            // Kolumna "Lokalizacja" (index 2)  
            const lokalizacjaCell = cells[2];
            
            if (hide) {
                // Zachowaj oryginalne wartości w data-atrybutach
                if (!oponyCell.hasAttribute('data-original')) {
                    oponyCell.setAttribute('data-original', oponyCell.innerHTML);
                    lokalizacjaCell.setAttribute('data-original', lokalizacjaCell.innerHTML);
                }
                
                oponyCell.innerHTML = '<div style="font-size: 0.9em; color: #6c757d;">📦 Towar</div>';
                lokalizacjaCell.innerHTML = '<span style="color: #6c757d;">-</span>';
            } else {
                // Przywróć oryginalne wartości
                if (oponyCell.hasAttribute('data-original')) {
                    oponyCell.innerHTML = oponyCell.getAttribute('data-original');
                    lokalizacjaCell.innerHTML = lokalizacjaCell.getAttribute('data-original');
                    // Usuń atrybuty po przywróceniu
                    oponyCell.removeAttribute('data-original');
                    lokalizacjaCell.removeAttribute('data-original');
                }
            }
        }
    });
}

// Proste odświeżenie widoku (backend zwróci aktualne dane "na dziś")
function odswiez() {
    window.location.replace(window.location.pathname);
}

// FUNKCJA ROZWIJANIA POJAZDÓW
function togglePojazd(rej) {
    const detailsRow = document.querySelector(`.pojazd-details[data-rej="${rej}"]`);
    if (!detailsRow) return;
    
    const isVisible = detailsRow.style.display === 'table-row';
    detailsRow.style.display = isVisible ? 'none' : 'table-row';
    
    // Sprawdź czy tryb towar jest aktywny i zastosuj filtrowanie
    const towarCheckbox = document.getElementById('tylko_towar');
    if (towarCheckbox && towarCheckbox.checked && !isVisible) {
        setTimeout(() => {
            applyTowarFilterToRow(detailsRow);
        }, 0);
    }
}

// Funkcja pomocnicza do filtrowania pojedynczego wiersza szczegółów
function applyTowarFilterToRow(detailsRow) {
    const content = detailsRow.querySelector('.pojazd-details-content');
    if (!content) return;
    
    // Ukryj wszystkie sekcje depozytów/opon
    const oponyElements = content.querySelectorAll('.depozyt-section, .opony-table-details, .depozyt-opony-section, h4, h5, table');
    oponyElements.forEach(el => {
        // Sprawdź czy element zawiera informacje o towarach/usługach
        const text = el.textContent;
        if (text.includes('Towary') || text.includes('Usługi') || el.classList.contains('depozyt-info')) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });
    
    // Pokaż tylko sekcje z towarami/usługami
    const towarElements = content.querySelectorAll('.depozyt-info');
    towarElements.forEach(el => el.style.display = 'block');
}

// FUNKCJA ZAKŁADEK
function switchTab(btnEl, tabName) {
    // przełącz treść
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.classList.add('active');

    // przełącz wygląd przycisków
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    if (btnEl && btnEl.classList) btnEl.classList.add('active');
}

// Funkcja do generowania klasy bieżnika (helper CSS)
function getBieznikClass(bieznik) {
    const val = parseFloat(bieznik);
    if (isNaN(val)) return '';
    if (val >= 6) return 'bieznik-good';
    if (val >= 3) return 'bieznik-medium';
    return 'bieznik-poor';
}

// Funkcja do formatowania dat (helper)
function formatPolishDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// EXPORT FUNKCJI - dodaj togglePojazd do globalnego scope
window.togglePojazd = togglePojazd;
window.switchTab = switchTab;

window.MagazynUtils = {
    formatPolishDate,
    switchTab,
    togglePojazd,
    getBieznikClass,
    initTowarFilter,
    toggleTowarView
};

// Akcje (np. do wywołania z konsoli/devtools)
window.MagazynActions = {
    odswiez
};