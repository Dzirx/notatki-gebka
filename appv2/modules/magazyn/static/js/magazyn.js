// === MAGAZYN.JS - LOGIKA MODUŁU MAGAZYN ===

console.log('📦 Moduł magazyn załadowany');

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Magazyn gotowy');
    
    // Ustaw dzisiejszą datę jako domyślną (dla terminarza)
    const dateInput = document.getElementById('selected_date');
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Obsługa przycisku "🔄 Odśwież"
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', odswiez);
    }
});

// Proste odświeżenie widoku (backend zwróci aktualne dane "na dziś")
function odswiez() {
    console.log('🔄 Odświeżanie widoku (reload)');
    location.reload();
}

// FUNKCJA ROZWIJANIA POJAZDÓW (w terminarzu)
function togglePojazd(rej) {
    const detailsRow = document.querySelector(`.pojazd-details[data-rej="${rej}"]`);
    if (!detailsRow) return;
    detailsRow.style.display = (detailsRow.style.display === 'none' || !detailsRow.style.display)
        ? 'table-row'
        : 'none';
}

// FUNKCJA ZAKŁADEK (bez użycia event.target)
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

// EXPORT FUNKCJI
window.MagazynUtils = {
    formatPolishDate,
    switchTab,
    togglePojazd,
    getBieznikClass
};

// Akcje (np. do wywołania z konsoli/devtools)
window.MagazynActions = {
    odswiez
};
