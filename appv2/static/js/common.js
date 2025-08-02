// === COMMON.JS - WSPÓLNE FUNKCJE JAVASCRIPT ===

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 System Warsztatowy v2.0 - Załadowany');
    
    // Inicjalizuj animacje dla kart dashboardu
    initializeDashboardAnimations();
    
    // Dodaj obsługę kliknięć
    setupClickHandlers();
});

// Animacje dla dashboardu
function initializeDashboardAnimations() {
    const cards = document.querySelectorAll('.dashboard-card');
    
    // Obserwator dla animacji przy wejściu w viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    });
    
    cards.forEach(card => {
        observer.observe(card);
    });
}

// Obsługa kliknięć
function setupClickHandlers() {
    // Smooth scroll dla linków
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}

// Funkcje pomocnicze
const Utils = {
    // Pokaż powiadomienie
    showNotification: function(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        // TODO: Dodać prawdziwy system powiadomień
    },
    
    // Formatowanie daty
    formatDate: function(date) {
        return new Date(date).toLocaleDateString('pl-PL');
    },
    
    // Formatowanie ceny
    formatPrice: function(price) {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN'
        }).format(price);
    }
};

// Export dla modułów
window.Utils = Utils;