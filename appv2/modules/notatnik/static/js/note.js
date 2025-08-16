// // === NOTES.JS - LOGIKA NOTATEK ===

// console.log('📝 Moduł notatek załadowany');

// // Zmienne globalne dla edycji
// window.currentEditNoteId = null;
// window.editSelectedTowary = [];
// window.editSelectedUslugi = [];
// window.editTowaryData = [];
// window.editUslugiData = [];
// window.editExistingCosts = [];
// window.editNoteData = null;

// // MODALE
// function openModal() {
//     document.getElementById('noteModal').style.display = 'block';
// }

// function closeModal() {
//     document.getElementById('noteModal').style.display = 'none';
//     resetModalForm();
// }

// function closeEditModal() {
//     document.getElementById('editModal').style.display = 'none';
// }

// function resetModalForm() {
//     // Reset formularza dodawania notatki
//     document.getElementById('typ_notatki').value = '';
//     document.getElementById('nr_rej_group').classList.add('hidden');
//     document.getElementById('pojazd_info').classList.add('hidden');
//     document.querySelector('textarea[name="tresc"]').value = '';
    
//     // Reset ukrytego pola kosztorysów ← DODAJ TO
//     document.getElementById('importowane_kosztorysy').value = '';
    
//     // Reset zmiennych globalnych ← DODAJ TO  
//     window.dostepneKosztorysy = [];
//     window.wybraneKosztorysy = [];
    
//     // Reset przycisków typu
//     document.querySelectorAll('[data-type]').forEach(btn => {
//         btn.classList.remove('active');
//         btn.classList.remove('btn-primary');     // ← DODAJ TO
//         btn.classList.add('btn-secondary');      // ← DODAJ TO
//     });
// }

// function selectNoteType(type) {
//     // Reset wszystkich przycisków
//     document.querySelectorAll('[data-type]').forEach(btn => {
//         btn.classList.remove('btn-primary');
//         btn.classList.add('btn-secondary');
//     });
    
//     // Aktywuj wybrany przycisk
//     document.querySelector(`[data-type="${type}"]`).classList.remove('btn-secondary');
//     document.querySelector(`[data-type="${type}"]`).classList.add('btn-primary');
    
//     // Ustaw wartość
//     document.getElementById('typ_notatki').value = type;
    
//     // Pokaż/ukryj pole numeru rejestracyjnego
//     const nrRejGroup = document.getElementById('nr_rej_group');
//     if (type === 'pojazd') {
//         nrRejGroup.classList.remove('hidden');
//     } else {
//         nrRejGroup.classList.add('hidden');
//         document.getElementById('pojazd_info').classList.add('hidden');
//     }
// }

// async function pobierzInformacje() {
//     const nrRej = document.getElementById('nr_rejestracyjny').value;
//     if (!nrRej) {
//         alert('Wprowadź numer rejestracyjny');
//         return;
//     }
    
//     const infoDiv = document.getElementById('pojazd_info');
//     infoDiv.innerHTML = '<p>🔄 Pobieranie danych z systemu integra...</p>';
//     infoDiv.classList.remove('hidden');
    
//     try {
//         // Pobierz kosztorysy z SQL Server
//         const response = await fetch(`/api/kosztorysy-zewnetrzne/${nrRej}`);
//         const data = await response.json();
        
//         if (!response.ok) {
//             throw new Error(data.detail || 'Błąd pobierania danych');
//         }
        
//         if (data.kosztorysy.length === 0) {
//             infoDiv.innerHTML = `
//                 <h4>❌ Brak danych dla pojazdu ${nrRej}</h4>
//                 <p>Nie znaleziono kosztorysów w systemie integra.</p>
//             `;
//             return;
//         }
        
//         // Wyświetl informacje o pojeździe i kosztorysy
//         let html = `
//             <h4>🚗 ${data.pojazd_info.marka} ${data.pojazd_info.model} (${data.pojazd_info.rok_produkcji})</h4>
//             <p><strong>Numer rejestracyjny:</strong> ${data.pojazd_info.numer_rejestracyjny}</p>
//             <h5>💰 Dostępne kosztorysy (${data.kosztorysy.length}):</h5>
//             <div style="max-height: 300px; overflow-y: auto;">
//         `;
        
//         data.kosztorysy.forEach((kosztorys, index) => {
//             html += `
//                 <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 6px; background: #f9f9f9;">
//                     <div style="display: flex; align-items: center; gap: 10px;">
//                         <input type="checkbox" id="kosztorys_${index}" value="${index}" onchange="toggleKosztorys(${index})">
//                         <label for="kosztorys_${index}" style="cursor: pointer; flex: 1;">
//                             <strong>${kosztorys.numer_kosztorysu}</strong> - ${kosztorys.kwota_kosztorysu.toFixed(2)} zł
//                         </label>
//                     </div>
//                     <p><strong>Klient:</strong> ${kosztorys.nazwa_klienta} (${kosztorys.telefon || 'brak tel.'})</p>
//                     ${kosztorys.towary_szczegoly ? `<p><strong>Towary:</strong> ${kosztorys.towary_szczegoly}</p>` : ''}
//                     ${kosztorys.uslugi_szczegoly ? `<p><strong>Usługi:</strong> ${kosztorys.uslugi_szczegoly}</p>` : ''}
//                 </div>
//             `;
//         });
        
//         html += `
//             </div>
//             <button type="button" class="btn btn-success" onclick="importujWybraneKosztorysy()" style="margin-top: 15px;">
//                 📥 Importuj wybrane kosztorysy
//             </button>
//         `;
        
//         infoDiv.innerHTML = html;
        
//         // Zapisz dane kosztorysów w zmiennej globalnej
//         window.dostepneKosztorysy = data.kosztorysy;
//         window.wybraneKosztorysy = [];
        
//     } catch (error) {
//         console.error('Błąd:', error);
//         infoDiv.innerHTML = `
//             <h4>❌ Błąd pobierania danych</h4>
//             <p>${error.message}</p>
//         `;
//     }
// }

// // WYSZUKIWANIE
// function filterNotatkiByRej() {
//     const filter = document.getElementById('searchRejInput').value.toUpperCase();
//     const rows = document.querySelectorAll('tbody tr');
    
//     rows.forEach(row => {
//         // Pobierz numer rejestracyjny
//         const nrRej = (row.getAttribute('data-nr-rej') || '').toUpperCase();
        
//         // Pobierz treść notatki z komórki
//         const trescCell = row.querySelector('.note-content');
//         const tresc = trescCell ? trescCell.textContent.toUpperCase() : '';
        
