// === WYSZUKIWANIE USŁUG ===

// Timeout dla debounce wyszukiwania
let uslugaSearchTimeout = null;

// Funkcja wyszukiwania usług (modal dodawania)
function setupUslugaSearch() {
    const searchInput = document.getElementById('searchUsluga');
    const resultsContainer = document.getElementById('uslugaSearchResults');
    
    if (!searchInput || !resultsContainer) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (uslugaSearchTimeout) {
            clearTimeout(uslugaSearchTimeout);
        }
        
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        uslugaSearchTimeout = setTimeout(() => {
            searchUslugi(query, resultsContainer, (usluga) => {
                selectUsluga(usluga, searchInput, resultsContainer);
            });
        }, 300);
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}

// Funkcja wyszukiwania usług (modal edycji)
function setupEditUslugaSearch() {
    const searchInput = document.getElementById('editSearchUsluga');
    const resultsContainer = document.getElementById('editUslugaSearchResults');
    
    if (!searchInput || !resultsContainer) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (uslugaSearchTimeout) {
            clearTimeout(uslugaSearchTimeout);
        }
        
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        uslugaSearchTimeout = setTimeout(() => {
            searchUslugi(query, resultsContainer, (usluga) => {
                selectEditUsluga(usluga, searchInput, resultsContainer);
            });
        }, 300);
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}

// Główna funkcja wyszukiwania usług
async function searchUslugi(query, resultsContainer, onSelect) {
    try {
        const response = await fetch(`/api/uslugi/search?q=${encodeURIComponent(query)}&limit=10`);
        const uslugi = await response.json();
        
        if (uslugi.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 10px; color: #666;">Brak wyników</div>';
            resultsContainer.style.display = 'block';
            return;
        }
        
        const html = uslugi.map(usluga => `
            <div class="search-result-item" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;" 
                 data-usluga='${JSON.stringify(usluga)}'>
                <div style="font-weight: 500;">${usluga.display}</div>
                <div style="font-size: 12px; color: #666;">Cena: ${usluga.cena.toFixed(2)} zł</div>
            </div>
        `).join('');
        
        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
        
        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const usluga = JSON.parse(this.dataset.usluga);
                onSelect(usluga);
            });
            
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f8f9fa';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
            });
        });
        
    } catch (error) {
        console.error('Błąd wyszukiwania usług:', error);
        resultsContainer.innerHTML = '<div style="padding: 10px; color: #dc3545;">Błąd wyszukiwania</div>';
        resultsContainer.style.display = 'block';
    }
}

// Wybór usługi w modalu dodawania
function selectUsluga(usluga, searchInput, resultsContainer) {
    searchInput.value = usluga.display;
    resultsContainer.style.display = 'none';
    
    document.getElementById('selectedUslugaId').value = usluga.id;
    document.getElementById('selectedUslugaData').value = JSON.stringify(usluga);
    
    document.getElementById('uslugaCena').value = usluga.cena.toFixed(2);
    document.getElementById('uslugaIlosc').focus();
}

// Wybór usługi w modalu edycji
function selectEditUsluga(usluga, searchInput, resultsContainer) {
    searchInput.value = usluga.display;
    resultsContainer.style.display = 'none';
    
    document.getElementById('editSelectedUslugaId').value = usluga.id;
    document.getElementById('editSelectedUslugaData').value = JSON.stringify(usluga);
    
    document.getElementById('editUslugaCena').value = usluga.cena.toFixed(2);
    document.getElementById('editUslugaIlosc').focus();
}

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
    setupUslugaSearch();
    setupEditUslugaSearch();
});

console.log('✅ Wyszukiwanie usług załadowane');