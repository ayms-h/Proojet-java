// auth.js - Authentification COMPLÈTE
class AuthService {
    constructor() {
        this.dataService = dataService;
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.setupListeners();
    }
    
    checkAuth() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('login.html') || currentPath.endsWith('login.html');
        
        if (this.dataService.isAuthenticated()) {
            // Utilisateur connecté
            const user = this.dataService.getCurrentUser();
            this.updateUI(user);
            
            // Si sur page login, rediriger vers dashboard
            if (isLoginPage) {
                window.location.href = 'index.html';
            }
        } else {
            // Utilisateur non connecté
            // Si pas sur login, rediriger vers login
            if (!isLoginPage) {
                window.location.href = 'login.html';
            }
        }
    }
    
    setupListeners() {
        // Formulaire de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Boutons de logout
        const logoutBtns = document.querySelectorAll('#logoutBtn, #dropdownLogout, .logout-btn');
        logoutBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }
    
    handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const username = form.querySelector('#username').value;
        const password = form.querySelector('#password').value;
        
        const user = this.dataService.login(username, password);
        
        if (user) {
            // Succès
            this.showMessage('Connexion réussie !', 'success');
            
            // Redirection après 1 seconde
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // Échec
            this.showMessage('Identifiants incorrects', 'error');
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
    }
    
    logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            this.dataService.logout();
            window.location.href = 'login.html';
        }
    }
    
    updateUI(user) {
        // Mettre à jour le nom d'utilisateur partout
        document.querySelectorAll('.username-display, #dropdownUserName, #currentUserName').forEach(el => {
            if (el) el.textContent = user.username;
        });
        
        // Mettre à jour le nom complet
        document.querySelectorAll('.user-fullname').forEach(el => {
            if (el) el.textContent = `${user.firstName} ${user.lastName}`;
        });
        
        // Mettre à jour l'email
        document.querySelectorAll('.user-email, #currentUserEmail').forEach(el => {
            if (el) el.textContent = user.email;
        });
        
        // Mettre à jour l'avatar
        document.querySelectorAll('.user-avatar, #currentUserAvatar').forEach(el => {
            if (el && user.avatar) el.src = user.avatar;
        });
        
        // Mettre à jour le rôle
        document.querySelectorAll('.user-role').forEach(el => {
            if (el) {
                el.textContent = user.role;
                el.className = `user-role badge ${this.getRoleClass(user.role)}`;
            }
        });
        
        // Gérer les permissions
        this.applyPermissions(user.role);
    }
    
    applyPermissions(role) {
        // Cacher/montrer les éléments selon le rôle
        const adminOnly = document.querySelectorAll('.admin-only');
        const managerOnly = document.querySelectorAll('.manager-only');
        const editorOnly = document.querySelectorAll('.editor-only');
        
        adminOnly.forEach(el => el.style.display = role === 'ADMIN' ? '' : 'none');
        managerOnly.forEach(el => el.style.display = ['ADMIN', 'MANAGER'].includes(role) ? '' : 'none');
        editorOnly.forEach(el => el.style.display = ['ADMIN', 'MANAGER', 'EDITOR'].includes(role) ? '' : 'none');
    }
    
    getRoleClass(role) {
        switch(role) {
            case 'ADMIN': return 'bg-danger';
            case 'MANAGER': return 'bg-warning';
            case 'EDITOR': return 'bg-info';
            default: return 'bg-secondary';
        }
    }
    
    showMessage(message, type) {
        // Créer une alerte temporaire
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
    
    // Vérifier les permissions
    hasPermission(requiredRole) {
        const user = this.dataService.getCurrentUser();
        if (!user) return false;
        
        const hierarchy = {
            'ADMIN': ['ADMIN', 'MANAGER', 'EDITOR', 'USER'],
            'MANAGER': ['MANAGER', 'EDITOR', 'USER'],
            'EDITOR': ['EDITOR', 'USER'],
            'USER': ['USER']
        };
        
        return hierarchy[user.role]?.includes(requiredRole) || false;
    }
    
    // Protéger une page
    protectPage(requiredRole = 'USER') {
        const user = this.dataService.getCurrentUser();
        
        if (!user) {
            window.location.href = 'login.html';
            return false;
        }
        
        if (!this.hasPermission(requiredRole)) {
            alert('Accès non autorisé !');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }
}

// Initialiser l'authentification
const authService = new AuthService();