//         // Pokaż wiersz jeśli filter pasuje do numeru rej. LUB treści
//         const pokazWiersz = nrRej.includes(filter) || tresc.includes(filter);
//         row.style.display = pokazWiersz ? '' : 'none';
//     });
    
//     // Pokaż ile znaleziono
//     const visibleRows = document.querySelectorAll('tbody tr[style=""], tbody tr:not([style])').length;
//     const totalRows = document.querySelectorAll('tbody tr').length;
    
//     // Dodaj/zaktualizuj info o wyszukiwaniu
//     let searchInfo = document.getElementById('search-info');
//     if (!searchInfo) {
//         searchInfo = document.createElement('div');
//         searchInfo.id = 'search-info';
//         searchInfo.style.cssText = 'margin-top: 10px; color: #6c757d; font-size: 14px;';
//         document.querySelector('.search-rej').appendChild(searchInfo);
//     }
    
//     if (filter) {
//         searchInfo.textContent = `Znaleziono: ${visibleRows} z ${totalRows} notatek`;
//     } else {
//         searchInfo.textContent = '';
//     }
// }
// // CHECKBOXY
// function toggleAllCheckboxes() {
//     const selectAll = document.getElementById('selectAll');
//     const checkboxes = document.querySelectorAll('.note-checkbox');
    
//     checkboxes.forEach(cb => {
//         cb.checked = selectAll.checked;
//     });
// }

// function getSelectedNotes() {
//     const checkboxes = document.querySelectorAll('.note-checkbox:checked');
//     return Array.from(checkboxes).map(cb => cb.value);
// }

// // AKCJE GRUPOWE
// async function editSelected() {
//     const selected = getSelectedNotes();
//     if (selected.length === 0) return alert('Zaznacz przynajmniej jedną notatkę');
//     if (selected.length > 1) return alert('Wybierz tylko jedną notatkę do edycji');
//     openEditModal(selected[0]);
//   }

// async function deleteSelected() {
//     const selected = getSelectedNotes();
//     if (selected.length === 0) return alert('Zaznacz przynajmniej jedną notatkę');
  
//     if (!confirm(`Czy na pewno chcesz usunąć ${selected.length} notatkę/notatki?`)) return;
  
//     try {
//       await Promise.all(selected.map(async (id) => {
//         const res = await fetch(`/api/notatka/${id}/`, { method: 'DELETE' });
//         if (!res.ok) {
//           const data = await res.json().catch(() => ({}));
//           throw new Error(data.detail || `Nie udało się usunąć ID ${id}`);
//         }
//         // Usuń wiersz z tabeli jeśli jest
//         const row = document.querySelector(`tr[data-note-id="${id}"]`);
//         if (row) row.remove();
//       }));
  
//       // Jeżeli nie ma wierszy w DOM (np. brak atrybutów), przeładuj
//       if (document.querySelectorAll('tbody tr').length === 0) location.reload();
//     } catch (e) {
//       alert(`Błąd usuwania: ${e.message}`);
//     }
//   }

// function toggleKosztorys(index) {
//     const checkbox = document.getElementById(`kosztorys_${index}`);
//     if (checkbox.checked) {
//         if (!window.wybraneKosztorysy.includes(index)) {
//             window.wybraneKosztorysy.push(index);
//         }
//     } else {
//         window.wybraneKosztorysy = window.wybraneKosztorysy.filter(i => i !== index);
//     }
//     console.log('Wybrane kosztorysy:', window.wybraneKosztorysy);
// }

// async function importujWybraneKosztorysy() {
//     if (!window.wybraneKosztorysy || window.wybraneKosztorysy.length === 0) {
//         alert('Wybierz przynajmniej jeden kosztorys do importu');
//         return;
//     }
    
//     // Przygotuj dane kosztorysów do importu
//     const wybraneKosztorysyData = window.wybraneKosztorysy.map(index => window.dostepneKosztorysy[index]);
    
//     // Zapisz wybrane kosztorysy w ukrytym polu formularza
//     document.getElementById('importowane_kosztorysy').value = JSON.stringify(wybraneKosztorysyData);
    
//     // Pokaż podsumowanie
//     const podsumowanie = wybraneKosztorysyData.map(k => 
//         `• ${k.numer_kosztorysu} - ${k.kwota_kosztorysu.toFixed(2)} zł`
//     ).join('\n');
    
//     const potwierdz = confirm(`Zostaną zaimportowane kosztorysy:\n\n${podsumowanie}\n\nKontynuować?`);
    
//     if (potwierdz) {
//         // Oznacz że kosztorysy są gotowe do importu
//         const infoDiv = document.getElementById('pojazd_info');
//         infoDiv.innerHTML += `
//             <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin-top: 15px; border-radius: 6px;">
//                 ✅ <strong>Gotowe do importu:</strong> ${window.wybraneKosztorysy.length} kosztorysów
//                 <br><small>Kosztorysy zostaną zaimportowane po zapisaniu notatki.</small>
//             </div>
//         `;
        
//         alert('Kosztorysy przygotowane do importu!\nTeraz wypełnij treść notatki i kliknij "Zapisz notatkę".');
//     }
// }

// async function syncTowary() {
//     const button = event.target;
//     const originalText = button.innerHTML;
    
//     try {
//         // Pokaż spinner
//         button.innerHTML = '⏳ Synchronizuję...';
//         button.disabled = true;
        
//         console.log('🔄 Rozpoczynam synchronizację towarów i usług...');
        
//         // Wywołaj API
//         const response = await fetch('/api/sync-towary', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = await response.json();
        
//         if (!response.ok) {
//             throw new Error(data.detail || 'Błąd synchronizacji');
//         }
        
//         // Pokaż wyniki
//         const stats = data.stats;
//         const message = `✅ Synchronizacja zakończona!\n\n` +
//                        `📦 Towary:\n` +
//                        `  • Dodane: ${stats.towary_dodane}\n` +
//                        `  • Zaktualizowane: ${stats.towary_zaktualizowane}\n\n` +
//                        `🔧 Usługi:\n` +
//                        `  • Dodane: ${stats.uslugi_dodane}\n` +
//                        `  • Zaktualizowane: ${stats.uslugi_zaktualizowane}\n\n` +
//                        `⏱️ Czas: ${data.czas_wykonania}s`;
        
//         alert(message);
//         console.log('✅ Synchronizacja zakończona:', data);
        
//     } catch (error) {
//         console.error('❌ Błąd synchronizacji:', error);
//         alert(`❌ Błąd synchronizacji:\n${error.message}`);
        
