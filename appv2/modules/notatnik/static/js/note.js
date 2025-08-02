// === NOTES.JS - LOGIKA NOTATEK ===

console.log('📝 Moduł notatek załadowany');

// MODALE
function openModal() {
    document.getElementById('noteModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('noteModal').style.display = 'none';
    resetModalForm();
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function resetModalForm() {
    // Reset formularza dodawania notatki
    document.getElementById('typ_notatki').value = '';
    document.getElementById('nr_rej_group').classList.add('hidden');
    document.getElementById('pojazd_info').classList.add('hidden');
    document.querySelector('textarea[name="tresc"]').value = '';
    
    // Reset przycisków typu
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.classList.remove('active');
    });
}

function selectNoteType(type) {
    // Reset wszystkich przycisków
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    
    // Aktywuj wybrany przycisk
    document.querySelector(`[data-type="${type}"]`).classList.remove('btn-secondary');
    document.querySelector(`[data-type="${type}"]`).classList.add('btn-primary');
    
    // Ustaw wartość
    document.getElementById('typ_notatki').value = type;
    
    // Pokaż/ukryj pole numeru rejestracyjnego
    const nrRejGroup = document.getElementById('nr_rej_group');
    if (type === 'pojazd') {
        nrRejGroup.classList.remove('hidden');
    } else {
        nrRejGroup.classList.add('hidden');
        document.getElementById('pojazd_info').classList.add('hidden');
    }
}

function pobierzInformacje() {
    const nrRej = document.getElementById('nr_rejestracyjny').value;
    if (!nrRej) {
        alert('Wprowadź numer rejestracyjny');
        return;
    }
    
    // TODO: Implementacja pobierania danych pojazdu
    const infoDiv = document.getElementById('pojazd_info');
    infoDiv.innerHTML = `
        <h4>🚗 Przykładowy pojazd ${nrRej}</h4>
        <p><strong>Właściciel:</strong> Jan Kowalski</p>
        <p><em>TODO: Połączenie z bazą danych</em></p>
    `;
    infoDiv.classList.remove('hidden');
}

// WYSZUKIWANIE
function filterNotatkiByRej() {
    const filter = document.getElementById('searchRejInput').value.toUpperCase();
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const nrRej = (row.getAttribute('data-nr-rej') || '').toUpperCase();
        row.style.display = nrRej.includes(filter) ? '' : 'none';
    });
}

function clearRejSearch() {
    document.getElementById('searchRejInput').value = '';
    filterNotatkiByRej();
}

// CHECKBOXY
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
function editSelected() {
    const selected = getSelectedNotes();
    if (selected.length === 0) {
        alert('Zaznacz przynajmniej jedną notatkę');
        return;
    }
    if (selected.length > 1) {
        alert('Wybierz tylko jedną notatkę do edycji');
        return;
    }
    
    alert(`Edycja notatki ID: ${selected[0]} - TODO: implementacja`);
}

function deleteSelected() {
    const selected = getSelectedNotes();
    if (selected.length === 0) {
        alert('Zaznacz przynajmniej jedną notatkę');
        return;
    }
    
    if (confirm(`Czy na pewno chcesz usunąć ${selected.length} notatek?`)) {
        alert(`Usuwanie notatek: ${selected.join(', ')} - TODO: implementacja`);
    }
}

// INICJALIZACJA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 System notatek gotowy');
    
    // Dodaj obsługę kliknięć w wiersze tabeli
    document.querySelectorAll('.notatka-pojazd').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox') return;
            console.log('Kliknięto w notatkę pojazdu');
        });
    });
});