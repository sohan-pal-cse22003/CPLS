const BASE_URL = 'https://cpls.onrender.com'; // Global base URL constant

class APIDatabase {
  constructor() {
    this.categoriesCache = {};
    // Prefetch categories to populate cache for synchronous callers
    this.getCategories().catch(() => { });
  }

  // Helpers
  getData(key) {
    if (key === 'ua_categories') {
      return this.categoriesCache || {};
    }
    return null;
  }

  // Helper to construct headers with JWT token
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = sessionStorage.getItem('ua_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Network handler wrapper to simplify requests
  async request(path, options = {}) {
    options.headers = {
      ...this.getHeaders(),
      ...options.headers
    };
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${res.status}`);
    }
    return res.json();
  }

  // AUTH API
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (res.success) {
      sessionStorage.setItem('ua_token', res.accessToken);
      sessionStorage.setItem('ua_current_user', JSON.stringify(res.user));
    }
    return res;
  }

  async register(email, name, password, role, services = []) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: { email, name, password, role, services }
    });

    // Automatically log in if Consumer
    if (role === 'consumer') {
      // Login automatically by requesting token
      const loginRes = await this.login(email, password);
      return loginRes;
    }

    return { success: true, user: res };
  }

  getCurrentUser() {
    const sessionUser = JSON.parse(sessionStorage.getItem('ua_current_user'));
    return sessionUser;
  }

  logout() {
    sessionStorage.removeItem('ua_token');
    sessionStorage.removeItem('ua_current_user');
    window.location.href = 'index.html';
  }

  async updateProfile(name, email, password = null) {
    const body = { name, email };
    if (password) body.password = password;

    const updatedUser = await this.request('/auth/profile', {
      method: 'PATCH',
      body
    });

    // Update stored session user info
    sessionStorage.setItem('ua_current_user', JSON.stringify(updatedUser));
    return updatedUser;
  }

  // CATEGORIES & SERVICES API
  async getCategories() {
    const list = await this.request('/categories');
    // Transform array into object keyed by category ID to match frontend expectation
    const categoriesObj = {};
    list.forEach(cat => {
      categoriesObj[cat.id] = cat;
    });
    this.categoriesCache = categoriesObj;
    return categoriesObj;
  }

  async addCategory(id, name, icon, description) {
    return this.request('/categories', {
      method: 'POST',
      body: { id, name, icon, description }
    });
  }

  async addSubcategory(categoryId, subcatName, price, time, description) {
    return this.request(`/categories/${categoryId}/subcategories`, {
      method: 'POST',
      body: { name: subcatName, price, time, description }
    });
  }

  // SEARCH AND AUTO-SUGGESTIONS API
  async getSearchSuggestions(query) {
    return this.request(`/categories/suggestions?query=${encodeURIComponent(query)}`);
  }

  // BOOKINGS API
  async getBookings() {
    return this.request('/bookings');
  }

  async getProvidersForService(subcatId) {
    return this.request(`/listings/providers?subcatId=${subcatId}`);
  }

  async createBooking(category, subcategoryId, providerId, price, date, time, address) {
    return this.request('/bookings', {
      method: 'POST',
      body: { category, subcategoryId, providerId, price, date, time, address }
    });
  }

  async getProviderBookedSlots(providerId, date) {
    return this.request(`/bookings/slots?providerId=${providerId}&date=${date}`);
  }

  async updateBookingStatus(bookingId, status, enteredOtp = '') {
    return this.request(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: { status, enteredOtp }
    });
  }

  async rateBooking(bookingId, rating, comment) {
    return this.request(`/bookings/${bookingId}/rate`, {
      method: 'POST',
      body: { rating, comment }
    });
  }

  // ADMIN OPERATIONS API
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async toggleProviderApproval(providerId) {
    return this.request(`/admin/providers/${providerId}/approve`, {
      method: 'PATCH'
    });
  }

  async toggleProviderStatus(providerId) {
    const res = await this.request('/listings/me/status', {
      method: 'PATCH'
    });
    // Update stored session user's online status
    const user = this.getCurrentUser();
    if (user && user.id === providerId) {
      user.online = res.online;
      sessionStorage.setItem('ua_current_user', JSON.stringify(user));
    }
    return res;
  }

  async toggleUserBlock(userId) {
    return this.request(`/admin/users/${userId}/block`, {
      method: 'PATCH'
    });
  }

  async updateProviderServices(providerId, services) {
    const res = await this.request('/listings/me/catalog', {
      method: 'PATCH',
      body: { services }
    });
    // Update stored session user's listings/services catalog
    const user = this.getCurrentUser();
    if (user && user.id === providerId) {
      user.services = res.listings ? res.listings.map(l => ({ id: l.subcat_id, price: Number(l.price) })) : [];
      sessionStorage.setItem('ua_current_user', JSON.stringify(user));
    }
    return user;
  }

  async getUsersList() {
    return this.request('/admin/users');
  }
}

// Instantiate db global variable
window.db = new APIDatabase();


// --- LAYOUT RENDERING UTILITY (UrbanClap Styling) ---
window.renderLayout = function (activeLink = '') {
  const currentUser = window.db.getCurrentUser();
  const isLoggedIn = !!currentUser;

  // 1. DYNAMIC HEADER
  const headerHtml = `
    <div class="container">
      <nav class="navbar">
        <a href="index.html" class="logo">
          <i class="fas fa-tools" style="color: var(--primary);"></i> CPLS
        </a>
        
        <ul class="nav-menu">
          <li><a href="index.html" class="nav-link ${activeLink === 'home' ? 'active' : ''}">Home</a></li>
          ${isLoggedIn && currentUser.role === 'consumer'
      ? `<li><a href="customer-dashboard.html" class="nav-link ${activeLink === 'bookings' ? 'active' : ''}">My Bookings</a></li>`
      : ''
    }
          ${isLoggedIn && currentUser.role === 'provider'
      ? `<li><a href="provider-dashboard.html" class="nav-link ${activeLink === 'bookings' ? 'active' : ''}">Jobs Board</a></li>`
      : ''
    }
          ${isLoggedIn && currentUser.role === 'admin'
      ? `<li><a href="admin-dashboard.html" class="nav-link ${activeLink === 'admin' ? 'active' : ''}">Admin Control</a></li>`
      : ''
    }
        </ul>

        <div class="nav-buttons">
          ${isLoggedIn
      ? `
              <div class="sidebar-user" style="padding: 0; border: none; cursor: pointer;" onclick="toggleUserDropdown()">
                <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
                <div class="user-info" style="display: none; position: absolute; top: 65px; right: 20px; background: white; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); padding: 15px; z-index: 150;" id="user-dropdown">
                  <h4 style="margin-bottom: 5px;">${currentUser.name}</h4>
                  <p style="text-transform: capitalize; margin-bottom: 12px; font-size:12px;">Role: ${currentUser.role}</p>
                  <button class="btn btn-outline btn-sm btn-primary" onclick="openProfileEditModal()" style="width: 100%; margin-bottom: 8px;">Edit Profile</button>
                  <button class="btn btn-outline btn-sm btn-danger" onclick="window.db.logout()" style="width: 100%;">Logout</button>
                </div>
              </div>
              `
      : `
              <a href="login.html" class="btn btn-outline">Sign In</a>
              <a href="login.html?register=true" class="btn btn-primary">Become a Pro</a>
              `
    }
        </div>

        <!-- Hamburger button (mobile only) -->
        <button class="nav-hamburger" id="nav-hamburger-btn" aria-label="Open navigation menu">
          <i class="fas fa-bars"></i>
        </button>
      </nav>
    </div>

    <!-- Mobile nav overlay backdrop -->
    <div class="nav-mobile-overlay" id="nav-mobile-overlay"></div>

    <!-- Mobile nav drawer (slides in from right) -->
    <nav class="nav-mobile-drawer" id="nav-mobile-drawer" aria-label="Mobile navigation">
      <div class="nav-drawer-header">
        <a href="index.html" class="logo" style="font-size:20px;">
          <i class="fas fa-tools" style="color:var(--primary);"></i> CPLS
        </a>
        <button class="nav-drawer-close" id="nav-drawer-close-btn" aria-label="Close menu">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <a href="index.html" class="nav-drawer-link ${activeLink === 'home' ? 'active' : ''}">
        <i class="fas fa-home"></i> Home
      </a>

      ${isLoggedIn && currentUser.role === 'consumer' ? `
        <a href="customer-dashboard.html" class="nav-drawer-link ${activeLink === 'bookings' ? 'active' : ''}">
          <i class="fas fa-calendar-alt"></i> My Bookings
        </a>` : ''}
      ${isLoggedIn && currentUser.role === 'provider' ? `
        <a href="provider-dashboard.html" class="nav-drawer-link ${activeLink === 'bookings' ? 'active' : ''}">
          <i class="fas fa-briefcase"></i> Jobs Board
        </a>` : ''}
      ${isLoggedIn && currentUser.role === 'admin' ? `
        <a href="admin-dashboard.html" class="nav-drawer-link ${activeLink === 'admin' ? 'active' : ''}">
          <i class="fas fa-shield-alt"></i> Admin Control
        </a>` : ''}

      <div class="nav-drawer-divider"></div>

      <div class="nav-drawer-actions">
        ${isLoggedIn ? `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--light);border-radius:var(--radius-md);">
            <div class="user-avatar" style="width:36px;height:36px;font-size:14px;">${currentUser.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700;font-size:14px;">${currentUser.name}</div>
              <div style="font-size:11px;color:var(--text-muted);text-transform:capitalize;">${currentUser.role}</div>
            </div>
          </div>
          <button class="btn btn-outline btn-primary" onclick="openProfileEditModal()" style="width:100%;justify-content:center;margin-bottom:8px;margin-top:10px;">
            <i class="fas fa-user-edit"></i> Edit Profile
          </button>
          <button class="btn btn-outline btn-danger" onclick="window.db.logout()" style="width:100%;justify-content:center;">
            <i class="fas fa-sign-out-alt"></i> Log Out
          </button>
        ` : `
          <a href="login.html" class="btn btn-outline" style="width:100%;justify-content:center;">Sign In</a>
          <a href="login.html?register=true" class="btn btn-primary" style="width:100%;justify-content:center;">Become a Pro</a>
        `}
      </div>
    </nav>
  `;

  const headerElem = document.createElement('header');
  headerElem.innerHTML = headerHtml;
  document.body.insertBefore(headerElem, document.body.firstChild);

  // Add event listener for header scrolling
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      headerElem.classList.add('scrolled');
    } else {
      headerElem.classList.remove('scrolled');
    }
  });

  // ── Mobile drawer toggle ──────────────────────────────────
  const hamburgerBtn = document.getElementById('nav-hamburger-btn');
  const mobileOverlay = document.getElementById('nav-mobile-overlay');
  const mobileDrawer = document.getElementById('nav-mobile-drawer');
  const drawerCloseBtn = document.getElementById('nav-drawer-close-btn');

  function openNavDrawer() {
    mobileDrawer.classList.add('open');
    mobileOverlay.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  }
  function closeNavDrawer() {
    mobileDrawer.classList.remove('open');
    mobileOverlay.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  hamburgerBtn.addEventListener('click', openNavDrawer);
  drawerCloseBtn.addEventListener('click', closeNavDrawer);
  mobileOverlay.addEventListener('click', closeNavDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNavDrawer(); });
  // Close drawer on any link click inside
  mobileDrawer.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', () => setTimeout(closeNavDrawer, 80));
  });

  // Toggle profile dropdown
  window.toggleUserDropdown = function () {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    }
  };

  // Close dropdown on click outside
  window.addEventListener('click', (e) => {
    const userAvatar = document.querySelector('.user-avatar');
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !userAvatar.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // 2. DYNAMIC FOOTER (UrbanClap style)
  const footerHtml = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <a href="index.html" class="logo" style="color: var(--white); margin-bottom: 20px; display: inline-flex;">
            <i class="fas fa-tools" style="color: var(--primary);"></i> CPLS
          </a>
          <p>Your one-stop solution for local services. From plumbing to saloon treatments at home, we deliver quality and trust.</p>
          <div class="social-links">
            <a href="#"><i class="fab fa-facebook-f"></i></a>
            <a href="#"><i class="fab fa-twitter"></i></a>
            <a href="#"><i class="fab fa-instagram"></i></a>
            <a href="#"><i class="fab fa-linkedin-in"></i></a>
          </div>
        </div>
        <div class="footer-col">
          <h3>For Customers</h3>
          <ul>
            <li><a href="index.html">Categories</a></li>
            <li><a href="index.html">Search Services</a></li>
            <li><a href="customer-dashboard.html">Booking History</a></li>
            <li><a href="#">Help & Support</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h3>For Partners</h3>
          <ul>
            <li><a href="login.html?register=true">Register as Partner</a></li>
            <li><a href="provider-dashboard.html">Job Feed</a></li>
            <li><a href="#">Partner Support</a></li>
            <li><a href="#">Insurance Coverage</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h3>Contact Us</h3>
          <ul>
            <li><i class="fas fa-envelope"></i> info@cpls.com</li>
            <li><i class="fas fa-phone"></i> +91 98765 43210</li>
            <li><i class="fas fa-map-marker-alt"></i> Connaught Place, New Delhi, India</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 CPLS. All rights reserved. B.Tech CS Final Year Project Demo.</p>
        <p>Created by CS Student</p>
      </div>
    </div>
  `;

  const footerElem = document.createElement('footer');
  footerElem.innerHTML = footerHtml;
  document.body.appendChild(footerElem);

  // Inject Font Awesome dynamically
  if (!document.getElementById('font-awesome-css')) {
    const fa = document.createElement('link');
    fa.id = 'font-awesome-css';
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);
  }

  // Inject Edit Profile Modal HTML (if logged in)
  if (isLoggedIn && !document.getElementById('profile-edit-modal')) {
    const modalHtml = `
      <div class="modal-overlay" id="profile-edit-modal">
        <div class="modal-container" style="max-width: 400px; text-align: left;">
          <div class="modal-header">
            <h3 class="modal-title">Edit Your Profile</h3>
            <button class="modal-close" onclick="window.closeProfileEditModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="profile-edit-form">
              <div class="form-group">
                <label for="prof-name" class="form-label">Full Name</label>
                <input type="text" id="prof-name" class="form-control" placeholder="Your Name" required>
              </div>
              <div class="form-group">
                <label for="prof-email" class="form-label">Email Address</label>
                <input type="email" id="prof-email" class="form-control" placeholder="name@example.com" required>
              </div>
              <div class="form-group">
                <label for="prof-password" class="form-label">New Password (leave blank to keep current)</label>
                <input type="password" id="prof-password" class="form-control" placeholder="••••••••">
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Save Profile</button>
            </form>
          </div>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);

    // Modal control functions
    window.openProfileEditModal = function () {
      const user = window.db.getCurrentUser();
      if (!user) return;
      document.getElementById('prof-name').value = user.name;
      document.getElementById('prof-email').value = user.email;
      document.getElementById('prof-password').value = '';
      
      const form = document.getElementById('profile-edit-form');
      if (window.clearFormErrors) window.clearFormErrors(form);
      
      document.getElementById('profile-edit-modal').classList.add('active');
      
      // Close dropdowns
      const dropdown = document.getElementById('user-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    };

    window.closeProfileEditModal = function () {
      document.getElementById('profile-edit-modal').classList.remove('active');
    };

    // Form submission logic
    const profForm = document.getElementById('profile-edit-form');
    profForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (window.clearFormErrors) window.clearFormErrors(profForm);

      const nameVal = document.getElementById('prof-name').value.trim();
      const emailVal = document.getElementById('prof-email').value.trim();
      const passVal = document.getElementById('prof-password').value;

      let hasError = false;
      if (!nameVal) { window.setFieldError(document.getElementById('prof-name'), 'Name is required'); hasError = true; }
      if (!emailVal) { window.setFieldError(document.getElementById('prof-email'), 'Email is required'); hasError = true; }
      if (passVal && passVal.length < 6) { window.setFieldError(document.getElementById('prof-password'), 'Password must be at least 6 characters'); hasError = true; }

      if (hasError) return;

      try {
        const updated = await window.db.updateProfile(nameVal, emailVal, passVal || null);
        window.toastSuccess('Profile updated successfully!', 'Profile Saved');
        window.closeProfileEditModal();

        // Dynamically update active elements on current page
        const sidebarName = document.getElementById('sidebar-name');
        if (sidebarName) sidebarName.innerText = updated.name;

        const welcomeMsg = document.getElementById('welcome-message');
        if (welcomeMsg) {
          if (welcomeMsg.innerText.includes('Welcome Back')) {
            welcomeMsg.innerText = `Welcome Back, ${updated.name}!`;
          } else if (welcomeMsg.innerText.includes('Welcome')) {
            welcomeMsg.innerText = `Welcome, ${updated.name}!`;
          }
        }

        const avatarEl = document.getElementById('sidebar-avatar');
        if (avatarEl) avatarEl.innerText = updated.name.charAt(0).toUpperCase();

        const headerAvatars = document.querySelectorAll('.user-avatar');
        headerAvatars.forEach(av => {
          av.innerText = updated.name.charAt(0).toUpperCase();
        });
      } catch (err) {
        window.toastError(err.message, 'Update Failed');
      }
    });

    profForm.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) window.setFieldError(e.target, null);
    });
  }
};
