// === MODULES/NOTATNIK/STATIC/JS/PAGINATION.JS ===
// System paginacji dla notatek

console.log('📄 Moduł paginacji załadowany');

// ZMIENNE PAGINACJI
let currentPage = 1;
let itemsPerPage = 20;
let totalNotes = 0;
let totalPages = 1;
let allNotes = []; // Przechowuje wszystkie notatki do paginacji
let originalFilterFunction = null; // Przechowuje oryginalną funkcję wyszukiwania

// INICJALIZACJA PAGINACJI
document.addEventListener('DOMContentLoaded', function() {
    // Poczekaj chwilę, żeby inne skrypty się załadowały
    setTimeout(() => {
        // Zbierz wszystkie notatki z tabeli
        collectAllNotes();
        // Inicjalizuj paginację
        initializePagination();
        // Zintegruj z wyszukiwaniem
        integratePaginationWithSearch();
    }, 100);
});

// ZBIERANIE DANYCH NOTATEK
function collectAllNotes() {
    const rows = document.querySelectorAll('#notesTable tbody tr');
    allNotes = Array.from(rows).map(row => ({
        element: row.cloneNode(true),
        searchText: getRowSearchText(row),
        status: row.getAttribute('data-status') || 'nowa'
    }));
    totalNotes = allNotes.length;
    console.log(`📊 Zebrano ${totalNotes} notatek do paginacji`);
}

// POMOCNA FUNKCJA DO WYSZUKIWANIA
function getRowSearchText(row) {
    const nrRej = row.getAttribute('data-nr-rej') || '';
    const trescCell = row.querySelector('.note-content');
    const tresc = trescCell ? trescCell.textContent : '';
    return (nrRej + ' ' + tresc).toUpperCase();
}

// INICJALIZACJA
function initializePagination() {
    calculateTotalPages();
    updatePagination();
    showPage(1);
    console.log('✅ Paginacja zainicjalizowana');
}

// INTEGRACJA Z WYSZUKIWANIEM
function integratePaginationWithSearch() {
    // Zapisz oryginalną funkcję wyszukiwania
    if (typeof window.filterNotatkiByRej === 'function') {
        originalFilterFunction = window.filterNotatkiByRej;
        
        // Podmień funkcję wyszukiwania na wersję z paginacją
        window.filterNotatkiByRej = function() {
            console.log('🔍 Wyszukiwanie z paginacją...');
            
            // Wykonaj oryginalne wyszukiwanie
            originalFilterFunction();
            
            // Nie aktualizuj paginacji przy filtrach statusu - pozwól oryginalnej funkcji działać
        };
        
        console.log('🔗 Paginacja zintegrowana z wyszukiwaniem');
    } else {
        console.warn('⚠️ Nie znaleziono funkcji filterNotatkiByRej - paginacja będzie działać bez wyszukiwania');
    }
}

// Funkcja updatePaginationAfterSearch() usunięta - powodowała konflikt z filtrami statusu

// OBLICZANIE LICZBY STRON
function calculateTotalPages() {
    totalPages = Math.ceil(totalNotes / itemsPerPage);
    if (totalPages < 1) totalPages = 1;
}

// ZMIANA LICZBY ELEMENTÓW NA STRONIE
function changeItemsPerPage() {
    const select = document.getElementById('itemsPerPage');
    if (!select) return;
    
    itemsPerPage = parseInt(select.value);
    currentPage = 1; // Reset do pierwszej strony
    calculateTotalPages();
    updatePagination();
    showPage(1);
    
    console.log(`📄 Zmieniono na ${itemsPerPage} elementów na stronę`);
}

// PRZEJŚCIE DO STRONY
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    showPage(page);
    updatePagination();
    
    console.log(`📄 Przeszło do strony ${page}`);
}

// FUNKCJE NAWIGACJI
function goToPreviousPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// WYŚWIETLANIE STRONY
function showPage(page) {
    const tbody = document.querySelector('#notesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allNotes.length);

    // Dodaj notatki dla bieżącej strony
    for (let i = startIndex; i < endIndex; i++) {
        if (allNotes[i]) {
            const noteClone = allNotes[i].element.cloneNode(true);
            tbody.appendChild(noteClone);
        }
    }

    // Aktualizuj informacje
    updateTableInfo(startIndex + 1, endIndex, totalNotes);
}

// AKTUALIZACJA INFORMACJI O TABELI
function updateTableInfo(start, end, total) {
    const tableInfo = document.getElementById('tableInfo');
    
    if (tableInfo) {
        if (total === 0) {
            tableInfo.textContent = 'Brak notatek do wyświetlenia';
        } else {
            tableInfo.textContent = `Wyświetlane: ${start}-${end} z ${total} notatek`;
        }
    }
}

// AKTUALIZACJA KONTROLEK PAGINACJI
function updatePagination() {
    // Przyciski nawigacji
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages;

    // Numery stron
    updatePageNumbers();
}

// GENEROWANIE NUMERÓW STRON
function updatePageNumbers() {
    const container = document.getElementById('pageNumbers');
    if (!container) return;
    
    container.innerHTML = '';

    const maxVisible = 5; // Maksymalnie 5 numerów stron
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Korekta jeśli jesteśmy blisko końca
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'page-btn active' : 'page-btn';
        pageBtn.onclick = () => goToPage(i);
        container.appendChild(pageBtn);
    }
}

// FUNKCJE POMOCNICZE DLA INNYCH MODUŁÓW
window.paginationReload = function() {
    console.log('🔄 Przeładowanie paginacji...');
    collectAllNotes();
    currentPage = 1;
    calculateTotalPages();
    updatePagination();
    showPage(1);
};

window.paginationGoToPage = function(page) {
    goToPage(page);
};

window.paginationGetCurrentPage = function() {
    return {
        currentPage: currentPage,
        totalPages: totalPages,
        itemsPerPage: itemsPerPage,
        totalNotes: totalNotes
    };
};

// EKSPOZYCJA FUNKCJI DLA GLOBALNEGO DOSTĘPU
window.changeItemsPerPage = changeItemsPerPage;
window.goToPage = goToPage;
window.goToPreviousPage = goToPreviousPage;
window.goToNextPage = goToNextPage;

console.log('✅ pagination.js załadowany - paginacja gotowa!');