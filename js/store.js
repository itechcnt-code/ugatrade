// store.js - Mock Database Service using LocalStorage
const DB_VERSION = 3; // Incremented to force products refresh
const CATEGORIES = [
    { id: 'c1', name: 'Computers', icon: 'fa-laptop' },
    { id: 'c12', name: 'Mobile Phones', icon: 'fa-mobile-screen-button' },
    { id: 'c13', name: 'Electrical and Electronics', icon: 'fa-plug-circle-bolt' },
    { id: 'c14', name: 'Vehicles', icon: 'fa-car-side' },
    { id: 'c15', name: 'Machines', icon: 'fa-gears' },
    { id: 'c2', name: 'Stationaries', icon: 'fa-pen-ruler' },
    { id: 'c3', name: 'Grocery', icon: 'fa-basket-shopping' },
    { id: 'c4', name: 'Health', icon: 'fa-heart-pulse' },
    { id: 'c5', name: 'Fashion', icon: 'fa-shirt' },
    { id: 'c6', name: 'Property', icon: 'fa-building' },
    { id: 'c7', name: 'Furniture and appliances', icon: 'fa-couch' },
    { id: 'c8', name: 'Welding and Mechanics', icon: 'fa-wrench' },
    { id: 'c9', name: 'Repair and Construction', icon: 'fa-hammer' },
    { id: 'c10', name: 'Services', icon: 'fa-handshake' },
    { id: 'c11', name: 'Jobs', icon: 'fa-briefcase' },
    { id: 'c16', name: 'Others', icon: 'fa-ellipsis' }
];

const INITIAL_VENDORS = [
    { id: 'v1', name: 'Kampala Electronics Factory', location: 'Kampala', phone: '256701234567', whatsapp: '256701234567', storeName: 'K-Elec', email: 'vendor1@demo.com', password: 'password123', plan: 'FREE', uploadsLeft: 30, lastUploadReset: Date.now(), planExpiry: null, status: 'active' },
    { id: 'v2', name: 'Modern Fashion Store', location: 'Entebbe', phone: '256771234567', whatsapp: '256771234567', storeName: 'K-Fashion', email: 'vendor2@demo.com', password: 'password123', plan: 'FREE', uploadsLeft: 30, lastUploadReset: Date.now(), planExpiry: null, status: 'active' },
    { id: 'v3', name: 'Mbarara Furniture Hub', location: 'Mbarara', phone: '256788123456', whatsapp: '256788123456', storeName: 'Mbarara-Home', email: 'vendor3@demo.com', password: 'password123', plan: 'FREE', uploadsLeft: 30, lastUploadReset: Date.now(), planExpiry: null, status: 'active' }
];

