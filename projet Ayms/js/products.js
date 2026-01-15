// products.js - Gestion complète des produits
class ProductsManager {
    constructor() {
        this.dataService = dataService;
        this.selectedProducts = new Set();
        this.currentView = 'grid'; // 'grid' ou 'list'
        this.init();
    }
    
    init() {
        // Vérifier l'authentification
        if (!this.checkAuth()) return;
        
        this.loadProducts();
        this.setupEventListeners();
        this.setupSearch();
        this.setupViewToggle();
        this.setupFilters();
    }
    
    checkAuth() {
        // Vérification simplifiée de l'authentification
        const user = this.dataService.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
    
    loadProducts() {
        const products = this.dataService.getProducts();
        this.renderProducts(products);
        this.updateStats(products);
    }
    
    renderProducts(products) {
        if (this.currentView === 'grid') {
            this.renderGridView(products);
        } else {
            this.renderListView(products);
        }
    }
    
    renderGridView(products) {
        const container = document.getElementById('productsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        products.forEach(product => {
            const card = this.createProductCard(product);
            container.appendChild(card);
        });
    }
    
    renderListView(products) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        products.forEach(product => {
            const row = this.createProductRow(product);
            tbody.appendChild(row);
        });
    }
    
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'col-xl-3 col-lg-4 col-md-6 mb-4';
        card.innerHTML = `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                         alt="${product.name}" 
                         class="img-fluid">
                    <div class="product-status ${this.getStatusClass(product.status)}">
                        ${this.getStatusText(product.status)}
                    </div>
                    <div class="product-actions">
                        <button class="btn-action view-product" 
                                data-product-id="${product.id}"
                                title="Voir">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn-action edit-product" 
                                data-product-id="${product.id}"
                                title="Éditer">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action delete-product" 
                                data-product-id="${product.id}"
                                title="Supprimer">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h6 class="product-title">${product.name}</h6>
                    <p class="product-description">${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>
                    <div class="product-meta">
                        <span class="product-stock ${product.stock < 10 ? 'text-danger' : ''}">
                            <i class="bi bi-box"></i> ${product.stock}
                        </span>
                    </div>
                    <div class="product-footer">
                        <span class="product-price">€${product.price.toFixed(2)}</span>
                        <input type="checkbox" class="product-select" 
                               data-product-id="${product.id}">
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }
    
    createProductRow(product) {
        const row = document.createElement('tr');
        row.dataset.productId = product.id;
        row.innerHTML = `
            <td>
                <input type="checkbox" class="product-select" 
                       data-product-id="${product.id}">
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${product.image || 'https://via.placeholder.com/50?text=No+Image'}" 
                         class="rounded me-2" 
                         width="50" height="50"
                         alt="${product.name}">
                    <div>
                        <strong>${product.name}</strong>
                        <div class="text-muted small">${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</div>
                    </div>
                </div>
            </td>
            <td>€${product.price.toFixed(2)}</td>
            <td>
                <span class="badge ${this.getStockBadgeClass(product.stock)}">
                    ${product.stock}
                </span>
            </td>
            <td>
                <span class="badge ${this.getStatusClass(product.status)}">
                    ${this.getStatusText(product.status)}
                </span>
            </td>
            <td>${this.formatDate(product.createdAt)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary view-product" 
                            data-product-id="${product.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success edit-product" 
                            data-product-id="${product.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-product" 
                            data-product-id="${product.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }
    
    getStatusClass(status) {
        const classes = {
            'IN_STOCK': 'bg-success',
            'LOW_STOCK': 'bg-warning',
            'OUT_OF_STOCK': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }
    
    getStatusText(status) {
        const texts = {
            'IN_STOCK': 'En Stock',
            'LOW_STOCK': 'Stock Bas',
            'OUT_OF_STOCK': 'Rupture'
        };
        return texts[status] || status;
    }
    
    getStockBadgeClass(stock) {
        const stockNum = parseInt(stock);
        if (stockNum > 20) return 'bg-success';
        if (stockNum > 0) return 'bg-warning';
        return 'bg-danger';
    }
    
    setupEventListeners() {
        // Sélection multiple
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('product-select')) {
                this.handleProductSelect(e.target);
            }
            if (e.target.id === 'selectAllProducts') {
                this.handleSelectAll(e.target.checked);
            }
        });
        
        // Actions sur les produits
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-product')) {
                this.viewProduct(e.target.closest('.view-product').dataset.productId);
            }
            if (e.target.closest('.edit-product')) {
                this.editProduct(e.target.closest('.edit-product').dataset.productId);
            }
            if (e.target.closest('.delete-product')) {
                this.deleteProduct(e.target.closest('.delete-product').dataset.productId);
            }
        });
        
        // Formulaire d'ajout
        const addForm = document.getElementById('addProductForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddProduct(e));
        }
        
        // Formulaire d'édition
        const editForm = document.getElementById('editProductForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditProduct(e));
        }
        
        // Actions en masse
        document.getElementById('bulkDeleteProductsBtn')?.addEventListener('click', () => this.bulkDelete());
        document.getElementById('bulkUpdateStockBtn')?.addEventListener('click', () => this.bulkUpdateStock());
        document.getElementById('exportProductsBtn')?.addEventListener('click', () => this.exportProducts());
        document.getElementById('importProductsBtn')?.addEventListener('click', () => this.showImportDialog());
        
        // Bouton appliquer filtres
        const applyFiltersBtn = document.getElementById('applyProductFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }
    }
    
    setupViewToggle() {
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (gridBtn && listBtn) {
            gridBtn.addEventListener('click', () => this.switchView('grid'));
            listBtn.addEventListener('click', () => this.switchView('list'));
        }
    }
    
    setupFilters() {
        // Catégorie - désactivé avec "Tous"
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Tous</option>';
        }
        
        // Filtre de tri
        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Filtre stock
        const stockFilter = document.getElementById('stockFilter');
        if (stockFilter) {
            stockFilter.addEventListener('change', () => this.applyFilters());
        }
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Mettre à jour les boutons
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (gridBtn) {
            gridBtn.classList.toggle('active', view === 'grid');
            gridBtn.classList.toggle('btn-secondary', view === 'grid');
            gridBtn.classList.toggle('btn-outline-secondary', view !== 'grid');
        }
        
        if (listBtn) {
            listBtn.classList.toggle('active', view === 'list');
            listBtn.classList.toggle('btn-secondary', view === 'list');
            listBtn.classList.toggle('btn-outline-secondary', view !== 'list');
        }
        
        // Basculer l'affichage
        const gridContainer = document.getElementById('productsGridView');
        const listContainer = document.getElementById('productsListView');
        
        if (gridContainer) {
            if (view === 'grid') {
                gridContainer.classList.remove('d-none');
                gridContainer.classList.add('d-block');
            } else {
                gridContainer.classList.add('d-none');
                gridContainer.classList.remove('d-block');
            }
        }
        
        if (listContainer) {
            if (view === 'list') {
                listContainer.classList.remove('d-none');
                listContainer.classList.add('d-block');
            } else {
                listContainer.classList.add('d-none');
                listContainer.classList.remove('d-block');
            }
        }
        
        // Recharger les produits
        this.applyFilters();
    }
    
    // ========== CRUD OPERATIONS ==========
    handleAddProduct(event) {
        event.preventDefault();
        const form = event.target;
        
        const productData = {
            name: form.name.value.trim(),
            description: form.description.value.trim(),
            category: "Sans catégorie", // Catégorie par défaut requise par dataService
            price: parseFloat(form.price.value),
            stock: parseInt(form.stock.value),
            image: form.image.value.trim() || null
        };
        
        if (!this.validateProductData(productData)) return;
        
        // Utiliser la méthode createProduct du dataService
        try {
            const newProduct = this.dataService.createProduct(productData);
            if (newProduct) {
                this.showNotification('Produit créé avec succès !', 'success');
                this.loadProducts();
                
                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
                if (modal) modal.hide();
                
                form.reset();
            } else {
                this.showNotification('Erreur lors de la création du produit', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur: ' + error.message, 'error');
        }
    }
    
    handleEditProduct(event) {
        event.preventDefault();
        const form = event.target;
        const productId = form.dataset.productId;
        
        if (!productId) {
            this.showNotification('ID produit manquant', 'error');
            return;
        }
        
        const productData = {
            name: form.name.value.trim(),
            description: form.description.value.trim(),
            category: "Sans catégorie", // Garder la même catégorie
            price: parseFloat(form.price.value),
            stock: parseInt(form.stock.value),
            image: form.image.value.trim() || null
        };
        
        if (!this.validateProductData(productData)) return;
        
        try {
            const updatedProduct = this.dataService.updateProduct(productId, productData);
            if (updatedProduct) {
                this.showNotification('Produit mis à jour avec succès !', 'success');
                this.loadProducts();
                
                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
                if (modal) modal.hide();
            } else {
                this.showNotification('Erreur lors de la mise à jour du produit', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur: ' + error.message, 'error');
        }
    }
    
    viewProduct(productId) {
        const product = this.dataService.getProductById(productId);
        if (!product) {
            this.showNotification('Produit non trouvé', 'error');
            return;
        }
        
        const modalContent = document.getElementById('viewProductContent');
        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <img src="${product.image || 'https://via.placeholder.com/400x300?text=No+Image'}" 
                         class="img-fluid rounded" 
                         alt="${product.name}">
                </div>
                <div class="col-md-6">
                    <h4>${product.name}</h4>
                    <p class="text-muted">${product.description}</p>
                    
                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>Prix:</strong>
                            <h3 class="text-primary">€${product.price.toFixed(2)}</h3>
                        </div>
                        <div class="col-6">
                            <strong>Stock:</strong>
                            <h3 class="${product.stock < 10 ? 'text-danger' : 'text-success'}">
                                ${product.stock}
                            </h3>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <strong>Statut:</strong>
                        <span class="badge ${this.getStatusClass(product.status)} ms-2">
                            ${this.getStatusText(product.status)}
                        </span>
                    </div>
                    
                    <div class="mb-3">
                        <strong>Créé le:</strong>
                        <span>${this.formatDate(product.createdAt)}</span>
                    </div>
                    
                    <div class="mb-3">
                        <strong>ID:</strong>
                        <code>${product.id}</code>
                    </div>
                </div>
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('viewProductModal'));
        modal.show();
    }
    
    editProduct(productId) {
        const product = this.dataService.getProductById(productId);
        if (!product) {
            this.showNotification('Produit non trouvé', 'error');
            return;
        }
        
        const form = document.getElementById('editProductForm');
        if (!form) {
            this.showNotification('Formulaire d\'édition non trouvé', 'error');
            return;
        }
        
        form.dataset.productId = productId;
        
        // Remplir le formulaire
        form.name.value = product.name;
        form.description.value = product.description;
        form.price.value = product.price;
        form.stock.value = product.stock;
        form.image.value = product.image || '';
        
        const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
        modal.show();
    }
    
    deleteProduct(productId) {
        const product = this.dataService.getProductById(productId);
        if (!product) return;
        
        if (confirm(`Supprimer le produit "${product.name}" ?`)) {
            const deleted = this.dataService.deleteProduct(productId);
            if (deleted) {
                this.showNotification('Produit supprimé avec succès !', 'success');
                this.loadProducts();
            } else {
                this.showNotification('Erreur lors de la suppression', 'error');
            }
        }
    }
    
    // ========== SEARCH AND FILTER ==========
    setupSearch() {
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            let timeoutId;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }
    }
    
    applyFilters() {
        let products = this.dataService.getProducts();
        
        // Recherche
        const searchTerm = document.getElementById('productSearch')?.value.toLowerCase();
        if (searchTerm && searchTerm.trim() !== '') {
            products = this.dataService.searchProducts(searchTerm);
        }
        
        // Filtre statut stock
        const stockFilter = document.getElementById('stockFilter')?.value;
        if (stockFilter) {
            products = products.filter(p => p.status === stockFilter);
        }
        
        // Tri
        const sortFilter = document.getElementById('sortFilter')?.value;
        if (sortFilter) {
            switch(sortFilter) {
                case 'name_asc':
                    products.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name_desc':
                    products.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'price_asc':
                    products.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    products.sort((a, b) => b.price - a.price);
                    break;
                case 'stock_asc':
                    products.sort((a, b) => a.stock - b.stock);
                    break;
                case 'stock_desc':
                    products.sort((a, b) => b.stock - a.stock);
                    break;
                case 'date_desc':
                    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'date_asc':
                    products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
            }
        }
        
        this.renderProducts(products);
        this.updateStats(products);
    }
    
    // ========== BULK OPERATIONS ==========
    handleProductSelect(checkbox) {
        const productId = parseInt(checkbox.dataset.productId);
        
        if (checkbox.checked) {
            this.selectedProducts.add(productId);
        } else {
            this.selectedProducts.delete(productId);
        }
        
        this.updateBulkActions();
    }
    
    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.product-select');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const productId = parseInt(checkbox.dataset.productId);
            
            if (checked) {
                this.selectedProducts.add(productId);
            } else {
                this.selectedProducts.delete(productId);
            }
        });
        
        this.updateBulkActions();
    }
    
    bulkDelete() {
        if (this.selectedProducts.size === 0) {
            this.showNotification('Sélectionnez des produits à supprimer !', 'warning');
            return;
        }
        
        if (confirm(`Supprimer ${this.selectedProducts.size} produit(s) ?`)) {
            let deletedCount = 0;
            this.selectedProducts.forEach(id => {
                if (this.dataService.deleteProduct(id)) {
                    deletedCount++;
                }
            });
            
            this.showNotification(`${deletedCount} produit(s) supprimé(s) !`, 'success');
            this.selectedProducts.clear();
            this.loadProducts();
            this.updateBulkActions();
        }
    }
    
    bulkUpdateStock() {
        if (this.selectedProducts.size === 0) {
            this.showNotification('Sélectionnez des produits à mettre à jour !', 'warning');
            return;
        }
        
        const newStock = prompt('Entrez la nouvelle quantité en stock:');
        if (newStock !== null && !isNaN(newStock) && parseInt(newStock) >= 0) {
            let updatedCount = 0;
            this.selectedProducts.forEach(id => {
                const product = this.dataService.getProductById(id);
                if (product) {
                    product.stock = parseInt(newStock);
                    this.dataService.updateProduct(id, product);
                    updatedCount++;
                }
            });
            
            this.showNotification(`${updatedCount} produit(s) mis à jour !`, 'success');
            this.selectedProducts.clear();
            this.loadProducts();
            this.updateBulkActions();
        }
    }
    
    updateBulkActions() {
        const hasSelection = this.selectedProducts.size > 0;
        const bulkActions = document.getElementById('productBulkActions');
        const selectedCount = document.getElementById('selectedProductsCount');
        
        if (selectedCount) {
            selectedCount.textContent = this.selectedProducts.size;
        }
        
        if (bulkActions) {
            bulkActions.style.display = hasSelection ? 'block' : 'none';
        }
    }
    
    // ========== IMPORT/EXPORT ==========
    exportProducts() {
        const products = this.dataService.getProducts();
        
        const exportData = {
            products: products,
            exportedAt: new Date().toISOString(),
            count: products.length
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        this.downloadFile(dataStr, 'products-export.json', 'application/json');
        this.showNotification('Export terminé !', 'success');
    }
    
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => this.importProducts(e.target.files[0]);
        input.click();
    }
    
    async importProducts(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.products || !Array.isArray(importData.products)) {
                throw new Error('Format de fichier invalide');
            }
            
            let importedCount = 0;
            
            importData.products.forEach(productData => {
                // S'assurer que chaque produit a une catégorie
                if (!productData.category) {
                    productData.category = "Sans catégorie";
                }
                
                // Créer le produit
                this.dataService.createProduct(productData);
                importedCount++;
            });
            
            this.showNotification(`${importedCount} produit(s) importé(s)`, 'success');
            this.loadProducts();
            
        } catch (error) {
            this.showNotification('Erreur lors de l\'importation: ' + error.message, 'error');
        }
    }
    
    // ========== UTILITIES ==========
    validateProductData(productData) {
        if (!productData.name || productData.name.trim().length < 2) {
            this.showNotification('Le nom du produit doit faire au moins 2 caractères', 'error');
            return false;
        }
        
        if (!productData.description || productData.description.trim().length < 10) {
            this.showNotification('La description doit faire au moins 10 caractères', 'error');
            return false;
        }
        
        if (!productData.price || productData.price <= 0 || isNaN(productData.price)) {
            this.showNotification('Le prix doit être un nombre supérieur à 0', 'error');
            return false;
        }
        
        if (productData.stock < 0 || isNaN(productData.stock)) {
            this.showNotification('Le stock doit être un nombre valide et non négatif', 'error');
            return false;
        }
        
        return true;
    }
    
    showNotification(message, type = 'info') {
        // Créer une notification Bootstrap
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi ${this.getNotificationIcon(type)} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'bi-check-circle-fill text-success',
            'error': 'bi-exclamation-circle-fill text-danger',
            'warning': 'bi-exclamation-triangle-fill text-warning',
            'info': 'bi-info-circle-fill text-primary'
        };
        return icons[type] || 'bi-info-circle-fill';
    }
    
    downloadFile(content, filename, type) {
        try {
            const blob = new Blob([content], { type: type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            this.showNotification('Erreur lors du téléchargement: ' + error.message, 'error');
        }
    }
    
    updateStats(products) {
        const stats = {
            total: products.length,
            inStock: products.filter(p => p.status === 'IN_STOCK').length,
            lowStock: products.filter(p => p.status === 'LOW_STOCK').length,
            outOfStock: products.filter(p => p.status === 'OUT_OF_STOCK').length,
            totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0)
        };
        
        // Mettre à jour les badges
        const inStockElement = document.getElementById('inStockCount');
        const lowStockElement = document.getElementById('lowStockCount');
        const outOfStockElement = document.getElementById('outOfStockCount');
        
        if (inStockElement) inStockElement.textContent = stats.inStock;
        if (lowStockElement) lowStockElement.textContent = stats.lowStock;
        if (outOfStockElement) outOfStockElement.textContent = stats.outOfStock;
        
        // Mettre à jour le badge dans la sidebar
        const productCountBadge = document.getElementById('productCountBadge');
        if (productCountBadge) {
            productCountBadge.textContent = stats.total;
        }
        
        // Mettre à jour la valeur totale du stock (si l'élément existe)
        const totalValueElement = document.getElementById('totalStockValue');
        if (totalValueElement) {
            totalValueElement.textContent = `€${stats.totalValue.toFixed(2)}`;
        }
    }
}

// Initialiser le gestionnaire de produits
let productsManager;
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que dataService est disponible
    if (typeof dataService === 'undefined') {
        console.error('dataService n\'est pas défini!');
        alert('Erreur: dataService n\'est pas chargé. Vérifiez que dataService.js est chargé avant products.js');
        return;
    }
    
    try {
        productsManager = new ProductsManager();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du ProductsManager:', error);
        alert('Erreur lors du chargement de la gestion des produits: ' + error.message);
    }
});