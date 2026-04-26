// app.js - Main Application Logic & Routing

class App {
    constructor() {
        this.appEl = document.getElementById('view-container');
        this.navActionsEl = document.getElementById('navActions');
        this.searchInput = document.getElementById('searchInput');
        this.mobileSearchInput = document.getElementById('mobileSearchInput');
        this.menuToggle = document.getElementById('menuToggle');
        this.drawerOverlay = document.getElementById('drawerOverlay');
        this.mobileDrawer = document.getElementById('mobileDrawer');
        this.closeDrawerBtn = document.getElementById('closeDrawer');
        this.mobileDrawerLinks = document.getElementById('mobileDrawerLinks');
        this.drawerCategoryList = document.getElementById('drawerCategoryList');
        this.bottomNav = document.getElementById('bottomNav');
        
        // Navigation Listeners removed from constructor (now in index.html for reliability)
        
        // Context Tracking for Independent Store Search
        this.currentView = 'home';
        this.currentVendorId = null;
        
        // Image Buffers for optimized previews and uploads
        this.imageBuffers = {};
        
        // Terms Acceptance State (for auto-ticking checkbox on registration)
        this.termsAccepted = false;
        this.registrationDraft = null;
        this.previousView = null;
        
        this.init();
        this.setVh();
        window.addEventListener('resize', () => this.setVh());

        // Global keyboard detection for mobile keyboards
        document.addEventListener('focusin', (e) => this.handleGlobalFocus(e, true));
        document.addEventListener('focusout', (e) => this.handleGlobalFocus(e, false));
    }

    handleGlobalFocus(e, isFocus) {
        if (window.innerWidth > 1024) return; // Ignore on desktop
        const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
        if (isInput) {
            document.body.classList.toggle('keyboard-active', isFocus);
        }
    }

    setVh() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    async init() {
        // Expose app to global scope for inline event handlers
        window.app = this;
        this.initLightbox();

        
        // Initial Theme Color setup
        this.updateThemeColor();
        
        // Listen to Auth Changes
        auth.onChange(async () => await this.updateNav());
        await this.updateNav();

        // Handle Routing
        window.addEventListener('hashchange', async () => {
            await this.handleRoute();
            this.toggleDrawer(false); // Close drawer on navigation
        });
        
        // ... (rest of init)
        
        // Initial Route
        await this.handleRoute();
    }

    toggleDrawer(show) {
        if(show) {
            this.mobileDrawer.classList.add('active');
            this.drawerOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            this.mobileDrawer.classList.remove('active');
            this.drawerOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    navigate(path, param = '') {
        const newHash = param ? `${path}/${param}` : path;
        if (window.location.hash === '#' + newHash) {
            this.handleRoute(); // Force refresh if hash is already the same
        } else {
            window.location.hash = newHash;
        }
    }

    performSearch(query) {
        let newHash;
        if (this.currentView === 'vendor' && this.currentVendorId) {
            newHash = `vendor/${this.currentVendorId}${query ? `/search=${encodeURIComponent(query)}` : ''}`;
        } else if (this.currentView === 'stores') {
            newHash = `stores${query ? `/search=${encodeURIComponent(query)}` : ''}`;
        } else if (this.currentView === 'dashboard') {
            newHash = `dashboard${query ? `/search=${encodeURIComponent(query)}` : ''}`;
        } else {
            newHash = `shop${query ? `/search=${encodeURIComponent(query)}` : ''}`;
        }

        if (window.location.hash === '#' + newHash) {
            this.handleRoute(); // Force refresh if hash is the same
        } else {
            window.location.hash = newHash;
        }

        this.toggleDrawer(false); // Close mobile drawer so results are visible
    }

    async updateSearchPlaceholder() {
        const inputs = [this.searchInput, this.mobileSearchInput];
        let placeholder = "Search for products, electronics, health...";
        
        if (this.currentView === 'vendor' && this.currentVendorId) {
            const vendor = await db.getVendor(this.currentVendorId);
            if (vendor) {
                placeholder = `Search in ${vendor.storeName}...`;
            }
        } else if (this.currentView === 'stores') {
            placeholder = "Search for stores by name or location...";
        }
        
        inputs.forEach(input => {
            if (input) {
                input.placeholder = placeholder;
                // Don't clear the value automatically, but update look
            }
        });
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        const parts = hash.split('/');
        const view = parts[0];
        const param = parts.slice(1).join('/');

        // Save progress if leaving registration
        if (this.currentView === 'register') {
            this.saveRegistrationDraft();
        }

        const oldView = this.currentView;
        // Set App Context
        this.currentView = view;
        this.currentVendorId = (view === 'vendor') ? param.split('/')[0] : null;

        // Update UI based on context
        await this.updateNav(); // Refresh drawer and nav context
        await this.updateSearchPlaceholder();
        this.updateBottomNav();
        await this.updateNotificationBadges();
        
        // ... (rest of handleRoute)
        
        switch(view) {
            case 'home': await this.renderHome(); break;
            case 'shop': await this.renderShop(param); break;
            case 'product': await this.renderProduct(param); break;
            case 'vendor': await this.renderVendor(param); break;
            case 'login': this.renderLogin(); break;
            case 'register': this.renderRegister(); break;
            case 'dashboard': await this.renderDashboard(param); break;
            case 'profile': await this.renderProfileHub(); break;
            case 'add-product': this.renderAddProductView(); break;
            case 'saved': await this.renderSavedItems(); break;
            case 'followers': await this.renderFollowers(); break;
            case 'inbox': await this.renderInbox(); break;
            case 'stores': await this.renderStores(param); break;
            case 'documents': await this.renderDocumentsList(param); break;
            case 'document-view': await this.renderDocumentView(param); break;
            case 'document-form': this.renderDocumentForm(param); break;
            case 'chat': await this.renderChat(param); break;
            case 'settings': this.renderSettings(); break;
            case 'change-password': this.renderChangePassword(); break;
            case 'subscription': this.renderSubscription(); break;
            case 'feedback': await this.renderFeedback(); break;
            case 'terms': this.renderTerms(); break;
            default: await this.renderHome(); break;
        }
    }

    async updateNav() {
        const loggedIn = auth.isLoggedIn();
        const user = loggedIn ? auth.getUser() : null;

        // Desktop Nav
        if(loggedIn) {
            this.navActionsEl.innerHTML = `
                <div class="d-flex align-center gap-2">
                    <span class="text-muted hide-mobile" style="margin-right: 1rem;"><i class="fa-solid fa-shop"></i> ${user.storeName}</span>
                    <button class="nav-icon-btn" id="topInboxBtn" onclick="app.navigate('inbox')" style="position: relative; margin-right: 0.5rem;">
                        <i class="fa-solid fa-message" style="font-size: 1.25rem; color: var(--text-muted);"></i>
                    </button>
                    <button class="btn btn-primary" onclick="app.navigate('profile')">Profile</button>
                    <button class="btn btn-outline" onclick="app.logout()">Logout</button>
                </div>
            `;
        } else {
            this.navActionsEl.innerHTML = `
                <button class="btn btn-outline" onclick="app.navigate('login')">Vendor Login</button>
                <button class="btn btn-primary" onclick="app.navigate('register')">Become a Vendor</button>
            `;
        }

        // Mobile Drawer
        const drawerLogoutContainer = document.getElementById('drawerLogoutContainer');
        if (drawerLogoutContainer) {
            drawerLogoutContainer.innerHTML = loggedIn ? `
                <button class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-radius: 1rem;" onclick="app.logout()">
                    <i class="fa-solid fa-right-from-bracket"></i> Logout
                </button>
            ` : '';
        }

        this.mobileDrawerLinks.innerHTML = `
            ${loggedIn ? `
                <li><a href="javascript:void(0)" onclick="app.navigate('profile'); app.toggleDrawer(false)"><i class="fa-solid fa-circle-user"></i> My Profile Hub</a></li>
                <li><a href="javascript:void(0)" onclick="app.navigate('dashboard'); app.toggleDrawer(false)"><i class="fa-solid fa-chart-line"></i> Sales Dashboard</a></li>
                <li><a href="javascript:void(0)" onclick="app.navigate('add-product'); app.toggleDrawer(false)"><i class="fa-solid fa-plus"></i> Add New Product</a></li>
                <li><a href="javascript:void(0)" onclick="app.navigate('inbox'); app.toggleDrawer(false)"><i class="fa-solid fa-message"></i> Messages</a></li>
                <li style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05);">
                    <a href="javascript:void(0)" onclick="app.logout()" style="color: #dc3545;"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </li>
            ` : `
                <li style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05);">
                    <a href="javascript:void(0)" onclick="app.navigate('login'); app.toggleDrawer(false)"><i class="fa-solid fa-user"></i> Vendor Login</a>
                </li>
                <li><a href="javascript:void(0)" onclick="app.navigate('register'); app.toggleDrawer(false)" class="text-gradient"><i class="fa-solid fa-plus"></i> Become a Vendor</a></li>
            `}
        `;

        // Mobile Drawer Categories
        if(this.drawerCategoryList) {
            this.drawerCategoryList.innerHTML = await createDrawerCategoryList();
        }

        // Bottom Nav Active State & Profile Link
        this.updateBottomNav();
    }

