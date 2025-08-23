// === NOTE-DETAILS.JS - OBSŁUGA MODALA DODATKOWE INFORMACJE ===

// Globalne zmienne
let currentDetailsNoteId = null;

// Otwórz modal dodatkowe informacje
function openDetailsModal(noteId) {
    currentDetailsNoteId = noteId;
    document.getElementById('detailsNoteId').textContent = noteId;
    
    // Pobierz obecne dane notatki
    fetchNoteDetails(noteId);
    
    // Pokaż modal
    document.getElementById('detailsModal').style.display = 'block';
}

// Zamknij modal dodatkowe informacje
function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
    currentDetailsNoteId = null;
    
    // Wyczyść formularz
    document.getElementById('detailsForm').reset();
}

// Pobierz szczegóły notatki z API
async function fetchNoteDetails(noteId) {
    try {
        const response = await fetch(`/api/notatki/${noteId}/details`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Wypełnij formularz danymi
            document.getElementById('detailsDataDostawy').value = data.data_dostawy ? 
                new Date(data.data_dostawy).toISOString().slice(0, 10) : '';
            document.getElementById('detailsDostawca').value = data.dostawca || '';
            document.getElementById('detailsNrVatDot').value = data.nr_vat_dot || '';
            document.getElementById('detailsMiejsceProd').value = data.miejsce_prod || '';
        } else {
            console.log('Nie udało się pobrać szczegółów notatki');
        }
    } catch (error) {
        console.error('Błąd podczas pobierania szczegółów:', error);
        showToast('Błąd podczas pobierania danych', 'error');
    }
}

// Obsługa formularza - zapisz dodatkowe informacje
document.addEventListener('DOMContentLoaded', function() {
    const detailsForm = document.getElementById('detailsForm');
    if (!detailsForm) {
        console.error('Nie znaleziono formularza detailsForm');
        return;
    }
    
    detailsForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentDetailsNoteId) {
        showToast('Błąd: brak ID notatki', 'error');
        return;
    }
    
    // Pobierz dane z formularza
    const formData = new FormData(this);
    const data = {
        data_dostawy: formData.get('data_dostawy') || null,
        dostawca: formData.get('dostawca') || null,
        nr_vat_dot: formData.get('nr_vat_dot') || null,
        miejsce_prod: formData.get('miejsce_prod') || null
    };
    
    try {
        const response = await fetch(`/api/notatki/${currentDetailsNoteId}/details`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Dodatkowe informacje zostały zapisane', 'success');
            closeDetailsModal();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Błąd podczas zapisywania', 'error');
        }
    } catch (error) {
        console.error('Błąd podczas zapisywania:', error);
        showToast('Błąd podczas zapisywania danych', 'error');
    }
    });
});

// Zamknij modal klawiszem ESC - WYŁĄCZONE
// Modal zamyka się tylko przez przycisk ❌ i "Anuluj"
// document.addEventListener('keydown', function(event) {
//     if (event.key === 'Escape') {
//         const modal = document.getElementById('detailsModal');
//         if (modal.style.display === 'block') {
//             closeDetailsModal();
//         }
//     }
// });