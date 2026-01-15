// dataService.js - Service central pour gérer toutes les données
class DataService {
    constructor() {
        this.initData();
        this.currentUser = this.getStoredUser();
    }
    
    initData() {
        const storedData = localStorage.getItem('backofficeData');
        if (storedData) {
            this.data = JSON.parse(storedData);
        } else {
            this.data = this.getDefaultData();
            this.saveData();
        }
    }
    
    getDefaultData() {
        return {
            users: [
                {
                    id: 1,
                    username: "admin",
                    password: "admin123",
                    email: "admin@backoffice.com",
                    firstName: "Admin",
                    lastName: "System",
                    role: "ADMIN",
                    status: "ACTIVE",
                    avatar: "https://ui-avatars.com/api/?name=Admin+System&background=3498db&color=fff",
                    createdAt: "2024-01-01",
                    lastLogin: new Date().toISOString().split('T')[0]
                }
            ],
            products: [],
            orders: [],
            categories: [
                { id: 1, name: "Électronique", productCount: 0 },
                { id: 2, name: "Informatique", productCount: 0 },
                { id: 3, name: "Vêtements", productCount: 0 },
                { id: 4, name: "Livres", productCount: 0 },
                { id: 5, name: "Maison", productCount: 0 }
            ],
            settings: {
                siteName: "Backoffice Admin",
                currency: "EUR",
                dateFormat: "DD/MM/YYYY",
                timezone: "Europe/Paris",
                maintenance: false
            },
            analytics: {
                totalUsers: 1,
                totalProducts: 0,
                totalOrders: 0,
                totalRevenue: 0,
                monthlyGrowth: 0
            }
        };
    }
    
    saveData() {
        localStorage.setItem('backofficeData', JSON.stringify(this.data));
    }
    
    // ========== USERS CRUD ==========
    getUsers() {
        return this.data.users;
    }
    
    getUserById(id) {
        return this.data.users.find(u => u.id === parseInt(id));
    }
    
    getUserByUsername(username) {
        return this.data.users.find(u => u.username === username);
    }
    