//     } finally {
//         // Przywróć przycisk
//         button.innerHTML = originalText;
//         button.disabled = false;
//     }
// }

// async function openEditModal(noteId) {
//     try {
//         // Reset zmiennych
//         window.currentEditNoteId = noteId;
//         window.editSelectedTowary = [];
//         window.editSelectedUslugi = [];
        
//         // Pokaż modal
//         document.getElementById('editModal').style.display = 'block';
//         document.getElementById('editNoteId').textContent = noteId;
        
//         // Pobierz szczegółowe dane notatki
//         const noteResponse = await fetch(`/api/notatka-szczegoly/${noteId}`);
//         const noteData = await noteResponse.json();
//         if (!noteResponse.ok) throw new Error(noteData.detail || 'Nie udało się pobrać notatki');
        
//         window.editNoteData = noteData;
        
//         // Wypełnij treść notatki
//         document.getElementById('edit_tresc').value = noteData.tresc || '';
        
//         // Pokaż przycisk importu z integra jeśli to pojazd
//         if (noteData.samochod) {
//             document.getElementById('editImportSection').style.display = 'block';
//         } else {
//             document.getElementById('editImportSection').style.display = 'none';
//         }
        
//         // Załaduj dane towarów i usług
//         await loadEditDropdownData();
        
//         // Załaduj istniejące kosztorysy
//         await loadExistingCosts();
        
//     } catch (error) {
//         console.error('Błąd otwierania modala:', error);
//         alert(`Błąd pobrania notatki: ${error.message}`);
//         closeEditModal();
//     }
// }

// // Ładowanie istniejących kosztorysów
// async function loadExistingCosts() {
//     try {
//         const response = await fetch(`/api/kosztorysy-notatki/${window.currentEditNoteId}`);
//         const data = await response.json();
        
//         if (!response.ok) {
//             throw new Error(data.detail || 'Błąd pobierania kosztorysów');
//         }
        
//         window.editExistingCosts = data.kosztorysy || [];
//         renderExistingCosts();
        
//     } catch (error) {
//         console.error('Błąd ładowania kosztorysów:', error);
//         document.getElementById('editExistingList').innerHTML = '<p style="color: #dc3545;">Błąd ładowania kosztorysów</p>';
//     }
// }

// function renderExistingCosts() {
//     const container = document.getElementById('editExistingList');
    
//     if (window.editExistingCosts.length === 0) {
//         container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak kosztorysów dla tej notatki</p>';
//         return;
//     }
    
//     container.innerHTML = window.editExistingCosts.map(cost => `
//         <div class="edit-existing-cost">
//             <h5>💰 ${cost.numer || 'Brak numeru'} - ${parseFloat(cost.kwota_calkowita).toFixed(2)} zł</h5>
//             <p><strong>Status:</strong> ${cost.status} | <strong>Data:</strong> ${new Date(cost.created_at).toLocaleDateString()}</p>
//             ${cost.opis ? `<p><strong>Opis:</strong> ${cost.opis}</p>` : ''}
            
//             ${cost.towary && cost.towary.length > 0 ? `
//                 <p><strong>Towary:</strong> ${cost.towary.map(t => `${t.nazwa} (${t.ilosc}x)`).join(', ')}</p>
//             ` : ''}
            
//             ${cost.uslugi && cost.uslugi.length > 0 ? `
//                 <p><strong>Usługi:</strong> ${cost.uslugi.map(u => `${u.nazwa} (${u.ilosc}x)`).join(', ')}</p>
//             ` : ''}
            
//             <div class="edit-existing-actions">
//                 <a href="/notatnik/kosztorys/${window.currentEditNoteId}" class="btn btn-sm btn-info" target="_blank">👁️ Zobacz szczegóły</a>
//                 <button type="button" class="btn btn-sm btn-danger" onclick="deleteExistingCost(${cost.id})">🗑️ Usuń</button>
//             </div>
//         </div>
//     `).join('');
// }

// // Auto-wypełnianie ceny przy wyborze towaru/usługi
// document.addEventListener('change', function(e) {
//     if (e.target.id === 'editSelectTowar') {
//         const selectedTowar = window.editTowaryData.find(t => t.id == e.target.value);
//         if (selectedTowar) {
//             document.getElementById('editTowarCena').value = parseFloat(selectedTowar.cena).toFixed(2);
//         }
//     }
    
//     if (e.target.id === 'editSelectUsluga') {
//         const selectedUsluga = window.editUslugiData.find(u => u.id == e.target.value);
//         if (selectedUsluga) {
//             document.getElementById('editUslugaCena').value = parseFloat(selectedUsluga.cena).toFixed(2);
//         }
//     }
// });

// // Ładowanie danych do dropdownów
// async function loadEditDropdownData() {
//     try {
//         const [towaryResponse, uslugiResponse] = await Promise.all([
//             fetch('/api/towary'),
//             fetch('/api/uslugi')
//         ]);
        
//         window.editTowaryData = await towaryResponse.json();
//         window.editUslugiData = await uslugiResponse.json();
        
//         populateEditSelects();
        
//     } catch (error) {
//         console.error('Błąd ładowania danych:', error);
//     }
// }

// // Wypełnianie selectów
// function populateEditSelects() {
//     const towarSelect = document.getElementById('editSelectTowar');
//     const uslugaSelect = document.getElementById('editSelectUsluga');
    
//     // Wypełnij towary
//     towarSelect.innerHTML = '<option value="">-- Wybierz towar --</option>';
//     window.editTowaryData.forEach(towar => {
//         towarSelect.innerHTML += `<option value="${towar.id}">${towar.nazwa} - ${parseFloat(towar.cena).toFixed(2)}zł</option>`;
//     });
    
//     // Wypełnij usługi
//     uslugaSelect.innerHTML = '<option value="">-- Wybierz usługę --</option>';
//     window.editUslugiData.forEach(usluga => {
//         uslugaSelect.innerHTML += `<option value="${usluga.id}">${usluga.nazwa} - ${parseFloat(usluga.cena).toFixed(2)}zł</option>`;
//     });
// }

// // INICJALIZACJA
// document.addEventListener('DOMContentLoaded', () => {
//     const form = document.getElementById('editForm');
//     if (form) {
//       form.addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const id = window.currentEditNoteId;
//         if (!id) return alert('Brak ID notatki');
  
//         const tresc = document.getElementById('edit_tresc').value.trim();
//         try {
//           const res = await fetch(`/api/notatka/${id}/`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ tresc }),
//           });
//           const data = await res.json();
//           if (!res.ok) throw new Error(data.detail || 'Nie udało się zapisać');
  
