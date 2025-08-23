// === MODULES/NOTATNIK/STATIC/JS/NOTE.JS ===
// Główny plik modułu notatnik - koordynuje wszystkie pozostałe

console.log('📝 Główny moduł notatek załadowany');

// INICJALIZACJA MODUŁU
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicjalizacja modułu notatnik...');
    
    // Sprawdź czy wszystkie moduły zostały załadowane
    const requiredModules = ['note-core', 'note-add', 'note-edit'];
    const loadedModules = [];
    
    // Sprawdź które moduły są dostępne (na podstawie funkcji globalnych)
    if (typeof openModal === 'function') loadedModules.push('note-core');
    if (typeof selectNoteType === 'function') loadedModules.push('note-add');
    if (typeof openEditModal === 'function') loadedModules.push('note-edit');
    
    console.log('✅ Załadowane moduły:', loadedModules);
    
    if (loadedModules.length !== requiredModules.length) {
        console.warn('⚠️ Nie wszystkie moduły zostały załadowane:', {
            required: requiredModules,
            loaded: loadedModules
        });
    }
    
    // Inicjalizuj interfejs
    initializeInterface();
    
    console.log('🎉 Moduł notatnik gotowy do użycia');
});

// INICJALIZACJA INTERFEJSU
function initializeInterface() {
    // Sprawdź obecność kluczowych elementów
    const noteModal = document.getElementById('noteModal');
    const editModal = document.getElementById('editModal');
    const searchInput = document.getElementById('searchRejInput');
    
    if (noteModal) {
        console.log('✅ Modal dodawania notatek znaleziony');
    } else {
        console.warn('⚠️ Modal dodawania notatek nie znaleziony');
    }
    
    if (editModal) {
        console.log('✅ Modal edycji notatek znaleziony');
    } else {
        console.warn('⚠️ Modal edycji notatek nie znaleziony');
    }
    
    if (searchInput) {
        console.log('✅ Pole wyszukiwania znalezione');
        // Dodaj debouncing do wyszukiwania
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(filterNotatkiByRej, 300);
        });
    }
    
    // Dodaj obsługę dla przycisków akcji grupowych
    const editButton = document.querySelector('button[onclick="editSelected()"]');
    const deleteButton = document.querySelector('button[onclick="deleteSelected()"]');
    
    if (editButton && deleteButton) {
        console.log('✅ Przyciski akcji grupowych znalezione');
    }
    
    // Sprawdź obecność tabel z notatkami
    const notesTable = document.querySelector('tbody');
    if (notesTable) {
        const noteCount = notesTable.querySelectorAll('tr').length;
        console.log(`✅ Tabela notatek znaleziona (${noteCount} notatek)`);
    }
}

// FUNKCJE POMOCNICZE DOSTĘPNE GLOBALNIE
window.NotatkiModule = {
    // Moduł core
    openModal: () => typeof openModal === 'function' ? openModal() : console.error('openModal nie jest dostępna'),
    closeModal: () => typeof closeModal === 'function' ? closeModal() : console.error('closeModal nie jest dostępna'),
    closeEditModal: () => typeof closeEditModal === 'function' ? closeEditModal() : console.error('closeEditModal nie jest dostępna'),
    
    // Moduł add
    selectNoteType: (type) => typeof selectNoteType === 'function' ? selectNoteType(type) : console.error('selectNoteType nie jest dostępna'),
    
    // Moduł edit
    openEditModal: (id) => typeof openEditModal === 'function' ? openEditModal(id) : console.error('openEditModal nie jest dostępna'),
    
    // Wyszukiwanie
    search: () => typeof filterNotatkiByRej === 'function' ? filterNotatkiByRej() : console.error('filterNotatkiByRej nie jest dostępna'),
    
    // Akcje grupowe
    editSelected: () => typeof editSelected === 'function' ? editSelected() : console.error('editSelected nie jest dostępna'),
    deleteSelected: () => typeof deleteSelected === 'function' ? deleteSelected() : console.error('deleteSelected nie jest dostępna'),
    
    // Synchronizacja
    syncTowary: () => typeof syncTowary === 'function' ? syncTowary() : console.error('syncTowary nie jest dostępna'),
    
    // Informacje o module
    getStatus: () => {
        return {
            coreLoaded: typeof openModal === 'function',
            addLoaded: typeof selectNoteType === 'function',
            editLoaded: typeof openEditModal === 'function',
            version: '1.0.0',
            lastInit: new Date().toISOString()
        };
    }
};

// OBSŁUGA BŁĘDÓW
window.addEventListener('error', function(e) {
    if (e.filename && e.filename.includes('note')) {
        console.error('❌ Błąd w module notatek:', {
            message: e.message,
            file: e.filename,
            line: e.lineno,
            column: e.colno
        });
    }
});

// EKSPORT DLA KONSOLI DEWELOPERSKIEJ
if (typeof window !== 'undefined') {
    window.debug_notatki = function() {
        console.log('=== DEBUG MODUŁU NOTATEK ===');
        console.log('Status modułów:', window.NotatkiModule.getStatus());
        console.log('Zmienne globalne dodawania:', {
            selectedTowary: window.selectedTowary?.length || 0,
            selectedUslugi: window.selectedUslugi?.length || 0,
            towaryData: window.towaryData?.length || 0,
            uslugiData: window.uslugiData?.length || 0
        });
        console.log('Zmienne globalne edycji:', {
            currentEditNoteId: window.currentEditNoteId,
            editSelectedTowary: window.editSelectedTowary?.length || 0,
            editSelectedUslugi: window.editSelectedUslugi?.length || 0,
            editExistingCosts: window.editExistingCosts?.length || 0
        });
    };
}

console.log('✅ note.js załadowany - moduł gotowy!');