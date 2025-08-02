// === MAGAZYN.JS - LOGIKA MODUŁU MAGAZYN ===

console.log('📦 Moduł magazyn załadowany');

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Magazyn gotowy');
    
    // Ustaw dzisiejszą datę jako domyślną
    const dateInput = document.getElementById('selected_date');
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    
    // Obsługa quick date buttons
    setupQuickDateButtons();
    
    // Obsługa details/summary
    setupDetailsToggle();
    
    // Auto-submit po zmianie daty
    setupAutoSubmit();
});

// Obsługa szybkich przycisków dat
function setupQuickDateButtons() {
    const dateButtons = document.querySelectorAll('.date-btn');
    dateButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const form = this.closest('form');
            const selectedDate = form.querySelector('input[name="selected_date"]').value;
            
            // Ustaw datę w głównym formularzu
            const mainDateInput = document.getElementById('selected_date');
            if (mainDateInput) {
                mainDateInput.value = selectedDate;
            }
            
            // Wyślij główny formularz
            const mainForm = document.querySelector('.date-search-form');
            if (mainForm) {
                mainForm.submit();
            }
        });
    });
}

// Obsługa rozwijania szczegółów
function setupDetailsToggle() {
    const detailsElements = document.querySelectorAll('details');
    detailsElements.forEach(details => {
        details.addEventListener('toggle', function() {
            if (this.open) {
                console.log('Rozwinięto szczegóły');
            }
        });
    });
}

// Auto-submit formularza po zmianie daty
function setupAutoSubmit() {
    const dateInput = document.getElementById('selected_date');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            // Opcjonalne: automatyczne wysłanie formularza
            // this.closest('form').submit();
        });
    }
}

// Funkcja do formatowania dat
function formatPolishDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Funkcja do eksportu danych (opcjonalna)
function exportToCSV() {
    const table = document.querySelector('.opony-table');
    if (!table) {
        alert('Brak danych do eksportu');
        return;
    }
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(col => {
            // Wyczyść tekst z tagów HTML
            let text = col.textContent.trim();
            // Usuń zbędne białe znaki
            text = text.replace(/\s+/g, ' ');
            rowData.push(`"${text}"`);
        });
        csv.push(rowData.join(','));
    });
    
    // Pobierz plik
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const selectedDate = document.getElementById('selected_date').value;
    
    link.href = URL.createObjectURL(blob);
    link.download = `opony_${selectedDate}.csv`;
    link.click();
}

// Funkcja do filtrowania wyników w czasie rzeczywistym
function setupTableFilter() {
    const filterInput = document.getElementById('table-filter');
    const table = document.querySelector('.opony-table tbody');
    
    if (!filterInput || !table) return;
    
    filterInput.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        });
    });
}

// Utility - powiadomienia
function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    // TODO: Dodać prawdziwy system powiadomień
}

// Export funkcji dla innych skryptów
window.MagazynUtils = {
    formatPolishDate,
    exportToCSV,
    showNotification
};