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
    
    // Reset ukrytego pola kosztorysów ← DODAJ TO
    document.getElementById('importowane_kosztorysy').value = '';
    
    // Reset zmiennych globalnych ← DODAJ TO  
    window.dostepneKosztorysy = [];
    window.wybraneKosztorysy = [];
    
    // Reset przycisków typu
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('btn-primary');     // ← DODAJ TO
        btn.classList.add('btn-secondary');      // ← DODAJ TO
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

async function pobierzInformacje() {
    const nrRej = document.getElementById('nr_rejestracyjny').value;
    if (!nrRej) {
        alert('Wprowadź numer rejestracyjny');
        return;
    }
    
    const infoDiv = document.getElementById('pojazd_info');
    infoDiv.innerHTML = '<p>🔄 Pobieranie danych z systemu integra...</p>';
    infoDiv.classList.remove('hidden');
    
    try {
        // Pobierz kosztorysy z SQL Server
        const response = await fetch(`/api/kosztorysy-zewnetrzne/${nrRej}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Błąd pobierania danych');
        }
        
        if (data.kosztorysy.length === 0) {
            infoDiv.innerHTML = `
                <h4>❌ Brak danych dla pojazdu ${nrRej}</h4>
                <p>Nie znaleziono kosztorysów w systemie integra.</p>
            `;
            return;
        }
        
        // Wyświetl informacje o pojeździe i kosztorysy
        let html = `
            <h4>🚗 ${data.pojazd_info.marka} ${data.pojazd_info.model} (${data.pojazd_info.rok_produkcji})</h4>
            <p><strong>Numer rejestracyjny:</strong> ${data.pojazd_info.numer_rejestracyjny}</p>
            <h5>💰 Dostępne kosztorysy (${data.kosztorysy.length}):</h5>
            <div style="max-height: 300px; overflow-y: auto;">
        `;
        
        data.kosztorysy.forEach((kosztorys, index) => {
            html += `
                <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 6px; background: #f9f9f9;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="kosztorys_${index}" value="${index}" onchange="toggleKosztorys(${index})">
                        <label for="kosztorys_${index}" style="cursor: pointer; flex: 1;">
                            <strong>${kosztorys.numer_kosztorysu}</strong> - ${kosztorys.kwota_kosztorysu.toFixed(2)} zł
                        </label>
                    </div>
                    <p><strong>Klient:</strong> ${kosztorys.nazwa_klienta} (${kosztorys.telefon || 'brak tel.'})</p>
                    ${kosztorys.towary_szczegoly ? `<p><strong>Towary:</strong> ${kosztorys.towary_szczegoly}</p>` : ''}
                    ${kosztorys.uslugi_szczegoly ? `<p><strong>Usługi:</strong> ${kosztorys.uslugi_szczegoly}</p>` : ''}
                </div>
            `;
        });
        
        html += `
            </div>
            <button type="button" class="btn btn-success" onclick="importujWybraneKosztorysy()" style="margin-top: 15px;">
                📥 Importuj wybrane kosztorysy
            </button>
        `;
        
        infoDiv.innerHTML = html;
        
        // Zapisz dane kosztorysów w zmiennej globalnej
        window.dostepneKosztorysy = data.kosztorysy;
        window.wybraneKosztorysy = [];
        
    } catch (error) {
        console.error('Błąd:', error);
        infoDiv.innerHTML = `
            <h4>❌ Błąd pobierania danych</h4>
            <p>${error.message}</p>
        `;
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

function toggleKosztorys(index) {
    const checkbox = document.getElementById(`kosztorys_${index}`);
    if (checkbox.checked) {
        if (!window.wybraneKosztorysy.includes(index)) {
            window.wybraneKosztorysy.push(index);
        }
    } else {
        window.wybraneKosztorysy = window.wybraneKosztorysy.filter(i => i !== index);
    }
    console.log('Wybrane kosztorysy:', window.wybraneKosztorysy);
}

async function importujWybraneKosztorysy() {
    if (!window.wybraneKosztorysy || window.wybraneKosztorysy.length === 0) {
        alert('Wybierz przynajmniej jeden kosztorys do importu');
        return;
    }
    
    // Przygotuj dane kosztorysów do importu
    const wybraneKosztorysyData = window.wybraneKosztorysy.map(index => window.dostepneKosztorysy[index]);
    
    // Zapisz wybrane kosztorysy w ukrytym polu formularza
    document.getElementById('importowane_kosztorysy').value = JSON.stringify(wybraneKosztorysyData);
    
    // Pokaż podsumowanie
    const podsumowanie = wybraneKosztorysyData.map(k => 
        `• ${k.numer_kosztorysu} - ${k.kwota_kosztorysu.toFixed(2)} zł`
    ).join('\n');
    
    const potwierdz = confirm(`Zostaną zaimportowane kosztorysy:\n\n${podsumowanie}\n\nKontynuować?`);
    
    if (potwierdz) {
        // Oznacz że kosztorysy są gotowe do importu
        const infoDiv = document.getElementById('pojazd_info');
        infoDiv.innerHTML += `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin-top: 15px; border-radius: 6px;">
                ✅ <strong>Gotowe do importu:</strong> ${window.wybraneKosztorysy.length} kosztorysów
                <br><small>Kosztorysy zostaną zaimportowane po zapisaniu notatki.</small>
            </div>
        `;
        
        alert('Kosztorysy przygotowane do importu!\nTeraz wypełnij treść notatki i kliknij "Zapisz notatkę".');
    }
}

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