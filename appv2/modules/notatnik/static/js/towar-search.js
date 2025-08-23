// === WYSZUKIWANIE TOWARÓW ===

// Timeout dla debounce wyszukiwania
let searchTimeout = null;

// Funkcja wyszukiwania towarów (modal dodawania)
function setupTowarSearch() {
    const searchInput = document.getElementById('searchTowar');
    const resultsContainer = document.getElementById('towarSearchResults');
    
    if (!searchInput || !resultsContainer) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchTowary(query, resultsContainer, (towar) => {
                selectTowar(towar, searchInput, resultsContainer);
            });
        }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}

// Funkcja wyszukiwania towarów (modal edycji)
function setupEditTowarSearch() {
    const searchInput = document.getElementById('editSearchTowar');
    const resultsContainer = document.getElementById('editTowarSearchResults');
    
    if (!searchInput || !resultsContainer) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchTowary(query, resultsContainer, (towar) => {
                selectEditTowar(towar, searchInput, resultsContainer);
            });
        }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}

// Główna funkcja wyszukiwania
async function searchTowary(query, resultsContainer, onSelect) {
    try {
        const response = await fetch(`/api/towary/search?q=${encodeURIComponent(query)}&limit=10`);
        const towary = await response.json();
        
        if (towary.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 10px; color: #666;">Brak wyników</div>';
            resultsContainer.style.display = 'block';
            return;
        }
        
        const html = towary.map(towar => `
            <div class="search-result-item" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;" 
                 data-towar='${JSON.stringify(towar)}'>
                <div style="font-weight: 500;">${towar.display}</div>
                <div style="font-size: 12px; color: #666;">Cena: ${towar.cena.toFixed(2)} zł</div>
            </div>
        `).join('');
        
        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
        
        // Add click handlers
        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const towar = JSON.parse(this.dataset.towar);
                onSelect(towar);
            });
            
            // Hover effect
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f8f9fa';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
            });
        });
        
    } catch (error) {
        console.error('Błąd wyszukiwania towarów:', error);
        resultsContainer.innerHTML = '<div style="padding: 10px; color: #dc3545;">Błąd wyszukiwania</div>';
        resultsContainer.style.display = 'block';
    }
}

// Wybór towaru w modalu dodawania
function selectTowar(towar, searchInput, resultsContainer) {
    searchInput.value = towar.display;
    resultsContainer.style.display = 'none';
    
    // Store selected towar data
    document.getElementById('selectedTowarId').value = towar.id;
    document.getElementById('selectedTowarData').value = JSON.stringify(towar);
    
    // Auto-fill price
    document.getElementById('towarCena').value = towar.cena.toFixed(2);
    
    // Focus on quantity
    document.getElementById('towarIlosc').focus();
}

// Wybór towaru w modalu edycji
function selectEditTowar(towar, searchInput, resultsContainer) {
    searchInput.value = towar.display;
    resultsContainer.style.display = 'none';
    
    // Store selected towar data
    document.getElementById('editSelectedTowarId').value = towar.id;
    document.getElementById('editSelectedTowarData').value = JSON.stringify(towar);
    
    // Auto-fill price
    document.getElementById('editTowarCena').value = towar.cena.toFixed(2);
    
    // Focus on quantity
    document.getElementById('editTowarIlosc').focus();
}

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
    setupTowarSearch();
    setupEditTowarSearch();
});

console.log('✅ Wyszukiwanie towarów załadowane');