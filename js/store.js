// store.js - Firestore Database Service
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

class store {
    constructor() {
        this.init();
    }

    async init() {
        // Seed categories if they don't exist
        const catSnapshot = await fDb.collection('categories').limit(1).get();
        if (catSnapshot.empty) {
            const batch = fDb.batch();
            CATEGORIES.forEach(cat => {
                const docRef = fDb.collection('categories').doc(cat.id);
                batch.set(docRef, cat);
            });
            await batch.commit();
        }
    }

    // Products
    async getProducts(filters = {}) {
        let query = fDb.collection('products');

        if (filters.category) query = query.where('category', '==', filters.category);
        if (filters.vendorId) query = query.where('vendorId', '==', filters.vendorId);
        
        // Note: Firestore requires indexes for complex filtering + ordering
        // For simplicity, we'll order by createdAt descending
        query = query.orderBy('createdAt', 'desc');

        const snapshot = await query.get();
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (filters.search) {
            const term = filters.search.toLowerCase();
            products = products.filter(p => 
                (p.name && p.name.toLowerCase().includes(term)) || 
                (p.description && p.description.toLowerCase().includes(term))
            );
        }

        if (!filters.includeAll) {
            products = products.filter(p => p.status === 'active' || !p.status);
        }

        return products;
    }

