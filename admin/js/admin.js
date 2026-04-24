class AdminApp {
    constructor() {
        this.mainEl = document.getElementById('adminMain');
        this.currentView = 'dashboard';
        this.init();
    }

    init() {
        window.adminApp = this;
        this.handleRoute();
        window.addEventListener('hashchange', () => this.handleRoute());
        this.updateNav();
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const parts = hash.split('/');
        this.currentView = parts[0];
        const param = parts[1];
        
        this.updateNav();
        this.updateNotificationBadges();

        switch(this.currentView) {
            case 'dashboard': this.renderDashboard(); break;
            case 'vendors': this.renderVendors(); break;
            case 'products': this.renderProducts(); break;
            case 'messages': this.renderMessages(); break;
            case 'chat': this.renderChat(param); break;
            default: this.renderDashboard(); break;
        }
    }

    updateNav() {
        const items = document.querySelectorAll('.admin-nav-item');
        items.forEach(item => {
            const hash = item.getAttribute('href').slice(1);
            item.classList.toggle('active', hash === this.currentView);
        });
    }

    updateNotificationBadges() {
        const unreadCount = db.getUnreadCount('admin');
        const link = document.getElementById('adminMessagesLink');
        if (link) {
            let badge = link.querySelector('.admin-badge');
            if (unreadCount > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'admin-badge';
                    link.appendChild(badge);
                }
                badge.innerText = unreadCount;
            } else if (badge) {
                badge.remove();
            }
        }
    }

    renderDashboard() {
        const vendors = db.getAllVendorsAdmin();
        const products = db.getAllProductsAdmin();
        const pendingVendors = vendors.filter(v => v.status === 'pending').length;
        const activeVendors = vendors.filter(v => v.status === 'active').length;

        this.mainEl.innerHTML = `
            <div class="admin-header">
                <h1>Admin Dashboard</h1>
            </div>

            <div class="admin-stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Active Vendors</div>
                    <div class="stat-value" style="color: var(--admin-success)">${activeVendors}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Pending Approval</div>
                    <div class="stat-value" style="color: var(--admin-warning)">${pendingVendors}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Products</div>
                    <div class="stat-value">${products.length}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Flagged Content</div>
                    <div class="stat-value" style="color: var(--admin-danger)">0</div>
                </div>
            </div>

            <div class="admin-card">
                <h3>System Overview</h3>
                <p>Welcome to the UgaTrade Admin Panel. From here you can manage seller accounts and moderate listings.</p>
            </div>
        `;
    }

    renderVendors() {
        const vendors = db.getAllVendorsAdmin();

        this.mainEl.innerHTML = `
            <div class="admin-header">
                <h1>Vendor Management</h1>
            </div>

            <div class="admin-card">
                <div class="admin-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Store Name</th>
                                <th>Owner</th>
                                <th>Phone</th>
                                <th>Plan</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vendors.map(v => `
                                <tr>
                                    <td><strong>${v.storeName}</strong></td>
                                    <td>${v.name}</td>
                                    <td>${v.phone}</td>
                                    <td><span class="badge">${v.plan}</span></td>
                                    <td><span class="status-badge status-${v.status}">${v.status}</span></td>
                                    <td>
                                        <div class="d-flex gap-2">
                                            ${v.status !== 'active' ? `
                                                <button class="admin-btn btn-activate" onclick="adminApp.toggleVendorStatus('${v.id}', 'active')">Activate</button>
                                            ` : `
                                                <button class="admin-btn btn-deactivate" onclick="adminApp.toggleVendorStatus('${v.id}', 'deactivated')">Deactivate</button>
                                            `}
                                            <button class="admin-btn btn-show" onclick="adminApp.startChatWithVendor('${v.id}')">
                                                <i class="fa-solid fa-comment-dots"></i> Message
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderProducts() {
        const products = db.getAllProductsAdmin();
        const vendors = db.getAllVendorsAdmin();

        this.mainEl.innerHTML = `
            <div class="admin-header">
                <h1>Product Moderation</h1>
            </div>

            <div class="admin-card">
                <div class="admin-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Product Name</th>
                                <th>Vendor</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => {
                                const vendor = vendors.find(v => v.id === p.vendorId);
                                return `
                                    <tr>
                                        <td><img src="${p.images[0]}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;"></td>
                                        <td><strong>${p.name}</strong></td>
                                        <td>${vendor ? vendor.storeName : 'Unknown'}</td>
                                        <td>${p.price.toLocaleString()}</td>
                                        <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                                        <td>
                                            <div class="d-flex gap-2">
                                                ${p.status === 'active' ? `
                                                    <button class="admin-btn btn-hide" onclick="adminApp.toggleProductStatus('${p.id}', 'hidden')">Hide</button>
                                                ` : `
                                                    <button class="admin-btn btn-show" onclick="adminApp.toggleProductStatus('${p.id}', 'active')">Show</button>
                                                `}
                                                <button class="admin-btn btn-deactivate" onclick="adminApp.deleteProduct('${p.id}')">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    toggleVendorStatus(id, status) {
        if(confirm(`Are you sure you want to change this vendor status to ${status}?`)) {
            db.updateVendorStatus(id, status);
            this.renderVendors();
        }
    }

    toggleProductStatus(id, status) {
        db.updateProductStatus(id, status);
        this.renderProducts();
    }

    deleteProduct(id) {
        if(confirm("Are you sure you want to permanently delete this product?")) {
            db.deleteProduct(id);
            this.renderProducts();
        }
    }

    // Messaging System
    renderMessages() {
        const chats = db.getChats('admin');

        this.mainEl.innerHTML = `
            <div class="admin-header">
                <h1>Vendor Messages</h1>
            </div>

            <div class="chat-list-container">
                ${chats.length > 0 ? chats.map(chat => {
                    const vendorId = chat.participants.find(id => id !== 'admin');
                    const vendor = db.getVendor(vendorId) || { storeName: 'Unknown Vendor' };
                    const unread = (chat.lastMessageAt || 0) > ((chat.lastReadAt && chat.lastReadAt['admin']) ? chat.lastReadAt['admin'] : 0);

                    return `
                        <div class="chat-list-item" onclick="location.hash = 'chat/${chat.id}'">
                            <div class="chat-avatar">
                                ${vendor.profilePic ? `<img src="${vendor.profilePic}" class="chat-avatar">` : (vendor.storeName || 'V').charAt(0)}
                            </div>
                            <div class="chat-item-info">
                                <div class="chat-item-header">
                                    <span class="chat-item-name">${vendor.storeName || vendor.name}</span>
                                    <span class="chat-item-time">${this.formatTime(chat.lastMessageAt)}</span>
                                </div>
                                <div class="d-flex justify-between align-center">
                                    <p class="chat-item-preview ${unread ? 'font-bold' : ''}">${chat.lastMessage}</p>
                                    ${unread ? `<span class="status-badge status-pending">New</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : `
                    <div class="admin-card text-center">
                        <p class="text-muted">No messages found. Start a conversation from the Vendor Management tab.</p>
                    </div>
                `}
            </div>
        `;
    }

    renderChat(chatId) {
        const chat = db.getChat(chatId);
        if (!chat) return location.hash = 'messages';

        const vendorId = chat.participants.find(id => id !== 'admin');
        const vendor = db.getVendor(vendorId) || { storeName: 'Unknown Vendor' };
        const messages = db.getMessages(chatId);

        db.markAsRead(chatId, 'admin');
        this.updateNotificationBadges();

        this.mainEl.innerHTML = `
            <div class="admin-header">
                <div class="d-flex align-center gap-3">
                    <button class="btn-back" onclick="location.hash = 'messages'"><i class="fa-solid fa-arrow-left"></i></button>
                    <h1>Chat with ${vendor.storeName || vendor.name}</h1>
                </div>
            </div>

            <div class="chat-window">
                <div class="chat-window-header">
                    <div class="chat-avatar" style="width: 32px; height: 32px; font-size: 0.9rem;">
                         ${vendor.profilePic ? `<img src="${vendor.profilePic}" style="width: 32px; height: 32px; border-radius: 50%;">` : (vendor.storeName || 'V').charAt(0)}
                    </div>
                    <strong>${vendor.storeName || vendor.name}</strong>
                </div>

                <div class="chat-messages" id="chatMessages">
                    ${messages.map(msg => {
                        const isMe = msg.senderId === 'admin';
                        return `
                            <div class="chat-bubble ${isMe ? 'sent' : 'received'}">
                                ${msg.type === 'image' ? `
                                    <img src="${msg.text}" style="max-width: 100%; border-radius: 0.5rem; cursor: pointer;" onclick="window.open('${msg.text}')">
                                ` : msg.text}
                                <span class="chat-msg-time">${this.formatTime(msg.timestamp)}</span>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="chat-input-area">
                    <input type="file" id="imageInput" accept="image/*" style="display: none;">
                    <button class="btn-send" style="background: #e2e8f0; color: #475569;" onclick="document.getElementById('imageInput').click()">
                        <i class="fa-solid fa-camera"></i>
                    </button>
                    <input type="text" id="chatInput" class="chat-input" placeholder="Type your message..." onkeypress="if(event.key === 'Enter') adminApp.handleSendMessage('${chatId}')">
                    <button class="btn-send" onclick="adminApp.handleSendMessage('${chatId}')">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        const msgContainer = document.getElementById('chatMessages');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;

        // Setup image input listener
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) this.handleImageShare(chatId, file);
            };
        }
    }

    handleSendMessage(chatId) {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        db.sendMessage(chatId, 'admin', text);
        input.value = '';
        this.renderChat(chatId);
    }

    async handleImageShare(chatId, file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Str = e.target.result;
            const compressed = await this.compressImage(base64Str, 1200, 0.7);
            
            db.sendMessage(chatId, 'admin', compressed, 'image');
            this.renderChat(chatId);
        };
        reader.readAsDataURL(file);
    }

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

    startChatWithVendor(vendorId) {
        const chat = db.getOrCreateChat('admin', vendorId);
        location.hash = `chat/${chat.id}`;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new AdminApp();
});
