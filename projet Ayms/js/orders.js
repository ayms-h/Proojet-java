// js/orders.js
class OrderManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = {};
        this.selectedOrders = new Set();
        this.init();
    }

    init() {
        // Vérifier l'authentification
        if (!dataService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        console.log("Initialisation OrderManager...");
        console.log("Utilisateur:", dataService.getCurrentUser());
        console.log("Produits disponibles:", dataService.getProducts());

        // Charger les données initiales
        this.loadOrders();
        this.loadAvailableProducts();
        this.updateStats();
        this.setupEventListeners();
        this.updateSidebarCounts();
        this.updateUserInfo();
    }

    // ========== CHARGEMENT DES DONNÉES ==========
    
    loadOrders() {
        const orders = dataService.getOrders();
        console.log("Commandes chargées:", orders);
        this.filterOrders(orders);
    }

    filterOrders(orders) {
        let filtered = [...orders];

        // Appliquer les filtres
        const statusFilter = document.getElementById('statusFilter').value;
        const paymentFilter = document.getElementById('paymentFilter').value;
        const startDate = document.getElementById('startDateFilter').value;
        const endDate = document.getElementById('endDateFilter').value;

        if (statusFilter) {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        if (paymentFilter) {
            filtered = filtered.filter(order => order.paymentStatus === paymentFilter);
        }

        if (startDate) {
            filtered = filtered.filter(order => order.createdAt >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(order => order.createdAt <= endDate);
        }

        // Recherche si présente
        const searchInput = document.getElementById('orderSearch').value.toLowerCase();
        if (searchInput) {
            filtered = filtered.filter(order => 
                order.orderNumber.toLowerCase().includes(searchInput) ||
                order.userName.toLowerCase().includes(searchInput) ||
                order.userEmail.toLowerCase().includes(searchInput)
            );
        }

        this.displayOrders(filtered);
        this.setupPagination(filtered.length);
    }

    displayOrders(orders) {
        const tbody = document.getElementById('ordersTableBody');
        const ordersTableCard = document.getElementById('ordersTableCard');
        const noOrdersMessage = document.getElementById('noOrdersMessage');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedOrders = orders.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        if (orders.length === 0) {
            ordersTableCard.style.display = 'none';
            noOrdersMessage.style.display = 'block';
        } else {
            ordersTableCard.style.display = 'block';
            noOrdersMessage.style.display = 'none';
            
            paginatedOrders.forEach(order => {
                const row = this.createOrderRow(order);
                tbody.appendChild(row);
            });
        }

        // Mettre à jour les compteurs
        document.getElementById('totalOrdersCount').textContent = orders.length;
    }

    createOrderRow(order) {
        const row = document.createElement('tr');
        const isSelected = this.selectedOrders.has(order.id);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="order-checkbox" 
                       value="${order.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td>
                <strong>${order.orderNumber}</strong>
                <small class="d-block text-muted">ID: ${order.id}</small>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(order.userName)}&background=random&color=fff" 
                         class="rounded-circle me-2" width="32" height="32">
                    <div>
                        <div>${order.userName}</div>
                        <small class="text-muted">${order.userEmail}</small>
                    </div>
                </div>
            </td>
            <td>
                <div>${order.products ? order.products.length : 0} produit(s)</div>
                <small class="text-muted">${order.products ? order.products.map(p => p.name).join(', ').substring(0, 50) + '...' : ''}</small>
            </td>
            <td>
                <strong>€${parseFloat(order.totalAmount).toFixed(2)}</strong>
            </td>
            <td>
                <span class="badge bg-${this.getStatusColor(order.status)}">
                    ${this.getStatusText(order.status)}
                </span>
            </td>
            <td>
                <span class="badge bg-${this.getPaymentStatusColor(order.paymentStatus)}">
                    ${this.getPaymentStatusText(order.paymentStatus)}
                </span>
            </td>
            <td>
                <div>${order.createdAt}</div>
                <small class="text-muted">${order.updatedAt ? 'Modifié: ' + order.updatedAt : ''}</small>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info view-order-btn" data-id="${order.id}" 
                            data-bs-toggle="tooltip" title="Voir">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-primary edit-order-btn" data-id="${order.id}" 
                            data-bs-toggle="tooltip" title="Modifier">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-order-btn" data-id="${order.id}" 
                            data-bs-toggle="tooltip" title="Supprimer">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        // Ajouter les event listeners
        const checkbox = row.querySelector('.order-checkbox');
        checkbox.addEventListener('change', (e) => this.toggleOrderSelection(order.id, e.target.checked));

        row.querySelector('.view-order-btn').addEventListener('click', () => this.viewOrder(order.id));
        row.querySelector('.edit-order-btn').addEventListener('click', () => this.editOrder(order.id));
        row.querySelector('.delete-order-btn').addEventListener('click', () => this.confirmDeleteOrder(order.id));

        return row;
    }

    // ========== CHARGEMENT DES DONNÉES POUR MODALS ==========

    loadAvailableProducts() {
        const tbody = document.getElementById('availableProductsBody');
        const products = dataService.getProducts();
        
        console.log("Chargement des produits:", products);
        
        tbody.innerHTML = '';
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-3">
                        <i class="bi bi-box display-6 text-muted"></i>
                        <p class="mt-2">Aucun produit disponible</p>
                        <a href="products.html" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-plus-circle"></i> Ajouter des produits
                        </a>
                    </td>
                </tr>
            `;
            return;
        }
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${product.image || 'https://via.placeholder.com/50'}" 
                             class="rounded me-2" width="40" height="40">
                        <div>
                            <div class="fw-semibold">${product.name}</div>
                            <small class="text-muted">${product.category}</small>
                        </div>
                    </div>
                </td>
                <td class="fw-bold">€${parseFloat(product.price).toFixed(2)}</td>
                <td>
                    <span class="badge bg-${product.status === 'IN_STOCK' ? 'success' : product.status === 'LOW_STOCK' ? 'warning' : 'danger'}">
                        ${product.stock} unités
                    </span>
                </td>
                <td>
                    <input type="number" min="1" max="${product.stock}" value="1" 
                           class="form-control form-control-sm product-quantity-input" 
                           style="width: 80px;">
                </td>
                <td>
                    <button class="btn btn-sm btn-success add-product-btn" 
                            data-id="${product.id}"
                            data-name="${product.name}"
                            data-price="${product.price}"
                            data-stock="${product.stock}">
                        <i class="bi bi-plus"></i> Ajouter
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Ajouter les event listeners pour les boutons d'ajout
        tbody.querySelectorAll('.add-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                const id = button.dataset.id;
                const name = button.dataset.name;
                const price = parseFloat(button.dataset.price);
                const stock = parseInt(button.dataset.stock);
                const quantityInput = button.closest('tr').querySelector('.product-quantity-input');
                const quantity = parseInt(quantityInput.value);
                
                if (quantity < 1) {
                    this.showNotification('La quantité doit être au moins de 1', 'error');
                    return;
                }
                
                if (quantity > stock) {
                    this.showNotification(`Stock insuffisant. Disponible: ${stock} unités`, 'error');
                    return;
                }
                
                this.addProductToOrder(id, name, price, quantity);
                this.showNotification(`${name} ajouté à la commande`, 'success');
            });
        });
    }

    // ========== GESTION DES COMMANDES ==========

    createOrder(orderData) {
        try {
            const order = dataService.createOrder(orderData);
            this.showNotification('Commande créée avec succès!', 'success');
            this.loadOrders();
            this.updateStats();
            this.updateSidebarCounts();
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addOrderModal'));
            modal.hide();
            
            // Réinitialiser le formulaire
            document.getElementById('addOrderForm').reset();
            document.getElementById('selectedProductsBody').innerHTML = '';
            document.getElementById('orderTotal').textContent = '€0.00';
            
            return order;
        } catch (error) {
            this.showNotification('Erreur lors de la création de la commande: ' + error.message, 'error');
            console.error(error);
        }
    }

    updateOrder(id, orderData) {
        try {
            const order = dataService.updateOrder(id, orderData);
            this.showNotification('Commande mise à jour avec succès!', 'success');
            this.loadOrders();
            this.updateStats();
            return order;
        } catch (error) {
            this.showNotification('Erreur lors de la mise à jour', 'error');
            console.error(error);
        }
    }

    confirmDeleteOrder(orderId) {
        const order = dataService.getOrderById(orderId);
        if (!order) return;

        const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
        modal.show();

        document.getElementById('confirmDeleteBtn').onclick = () => {
            this.deleteOrder(orderId);
            modal.hide();
        };
    }

    deleteOrder(id) {
        const deleted = dataService.deleteOrder(id);
        if (deleted) {
            this.showNotification('Commande supprimée avec succès!', 'success');
            this.loadOrders();
            this.updateStats();
            this.updateSidebarCounts();
            this.selectedOrders.delete(id);
            this.updateBulkActions();
        } else {
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }

    // ========== GESTION DES PRODUITS DANS COMMANDE ==========

    addProductToOrder(productId, productName, productPrice, quantity) {
        const tbody = document.getElementById('selectedProductsBody');
        const existingRow = Array.from(tbody.rows).find(row => row.dataset.productId === productId);
        
        if (existingRow) {
            // Mettre à jour la quantité
            const quantityInput = existingRow.querySelector('.product-quantity');
            const newQuantity = parseInt(quantityInput.value) + quantity;
            quantityInput.value = newQuantity;
            this.updateProductRow(existingRow, productPrice, newQuantity);
        } else {
            // Ajouter une nouvelle ligne
            const row = document.createElement('tr');
            row.dataset.productId = productId;
            row.innerHTML = `
                <td>
                    <div class="fw-semibold">${productName}</div>
                </td>
                <td class="fw-bold">€${productPrice.toFixed(2)}</td>
                <td>
                    <input type="number" class="form-control form-control-sm product-quantity" 
                           value="${quantity}" min="1" style="width: 80px;">
                </td>
                <td class="product-subtotal fw-bold">€${(productPrice * quantity).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger remove-product-btn">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
            
            // Ajouter les event listeners
            const quantityInput = row.querySelector('.product-quantity');
            quantityInput.addEventListener('change', () => {
                this.updateProductRow(row, productPrice, parseInt(quantityInput.value));
            });
            
            row.querySelector('.remove-product-btn').addEventListener('click', () => {
                row.remove();
                this.updateOrderTotal();
                this.showNotification('Produit retiré de la commande', 'info');
            });
        }
        
        this.updateOrderTotal();
    }

    updateProductRow(row, price, quantity) {
        const subtotalCell = row.querySelector('.product-subtotal');
        subtotalCell.textContent = `€${(price * quantity).toFixed(2)}`;
        this.updateOrderTotal();
    }

    updateOrderTotal() {
        let total = 0;
        const rows = document.getElementById('selectedProductsBody').rows;
        
        Array.from(rows).forEach(row => {
            const subtotalText = row.querySelector('.product-subtotal').textContent;
            const subtotal = parseFloat(subtotalText.replace('€', ''));
            total += subtotal;
        });
        
        document.getElementById('orderTotal').textContent = `€${total.toFixed(2)}`;
    }

    // ========== PAGINATION ==========

    setupPagination(totalItems) {
        const container = document.getElementById('orderPaginationContainer');
        const pagination = document.getElementById('orderPagination');
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        pagination.innerHTML = '';
        
        // Bouton précédent
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadOrders();
            }
        });
        pagination.appendChild(prevLi);
        
        // Pages numérotées
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentPage = i;
                this.loadOrders();
            });
            pagination.appendChild(li);
        }
        
        // Bouton suivant
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.loadOrders();
            }
        });
        pagination.appendChild(nextLi);
    }

    // ========== MISE À JOUR STATISTIQUES ==========

    updateStats() {
        const orders = dataService.getOrders();
        
        const stats = {
            total: orders.length,
            pending: orders.filter(o => o.status === 'PENDING').length,
            processing: orders.filter(o => o.status === 'PROCESSING').length,
            completed: orders.filter(o => o.status === 'DELIVERED').length,
            cancelled: orders.filter(o => o.status === 'CANCELLED').length,
            revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
        };
        
        document.getElementById('totalOrdersCount').textContent = stats.total;
        document.getElementById('pendingOrdersCount').textContent = stats.pending;
        document.getElementById('processingOrdersCount').textContent = stats.processing;
        document.getElementById('completedOrdersCount').textContent = stats.completed;
        document.getElementById('cancelledOrdersCount').textContent = stats.cancelled;
        document.getElementById('totalRevenueOrders').textContent = `€${stats.revenue.toFixed(2)}`;
    }

    updateSidebarCounts() {
        const analytics = dataService.getAnalytics();
        document.getElementById('orderCountBadge').textContent = analytics.totalOrders;
        document.getElementById('userCountBadge').textContent = analytics.totalUsers;
        document.getElementById('productCountBadge').textContent = analytics.totalProducts;
    }

    updateUserInfo() {
        const user = dataService.getCurrentUser();
        if (user) {
            document.getElementById('currentUserName').textContent = `${user.firstName} ${user.lastName}`;
            document.getElementById('currentUserEmail').textContent = user.email;
            document.getElementById('currentUserAvatar').src = user.avatar;
            document.getElementById('dropdownUserName').textContent = user.firstName;
        }
    }

    // ========== GESTION DE LA SÉLECTION ==========

    toggleOrderSelection(orderId, isSelected) {
        if (isSelected) {
            this.selectedOrders.add(orderId);
        } else {
            this.selectedOrders.delete(orderId);
        }
        
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('orderBulkActions');
        const countSpan = document.getElementById('selectedOrdersCount');
        const selectAll = document.getElementById('selectAllOrders');
        
        if (this.selectedOrders.size > 0) {
            bulkActions.style.display = 'block';
            countSpan.textContent = this.selectedOrders.size;
        } else {
            bulkActions.style.display = 'none';
        }
        
        // Mettre à jour la case "Tout sélectionner"
        const totalCheckboxes = document.querySelectorAll('.order-checkbox').length;
        const checkedCheckboxes = document.querySelectorAll('.order-checkbox:checked').length;
        selectAll.checked = checkedCheckboxes === totalCheckboxes && totalCheckboxes > 0;
    }

    // ========== UTILITAIRES ==========

    getStatusColor(status) {
        const colors = {
            'PENDING': 'warning',
            'PROCESSING': 'info',
            'SHIPPED': 'primary',
            'DELIVERED': 'success',
            'CANCELLED': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            'PENDING': 'En attente',
            'PROCESSING': 'En traitement',
            'SHIPPED': 'Expédiée',
            'DELIVERED': 'Livrée',
            'CANCELLED': 'Annulée'
        };
        return texts[status] || status;
    }

    getPaymentStatusColor(status) {
        const colors = {
            'PENDING': 'warning',
            'PAID': 'success',
            'FAILED': 'danger',
            'REFUNDED': 'info'
        };
        return colors[status] || 'secondary';
    }

    getPaymentStatusText(status) {
        const texts = {
            'PENDING': 'En attente',
            'PAID': 'Payé',
            'FAILED': 'Échoué',
            'REFUNDED': 'Remboursé'
        };
        return texts[status] || status;
    }

    showNotification(message, type = 'info') {
        // Créer une notification toast
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.appendChild(toast);
        document.body.appendChild(container);
        
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            container.remove();
        });
    }

    // ========== EVENT LISTENERS ==========

    setupEventListeners() {
        // Recherche
        document.getElementById('orderSearch').addEventListener('input', () => {
            this.currentPage = 1;
            this.loadOrders();
        });

        // Filtres
        document.getElementById('applyOrderFilters').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadOrders();
        });

        // Réinitialiser les filtres
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.currentPage = 1;
            this.loadOrders();
        });
        document.getElementById('paymentFilter').addEventListener('change', () => {
            this.currentPage = 1;
            this.loadOrders();
        });

        // Sélection multiple
        document.getElementById('selectAllOrders').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.order-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                this.toggleOrderSelection(parseInt(cb.value), e.target.checked);
            });
        });

        // Création de commande
        document.getElementById('createOrderBtn').addEventListener('click', () => {
            this.createNewOrder();
        });

        // Actions groupées
        document.getElementById('bulkUpdateStatusBtn').addEventListener('click', () => {
            this.bulkUpdateStatus();
        });

        document.getElementById('bulkDeleteOrdersBtn').addEventListener('click', () => {
            this.bulkDeleteOrders();
        });

        // Export
        document.getElementById('exportOrdersBtn').addEventListener('click', () => {
            dataService.exportData();
            this.showNotification('Données exportées avec succès!', 'success');
        });

        // Données de test
        document.getElementById('generateTestOrdersBtn')?.addEventListener('click', () => {
            if (confirm('Générer des données de test pour les commandes ?')) {
                dataService.generateTestData();
                this.loadOrders();
                this.loadAvailableProducts();
                this.updateStats();
                this.updateSidebarCounts();
                this.showNotification('Données de test générées avec succès!', 'success');
            }
        });

        // Déconnexion
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('dropdownLogout')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Recherche de produits
        document.getElementById('productSearchInput')?.addEventListener('input', (e) => {
            this.filterAvailableProducts(e.target.value.toLowerCase());
        });

        // Rafraîchir les produits quand le modal s'ouvre
        const addOrderModal = document.getElementById('addOrderModal');
        if (addOrderModal) {
            addOrderModal.addEventListener('show.bs.modal', () => {
                this.loadAvailableProducts();
                document.getElementById('selectedProductsBody').innerHTML = '';
                document.getElementById('orderTotal').textContent = '€0.00';
            });
        }

        // Impression
        document.getElementById('printSelectedBtn')?.addEventListener('click', () => {
            if (this.selectedOrders.size === 0) {
                this.showNotification('Veuillez sélectionner au moins une commande', 'warning');
                return;
            }
            this.printSelectedOrders();
        });
    }

    createNewOrder() {
        const customerName = document.getElementById('customerName').value.trim();
        const customerEmail = document.getElementById('customerEmail').value.trim();
        const shippingAddress = document.getElementById('shippingAddress').value.trim();
        const selectedProducts = this.getSelectedProducts();
        
        // Validation
        if (!customerName) {
            this.showNotification('Veuillez entrer le nom du client', 'error');
            document.getElementById('customerName').focus();
            return;
        }
        
        if (!customerEmail || !this.isValidEmail(customerEmail)) {
            this.showNotification('Veuillez entrer un email valide', 'error');
            document.getElementById('customerEmail').focus();
            return;
        }
        
        if (!shippingAddress) {
            this.showNotification('Veuillez entrer l\'adresse de livraison', 'error');
            document.getElementById('shippingAddress').focus();
            return;
        }
        
        if (selectedProducts.length === 0) {
            this.showNotification('Veuillez sélectionner au moins un produit', 'error');
            return;
        }

        const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        
        const orderData = {
            userId: null,
            userName: customerName,
            userEmail: customerEmail,
            products: selectedProducts,
            totalAmount: totalAmount,
            shippingAddress: shippingAddress,
            status: document.querySelector('#addOrderForm select[name="status"]').value,
            paymentStatus: document.querySelector('#addOrderForm select[name="paymentStatus"]').value,
            paymentMethod: document.querySelector('#addOrderForm select[name="paymentMethod"]').value,
            notes: document.querySelector('#addOrderForm textarea[name="notes"]').value
        };

        this.createOrder(orderData);
    }

    getSelectedProducts() {
        const products = [];
        const rows = document.getElementById('selectedProductsBody').rows;
        
        Array.from(rows).forEach(row => {
            const name = row.cells[0].textContent;
            const price = parseFloat(row.cells[1].textContent.replace('€', ''));
            const quantity = parseInt(row.querySelector('.product-quantity').value);
            
            products.push({
                productId: parseInt(row.dataset.productId),
                name: name,
                price: price,
                quantity: quantity,
                subtotal: price * quantity
            });
        });
        
        return products;
    }

    filterAvailableProducts(query) {
        const rows = document.getElementById('availableProductsBody').rows;
        
        Array.from(rows).forEach(row => {
            const productName = row.cells[0].textContent.toLowerCase();
            const category = row.cells[0].querySelector('small')?.textContent.toLowerCase() || '';
            
            if (productName.includes(query) || category.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    viewOrder(orderId) {
        const order = dataService.getOrderById(orderId);
        if (!order) return;

        let productsHtml = '';
        if (order.products && order.products.length > 0) {
            order.products.forEach(product => {
                productsHtml += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <div>
                                    <div class="fw-semibold">${product.name}</div>
                                    <small class="text-muted">ID: ${product.productId}</small>
                                </div>
                            </div>
                        </td>
                        <td class="fw-bold">€${product.price.toFixed(2)}</td>
                        <td>${product.quantity}</td>
                        <td class="fw-bold">€${product.subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        const content = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="bi bi-receipt me-2"></i>Informations commande</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Numéro:</strong><br>${order.orderNumber}</p>
                                    <p><strong>Date création:</strong><br>${order.createdAt}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Statut:</strong><br>
                                        <span class="badge bg-${this.getStatusColor(order.status)}">
                                            ${this.getStatusText(order.status)}
                                        </span>
                                    </p>
                                    <p><strong>Paiement:</strong><br>
                                        <span class="badge bg-${this.getPaymentStatusColor(order.paymentStatus)}">
                                            ${this.getPaymentStatusText(order.paymentStatus)}
                                        </span>
                                    </p>
                                </div>
                                <div class="col-12">
                                    <p><strong>Total:</strong><br>
                                        <span class="display-6 text-primary">€${order.totalAmount.toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="bi bi-person me-2"></i>Informations client</h6>
                        </div>
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(order.userName)}&background=random&color=fff" 
                                     class="rounded-circle me-3" width="50" height="50">
                                <div>
                                    <h5 class="mb-1">${order.userName}</h5>
                                    <p class="text-muted mb-0">${order.userEmail}</p>
                                </div>
                            </div>
                            <p><strong>Adresse de livraison:</strong></p>
                            <div class="bg-light p-3 rounded">
                                ${order.shippingAddress.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="bi bi-cart me-2"></i>Produits commandés</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Produit</th>
                                            <th>Prix unitaire</th>
                                            <th>Quantité</th>
                                            <th>Sous-total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${productsHtml}
                                        <tr class="table-light">
                                            <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                                            <td><strong class="text-primary">€${order.totalAmount.toFixed(2)}</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                ${order.notes ? `
                <div class="col-12 mt-4">
                    <div class="card">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="bi bi-sticky me-2"></i>Notes</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-0">${order.notes}</p>
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;

        document.getElementById('viewOrderContent').innerHTML = content;
        const modal = new bootstrap.Modal(document.getElementById('viewOrderModal'));
        modal.show();
    }

    editOrder(orderId) {
        const order = dataService.getOrderById(orderId);
        if (!order) return;

        // Remplir le formulaire
        document.querySelector('#editOrderForm input[name="orderId"]').value = order.id;
        document.querySelector('#editOrderForm select[name="status"]').value = order.status;
        document.querySelector('#editOrderForm select[name="paymentStatus"]').value = order.paymentStatus;
        document.querySelector('#editOrderForm textarea[name="shippingAddress"]').value = order.shippingAddress;
        document.querySelector('#editOrderForm textarea[name="notes"]').value = order.notes || '';

        const modal = new bootstrap.Modal(document.getElementById('editOrderModal'));
        modal.show();

        // Gérer la soumission
        document.getElementById('editOrderForm').onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updates = {
                status: formData.get('status'),
                paymentStatus: formData.get('paymentStatus'),
                shippingAddress: formData.get('shippingAddress'),
                notes: formData.get('notes')
            };

            this.updateOrder(order.id, updates);
            modal.hide();
        };
    }

    bulkUpdateStatus() {
        const status = document.getElementById('bulkStatusSelect').value;
        if (!status || this.selectedOrders.size === 0) return;

        if (confirm(`Mettre à jour ${this.selectedOrders.size} commande(s) au statut "${this.getStatusText(status)}" ?`)) {
            const orders = dataService.getOrders();
            let updatedCount = 0;
            
            orders.forEach(order => {
                if (this.selectedOrders.has(order.id)) {
                    this.updateOrder(order.id, { status: status });
                    updatedCount++;
                }
            });
            
            this.showNotification(`${updatedCount} commande(s) mises à jour`, 'success');
            this.selectedOrders.clear();
            this.updateBulkActions();
        }
    }

    bulkDeleteOrders() {
        if (this.selectedOrders.size === 0) return;

        if (confirm(`Supprimer ${this.selectedOrders.size} commande(s) ? Cette action est irréversible.`)) {
            const orders = dataService.getOrders();
            let deletedCount = 0;
            
            orders.forEach(order => {
                if (this.selectedOrders.has(order.id)) {
                    dataService.deleteOrder(order.id);
                    deletedCount++;
                }
            });
            
            this.showNotification(`${deletedCount} commande(s) supprimée(s)`, 'success');
            this.selectedOrders.clear();
            this.loadOrders();
            this.updateStats();
            this.updateSidebarCounts();
        }
    }

    printSelectedOrders() {
        if (this.selectedOrders.size === 0) return;
        
        const orders = dataService.getOrders().filter(order => this.selectedOrders.has(order.id));
        
        let printContent = `
            <html>
            <head>
                <title>Commandes sélectionnées</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; }
                    .total { font-weight: bold; color: #2c3e50; }
                </style>
            </head>
            <body>
                <h1>Commandes sélectionnées</h1>
                <p>Date d'impression: ${new Date().toLocaleDateString()}</p>
                <p>Nombre de commandes: ${orders.length}</p>
        `;
        
        orders.forEach(order => {
            printContent += `
                <h3>${order.orderNumber} - ${order.userName}</h3>
                <p>Date: ${order.createdAt} | Statut: ${this.getStatusText(order.status)}</p>
                <p>Total: €${order.totalAmount.toFixed(2)}</p>
                <hr>
            `;
        });
        
        printContent += `</body></html>`;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    logout() {
        dataService.logout();
        window.location.href = 'login.html';
    }
}

// Initialiser lorsque la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.orderManager = new OrderManager();
});