const fs = require('fs');
const vm = require('vm');

// Mock LocalStorage
class LocalStorageMock {
    constructor() { this.store = {}; }
    clear() { this.store = {}; }
    getItem(key) { return this.store[key] || null; }
    setItem(key, value) { this.store[key] = String(value); }
    removeItem(key) { delete this.store[key]; }
}

const storeCode = fs.readFileSync('c:/Users/iTECH/Desktop/UgaTrade/js/store.js', 'utf8');
const context = { 
    localStorage: new LocalStorageMock(), 
    console, 
    Date,
    confirm: () => true,
    location: { reload: () => {} }
};
vm.createContext(context);
vm.runInContext(storeCode + "\nthis.db = db;", context);

const db = context.db;

async function runTests() {
    if (!db) throw new Error("db instance not found after loading store.js");
    
    // CLEAR INITIAL DATA
    context.localStorage.clear();
    db.init();
    
    // Delete any default products
    const allProducts = db.getProducts({includeAll: true});
    allProducts.forEach(p => db.deleteProduct(p.id));

    console.log("--- Starting Product Limit Tests (Unique IDs) ---");

    const freeVendorId = 'v1'; 
    console.log(`Testing FREE vendor ${freeVendorId}`);

    // Add 30 products with unique names/IDs (simulated)
    for (let i = 1; i <= 30; i++) {
        // Sleep slightly to ensure unique Date.now() if needed, or just trust the loop count
        // Actually we can't sleep easily here, but we can mock Date.now
        const originalNow = context.Date.now;
        context.Date.now = () => originalNow() + i; 
        db.addProduct({ vendorId: freeVendorId, name: `Test Product ${i}`, price: 100, images: ['test.jpg'] });
        context.Date.now = originalNow;
    }
    
    const currentCount = db.getProducts({vendorId: freeVendorId, includeAll: true}).length;
    console.log(`Successfully added ${currentCount} products to FREE account.`);

    // Try to add 31st
    try {
        db.addProduct({ vendorId: freeVendorId, name: "31st Product", price: 100, images: ['test.jpg'] });
        console.error("FAIL: Should have blocked 31st product for FREE account.");
    } catch (e) {
        console.log("PASS: Blocked 31st product for FREE account. Error:", e.message);
    }

    // 2. Test Deleting and Re-adding
    const products = db.getProducts({vendorId: freeVendorId, includeAll: true});
    db.deleteProduct(products[0].id);
    const countAfterDelete = db.getProducts({vendorId: freeVendorId, includeAll: true}).length;
    console.log(`Deleted 1 product. Total now: ${countAfterDelete}`);
    
    try {
        db.addProduct({ vendorId: freeVendorId, name: "New Product", price: 100, images: ['test.jpg'] });
        console.log("PASS: Successfully added a product after deleting one.");
    } catch (e) {
        console.error("FAIL: Should have allowed adding a product after deletion. Error:", e.message);
    }

    // 3. Test Paid User Limit (600)
    db.upgradePlan(freeVendorId, 'BOOST_3', 3);
    console.log(`Upgraded ${freeVendorId} to BOOST_3`);
    
    // Add 5 more
    for (let i = 1; i <= 5; i++) {
        const originalNow = context.Date.now;
        context.Date.now = () => originalNow() + 100 + i;
        db.addProduct({ vendorId: freeVendorId, name: `Paid Product ${i}`, price: 100, images: ['test.jpg'] });
        context.Date.now = originalNow;
    }
    console.log("PASS: Successfully added more than 30 products to PAID account.");
    console.log("Current count:", db.getProducts({vendorId: freeVendorId, includeAll: true}).length);

    console.log("--- Tests Completed ---");
}

runTests().catch(console.error);
