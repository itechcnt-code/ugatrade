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
        
        // Navigation Listeners
        const inboxBtn = document.getElementById('inboxBtn');
        if (inboxBtn) {
            inboxBtn.onclick = () => this.navigate('inbox');
        }
        
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

    init() {
        // Expose app to global scope for inline event handlers
        window.app = this;
        this.initLightbox();

        
        // Initial Theme Color setup
        this.updateThemeColor();
        
        // Listen to Auth Changes
        auth.onChange(() => this.updateNav());
        this.updateNav();

        // Handle Routing
        window.addEventListener('hashchange', () => {
            this.handleRoute();
            this.toggleDrawer(false); // Close drawer on navigation
        });
        
        // Handle Search
        const searchInputs = [
            { el: this.searchInput, btn: document.querySelector('.search-bar.hide-mobile .search-btn') },
            { el: this.mobileSearchInput, btn: document.querySelector('.mobile-search .search-btn') }
        ];

        searchInputs.forEach(({ el, btn }) => {
            if (el) {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.performSearch(el.value);
                    }
                });
            }
            if (btn && el) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    this.performSearch(el.value);
                };
            }
        });

        // Mobile Menu Toggles
        if(this.menuToggle) this.menuToggle.addEventListener('click', () => this.toggleDrawer(true));
        if(this.drawerOverlay) this.drawerOverlay.addEventListener('click', () => this.toggleDrawer(false));
        if(this.closeDrawerBtn) this.closeDrawerBtn.addEventListener('click', () => this.toggleDrawer(false));


        // Bottom Search -> Drawer
        const bottomDrawerBtn = document.getElementById('bottomDrawerBtn');
        if(bottomDrawerBtn) {
            bottomDrawerBtn.addEventListener('click', () => this.toggleDrawer(true));
        }

        // Initial Route
        this.handleRoute();
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
        window.location.hash = param ? `${path}/${param}` : path;
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

    updateSearchPlaceholder() {
        const inputs = [this.searchInput, this.mobileSearchInput];
        let placeholder = "Search for products, electronics, health...";
        
        if (this.currentView === 'vendor' && this.currentVendorId) {
            const vendor = db.getVendor(this.currentVendorId);
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

    handleRoute() {
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
        this.updateNav(); // Refresh drawer and nav context
        this.updateSearchPlaceholder();
        this.updateBottomNav();
        this.updateNotificationBadges();
        
        // Handle Split Layout Scrollbar Logic
        const splitViews = ['home', 'shop', 'vendor', 'profile'];
        if (splitViews.includes(view)) {
            this.appEl.classList.add('has-split-layout');
        } else {
            this.appEl.classList.remove('has-split-layout');
        }

        // Immersive Messaging View Logic
        const immersivePage = view === 'chat';
        const viewContainer = document.getElementById('view-container');
        
        if (viewContainer) {
            viewContainer.classList.toggle('no-scroll', immersivePage);
            viewContainer.classList.toggle('immersive-view', immersivePage);
        }
        document.body.classList.toggle('no-scroll', immersivePage);
        document.body.classList.toggle('immersive-mode', immersivePage);
        document.documentElement.classList.toggle('no-scroll', immersivePage);
        
        // Ensure bottom nav is handled or hidden if needed (keep visible as per design, but ensure space)
        if (this.bottomNav) {
            // Keep bottom nav visible but ensure it doesn't overlap painfully
        }
        
        if (view !== 'register' || !this.registrationDraft) {
            window.scrollTo(0, 0);
            if (this.appEl) this.appEl.scrollTo(0, 0);
        }

        switch(view) {
            case 'home': this.renderHome(); break;
            case 'shop': this.renderShop(param); break;
            case 'product': this.renderProduct(param); break;
            case 'vendor': this.renderVendor(param); break;
            case 'login': this.renderLogin(); break;
            case 'register': this.renderRegister(); break;
            case 'dashboard': this.renderDashboard(param); break;
            case 'profile': this.renderProfileHub(); break;
            case 'add-product': this.renderAddProductView(); break;
            case 'saved': this.renderSavedItems(); break;
            case 'followers': this.renderFollowers(); break;
            case 'inbox': this.renderInbox(); break;
            case 'stores': this.renderStores(param); break;
            case 'documents': this.renderDocumentsList(param); break;
            case 'document-view': this.renderDocumentView(param); break;
            case 'document-form': this.renderDocumentForm(param); break;
            case 'chat': this.renderChat(param); break;
            case 'settings': this.renderSettings(); break;
            case 'change-password': this.renderChangePassword(); break;
            case 'subscription': this.renderSubscription(); break;
            case 'feedback': this.renderFeedback(); break;
            case 'terms': this.renderTerms(); break;
            default: this.renderHome(); break;
        }
    }

    updateNav() {
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
            ${loggedIn ? '' : `
                <li style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                    <a href="#login"><i class="fa-solid fa-user"></i> Vendor Login</a>
                </li>
                <li><a href="#register" class="text-gradient"><i class="fa-solid fa-plus"></i> Become a Vendor</a></li>
            `}
        `;

        // Mobile Drawer Categories
        if(this.drawerCategoryList) {
            this.drawerCategoryList.innerHTML = createDrawerCategoryList();
        }

        // Bottom Nav Active State & Profile Link
        this.updateBottomNav();
    }

    updateBottomNav() {
        if(!this.bottomNav) return;
        const loggedIn = auth.isLoggedIn();
        const profileBtn = document.getElementById('profileBtn');
        const bottomSellBtn = document.getElementById('bottomSellBtn');

        if(profileBtn) {
            profileBtn.href = loggedIn ? '#profile' : '#login';
            profileBtn.innerHTML = `
                <i class="fa-solid fa-user"></i>
                <span>Profile</span>
            `;
        }

        if(bottomSellBtn) {
            bottomSellBtn.href = loggedIn ? '#add-product' : '#register';
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

    updateNotificationBadges() {
        const user = auth.getUser();
        if (!user) return;

        const unreadCount = db.getUnreadCount(user.id);
        
        // Update Bottom Nav Inbox Button
        const inboxBtn = document.getElementById('inboxBtn');
        if (inboxBtn) {
            const iconWrapper = inboxBtn.querySelector('.nav-icon-wrapper');
            const target = iconWrapper || inboxBtn;
            let badge = target.querySelector('.nav-badge');
            if (unreadCount > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-badge';
                    target.appendChild(badge);
                }
                badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            } else if (badge) {
                badge.remove();
            }
        }

        // Update Top Nav Inbox Button
        const topInboxBtn = document.getElementById('topInboxBtn');
        if (topInboxBtn) {
            let badge = topInboxBtn.querySelector('.nav-badge');
            if (unreadCount > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-badge';
                    topInboxBtn.appendChild(badge);
                }
                badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            } else if (badge) {
                badge.remove();
            }
        }
        
        // Update Dynamic Hub "Messages" items if visible
        const hubMessagesIcons = document.querySelectorAll('.hub-item-icon i.fa-message');
        hubMessagesIcons.forEach(icon => {
            const item = icon.closest('.hub-item');
            if (item) {
                let badge = item.querySelector('.nav-badge');
                if (unreadCount > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'nav-badge';
                        item.appendChild(badge);
                    }
                    badge.innerText = unreadCount;
                } else if (badge) {
                    badge.remove();
                }
            }
        });
    }

    // --- Views ---

    renderHome() {
        const products = db.getProducts().slice(0, 50); // Fetch more products for a better grid experience
        
        const html = `
            <div class="home-split-layout">
                <!-- Sidebar: Categories -->
                ${createSidebar()}

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

    renderShop(param) {
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

        const products = db.getProducts(filters);

        this.appEl.innerHTML = `
            <div class="home-split-layout">
                <!-- Sidebar: Categories -->
                ${createSidebar()}

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



    renderProduct(id) {
        const p = db.getProduct(id);
        if (!p) return this.navigate('home');
        
        const currentUser = auth.getUser();
        if (!currentUser || currentUser.id !== p.vendorId) {
            db.incrementView(id);
        }
        
        const vendor = db.getVendor(p.vendorId);
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
                            <button class="product-action-btn liked ${db.isInteracted(auth.getUser()?.id, p.id, 'likes') ? 'active' : ''}" 
                                    onclick="window.app.handleProductAction('${p.id}', 'likes')">
                                <i class="${db.isInteracted(auth.getUser()?.id, p.id, 'likes') ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                                <span>Like</span>
                            </button>
                            <button class="product-action-btn saved ${db.isInteracted(auth.getUser()?.id, p.id, 'saves') ? 'active' : ''}" 
                                    onclick="window.app.handleProductAction('${p.id}', 'saves')">
                                <i class="${db.isInteracted(auth.getUser()?.id, p.id, 'saves') ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
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
                            <a href="${whatsappLink}" target="_blank" class="btn btn-accent text-center" style="background: #25D366; display:flex; justify-content:center; align-items:center; gap: 0.5rem; padding: 0.8rem 1rem;">
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

    handleProductAction(productId, type) {
        const user = auth.getUser();
        if (!user) return; // Do nothing for guests as requested
        
        db.toggleInteraction(user.id, productId, type);
        this.renderProduct(productId);
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

    renderSavedItems() {
        const user = auth.getUser();
        if (!user) return this.navigate('register');
        
        const products = db.getSavedProducts(user.id);
        
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
                        ${products.map(p => createProductCard(p)).join('')}
                    </div>
                `}
            </div>
        `;
    }

    renderVendor(param) {
        // Parse ID, search query, or category from param
        // Format options: "v1", "v1/search=query", "v1/category=Electronics"
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

        const vendor = db.getVendor(id);
        if (!vendor) return this.navigate('home');
        
        const filters = { vendorId: id };
        if (searchQuery) filters.search = searchQuery;
        if (categoryQuery) filters.category = categoryQuery;

        const products = db.getProducts(filters);

        this.appEl.innerHTML = `
            <div class="home-split-layout">
                ${createSidebar()}
                
                <section class="main-panel fade-in">
                    <!-- Store Profile Header -->
                    <div style="height: clamp(140px, 25vh, 250px); background: ${vendor.coverPic ? `url(${vendor.coverPic}) center/cover no-repeat` : 'linear-gradient(135deg, var(--primary), var(--secondary))'}; border-radius: var(--radius-lg); margin-bottom: 3.5rem; position: relative; overflow: visible;">
                        <div style="position: absolute; bottom: -40px; left: 2rem; width: 100px; height: 100px; background: white; border-radius: 50%; display: flex; justify-content:center; align-items:center; box-shadow: var(--shadow-md); border: 5px solid white; overflow: hidden; z-index: 5;">
                            ${vendor.profilePic ? 
                                `<img src="${vendor.profilePic}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                                `<span style="font-size: 2.5rem; color: var(--primary); font-weight: 800;">${vendor.storeName.charAt(0)}</span>`
                            }
                        </div>
                    </div>
                    
                    <div class="mb-4 d-flex justify-between align-end flex-wrap gap-3">
                        <div>
                            <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800;">${vendor.storeName}</h1>
                            <div class="d-flex gap-3 text-muted mt-1 flex-wrap" style="font-size: 0.9rem;">
                                <span><i class="fa-regular fa-envelope"></i> ${vendor.email}</span>
                                <span><i class="fa-solid fa-phone"></i> ${vendor.phone}</span>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="app.startChat('${id}')">
                                <i class="fa-regular fa-comment-dots"></i> Message
                            </button>
                            <button class="btn-follow ${db.isFollowing(auth.getUser()?.id, id) ? 'following' : ''}" 
                                    onclick="window.app.handleToggleFollow('${id}')">
                                <i class="fa-solid ${db.isFollowing(auth.getUser()?.id, id) ? 'fa-user-check' : 'fa-user-plus'}"></i>
                                ${db.isFollowing(auth.getUser()?.id, id) ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    </div>

                    <!-- Store Stats Row -->
                    <div class="store-stats-row">
                        <div class="store-stat-item">
                            <span class="store-stat-value">${db.getFollowerCount(id)}</span>
                            <span class="store-stat-label">Followers</span>
                        </div>
                        <div class="store-stat-item">
                            <span class="store-stat-value">${db.getAverageRating(id)} <i class="fa-solid fa-star" style="color: #f59e0b; font-size: 0.9rem;"></i></span>
                            <span class="store-stat-label">Rating</span>
                        </div>
                        <div class="store-stat-item">
                            <span class="store-stat-value">${products.length}</span>
                            <span class="store-stat-label">Products</span>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-between align-center mb-2">
                        <h2 class="mb-0" style="font-size: 1.25rem;">
                            ${searchQuery ? `Search Results in "${vendor.storeName}"` : 
                              (categoryQuery ? `${categoryQuery} in "${vendor.storeName}"` : `All Products (${products.length})`)}
                        </h2>
                        ${(searchQuery || categoryQuery) ? `<button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;" onclick="app.navigate('vendor', '${id}')">View All</button>` : ''}
                    </div>
                    
                    ${searchQuery ? `<p class="text-muted mb-4">Showing results for "<strong>${searchQuery}</strong>"</p>` : ''}
                    ${categoryQuery ? `<p class="text-muted mb-4">Category: <strong>${categoryQuery}</strong></p>` : ''}

                    ${products.length > 0 ? `
                        <div class="grid grid-responsive">
                            ${products.map(p => createProductCard(p)).join('')}
                        </div>
                    ` : ''}

                    <!-- Feedbacks Section -->
                    <div class="reviews-section">
                        <div class="d-flex justify-between align-center mb-4">
                            <h3 class="mb-0">Customer Feedback</h3>
                            <button class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.9rem;" onclick="document.getElementById('feedbackForm').style.display='block'">
                                <i class="fa-solid fa-pen-to-square"></i> Leave Feedback
                            </button>
                        </div>
                        
                        <!-- Hidden Feedback Form -->
                        <div id="feedbackForm" class="glass-panel feedback-form fade-in" style="display: none; border: 1px solid var(--primary-light);">
                            <h4 class="mb-3">Rate your experience</h4>
                            <div class="star-rating-input">
                                <i class="fa-solid fa-star" data-val="1" onclick="window.app.handleStarClick(1)"></i>
                                <i class="fa-solid fa-star" data-val="2" onclick="window.app.handleStarClick(2)"></i>
                                <i class="fa-solid fa-star" data-val="3" onclick="window.app.handleStarClick(3)"></i>
                                <i class="fa-solid fa-star" data-val="4" onclick="window.app.handleStarClick(4)"></i>
                                <i class="fa-solid fa-star" data-val="5" onclick="window.app.handleStarClick(5)"></i>
                            </div>
                            <input type="hidden" id="reviewRating" value="5">
                            <textarea id="reviewComment" class="form-control mb-3" placeholder="Tell others what you think about this vendor..." rows="3"></textarea>
                            <div class="d-flex justify-end gap-2">
                                <button class="btn btn-outline" onclick="document.getElementById('feedbackForm').style.display='none'">Cancel</button>
                                <button class="btn btn-primary" onclick="window.app.submitReview('${id}')">Submit Review</button>
                            </div>
                        </div>

                        ${this.renderReviewsList(id)}
                    </div>
                </section>
            </div>
        `;
    }

    handleToggleFollow(vendorId) {
        const user = auth.getUser();
        if (!user) return alert("Please log in to follow this vendor.");
        
        db.toggleFollow(user.id, vendorId);
        this.handleRoute(); // Refresh view
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

    submitReview(vendorId) {
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

        db.addReview(vendorId, review);
        this.handleRoute(); // Refresh view
    }

    renderReviewsList(vendorId) {
        const reviews = db.getReviews(vendorId);
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

    renderFeedback() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        
        // Clear notifications
        db.updateVendor(user.id, { lastFeedbackViewedAt: Date.now() });

        const reviews = db.getReviews(user.id);
        const avgRating = db.getAverageRating(user.id);
        
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
                            ${this.renderReviewsList(user.id)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFollowers() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        const followers = db.getFollowerObjects(user.id);
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-5" style="max-width: 100%; padding-left: clamp(1rem, 5vw, 3rem); padding-right: clamp(1rem, 5vw, 3rem);">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Your Followers</h2>
                </div>

                ${followers.length === 0 ? `
                    <div class="glass-panel text-center py-5" style="background: white;">
                        <i class="fa-solid fa-users mb-3" style="font-size: 3rem; opacity: 0.2;"></i>
                        <p class="text-muted">You don't have any followers yet.</p>
                        <p class="text-muted" style="font-size: 0.8rem;">Share your products to get more visibility!</p>
                    </div>
                ` : `
                    <div class="grid grid-responsive">
                        ${followers.map(f => `
                            <div class="product-card text-center glass-panel" style="padding: 1.5rem 1rem;" onclick="app.navigate('vendor', '${f.id}')">
                                <div style="width: 60px; height: 60px; background: var(--accent); color: white; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; overflow: hidden;">
                                    ${f.profilePic ? `<img src="${f.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : f.storeName.charAt(0)}
                                </div>
                                <h3 style="font-size: 1.1rem; margin-bottom: 0.25rem;">${f.storeName}</h3>
                                <p class="text-muted text-sm mb-3">${f.name}</p>
                                <button class="btn btn-outline w-100" style="font-size: 0.85rem;">View Store</button>
                            </div>
                        `).join('')}
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

    handleLoginSubmit() {
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;
        const res = auth.login(email, pass);
        if(res.success) {
            this.navigate('dashboard');
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

    handleRegSubmit() {
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
        const res = auth.register(info);
        if(res.success) {
            this.registrationDraft = null; // Clear draft on success
            this.navigate('dashboard');
        } else {
            err.innerText = res.message;
            err.style.display = 'block';
        }
    }

    renderDashboard(param) {
        if(!auth.isLoggedIn()) return this.navigate('login');
        
        const user = db.getVendor(auth.getUser().id);
        
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
        
        const myProducts = db.getProducts(filters);
        const stats = db.getVendorStats(user.id);

        this.appEl.innerHTML = `
            <div class="home-split-layout">
                <!-- Sidebar: Categories -->
                ${createSidebar()}
                
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
                    <div class="glass-panel stat-card">
                        <h3 class="text-muted">Products</h3>
                        <div class="stat-value" style="color: var(--primary)">${stats.totalProducts}</div>
                    </div>
                    <div class="glass-panel stat-card">
                        <h3 class="text-muted">Views</h3>
                        <div class="stat-value" style="color: var(--secondary)">${stats.displayViews}</div>
                    </div>
                    <div class="glass-panel stat-card" onclick="app.navigate('inbox')" style="cursor: pointer;">
                        <h3 class="text-muted">Messages</h3>
                        <div class="stat-value" style="color: var(--primary)">${stats.totalMessages}</div>
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

    deleteProduct(productId) {
        if(confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            db.deleteProduct(productId);
            this.renderDashboard();
        }
    }

    renderSettings() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = db.getVendor(auth.getUser().id);

        this.appEl.innerHTML = `
            <div class="container fade-in py-4">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Store Settings</h2>
                </div>

                <div class="glass-panel" style="padding: 2rem; max-width: 800px; margin: 0 auto;">
                    <form id="settingsForm" onsubmit="app.handleSettingsSubmit(event)">
                        <div class="grid grid-cols-2 grid-cols-1-mobile gap-3">
                            <div class="form-group span-all-mobile">
                                <label class="no-word-break">Store Name</label>
                                <input type="text" id="setStoreName" class="form-control" value="${user.storeName}" required>
                            </div>
                            <div class="form-group span-all-mobile">
                                <label class="no-word-break">Store Location</label>
                                <input type="text" id="setStoreLoc" class="form-control" value="${user.location || ''}" required placeholder="e.g. Kampala">
                            </div>
                            <div class="form-group span-all-mobile">
                                <label class="no-word-break">Owner Name</label>
                                <input type="text" id="setName" class="form-control" value="${user.name}" required>
                            </div>
                            <div class="form-group span-all-mobile">
                                <label class="no-word-break">Email Address</label>
                                <input type="email" id="setEmail" class="form-control" value="${user.email}" required>
                            </div>
                            <div class="form-group span-all-mobile">
                                <label class="no-word-break">Phone Number</label>
                                <input type="tel" id="setPhone" class="form-control" value="${user.phone}" required>
                            </div>
                            <div class="form-group span-all-mobile" style="grid-column: span 2;">
                                <label class="no-word-break">WhatsApp Number</label>
                                <input type="tel" id="setWA" class="form-control" value="${user.whatsapp}" required>
                            </div>
                            
                            <div class="form-group form-group-flex" style="grid-column: span 2;">
                                <label class="no-word-break">Profile Picture (Square recommended)</label>
                                <div class="upload-zone" style="padding: 1.5rem;">
                                    <i class="fa-solid fa-user-circle"></i>
                                    <p>Click to Upload Profile Pic</p>
                                    <input type="file" id="setProfilePic" accept="image/*" onchange="window.app.handleImagePreview(event, 'profilePreview', 1)">
                                </div>
                                <div id="profilePreview" class="preview-gallery mb-2">
                                    ${user.profilePic ? `<img src="${user.profilePic}" class="preview-item" style="border-radius: 50%; width: 80px; height: 80px;">` : ''}
                                </div>
                            </div>

                            <div class="form-group form-group-flex" style="grid-column: span 2;">
                                <label class="no-word-break">Cover Image (Banner style)</label>
                                <div class="upload-zone" style="padding: 1.5rem;">
                                    <i class="fa-solid fa-image"></i>
                                    <p>Click to Upload Cover Photo</p>
                                    <input type="file" id="setCoverPic" accept="image/*" onchange="window.app.handleImagePreview(event, 'coverPreview', 1)">
                                </div>
                                <div id="coverPreview" class="preview-gallery">
                                    ${user.coverPic ? `<img src="${user.coverPic}" class="preview-item" style="aspect-ratio: 3/1; width: 100%; height: auto; max-height: 150px;">` : ''}
                                </div>
                            </div>
                        </div>

                        <div id="settingsMsg" style="margin: 1rem 0; padding: 0.75rem; border-radius: var(--radius-sm); display:none;"></div>
                        
                        <div class="d-flex justify-between align-center mt-4 flex-wrap gap-2">
                            <button type="button" class="btn" style="background: #fee2e2; color: #991b1b; padding: 0.5rem 1rem;" onclick="db.clearDatabase()">
                                <i class="fa-solid fa-triangle-exclamation"></i> Reset Database
                            </button>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline" onclick="app.navigate('dashboard')">Cancel</button>
                                <button type="submit" class="btn btn-primary" id="saveSettingsBtn">Save Changes</button>
                            </div>
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
                        <div style="width: 60px; height: 60px; background: rgba(37, 150, 190, 0.1); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.5rem;">
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

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const user = auth.getUser();
        const result = db.updatePassword(user.id, currentPass, newPass);

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
            const profileFile = document.getElementById('setProfilePic').files[0];
            const coverFile = document.getElementById('setCoverPic').files[0];

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

            db.updateVendor(user.id, updateData);
            
            // Sync auth state to reflect changes across the UI immediately
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
            msg.innerText = 'Error saving settings. Please try smaller images.';
            msg.style.display = 'block';
            msg.style.background = '#fee2e2';
            msg.style.color = '#991b1b';
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Changes';
        }
    }

    renderSubscription() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = db.getVendor(auth.getUser().id);

        this.appEl.innerHTML = `
            <div class="container fade-in py-4">
                <div class="d-flex align-center gap-2 mb-4">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="mb-0">Choose Your Plan</h2>
                </div>

                <div class="glass-panel mb-4" style="padding: 1.5rem; text-align: center;">
                    <p class="mb-1 text-muted">Your Current Plan</p>
                    <h3 style="font-size: 1.5rem; color: var(--primary);">${user.plan}</h3>
                    <p class="text-sm">Uploads: <strong>${user.uploadsLeft}</strong></p>
                </div>

                <div class="grid grid-cols-2 grid-cols-1-mobile gap-4">
                    <!-- Silver Plan -->
                    <div class="glass-panel p-4 d-flex flex-column h-100" style="border-top: 5px solid #C0C0C0;">
                        <div class="text-center mb-4">
                            <h3 style="color: #666; font-size: 1.5rem;">SILVER</h3>
                            <div style="font-size: 2rem; font-weight: 800; margin: 1rem 0;">Shs. 5,000<span style="font-size: 1rem; font-weight: 400;">/mo</span></div>
                        </div>
                        <ul style="list-style: none; padding: 0; margin-bottom: 2rem; flex: 1;">
                            <li class="mb-2"><i class="fa-solid fa-check" style="color:#25D366; margin-right: 0.5rem;"></i> 300 Monthly Uploads</li>
                            <li class="mb-2"><i class="fa-solid fa-check" style="color:#25D366; margin-right: 0.5rem;"></i> Verified Badge</li>
                            <li class="mb-2"><i class="fa-solid fa-check" style="color:#25D366; margin-right: 0.5rem;"></i> Priority in Search</li>
                        </ul>
                        <div class="form-group mb-3">
                            <label>Duration</label>
                            <select id="subSilverDuration" class="form-control">
                                <option value="1">1 Month - Shs. 5,000</option>
                                <option value="6">6 Months - Shs. 30,000</option>
                                <option value="12">12 Months - Shs. 50,000 (Save 20%)</option>
                            </select>
                        </div>
                        <button class="btn btn-primary w-100" onclick="window.app.promptPayment('SILVER', document.getElementById('subSilverDuration').value)">Upgrade to Silver</button>
                    </div>

                    <!-- Gold Plan -->
                    <div class="glass-panel p-4 d-flex flex-column h-100" style="border-top: 5px solid #FFD700; background: linear-gradient(to bottom, #fffcf0, #ffffff);">
                        <div class="text-center mb-4">
                            <h3 style="color: #B8860B; font-size: 1.5rem;">GOLD</h3>
                            <div style="font-size: 2rem; font-weight: 800; margin: 1rem 0;">Shs. 10,000<span style="font-size: 1rem; font-weight: 400;">/mo</span></div>
                        </div>
                        <ul style="list-style: none; padding: 0; margin-bottom: 2rem; flex: 1;">
                            <li class="mb-2"><i class="fa-solid fa-check" style="color:#25D366; margin-right: 0.5rem;"></i> 1,000 Monthly Uploads</li>
                            <li class="mb-2"><i class="fa-solid fa-check" style="color:#25D366; margin-right: 0.5rem;"></i> Verified Badge</li>
                            <li class="mb-2"><i class="fa-solid fa-check" style="color:#25D366; margin-right: 0.5rem;"></i> Top Featured Listing</li>
                            <li class="mb-2"><i class="fa-solid fa-check" style="color:#25D366; margin-right: 0.5rem;"></i> WhatsApp Support</li>
                        </ul>
                        <div class="form-group mb-3">
                            <label>Duration</label>
                            <select id="subGoldDuration" class="form-control">
                                <option value="1">1 Month - Shs. 10,000</option>
                                <option value="6">6 Months - Shs. 50,000 (Save 15%)</option>
                                <option value="12">12 Months - Shs. 90,000 (Save 25%)</option>
                            </select>
                        </div>
                        <button class="btn btn-primary w-100" style="background: linear-gradient(135deg, #B8860B, #FFD700);" onclick="window.app.promptPayment('GOLD', document.getElementById('subGoldDuration').value)">Upgrade to Gold</button>
                    </div>
                </div>

                <div class="mt-5 text-center text-muted">
                    <h4>Need a Custom Plan?</h4>
                    <p>For more than 1,000 uploads or enterprise solutions, please contact our sales team.</p>
                    <a href="tel:+256700000000" class="btn btn-outline mt-2"><i class="fa-solid fa-phone"></i> Contact Sales</a>
                </div>
            </div>
        `;
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

    shareWhatsApp() {
        const user = db.getVendor(auth.getUser().id);
        const url = encodeURIComponent(window.location.origin + window.location.pathname);
        const text = encodeURIComponent(`Shop amazing items on UgaTrade! ${url}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
        
        setTimeout(() => {
            db.addBonusUploads(user.id, 10);
            alert("Awesome! You've successfully claimed +10 bonus uploads.");
            this.renderDashboard();
        }, 1500);
    }

    promptPayment(planName, duration) {
        duration = Number(duration);
        const phone = prompt(`Paying for ${planName} Plan (${duration} months). Enter your Airtel/MTN Mobile Money number:`, "07");
        if(phone && phone.length >= 9) {
            const pin = prompt("Enter your MM PIN to confirm fake transaction:");
            if(pin) {
                db.upgradePlan(auth.getUser().id, planName, duration);
                alert(`Success! You have activated the ${planName} plan.`);
                this.renderDashboard();
            } else {
                alert("Payment cancelled.");
            }
        } else if (phone) {
            alert("Invalid phone number.");
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
            const user = db.getVendor(auth.getUser().id);
            if (user.uploadsLeft <= 0) {
                throw new Error("You have reached your monthly upload limit. Please activate a premium plan or get bonus uploads!");
            }

            // Use pre-compressed images from buffer if available
            let images = this.imageBuffers['addImagePreview'] || [];
            
            const filesInput = document.getElementById('productImagesInput');
            const files = filesInput ? Array.from(filesInput.files) : [];

            if (images.length === 0 && files.length > 0) {
                // Fallback for edge cases where buffer might be empty but files exist
                const imagesRaw = await Promise.all(files.map(file => this.fileToBase64(file)));
                images = await Promise.all(imagesRaw.map(img => this.compressImage(img, 1024, 0.7)));
            }

            if (images.length === 0) {
                throw new Error("Please select at least one image.");
            }

            const newProduct = {
                vendorId: user.id,
                name: document.getElementById('addName').value,
                category: document.getElementById('addCat').value,
                price: Number(document.getElementById('addPrice').value),
                location: user.location || 'Uganda',
                description: document.getElementById('addDesc').value,
                images: images
            };

            db.addProduct(newProduct);
            db.decrementUploadCount(user.id);
            
            alert("Product published successfully!");
            this.navigate('dashboard');
        } catch (error) {
            console.error(error);
            if(errorDiv) {
                errorDiv.innerText = error.message || 'Error publishing product. Please try again.';
                errorDiv.style.display = 'block';
            } else {
                alert(error.message);
            }
            if(saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerText = 'Publish Product';
            }
        }
    }

    renderAddProductView() {
        if(!auth.isLoggedIn()) return this.navigate('register');
        
        const categories = db.getCategories();
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

    renderDocumentsList(type) {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        
        // type is 'invoice' or 'receipt'
        const docType = (type || 'invoice').toLowerCase();
        const displayType = docType.charAt(0).toUpperCase() + docType.slice(1);
        
        const docs = db.getDocuments(user.id, displayType);
        
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

    saveDocumentForm(e, type) {
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
        
        const savedDoc = db.saveDocument(doc);
        this.navigate('document-view', savedDoc.id);
    }

    renderDocumentView(id) {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const doc = db.getDocument(id);
        const user = db.getVendor(auth.getUser().id);
        if(!doc || doc.vendorId !== user.id) return this.navigate('profile');
        
        const docRef = doc.id.slice(-6).toUpperCase();
        const isInvoice = doc.type.toLowerCase() === 'invoice';
        const docClass = isInvoice ? 'document-invoice' : 'document-receipt';
        
        this.appEl.innerHTML = `
            <div class="container fade-in py-4">
                <div class="d-flex align-center justify-between mb-4 flex-wrap gap-2">
                    <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('documents', '${doc.type.toLowerCase()}')">
                        <i class="fa-solid fa-arrow-left"></i> Back
                    </button>
                    <div class="d-flex gap-2 flex-wrap">
                        ${isInvoice ? `
                            <button class="btn btn-outline" onclick="app.convertInvoiceToReceipt('${doc.id}')" style="border-color: var(--secondary); color: var(--secondary);">
                                <i class="fa-solid fa-file-circle-check"></i> Convert to Receipt
                            </button>
                        ` : ''}
                        <button class="btn btn-primary" onclick="app.downloadDocumentPdf('${doc.id}')">
                            <i class="fa-solid fa-file-pdf"></i> Download PDF
                        </button>
                        <button class="btn btn-outline" style="color: #25D366; border-color: #25D366;" onclick="app.shareDocumentWhatsApp('${doc.id}')">
                            <i class="fa-brands fa-whatsapp"></i> Share
                        </button>
                        <button class="btn btn-outline" onclick="app.shareDocumentChat('${doc.id}')">
                            <i class="fa-solid fa-message"></i> Send in Chat
                        </button>
                    </div>
                </div>

                <div class="glass-panel document-card-fluid ${docClass}" style="max-width: 800px; margin: 0 auto; padding: 2.5rem 1.5rem; background: #fff; overflow-x: hidden;" id="documentPdfTarget">
                    ${isInvoice ? `<div class="doc-watermark">PROFORMA</div>` : ''}
                    <div class="doc-stamp ${isInvoice ? 'stamp-pending' : 'stamp-paid'}">${isInvoice ? 'Pending' : 'Paid'}</div>
                    
                    <div class="d-flex justify-between align-start mb-5" style="border-bottom: 2px solid #eee; padding-bottom: 2rem; width: 100%; position: relative; z-index: 5;">
                        <div>
                            <h1 style="color: ${isInvoice ? '#d97706' : 'var(--primary)'}; margin: 0 0 0.5rem 0; font-size: clamp(1.4rem, 5vw, 2.8rem); text-transform: uppercase; line-height: 1;">${doc.type}</h1>
                            <p class="text-muted" style="margin: 0; font-weight: 500; font-size: 0.8rem;">Ref: #${docRef}</p>
                            <p class="text-muted" style="margin: 0; font-size: 0.75rem;">Date: ${new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div class="text-left">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: clamp(1rem, 4vw, 1.4rem);">${user.storeName}</h3>
                            <p class="text-muted" style="margin: 0; font-size: 0.75rem;">${user.phone}</p>
                            <p class="text-muted" style="margin: 0; font-size: 0.75rem;">${user.email}</p>
                            ${user.location ? `<p class="text-muted" style="margin: 0; font-size: 0.75rem;">${user.location}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="mb-5" style="position: relative; z-index: 5;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #666; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">Billed To:</h4>
                        <h3 style="margin: 0 0 0.25rem 0; font-size: 1.25rem;">${doc.customerName}</h3>
                        <p class="text-muted" style="margin: 0; font-size: 0.9rem;">${doc.customerPhone}</p>
                    </div>
                    
                    <div style="width: 100%; margin-bottom: 2rem; border-radius: var(--radius-sm); position: relative; z-index: 5;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: ${isInvoice ? '#fffbeb' : '#f8f9fa'}; border-bottom: 2px solid ${isInvoice ? '#fde68a' : '#eee'}; text-align: left;">
                                    <th style="padding: 1rem; color: #444; width: 50%;">Description</th>
                                    <th style="padding: 1rem 0.5rem; color: #444; width: 60px; text-align: left;">Qty</th>
                                    <th style="padding: 1rem 0.5rem; color: #444; width: 100px; text-align: left;">Price</th>
                                    <th style="padding: 1rem 0.5rem; color: #444; width: 110px; text-align: left;">Amount</th>
                                </tr>
                            </thead>
                        <tbody>
                            ${doc.items.map(item => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 1rem;">${item.desc}</td>
                                    <td style="padding: 1rem 0.5rem; text-align: left;">${item.qty}</td>
                                    <td style="padding: 1rem 0.5rem; text-align: left;">${formatPrice(item.price)}</td>
                                    <td style="padding: 1rem 0.5rem; text-align: left; font-weight: 500;">${formatPrice(item.qty * item.price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        </table>
                    </div>
                    
                    <div class="d-flex justify-end" style="position: relative; z-index: 5;">
                        <div style="width: 100%; max-width: 320px; margin-right: 1.5rem;">
                            <div class="d-flex justify-between mb-2">
                                <span class="text-muted">Subtotal:</span>
                                <span style="font-weight: 500;">${formatPrice(doc.total)}</span>
                            </div>
                            <div class="d-flex justify-between" style="border-top: 2px solid ${isInvoice ? '#fde68a' : '#eee'}; padding-top: 1rem; font-size: 1.25rem; font-weight: 800;">
                                <span>Total:</span>
                                <span class="text-total" style="font-size: clamp(1.2rem, 4vw, 1.6rem);">${formatPrice(doc.total)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center mt-5 pt-4" style="border-top: 1px solid #eee; color: #888; font-size: 0.85rem; position: relative; z-index: 5;">
                        ${isInvoice ? `
                            <div class="temp-doc-notice mb-3">
                                <i class="fa-solid fa-circle-info"></i> This is a temporary proforma document. Total subject to final payment.
                            </div>
                        ` : ''}
                        <p>Thank you for your business!</p>
                        <p>Generated securely via UgaTrade Platform</p>
                    </div>
                </div>
            </div>
            
            <!-- Hidden Modal for Chat Selection -->
            <div id="chatShareModal" class="drawer-overlay" style="display:none; align-items:center; justify-content:center; z-index: 2000; opacity: 1;">
                <div class="glass-panel slide-in" style="width: 90%; max-width: 400px; padding: 1.5rem;">
                    <div class="d-flex justify-between align-center mb-3">
                        <h3 style="margin: 0;">Share to Chat</h3>
                        <button class="btn" style="padding: 0; font-size: 1.2rem;" onclick="const m = document.getElementById('chatShareModal'); m.classList.remove('active'); setTimeout(() => m.style.display='none', 300)">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div id="chatShareList" style="max-height: 400px; overflow-y: auto;">
                        <!-- Populate with active chats -->
                    </div>
                </div>
            </div>
        `;
    }

    convertInvoiceToReceipt(invoiceId) {
        const invoice = db.getDocument(invoiceId);
        if (!invoice || invoice.type.toLowerCase() !== 'invoice') return;

        if (!confirm('Are you sure you want to convert this Invoice into a finalized Receipt?')) return;

        const newReceipt = {
            vendorId: invoice.vendorId,
            type: 'Receipt',
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone,
            items: JSON.parse(JSON.stringify(invoice.items)), // Deep copy items
            total: invoice.total
        };

        const savedReceipt = db.saveDocument(newReceipt);
        
        // Success notification using alert (following app's literal pattern)
        alert('Invoice successfully converted to Receipt!');
        this.navigate('document-view', savedReceipt.id);
    }

    downloadDocumentPdf(id) {
        if(typeof html2pdf === 'undefined') {
            alert("PDF engine is still loading, please try again in a few seconds.");
            return;
        }
        
        const doc = db.getDocument(id);
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

    shareDocumentWhatsApp(id) {
        const doc = db.getDocument(id);
        const user = db.getVendor(auth.getUser().id);
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

    shareDocumentChat(id) {
        const user = auth.getUser();
        const doc = db.getDocument(id);
        const chats = db.getChats(user.id);
        
        const listEl = document.getElementById('chatShareList');
        
        // Suggest recipient from document phone
        const cleanPhone = doc.customerPhone ? doc.customerPhone.replace(/[^0-9]/g, '') : '';
        const allVendors = db.getVendors();
        const matchingUser = cleanPhone ? allVendors.find(v => v.phone && v.phone.replace(/[^0-9]/g, '').includes(cleanPhone)) : null;

        let html = '';
        
        if (matchingUser && matchingUser.id !== user.id) {
            html += `
                <div class="mb-3">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary); margin-bottom: 0.5rem; font-weight: 700;">Suggested (From Document)</h4>
                    <div class="d-flex justify-between align-center" style="background: rgba(37, 150, 190, 0.08); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(37, 150, 190, 0.2); cursor:pointer;" onclick="app.initiateNewChatShare('${matchingUser.id}', '${id}')">
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
            html += chats.map(chat => {
                const otherId = chat.participants.find(p => p !== user.id);
                const otherUser = db.getVendor(otherId) || { storeName: 'User', name: 'User' };
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
            }).join('');
        }

        listEl.innerHTML = html;
        
        const modal = document.getElementById('chatShareModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    async initiateNewChatShare(recipientId, docId) {
        const user = auth.getUser();
        const chat = db.getOrCreateChat(user.id, recipientId);
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

            db.sendMessage(chatId, auth.getUser().id, dataUrl, 'image');
            
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

    renderProfileHub() {
        if(!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        const totalLikes = db.getTotalLikesReceived(user.id);
        const unreadMessages = db.getUnreadCount(user.id);
        const unreadFeedback = db.getUnreadFeedbackCount(user.id);
        
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
                                <span class="hub-stat-value">${db.getFollowerCount(user.id)}</span>
                                <span class="hub-stat-label">Followers</span>
                            </div>
                            <div class="hub-stat-item" style="flex:1; cursor: pointer; position: relative;" onclick="app.navigate('feedback')">
                                <span class="hub-stat-value">${db.getAverageRating(user.id)} <i class="fa-solid fa-star" style="color:#f59e0b; font-size:0.8rem;"></i></span>
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

    renderStores(param) {
        let filters = {};
        if (param && param.startsWith('search=')) {
            filters.search = decodeURIComponent(param.replace('search=', ''));
        }
        const vendors = db.getVendors(filters);

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


                    <div class="store-list-grid">
                        ${vendors.map(vendor => {
                            const products = db.getProducts({ vendorId: vendor.id });
                            const rating = db.getAverageRating(vendor.id);
                            
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
                        }).join('')}
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
    }

    renderInbox() {
        if (!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        const chats = db.getChats(user.id);

        this.appEl.innerHTML = `
            <div class="container-full fade-in py-4">
                <div class="container">
                    <div class="d-flex align-center gap-2 mb-4">
                        <button class="btn btn-outline" style="padding: 0.5rem;" onclick="app.navigate('profile')">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h2 class="mb-0">Messages</h2>
                    </div>

                    <div class="chat-list-card">
                    ${chats.length > 0 ? chats.map(chat => {
                        const otherId = chat.participants.find(id => id !== user.id);
                        const otherUser = db.getVendor(otherId);
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
                                        <span class="chat-name ${ (chat.lastMessageAt || 0) > ((chat.lastReadAt && chat.lastReadAt[user.id]) ? chat.lastReadAt[user.id] : 0) ? 'font-bold' : '' }">${otherUser.storeName || otherUser.name}</span>
                                        <span class="chat-time">${timeStr}</span>
                                    </div>
                                    <div class="d-flex justify-between align-center">
                                        <p class="chat-preview ${ (chat.lastMessageAt || 0) > ((chat.lastReadAt && chat.lastReadAt[user.id]) ? chat.lastReadAt[user.id] : 0) ? 'text-main' : '' }">${chat.lastMessage}</p>
                                        ${isExpiredSoon ? `<span class="expiry-badge">Expiring soon</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') : `
                        <div class="text-center py-5">
                            <i class="fa-regular fa-comments mb-3" style="font-size: 3rem; color: #cbd5e1;"></i>
                            <p class="text-muted">No messages yet.</p>
                            <button class="btn btn-primary btn-sm mt-3" onclick="app.navigate('shop')">Start Shopping</button>
                        </div>
                    `}
                </div>
            </div>
        </div>
        `;
    }

    renderChat(chatId) {
        if (!auth.isLoggedIn()) return this.navigate('login');
        const user = auth.getUser();
        const chat = db.getChat(chatId);
        if (!chat) return this.navigate('inbox');

        const otherId = chat.participants.find(id => id !== user.id);
        const otherUser = db.getVendor(otherId);
        const messages = db.getMessages(chatId);

        // Mark as read when viewing
        db.markAsRead(chatId, user.id);
        this.updateNotificationBadges();

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
                            <div class="chat-name">${otherUser.storeName || otherUser.name}</div>
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
                                Start of your conversation with ${otherUser.storeName}
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

    handleSendMessage(chatId) {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        const user = auth.getUser();
        db.sendMessage(chatId, user.id, text);
        this.updateNotificationBadges();
        
        input.value = '';
        this.renderChat(chatId);
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

    startChat(vendorId, productId = null) {
        if (!auth.isLoggedIn()) return this.navigate('login');
        const buyer = auth.getUser();
        if (buyer.id === vendorId) return alert("You cannot message your own store.");

        let productContext = null;
        if (productId) {
            const p = db.getProduct(productId);
            if (p) {
                productContext = {
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    image: p.images[0]
                };
            }
        }

        const chat = db.getOrCreateChat(buyer.id, vendorId, productContext);
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
        const themeColor = color || getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2596be';
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
