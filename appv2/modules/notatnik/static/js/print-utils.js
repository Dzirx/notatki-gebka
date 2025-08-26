// === FUNKCJA DRUKOWANIA ===
function printPage() {
    // Dodaj datę wydruku w lewym górnym rogu
    const printDate = new Date().toLocaleString('pl-PL');
    
    // Utwórz element z datą wydruku (jeśli nie istnieje)
    let printInfo = document.getElementById('print-info');
    if (!printInfo) {
        printInfo = document.createElement('div');
        printInfo.id = 'print-info';
        printInfo.className = 'print-only';
        printInfo.innerHTML = `${printDate}`;
        
        // Wstaw na początku body
        document.body.insertBefore(printInfo, document.body.firstChild);
    } else {
        printInfo.innerHTML = `${printDate}`;
    }
    
    // Usuń emotikony przed drukowaniem
    removeEmojisForPrint();
    
    // Otwórz dialog drukowania
    window.print();
}

// Funkcja usuwająca emotikony z tekstu przed drukiem
function removeEmojisForPrint() {
    // Usuń emotikony z nagłówków
    const headers = document.querySelectorAll('h1, h2, h3, h4');
    headers.forEach(header => {
        const originalText = header.dataset.originalText || header.textContent;
        header.dataset.originalText = originalText;
        header.textContent = originalText.replace(/[📝💰📦🔧⚠️❌🖨️]/g, '').trim();
    });
    
    // Usuń emotikony z nagłówków kosztorysów
    const kosztorysHeaders = document.querySelectorAll('h3, h4');
    kosztorysHeaders.forEach(header => {
        if (header.textContent.includes('Kosztorys:')) {
            header.textContent = header.textContent.replace('💰 ', '');
        }
        if (header.textContent.includes('Towary')) {
            header.textContent = 'Towary';
        }
        if (header.textContent.includes('Usługi')) {
            header.textContent = 'Usługi';
        }
        if (header.textContent.includes('Informacje o notatce')) {
            header.textContent = 'Informacje o notatce';
        }
    });
    
    // UKRYJ SEKCJĘ INFORMACJI O DOSTAWIE
    const deliveryHeaders = document.querySelectorAll('h4');
    deliveryHeaders.forEach(header => {
        if (header.textContent.includes('Informacje o dostawie')) {
            // Znajdź wszystkie elementy od tego nagłówka do następnego nagłówka lub końca sekcji
            let currentElement = header;
            while (currentElement) {
                const nextElement = currentElement.nextElementSibling;
                
                // Ukryj obecny element
                currentElement.style.display = 'none';
                
                // Przerwij jeśli natrafimy na następny nagłówek h3 lub h4
                if (nextElement && (nextElement.tagName === 'H3' || nextElement.tagName === 'H4')) {
                    break;
                }
                
                currentElement = nextElement;
            }
        }
    });
}

// Skrót klawiszowy Ctrl+P
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        printPage();
    }
});

// Dodaj informacje o firmie/warsztacie (opcjonalne)
function addCompanyInfo() {
    const companyInfo = document.createElement('div');
    companyInfo.className = 'print-only firma-info';
    companyInfo.innerHTML = `
        <p><strong>Warsztat Samochodowy</strong></p>
        <p>ul. Przykładowa 123, 00-000 Miasto</p>
        <p>Tel: +48 123 456 789 | Email: warsztat@example.com</p>
        <p>NIP: 123-456-78-90</p>
    `;
    
    document.querySelector('.container').appendChild(companyInfo);
}

// Wywołaj przy ładowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    // Możesz odkomentować żeby dodać info o firmie
    // addCompanyInfo();
});