const INITIAL_PRODUCTS = [
    { id: 'p1', vendorId: 'v1', name: 'MacBook Pro M2 2023', description: 'Brand new, sealed in box. 16GB RAM, 512GB SSD.', category: 'Computers', price: 6500000, images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now(), views: 1205, likesCount: 45, savesCount: 12, status: 'active' },
    { id: 'p2', vendorId: 'v1', name: 'Samsung Galaxy S23 Ultra', description: '256GB Black, 1 year warranty.', category: 'Mobile Phones', price: 4200000, images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 10000, views: 850, likesCount: 32, savesCount: 8, status: 'active' },
    { id: 'p3', vendorId: 'v2', name: 'Designer Men Suits', description: 'Imported Turkish Suits. Sizes 42-50 available.', category: 'Fashion', price: 350000, images: ['https://images.unsplash.com/photo-1594938298596-1abce64bdca9?auto=format&fit=crop&q=80&w=800'], location: 'Entebbe', createdAt: Date.now() - 50000, views: 420, likesCount: 15, savesCount: 5, status: 'active' },
    { id: 'p4', vendorId: 'v2', name: 'Nike Air Max 270', description: 'Original Nike sneakers, sizes 40-45.', category: 'Fashion', price: 250000, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'], location: 'Entebbe', createdAt: Date.now() - 60000, views: 630, likesCount: 22, savesCount: 9, status: 'active' },
    { id: 'p5', vendorId: 'v3', name: 'L-Shaped Modern Sofa', description: 'Premium grey fabric, extremely comfortable for large families.', category: 'Furniture and appliances', price: 1800000, images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800'], location: 'Mbarara', createdAt: Date.now() - 100000, views: 210, likesCount: 10, savesCount: 3, status: 'active' },
    { id: 'p6', vendorId: 'v1', name: 'Dell XPS 13 Laptop', description: 'Ultra-thin, 4K Display, i7 Processor.', category: 'Computers', price: 4800000, images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 150000, views: 540, likesCount: 28, savesCount: 7, status: 'active' },
    { id: 'p7', vendorId: 'v1', name: 'iPhone 15 Pro Max', description: 'Titanium build, 256GB, Natural Titanium.', category: 'Mobile Phones', price: 5800000, images: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 200000, views: 1100, likesCount: 56, savesCount: 15, status: 'active' },
    { id: 'p8', vendorId: 'v3', name: 'Dining Table Set (6 Chairs)', description: 'Hardwood mahogany with glass top finish.', category: 'Furniture and appliances', price: 1200000, images: ['https://images.unsplash.com/photo-1617806118233-18e16208a50a?auto=format&fit=crop&q=80&w=800'], location: 'Mbarara', createdAt: Date.now() - 250000, views: 150, likesCount: 8, savesCount: 2, status: 'active' },
    { id: 'p9', vendorId: 'v2', name: 'Ladies Evening Gown', description: 'Elegant silk dress for parties and weddings.', category: 'Fashion', price: 450000, images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 300000, views: 320, likesCount: 12, savesCount: 4, status: 'active' },
    { id: 'p10', vendorId: 'v1', name: 'Sony WH-1000XM5', description: 'Industry leading noise cancelling headphones.', category: 'Electrical and Electronics', price: 1100000, images: ['https://images.unsplash.com/photo-1618366712277-707026519192?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 350000, views: 480, likesCount: 19, savesCount: 6, status: 'active' },
    { id: 'p11', vendorId: 'v3', name: 'Queen Size Memory Foam Bed', description: 'Orthopedic support with 5-year warranty.', category: 'Furniture and appliances', price: 950000, images: ['https://images.unsplash.com/photo-1505691938895-1758d7eaa511?auto=format&fit=crop&q=80&w=800'], location: 'Gulu', createdAt: Date.now() - 400000, views: 180, likesCount: 6, savesCount: 1, status: 'active' },
    { id: 'p12', vendorId: 'v2', name: 'Raw Honey - 5 Liters', description: 'Pure, organic honey from Nakasongola.', category: 'Grocery', price: 85000, images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800'], location: 'Luweero', createdAt: Date.now() - 450000, views: 290, likesCount: 14, savesCount: 3, status: 'active' },
    { id: 'p13', vendorId: 'v1', name: 'Canon EOS R5 Camera', description: 'Professional mirrorless camera with 24-105mm lens.', category: 'Electrical and Electronics', price: 12500000, images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 500000, views: 350, likesCount: 25, savesCount: 10, status: 'active' },
    { id: 'p14', vendorId: 'v2', name: 'High-Waist Blue Jeans', description: 'Stretch denim, premium quality.', category: 'Fashion', price: 120000, images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 550000, views: 410, likesCount: 18, savesCount: 6, status: 'active' },
    { id: 'p15', vendorId: 'v3', name: 'Land Cruiser V8 Spare Parts', description: 'Genuine front bumper and headlights.', category: 'Vehicles', price: 5000000, images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 600000, views: 120, likesCount: 5, savesCount: 1, status: 'active' },
    { id: 'p16', vendorId: 'v1', name: 'DJI Mavic 3 Pro', description: 'Triple camera system drone for professionals.', category: 'Electrical and Electronics', price: 8200000, images: ['https://images.unsplash.com/photo-1473960154302-399d20602511?auto=format&fit=crop&q=80&w=800'], location: 'Entebbe', createdAt: Date.now() - 650000, views: 280, likesCount: 16, savesCount: 4, status: 'active' },
    { id: 'p17', vendorId: 'v2', name: 'Steel Welding Machine', description: 'Heavy duty inverter welder 250A.', category: 'Welding and Mechanics', price: 750000, images: ['https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=800'], location: 'Wakiso', createdAt: Date.now() - 700000, views: 190, likesCount: 9, savesCount: 2, status: 'active' },
    { id: 'p18', vendorId: 'v3', name: 'Office Desk & Chair Set', description: 'Ergonomic chair and L-shaped desk for productivity.', category: 'Furniture and appliances', price: 680000, images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 750000, views: 230, likesCount: 11, savesCount: 3, status: 'active' },
    { id: 'p19', vendorId: 'v1', name: 'Smart Watch Series 9', description: 'Health monitoring, GPS, always-on display.', category: 'Electrical and Electronics', price: 650000, images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 800000, views: 720, likesCount: 35, savesCount: 9, status: 'active' },
    { id: 'p20', vendorId: 'v2', name: 'Portable Electric Drill', description: 'Cordless drill with 2 battery packs.', category: 'Repair and Construction', price: 320000, images: ['https://images.unsplash.com/photo-1504148455328-4ad72753166d?auto=format&fit=crop&q=80&w=800'], location: 'Mukono', createdAt: Date.now() - 850000, views: 160, likesCount: 7, savesCount: 2, status: 'active' },
    { id: 'p21', vendorId: 'v3', name: 'Rice Bags - 50KG', description: 'Super white long grain rice from Tanzania.', category: 'Grocery', price: 185000, images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 900000, views: 310, likesCount: 13, savesCount: 4, status: 'active' },
    { id: 'p22', vendorId: 'v1', name: 'HP LaserJet Pro', description: 'Fast monochrome wireless printer for offices.', category: 'Computers', price: 850000, images: ['https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 950000, views: 420, likesCount: 17, savesCount: 5, status: 'active' },
    { id: 'p23', vendorId: 'v3', name: 'Concrete Mixer 500L', description: 'Heavy duty mixer for construction sites.', category: 'Machines', price: 12500000, images: ['https://images.unsplash.com/photo-1541625602330-2277fe4e405a?auto=format&fit=crop&q=80&w=800'], location: 'Hoima', createdAt: Date.now() - 1000000, views: 95, likesCount: 4, savesCount: 0, status: 'active' },
    { id: 'p24', vendorId: 'v2', name: 'Leather Men Boots', description: 'Handcrafted genuine leather boots.', category: 'Fashion', price: 180000, images: ['https://images.unsplash.com/photo-1520639889313-7ef72ec69b0a?auto=format&fit=crop&q=80&w=800'], location: 'Kampala', createdAt: Date.now() - 1050000, views: 240, likesCount: 10, savesCount: 3, status: 'active' }
];

class store {
    constructor() {
        this.init();
    }

    init() {
        const storedVersion = parseInt(localStorage.getItem('uga_db_version') || '0');

        if (!localStorage.getItem('uga_vendors')) {
            localStorage.setItem('uga_vendors', JSON.stringify(INITIAL_VENDORS));
        }
        
        // Force refresh categories if version changed
        if (!localStorage.getItem('uga_categories') || storedVersion < DB_VERSION) {
            localStorage.setItem('uga_categories', JSON.stringify(CATEGORIES));
            localStorage.setItem('uga_db_version', DB_VERSION.toString());
            
            // If category list changed significantly, we might want to refresh products too 
            // to ensure demo products stay compatible with new categories
            if(storedVersion < DB_VERSION) {
                localStorage.setItem('uga_products', JSON.stringify(INITIAL_PRODUCTS));
            }
        }

        if (!localStorage.getItem('uga_products')) {
            localStorage.setItem('uga_products', JSON.stringify(INITIAL_PRODUCTS));
        }

        // Migration: Ensure all vendors and products have a status
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        let needsSave = false;

        vendors.forEach(v => {
            if (!v.status) {
                v.status = 'active';
                needsSave = true;
            }
        });
        if (needsSave) localStorage.setItem('uga_vendors', JSON.stringify(vendors));

        needsSave = false;
        products.forEach(p => {
            if (!p.status) {
                p.status = 'active';
                needsSave = true;
            }
        });
        if (needsSave) localStorage.setItem('uga_products', JSON.stringify(products));
        
        // Execute background subscription updates
        this.resetMonthlyUploads();
        this.autoRefreshProducts();
        this.cleanupExpiredChats();
    }

    // Storage Management
    saveSafe(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn("Storage quota exceeded, attempting to prune old products...");
                if (key === 'uga_products') {
                    let products = JSON.parse(localStorage.getItem('uga_products') || '[]');
                    if (products.length > 5) {
                        // Remove oldest 10 products
                        products.splice(0, 10);
                        localStorage.setItem('uga_products', JSON.stringify(products));
                        // Retry saving the new value
                        try {
                            localStorage.setItem(key, JSON.stringify(value));
                            return true;
                        } catch (retryError) {
                            console.error("Critical Storage Error: Even after pruning, storage is full.");
                            return false;
                        }
                    }
                }
            }
            console.error("Storage Error:", e);
            return false;
        }
    }

    clearDatabase() {
        if(confirm("Are you sure? This will delete ALL local products and vendors and reset the app.")) {
            localStorage.clear();
            location.reload();
        }
    }

    // Plans and Subscriptions
    resetMonthlyUploads() {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        let updated = false;
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        
        vendors.forEach(v => {
            // Check if plan expired securely
            if (v.plan !== 'FREE' && v.planExpiry && now > v.planExpiry) {
                v.plan = 'FREE';
                v.planExpiry = null;
                v.uploadsLeft = 30;
                v.lastUploadReset = now;
                updated = true;
            } else if (now - v.lastUploadReset >= thirtyDays) {
                // Monthly reset
                v.lastUploadReset = now;
                v.lastUploadReset = now;
                if (v.plan === 'FREE') v.uploadsLeft = 30;
                else v.uploadsLeft = 5000; // Boosted plans get high upload limits
                updated = true;
            }
        });
        if (updated) localStorage.setItem('uga_vendors', JSON.stringify(vendors));
    }

    autoRefreshProducts() {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        
        const refreshRates = {
            'FREE': 20 * 24 * 60 * 60 * 1000,
            'BOOST_1': 48 * 60 * 60 * 1000,
            'BOOST_3': 28 * 60 * 60 * 1000,
            'BOOST_6': 12 * 60 * 60 * 1000
        };
        
        let productsUpdated = false;
        const now = Date.now();
        
        products.forEach(p => {
            const vendor = vendors.find(v => v.id === p.vendorId);
            if(vendor) {
                const rate = refreshRates[vendor.plan || 'FREE'];
                if (now - p.createdAt >= rate) {
                    p.createdAt = now; // Auto-refresh bumps it to top
                    productsUpdated = true;
                }
            }
        });
        
        if (productsUpdated) {
            localStorage.setItem('uga_products', JSON.stringify(products));
        }
    }

    upgradePlan(vendorId, planName, durationMonths) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const index = vendors.findIndex(v => v.id === vendorId);
        if (index > -1) {
            const v = vendors[index];
            v.plan = planName;
            const now = Date.now();
            v.planExpiry = now + (durationMonths * 30 * 24 * 60 * 60 * 1000);
            v.lastUploadReset = now;
            v.uploadsLeft = 5000; // Boosted plans
            
            localStorage.setItem('uga_vendors', JSON.stringify(vendors));
            return v;
        }
        return null;
    }

    async verifyPayment(transactionId, apiKey) {
        if (!apiKey || !transactionId) throw new Error("API Key and Transaction ID are required.");

        try {
            // Fetch recent messages from httpSMS
            const response = await fetch(`https://api.httpsms.com/v1/messages?limit=20`, {
                headers: { 'x-api-key': apiKey }
            });

            if (!response.ok) throw new Error("Failed to connect to httpSMS.");
            
            const data = await response.json();
            const messages = data.data || [];

            // Find message matching the transaction ID
            const paymentMsg = messages.find(m => m.content && m.content.toUpperCase().includes(transactionId.toUpperCase()));

            if (!paymentMsg) {
                throw new Error("Transaction ID not found in recent messages. Please ensure you've received the confirmation SMS.");
            }

            // Extract amount from message (e.g. "UGX 5,000", "UGX 10,000", etc.)
            const content = paymentMsg.content.replace(/,/g, '');
            const amountMatch = content.match(/UGX\s*(\d+)/i);
            
            if (!amountMatch) throw new Error("Could not verify payment amount from SMS.");
            
            const amount = parseInt(amountMatch[1]);
            
            // Map amount to plan
            let plan = null;
            let duration = 0;

            if (amount === 5000) { plan = 'BOOST_1'; duration = 1; }
            else if (amount === 10000) { plan = 'BOOST_3'; duration = 3; }
            else if (amount === 20000) { plan = 'BOOST_6'; duration = 6; }
            else {
                throw new Error(`Invalid payment amount: UGX ${amount}. Please pay exactly UGX 5,000, 10,000, or 20,000.`);
            }

            return { success: true, plan, duration, amount };

        } catch (error) {
            console.error("Verification Error:", error);
            throw error;
        }
    }

    decrementUploadCount(vendorId) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const index = vendors.findIndex(v => v.id === vendorId);
        if (index > -1) {
            vendors[index].uploadsLeft = Math.max(0, vendors[index].uploadsLeft - 1);
            localStorage.setItem('uga_vendors', JSON.stringify(vendors));
            return vendors[index];
        }
        return null;
    }

    addBonusUploads(vendorId, count) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const index = vendors.findIndex(v => v.id === vendorId);
        if (index > -1) {
            vendors[index].uploadsLeft += count;
            localStorage.setItem('uga_vendors', JSON.stringify(vendors));
            return vendors[index];
        }
        return null;
    }

    getVendors(filters = {}) {
        let vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        
        if (filters.search) {
            const term = filters.search.toLowerCase();
            vendors = vendors.filter(v => 
                (v.storeName && v.storeName.toLowerCase().includes(term)) || 
                (v.name && v.name.toLowerCase().includes(term)) ||
                (v.location && v.location.toLowerCase().includes(term))
            );
        }

        if (!filters.includeAll) {
            vendors = vendors.filter(v => v.status === 'active' || !v.status);
        }

        return vendors.map(v => {
            const { password, ...publicInfo } = v;
            return publicInfo;
        });
    }

    // Products
    getProducts(filters = {}) {
        let products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        if (filters.category) products = products.filter(p => p.category === filters.category);
        if (filters.vendorId) products = products.filter(p => p.vendorId === filters.vendorId);
        if (filters.search) {
            const term = filters.search.toLowerCase();
            products = products.filter(p => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term));
        }

        if (!filters.includeAll) {
            const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
            products = products.filter(p => {
                const vendor = vendors.find(v => v.id === p.vendorId);
                const isProductActive = p.status === 'active' || !p.status;
                const isVendorActive = !vendor || vendor.status === 'active' || !vendor.status;
                return isProductActive && isVendorActive;
            });
        }

        return products.sort((a,b) => b.createdAt - a.createdAt);
    }
    
    getProduct(id, includeHidden = false) {
        const product = JSON.parse(localStorage.getItem('uga_products') || '[]').find(p => p.id === id);
        if (!product) return null;
        if (!includeHidden && product.status && product.status !== 'active') return null;
        return product;
    }

    addProduct(product) {
        let products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        
        // Enforce hard cap to prevent quota issues
        if (products.length >= 200) {
            products = products.slice(-190); // Keep only most recent 190
        }

        product.id = 'p' + Date.now();
        product.createdAt = Date.now();
        product.views = 0;
        product.likesCount = 0;
        product.savesCount = 0;
        product.status = 'active'; // Products are active by default but can be hidden
        products.push(product);
        
        const success = this.saveSafe('uga_products', products);
        if (!success) {
            throw new Error("Unable to save product: Storage is completely full. Please delete some old items.");
        }
        return product;
    }

    deleteProduct(productId) {
        const products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        const filtered = products.filter(p => p.id !== productId);
        localStorage.setItem('uga_products', JSON.stringify(filtered));
        return true;
    }

    incrementView(productId) {
        const products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        const index = products.findIndex(p => p.id === productId);
        if (index > -1) {
            products[index].views = (products[index].views || 0) + 1;
            localStorage.setItem('uga_products', JSON.stringify(products));
            return true;
        }
        return false;
    }

    // Vendors

    getVendor(id, includeInactive = false) {
        if (id === 'admin') {
            return {
                id: 'admin',
                name: 'UgaTrade Support',
                storeName: 'UgaTrade Official',
                location: 'Headquarters',
                profilePic: null,
                isVerified: true
            };
        }
        const vendor = JSON.parse(localStorage.getItem('uga_vendors') || '[]').find(v => v.id === id);
        if(!vendor) return null;
        if(!includeInactive && vendor.status && vendor.status !== 'active') return null;
        const {password, ...publicInfo} = vendor;
        return publicInfo;
    }

    addVendor(vendor) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        vendor.id = 'v' + Date.now();
        vendor.plan = 'FREE';
        vendor.uploadsLeft = 30;
        vendor.lastUploadReset = Date.now();
        vendor.planExpiry = null;
        vendor.status = 'pending'; // New vendors need approval
        vendors.push(vendor);
        localStorage.setItem('uga_vendors', JSON.stringify(vendors));
        return vendor;
    }

    updateVendor(vendorId, data) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const index = vendors.findIndex(v => v.id === vendorId);
        if (index > -1) {
            vendors[index] = { ...vendors[index], ...data };
            localStorage.setItem('uga_vendors', JSON.stringify(vendors));
            return vendors[index];
        }
        return null;
    }

    updateVendorStatus(vendorId, status) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const index = vendors.findIndex(v => v.id === vendorId);
        if (index > -1) {
            vendors[index].status = status;
            localStorage.setItem('uga_vendors', JSON.stringify(vendors));
            return true;
        }
        return false;
    }

    updateProductStatus(productId, status) {
        const products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        const index = products.findIndex(p => p.id === productId);
        if (index > -1) {
            products[index].status = status;
            localStorage.setItem('uga_products', JSON.stringify(products));
            return true;
        }
        return false;
    }
    
    getAllVendorsAdmin() {
        return JSON.parse(localStorage.getItem('uga_vendors') || '[]');
    }

    getAllProductsAdmin() {
        return JSON.parse(localStorage.getItem('uga_products') || '[]');
    }

    updatePassword(vendorId, currentPassword, newPassword) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const index = vendors.findIndex(v => v.id === vendorId);
        if (index > -1) {
            if (vendors[index].password === currentPassword) {
                vendors[index].password = newPassword;
                localStorage.setItem('uga_vendors', JSON.stringify(vendors));
                return { success: true };
            } else {
                return { success: false, message: 'Current password is incorrect.' };
            }
        }
        return { success: false, message: 'Vendor not found.' };
    }
    
    getCategories() {
        return JSON.parse(localStorage.getItem('uga_categories') || '[]');
    }

    // User Interactions (Likes, Saves)
    toggleInteraction(userId, productId, type) {
        if (!userId) return false;
        const key = `uga_interactions_${userId}`;
        let interactions = JSON.parse(localStorage.getItem(key) || '{"likes":[], "saves":[]}');
        
        if (!interactions[type]) interactions[type] = [];
        const list = interactions[type];
        const index = list.indexOf(productId);
        
        // Update product counter centrally
        const products = JSON.parse(localStorage.getItem('uga_products') || '[]');
        const pIndex = products.findIndex(p => p.id === productId);
        const countField = type === 'likes' ? 'likesCount' : 'savesCount';

        if (index > -1) {
            list.splice(index, 1);
            if (pIndex > -1) {
                products[pIndex][countField] = Math.max(0, (products[pIndex][countField] || 0) - 1);
            }
        } else {
            list.push(productId);
            if (pIndex > -1) {
                products[pIndex][countField] = (products[pIndex][countField] || 0) + 1;
            }
        }
        
        localStorage.setItem(key, JSON.stringify(interactions));
        localStorage.setItem('uga_products', JSON.stringify(products));
        return index === -1; // true if added, false if removed
    }

    isInteracted(userId, productId, type) {
        if (!userId) return false;
        const key = `uga_interactions_${userId}`;
        const interactions = JSON.parse(localStorage.getItem(key) || '{"likes":[], "saves":[]}');
        return interactions[type] ? interactions[type].includes(productId) : false;
    }

    getSavedProducts(userId) {
        if (!userId) return [];
        const savedIds = this.getInteractedIds(userId, 'saves');
        const allProducts = JSON.parse(localStorage.getItem('uga_products') || '[]');
        return allProducts.filter(p => savedIds.includes(p.id)).sort((a,b) => b.createdAt - a.createdAt);
    }

    getInteractedIds(userId, type) {
        if (!userId) return [];
        const key = `uga_interactions_${userId}`;
        const interactions = JSON.parse(localStorage.getItem(key) || '{"likes":[], "saves":[]}');
        return interactions[type] || [];
    }

    getTotalLikesReceived(vendorId) {
        const products = this.getProducts({vendorId});
        return products.reduce((sum, p) => sum + (p.likesCount || 0), 0);
    }

    getVendorStats(vendorId) {
        const products = this.getProducts({vendorId});
        const stats = {
            totalProducts: products.length,
            totalViews: products.reduce((sum, p) => sum + (p.views || 0), 0),
            totalLikes: products.reduce((sum, p) => sum + (p.likesCount || 0), 0),
            totalSaves: products.reduce((sum, p) => sum + (p.savesCount || 0), 0),
            totalMessages: this.getChats(vendorId).length
        };

        // Format numbers like 1.2k
        const formatNum = (num) => {
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        };

        return {
            ...stats,
            displayViews: formatNum(stats.totalViews),
            displayLikes: formatNum(stats.totalLikes),
            displaySaves: formatNum(stats.totalSaves)
        };
    }

    // Follows
    toggleFollow(userId, vendorId) {
        if (!userId || !vendorId) return false;
        const key = `uga_followers_${vendorId}`;
        let followers = JSON.parse(localStorage.getItem(key) || '[]');
        
        const index = followers.indexOf(userId);
        if (index > -1) {
            followers.splice(index, 1);
        } else {
            followers.push(userId);
        }
        
        localStorage.setItem(key, JSON.stringify(followers));
        return index === -1; // true if followed, false if unfollowed
    }

    getFollowerCount(vendorId) {
        const key = `uga_followers_${vendorId}`;
        return JSON.parse(localStorage.getItem(key) || '[]').length;
    }

    getFollowerObjects(vendorId) {
        const key = `uga_followers_${vendorId}`;
        const followerIds = JSON.parse(localStorage.getItem(key) || '[]');
        const allVendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        return allVendors.filter(v => followerIds.includes(v.id)).map(v => {
            const {password, ...publicInfo} = v;
            return publicInfo;
        });
    }

    isFollowing(userId, vendorId) {
        if (!userId || !vendorId) return false;
        const key = `uga_followers_${vendorId}`;
        return JSON.parse(localStorage.getItem(key) || '[]').includes(userId);
    }

    // Reviews & Feedback
    addReview(vendorId, review) {
        if (!vendorId) return false;
        const key = `uga_reviews_${vendorId}`;
        let reviews = JSON.parse(localStorage.getItem(key) || '[]');
        
        review.id = 'r' + Date.now();
        review.createdAt = Date.now();
        reviews.unshift(review); // Newest first
        
        // Keep only top 10
        if (reviews.length > 10) {
            reviews = reviews.slice(0, 10);
        }
        
        localStorage.setItem(key, JSON.stringify(reviews));
        return review;
    }

    getReviews(vendorId) {
        const key = `uga_reviews_${vendorId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    getAverageRating(vendorId) {
        const reviews = this.getReviews(vendorId);
        if (reviews.length === 0) return 0;
        
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return (sum / reviews.length).toFixed(1);
    }

    getUnreadFeedbackCount(vendorId) {
        const vendor = JSON.parse(localStorage.getItem('uga_vendors') || '[]').find(v => v.id === vendorId);
        if (!vendor) return 0;
        
        const lastViewed = vendor.lastFeedbackViewedAt || 0;
        const reviews = this.getReviews(vendorId);
        return reviews.filter(r => r.createdAt > lastViewed).length;
    }

    // Messaging System
    getChats(userId) {
        if (!userId) return [];
        const chats = JSON.parse(localStorage.getItem('uga_chats') || '[]');
        return chats.filter(c => c.participants.includes(userId))
                    .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    }

    getChat(chatId) {
        const chats = JSON.parse(localStorage.getItem('uga_chats') || '[]');
        return chats.find(c => c.id === chatId);
    }

    getOrCreateChat(userA, userB, productContext = null) {
        if (!userA || !userB) return null;
        let chats = JSON.parse(localStorage.getItem('uga_chats') || '[]');
        
        // Find existing chat between these two
        let chat = chats.find(c => c.participants.includes(userA) && c.participants.includes(userB));
        
        if (!chat) {
            chat = {
                id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                participants: [userA, userB],
                createdAt: Date.now(),
                lastMessageAt: Date.now(),
                lastMessage: 'Starting conversation...',
                productContext: productContext,
                lastReadAt: {
                    [userA]: Date.now(),
                    [userB]: 0 // Recipient hasn't read yet
                }
            };
            chats.push(chat);
            localStorage.setItem('uga_chats', JSON.stringify(chats));
        } else if (productContext) {
            // Update context if it's a new inquiry about a different product
            chat.productContext = productContext;
            chat.lastMessageAt = Date.now();
            
            // Mark as unread for the other person since we're updating context/starting fresh
            const otherParticipant = chat.participants.find(p => p !== userA);
            if(otherParticipant) chat.lastReadAt[otherParticipant] = 0;
            
            localStorage.setItem('uga_chats', JSON.stringify(chats));
        }
        
        return chat;
    }

    getMessages(chatId) {
        const key = `uga_messages_${chatId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    markAsRead(chatId, userId) {
        let chats = JSON.parse(localStorage.getItem('uga_chats') || '[]');
        const chatIndex = chats.findIndex(c => c.id === chatId);
        if (chatIndex > -1) {
            if (!chats[chatIndex].lastReadAt) chats[chatIndex].lastReadAt = {};
            chats[chatIndex].lastReadAt[userId] = Date.now();
            localStorage.setItem('uga_chats', JSON.stringify(chats));
            return true;
        }
        return false;
    }

    getUnreadCount(userId) {
        if (!userId) return 0;
        const chats = JSON.parse(localStorage.getItem('uga_chats') || '[]');
        return chats.filter(c => {
            if (!c.participants.includes(userId)) return false;
            const myLastRead = (c.lastReadAt && c.lastReadAt[userId]) ? c.lastReadAt[userId] : 0;
            return (c.lastMessageAt || 0) > myLastRead;
        }).length;
    }

    sendMessage(chatId, senderId, text, type = 'text') {
        const key = `uga_messages_${chatId}`;
        let messages = JSON.parse(localStorage.getItem(key) || '[]');
        
        const message = {
            id: 'msg_' + Date.now(),
            chatId: chatId,
            senderId: senderId,
            text: text,
            type: type,
            timestamp: Date.now()
        };
        
        messages.push(message);
        localStorage.setItem(key, JSON.stringify(messages));
        
        // Update chat metadata
        let chats = JSON.parse(localStorage.getItem('uga_chats') || '[]');
        const chatIndex = chats.findIndex(c => c.id === chatId);
        if (chatIndex > -1) {
            chats[chatIndex].lastMessage = type === 'image' ? '📷 Photo' : text;
            chats[chatIndex].lastMessageAt = Date.now();
            localStorage.setItem('uga_chats', JSON.stringify(chats));
        }
        
        return message;
    }

    // --- Documents (Invoices & Receipts) ---
    getDocuments(vendorId, type = null) {
        const docs = JSON.parse(localStorage.getItem('uga_documents') || '[]');
        return docs.filter(d => d.vendorId === vendorId && (!type || d.type === type)).sort((a, b) => b.createdAt - a.createdAt);
    }
    
    saveDocument(doc) {
        let docs = JSON.parse(localStorage.getItem('uga_documents') || '[]');
        if (!doc.id) {
            doc.id = 'doc_' + Date.now() + Math.random().toString(36).substr(2, 9);
            doc.createdAt = Date.now();
            docs.push(doc);
        } else {
            const index = docs.findIndex(d => d.id === doc.id);
            if (index > -1) {
                doc.updatedAt = Date.now();
                docs[index] = doc;
            } else {
                docs.push(doc);
            }
        }
        localStorage.setItem('uga_documents', JSON.stringify(docs));
        return doc;
    }
    
    deleteDocument(id) {
        let docs = JSON.parse(localStorage.getItem('uga_documents') || '[]');
        docs = docs.filter(d => d.id !== id);
        localStorage.setItem('uga_documents', JSON.stringify(docs));
    }

    cleanupExpiredChats() {
        let chats = JSON.parse(localStorage.getItem('uga_chats') || '[]');
        const now = Date.now();
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        
        const expired = chats.filter(c => (now - (c.lastMessageAt || c.createdAt)) > SEVEN_DAYS);
        
        if (expired.length > 0) {
            console.log(`Cleaning up ${expired.length} expired chats...`);
            expired.forEach(c => {
                localStorage.removeItem(`uga_messages_${c.id}`);
            });
            
            const remaining = chats.filter(c => (now - (c.lastMessageAt || c.createdAt)) <= SEVEN_DAYS);
            localStorage.setItem('uga_chats', JSON.stringify(remaining));
        }
    }
}

const db = new store();
