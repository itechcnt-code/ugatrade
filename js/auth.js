// auth.js
class Auth {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('uga_current_user') || 'null');
        this.listeners = [];
    }

    login(email, password) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        const vendor = vendors.find(v => (v.email === email || v.phone === email) && v.password === password);
        
        if (vendor) {
            const {password: pwd, ...info} = vendor;
            this.currentUser = info;
            localStorage.setItem('uga_current_user', JSON.stringify(this.currentUser));
            this.notify();
            return { success: true };
        }
        return { success: false, message: 'Invalid credentials' };
    }

    register(vendorInfo) {
        const vendors = JSON.parse(localStorage.getItem('uga_vendors') || '[]');
        if (vendors.some(v => v.email === vendorInfo.email || v.phone === vendorInfo.phone)) {
             return { success: false, message: 'Email or phone already exists' };
        }
        const newVendor = db.addVendor(vendorInfo);
        const {password: pwd, ...info} = newVendor;
        this.currentUser = info;
        localStorage.setItem('uga_current_user', JSON.stringify(this.currentUser));
        this.notify();
        return { success: true };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('uga_current_user');
        this.notify();
    }

    getUser() {
        return this.currentUser;
    }

    updateUser(updatedInfo) {
        this.currentUser = { ...this.currentUser, ...updatedInfo };
        localStorage.setItem('uga_current_user', JSON.stringify(this.currentUser));
        this.notify();
    }

    isLoggedIn() {
        return !!this.currentUser;
    }
    
    onChange(fn) {
        this.listeners.push(fn);
    }
    
    notify() {
        this.listeners.forEach(fn => fn(this.currentUser));
    }
}

const auth = new Auth();