    createUser(userData) {
        const newId = this.generateId('users');
        const user = {
            id: newId,
            ...userData,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstName + ' ' + userData.lastName)}&background=random`,
            createdAt: new Date().toISOString().split('T')[0],
            lastLogin: null,
            status: userData.status || "ACTIVE"
        };
        
        this.data.users.push(user);
        this.data.analytics.totalUsers++;
        this.saveData();
        return user;
    }
    
    updateUser(id, userData) {
        const index = this.data.users.findIndex(u => u.id === parseInt(id));
        if (index !== -1) {
            this.data.users[index] = { ...this.data.users[index], ...userData };
            this.saveData();
            return this.data.users[index];
        }
        return null;
    }
    
    deleteUser(id) {
        const index = this.data.users.findIndex(u => u.id === parseInt(id));
        if (index !== -1 && this.data.users[index].username !== 'admin') {
            const deleted = this.data.users.splice(index, 1)[0];
            this.data.analytics.totalUsers--;
            this.saveData();
            return deleted;
        }
        return null;
    }
    
    // ========== PRODUCTS CRUD ==========
    getProducts() {
        return this.data.products;
    }
    
    getProductById(id) {
        return this.data.products.find(p => p.id === parseInt(id));
    }
    
    getProductsByCategory(category) {
        return this.data.products.filter(p => p.category === category);
    }
    
    createProduct(productData) {
        const newId = this.generateId('products');
        const product = {
            id: newId,
            ...productData,
            price: parseFloat(productData.price),
            stock: parseInt(productData.stock),
            status: this.getStockStatus(productData.stock),
            image: productData.image || `https://via.placeholder.com/300x200/random/ffffff?text=${encodeURIComponent(productData.name.substring(0, 20))}`,
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        this.data.products.push(product);
        this.updateCategoryCount(product.category);
        this.data.analytics.totalProducts++;
        this.saveData();
        return product;
    }
    
    updateProduct(id, productData) {
        const index = this.data.products.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            const oldCategory = this.data.products[index].category;
            const newCategory = productData.category;
            
            this.data.products[index] = {
                ...this.data.products[index],
                ...productData,
                price: parseFloat(productData.price),
                stock: parseInt(productData.stock),
                status: this.getStockStatus(productData.stock)
            };
            
            if (oldCategory !== newCategory) {
                this.updateCategoryCount(oldCategory, -1);
                this.updateCategoryCount(newCategory, 1);
            }
            
            this.saveData();
            return this.data.products[index];
        }
        return null;
    }
    
    deleteProduct(id) {
        const index = this.data.products.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            const product = this.data.products[index];
            this.data.products.splice(index, 1);
            
            this.updateCategoryCount(product.category, -1);
            this.data.analytics.totalProducts--;
            this.saveData();
            return product;
        }
        return null;
    }
    
    // ========== ORDERS CRUD ==========
    getOrders() {
        return this.data.orders;
    }
    
    getOrderById(id) {
        return this.data.orders.find(o => o.id === parseInt(id));
    }
    
    getOrdersByUser(userId) {
        return this.data.orders.filter(o => o.userId === parseInt(userId));
    }
    
    createOrder(orderData) {
        const newId = this.generateId('orders');
        const order = {
            id: newId,
            orderNumber: `ORD-${String(newId).padStart(3, '0')}`,
            ...orderData,
            totalAmount: parseFloat(orderData.totalAmount),
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0]
        };
        
        this.data.orders.push(order);
        this.data.analytics.totalOrders++;
        this.data.analytics.totalRevenue += order.totalAmount;
        this.saveData();
        return order;
    }
    
    updateOrder(id, orderData) {
        const index = this.data.orders.findIndex(o => o.id === parseInt(id));
        if (index !== -1) {
            const oldAmount = this.data.orders[index].totalAmount;
            const newAmount = parseFloat(orderData.totalAmount);
            
            this.data.orders[index] = {
                ...this.data.orders[index],
                ...orderData,
                totalAmount: newAmount,
                updatedAt: new Date().toISOString().split('T')[0]
            };
            
            // Mettre à jour le revenue total
            this.data.analytics.totalRevenue = this.data.analytics.totalRevenue - oldAmount + newAmount;
            this.saveData();
            return this.data.orders[index];
        }
        return null;
    }
    
    deleteOrder(id) {
        const index = this.data.orders.findIndex(o => o.id === parseInt(id));
        if (index !== -1) {
            const order = this.data.orders[index];
            this.data.orders.splice(index, 1);
            
            this.data.analytics.totalOrders--;
            this.data.analytics.totalRevenue -= order.totalAmount;
            this.saveData();
            return order;
        }
        return null;
    }
    
    // ========== CATEGORIES CRUD ==========
    getCategories() {
        return this.data.categories;
    }
    
    createCategory(categoryData) {
        const newId = this.generateId('categories');
        const category = {
            id: newId,
            ...categoryData,
            productCount: 0
        };
        
        this.data.categories.push(category);
        this.saveData();
        return category;
    }
    
    updateCategory(id, categoryData) {
        const index = this.data.categories.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
            this.data.categories[index] = { ...this.data.categories[index], ...categoryData };
            this.saveData();
            return this.data.categories[index];
        }
        return null;
    }
    
    deleteCategory(id) {
        const index = this.data.categories.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
            const category = this.data.categories[index];
            
            // Déplacer les produits de cette catégorie vers "Non catégorisé"
            this.data.products.forEach(product => {
                if (product.category === category.name) {
                    product.category = "Non catégorisé";
                }
            });
            
            this.data.categories.splice(index, 1);
            this.saveData();
            return category;
        }
        return null;
    }
    
    // ========== SETTINGS ==========
    getSettings() {
        return this.data.settings;
    }
    
    updateSettings(settingsData) {
        this.data.settings = { ...this.data.settings, ...settingsData };
        this.saveData();
        return this.data.settings;
    }
    
    // ========== AUTHENTICATION ==========
    login(username, password) {
        const user = this.getUserByUsername(username);
        if (user && user.password === password && user.status === "ACTIVE") {
            user.lastLogin = new Date().toISOString().split('T')[0];
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.saveData();
            return user;
        }
        return null;
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }
    
    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        }
        return this.currentUser;
    }
    
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }
    
    getStoredUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }
    
    // ========== ANALYTICS ==========
    getAnalytics() {
        return this.data.analytics;
    }
    
    updateAnalytics(analyticsData) {
        this.data.analytics = { ...this.data.analytics, ...analyticsData };
        this.saveData();
        return this.data.analytics;
    }
    
    // ========== UTILITY METHODS ==========
    generateId(collection) {
        if (this.data[collection].length === 0) return 1;
        return Math.max(...this.data[collection].map(item => item.id)) + 1;
    }
    
    getStockStatus(stock) {
        const stockNum = parseInt(stock);
        if (stockNum > 20) return "IN_STOCK";
        if (stockNum > 0) return "LOW_STOCK";
        return "OUT_OF_STOCK";
    }
    
    updateCategoryCount(categoryName, change = 1) {
        const category = this.data.categories.find(c => c.name === categoryName);
        if (category) {
            category.productCount = Math.max(0, (category.productCount || 0) + change);
        }
    }
    
    // ========== SEARCH ==========
    searchUsers(query) {
        const q = query.toLowerCase();
        return this.data.users.filter(user => 
            user.username.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.firstName.toLowerCase().includes(q) ||
            user.lastName.toLowerCase().includes(q)
        );
    }
    
    searchProducts(query) {
        const q = query.toLowerCase();
        return this.data.products.filter(product => 
            product.name.toLowerCase().includes(q) ||
            product.description.toLowerCase().includes(q) ||
            product.category.toLowerCase().includes(q)
        );
    }
    
    searchOrders(query) {
        const q = query.toLowerCase();
        return this.data.orders.filter(order => 
            order.orderNumber.toLowerCase().includes(q) ||
            order.userName.toLowerCase().includes(q) ||
            order.userEmail.toLowerCase().includes(q)
        );
    }
    
    // ========== DATA IMPORT/EXPORT ==========
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backoffice-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    this.data = importedData;
                    this.saveData();
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsText(file);
        });
    }
    
    // ========== TEST DATA GENERATION ==========
    generateTestData() {
        // Générer des utilisateurs
        for (let i = 1; i <= 10; i++) {
            this.createUser({
                username: `user${i}`,
                password: `pass${i}`,
                email: `user${i}@example.com`,
                firstName: `Prénom${i}`,
                lastName: `Nom${i}`,
                role: i === 1 ? "ADMIN" : i <= 3 ? "MANAGER" : i <= 6 ? "EDITOR" : "USER",
                status: Math.random() > 0.1 ? "ACTIVE" : "INACTIVE"
            });
        }
        
        // Générer des produits
        const categories = ["Électronique", "Informatique", "Vêtements", "Livres", "Maison"];
        const products = [
            "Smartphone", "Laptop", "Tablette", "Casque", "Montre",
            "T-shirt", "Jean", "Chaussures", "Veste", "Robe",
            "Livre", "Cahier", "Stylo", "Bureau", "Chaise"
        ];
        
        for (let i = 1; i <= 20; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            this.createProduct({
                name: `${products[Math.floor(Math.random() * products.length)]} Modèle ${i}`,
                description: `Description détaillée du produit ${i}`,
                category: category,
                price: (Math.random() * 1000 + 10).toFixed(2),
                stock: Math.floor(Math.random() * 100)
            });
        }
        
        // Générer des commandes
        for (let i = 1; i <= 15; i++) {
            const user = this.data.users[Math.floor(Math.random() * this.data.users.length)];
            const productCount = Math.floor(Math.random() * 3) + 1;
            const orderProducts = [];
            let total = 0;
            
            for (let j = 0; j < productCount; j++) {
                const product = this.data.products[Math.floor(Math.random() * this.data.products.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                const subtotal = product.price * quantity;
                
                orderProducts.push({
                    productId: product.id,
                    name: product.name,
                    quantity: quantity,
                    price: product.price,
                    subtotal: subtotal
                });
                
                total += subtotal;
            }
            
            const statuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
            const payments = ["PENDING", "PAID", "FAILED", "REFUNDED"];
            
            this.createOrder({
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                userEmail: user.email,
                products: orderProducts,
                totalAmount: total.toFixed(2),
                status: statuses[Math.floor(Math.random() * statuses.length)],
                paymentStatus: payments[Math.floor(Math.random() * payments.length)],
                shippingAddress: `${Math.floor(Math.random() * 1000)} Rue de Test, ${75000 + Math.floor(Math.random() * 20)} Paris`,
                notes: `Commande test ${i}`
            });
        }
        
        // Mettre à jour les statistiques
        this.updateAnalytics({
            totalUsers: this.data.users.length,
            totalProducts: this.data.products.length,
            totalOrders: this.data.orders.length,
            totalRevenue: this.data.orders.reduce((sum, order) => sum + order.totalAmount, 0),
            monthlyGrowth: 12.5
        });
        
        alert("Données de test générées avec succès !");
        return true;
    }
    
    // ========== BULK OPERATIONS ==========
    bulkDeleteUsers(ids) {
        let deletedCount = 0;
        ids.forEach(id => {
            if (this.deleteUser(id)) {
                deletedCount++;
            }
        });
        return deletedCount;
    }
    
    bulkUpdateUsers(ids, updates) {
        let updatedCount = 0;
        ids.forEach(id => {
            if (this.updateUser(id, updates)) {
                updatedCount++;
            }
        });
        return updatedCount;
    }
    
    // ========== STATISTICS ==========
    getDashboardStats() {
        return {
            users: this.data.users.length,
            products: this.data.products.length,
            orders: this.data.orders.length,
            revenue: this.data.analytics.totalRevenue,
            pendingOrders: this.data.orders.filter(o => o.status === "PENDING").length,
            lowStockProducts: this.data.products.filter(p => p.status === "LOW_STOCK").length,
            outOfStockProducts: this.data.products.filter(p => p.status === "OUT_OF_STOCK").length
        };
    }
    
    getMonthlyStats() {
        const monthlyData = {};
        this.data.orders.forEach(order => {
            const month = order.createdAt.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { orders: 0, revenue: 0 };
            }
            monthlyData[month].orders++;
            monthlyData[month].revenue += order.totalAmount;
        });
        return monthlyData;
    }
}

// Instance globale
const dataService = new DataService();