// auth.js
class Auth {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
        this.init();
    }

    init() {
        fAuth.onAuthStateChanged(async (user) => {
            if (user) {
                // Fetch extra vendor info from Firestore
                const doc = await fDb.collection('vendors').doc(user.uid).get();
                if (doc.exists) {
                    this.currentUser = { id: user.uid, email: user.email, ...doc.data() };
                } else {
                    // Fallback or guest user
                    this.currentUser = { id: user.uid, email: user.email };
                }
            } else {
                this.currentUser = null;
            }
            this.notify();
        });
    }

    async login(email, password) {
        try {
            await fAuth.signInWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, message: error.message };
        }
    }

    async register(vendorInfo) {
        try {
            const { email, password, ...otherInfo } = vendorInfo;
            const userCredential = await fAuth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Save extra info to Firestore
            await fDb.collection('vendors').doc(user.uid).set({
                ...otherInfo,
                email: email,
                id: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                plan: 'FREE',
                status: 'pending'
            });

            return { success: true };
        } catch (error) {
            console.error("Registration Error:", error);
            return { success: false, message: error.message };
        }
    }

    async logout() {
        await fAuth.signOut();
    }

    getUser() {
        return this.currentUser;
    }

    async updateUser(updatedInfo) {
        if (!this.currentUser) return;
        try {
            await fDb.collection('vendors').doc(this.currentUser.id).update(updatedInfo);
            this.currentUser = { ...this.currentUser, ...updatedInfo };
            this.notify();
        } catch (error) {
            console.error("Update User Error:", error);
        }
    }

    isLoggedIn() {
        return !!this.currentUser;
    }
    
    onChange(fn) {
        this.listeners.push(fn);
        // Immediate notification if we already have a user
        if (this.currentUser) fn(this.currentUser);
    }
    
    notify() {
        this.listeners.forEach(fn => fn(this.currentUser));
    }
}

const auth = new Auth();