//           // Zamknij modal, odśwież/odmaluj wiersz
//           closeEditModal();
//           // Jeśli wiersz ma element z treścią, zaktualizuj go bez przeładowania:
//           const row = document.querySelector(`tr[data-note-id="${id}"]`);
//           if (row) {
//             const cell = row.querySelector('.note-content');
//             if (cell) cell.textContent = tresc;
//           } else {
//             // fallback: przeładuj stronę
//             location.reload();
//           }
//         } catch (e) {
//           alert(`Błąd zapisu: ${e.message}`);
//         }
//       });
//     }
//   });

// // FUNKCJE DODAWANIA TOWARÓW
// function addTowarToEditCost() {
//     const selectTowar = document.getElementById('editSelectTowar');
//     const iloscInput = document.getElementById('editTowarIlosc');
//     const cenaInput = document.getElementById('editTowarCena');
    
//     if (!selectTowar.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const selectedTowar = window.editTowaryData.find(t => t.id == selectTowar.value);
//     if (!selectedTowar) return;
    
//     const newItem = {
//         id: selectedTowar.id,
//         nazwa: selectedTowar.nazwa,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: false
//     };
    
//     window.editSelectedTowary.push(newItem);
    
//     // Reset pól
//     selectTowar.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderEditSelectedTowary();
// }

// function addCustomTowarToEditCost() {
//     const nazwaInput = document.getElementById('editCustomTowarNazwa');
//     const iloscInput = document.getElementById('editCustomTowarIlosc');
//     const cenaInput = document.getElementById('editCustomTowarCena');
    
//     if (!nazwaInput.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const newItem = {
//         id: null,
//         nazwa: nazwaInput.value,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: true
//     };
    
//     window.editSelectedTowary.push(newItem);
    
//     // Reset pól
//     nazwaInput.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderEditSelectedTowary();
// }

// // FUNKCJE DODAWANIA USŁUG
// function addUslugaToEditCost() {
//     const selectUsluga = document.getElementById('editSelectUsluga');
//     const iloscInput = document.getElementById('editUslugaIlosc');
//     const cenaInput = document.getElementById('editUslugaCena');
    
//     if (!selectUsluga.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const selectedUsluga = window.editUslugiData.find(u => u.id == selectUsluga.value);
//     if (!selectedUsluga) return;
    
//     const newItem = {
//         id: selectedUsluga.id,
//         nazwa: selectedUsluga.nazwa,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: false
//     };
    
//     window.editSelectedUslugi.push(newItem);
    
//     // Reset pól
//     selectUsluga.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderEditSelectedUslugi();
// }

// function addCustomUslugaToEditCost() {
//     const nazwaInput = document.getElementById('editCustomUslugaNazwa');
//     const iloscInput = document.getElementById('editCustomUslugaIlosc');
//     const cenaInput = document.getElementById('editCustomUslugaCena');
    
//     if (!nazwaInput.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const newItem = {
//         id: null,
//         nazwa: nazwaInput.value,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: true
//     };
    
//     window.editSelectedUslugi.push(newItem);
    
//     // Reset pól
//     nazwaInput.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderEditSelectedUslugi();
// }

// // RENDEROWANIE WYBRANYCH POZYCJI
// function renderEditSelectedTowary() {
//     const container = document.getElementById('editSelectedTowary');
    
//     if (window.editSelectedTowary.length === 0) {
//         container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych towarów</p>';
//         updateEditCostSummary();
//         return;
//     }
    
//     container.innerHTML = window.editSelectedTowary.map((item, index) => `
//         <div class="edit-cost-item">
//             <div class="item-info">
//                 <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własny)</span>' : ''}<br>
//                 <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
//             </div>
//             <div class="item-actions">
//                 <button type="button" class="btn btn-sm btn-warning" onclick="editTowarItem(${index})">✏️</button>
//                 <button type="button" class="btn btn-sm btn-danger" onclick="removeEditTowar(${index})">🗑️</button>
//             </div>
//         </div>
//     `).join('');
    
//     updateEditCostSummary();
// }

// function renderEditSelectedUslugi() {
//     const container = document.getElementById('editSelectedUslugi');
    
//     if (window.editSelectedUslugi.length === 0) {
//         container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych usług</p>';
//         updateEditCostSummary();
//         return;
//     }
    
//     container.innerHTML = window.editSelectedUslugi.map((item, index) => `
//         <div class="edit-cost-item">
//             <div class="item-info">
//                 <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własna)</span>' : ''}<br>
//                 <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
//             </div>
//             <div class="item-actions">
//                 <button type="button" class="btn btn-sm btn-warning" onclick="editUslugaItem(${index})">✏️</button>
//                 <button type="button" class="btn btn-sm btn-danger" onclick="removeEditUsluga(${index})">🗑️</button>
//             </div>
//         </div>
//     `).join('');
    
//     updateEditCostSummary();
// }

// // OBLICZANIE I WYŚWIETLANIE SUMY
// function calculateEditCostTotal() {
//     let total = 0;
    
//     window.editSelectedTowary.forEach(item => {
//         total += item.ilosc * item.cena;
//     });
    
//     window.editSelectedUslugi.forEach(item => {
//         total += item.ilosc * item.cena;
//     });
    
//     return total;
// }

// function updateEditCostSummary() {
//     const total = calculateEditCostTotal();
//     const hasItems = window.editSelectedTowary.length > 0 || window.editSelectedUslugi.length > 0;
    
//     const summaryDiv = document.getElementById('editNewCostSummary');
//     const totalDiv = document.getElementById('editCostTotal');
    
//     if (hasItems) {
//         summaryDiv.style.display = 'block';
//         totalDiv.innerHTML = `Łączna kwota: <span style="color: #28a745;">${total.toFixed(2)} zł</span>`;
//     } else {
//         summaryDiv.style.display = 'none';
//     }
// }

// // USUWANIE/EDYCJA POZYCJI
// function removeEditTowar(index) {
//     window.editSelectedTowary.splice(index, 1);
//     renderEditSelectedTowary();
// }

// function removeEditUsluga(index) {
//     window.editSelectedUslugi.splice(index, 1);
//     renderEditSelectedUslugi();
// }

// function editTowarItem(index) {
//     const item = window.editSelectedTowary[index];
//     const newIlosc = prompt('Nowa ilość:', item.ilosc);
//     const newCena = prompt('Nowa cena:', item.cena);
    
