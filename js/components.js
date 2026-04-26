// components.js - Reusable UI components functions

const priceFormatter = new Intl.NumberFormat('en-UG', { 
    style: 'currency', 
    currency: 'UGX', 
    minimumFractionDigits: 0 
});

const formatPrice = (price) => {
    return priceFormatter.format(price);
};

const createProductCard = (product) => {
    return `
        <div class="product-card" onclick="app.navigate('product', '${product.id}')">
            <img src="${product.images[0] || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${product.name}" class="product-img" loading="lazy" decoding="async">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-vendor">
                    <i class="fa-solid fa-location-dot"></i> ${product.location || 'Ugandawide'}
                </div>
            </div>
        </div>
    `;
};

const createCategoryIcon = (category) => {
    // Context-aware navigation: search only this store if we're in a vendor view
    let action = `app.navigate('shop', '${category.name}')`;
    if (window.app && app.currentView === 'vendor' && app.currentVendorId) {
        action = `app.navigate('vendor', '${app.currentVendorId}/category=${encodeURIComponent(category.name)}')`;
    } else if (window.app && app.currentView === 'dashboard') {
        action = `app.navigate('dashboard', 'category=${encodeURIComponent(category.name)}')`;
    }

    return `
        <div class="category-item text-center glass-panel" onclick="${action}">
            <div class="category-icon-wrapper"><i class="fa-solid ${category.icon}"></i></div>
            <div class="category-name">${category.name}</div>
        </div>
    `;
};

const createVendorCard = async (vendor) => {
    const vendorProducts = await db.getProducts({vendorId: vendor.id});
    return `
        <div class="product-card text-center glass-panel" style="padding: 2rem 1rem;" onclick="app.navigate('vendor', '${vendor.id}')">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--accent), var(--secondary)); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; overflow: hidden;">
                ${vendor.profilePic ? 
                    `<img src="${vendor.profilePic}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                    vendor.storeName.charAt(0)
                }
            </div>
            <h3>${vendor.storeName}</h3>
            <p class="text-muted"><i class="fa-solid fa-boxes-stacked"></i> ${vendorProducts.length} items</p>
            <button class="btn btn-outline mt-2 w-100">Visit Store</button>
        </div>
    `;
}

const createSidebar = async () => {
    const categories = await db.getCategories();
    return `
        <aside class="sidebar-panel slide-in hide-mobile">
            <div class="category-sidebar-grid">
                ${categories.map(c => createCategoryIcon(c)).join('')}
            </div>
        </aside>
    `;
};

const createDrawerCategoryList = async () => {
    const categories = await db.getCategories();
    
    // Context-aware navigation setup
    const isVendorView = window.app && app.currentView === 'vendor' && app.currentVendorId;
    const isDashboardView = window.app && app.currentView === 'dashboard';
    
    return `
        <div class="drawer-category-grid">
            ${categories.map(c => {
                let action = `app.navigate('shop', '${c.name}')`;
                if (isVendorView) {
                    action = `app.navigate('vendor', '${app.currentVendorId}/category=${encodeURIComponent(c.name)}')`;
                } else if (isDashboardView) {
                    action = `app.navigate('dashboard', 'category=${encodeURIComponent(c.name)}')`;
                }
                
                return `
                    <div class="drawer-category-item" onclick="${action}; app.toggleDrawer(false)">
                        <div class="drawer-category-icon"><i class="fa-solid ${c.icon}"></i></div>
                        <div class="drawer-category-name">${c.name}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
};