    updateBottomNav() {
        if(!this.bottomNav) return;
        const loggedIn = auth.isLoggedIn();
        const profileBtn = document.getElementById('profileBtn');

        if(profileBtn) {
            profileBtn.innerHTML = `
                <div class="nav-icon-wrapper">
                    <i class="fa-solid fa-user"></i>
                </div>
                <span>Profile</span>
            `;
        }

        // Set Active class
        const navItems = this.bottomNav.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const view = item.getAttribute('data-view');
            if(view === this.currentView) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    logout() {
        auth.logout();
        this.navigate('home');
    }

    async updateNotificationBadges() {
        const user = auth.getUser();
        if (!user) return;

        const unreadCount = await db.getUnreadCount(user.id);
        
        // ... (rest of updateNotificationBadges)
    }

    // --- Views ---

    async renderHome() {
        const products = (await db.getProducts()).slice(0, 50); // Fetch more products for a better grid experience
        const sidebar = await createSidebar();
        
        const html = `
            <div class="home-split-layout">
                <!-- Sidebar: Categories -->
                ${sidebar}

                <!-- Main Content: Hero + Products -->
                <section class="main-panel fade-in">
                    <!-- Hero integrated here -->
                    <div class="glass-panel mb-4" style="background: linear-gradient(135deg, rgba(0, 0, 0, 0.03), rgba(217, 0, 0, 0.05), rgba(250, 204, 21, 0.1)); padding: clamp(2rem, 5vh, 4rem) 2rem; border-radius: 2rem; text-align: center; position: relative; overflow: hidden; margin-top: 0;">
                        <h1 class="text-gradient welcome-note" style="margin-bottom: 1rem;">Discover Amazing Products</h1>
                        <p style="font-size: clamp(0.9rem, 3vw, 1.15rem); max-width: 600px; margin: 0 auto 1.5rem;" class="text-muted">
                            Shop from top vendors across Uganda
                        </p>
                        <div class="d-flex justify-center gap-2">
                            <button class="btn btn-primary" style="font-size: 1rem; padding: 0.6rem 1.5rem;" onclick="app.navigate('shop')">Shop</button>
                            <button class="btn btn-outline" style="font-size: 1rem; padding: 0.6rem 1.5rem;" onclick="app.navigate('stores')">Find Store</button>
                        </div>
                    </div>

                    <!-- Products Grid -->
                    <div class="grid grid-responsive">
                        ${products.map(p => createProductCard(p)).join('')}
                    </div>
                </section>
            </div>
        `;
        this.appEl.innerHTML = html;
        // this.appEl.style.padding = "0"; // Removed: Handled by .has-split-layout logic
    }

    async renderShop(param) {
        let title = "All Products";
        let filters = {};
        
        if (param && param.startsWith('search=')) {
            const query = decodeURIComponent(param.replace('search=', ''));
            filters.search = query;
            title = `Search Results for "${query}"`;
        } else if (param) {
            filters.category = decodeURIComponent(param);
            title = `${filters.category} Products`;
        }

        const products = await db.getProducts(filters);
        const sidebar = await createSidebar();

        this.appEl.innerHTML = `
            <div class="home-split-layout">
                <!-- Sidebar: Categories -->
                ${sidebar}

                <!-- Main Content: Products Grid -->
                <section class="main-panel fade-in">
                    <div class="d-flex justify-between align-center mb-4">
                        <h2>${title}</h2>
                        <div class="text-muted hide-mobile">${products.length} Items Found</div>
                    </div>
                    
                    ${products.length > 0 ? `
                        <div class="grid grid-responsive">
                            ${products.map(p => createProductCard(p)).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-5 glass-panel" style="padding: 4rem 1rem; margin: 0 2rem;">
                            <i class="fa-solid fa-box-open" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                            <p class="text-muted">No products found in this category.</p>
                        </div>
                    `}
                </section>
            </div>
        `;
        // this.appEl.style.padding = "0"; // Removed: Handled by .has-split-layout logic
    }

    renderTerms() {
        this.appEl.innerHTML = `
            <div class="container py-5 fade-in">
                <div class="max-width-800" style="max-width: 800px; margin: 0 auto;">
                    <div class="d-flex align-center justify-between" style="margin-bottom: 1rem;">
                        <div class="d-flex align-center gap-3">
                            <button class="btn btn-outline" style="padding: 0.5rem; border-radius: 50%; width: 45px; height: 45px;" onclick="app.navigate('home')">
                                <i class="fa-solid fa-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="mb-0 text-gradient" style="font-size: clamp(1.5rem, 5vw, 2.5rem); line-height: 1;">Terms & Conditions</h1>
                                <p class="mt-1" style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 0;">Tap a section to expand details</p>
                            </div>
                        </div>
                    </div>

                    <div class="terms-accordion" style="margin-top: 0.5rem;">
                        <!-- 1. Nature of the Platform -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: var(--text-main);"><i class="fa-solid fa-handshake fa-fw"></i> 1. The Nature of the Platform</h3>
                                <i class="fa-solid fa-chevron-down" style="color: var(--text-main);"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <ul style="list-style: square; padding-left: 1.2rem; color: #475569; font-size: 0.95rem;">
                                        <li class="mb-2"><strong>Role:</strong> UgaTrade provides the digital infrastructure for sellers to list products and buyers to find them.</li>
                                        <li class="mb-2"><strong>No Agency:</strong> The platform does not act as an agent, auctioneer, or representative for any user.</li>
                                        <li><strong>Independent Contractors:</strong> Sellers are independent businesses and not employees or partners of UgaTrade.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Data Collection and Purpose -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: var(--text-main);"><i class="fa-solid fa-database fa-fw"></i> 2. Data Collection and Purpose</h3>
                                <i class="fa-solid fa-chevron-down" style="color: var(--text-main);"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <p style="color: #475569;">UgaTrade only collects the following information necessary to provide our marketplace services:</p>
                                    <ul style="list-style: square; padding-left: 1.2rem; margin-top: 1rem; color: #475569; font-size: 0.95rem;">
                                        <li class="mb-2"><strong>User / Store Name:</strong> To identify you on the platform.</li>
                                        <li class="mb-2"><strong>Email Address:</strong> Used for account security, notifications, and official communication.</li>
                                        <li class="mb-2"><strong>Phone Number:</strong> To facilitate direct communication between buyers and sellers.</li>
                                        <li><strong>Location:</strong> To help users find relevant trades within their geographical area.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Seller Responsibility -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: var(--text-main);"><i class="fa-solid fa-shield-halved fa-fw"></i> 3. Seller Responsibility</h3>
                                <i class="fa-solid fa-chevron-down" style="color: var(--text-main);"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <ul style="list-style: square; padding-left: 1.2rem; color: #475569; font-size: 0.95rem;">
                                        <li class="mb-2"><strong>Accuracy:</strong> Sellers must provide accurate descriptions and images as required by Section 24 of the Electronic Transactions Act.</li>
                                        <li class="mb-2"><strong>Fulfillment:</strong> Sellers are solely responsible for delivery, quality, and any warranties.</li>
                                        <li><strong>Compliance:</strong> Sellers must hold the necessary rights to sell the products and ensure they don't infringe on intellectual property.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- 4. Boosting and Advertising Services -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: var(--text-main);"><i class="fa-solid fa-rocket fa-fw"></i> 4. Boosting and Advertising Services</h3>
                                <i class="fa-solid fa-chevron-down" style="color: var(--text-main);"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <ul style="list-style: square; padding-left: 1.2rem; color: #475569; font-size: 0.95rem;">
                                        <li class="mb-2"><strong>Service Delivery:</strong> Boosting increases visibility but does not guarantee sales.</li>
                                        <li class="mb-2"><strong>Payment:</strong> All boosting fees are non-refundable once the campaign begins.</li>
                                        <li><strong>Content Rights:</strong> The admin reserves the right to remove any boosted ad that violates platform policies (e.g., illegal goods, Pornographic materials) without a refund.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- 5. Physical Inspection & Payment Policy -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: var(--primary);"><i class="fa-solid fa-circle-exclamation fa-fw"></i> 5. Physical Inspection & Payment Policy</h3>
                                <i class="fa-solid fa-chevron-down" style="color: var(--primary);"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <ul style="list-style: square; padding-left: 1.2rem; color: #475569; font-size: 0.95rem;">
                                        <li class="mb-2"><strong>Inspection Requirement:</strong> For your protection, UgaTrade strongly advises all buyers to physically inspect goods to verify quality, quantity, and condition before making any payment.</li>
                                        <li class="mb-2"><strong>No Advance Payments:</strong> Buyers are cautioned against sending money (via Mobile Money or Bank Transfer) to a Seller before receiving and approving the items.</li>
                                        <li class="mb-2"><strong>Buyer’s Risk:</strong> If a Buyer chooses to pay a Seller in advance without seeing the goods, they do so at their own risk. UgaTrade shall not be held liable for any financial loss, fraudulent claims, or dissatisfaction resulting from pre-payments.</li>
                                        <li><strong>Verification of Identity:</strong> We recommend meeting Sellers in safe, public locations to conduct inspections and complete the transaction.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- 6. Limitation of Liability and Disclaimers -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: var(--text-main);"><i class="fa-solid fa-scale-balanced fa-fw"></i> 6. Limitation of Liability and Disclaimers</h3>
                                <i class="fa-solid fa-chevron-down" style="color: var(--text-main);"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <ul style="list-style: square; padding-left: 1.2rem; color: #475569; font-size: 0.95rem;">
                                        <li class="mb-2"><strong>"As Is" Basis:</strong> The platform is provided "as is" without warranties of any kind.</li>
                                        <li class="mb-2"><strong>Transaction Risks:</strong> UgaTrade is not liable for any losses arising from transactions, including fraud, non-delivery, or defective goods.</li>
                                        <li><strong>Third-Party Content:</strong> UgaTrade is not responsible for the accuracy of seller-generated content.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- 7. Disputes & Returns -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: var(--text-main);"><i class="fa-solid fa-gavel fa-fw"></i> 7. Disputes & Returns</h3>
                                <i class="fa-solid fa-chevron-down" style="color: var(--text-main);"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <p style="color: #475569; margin-bottom: 0.75rem;"><strong>User Disputes:</strong> Buyers and sellers must resolve disputes directly. UgaTrade may offer mediation but is not obligated to do so.</p>
                                    <p style="color: #475569;"><strong>Return Policies:</strong> Each Seller may have a different return policy. You are encouraged to review the Seller’s store profile before purchasing.</p>
                                </div>
                            </div>
                        </div>

                        <!-- 8. Prohibited Conduct -->
                        <div class="accordion-item glass-panel" onclick="app.toggleTermsAccordion(this)">
                            <div class="accordion-header">
                                <h3 style="color: #e11d48;"><i class="fa-solid fa-ban fa-fw"></i> 8. Prohibited Conduct</h3>
                                <i class="fa-solid fa-chevron-down" style="color: #e11d48;"></i>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-inner">
                                    <p style="color: #475569;">UgaTrade reserve the right to suspend or terminate accounts for:</p>
                                    <ul style="list-style: square; padding-left: 1.2rem; margin-top: 1rem; color: #475569; font-size: 0.95rem;">
                                        <li class="mb-2">Listing illegal or prohibited items (e.g., stolen property, regulated drugs, pornographic material).</li>
                                        <li class="mb-2">Engaging in fraudulent behavior or "scamming" other users.</li>
                                        <li>Circumventing platform rules to avoid fees.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="terms-footer-action">
                        <button class="btn btn-primary" style="padding: 1rem 3rem; font-size: 1.1rem; border-radius: 1.5rem;" onclick="app.handleTermsAccept()">Accept & Continue</button>
                        <p class="mt-3" style="font-size: 0.85rem; color: #64748b;">Last Updated: April 21, 2026</p>
                    </div>
                </div>
            </div>
        `;
    }



    toggleTermsAccordion(element) {
        const isActive = element.classList.contains('active');
        
        // Close all other items (One-at-a-time logic)
        document.querySelectorAll('.accordion-item').forEach(item => {
            item.classList.remove('active');
        });

        // Toggle current item
        if (!isActive) {
            element.classList.add('active');
        }
    }

    handleTermsAccept() {
        this.termsAccepted = true; // Auto-tick the checkbox on the registration page
        if (auth.isLoggedIn()) {
            this.navigate('profile');
        } else {
            this.navigate('register');
        }
    }

    saveRegistrationDraft() {
        const form = document.getElementById('regForm');
        if (form) {
            this.registrationDraft = {
                name: document.getElementById('regName')?.value || '',
                storeName: document.getElementById('regStore')?.value || '',
                location: document.getElementById('regLoc')?.value || '',
                email: document.getElementById('regEmail')?.value || '',
                phone: document.getElementById('regPhone')?.value || '',
                whatsapp: document.getElementById('regWa')?.value || '',
                password: document.getElementById('regPass')?.value || '',
                scrollPos: this.appEl.scrollTop
            };
        }
    }



    async renderProduct(id) {
        const p = await db.getProduct(id);
        if (!p) return this.navigate('home');
        
        const currentUser = auth.getUser();
        if (!currentUser || currentUser.id !== p.vendorId) {
            await db.incrementView(id);
        }
        
        const vendor = await db.getVendor(p.vendorId);
        if (!vendor) return this.navigate('home');

        const message = encodeURIComponent(`Hi ${vendor.storeName}, I'm interested in your product *${p.name}* priced at ${formatPrice(p.price)} on UgaTrade.`);
        const whatsappLink = `https://api.whatsapp.com/send?phone=${vendor.whatsapp}&text=${message}`;

        this.appEl.innerHTML = `
            <div class="content-center-container fade-in">
                <div class="container">
                    <div class="glass-panel product-detail-layout" style="padding: clamp(1rem, 5vw, 3rem);">
                    <style>
                        .product-detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1rem, 5vw, 3rem); }
                        @media (max-width: 768px) { .product-detail-layout { grid-template-columns: 1fr; } }
                    </style>
                    <!-- Images -->
                    <div style="min-width: 0;">
                        <img id="mainProductImage" src="${p.images[0]}" alt="${p.name}" class="img-placeholder" style="width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-bottom: 1rem; transition: var(--transition-smooth);">
                        ${p.images.length > 1 ? `
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; width: 100%;">
                                ${p.images.slice(0, 4).map(img => `
                                    <img src="${img}" 
                                         class="img-placeholder thumbnail-img" 
                                         style="width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: var(--radius-sm); border: 2px solid transparent; cursor: pointer; transition: all 0.2s;"
                                         onclick="document.getElementById('mainProductImage').src = this.src; document.querySelectorAll('.thumbnail-img').forEach(t => t.style.borderColor = 'transparent'); this.style.borderColor = 'var(--primary)';">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Details -->
                    <div>
                        <div class="badge badge-primary mb-2" style="display:inline-block">${p.category}</div>
                        <h1 class="detail-product-name">${p.name}</h1>
                        <p class="text-muted mb-2"><i class="fa-regular fa-clock"></i> Posted ${new Date(p.createdAt).toLocaleDateString()}</p>
                        <div class="detail-product-price" style="margin-bottom: 0.5rem;">
                            ${formatPrice(p.price)}
                        </div>
                        
                        <!-- Actions -->
                        <div class="product-actions-row">
                            <button class="product-action-btn liked ${await db.isInteracted(auth.getUser()?.id, p.id, 'likes') ? 'active' : ''}" 
                                    onclick="window.app.handleProductAction('${p.id}', 'likes')">
                                <i class="${await db.isInteracted(auth.getUser()?.id, p.id, 'likes') ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                                <span>Like</span>
                            </button>
                            <button class="product-action-btn saved ${await db.isInteracted(auth.getUser()?.id, p.id, 'saves') ? 'active' : ''}" 
                                    onclick="window.app.handleProductAction('${p.id}', 'saves')">
                                <i class="${await db.isInteracted(auth.getUser()?.id, p.id, 'saves') ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
                                <span>Save</span>
                            </button>
                            <button class="product-action-btn" onclick="window.app.shareProduct('${p.id}')">
                                <i class="fa-solid fa-share-nodes"></i>
                                <span>Share</span>
                            </button>
                        </div>
                        
                        <div class="glass-panel mb-4" style="padding: 1.5rem; background: var(--bg-light); border: 1px solid rgba(0,0,0,0.05);">
                            <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem;">Description</h3>
                            <p style="white-space: pre-wrap;">${p.description}</p>
                        </div>
                        
                        <div class="glass-panel mb-4" style="padding: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                            <div class="d-flex align-center gap-2">
                                <div style="width: 40px; height: 40px; background: var(--accent); color: white; border-radius: 50%; display: flex; justify-content:center; align-items:center; font-size: 1.2rem;">${vendor.storeName.charAt(0)}</div>
                                <div>
                                    <h4 style="margin: 0; font-size: 1rem;">${vendor.storeName}</h4>
                                    <span class="text-muted text-sm" style="font-size: 0.8rem;"><i class="fa-solid fa-check-circle" style="color:var(--secondary)"></i> Verified</span>
                                </div>
                            </div>
                            <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="app.navigate('vendor', '${vendor.id}')">View Store</button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <a href="${whatsappLink}" target="_blank" class="btn btn-whatsapp text-center" style="padding: 0.8rem 1rem;">
                                <i class="fa-brands fa-whatsapp" style="font-size: 1.3rem;"></i> WhatsApp
                            </a>
                            <button class="btn btn-primary text-center" style="display:flex; justify-content:center; align-items:center; gap: 0.5rem; padding: 0.8rem 1rem;" onclick="app.startChat('${vendor.id}', '${p.id}')">
                                <i class="fa-regular fa-comment-dots" style="font-size: 1.3rem;"></i> Chat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    }

    async handleProductAction(productId, type) {
        const user = auth.getUser();
        if (!user) return; // Do nothing for guests as requested
        
        await db.toggleInteraction(user.id, productId, type);
        await this.renderProduct(productId);
    }

    async shareProduct(productId) {
        const p = db.getProduct(productId);
        if (!p) return;
        
        const shareData = {
            title: p.name,
            text: `Check out this ${p.name} on UgaTrade!`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Product link copied to clipboard!');
            }
        } catch (err) {
            console.error('Share failed:', err);
        }
    }

    async renderSavedItems() {
        const user = auth.getUser();
        if (!user) return this.navigate('register');
        
        const products = await db.getSavedProducts(user.id);
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-5">
                <div class="d-flex align-center justify-between mb-4">
                    <div class="d-flex align-center gap-2">
                        <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2 class="mb-0">Saved Items</h2>
                    </div>
                </div>

                ${products.length === 0 ? `
                    <div class="glass-panel text-center py-5" style="background: white;">
                        <i class="fa-regular fa-bookmark mb-3" style="font-size: 3rem; opacity: 0.2;"></i>
                        <p class="text-muted">You haven't saved any items yet.</p>
                        <button class="btn btn-primary mt-3" onclick="app.navigate('shop')">Explore Products</button>
                    </div>
                ` : `
                    <div class="grid grid-responsive">
                        ${(await Promise.all(products.map(p => createProductCard(p)))).join('')}
                    </div>
                `}
            </div>
        `;
    }

    async renderVendor(param) {
        const parts = param.split('/');
        const id = parts[0];
        let searchQuery = '';
        let categoryQuery = '';
        
        if (parts[1]) {
            if (parts[1].startsWith('search=')) {
                searchQuery = decodeURIComponent(parts[1].replace('search=', ''));
            } else if (parts[1].startsWith('category=')) {
                categoryQuery = decodeURIComponent(parts[1].replace('category=', ''));
            }
        }

        const vendor = await db.getVendor(id);
        if (!vendor) return this.navigate('home');
        
        const filters = { vendorId: id };
        if (searchQuery) filters.search = searchQuery;
        if (categoryQuery) filters.category = categoryQuery;

        const products = await db.getProducts(filters);
        const user = auth.getUser();
        const isFollowing = user ? await db.isFollowing(user.id, id) : false;
        const followerCount = await db.getFollowerCount(id);
        const avgRating = await db.getAverageRating(id);
        const reviewsHtml = await this.renderReviewsList(id);

        this.appEl.innerHTML = `
            <div class="home-split-layout">
                ${await createSidebar()}
                
                <section class="container" style="position: relative; margin-top: -60px; padding-bottom: 5rem;">
                    <div class="glass-panel vendor-header-card">
                        <div class="vendor-header-main">
                            <div class="vendor-avatar-large">
                                ${vendor.profilePic ? `<img src="${vendor.profilePic}">` : vendor.storeName.charAt(0)}
                            </div>
                            <div class="vendor-info-main">
                                <div class="d-flex align-center gap-2 flex-wrap">
                                    <h1 class="mb-0">${vendor.storeName}</h1>
                                    ${vendor.isVerified ? `<span class="verified-badge"><i class="fa-solid fa-check-circle"></i> Verified Store</span>` : ''}
                                </div>
                                <p class="text-muted"><i class="fa-solid fa-location-dot"></i> ${vendor.location || 'Ugandawide'}</p>
                            </div>
                            <div class="vendor-actions-main">
                                <button class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'}" onclick="app.handleToggleFollow('${id}')">
                                    <i class="fa-solid ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i> ${isFollowing ? 'Following' : 'Follow'}
                                </button>
                                <button class="btn btn-outline" onclick="app.startChat('${id}')">
                                    <i class="fa-solid fa-message"></i> Message
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="store-stats-row glass-panel my-4">
                        <div class="store-stat-item">
                            <span class="store-stat-value">${followerCount}</span>
                            <span class="store-stat-label">Followers</span>
                        </div>
                        <div class="store-stat-item">
                            <span class="store-stat-value">${avgRating} <i class="fa-solid fa-star" style="color: #f59e0b; font-size: 0.9rem;"></i></span>
                            <span class="store-stat-label">Rating</span>
                        </div>
                        <div class="store-stat-item">
                            <span class="store-stat-value">${products.length}</span>
                            <span class="store-stat-label">Products</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-responsive">
                        ${(await Promise.all(products.map(p => createProductCard(p)))).join('')}
                    </div>

                    <div class="mt-5">
                        <h3 class="mb-4">Customer Reviews</h3>
                        <div class="glass-panel p-4 mb-4" style="background: white;">
                            <h4 class="mb-3">Leave a Review</h4>
                            <div class="star-rating-input mb-3">
                                <i class="fa-solid fa-star active" data-val="1" onclick="app.handleStarClick(1)"></i>
                                <i class="fa-solid fa-star active" data-val="2" onclick="app.handleStarClick(2)"></i>
                                <i class="fa-solid fa-star active" data-val="3" onclick="app.handleStarClick(3)"></i>
                                <i class="fa-solid fa-star active" data-val="4" onclick="app.handleStarClick(4)"></i>
                                <i class="fa-solid fa-star active" data-val="5" onclick="app.handleStarClick(5)"></i>
                                <input type="hidden" id="reviewRating" value="5">
                            </div>
                            <textarea id="reviewComment" class="form-control mb-3" rows="3" placeholder="Write your experience with this vendor..."></textarea>
                            <button class="btn btn-primary" onclick="app.submitReview('${id}')">Submit Review</button>
                        </div>
                        <div class="reviews-list">
                            ${reviewsHtml}
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    async handleToggleFollow(vendorId) {
        const user = auth.getUser();
        if (!user) return alert("Please log in to follow this vendor.");
        
        await db.toggleFollow(user.id, vendorId);
        await this.handleRoute(); // Refresh view
    }

    handleStarClick(rating) {
        const stars = document.querySelectorAll('.star-rating-input i');
        document.getElementById('reviewRating').value = rating;
        stars.forEach(s => {
            const val = parseInt(s.getAttribute('data-val'));
            if(val <= rating) s.classList.add('active');
            else s.classList.remove('active');
        });
    }

    async submitReview(vendorId) {
        const rating = parseInt(document.getElementById('reviewRating').value);
        const comment = document.getElementById('reviewComment').value;
        const user = auth.getUser();
        
        if(!comment.trim()) return alert("Please add a comment.");

        const review = {
            userId: user ? user.id : 'guest',
            userName: user ? user.storeName : 'Guest Buyer',
            rating: rating,
            comment: comment
        };

        await db.addReview(vendorId, review);
        await this.handleRoute(); // Refresh view
    }

    async renderReviewsList(vendorId) {
        const reviews = await db.getReviews(vendorId);
        if (reviews.length === 0) {
            return `<p class="text-muted text-center py-4">No reviews yet. Be the first to rate this vendor!</p>`;
        }

        return reviews.map(r => `
            <div class="review-card">
                <div class="d-flex justify-between align-center mb-2">
                    <strong style="color: var(--primary)">${r.userName}</strong>
                    <span class="text-muted" style="font-size: 0.8rem;">${new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="rating-stars mb-2">
                    ${Array(5).fill(0).map((_, i) => `<i class="${i < r.rating ? 'fa-solid' : 'fa-regular'} fa-star"></i>`).join('')}
                </div>
                <p class="mb-0" style="font-size: 0.95rem;">${r.comment}</p>
            </div>
        `).join('');
    }

    async renderFeedback() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        
        // Clear notifications
        await db.updateVendor(user.id, { lastFeedbackViewedAt: Date.now() });

        const reviews = await db.getReviews(user.id);
        const avgRating = await db.getAverageRating(user.id);
        const reviewsListHtml = await this.renderReviewsList(user.id);
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-5" style="max-width: 100%; padding: clamp(1rem, 5vw, 3rem);">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Customer Feedback</h2>
                </div>

                <div class="grid grid-cols-1 gap-4">
                    <!-- Rating Summary Card -->
                    <div class="glass-panel p-4 mb-2" style="background: white;">
                        <div class="d-flex align-center gap-4 flex-wrap">
                            <div class="text-center" style="padding-right: 2rem; border-right: 1px solid #eee;">
                                <div style="font-size: 3rem; font-weight: 800; color: var(--text-main); line-height: 1;">${avgRating}</div>
                                <div class="rating-stars my-2" style="font-size: 1.2rem;">
                                    ${Array(5).fill(0).map((_, i) => `<i class="${(i + 0.5) < avgRating ? 'fa-solid' : 'fa-regular'} fa-star" style="color: #f59e0b;"></i>`).join('')}
                                </div>
                                <p class="text-muted mb-0" style="font-size: 0.9rem;">${reviews.length} total reviews</p>
                            </div>
                            <div style="flex: 1; min-width: 250px;">
                                <h4 class="mb-3">Feedback Highlights</h4>
                                <p class="text-muted" style="font-size: 0.95rem;">
                                    ${reviews.length > 0 ? 
                                        `Customers generally find your store to be <strong>${avgRating >= 4 ? 'Excellent' : avgRating >= 3 ? 'Good' : 'Needs improvement'}</strong>.` : 
                                        'You haven\'t received any reviews yet. Encourage your customers to leave a review after an invoice is settled!'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Reviews List -->
                    <div class="reviews-section">
                        <h3 class="mb-3 px-1">All Reviews</h3>
                        <div class="grid grid-responsive" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
                            ${reviewsListHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async renderFollowers() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        const followers = await db.getFollowerObjects(user.id);
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-5">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Followers</h2>
                </div>

                ${followers.length === 0 ? `
                    <div class="glass-panel text-center py-5" style="background: white;">
                        <i class="fa-solid fa-users mb-3" style="font-size: 3rem; opacity: 0.2;"></i>
                        <p class="text-muted">You don't have any followers yet.</p>
                        <p style="font-size: 0.9rem;">Post more products and share your store link to grow your audience!</p>
                    </div>
                ` : `
                    <div class="grid grid-responsive" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
                        ${(await Promise.all(followers.map(f => createVendorCard(f)))).join('')}
                    </div>
                `}
            </div>
        `;
    }

    renderLogin() {
        this.appEl.innerHTML = `
            <div class="container fade-in" style="max-width: 500px; padding-top: clamp(1rem, 5vh, 4rem);">
                <div class="glass-panel" style="padding: clamp(1.5rem, 5vw, 3rem);">
                    <div class="text-center mb-4">
                        <i class="fa-solid fa-shop" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                        <h2>Vendor Login</h2>
                        <p class="text-muted">Welcome back to your store dashboard.</p>
                    </div>
                    
                    <form id="loginForm" onsubmit="event.preventDefault(); window.app.handleLoginSubmit()">
                        <div class="form-group">
                            <label>Email or Phone</label>
                            <input type="text" id="loginEmail" class="form-control" required placeholder="name@example.com or 2567...">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="loginPass" class="form-control" required placeholder="••••••••">
                        </div>
                        <div id="loginError" style="color:red; margin-bottom: 1rem; display:none;"></div>
                        <button type="submit" class="btn btn-primary w-100">Sign In</button>
                    </form>
                    
                    <p class="text-center mt-4 text-muted">Don't have a store? <a href="#register">Register here</a></p>
                </div>
            </div>
        `;
    }

    async handleLoginSubmit() {
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;
        const res = await auth.login(email, pass);
        if(res.success) {
            // Add a small delay for mobile devices to ensure stable environment before navigation
            setTimeout(() => {
                this.navigate('profile');
            }, 100);
        } else {
            const err = document.getElementById('loginError');
            err.innerText = res.message;
            err.style.display = 'block';
        }
    }

    renderRegister() {
        const draft = this.registrationDraft || {};
        
        this.appEl.innerHTML = `
            <div class="container fade-in" style="max-width: 600px; padding-top: 2rem;">
                <div class="glass-panel" style="padding: clamp(1.5rem, 5vw, 3rem);">
                    <div class="text-center mb-4">
                        <i class="fa-solid fa-store" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                        <h2>Become a Vendor</h2>
                        <p class="text-muted">Start selling on UgaTrade today.</p>
                    </div>
                    
                    <form id="regForm" onsubmit="event.preventDefault(); window.app.handleRegSubmit()">
                        <div class="grid grid-cols-2 grid-cols-1-mobile gap-2">
                            <div class="form-group span-all-mobile">
                                <label>Full Name</label>
                                <input type="text" id="regName" class="form-control" required value="${draft.name || ''}">
                            </div>
                            <div class="form-group span-all-mobile">
                                <label>Store Name</label>
                                <input type="text" id="regStore" class="form-control" required value="${draft.storeName || ''}">
                            </div>
                            <div class="form-group span-all-mobile">
                                <label>Store Location (City/Town)</label>
                                <input type="text" id="regLoc" class="form-control" required placeholder="e.g. Kampala" value="${draft.location || ''}">
                            </div>
                            <div class="form-group span-all-mobile">
                                <label>Email</label>
                                <input type="email" id="regEmail" class="form-control" required value="${draft.email || ''}">
                            </div>
                            <div class="form-group span-all-mobile">
                                <label>Phone (e.g. 256700112233)</label>
                                <input type="tel" id="regPhone" class="form-control" required value="${draft.phone || ''}">
                            </div>
                            <div class="form-group span-all-mobile" style="grid-column: span 2;">
                                <label>WhatsApp Number</label>
                                <input type="tel" id="regWa" class="form-control" required value="${draft.whatsapp || '256'}">
                            </div>
                            <div class="form-group span-all-mobile" style="grid-column: span 2;">
                                <label>Password</label>
                                <input type="password" id="regPass" class="form-control" required minlength="6" value="${draft.password || ''}">
                            </div>
                        </div>
                        
                        <div class="form-group mt-3">
                            <label class="d-flex align-center gap-2" style="cursor: pointer; font-weight: 500;">
                                <input type="checkbox" id="regTermsCheck" style="width: 18px; height: 18px; cursor: pointer;" ${this.termsAccepted ? 'checked' : ''}>
                                <span>I agree to the <a href="#terms" style="color: var(--primary); text-decoration: underline;">Terms and Conditions</a></span>
                            </label>
                        </div>

                        <div id="regError" style="color:#e11d48; margin-bottom: 1rem; display:none; padding: 0.75rem; background: #fff1f2; border-radius: 0.5rem; font-size: 0.9rem;"></div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem; border-radius: 1rem;">Create Store</button>
                    </form>
                    
                    <p class="text-center mt-4 text-muted">Already have a store? <a href="#login">Login</a></p>
                </div>
            </div>
        `;

        // Restore scroll position if drafting
        if (draft.scrollPos !== undefined && draft.scrollPos > 0) {
            setTimeout(() => {
                if (this.appEl) {
                    this.appEl.scrollTo({
                        top: draft.scrollPos,
                        behavior: 'instant'
                    });
                }
            }, 100); // Increased timeout for better reliability
        }
    }

    async handleRegSubmit() {
        const termsChecked = document.getElementById('regTermsCheck').checked;
        const err = document.getElementById('regError');
        
        if (!termsChecked) {
            err.innerText = "Please accept the Terms and Conditions to proceed.";
            err.style.display = 'block';
            return;
        }

        const info = {
            name: document.getElementById('regName').value,
            storeName: document.getElementById('regStore').value,
            location: document.getElementById('regLoc').value,
            email: document.getElementById('regEmail').value,
            phone: document.getElementById('regPhone').value,
            whatsapp: document.getElementById('regWa').value,
            password: document.getElementById('regPass').value,
        };
        const res = await auth.register(info);
        if(res.success) {
            this.registrationDraft = null; // Clear draft on success
            // Add a small delay for mobile devices to ensure stable environment before navigation
            setTimeout(() => {
                this.navigate('profile');
            }, 100);
        } else {
            err.innerText = res.message;
            err.style.display = 'block';
        }
    }

    async renderDashboard(param) {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const currentUser = auth.getUser();
        if(!currentUser) return this.navigate('login');
        
        const user = await db.getVendor(currentUser.id, true);
        if(!user) return this.navigate('home');
        
        let filters = {vendorId: user.id};
        let dashboardTitle = "Dashboard";
        
        if (param && param.startsWith('category=')) {
            const cat = decodeURIComponent(param.replace('category=', ''));
            filters.category = cat;
            dashboardTitle = `${cat} - Dashboard`;
        } else if (param && param.startsWith('search=')) {
            const q = decodeURIComponent(param.replace('search=', ''));
            filters.search = q;
            dashboardTitle = `Search: "${q}"`;
        }
        
        const myProducts = await db.getProducts(filters);
        const stats = await db.getVendorStats(user.id);
        const sidebar = await createSidebar();

        this.appEl.innerHTML = `
            <div class="home-split-layout">
                <!-- Sidebar: Categories -->
                ${sidebar}
                
                <!-- Main Content: Dashboard -->
                <section class="main-panel fade-in" style="padding: 1rem 5%;">
                    <div class="dashboard-header animate-fade-in">
                        <div class="d-flex align-center gap-2">
                            <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                                <i class="fa-solid fa-arrow-left"></i>
                            </button>
                            <div>
                                <h2 style="margin: 0;">${dashboardTitle}</h2>
                                <p class="text-muted" style="margin: 0;">Welcome back, ${user.name}</p>
                            </div>
                        </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary dashboard-btn" onclick="app.navigate('add-product')">
                            <i class="fa-solid fa-plus"></i> Add Product
                        </button>
                    </div>
                </div>
                
                <div class="dashboard-stats-grid">
                    <div class="glass-panel stat-card" onclick="app.navigate('subscription')" style="cursor: pointer;">
                        <h3 class="text-muted">Current Plan</h3>
                        <div class="stat-value" style="color: var(--secondary); font-size: 1.5rem;">${stats.plan.replace('_', ' ')}</div>
                    </div>
                    <div class="glass-panel stat-card">
                        <h3 class="text-muted">Products</h3>
                        <div class="stat-value" style="color: var(--primary)">${stats.totalProducts}</div>
                    </div>
                    <div class="glass-panel stat-card">
                        <h3 class="text-muted">Storage Left</h3>
                        <div class="stat-value" style="color: var(--primary)">${stats.storageLeft || 'N/A'}</div>
                    </div>
                </div>

                <div class="dashboard-product-grid animate-fade-in">
                    ${myProducts.map(p => `
                        <div class="product-card" style="cursor: default;">
                            <img src="${p.images[0] || 'https://via.placeholder.com/400x300?text=No+Image'}" class="product-img" alt="${p.name}" loading="lazy" decoding="async" onclick="app.navigate('product', '${p.id}')" style="cursor: pointer;">
                            <div class="product-info">
                                <h3 class="product-title">${p.name}</h3>
                                <div class="product-price">${formatPrice(p.price)}</div>
                                <div class="dashboard-list-stats mt-2 pb-2" style="border-bottom: 1px solid rgba(0,0,0,0.05); justify-content: space-between;">
                                    <span title="Total Views"><i class="fa-regular fa-eye"></i> ${p.views || 0}</span>
                                    <span title="Total Likes"><i class="fa-regular fa-heart"></i> ${p.likesCount || 0}</span>
                                    <span title="Total Saves"><i class="fa-regular fa-bookmark"></i> ${p.savesCount || 0}</span>
                                </div>
                                <button class="btn btn-outline mt-2 w-100" style="color: #dc3545; border-color: rgba(220, 53, 69, 0.2);" onclick="app.deleteProduct('${p.id}')">
                                    <i class="fa-solid fa-trash-can"></i> Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    ${myProducts.length === 0 ? `<p class="text-muted py-4 text-center w-100" style="grid-column: 1 / -1;">No products listed yet.</p>` : ''}
                </div>
                </section>
            </div>
        `;
    }

    async deleteProduct(productId) {
        if(confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            await db.deleteProduct(productId);
            await this.renderDashboard();
        }
    }

    async renderSettings() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = await db.getVendor(auth.getUser().id, true);
        if(!user) return this.navigate('profile');
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-4">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Store Settings</h2>
                </div>

                <div class="glass-panel" style="padding: clamp(1rem, 5vw, 2.5rem); max-width: 900px; margin: 0 auto;">
                    <form id="settingsForm" onsubmit="app.handleSettingsSubmit(event)">
                        <div class="settings-grid">
                            <!-- Visual Identity -->
                            <div class="span-all mb-4">
                                <h4 class="mb-3 border-bottom pb-2">Visual Identity</h4>
                                <div class="grid grid-cols-2 grid-cols-1-mobile gap-4">
                                    <div class="form-group">
                                        <label>Profile Picture</label>
                                        <div class="upload-zone" style="height: 120px;">
                                            <i class="fa-solid fa-camera"></i>
                                            <input type="file" id="setProfilePic" accept="image/*" onchange="app.handleImagePreview(event, 'profilePreview')">
                                        </div>
                                        <div id="profilePreview" class="mt-2 d-flex justify-center">
                                            ${user.profilePic ? `<img src="${user.profilePic}" class="preview-item" style="border-radius: 50%; width: 80px; height: 80px;">` : ''}
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Cover Photo</label>
                                        <div class="upload-zone" style="height: 120px;">
                                            <i class="fa-solid fa-image"></i>
                                            <input type="file" id="setCoverPic" accept="image/*" onchange="app.handleImagePreview(event, 'coverPreview')">
                                        </div>
                                        <div id="coverPreview" class="mt-2">
                                            ${user.coverPic ? `<img src="${user.coverPic}" class="preview-item" style="aspect-ratio: 3/1; width: 100%; height: auto; max-height: 150px;">` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Store Info -->
                            <div class="form-group">
                                <label>Store Name</label>
                                <input type="text" id="setStoreName" class="form-control" value="${user.storeName}" required>
                            </div>
                            <div class="form-group">
                                <label>Store Location</label>
                                <input type="text" id="setStoreLoc" class="form-control" value="${user.location || ''}" placeholder="e.g. Kampala">
                            </div>
                            
                            <div class="span-all my-2"></div>

                            <!-- Personal Info -->
                            <div class="form-group">
                                <label>Your Name</label>
                                <input type="text" id="setName" class="form-control" value="${user.name}" required>
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="setEmail" class="form-control" value="${user.email}" required>
                            </div>
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input type="tel" id="setPhone" class="form-control" value="${user.phone}" required>
                            </div>
                            <div class="form-group">
                                <label>WhatsApp Number</label>
                                <input type="tel" id="setWA" class="form-control" value="${user.whatsapp || ''}" required>
                            </div>
                        </div>

                        <div id="settingsMsg" style="margin: 1.5rem 0; padding: 1rem; border-radius: var(--radius-sm); display:none; text-align:center;"></div>
                        
                        <div class="d-flex justify-end gap-2 mt-4 border-top pt-4">
                            <button type="button" class="btn btn-outline" onclick="app.navigate('profile')">Cancel</button>
                            <button type="submit" class="btn btn-primary px-5" id="saveSettingsBtn">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderChangePassword() {
        if(!auth.isLoggedIn()) return this.navigate('login');

        this.appEl.innerHTML = `
            <div class="container fade-in py-4">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Change Password</h2>
                </div>

                <div class="glass-panel" style="padding: 2.5rem; max-width: 500px; margin: 0 auto;">
                    <div class="text-center mb-4">
                        <div style="width: 60px; height: 60px; background: rgba(0, 153, 212, 0.1); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.5rem;">
                            <i class="fa-solid fa-lock"></i>
                        </div>
                        <h3 style="margin: 0; font-weight: 800;">Secure Your Account</h3>
                        <p class="text-muted" style="font-size: 0.9rem;">Choose a strong password to keep your store safe.</p>
                    </div>

                    <form id="passwordForm" onsubmit="app.handlePasswordSubmit(event)">
                        <div class="form-group mb-3">
                            <label>Current Password</label>
                            <div style="position: relative;">
                                <input type="password" id="currentPass" class="form-control" required placeholder="••••••••">
                            </div>
                        </div>
                        <div class="form-group mb-3">
                            <label>New Password</label>
                            <div style="position: relative;">
                                <input type="password" id="newPass" class="form-control" required minlength="6" placeholder="••••••••">
                            </div>
                        </div>
                        <div class="form-group mb-4">
                            <label>Confirm New Password</label>
                            <div style="position: relative;">
                                <input type="password" id="confirmPass" class="form-control" required minlength="6" placeholder="••••••••">
                            </div>
                        </div>

                        <div id="passwordMsg" style="margin: 1rem 0; padding: 0.75rem; border-radius: var(--radius-sm); display:none; font-size: 0.9rem;"></div>
                        
                        <button type="submit" class="btn btn-primary w-100" id="savePasswordBtn" style="padding: 0.8rem;">
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    async handlePasswordSubmit(event) {
        event.preventDefault();
        const currentPass = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirmPass = document.getElementById('confirmPass').value;
        const saveBtn = document.getElementById('savePasswordBtn');
        const msg = document.getElementById('passwordMsg');

        if (newPass !== confirmPass) {
            msg.style.display = 'block';
            msg.style.background = '#fee2e2';
            msg.style.color = '#991b1b';
            msg.innerText = 'New passwords do not match.';
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerText = 'Updating...';

        const user = auth.getUser();
        const result = await db.updatePassword(user.id, currentPass, newPass);

        if (result.success) {
            msg.style.display = 'block';
            msg.style.background = '#dcfce7';
            msg.style.color = '#166534';
            msg.innerText = 'Password updated successfully!';
            
            // Clear form
            document.getElementById('passwordForm').reset();
            
            setTimeout(() => {
                this.navigate('profile');
            }, 1500);
        } else {
            msg.style.display = 'block';
            msg.style.background = '#fee2e2';
            msg.style.color = '#991b1b';
            msg.innerText = result.message;
            saveBtn.disabled = false;
            saveBtn.innerText = 'Update Password';
        }
    }

    async handleSettingsSubmit(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('saveSettingsBtn');
        const msg = document.getElementById('settingsMsg');
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';

        try {
            const user = auth.getUser();
            
            const updateData = {
                storeName: document.getElementById('setStoreName').value,
                location: document.getElementById('setStoreLoc').value,
                name: document.getElementById('setName').value,
                email: document.getElementById('setEmail').value,
                phone: document.getElementById('setPhone').value,
                whatsapp: document.getElementById('setWA').value,
            };

            if (this.imageBuffers['profilePreview']?.length > 0) {
                updateData.profilePic = this.imageBuffers['profilePreview'][0];
            }
            if (this.imageBuffers['coverPreview']?.length > 0) {
                updateData.coverPic = this.imageBuffers['coverPreview'][0];
            }

            await db.updateVendor(user.id, updateData);
            
            // Sync auth state
            auth.updateUser(updateData);

            msg.innerText = 'Settings saved successfully!';
            msg.style.display = 'block';
            msg.style.background = '#d1fae5';
            msg.style.color = '#065f46';

            setTimeout(() => {
                this.navigate('dashboard');
            }, 1000);

        } catch (error) {
            console.error(error);
            msg.innerText = 'Error saving settings.';
            msg.style.display = 'block';
            msg.style.background = '#fee2e2';
            msg.style.color = '#991b1b';
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Changes';
        }
    }

    async renderSubscription() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = await db.getVendor(auth.getUser().id, true);
        if(!user) return this.navigate('profile');
        // ...
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async handleImagePreview(event, previewId, maxFiles = 1) {
        const user = await db.getVendor(auth.getUser().id, true, true);
        const files = Array.from(event.target.files);
        const preview = document.getElementById(previewId);
        if (!preview) return;
        
        preview.innerHTML = ''; // Clear old previews
        this.imageBuffers[previewId] = []; // Reset buffer
        
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
        
        if (files.length > maxFiles) {
            alert(`Maximum ${maxFiles} images allowed.`);
            event.target.value = '';
            return;
        }

        // Show a temporary "Processing" state if there are files
        if (files.length > 0) {
            preview.innerHTML = '<p class="text-sm text-muted animate-pulse">Optimizing images...</p>';
        }

        try {
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                
                if (file.size > MAX_SIZE) {
                    alert(`File "${file.name}" is too large (> 5MB). Please choose a smaller file.`);
                    continue;
                }

                const rawB64 = await this.fileToBase64(file);
                
                // Determine compression settings based on preview type
                let maxWidth = 1024;
                let quality = 0.7;
                
                if (previewId === 'profilePreview') {
                    maxWidth = 400;
                    quality = 0.7;
                } else if (previewId === 'coverPreview') {
                    maxWidth = 1200;
                    quality = 0.6;
                }

                const compressed = await this.compressImage(rawB64, maxWidth, quality);
                this.imageBuffers[previewId].push(compressed);
            }

            // Render final compressed previews
            preview.innerHTML = '';
            this.imageBuffers[previewId].forEach(src => {
                const img = document.createElement('img');
                img.src = src;
                img.className = 'preview-item';
                if (previewId === 'profilePreview') img.style.cssText = 'border-radius: 50%; width: 80px; height: 80px;';
                if (previewId === 'coverPreview') img.style.cssText = 'aspect-ratio: 3/1; width: 100%; height: auto; max-height: 150px;';
                preview.appendChild(img);
            });

        } catch (error) {
            console.error("Image processing error:", error);
            preview.innerHTML = '<span class="text-danger">Error processing images.</span>';
        }
    }

    async handlePaymentSuccess(docType, plan) {
        const user = await db.getVendor(auth.getUser().id, true);
        if(!user) return this.navigate('home');
        const url = encodeURIComponent(window.location.origin + window.location.pathname);
        const text = encodeURIComponent(`Shop amazing items on UgaTrade! ${url}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
        
        setTimeout(async () => {
            await db.addBonusUploads(user.id, 10);
            alert("Awesome! You've successfully claimed +10 bonus uploads.");
            await this.renderDashboard();
        }, 1500);
    }

    async handlePaymentSubmission(event) {
        event.preventDefault();
        const tid = document.getElementById('transactionId').value.trim();
        const statusDiv = document.getElementById('paymentStatus');
        const submitBtn = document.getElementById('submitPaymentBtn');
        const apiKey = localStorage.getItem('httpsms_api_key');

        if (!apiKey) {
            alert("Please configure your httpSMS API Key at the bottom of the page first.");
            return;
        }

        statusDiv.style.display = 'block';
        statusDiv.style.background = '#f1f5f9';
        statusDiv.style.color = '#475569';
        statusDiv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying payment...';
        submitBtn.disabled = true;

        try {
            const result = await db.verifyPayment(tid, apiKey);
            
            if (result.success) {
                await db.upgradePlan(auth.getUser().id, result.plan, result.duration);
                
                statusDiv.style.background = '#dcfce7';
                statusDiv.style.color = '#166534';
                statusDiv.innerHTML = `
                    <div class="mb-2"><i class="fa-solid fa-circle-check" style="font-size: 2rem;"></i></div>
                    <strong>Success!</strong><br>
                    Payment of UGX ${result.amount.toLocaleString()} verified.<br>
                    Your ${result.plan.replace('_', ' ')} Plan is now active!
                `;

                setTimeout(() => {
                    this.navigate('dashboard');
                }, 3000);
            }
        } catch (error) {
            statusDiv.style.background = '#fee2e2';
            statusDiv.style.color = '#991b1b';
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${error.message}`;
            submitBtn.disabled = false;
        }
    }

    async handleAddProduct(event) {
        if(event) event.preventDefault();
        
        const saveBtn = document.getElementById('publishBtn');
        const errorDiv = document.getElementById('addError');
        if(saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerText = 'Publishing...';
        }
        if(errorDiv) errorDiv.style.display = 'none';

        try {
            const user = await db.getVendor(auth.getUser().id, true);
            if(!user) return this.navigate('dashboard');
            
            const products = await db.getProducts({vendorId: user.id, includeAll: true});
            const limit = user.plan === 'FREE' ? 30 : 600;
            if (products.length >= limit) {
                throw new Error(`You have reached your product storage limit (${limit} products). Please upgrade your plan or delete old products to add more.`);
            }

            // ...
            let images = this.imageBuffers['addImagePreview'] || [];
            
            // ...
            const newProduct = {
                vendorId: user.id,
                name: document.getElementById('addName').value,
                category: document.getElementById('addCat').value,
                price: Number(document.getElementById('addPrice').value),
                location: user.location || 'Uganda',
                description: document.getElementById('addDesc').value,
                images: images
            };

            await db.addProduct(newProduct);
            
            alert("Product published successfully!");
            this.navigate('dashboard');
        } catch (error) {
            // ...
        }
    }

    async renderAddProductView() {
        if(!auth.isLoggedIn()) return this.navigate('register');
        
        const categories = await db.getCategories();
        this.appEl.innerHTML = `
            <div class="container fade-in py-4" style="max-width: 800px;">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('dashboard')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Add New Product</h2>
                </div>

                <div class="glass-panel" style="padding: clamp(1.5rem, 5vw, 3rem);">
                    <form id="addProductForm" onsubmit="window.app.handleAddProduct(event)">
                        <div class="grid grid-cols-2 grid-cols-1-mobile gap-3">
                            <div class="form-group">
                                <label class="no-word-break">Product Name</label>
                                <input type="text" id="addName" class="form-control" required placeholder="e.g. MacBook Pro M2">
                            </div>
                            <div class="form-group span-all-mobile">
                                <label class="no-word-break">Category</label>
                                <select id="addCat" class="form-control" required>
                                    ${categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="no-word-break">Price (UGX)</label>
                                <input type="number" id="addPrice" class="form-control" required min="0" placeholder="1000000">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label class="no-word-break">Description</label>
                                <textarea id="addDesc" class="form-control" rows="4" required placeholder="Tell buyers more about your product..."></textarea>
                            </div>
                            
                            <div class="form-group" style="grid-column: span 2;">
                                <label class="no-word-break">Product Images (Max 4)</label>
                                <div class="upload-zone" style="padding: 2rem;">
                                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 1rem;"></i>
                                    <p>Click to Upload Photos</p>
                                    <span style="font-size: 0.8rem; opacity: 0.7;">(JPG, PNG supported)</span>
                                    <input type="file" id="productImagesInput" multiple accept="image/*" onchange="window.app.handleImagePreview(event, 'addImagePreview', 4)" required>
                                </div>
                                <div id="addImagePreview" class="preview-gallery mt-2"></div>
                            </div>
                        </div>

                        <div id="addError" style="color: #dc3545; background: #fff5f5; padding: 0.75rem; border-radius: var(--radius-sm); margin: 1rem 0; border: 1px solid #ff000020; display: none;"></div>
                        
                        <div class="d-flex justify-end gap-2 mt-4">
                            <button type="button" class="btn btn-outline" onclick="app.navigate('dashboard')">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="publishBtn">Publish Product</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // --- Documents Logic ---

    async renderDocumentsList(type) {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        
        // type is 'invoice' or 'receipt'
        const docType = (type || 'invoice').toLowerCase();
        const displayType = docType.charAt(0).toUpperCase() + docType.slice(1);
        
        const docs = await db.getDocuments(user.id, displayType);
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-4">
                <div class="d-flex align-center justify-between mb-4 flex-wrap gap-3">
                    <div class="d-flex align-center gap-2">
                        <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2 class="mb-0" style="font-size: clamp(1.2rem, 5vw, 1.8rem);">${displayType}s</h2>
                    </div>
                    <button class="btn btn-primary" onclick="app.navigate('document-form', '${docType}')">
                        <i class="fa-solid fa-plus"></i> New ${displayType}
                    </button>
                </div>

                <div class="documents-list">
                    ${docs.length === 0 ? `
                        <div class="text-center text-muted py-5 glass-panel">
                            <i class="fa-solid fa-file-invoice" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <p>No ${displayType.toLowerCase()}s found.</p>
                            <button class="btn btn-primary mt-2" onclick="app.navigate('document-form', '${docType}')">Create First ${displayType}</button>
                        </div>
                    ` : docs.map(doc => `
                        <div class="glass-panel mb-3 d-flex justify-between align-center" style="padding: 1rem; cursor: pointer;" onclick="app.navigate('document-view', '${doc.id}')">
                            <div>
                                <h4 style="margin:0;">${doc.customerName}</h4>
                                <div class="text-muted" style="font-size: 0.8rem;">
                                    ${new Date(doc.createdAt).toLocaleDateString()} &middot; ID: ${doc.id.slice(-6).toUpperCase()}
                                </div>
                            </div>
                            <div class="text-right">
                                <div style="font-weight: bold; color: var(--primary);">${formatPrice(doc.total)}</div>
                                <span style="font-size: 0.75rem; background: ${docType === 'invoice' ? '#fef3c7' : '#dcfce7'}; color: ${docType === 'invoice' ? '#d97706' : '#16a34a'}; padding: 0.1rem 0.5rem; border-radius: 1rem;">
                                    ${displayType}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderDocumentForm(type) {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const docType = (type || 'invoice').toLowerCase();
        const displayType = docType.charAt(0).toUpperCase() + docType.slice(1);
        
        // Setup initial single line item UI
        window.tempDocItems = [{ id: Date.now(), desc: '', qty: 1, price: 0 }];
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-4" style="max-width: 800px; margin: 0 auto;">
                <div class="d-flex align-center gap-2 mb-4 flex-wrap">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('documents', '${docType}')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0" style="font-size: clamp(1.2rem, 5vw, 1.8rem);">Create ${displayType}</h2>
                </div>

                <div class="glass-panel" style="padding: clamp(1rem, 4vw, 2rem);">
                    <form id="docForm" onsubmit="app.saveDocumentForm(event, '${displayType}')">
                        <h4 class="mb-3 border-bottom pb-2">Customer Details</h4>
                        <div class="form-group">
                            <label>Customer Name</label>
                            <input type="text" id="docCustomerName" class="form-control" required placeholder="John Doe">
                        </div>
                        <div class="form-group">
                            <label>Customer Phone / WhatsApp</label>
                            <input type="text" id="docCustomerPhone" class="form-control" required placeholder="+256...">
                        </div>
                        
                        <h4 class="mb-3 mt-4 border-bottom pb-2 d-flex justify-between align-center">
                            <span>Item Lines</span>
                            <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="app.addDocItemRow()">
                                <i class="fa-solid fa-plus"></i> Add Item
                            </button>
                        </h4>
                        
                        <div id="docItemsContainer">
                            ${this.renderDocItemRows()}
                        </div>
                        
                        <div class="d-flex justify-between align-center mt-4 pt-3 border-top">
                            <h3 style="margin:0;">Total:</h3>
                            <h3 style="margin:0; color: var(--primary);" id="docTotalDisplay">UGX 0</h3>
                        </div>

                        <button type="submit" class="btn btn-primary w-100 mt-4">Save & View ${displayType}</button>
                    </form>
                </div>
            </div>
        `;
    }
    
    addDocItemRow() {
        window.tempDocItems.push({ id: Date.now(), desc: '', qty: 1, price: 0 });
        document.getElementById('docItemsContainer').innerHTML = this.renderDocItemRows();
        this.updateDocTotal();
    }
    
    removeDocItemRow(id) {
        if(window.tempDocItems.length <= 1) return;
        window.tempDocItems = window.tempDocItems.filter(i => i.id !== id);
        document.getElementById('docItemsContainer').innerHTML = this.renderDocItemRows();
        this.updateDocTotal();
    }
    
    updateDocItem(id, field, value) {
        const item = window.tempDocItems.find(i => i.id === id);
        if(item) {
            item[field] = field === 'desc' ? value : Number(value);
            this.updateDocTotal();
        }
    }
    
    updateDocTotal() {
        const total = window.tempDocItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
        const display = document.getElementById('docTotalDisplay');
        if(display) display.innerText = formatPrice(total);
    }
    
    renderDocItemRows() {
        return window.tempDocItems.map((item, index) => `
            <div class="d-flex gap-2 mb-3 flex-wrap-mobile" style="background: rgba(0,0,0,0.02); padding: 0.75rem; border-radius: var(--radius-sm); position: relative; width: 100%;">
                <div style="flex: 1 1 300px; width: 100%;">
                    <label style="font-size: 0.7rem; color: #888; margin-bottom: 2px; display: block;" class="show-mobile">Description</label>
                    <input type="text" class="form-control" style="width: 100%;" placeholder="Item description" required value="${item.desc}" onchange="app.updateDocItem(${item.id}, 'desc', this.value)">
                </div>
                <div class="d-flex gap-2" style="flex: 1 1 250px; width: 100%; align-items: flex-end;">
                    <div style="flex: 0 0 70px;">
                        <label style="font-size: 0.7rem; color: #888; margin-bottom: 2px; display: block;" class="show-mobile">Qty</label>
                        <input type="number" class="form-control text-center" style="width: 100%;" placeholder="Qty" min="1" required value="${item.qty}" onchange="app.updateDocItem(${item.id}, 'qty', this.value)">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.7rem; color: #888; margin-bottom: 2px; display: block;" class="show-mobile">Unit Price</label>
                        <input type="number" class="form-control" style="width: 100%;" placeholder="Price" min="0" required value="${item.price || ''}" onchange="app.updateDocItem(${item.id}, 'price', this.value)">
                    </div>
                    ${window.tempDocItems.length > 1 ? `
                        <div style="flex: 0 0 auto;">
                            <button type="button" class="btn" style="color: #dc3545; padding: 0.5rem 0.25rem;" onclick="app.removeDocItemRow(${item.id})">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async saveDocumentForm(e, type) {
        e.preventDefault();
        const user = auth.getUser();
        
        const doc = {
            vendorId: user.id,
            type: type, // 'Invoice' or 'Receipt'
            customerName: document.getElementById('docCustomerName').value,
            customerPhone: document.getElementById('docCustomerPhone').value,
            items: window.tempDocItems,
            total: window.tempDocItems.reduce((sum, item) => sum + (item.qty * item.price), 0)
        };
        
        const savedDoc = await db.saveDocument(doc);
        this.navigate('document-view', savedDoc.id);
    }

    async renderDocumentView(id) {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const doc = await db.getDocument(id);
        const user = await db.getVendor(auth.getUser().id, true);
        if(!doc || doc.vendorId !== user.id) return this.navigate('profile');
        
        // ... (rest of renderDocumentView)
    }

    async convertInvoiceToReceipt(id) {
        const invoice = await db.getDocument(id);
        if (!invoice || invoice.type !== 'Invoice') return;
        
        const newReceipt = {
            vendorId: invoice.vendorId,
            type: 'Receipt',
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone,
            items: JSON.parse(JSON.stringify(invoice.items)), // Deep copy items
            total: invoice.total
        };

        const savedReceipt = await db.saveDocument(newReceipt);
        
        // Success notification using alert (following app's literal pattern)
        alert('Invoice successfully converted to Receipt!');
        this.navigate('document-view', savedReceipt.id);
    }

    async downloadDocumentPdf(id) {
        if(typeof html2pdf === 'undefined') {
            alert("PDF engine is still loading, please try again in a few seconds.");
            return;
        }
        
        const doc = await db.getDocument(id);
        const element = document.getElementById('documentPdfTarget');
        const ref = doc.id.slice(-6).toUpperCase();
        
        const opt = {
            margin:       10,
            filename:     `${doc.type}_${ref}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Hide UI elements momentarily if they exist in target
        html2pdf().set(opt).from(element).save();
    }

    async shareDocumentWhatsApp(id) {
        const doc = await db.getDocument(id);
        const user = await db.getVendor(auth.getUser().id);
        const ref = doc.id.slice(-6).toUpperCase();
        
        let text = `📄 *${doc.type.toUpperCase()}* from *${user.storeName}*\n`;
        text += `Ref: #${ref}\n`;
        text += `Date: ${new Date(doc.createdAt).toLocaleDateString()}\n\n`;
        
        text += `*Billed To:* ${doc.customerName}\n\n`;
        
        text += `*Items:*\n`;
        doc.items.forEach(item => {
            text += `- ${item.qty}x ${item.desc} @ ${formatPrice(item.price)}\n`;
        });
        
        text += `\n*Total Amount:* ${formatPrice(doc.total)}\n\n`;
        text += `Thank you for your business!`;
        
        const phone = doc.customerPhone.replace(/[^0-9]/g, '');
        const encodedText = encodeURIComponent(text);
        
        window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    }

    async shareDocumentChat(id) {
        const user = auth.getUser();
        const doc = await db.getDocument(id);
        const chats = await db.getChats(user.id);
        
        const listEl = document.getElementById('chatShareList');
        
        // Suggest recipient from document phone
        const cleanPhone = doc.customerPhone ? doc.customerPhone.replace(/[^0-9]/g, '') : '';
        const allVendors = await db.getVendors();
        const matchingUser = cleanPhone ? allVendors.find(v => v.phone && v.phone.replace(/[^0-9]/g, '').includes(cleanPhone)) : null;

        let html = '';
        
        if (matchingUser && matchingUser.id !== user.id) {
            html += `
                <div class="mb-3">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary); margin-bottom: 0.5rem; font-weight: 700;">Suggested (From Document)</h4>
                    <div class="d-flex justify-between align-center" style="background: rgba(0, 153, 212, 0.08); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(0, 153, 212, 0.2); cursor:pointer;" onclick="app.initiateNewChatShare('${matchingUser.id}', '${id}')">
                        <div class="d-flex align-center gap-2">
                            ${this.renderAvatar(matchingUser, '40px')}
                            <div>
                                <div style="font-weight: 700; font-size: 0.95rem;">${matchingUser.storeName || matchingUser.name}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${matchingUser.phone}</div>
                            </div>
                        </div>
                        <i class="fa-solid fa-paper-plane text-primary"></i>
                    </div>
                </div>
                <hr style="opacity: 0.1; margin: 1rem 0;">
            `;
        }

        if(chats.length === 0 && !matchingUser) {
            html += `<p class="text-muted text-center py-4">No active conversations found.</p>`;
        } else if (chats.length > 0) {
            html += `<h4 style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 0.5rem; font-weight: 700;">Recent Conversations</h4>`;
            
            const chatItems = await Promise.all(chats.map(async chat => {
                const otherId = chat.participants.find(p => p !== user.id);
                const otherUser = await db.getVendor(otherId) || { storeName: 'User', name: 'User' };
                const name = otherUser.storeName || otherUser.name || 'User';
                
                return `
                    <div class="d-flex justify-between align-center mb-2" style="background: rgba(0,0,0,0.02); padding: 0.75rem; border-radius: var(--radius-sm); cursor:pointer;" onclick="app.executeChatShare('${chat.id}', '${id}')">
                        <div class="d-flex align-center gap-2">
                            ${this.renderAvatar(otherUser, '36px')}
                            <div style="font-weight: 600; font-size: 0.9rem;">${name}</div>
                        </div>
                        <i class="fa-solid fa-paper-plane" style="color: #ccc; font-size: 0.9rem;"></i>
                    </div>
                `;
            }));
            html += chatItems.join('');
        }

        listEl.innerHTML = html;
        
        const modal = document.getElementById('chatShareModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    async initiateNewChatShare(recipientId, docId) {
        const user = auth.getUser();
        const chat = await db.getOrCreateChat(user.id, recipientId);
        if (chat) {
            await this.executeChatShare(chat.id, docId);
        }
    }
    
    async executeChatShare(chatId, docId) {
        if(typeof html2pdf === 'undefined') {
            alert("Image engine is still loading, please try again.");
            return;
        }

        const element = document.getElementById('documentPdfTarget');
        if(!element) return;

        // Visual feedback inside the share modal
        const listEl = document.getElementById('chatShareList');
        const originalHtml = listEl.innerHTML;
        listEl.innerHTML = `
            <div class="text-center py-5">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
                <p class="mt-2" style="font-weight: 500;">Capturing document...</p>
            </div>
        `;

        try {
            // Use html2pdf worker chain to generate image
            const worker = html2pdf().from(element).set({
                margin: 5,
                html2canvas: { scale: 2, useCORS: true, logging: false },
                image: { type: 'jpeg', quality: 0.8 }
            }).toImg();
            
            const img = await worker.get('img');
            const dataUrl = img.src;

            await db.sendMessage(chatId, auth.getUser().id, dataUrl, 'image');
            
            const modal = document.getElementById('chatShareModal');
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
            // Reset modal content
            listEl.innerHTML = originalHtml;
            // Navigate to the chat to view the shared document
            this.navigate('chat', chatId);
        } catch (err) {
            console.error("Capture failed:", err);
            alert("Failed to capture document as image.");
            listEl.innerHTML = originalHtml;
        }
    }

    async renderProfileHub() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        if(!user) return this.navigate('login');

        const stats = await db.getVendorStats(user.id);
        const totalLikes = stats.totalLikes || 0;
        const unreadMessages = await db.getUnreadCount(user.id);
        const unreadFeedback = await db.getUnreadFeedbackCount(user.id);
        
        const coreActions = [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', hash: '#dashboard', color: '#4f46e5' },
            { id: 'boost', label: 'Boost Sales', icon: 'fa-rocket', hash: '#subscription', color: '#f59e0b' },
            { id: 'invoices', label: 'Invoices', icon: 'fa-file-invoice-dollar', hash: '#documents/invoice', color: '#10b981' },
            { id: 'receipts', label: 'Receipts', icon: 'fa-receipt', hash: '#documents/receipt', color: '#6366f1' }
        ];

        const settingsGroups = [
            {
                title: 'Account & Settings',
                items: [
                    { id: 'profile', label: 'User Profile', icon: 'fa-circle-user', hash: '#settings' },
                    { id: 'messages', label: 'Messages', icon: 'fa-message', hash: '#inbox', badge: unreadMessages > 0 ? unreadMessages : null },
                    { id: 'change-password', label: 'Change Password', icon: 'fa-lock', hash: '#change-password' },
                    { id: 'followers', label: 'Followers', icon: 'fa-users', hash: '#followers' },
                    { id: 'saved', label: 'Saved Items', icon: 'fa-heart', hash: '#saved' }
                ]
            },
            {
                title: 'Help & Resources',
                items: [
                    { id: 'feedback', label: 'Feedback', icon: 'fa-star', hash: '#feedback', badge: unreadFeedback > 0 ? 'New' : null },
                    { id: 'terms', label: 'Terms & Conditions', icon: 'fa-file-contract', hash: '#terms' },
                    { id: 'help', label: 'Request Help', icon: 'fa-circle-question', action: "app.startChat('admin')" },
                    { id: 'faq', label: 'FAQ', icon: 'fa-circle-info', action: 'alert("FAQ coming soon!")' }
                ]
            }
        ];

        this.appEl.innerHTML = `
            <div class="home-split-layout">
                
                <!-- Left Sidebar (Desktop Only) -->
                <aside class="sidebar-panel slide-in hide-mobile" style="padding-top: 1.5rem;">
                    <h3 class="mb-4 text-gradient px-2" style="font-size: 1.25rem; font-weight: 800;">Settings</h3>
                    
                    <!-- List Groups -->
                    ${settingsGroups.map((group, gIdx) => `
                        <div class="mb-4">
                            <h4 class="px-2 mb-2 text-muted" style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">${group.title}</h4>
                            <div class="hub-list-card">
                                ${group.items.map(item => `
                                    <div class="hub-item" onclick="${item.hash ? `app.navigate('${item.hash.replace('#','')}')` : item.action}">
                                        <div class="hub-item-left">
                                            <div class="hub-item-icon">
                                                <i class="fa-solid ${item.icon}"></i>
                                            </div>
                                            <span class="hub-item-label">${item.label}</span>
                                            ${item.badge ? `<span class="badge" style="font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 10px; margin-left: 0.5rem; background: #dc3545; color: white; transition: all 0.2s ease;">${item.badge}</span>` : ''}
                                        </div>
                                        <i class="fa-solid fa-chevron-right text-muted" style="font-size: 0.8rem;"></i>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}

                    <!-- Logout -->
                    <div class="px-2 mt-4">
                        <button class="btn btn-outline w-100" style="color: #dc3545; border-color: #dc354530; background: white;" onclick="app.logout()">
                            <i class="fa-solid fa-right-from-bracket"></i> Logout
                        </button>
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="main-panel fade-in pb-5" style="padding: 1rem 1rem;">
                    <div class="container" style="max-width: 100%; margin: 0 auto; padding: clamp(1rem, 5vw, 2rem) 0 0 0;">
                        <!-- Store Profile Header -->
                        <div class="animate-fade-in" style="height: clamp(140px, 25vh, 250px); background: ${user.coverPic ? `url(${user.coverPic}) center/cover no-repeat` : 'linear-gradient(135deg, var(--primary), var(--secondary))'}; border-radius: var(--radius-lg); margin-bottom: 3.5rem; position: relative; overflow: visible;">
                            <div style="position: absolute; bottom: -40px; left: 2rem; width: 100px; height: 100px; background: white; border-radius: 50%; display: flex; justify-content:center; align-items:center; box-shadow: var(--shadow-md); border: 5px solid white; overflow: hidden; z-index: 5;">
                                ${user.profilePic ? 
                                    `<img src="${user.profilePic}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                                    `<span style="font-size: 2.5rem; color: var(--primary); font-weight: 800;">${user.storeName.charAt(0)}</span>`
                                }
                            </div>
                        </div>
                        
                        <div class="mb-4 d-flex justify-between align-end flex-wrap gap-3 animate-fade-in">
                            <div>
                                <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800; color: var(--text-main);">${user.storeName}</h1>
                                <div class="d-flex gap-3 text-muted mt-1 flex-wrap" style="font-size: 0.9rem;">
                                    <span><i class="fa-regular fa-envelope"></i> ${user.email}</span>
                                    <span><i class="fa-solid fa-phone"></i> ${user.phone}</span>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="app.navigate('settings')">
                                    <i class="fa-solid fa-pen-to-square"></i> Edit Profile
                                </button>
                            </div>
                        </div>

                        <!-- Stats Overview -->
                        <div class="hub-stats-row animate-fade-in" style="animation-delay: 0.1s;">
                            <div class="hub-stat-item" style="flex:1;">
                                <span class="hub-stat-value">${totalLikes}</span>
                                <span class="hub-stat-label">Total Likes</span>
                            </div>
                            <div class="hub-stat-item" style="flex:1; border-left: 1px solid rgba(0,0,0,0.05); border-right: 1px solid rgba(0,0,0,0.05); cursor: pointer;" onclick="app.navigate('followers')">
                                <span class="hub-stat-value">${stats.followerCount || 0}</span>
                                <span class="hub-stat-label">Followers</span>
                            </div>
                            <div class="hub-stat-item" style="flex:1; cursor: pointer; position: relative;" onclick="app.navigate('feedback')">
                                <span class="hub-stat-value">${stats.avgRating || 0} <i class="fa-solid fa-star" style="color:#f59e0b; font-size:0.8rem;"></i></span>
                                <span class="hub-stat-label">Rating</span>
                                ${unreadFeedback > 0 ? `<div style="position: absolute; top: 0.5rem; right: 0.5rem; width: 8px; height: 8px; background: #dc3545; border-radius: 50%; box-shadow: 0 0 0 2px white;"></div>` : ''}
                            </div>
                        </div>

                        <!-- Core Action Grid -->
                        <div class="hub-card-grid animate-fade-in" style="animation-delay: 0.2s;">
                            ${coreActions.map(action => `
                                <div class="hub-card" onclick="${action.hash ? `app.navigate('${action.hash.replace('#','')}')` : action.action}">
                                    <i class="fa-solid ${action.icon}" style="color: ${action.color}"></i>
                                    <span class="hub-card-label">${action.label}</span>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Mobile Settings Menu (Hidden on Desktop) -->
                        <div class="hide-desktop">
                            ${settingsGroups.map((group, gIdx) => `
                                <div class="animate-fade-in" style="animation-delay: ${0.2 + (gIdx * 0.1)}s;">
                                    <h4 class="px-1 mb-2 text-muted" style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">${group.title}</h4>
                                    <div class="hub-list-card mb-4">
                                        ${group.items.map(item => `
                                            <div class="hub-item" onclick="${item.hash ? `app.navigate('${item.hash.replace('#','')}')` : item.action}">
                                                <div class="hub-item-left">
                                                    <div class="hub-item-icon">
                                                        <i class="fa-solid ${item.icon}"></i>
                                                    </div>
                                                    <span class="hub-item-label">${item.label}</span>
                                                </div>
                                                <i class="fa-solid fa-chevron-right text-muted" style="font-size: 0.8rem;"></i>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                            
                            <!-- Mobile Logout -->
                            <div class="px-1 mt-4 animate-fade-in" style="animation-delay: 0.4s;">
                                <button class="btn btn-outline w-100" style="color: #dc3545; border-color: #dc354530; background: white; padding: 1rem; border-radius: var(--radius-md);" onclick="app.logout()">
                                    <i class="fa-solid fa-right-from-bracket"></i> Logout account
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        `;
    }

    async renderStores(param) {
        let filters = {};
        if (param && param.startsWith('search=')) {
            filters.search = decodeURIComponent(param.replace('search=', ''));
        }
        const vendors = await db.getVendors(filters);

        this.appEl.innerHTML = `
            <div class="container-full fade-in py-4 px-4">
                <div class="stores-wide-layout">
                    <div class="d-flex align-center justify-between mb-4 px-2">
                        <div class="d-flex align-center gap-2">
                             <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('home')">
                                <i class="fa-solid fa-arrow-left"></i>
                            </button>
                            <h2 class="mb-0">Discover Stores</h2>
                        </div>
                        <span class="text-muted" style="font-size: 0.9rem;">${vendors.length} stores found</span>
                    </div>


                    <div class="store-list-grid" id="storesGrid">
                        <!-- Stores will be rendered here -->
                    </div>

                    ${vendors.length === 0 ? `
                        <div class="text-center py-5">
                            <i class="fa-solid fa-store-slash mb-3" style="font-size: 3rem; color: #cbd5e1;"></i>
                            <p class="text-muted">No stores registered yet.</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        const grid = document.getElementById('storesGrid');
        if (grid) {
            const storeCards = await Promise.all(vendors.map(async vendor => {
                const products = await db.getProducts({ vendorId: vendor.id });
                const rating = await db.getAverageRating(vendor.id);
                
                return `
                    <div class="store-entry-card" onclick="app.navigate('vendor', '${vendor.id}')">
                        <div class="store-entry-header">
                            <div class="store-entry-avatar">
                                ${vendor.profilePic ? `<img src="${vendor.profilePic}">` : `<i class="fa-solid fa-shop"></i>`}
                            </div>
                            <div class="store-entry-info">
                                <h3 class="store-entry-name">${vendor.storeName || vendor.name}</h3>
                                <div class="store-entry-meta">
                                    <span class="rating-badge"><i class="fa-solid fa-star"></i> ${rating}</span>
                                    <span class="dot-separator">•</span>
                                    <span><i class="fa-solid fa-location-dot"></i> ${vendor.location || 'Uganda'}</span>
                                    <span class="dot-separator">•</span>
                                    <span>${products.length} products</span>
                                </div>
                            </div>
                        </div>
                        <div class="store-entry-category">
                            <i class="fa-solid fa-tags"></i> Multiple Categories
                        </div>
                        <div class="store-entry-footer">
                            <button class="btn btn-primary btn-block btn-sm">Visit Store</button>
                        </div>
                    </div>
                `;
            }));
            grid.innerHTML = storeCards.join('');
        }
    }

    async renderInbox() {
        if (!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        const chats = await db.getChats(user.id);

        this.appEl.innerHTML = `
            <div class="container-full fade-in py-4">
                <div class="container">
                    <div class="d-flex align-center gap-2 mb-4">
                        <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2 class="mb-0">Messages</h2>
                    </div>

                    <div class="chat-list-card" id="chatList">
                        <!-- Chats will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        const list = document.getElementById('chatList');
        if (list) {
            if (chats.length > 0) {
                const chatItems = await Promise.all(chats.map(async chat => {
                    const otherId = chat.participants.find(id => id !== user.id);
                    const otherUser = await db.getVendor(otherId);
                    const timeStr = this.formatTime(chat.lastMessageAt);
                    const isExpiredSoon = (Date.now() - chat.lastMessageAt) > (11 * 24 * 60 * 60 * 1000); // Warning after 11 days

                    return `
                        <div class="chat-list-item" onclick="app.navigate('chat', '${chat.id}')">
                            <div class="chat-avatar-wrapper">
                                ${this.renderAvatar(otherUser, '50px')}
                                ${(chat.lastMessageAt || 0) > ((chat.lastReadAt && chat.lastReadAt[user.id]) ? chat.lastReadAt[user.id] : 0) ? `
                                    <span class="nav-badge" style="top: -2px; right: -2px; min-width: 10px; height: 10px; padding: 0;"></span>
                                ` : ''}
                            </div>
                            <div class="chat-info">
                                <div class="chat-meta">
                                    <span class="chat-name ${ (chat.lastMessageAt || 0) > ((chat.lastReadAt && chat.lastReadAt[user.id]) ? chat.lastReadAt[user.id] : 0) ? 'font-bold' : '' }">${otherUser?.storeName || otherUser?.name || 'User'}</span>
                                    <span class="chat-time">${timeStr}</span>
                                </div>
                                <div class="d-flex justify-between align-center">
                                    <p class="chat-preview ${ (chat.lastMessageAt || 0) > ((chat.lastReadAt && chat.lastReadAt[user.id]) ? chat.lastReadAt[user.id] : 0) ? 'text-main' : '' }">${chat.lastMessage}</p>
                                    ${isExpiredSoon ? `<span class="expiry-badge">Expiring soon</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }));
                list.innerHTML = chatItems.join('');
            } else {
                list.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fa-regular fa-comments mb-3" style="font-size: 3rem; color: #cbd5e1;"></i>
                        <p class="text-muted">No messages yet.</p>
                        <button class="btn btn-primary btn-sm mt-3" onclick="app.navigate('shop')">Start Shopping</button>
                    </div>
                `;
            }
        }
    }

    async renderChat(chatId) {
        if (!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        const chat = await db.getChat(chatId);
        if (!chat) return this.navigate('inbox');

        const otherId = chat.participants.find(id => id !== user.id);
        const otherUser = await db.getVendor(otherId);
        const messages = await db.getMessages(chatId);

        // Mark as read when viewing
        await db.markAsRead(chatId, user.id);
        await this.updateNotificationBadges();

        this.appEl.innerHTML = `
            <div class="container-full fade-in py-0">
                <div class="container" style="padding: 0; max-width: 1000px;">
                    <div class="chat-window">
                    <div class="chat-header">
                        <button class="btn btn-outline" style="padding: 0.5rem; border:none;" onclick="app.navigate('inbox')">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        ${this.renderAvatar(otherUser, '40px')}
                        <div>
                            <div class="chat-name">${otherUser?.storeName || otherUser?.name || 'User'}</div>
                            <div style="font-size: 0.75rem; color: #25D366;"><i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i> Online</div>
                        </div>
                    </div>

                    ${chat.productContext ? `
                        <div class="chat-product-context">
                            <img src="${chat.productContext.image}" class="chat-product-img">
                            <div>
                                <div style="font-weight: 600;">Inquiry about: ${chat.productContext.name}</div>
                                <div style="color: var(--primary); font-weight: 700;">Shs. ${chat.productContext.price.toLocaleString()}</div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="chat-messages" id="chatMessages">
                        <div class="text-center mb-4">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 500; opacity: 0.8;">
                                Conversations are automatically deleted after 7 days of inactivity.
                            </span>
                        </div>
                        
                        ${messages.length > 0 ? messages.map(msg => {
                            const isMe = msg.senderId === user.id;
                            return `
                                <div class="chat-bubble ${isMe ? 'sent' : 'received'}">
                                    ${msg.type === 'image' ? 
                                        `<img src="${msg.text}" class="chat-img-msg" onclick="app.openImageLightbox('${msg.text}')">` : 
                                        msg.text
                                    }
                                    <span class="chat-msg-time">${this.formatTime(msg.timestamp)}</span>
                                </div>
                            `;
                        }).join('') : `
                            <div class="text-center py-4 text-muted" style="font-size: 0.85rem;">
                                Start of your conversation with ${otherUser?.storeName || 'User'}
                            </div>
                        `}
                    </div>

                    <div class="chat-input-area">
                        <input type="file" id="imageInput" accept="image/*" style="display: none;">
                        <button class="nav-icon-btn" id="photoBtn" style="color: var(--primary);"><i class="fa-solid fa-camera"></i></button>
                        <textarea id="chatInput" placeholder="Type a message..." onkeypress="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); app.handleSendMessage('${chatId}'); }"></textarea>
                        <button class="btn-send" onclick="app.handleSendMessage('${chatId}')">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Setup file input listener after render
        const photoBtn = document.getElementById('photoBtn');
        const imageInput = document.getElementById('imageInput');
        if(photoBtn && imageInput) {
            photoBtn.onclick = () => imageInput.click();
            imageInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) this.handleImageShare(chatId, file);
            };
        }

        // Scroll to bottom
        setTimeout(() => {
            const msgContainer = document.getElementById('chatMessages');
            if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
        }, 100);
    }

    async handleSendMessage(chatId) {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        const user = auth.getUser();
        await db.sendMessage(chatId, user.id, text);
        await this.updateNotificationBadges();
        
        input.value = '';
        await this.renderChat(chatId);
    }

    async handleImageShare(chatId, file) {
        const user = auth.getUser();
        if (!user) return;

        // Show loading state or similar?
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Str = e.target.result;
            // Workable resolution: max 1200px width
            const compressed = await this.compressImage(base64Str, 1200, 0.7);
            
            db.sendMessage(chatId, user.id, compressed, 'image');
            this.updateNotificationBadges();
            this.renderChat(chatId);
        };
        reader.readAsDataURL(file);
    }

    async startChat(vendorId, productId = null) {
        if (!auth.isLoggedIn()) return this.navigate('login');
        const buyer = auth.getUser();
        if (buyer.id === vendorId) return alert("You cannot message your own store.");

        let productContext = null;
        if (productId) {
            const p = await db.getProduct(productId);
            if (p) {
                productContext = {
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    image: p.images[0]
                };
            }
        }

        const chat = await db.getOrCreateChat(buyer.id, vendorId, productContext);
        this.navigate('chat', chat.id);
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const now = new Date();
        const date = new Date(timestamp);
        
        if (now.toDateString() === date.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    updateThemeColor(color) {
        const themeColor = color || getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0099D4';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', themeColor);
        }
    }

    renderAvatar(user, size = '40px') {
        if (!user) return `<div style="width: ${size}; height: ${size}; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; color: #999;"><i class="fa-solid fa-user"></i></div>`;
        
        if (user.profilePic) {
            return `<img src="${user.profilePic}" style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover;">`;
        }

        const name = user.storeName || user.name || 'User';
        const initial = name.charAt(0).toUpperCase();
        
        return `
            <div style="width: ${size}; height: ${size}; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: calc(${size} * 0.5);">
                ${initial}
            </div>
        `;
    }

    /**
     * Compresses a base64 image string using HTML5 Canvas
     */
    compressImage(base64Str, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        });
    }

    /**
     * Lightbox System for Chat Images
     */
    initLightbox() {
        if (document.getElementById('imageLightbox')) return;
        
        const lightboxHtml = `
            <div id="imageLightbox" class="image-lightbox">
                <div class="lightbox-close-zone" onclick="app.closeImageLightbox()"></div>
                <div class="lightbox-content">
                    <div class="lightbox-actions">
                        <button class="lightbox-btn download-btn" id="lightboxDownload" title="Download">
                            <i class="fa-solid fa-download"></i>
                        </button>
                        <button class="lightbox-btn" onclick="app.closeImageLightbox()" title="Close">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <img id="lightboxImg" class="lightbox-img" src="">
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', lightboxHtml);
    }

    openImageLightbox(src) {
        const lightbox = document.getElementById('imageLightbox');
        const img = document.getElementById('lightboxImg');
        const downloadBtn = document.getElementById('lightboxDownload');
        
        if (lightbox && img) {
            img.src = src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Setup download
            downloadBtn.onclick = () => this.downloadImage(src);
        }
    }

    closeImageLightbox() {
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
            if (this.currentView !== 'chat') {
                document.body.style.overflow = '';
            }
        }
    }

    downloadImage(src) {
        const link = document.createElement('a');
        link.href = src;
        
        // Generate a filename
        const timestamp = new Date().getTime();
        const extension = src.includes('image/png') ? 'png' : 'jpg';
        link.download = `UgaTrade_${timestamp}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