//     if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
//         window.editSelectedTowary[index].ilosc = parseFloat(newIlosc);
//         window.editSelectedTowary[index].cena = parseFloat(newCena);
//         renderEditSelectedTowary();
//     }
// }

// function editUslugaItem(index) {
//     const item = window.editSelectedUslugi[index];
//     const newIlosc = prompt('Nowa ilość:', item.ilosc);
//     const newCena = prompt('Nowa cena:', item.cena);
    
//     if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
//         window.editSelectedUslugi[index].ilosc = parseFloat(newIlosc);
//         window.editSelectedUslugi[index].cena = parseFloat(newCena);
//         renderEditSelectedUslugi();
//     }
// }

// // ZAPISYWANIE KOSZTORYSU
// async function saveNewCostEstimate() {
//     const numer = document.getElementById('editNewCostNumber').value.trim();
//     const opis = document.getElementById('editNewCostDescription').value.trim();
    
//     if (!numer) {
//         alert('Podaj numer kosztorysu');
//         return;
//     }
    
//     if (window.editSelectedTowary.length === 0 && window.editSelectedUslugi.length === 0) {
//         alert('Dodaj przynajmniej jeden towar lub usługę');
//         return;
//     }
    
//     try {
//         const costData = {
//             notatka_id: window.currentEditNoteId,
//             numer_kosztorysu: numer,
//             opis: opis,
//             towary: window.editSelectedTowary,
//             uslugi: window.editSelectedUslugi
//         };
        
//         const response = await fetch('/api/kosztorys', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(costData)
//         });
        
//         const result = await response.json();
        
//         if (!response.ok) {
//             throw new Error(result.detail || 'Błąd zapisywania kosztorysu');
//         }
        
//         alert('✅ Kosztorys został zapisany!');
        
//         // Reset formularza nowego kosztorysu
//         document.getElementById('editNewCostNumber').value = '';
//         document.getElementById('editNewCostDescription').value = '';
//         window.editSelectedTowary = [];
//         window.editSelectedUslugi = [];
//         renderEditSelectedTowary();
//         renderEditSelectedUslugi();
        
//         // Odśwież listę istniejących kosztorysów
//         await loadExistingCosts();
        
//     } catch (error) {
//         console.error('Błąd zapisywania kosztorysu:', error);
//         alert('❌ Błąd: ' + error.message);
//     }
// }

// // USUWANIE ISTNIEJĄCEGO KOSZTORYSU
// async function deleteExistingCost(costId) {
//     if (!confirm('Czy na pewno chcesz usunąć ten kosztorys?')) return;
    
//     try {
//         const response = await fetch(`/api/kosztorys/${costId}`, {
//             method: 'DELETE'
//         });
        
//         const result = await response.json();
        
//         if (!response.ok) {
//             throw new Error(result.detail || 'Błąd usuwania');
//         }
        
//         alert('✅ Kosztorys został usunięty!');
//         await loadExistingCosts();
        
//     } catch (error) {
//         console.error('Błąd usuwania kosztorysu:', error);
//         alert('❌ Błąd: ' + error.message);
//     }
// }

// // IMPORT Z INTEGRA DLA EDYCJI
// async function importFromIntegraEdit() {
//     const noteData = window.editNoteData;
//     if (!noteData || !noteData.samochod) {
//         alert('Ta notatka nie jest przypisana do pojazdu');
//         return;
//     }
    
//     const nrRej = noteData.samochod.nr_rejestracyjny;
//     const resultsDiv = document.getElementById('editIntegraResults');
    
//     resultsDiv.innerHTML = '<p>🔄 Pobieranie danych z systemu integra...</p>';
    
//     try {
//         const response = await fetch(`/api/kosztorysy-zewnetrzne/${nrRej}`);
//         const data = await response.json();
        
//         if (!response.ok) {
//             throw new Error(data.detail || 'Błąd pobierania danych');
//         }
        
//         if (data.kosztorysy.length === 0) {
//             resultsDiv.innerHTML = `<p>❌ Brak kosztorysów w systemie integra dla pojazdu ${nrRej}</p>`;
//             return;
//         }
        
//         let html = `
//             <h5>💰 Dostępne kosztorysy z integra (${data.kosztorysy.length}):</h5>
//             <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #f8f9fa;">
//         `;
        
//         data.kosztorysy.forEach((kosztorys, index) => {
//             html += `
//                 <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 6px; background: white;">
//                     <div style="display: flex; align-items: center; gap: 10px;">
//                         <input type="checkbox" id="edit_integra_${index}" value="${index}">
//                         <label for="edit_integra_${index}" style="cursor: pointer; flex: 1;">
//                             <strong>${kosztorys.numer_kosztorysu}</strong> - ${kosztorys.kwota_kosztorysu.toFixed(2)} zł
//                         </label>
//                     </div>
//                     <p><strong>Klient:</strong> ${kosztorys.nazwa_klienta}</p>
//                     <p><strong>Towary:</strong> ${kosztorys.towary.length} | <strong>Usługi:</strong> ${kosztorys.uslugi.length}</p>
//                 </div>
//             `;
//         });
        
//         html += `
//             </div>
//             <button type="button" class="btn btn-success" onclick="importSelectedFromIntegraEdit()" style="margin-top: 10px;">
//                 📥 Importuj wybrane kosztorysy
//             </button>
//         `;
        
//         resultsDiv.innerHTML = html;
//         window.editIntegraKosztorysy = data.kosztorysy;
        
//     } catch (error) {
//         console.error('Błąd importu z integra:', error);
//         resultsDiv.innerHTML = `<p>❌ Błąd: ${error.message}</p>`;
//     }
// }

// // IMPORT WYBRANYCH KOSZTORYSÓW Z INTEGRA
// async function importSelectedFromIntegraEdit() {
//     const checkboxes = document.querySelectorAll('#editIntegraResults input[type="checkbox"]:checked');
    
//     if (checkboxes.length === 0) {
//         alert('Wybierz przynajmniej jeden kosztorys');
//         return;
//     }
    
//     try {
//         for (const checkbox of checkboxes) {
//             const index = parseInt(checkbox.value);
//             const kosztorys = window.editIntegraKosztorysy[index];
            
//             const importData = {
//                 notatka_id: window.currentEditNoteId,
//                 kosztorys_data: kosztorys
//             };
            
//             const response = await fetch('/api/importuj-kosztorys', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(importData)
//             });
            
//             const result = await response.json();
            
//             if (!response.ok) {
//                 throw new Error(result.detail || 'Błąd importu');
//             }
//         }
        
