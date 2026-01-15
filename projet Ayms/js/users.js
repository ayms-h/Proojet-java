// users.js - Gestion COMPLÈTE des utilisateurs
class UsersManager {
    constructor() {
        this.dataService = dataService;
        this.authService = authService;
        this.selectedUsers = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilters = {};
        this.init();
    }
    
    init() {
        // Vérifier l'authentification
        if (!this.authService.protectPage('ADMIN')) return;
        
        // Charger les données
        this.loadUsers();
        this.setupEventListeners();
        this.setupFilters();
        
        // Gérer la recherche depuis l'URL
        this.handleUrlSearch();
    }
    
    loadUsers() {
        let users = this.dataService.getUsers();
        
        // Appliquer les filtres
        users = this.applyFilters(users);
        
        // Appliquer la recherche
        const searchInput = document.getElementById('userSearch');
        if (searchInput && searchInput.value.trim()) {
            users = this.dataService.searchUsers(searchInput.value.trim());
        }
        
        // Trier par date de création (plus récent d'abord)
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Afficher les utilisateurs
        this.displayUsers(users);
        this.updatePagination(users.length);
        this.updateStats(users);
    }
    
    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        // Calculer la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedUsers = users.slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        if (paginatedUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="bi bi-people display-4 text-muted"></i>
                        <p class="mt-3">Aucun utilisateur trouvé</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        paginatedUsers.forEach(user => {
            const row = this.createUserRow(user);
            tbody.appendChild(row);
        });
    }
    
    createUserRow(user) {
        const row = document.createElement('tr');
        row.dataset.userId = user.id;
        row.innerHTML = `
            <td>
                <input type="checkbox" class="user-select" 
                       data-user-id="${user.id}"
                       ${user.username === 'admin' ? 'disabled' : ''}
                       ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${user.avatar}" 
                         class="rounded-circle me-2" 
                         width="40" height="40" 
                         alt="${user.username}">
                    <div>
                        <strong>${user.firstName} ${user.lastName}</strong>
                        <div class="text-muted small">@${user.username}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge ${this.getRoleClass(user.role)}">
                    ${user.role}
                </span>
            </td>
            <td>
                <span class="badge ${this.getStatusClass(user.status)}">
                    ${user.status}
                </span>
            </td>
            <td>${this.formatDate(user.createdAt)}</td>
            <td>${user.lastLogin ? this.formatDate(user.lastLogin) : 'Jamais'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary view-user" 
                            data-user-id="${user.id}"
                            title="Voir">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success edit-user" 
                            data-user-id="${user.id}"
                            ${user.username === 'admin' ? 'disabled' : ''}
                            title="Éditer">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-user" 
                            data-user-id="${user.id}"
                            ${user.username === 'admin' ? 'disabled' : ''}
                            title="Supprimer">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    getRoleClass(role) {
        const classes = {
            'ADMIN': 'bg-danger',
            'MANAGER': 'bg-warning',
            'EDITOR': 'bg-info',
            'USER': 'bg-secondary'
        };
        return classes[role] || 'bg-light text-dark';
    }
    
    getStatusClass(status) {
        const classes = {
            'ACTIVE': 'bg-success',
            'INACTIVE': 'bg-secondary',
            'SUSPENDED': 'bg-danger'
        };
        return classes[status] || 'bg-light text-dark';
    }
    
    setupEventListeners() {
        // Sélection multiple
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('user-select')) {
                this.handleUserSelect(e.target);
            }
            if (e.target.id === 'selectAllUsers') {
                this.handleSelectAll(e.target.checked);
            }
        });
        
        // Actions sur les utilisateurs
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-user')) {
                this.viewUser(e.target.closest('.view-user').dataset.userId);
            }
            if (e.target.closest('.edit-user')) {
                this.editUser(e.target.closest('.edit-user').dataset.userId);
            }
            if (e.target.closest('.delete-user')) {
                this.deleteUser(e.target.closest('.delete-user').dataset.userId);
            }
        });
        
        // Formulaire d'ajout
        const addForm = document.getElementById('addUserForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddUser(e));
        }
        
        // Formulaire d'édition
        const editForm = document.getElementById('editUserForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditUser(e));
        }
        
        // Actions en masse
        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => this.bulkDelete());
        document.getElementById('bulkActivateBtn')?.addEventListener('click', () => this.bulkUpdateStatus('ACTIVE'));
        document.getElementById('bulkDeactivateBtn')?.addEventListener('click', () => this.bulkUpdateStatus('INACTIVE'));
        
        // Recherche
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentPage = 1;
                this.loadUsers();
            });
        }
        
        // Export/Import
        document.getElementById('exportUsersBtn')?.addEventListener('click', () => this.exportUsers());
        document.getElementById('importUsersBtn')?.addEventListener('click', () => this.showImportDialog());
        
        // Bouton d'ajout
        document.getElementById('addUserBtn')?.addEventListener('click', () => {
            this.showAddModal();
        });
    }
    
    handleUrlSearch() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        
        if (searchQuery) {
            const searchInput = document.getElementById('userSearch');
            if (searchInput) {
                searchInput.value = searchQuery;
                this.loadUsers();
            }
        }
    }
    
    setupFilters() {
        const applyBtn = document.getElementById('applyFiltersBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.currentPage = 1;
                this.currentFilters = {
                    role: document.getElementById('roleFilter')?.value,
                    status: document.getElementById('statusFilter')?.value,
                    date: document.getElementById('dateFilter')?.value
                };
                this.loadUsers();
            });
        }
    }
    
    applyFilters(users) {
        const { role, status, date } = this.currentFilters;
        
        let filtered = users;
        
        if (role) {
            filtered = filtered.filter(user => user.role === role);
        }
        
        if (status) {
            filtered = filtered.filter(user => user.status === status);
        }
        
        if (date) {
            filtered = filtered.filter(user => user.createdAt === date);
        }
        
        return filtered;
    }
    
    // ========== CRUD OPERATIONS ==========
    
    handleAddUser(event) {
        event.preventDefault();
        const form = event.target;
        
        const userData = {
            username: form.username.value,
            password: form.password.value,
            email: form.email.value,
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            role: form.role.value,
            status: form.status.value
        };
        
        // Validation
        if (!this.validateUserData(userData)) return;
        
        // Vérifier si l'username existe déjà
        if (this.dataService.getUserByUsername(userData.username)) {
            this.showAlert('Cet nom d\'utilisateur existe déjà !', 'error');
            return;
        }
        
        // Créer l'utilisateur
        const newUser = this.dataService.addUser(userData);
        if (newUser) {
            this.showAlert('Utilisateur créé avec succès !', 'success');
            this.loadUsers();
            this.hideModal('addUserModal');
            form.reset();
        }
    }
    
    handleEditUser(event) {
        event.preventDefault();
        const form = event.target;
        const userId = form.dataset.userId;
        
        const userData = {
            email: form.email.value,
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            role: form.role.value,
            status: form.status.value
        };
        
        // Ne pas mettre à jour le mot de passe s'il est vide
        if (form.password.value) {
            userData.password = form.password.value;
        }
        
        const updatedUser = this.dataService.updateUser(userId, userData);
        if (updatedUser) {
            this.showAlert('Utilisateur mis à jour avec succès !', 'success');
            this.loadUsers();
            this.hideModal('editUserModal');
        }
    }
    
    viewUser(userId) {
        const user = this.dataService.getUserById(userId);
        if (!user) return;
        
        // Créer un modal de visualisation
        const modalHTML = `
            <div class="modal fade" id="viewUserModal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Détails de l'utilisateur</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-4">
                                <img src="${user.avatar}" 
                                     class="rounded-circle" 
                                     width="100" height="100"
                                     alt="${user.username}">
                                <h4 class="mt-3">${user.firstName} ${user.lastName}</h4>
                                <p class="text-muted">@${user.username}</p>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Email:</strong><br>${user.email}</p>
                                    <p><strong>Rôle:</strong><br>
                                        <span class="badge ${this.getRoleClass(user.role)}">
                                            ${user.role}
                                        </span>
                                    </p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Statut:</strong><br>
                                        <span class="badge ${this.getStatusClass(user.status)}">
                                            ${user.status}
                                        </span>
                                    </p>
                                    <p><strong>Inscrit le:</strong><br>${this.formatDate(user.createdAt)}</p>
                                    <p><strong>Dernière connexion:</strong><br>${user.lastLogin ? this.formatDate(user.lastLogin) : 'Jamais'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Injecter et afficher le modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
        modal.show();
        
        // Nettoyer après fermeture
        document.getElementById('viewUserModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    editUser(userId) {
        const user = this.dataService.getUserById(userId);
        if (!user) return;
        
        // Remplir le formulaire d'édition
        const form = document.getElementById('editUserForm');
        form.dataset.userId = userId;
        
        form.querySelector('[name="username"]').value = user.username;
        form.querySelector('[name="email"]').value = user.email;
        form.querySelector('[name="firstName"]').value = user.firstName;
        form.querySelector('[name="lastName"]').value = user.lastName;
        form.querySelector('[name="role"]').value = user.role;
        form.querySelector('[name="status"]').value = user.status;
        form.querySelector('[name="password"]').value = '';
        
        // Afficher le modal
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    }
    
    deleteUser(userId) {
        const user = this.dataService.getUserById(userId);
        if (!user || user.username === 'admin') {
            this.showAlert('Impossible de supprimer cet utilisateur !', 'error');
            return;
        }
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.username}" ?`)) {
            const deleted = this.dataService.deleteUser(userId);
            if (deleted) {
                this.showAlert('Utilisateur supprimé avec succès !', 'success');
                this.loadUsers();
            }
        }
    }
    
    // ========== BULK OPERATIONS ==========
    
    handleUserSelect(checkbox) {
        const userId = parseInt(checkbox.dataset.userId);
        
        if (checkbox.checked) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }
        
        this.updateBulkActions();
        this.updateSelectedCount();
    }
    
    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.user-select:not(:disabled)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.handleUserSelect(checkbox);
        });
    }
    
    bulkDelete() {
        if (this.selectedUsers.size === 0) {
            this.showAlert('Sélectionnez des utilisateurs à supprimer !', 'error');
            return;
        }
        
        if (confirm(`Supprimer ${this.selectedUsers.size} utilisateur(s) ?`)) {
            let deletedCount = 0;
            this.selectedUsers.forEach(id => {
                if (this.dataService.deleteUser(id)) {
                    deletedCount++;
                }
            });
            
            this.showAlert(`${deletedCount} utilisateur(s) supprimé(s) !`, 'success');
            this.selectedUsers.clear();
            this.loadUsers();
        }
    }
    
    bulkUpdateStatus(status) {
        if (this.selectedUsers.size === 0) {
            this.showAlert('Sélectionnez des utilisateurs !', 'error');
            return;
        }
        
        const updates = { status: status };
        let updatedCount = 0;
        
        this.selectedUsers.forEach(id => {
            if (this.dataService.updateUser(id, updates)) {
                updatedCount++;
            }
        });
        
        this.showAlert(`${updatedCount} utilisateur(s) mis à jour !`, 'success');
        this.selectedUsers.clear();
        this.loadUsers();
    }
    
    updateBulkActions() {
        const hasSelection = this.selectedUsers.size > 0;
        const bulkActions = document.getElementById('bulkActionsBar');
        
        if (bulkActions) {
            bulkActions.style.display = hasSelection ? 'flex' : 'none';
        }
        
        // Activer/désactiver les boutons
        document.querySelectorAll('.bulk-action-btn').forEach(btn => {
            btn.disabled = !hasSelection;
        });
    }
    
    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedUsers.size;
        }
    }
    
    // ========== PAGINATION ==========
    
    updatePagination(totalItems) {
        const container = document.getElementById('pagination');
        if (!container) return;
        
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        container.innerHTML = '';
        
        // Bouton précédent
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        `;
        container.appendChild(prevLi);
        
        // Pages
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            container.appendChild(li);
        }
        
        // Bouton suivant
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        `;
        container.appendChild(nextLi);
        
        // Gérer les clics sur la pagination
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.closest('.page-link').dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadUsers();
                }
            });
        });
    }
    
    // ========== IMPORT/EXPORT ==========
    
    exportUsers() {
        const users = this.dataService.getUsers();
        const exportData = {
            users: users,
            exportedAt: new Date().toISOString(),
            count: users.length
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        this.downloadFile(dataStr, 'users-export.json', 'application/json');
    }
    
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => this.importUsers(e.target.files[0]);
        input.click();
    }
    
    async importUsers(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.users || !Array.isArray(importData.users)) {
                throw new Error('Format de fichier invalide');
            }
            
            let importedCount = 0;
            let skippedCount = 0;
            
            importData.users.forEach(userData => {
                // Vérifier si l'utilisateur existe déjà
                if (this.dataService.getUserByUsername(userData.username)) {
                    skippedCount++;
                    return;
                }
                
                // Créer l'utilisateur
                this.dataService.addUser(userData);
                importedCount++;
            });
            
            this.showAlert(`${importedCount} utilisateur(s) importé(s), ${skippedCount} ignoré(s)`, 'success');
            this.loadUsers();
            
        } catch (error) {
            this.showAlert('Erreur lors de l\'importation: ' + error.message, 'error');
        }
    }
    
    // ========== UTILITAIRES ==========
    
    validateUserData(userData) {
        if (!userData.username || userData.username.length < 3) {
            this.showAlert('Le nom d\'utilisateur doit faire au moins 3 caractères', 'error');
            return false;
        }
        
        if (!userData.password || userData.password.length < 6) {
            this.showAlert('Le mot de passe doit faire au moins 6 caractères', 'error');
            return false;
        }
        
        if (!userData.email || !this.isValidEmail(userData.email)) {
            this.showAlert('Adresse email invalide', 'error');
            return false;
        }
        
        return true;
    }
    
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    showAddModal() {
        const form = document.getElementById('addUserForm');
        form.reset();
        
        // Générer un mot de passe aléatoire
        form.querySelector('[name="password"]').value = this.generatePassword();
        form.querySelector('[name="confirmPassword"]').value = form.querySelector('[name="password"]').value;
        
        const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
        modal.show();
    }
    
    generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    
    hideModal(modalId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) modal.hide();
    }
    
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    }
    
    updateStats(users) {
        const stats = {
            total: users.length,
            active: users.filter(u => u.status === 'ACTIVE').length,
            admins: users.filter(u => u.role === 'ADMIN').length,
            managers: users.filter(u => u.role === 'MANAGER').length,
            editors: users.filter(u => u.role === 'EDITOR').length,
            regular: users.filter(u => u.role === 'USER').length
        };
        
        // Mettre à jour les éléments de stats si présents
        const statsElements = {
            'totalUsers': stats.total,
            'activeUsers': stats.active,
            'adminUsers': stats.admins,
            'managerUsers': stats.managers
        };
        
        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    showAlert(message, type = 'info') {
        // Utiliser la fonction showToast du main.js si disponible
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialiser le gestionnaire d'utilisateurs
let usersManager;
document.addEventListener('DOMContentLoaded', () => {
    usersManager = new UsersManager();
});