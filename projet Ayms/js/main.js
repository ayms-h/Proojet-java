// main.js - Script principal GLOBAL
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les composants communs
    initSidebar();
    initSearch();
    initNotifications();
    updateBadges();
    
    // Vérifier si l'utilisateur est connecté
    if (window.location.pathname.includes('login.html')) {
        // Sur la page login, on ne fait rien de plus
        return;
    }
    
    // Mettre à jour l'interface utilisateur
    const user = dataService.getCurrentUser();
    if (user) {
        updateUserInfo(user);
    }
    
    // Initialiser les graphiques si Chart.js est disponible
    if (typeof Chart !== 'undefined') {
        initCharts();
    }
});

// ==================== SIDEBAR ====================
function initSidebar() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', document.body.classList.contains('sidebar-collapsed'));
        });
        
        // Restaurer l'état
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        }
    }
    
    // Marquer l'élément actif du menu
    const currentPage = window.location.pathname.split('/').pop();
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    
    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            item.parentElement.classList.add('active');
        } else {
            item.parentElement.classList.remove('active');
        }
    });
}

// ==================== RECHERCHE ====================
function initSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    // Rediriger vers la page appropriée avec recherche
                    const currentPage = window.location.pathname.split('/').pop();
                    let redirectPage = 'index.html';
                    
                    if (currentPage.includes('users')) redirectPage = 'users.html';
                    else if (currentPage.includes('products')) redirectPage = 'products.html';
                    else if (currentPage.includes('orders')) redirectPage = 'orders.html';
                    
                    window.location.href = `${redirectPage}?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
}

// ==================== NOTIFICATIONS ====================
function initNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            showNotifications();
        });
    }
    
    // Simuler des notifications
    updateNotificationCount();
}

function showNotifications() {
    const orders = dataService.getOrders();
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const lowStockProducts = dataService.getProducts().filter(p => p.status === 'LOW_STOCK').length;
    
    let message = '';
    
    if (pendingOrders > 0) {
        message += `${pendingOrders} commande(s) en attente\n`;
    }
    
    if (lowStockProducts > 0) {
        message += `${lowStockProducts} produit(s) avec stock bas\n`;
    }
    
    if (!message) {
        message = 'Aucune notification';
    }
    
    alert(message);
}

function updateNotificationCount() {
    const countElement = document.querySelector('.notification-count');
    if (!countElement) return;
    
    const orders = dataService.getOrders();
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const lowStockProducts = dataService.getProducts().filter(p => p.status === 'LOW_STOCK').length;
    
    const total = pendingOrders + lowStockProducts;
    countElement.textContent = total > 99 ? '99+' : total;
    countElement.style.display = total > 0 ? 'flex' : 'none';
}

// ==================== BADGES ====================
function updateBadges() {
    const users = dataService.getUsers();
    const products = dataService.getProducts();
    const orders = dataService.getOrders();
    
    // Mettre à jour tous les badges
    document.querySelectorAll('#userCountBadge, .user-count-badge').forEach(el => {
        el.textContent = users.length;
    });
    
    document.querySelectorAll('#productCountBadge, .product-count-badge').forEach(el => {
        el.textContent = products.length;
    });
    
    document.querySelectorAll('#orderCountBadge, .order-count-badge').forEach(el => {
        el.textContent = orders.length;
    });
}

// ==================== INFOS UTILISATEUR ====================
function updateUserInfo(user) {
    // Avatar
    const avatarElements = document.querySelectorAll('.user-avatar, #currentUserAvatar');
    avatarElements.forEach(el => {
        if (el && user.avatar) {
            el.src = user.avatar;
            el.alt = user.username;
        }
    });
    
    // Nom d'utilisateur
    document.querySelectorAll('.username-display, #dropdownUserName').forEach(el => {
        if (el) el.textContent = user.username;
    });
    
    // Nom complet
    document.querySelectorAll('#currentUserName, .user-fullname').forEach(el => {
        if (el) el.textContent = `${user.firstName} ${user.lastName}`;
    });
    
    // Email
    document.querySelectorAll('#currentUserEmail, .user-email').forEach(el => {
        if (el) el.textContent = user.email;
    });
    
    // Rôle
    document.querySelectorAll('.user-role').forEach(el => {
        if (el) {
            el.textContent = user.role;
            el.className = `user-role badge ${getRoleBadgeClass(user.role)}`;
        }
    });
}

function getRoleBadgeClass(role) {
    switch(role) {
        case 'ADMIN': return 'bg-danger';
        case 'MANAGER': return 'bg-warning';
        case 'EDITOR': return 'bg-info';
        default: return 'bg-secondary';
    }
}

// ==================== GRAPHIQUES ====================
function initCharts() {
    // Graphique des ventes (sur index.html et analytics.html)
    const salesChartCtx = document.getElementById('salesChart');
    if (salesChartCtx) {
        const orders = dataService.getOrders();
        const monthlyData = {};
        
        orders.forEach(order => {
            const month = order.createdAt.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = 0;
            }
            monthlyData[month] += order.totalAmount;
        });
        
        const months = Object.keys(monthlyData).sort().slice(-6);
        const revenues = months.map(month => monthlyData[month] || 0);
        
        new Chart(salesChartCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Revenus (€)',
                    data: revenues,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
    
    // Graphique des catégories
    const categoryChartCtx = document.getElementById('categoryChart');
    if (categoryChartCtx) {
        const products = dataService.getProducts();
        const categoryData = {};
        
        products.forEach(product => {
            if (!categoryData[product.category]) {
                categoryData[product.category] = 0;
            }
            categoryData[product.category]++;
        });
        
        const categories = Object.keys(categoryData);
        const counts = Object.values(categoryData);
        const colors = generateColors(categories.length);
        
        new Chart(categoryChartCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
}

function generateColors(count) {
    const colors = [];
    const hueStep = 360 / count;
    
    for (let i = 0; i < count; i++) {
        const hue = i * hueStep;
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    
    return colors;
}

// ==================== UTILITAIRES ====================
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" 
             role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ==================== GÉNÉRATION DE DONNÉES ====================
window.generateTestData = function() {
    if (confirm('Générer des données de test ? Cela ajoutera des utilisateurs, produits et commandes.')) {
        dataService.generateTestData();
        
        // Recharger la page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
        showToast('Données de test générées !', 'success');
    }
};

// ==================== EXPORT/IMPORT ====================
window.exportData = function() {
    dataService.exportData();
    showToast('Données exportées avec succès !', 'success');
};

window.importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (confirm('Importer ces données ? Cela remplacera vos données actuelles.')) {
            const success = dataService.importData(e.target.result);
            if (success) {
                showToast('Données importées avec succès !', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast('Erreur lors de l\'importation', 'error');
            }
        }
    };
    reader.readAsText(file);
    
    // Réinitialiser l'input
    event.target.value = '';
};

// ==================== MISE À JOUR DES STATS ====================
function updateDashboardStats() {
    const stats = dataService.getDashboardStats();
    const analytics = dataService.getAnalytics();
    
    // Mettre à jour les cartes
    document.querySelectorAll('.stat-card').forEach((card, index) => {
        const values = [stats.users, stats.products, stats.orders, stats.revenue];
        if (card.querySelector('h5')) {
            const value = values[index];
            card.querySelector('h5').textContent = index === 3 ? formatCurrency(value) : value;
        }
    });
    
    // Mettre à jour les badges
    updateBadges();
}

// Initialiser les stats sur le dashboard
if (window.location.pathname.includes('index.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        updateDashboardStats();
    });
}