//         alert('✅ Kosztorysy zostały zaimportowane!');
//         document.getElementById('editIntegraResults').innerHTML = '';
//         await loadExistingCosts();
        
//     } catch (error) {
//         console.error('Błąd importu:', error);
//         alert('❌ Błąd importu: ' + error.message);
//     }
// }

// // MODYFIKACJA FUNKCJI ZAMYKANIA MODALA
// function closeEditModal() {
//     document.getElementById('editModal').style.display = 'none';
    
//     // Reset wszystkich zmiennych globalnych
//     window.currentEditNoteId = null;
//     window.editSelectedTowary = [];
//     window.editSelectedUslugi = [];
//     window.editTowaryData = [];
//     window.editUslugiData = [];
//     window.editExistingCosts = [];
//     window.editNoteData = null;
//     window.editIntegraKosztorysy = [];
// }

// // === DODAJ TE FUNKCJE DO modules/notatnik/static/js/note.js ===

// // Zmienne globalne dla dodawania notatek
// window.selectedTowary = [];
// window.selectedUslugi = [];
// window.towaryData = [];
// window.uslugiData = [];
// window.integraKosztorysy = [];
// window.wybraneKosztorysy = [];

// // NOWA FUNKCJA WYBORU TYPU NOTATKI
// function selectNoteType(type) {
//     // Reset wszystkich przycisków
//     document.querySelectorAll('.note-type-btn').forEach(btn => {
//         btn.classList.remove('active');
//         btn.classList.remove('btn-primary');
//         btn.classList.add('btn-secondary');
//     });
    
//     // Aktywuj wybrany przycisk
//     const selectedBtn = document.querySelector(`[data-type="${type}"]`);
//     selectedBtn.classList.remove('btn-secondary');
//     selectedBtn.classList.add('btn-primary', 'active');
    
//     // Ustaw wartość
//     document.getElementById('typ_notatki').value = type;
    
//     // Pokaż odpowiednie sekcje
//     if (type === 'szybka') {
//         // Tylko treść notatki
//         showSection('noteContentSection');
//         hideSection('vehicleSection');
//         showSection('actionButtons');
//     } else if (type === 'pojazd') {
//         // Wszystkie sekcje pojazdu
//         showSection('vehicleSection');
//         showSection('noteContentSection');
//         showSection('actionButtons');
        
//         // Załaduj dane towarów i usług
//         loadDropdownData();
//     }
// }

// // FUNKCJE POKAZYWANIA/UKRYWANIA SEKCJI
// function showSection(sectionId) {
//     const section = document.getElementById(sectionId);
//     if (section) {
//         section.classList.remove('hidden');
//         section.classList.add('slide-in');
//     }
// }

// function hideSection(sectionId) {
//     const section = document.getElementById(sectionId);
//     if (section) {
//         section.classList.add('hidden');
//         section.classList.remove('slide-in');
//     }
// }

// // ŁADOWANIE DANYCH DO DROPDOWNÓW
// async function loadDropdownData() {
//     try {
//         const [towaryResponse, uslugiResponse] = await Promise.all([
//             fetch('/api/towary'),
//             fetch('/api/uslugi')
//         ]);
        
//         window.towaryData = await towaryResponse.json();
//         window.uslugiData = await uslugiResponse.json();
        
//         populateSelects();
        
//     } catch (error) {
//         console.error('Błąd ładowania danych:', error);
//         document.getElementById('selectTowar').innerHTML = '<option value="">❌ Błąd ładowania</option>';
//         document.getElementById('selectUsluga').innerHTML = '<option value="">❌ Błąd ładowania</option>';
//     }
// }

// function populateSelects() {
//     const towarSelect = document.getElementById('selectTowar');
//     const uslugaSelect = document.getElementById('selectUsluga');
    
//     // Wypełnij towary
//     towarSelect.innerHTML = '<option value="">-- Wybierz towar --</option>';
//     window.towaryData.forEach(towar => {
//         towarSelect.innerHTML += `<option value="${towar.id}">${towar.nazwa} - ${parseFloat(towar.cena).toFixed(2)}zł</option>`;
//     });
    
//     // Wypełnij usługi
//     uslugaSelect.innerHTML = '<option value="">-- Wybierz usługę --</option>';
//     window.uslugiData.forEach(usluga => {
//         uslugaSelect.innerHTML += `<option value="${usluga.id}">${usluga.nazwa} - ${parseFloat(usluga.cena).toFixed(2)}zł</option>`;
//     });
// }

// // AUTO-WYPEŁNIANIE CEN
// document.addEventListener('change', function(e) {
//     if (e.target.id === 'selectTowar') {
//         const selectedTowar = window.towaryData.find(t => t.id == e.target.value);
//         if (selectedTowar) {
//             document.getElementById('towarCena').value = parseFloat(selectedTowar.cena).toFixed(2);
//         }
//     }
    
//     if (e.target.id === 'selectUsluga') {
//         const selectedUsluga = window.uslugiData.find(u => u.id == e.target.value);
//         if (selectedUsluga) {
//             document.getElementById('uslugaCena').value = parseFloat(selectedUsluga.cena).toFixed(2);
//         }
//     }
// });

// // DODAWANIE TOWARÓW
// function addTowarToCost() {
//     const selectTowar = document.getElementById('selectTowar');
//     const iloscInput = document.getElementById('towarIlosc');
//     const cenaInput = document.getElementById('towarCena');
    
//     if (!selectTowar.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const selectedTowar = window.towaryData.find(t => t.id == selectTowar.value);
//     if (!selectedTowar) return;
    
//     const newItem = {
//         id: selectedTowar.id,
//         nazwa: selectedTowar.nazwa,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: false
//     };
    
//     window.selectedTowary.push(newItem);
    
//     // Reset pól
//     selectTowar.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderSelectedTowary();
//     updateCostSummary();
// }

// function addCustomTowarToCost() {
//     const nazwaInput = document.getElementById('customTowarNazwa');
//     const iloscInput = document.getElementById('customTowarIlosc');
//     const cenaInput = document.getElementById('customTowarCena');
    
//     if (!nazwaInput.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const newItem = {
//         id: null,
//         nazwa: nazwaInput.value,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: true
//     };
    
//     window.selectedTowary.push(newItem);
    
//     // Reset pól
//     nazwaInput.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderSelectedTowary();
//     updateCostSummary();
// }

// // DODAWANIE USŁUG
// function addUslugaToCost() {
//     const selectUsluga = document.getElementById('selectUsluga');
//     const iloscInput = document.getElementById('uslugaIlosc');
//     const cenaInput = document.getElementById('uslugaCena');
    