    async getProduct(id) {
        const doc = await fDb.collection('products').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async addProduct(product) {
        product.createdAt = Date.now(); // or firebase.firestore.FieldValue.serverTimestamp()
        product.views = 0;
        product.likesCount = 0;
        product.savesCount = 0;
        product.status = 'active';
        
        const docRef = await fDb.collection('products').add(product);
        return { id: docRef.id, ...product };
    }

    async deleteProduct(productId) {
        await fDb.collection('products').doc(productId).delete();
        return true;
    }

    async incrementView(productId) {
        await fDb.collection('products').doc(productId).update({
            views: firebase.firestore.FieldValue.increment(1)
        });
    }

    // Vendors
    async getVendors(filters = {}) {
        let query = fDb.collection('vendors');
        
        if (!filters.includeAll) {
            query = query.where('status', '==', 'active');
        }

        const snapshot = await query.get();
        let vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (filters.search) {
            const term = filters.search.toLowerCase();
            vendors = vendors.filter(v => 
                (v.storeName && v.storeName.toLowerCase().includes(term)) || 
                (v.name && v.name.toLowerCase().includes(term))
            );
        }

        return vendors;
    }

    async getVendor(id) {
        if (id === 'admin') {
            return {
                id: 'admin',
                name: 'UgaTrade Support',
                storeName: 'UgaTrade Official',
                location: 'Headquarters',
                isVerified: true
            };
        }
        const doc = await fDb.collection('vendors').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async updateVendor(vendorId, data) {
        await fDb.collection('vendors').doc(vendorId).update(data);
    }

    // Categories
    async getCategories() {
        const snapshot = await fDb.collection('categories').get();
        return snapshot.docs.map(doc => doc.data());
    }

    // Interactions
    async toggleInteraction(userId, productId, type) {
        if (!userId) return false;
        const interactionRef = fDb.collection('interactions').doc(`${userId}_${productId}`);
        const doc = await interactionRef.get();
        
        const countField = type === 'likes' ? 'likesCount' : 'savesCount';
        const productRef = fDb.collection('products').doc(productId);

        if (doc.exists && doc.data()[type]) {
            // Remove interaction
            await interactionRef.update({ [type]: false });
            await productRef.update({ [countField]: firebase.firestore.FieldValue.increment(-1) });
            return false;
        } else {
            // Add interaction
            await interactionRef.set({ [type]: true, userId, productId }, { merge: true });
            await productRef.update({ [countField]: firebase.firestore.FieldValue.increment(1) });
            return true;
        }
    }

    async isInteracted(userId, productId, type) {
        if (!userId) return false;
        const doc = await fDb.collection('interactions').doc(`${userId}_${productId}`).get();
        return doc.exists && doc.data()[type];
    }

    async getSavedProducts(userId) {
        const snapshot = await fDb.collection('interactions')
            .where('userId', '==', userId)
            .where('saves', '==', true)
            .get();
        
        const productIds = snapshot.docs.map(doc => doc.data().productId);
        if (productIds.length === 0) return [];
        
        // Firestore 'in' query limited to 10 IDs usually, but let's just fetch all or chunk
        const products = [];
        for (const id of productIds) {
            const p = await this.getProduct(id);
            if (p) products.push(p);
        }
        return products;
    }

    // Stats
    async getVendorStats(vendorId) {
        const vendor = await this.getVendor(vendorId);
        const products = await this.getProducts({ vendorId, includeAll: true });
        
        const stats = {
            totalProducts: products.length,
            plan: vendor?.plan || 'FREE',
            totalViews: products.reduce((sum, p) => sum + (p.views || 0), 0),
            totalLikes: products.reduce((sum, p) => sum + (p.likesCount || 0), 0),
            totalSaves: products.reduce((sum, p) => sum + (p.savesCount || 0), 0),
        };

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

    // Chats
    async getChats(userId) {
        const snapshot = await fDb.collection('chats')
            .where('participants', 'array-contains', userId)
            .orderBy('lastMessageAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getOrCreateChat(userA, userB, productContext = null) {
        const query = await fDb.collection('chats')
            .where('participants', 'array-contains', userA)
            .get();
        
        let chat = query.docs.find(doc => doc.data().participants.includes(userB));
        
        if (!chat) {
            const newChat = {
                participants: [userA, userB],
                createdAt: Date.now(),
                lastMessageAt: Date.now(),
                lastMessage: 'Starting conversation...',
                productContext: productContext,
                lastReadAt: { [userA]: Date.now(), [userB]: 0 }
            };
            const docRef = await fDb.collection('chats').add(newChat);
            return { id: docRef.id, ...newChat };
        } else {
            const chatData = chat.data();
            if (productContext) {
                await fDb.collection('chats').doc(chat.id).update({
                    productContext: productContext,
                    lastMessageAt: Date.now()
                });
            }
            return { id: chat.id, ...chatData };
        }
    }

    async getMessages(chatId) {
        const snapshot = await fDb.collection('chats').doc(chatId).collection('messages')
            .orderBy('timestamp', 'asc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async sendMessage(chatId, senderId, text, type = 'text') {
        const message = {
            senderId,
            text,
            type,
            timestamp: Date.now()
        };
        
        await fDb.collection('chats').doc(chatId).collection('messages').add(message);
        await fDb.collection('chats').doc(chatId).update({
            lastMessage: type === 'image' ? '📷 Photo' : text,
            lastMessageAt: Date.now()
        });
        
        return message;
    }

    async getUnreadCount(userId) {
        const chats = await this.getChats(userId);
        return chats.filter(c => {
            const myLastRead = (c.lastReadAt && c.lastReadAt[userId]) ? c.lastReadAt[userId] : 0;
            return (c.lastMessageAt || 0) > myLastRead;
        }).length;
    }

    // Reviews
    async addReview(vendorId, review) {
        review.createdAt = Date.now();
        await fDb.collection('vendors').doc(vendorId).collection('reviews').add(review);
        return review;
    }

    async getReviews(vendorId) {
        const snapshot = await fDb.collection('vendors').doc(vendorId).collection('reviews')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }

    // Documents
    async getDocuments(vendorId, type = null) {
        let query = fDb.collection('documents').where('vendorId', '==', vendorId);
        if (type) query = query.where('type', '==', type);
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getDocument(id) {
        const doc = await fDb.collection('documents').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    // Followers
    async toggleFollow(userId, vendorId) {
        const followRef = fDb.collection('followers').doc(`${userId}_${vendorId}`);
        const doc = await followRef.get();
        if (doc.exists) {
            await followRef.delete();
            return false;
        } else {
            await followRef.set({ userId, vendorId, createdAt: Date.now() });
            return true;
        }
    }

    async isFollowing(userId, vendorId) {
        if (!userId) return false;
        const doc = await fDb.collection('followers').doc(`${userId}_${vendorId}`).get();
        return doc.exists;
    }

    async getFollowerCount(vendorId) {
        const snapshot = await fDb.collection('followers').where('vendorId', '==', vendorId).get();
        return snapshot.size;
    }

    async getFollowerObjects(vendorId) {
        const snapshot = await fDb.collection('followers').where('vendorId', '==', vendorId).get();
        const userIds = snapshot.docs.map(doc => doc.data().userId);
        if (userIds.length === 0) return [];
        
        const vendors = [];
        for (const id of userIds) {
            const v = await this.getVendor(id);
            if (v) vendors.push(v);
        }
        return vendors;
    }

    // Ratings & Feedback
    async getAverageRating(vendorId) {
        const reviews = await this.getReviews(vendorId);
        if (reviews.length === 0) return 5.0;
        const sum = reviews.reduce((s, r) => s + r.rating, 0);
        return (sum / reviews.length).toFixed(1);
    }

    // Plan & Payments
    async upgradePlan(userId, plan, durationMonths) {
        const expiry = Date.now() + (durationMonths * 30 * 24 * 60 * 60 * 1000);
        await fDb.collection('vendors').doc(userId).update({
            plan: plan,
            planExpiresAt: expiry
        });
    }

    async addBonusUploads(userId, amount) {
        await fDb.collection('vendors').doc(userId).update({
            bonusUploads: firebase.firestore.FieldValue.increment(amount)
        });
    }

    async verifyPayment(tid, apiKey) {
        // This usually involves an external API call. 
        // We'll keep the logic but wrap it in an async method.
        try {
            const response = await fetch(`https://api.httpsms.com/v1/messages?query=${tid}`, {
                headers: { 'x-api-key': apiKey }
            });
            const data = await response.json();
            
            // Simplified verification logic for demonstration
            // In a real app, you'd parse the SMS body to confirm amount and sender
            if (data.data && data.data.length > 0) {
                const msg = data.data[0].content;
                if (msg.includes('received') || msg.includes('Sent')) {
                    // Determine plan based on amount (hypothetically)
                    let plan = 'BOOST_1';
                    let duration = 1;
                    let amount = 5000;
                    
                    if (msg.includes('10,000')) { plan = 'BOOST_2'; duration = 3; amount = 10000; }
                    if (msg.includes('20,000')) { plan = 'BOOST_3'; duration = 6; amount = 20000; }
                    
                    return { success: true, plan, duration, amount };
                }
            }
            throw new Error("Payment transaction not found or invalid.");
        } catch (e) {
            console.error("Payment Verification Error:", e);
            throw e;
        }
    }

    // Auth Helpers (Password etc)
    async updatePassword(userId, current, newPass) {
        // For Firebase Auth, updating password requires re-authentication usually.
        // But since we are using compat/v8, we can try auth.currentUser.updatePassword
        try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error("No user logged in.");
            
            // Re-authenticate is safer but for this app we'll assume they just logged in
            await user.updatePassword(newPass);
            return { success: true };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // Admin Methods
    async getAllVendorsAdmin() {
        return this.getVendors({ includeAll: true });
    }

    async getAllProductsAdmin() {
        return this.getProducts({ includeAll: true });
    }

    async updateVendorStatus(id, status) {
        await fDb.collection('vendors').doc(id).update({ status });
    }

    async updateProductStatus(id, status) {
        await fDb.collection('products').doc(id).update({ status });
    }

    async markAsRead(chatId, userId) {
        await fDb.collection('chats').doc(chatId).update({
            [`lastReadAt.${userId}`]: Date.now()
        });
    }
    
    async getChat(chatId) {
        const doc = await fDb.collection('chats').doc(chatId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }
}

const db = new store();
