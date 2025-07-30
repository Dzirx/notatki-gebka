// NOTES.JS - Główna logika aplikacji
let currentEditId = null;

// INICJALIZACJA
document.addEventListener('DOMContentLoaded', function() {
    makeNotatkiClickable();
    setupEventListeners();
});

// MODALE
function openModal() {
    document.getElementById('noteModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('noteModal').style.display = 'none';
    resetModalForm();
}

function openEditModal(notatkaId) {
    currentEditId = notatkaId;
    fetch(`/api/notatka/${notatkaId}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('edit_tresc').value = data.tresc;
            document.getElementById('editModal').style.display = 'block';
        })
        .catch(() => alert('Błąd pobierania notatki'));
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditId = null;
}

function resetModalForm() {
    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('typ_notatki').value = '';
    document.getElementById('nr_rej_group').classList.add('hidden');
    document.getElementById('pojazd_info').classList.add('hidden');
    document.querySelector('textarea[name="tresc"]').value = '';
}

// TYP NOTATKI
function toggleNotatkType() {
    const typ = document.getElementById('typ_notatki').value;
    const nrRejGroup = document.getElementById('nr_rej_group');
    const pojazdInfo = document.getElementById('pojazd_info');
    
    if (typ === 'pojazd') {
        nrRejGroup.classList.remove('hidden');
    } else {
        nrRejGroup.classList.add('hidden');
        pojazdInfo.classList.add('hidden');
    }
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

// KLIKNIĘCIE W NOTATKĘ
function makeNotatkiClickable() {
    document.querySelectorAll('.notatka-pojazd').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox') return;
            const nrRej = this.dataset.nrRej;
            if (nrRej) window.location.href = `/samochod/${nrRej}`;
        });
    });
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
    
    openEditModal(selected[0]);
}

function deleteSelected() {
    const selected = getSelectedNotes();
    if (selected.length === 0) {
        alert('Zaznacz przynajmniej jedną notatkę');
        return;
    }
    
    if (confirm(`Czy na pewno chcesz usunąć ${selected.length} notatek?`)) {
        Promise.all(selected.map(id => 
            fetch(`/api/notatka/${id}`, { method: 'DELETE' })
        )).then(() => {
            location.reload();
        }).catch(() => {
            alert('Błąd usuwania notatek');
        });
    }
}

// POBIERZ INFORMACJE O POJEŹDZIE
function pobierzInformacje() {
    const nrRej = document.getElementById('nr_rejestracyjny').value;
    if (!nrRej) {
        alert('Wprowadź numer rejestracyjny');
        return;
    }

    fetch(`/api/pojazd/${nrRej}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }

            const infoDiv = document.getElementById('pojazd_info');
            infoDiv.innerHTML = `
            <h4>🚗 ${data.marka} ${data.model} (${data.rok_produkcji})</h4>
            <p><strong>Właściciel:</strong> ${data.wlasciciel}</p>
            <div style="margin: 15px 0;">
                <strong>📝 Historia notatek:</strong>
                ${data.notatki && data.notatki.length ? 
                    data.notatki.map(n => `
                        <div style="background: white; padding: 8px; margin: 3px 0; border-radius: 4px; font-size: 12px;">
                            <strong>${n.data}:</strong> ${n.tresc}
                            ${n.kosztorysy && n.kosztorysy.length ? 
                                '<br><small>💰 ' + n.kosztorysy.length + ' kosztorys(ów)</small>' : ''
                            }
                        </div>
                    `).join('') : 
                    '<p>Brak notatek</p>'
                }
            </div>
            <button class="btn-primary" onclick="window.location.href='/samochod/${nrRej}'">
                📋 Pokaż szczegóły pojazdu
            </button>
            `;
            infoDiv.classList.remove('hidden');
        })
        .catch(() => alert('Błąd pobierania danych'));
}

// EVENT LISTENERS
function setupEventListeners() {
    // Edycja notatki
    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (!currentEditId) return;

        const tresc = document.getElementById('edit_tresc').value;
        
        fetch(`/api/notatka/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tresc: tresc })
        })
        .then(response => {
            if (response.ok) {
                closeEditModal();
                location.reload();
            } else {
                alert('Błąd zapisywania zmian');
            }
        })
        .catch(() => alert('Błąd połączenia'));
    });

    // Zamykanie modali kliknięciem tła
    window.addEventListener('click', function(event) {
        const modals = ['noteModal', 'editModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function selectNoteType(type) {
    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    document.getElementById('typ_notatki').value = type;
    
    const nrRejGroup = document.getElementById('nr_rej_group');
    const pojazdInfo = document.getElementById('pojazd_info');
    
    if (type === 'pojazd') {
        nrRejGroup.classList.remove('hidden');
    } else {
        nrRejGroup.classList.add('hidden');
        pojazdInfo.classList.add('hidden');
    }
}