//     if (!selectUsluga.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const selectedUsluga = window.uslugiData.find(u => u.id == selectUsluga.value);
//     if (!selectedUsluga) return;
    
//     const newItem = {
//         id: selectedUsluga.id,
//         nazwa: selectedUsluga.nazwa,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: false
//     };
    
//     window.selectedUslugi.push(newItem);
    
//     // Reset pól
//     selectUsluga.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderSelectedUslugi();
//     updateCostSummary();
// }

// function addCustomUslugaToCost() {
//     const nazwaInput = document.getElementById('customUslugaNazwa');
//     const iloscInput = document.getElementById('customUslugaIlosc');
//     const cenaInput = document.getElementById('customUslugaCena');
    
//     if (!nazwaInput.value || !iloscInput.value || !cenaInput.value) {
//         alert('Wypełnij wszystkie pola');
//         return;
//     }
    
//     const newItem = {
//         id: null,
//         nazwa: nazwaInput.value,
//         ilosc: parseFloat(iloscInput.value),
//         cena: parseFloat(cenaInput.value),
//         isCustom: true
//     };
    
//     window.selectedUslugi.push(newItem);
    
//     // Reset pól
//     nazwaInput.value = '';
//     iloscInput.value = '';
//     cenaInput.value = '';
    
//     renderSelectedUslugi();
//     updateCostSummary();
// }

// // RENDEROWANIE WYBRANYCH POZYCJI
// function renderSelectedTowary() {
//     const container = document.getElementById('selectedTowary');
    
//     if (window.selectedTowary.length === 0) {
//         container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych towarów</p>';
//         return;
//     }
    
//     container.innerHTML = window.selectedTowary.map((item, index) => `
//         <div class="cost-item">
//             <div class="item-info">
//                 <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własny)</span>' : ''}<br>
//                 <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
//             </div>
//             <div class="item-actions">
//                 <button type="button" class="btn btn-sm btn-warning" onclick="editTowarItem(${index})">✏️</button>
//                 <button type="button" class="btn btn-sm btn-danger" onclick="removeTowar(${index})">🗑️</button>
//             </div>
//         </div>
//     `).join('');
// }

// function renderSelectedUslugi() {
//     const container = document.getElementById('selectedUslugi');
    
//     if (window.selectedUslugi.length === 0) {
//         container.innerHTML = '<p style="color: #6c757d; font-style: italic;">Brak wybranych usług</p>';
//         return;
//     }
    
//     container.innerHTML = window.selectedUslugi.map((item, index) => `
//         <div class="cost-item">
//             <div class="item-info">
//                 <strong>${item.nazwa}</strong> ${item.isCustom ? '<span style="color: #007bff;">(własna)</span>' : ''}<br>
//                 <small>Ilość: ${item.ilosc} × ${item.cena.toFixed(2)} zł = <strong>${(item.ilosc * item.cena).toFixed(2)} zł</strong></small>
//             </div>
//             <div class="item-actions">
//                 <button type="button" class="btn btn-sm btn-warning" onclick="editUslugaItem(${index})">✏️</button>
//                 <button type="button" class="btn btn-sm btn-danger" onclick="removeUsluga(${index})">🗑️</button>
//             </div>
//         </div>
//     `).join('');
// }

// // USUWANIE POZYCJI
// function removeTowar(index) {
//     window.selectedTowary.splice(index, 1);
//     renderSelectedTowary();
//     updateCostSummary();
// }

// function removeUsluga(index) {
//     window.selectedUslugi.splice(index, 1);
//     renderSelectedUslugi();
//     updateCostSummary();
// }

// // EDYCJA POZYCJI
// function editTowarItem(index) {
//     const item = window.selectedTowary[index];
//     const newIlosc = prompt('Nowa ilość:', item.ilosc);
//     const newCena = prompt('Nowa cena:', item.cena);
    
//     if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
//         window.selectedTowary[index].ilosc = parseFloat(newIlosc);
//         window.selectedTowary[index].cena = parseFloat(newCena);
//         renderSelectedTowary();
//         updateCostSummary();
//     }
// }

// function editUslugaItem(index) {
//     const item = window.selectedUslugi[index];
//     const newIlosc = prompt('Nowa ilość:', item.ilosc);
//     const newCena = prompt('Nowa cena:', item.cena);
    
//     if (newIlosc !== null && newCena !== null && !isNaN(newIlosc) && !isNaN(newCena)) {
//         window.selectedUslugi[index].ilosc = parseFloat(newIlosc);
//         window.selectedUslugi[index].cena = parseFloat(newCena);
//         renderSelectedUslugi();
//         updateCostSummary();
//     }
// }

// // OBLICZANIE SUMY
// function calculateCostTotal() {
//     let total = 0;
    
//     window.selectedTowary.forEach(item => {
//         total += item.ilosc * item.cena;
//     });
    
//     window.selectedUslugi.forEach(item => {
//         total += item.ilosc * item.cena;
//     });
    
//     return total;
// }

// function updateCostSummary() {
//     const total = calculateCostTotal();
//     const hasItems = window.selectedTowary.length > 0 || window.selectedUslugi.length > 0;
    
//     const summaryDiv = document.getElementById('costSummary');
//     const totalDiv = document.getElementById('costTotal');
    
//     if (hasItems) {
//         summaryDiv.style.display = 'block';
//         totalDiv.innerHTML = `Łączna kwota: <span style="color: #28a745;">${total.toFixed(2)} zł</span>`;
//     } else {
//         summaryDiv.style.display = 'none';
//     }
// }

// // POBIERANIE KOSZTORYSÓW Z INTEGRA
// async function pobierzKosztorysyZIntegra() {
//     const nrRej = document.getElementById('nr_rejestracyjny').value.trim();
//     if (!nrRej) {
//         alert('Wprowadź numer rejestracyjny');
//         return;
//     }
    
//     const resultsDiv = document.getElementById('integraResults');
//     showSection('integraSection');
//     resultsDiv.innerHTML = '<p>🔄 Pobieranie danych z systemu integra...</p>';
    
//     try {
//         const response = await fetch(`/api/kosztorysy-zewnetrzne/${nrRej}`);
//         const data = await response.json();
        
//         if (!response.ok) {
//             throw new Error(data.detail || 'Błąd pobierania danych');
//         }
        
//         if (data.kosztorysy.length === 0) {
//             resultsDiv.innerHTML = `<p>❌ Brak kosztorysów w systemie integra dla pojazdu ${nrRej}</p>`;
//             return;
//         }
        
