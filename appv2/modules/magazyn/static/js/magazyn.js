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
});

// FUNKCJA ROZWIJANIA POJAZDÓW
function togglePojazd(rej) {
    const detailsRow = document.querySelector(`.pojazd-details[data-rej="${rej}"]`);
    
    if (detailsRow.style.display === 'none' || !detailsRow.style.display) {
        detailsRow.style.display = 'table-row';
    } else {
        detailsRow.style.display = 'none';
    }
}

// FUNKCJA ZAKŁADEK
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Funkcja do generowania klasy bieżnika
function getBieznikClass(bieznik) {
    const val = parseFloat(bieznik);
    if (val >= 6) return 'bieznik-good';
    if (val >= 3) return 'bieznik-medium';
    return 'bieznik-poor';
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

// EXPORT FUNKCJI
window.MagazynUtils = {
    formatPolishDate,
    switchTab,
    togglePojazd,
    getBieznikClass
};