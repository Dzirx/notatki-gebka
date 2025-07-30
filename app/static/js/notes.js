// NOTES.JS - Główna logika aplikacji + kosztorysy
let currentEditId = null;

// INICJALIZACJA
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Reset kosztorysu
    const kosztorysCheckbox = document.getElementById('dodaj_kosztorys');
    const kosztorysSection = document.getElementById('kosztorys_section');
    if (kosztorysCheckbox) {
        kosztorysCheckbox.checked = false;
        kosztorysSection.classList.add('hidden');
    }
}

// TYP NOTATKI
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

// ========================================
// FUNKCJE KOSZTORYSU
// ========================================

function toggleKosztorys() {
    const checkbox = document.getElementById('dodaj_kosztorys');
    const section = document.getElementById('kosztorys_section');
    
    if (checkbox.checked) {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
}

function loadTowary() {
    fetch('/api/towary')
        .then(response => response.json())
        .then(towary => {
            const container = document.getElementById('towary_list');
            container.innerHTML = towary.map(towar => createItemRow(towar, 'towar')).join('');
            updateKosztorys();
        })
        .catch(error => {
            console.error('Błąd ładowania towarów:', error);
            document.getElementById('towary_list').innerHTML = 
                '<div class="empty-state" style="color: #dc3545;">Błąd ładowania towarów</div>';
        });
}

function loadUslugi() {
    fetch('/api/uslugi')
        .then(response => response.json())
        .then(uslugi => {
            const container = document.getElementById('uslugi_list');
            container.innerHTML = uslugi.map(usluga => createItemRow(usluga, 'usluga')).join('');
            updateKosztorys();
        })
        .catch(error => {
            console.error('Błąd ładowania usług:', error);
            document.getElementById('uslugi_list').innerHTML = 
                '<div class="empty-state" style="color: #dc3545;">Błąd ładowania usług</div>';
        });
}

function createItemRow(item, type) {
    return `
        <div class="item-row" data-type="${type}" data-id="${item.id}">
            <input type="checkbox" onchange="updateKosztorys()" class="item-checkbox">
            <div class="item-name">${item.nazwa}</div>
            <input type="number" class="quantity-input" placeholder="Ilość" min="1" value="1" onchange="updateKosztorys()">
            <div class="item-price">${item.cena} zł</div>
            <div class="item-total">0.00 zł</div>
            <input type="hidden" class="item-price-value" value="${item.cena}">
        </div>
    `;
}

function updateKosztorys() {
    let sumaCalkowita = 0;
    const wybranePozycje = [];
    
    // Sprawdź wszystkie pozycje
    document.querySelectorAll('.item-row').forEach(row => {
        const checkbox = row.querySelector('.item-checkbox');
        const quantityInput = row.querySelector('.quantity-input');
        const priceValue = row.querySelector('.item-price-value');
        const totalElement = row.querySelector('.item-total');
        const itemName = row.querySelector('.item-name').textContent;
        
        const ilosc = parseFloat(quantityInput.value) || 0;
        const cena = parseFloat(priceValue.value) || 0;
        const wartosc = ilosc * cena;
        
        // Aktualizuj wyświetlaną wartość
        totalElement.textContent = wartosc.toFixed(2) + ' zł';
        
        // Zmień styl i dodaj do sumy jeśli zaznaczone
        if (checkbox.checked) {
            row.classList.add('selected');
            sumaCalkowita += wartosc;
            wybranePozycje.push({
                nazwa: itemName,
                ilosc: ilosc,
                cena: cena,
                wartosc: wartosc
            });
        } else {
            row.classList.remove('selected');
        }
    });
    
    // Aktualizuj sumę i podsumowanie
    document.getElementById('kosztorys_suma').textContent = sumaCalkowita.toFixed(2);
    updateSummary(wybranePozycje);
    prepareFormData();
}

function updateSummary(pozycje) {
    const summaryContainer = document.getElementById('summary_list');
    
    if (pozycje.length === 0) {
        summaryContainer.innerHTML = '<div style="color: #6c757d; font-style: italic;">Brak wybranych pozycji</div>';
        return;
    }
    
    const summaryHTML = pozycje.map(p => `
        <div class="summary-item">
            <span>${p.nazwa} (${p.ilosc}x)</span>
            <span>${p.wartosc.toFixed(2)} zł</span>
        </div>
    `).join('') + `
        <div class="summary-item">
            <span><strong>RAZEM:</strong></span>
            <span><strong>${pozycje.reduce((sum, p) => sum + p.wartosc, 0).toFixed(2)} zł</strong></span>
        </div>
    `;
    
    summaryContainer.innerHTML = summaryHTML;
}

function prepareFormData() {
    const form = document.querySelector('#noteModal form');
    if (!form) return; // Modal może być jeszcze nie załadowany
    
    // Usuń stare hidden fields
    form.querySelectorAll('input[name="towary_json"], input[name="uslugi_json"]')
        .forEach(field => field.remove());
    
    // Zbierz dane wybranych pozycji
    const wybraneTowary = collectSelectedItems('#towary_list');
    const wybraneUslugi = collectSelectedItems('#uslugi_list');
    
    // Dodaj hidden fields
    if (wybraneTowary.length > 0) {
        addHiddenField(form, 'towary_json', JSON.stringify(wybraneTowary));
    }
    
    if (wybraneUslugi.length > 0) {
        addHiddenField(form, 'uslugi_json', JSON.stringify(wybraneUslugi));
    }
}

function collectSelectedItems(containerSelector) {
    const items = [];
    document.querySelectorAll(`${containerSelector} .item-row`).forEach(row => {
        const checkbox = row.querySelector('.item-checkbox');
        if (checkbox.checked) {
            items.push({
                id: row.getAttribute('data-id'),
                nazwa: row.querySelector('.item-name').textContent,
                ilosc: row.querySelector('.quantity-input').value,
                cena: row.querySelector('.item-price-value').value
            });
        }
    });
    return items;
}

function addHiddenField(form, name, value) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
}

// EVENT LISTENERS
function setupEventListeners() {
    // Edycja notatki
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
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
    }

    // Zamykanie modali kliknięciem tła
    window.addEventListener('click', function(event) {
        const modals = ['noteModal', 'editModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}