//         let html = `<p>✅ Znaleziono ${data.kosztorysy.length} kosztorysów:</p>`;
        
//         data.kosztorysy.forEach((kosztorys, index) => {
//             html += `
//                 <div class="integra-kosztorys">
//                     <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
//                         <input type="checkbox" id="integra_${index}" value="${index}" onchange="toggleIntegraKosztorys(${index})">
//                         <label for="integra_${index}" style="cursor: pointer; flex: 1;">
//                             <h5 style="margin: 0;">${kosztorys.numer_kosztorysu} - ${kosztorys.kwota_kosztorysu.toFixed(2)} zł</h5>
//                         </label>
//                     </div>
//                     <p><strong>Klient:</strong> ${kosztorys.nazwa_klienta}</p>
//                     <p><strong>Pozycje:</strong> ${kosztorys.towary.length} towarów, ${kosztorys.uslugi.length} usług</p>
//                 </div>
//             `;
//         });
        
//         html += `
//             <button type="button" class="btn btn-success" onclick="importujWybraneKosztorysy()" style="margin-top: 15px;">
//                 📥 Importuj wybrane kosztorysy
//             </button>
//         `;
        
//         resultsDiv.innerHTML = html;
//         window.integraKosztorysy = data.kosztorysy;
//         window.wybraneKosztorysy = [];
        
//     } catch (error) {
//         console.error('Błąd:', error);
//         resultsDiv.innerHTML = `<p>❌ Błąd: ${error.message}</p>`;
//     }
// }

// // OBSŁUGA CHECKBOXÓW KOSZTORYSÓW Z INTEGRA
// function toggleIntegraKosztorys(index) {
//     const checkbox = document.getElementById(`integra_${index}`);
//     if (checkbox.checked) {
//         if (!window.wybraneKosztorysy.includes(index)) {
//             window.wybraneKosztorysy.push(index);
//         }
//     } else {
//         window.wybraneKosztorysy = window.wybraneKosztorysy.filter(i => i !== index);
//     }
//     console.log('Wybrane kosztorysy:', window.wybraneKosztorysy);
// }

// function importujWybraneKosztorysy() {
//     if (!window.wybraneKosztorysy || window.wybraneKosztorysy.length === 0) {
//         alert('Wybierz przynajmniej jeden kosztorys do importu');
//         return;
//     }
    
//     // Przygotuj dane kosztorysów do importu
//     const wybraneKosztorysyData = window.wybraneKosztorysy.map(index => window.integraKosztorysy[index]);
    
//     // Zapisz wybrane kosztorysy w ukrytym polu formularza
//     document.getElementById('importowane_kosztorysy').value = JSON.stringify(wybraneKosztorysyData);
    
//     // Pokaż podsumowanie
//     const podsumowanie = wybraneKosztorysyData.map(k => 
//         `• ${k.numer_kosztorysu} - ${k.kwota_kosztorysu.toFixed(2)} zł`
//     ).join('\n');
    
//     const potwierdz = confirm(`Zostaną zaimportowane kosztorysy:\n\n${podsumowanie}\n\nKontynuować?`);
    
//     if (potwierdz) {
//         const resultsDiv = document.getElementById('integraResults');
//         resultsDiv.innerHTML += `
//             <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin-top: 15px; border-radius: 6px;">
//                 ✅ <strong>Gotowe do importu:</strong> ${window.wybraneKosztorysy.length} kosztorysów
//                 <br><small>Kosztorysy zostaną zaimportowane po zapisaniu notatki.</small>
//             </div>
//         `;
        
//         alert('Kosztorysy przygotowane do importu!\nTeraz wypełnij treść notatki i kliknij "Zapisz notatkę".');
//     }
// }

// // PRZYGOTOWANIE DANYCH PRZED WYSŁANIEM FORMULARZA
// document.addEventListener('DOMContentLoaded', function() {
//     const form = document.getElementById('addNoteForm');
//     if (form) {
//         form.addEventListener('submit', function(e) {
//             // Przygotuj dane własnego kosztorysu jeśli został utworzony
//             if (window.selectedTowary.length > 0 || window.selectedUslugi.length > 0) {
//                 const customCostNumber = document.getElementById('customCostNumber').value.trim();
//                 const customCostDescription = document.getElementById('customCostDescription').value.trim();
                
//                 if (!customCostNumber) {
//                     e.preventDefault();
//                     alert('Podaj numer kosztorysu');
//                     return false;
//                 }
                
//                 // Zapisz dane kosztorysu w ukrytych polach
//                 document.getElementById('towary_json').value = JSON.stringify(window.selectedTowary);
//                 document.getElementById('uslugi_json').value = JSON.stringify(window.selectedUslugi);
//                 document.getElementById('numer_kosztorysu').value = customCostNumber;
//                 document.getElementById('opis_kosztorysu').value = customCostDescription;
//             }
            
//             return true;
//         });
//     }
// });

// // MODYFIKACJA FUNKCJI RESET MODALA
// function resetModalForm() {
//     // Reset formularza dodawania notatki
//     document.getElementById('typ_notatki').value = '';
    
//     // Ukryj wszystkie sekcje
//     hideSection('vehicleSection');
//     hideSection('integraSection');
//     hideSection('noteContentSection');
//     hideSection('actionButtons');
    
//     // Reset pól
//     document.getElementById('nr_rejestracyjny').value = '';
//     document.getElementById('noteTresc').value = '';
//     document.getElementById('customCostNumber').value = '';
//     document.getElementById('customCostDescription').value = '';
    
//     // Reset ukrytych pól
//     document.getElementById('importowane_kosztorysy').value = '';
//     document.getElementById('towary_json').value = '[]';
//     document.getElementById('uslugi_json').value = '[]';
//     document.getElementById('numer_kosztorysu').value = '';
//     document.getElementById('opis_kosztorysu').value = '';
    
//     // Reset zmiennych globalnych
//     window.selectedTowary = [];
//     window.selectedUslugi = [];
//     window.integraKosztorysy = [];
//     window.wybraneKosztorysy = [];
    
//     // Reset przycisków typu
//     document.querySelectorAll('.note-type-btn').forEach(btn => {
//         btn.classList.remove('active', 'btn-primary');
//         btn.classList.add('btn-secondary');
//     });
    
//     // Reset wyświetlanych list
//     document.getElementById('selectedTowary').innerHTML = '';
//     document.getElementById('selectedUslugi').innerHTML = '';
//     document.getElementById('integraResults').innerHTML = '';
//     document.getElementById('costSummary').style.display = 'none';
// }


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