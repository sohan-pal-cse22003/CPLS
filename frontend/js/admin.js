// Admin Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = window.db.getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    window.toastError('Unauthorized. Redirecting to login…', 'Access Denied');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  document.getElementById('sidebar-name').innerText   = currentUser.name;
  document.getElementById('sidebar-avatar').innerText = currentUser.name.charAt(0).toUpperCase();

  let users      = [];
  let categories = {};
  let currentUsersFilter = 'all';

  const tableBody    = document.getElementById('users-table-body');
  const catForm      = document.getElementById('category-form');
  const subcatForm   = document.getElementById('subcategory-form');

  const tabAll       = document.getElementById('tab-users-all');
  const tabConsumers = document.getElementById('tab-users-consumers');
  const tabProviders = document.getElementById('tab-users-providers');
  const tabPending   = document.getElementById('tab-users-pending');

  // ── Panel Switching ───────────────────────────────────────
  window.switchPanel = (panelId) => {
    const menuUsers       = document.getElementById('menu-users');
    const menuAdmin       = document.getElementById('menu-admin');
    const menuCategories  = document.getElementById('menu-categories');
    
    const panelUsers      = document.getElementById('panel-users');
    const panelAdmin      = document.getElementById('panel-create-admin');
    const panelCategories = document.getElementById('panel-categories');

    // Reset active class
    [menuUsers, menuAdmin, menuCategories].forEach(el => {
      if (el) el.classList.remove('active');
    });

    // Hide all panels
    [panelUsers, panelAdmin, panelCategories].forEach(el => {
      if (el) el.style.display = 'none';
    });

    if (panelId === 'users') {
      if (menuUsers) menuUsers.classList.add('active');
      if (panelUsers) panelUsers.style.display = 'block';
    } else if (panelId === 'admin') {
      if (menuAdmin) menuAdmin.classList.add('active');
      if (panelAdmin) panelAdmin.style.display = 'block';
    } else {
      if (menuCategories) menuCategories.classList.add('active');
      if (panelCategories) panelCategories.style.display = 'block';
      renderCategoriesList();
    }
  };

  // ── User filter tabs ──────────────────────────────────────
  function switchUserFilter(filter, tabEl) {
    currentUsersFilter = filter;
    [tabAll, tabConsumers, tabProviders, tabPending].forEach(t => {
      t.style.color            = 'var(--text-muted)';
      t.style.borderBottomColor = 'transparent';
    });
    tabEl.style.color            = 'var(--primary)';
    tabEl.style.borderBottomColor = 'var(--primary)';
    renderUsersTable();
  }

  tabAll.addEventListener('click',       () => switchUserFilter('all',       tabAll));
  tabConsumers.addEventListener('click', () => switchUserFilter('consumers', tabConsumers));
  tabProviders.addEventListener('click', () => switchUserFilter('providers', tabProviders));
  tabPending.addEventListener('click',   () => switchUserFilter('pending',   tabPending));

  // ── Load dashboard stats ──────────────────────────────────
  async function loadDashboard() {
    const stats = await window.db.getAdminStats();
    document.getElementById('stat-revenue').innerText   = `₹${stats.totalRevenue}`;
    document.getElementById('stat-bookings').innerText  = stats.totalBookings;
    document.getElementById('stat-providers').innerText = stats.totalProviders;
    document.getElementById('stat-pending').innerText   = stats.pendingProviders;

    users      = await window.db.getUsersList();
    categories = await window.db.getCategories();

    renderUsersTable();
    renderCategoriesList();
  }

  // ── Render Users Table ────────────────────────────────────
  function renderUsersTable() {
    tableBody.innerHTML = '';

    const filters = {
      all:       users,
      consumers: users.filter(u => u.role === 'consumer'),
      providers: users.filter(u => u.role === 'provider'),
      pending:   users.filter(u => u.role === 'provider' && !u.isApproved),
    };
    const filtered = filters[currentUsersFilter] || users;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">
          No users match this filter.
        </td></tr>`;
      return;
    }

    filtered.forEach(u => {
      const tr = document.createElement('tr');

      const roleBadge = u.role === 'admin'
        ? `<span class="admin-badge" style="background:rgba(239,68,68,.1);color:var(--danger);">Admin</span>`
        : u.role === 'provider'
        ? `<span class="admin-badge" style="background:rgba(79,70,229,.1);color:var(--primary);">Provider</span>`
        : `<span class="admin-badge" style="background:rgba(6,182,212,.1);color:var(--info);">Consumer</span>`;

      let details = 'Client Account';
      if (u.role === 'admin')    details = 'System Security';
      if (u.role === 'provider') {
        const servicesList = u.services || [];
        const serviceNames = [];
        Object.values(categories).forEach(cat => {
          cat.subcategories.forEach(sub => {
            const serviceObj = servicesList.find(s => (typeof s === 'string' ? s === sub.id : s.id === sub.id));
            if (serviceObj) {
              const customPrice = (typeof serviceObj === 'object' && serviceObj.price) ? ` (₹${serviceObj.price})` : ` (₹${sub.price})`;
              serviceNames.push(sub.name + customPrice);
            }
          });
        });
        const servicesStr = serviceNames.length > 0 ? serviceNames.join(', ') : 'None';
        details = `Services: <strong>${servicesStr}</strong><br>Rating: ${u.rating > 0 ? u.rating.toFixed(1) : 'N/A'}`;
      }

      let statusBadge = '';
      if (u.isBlocked) {
        statusBadge = `<span class="admin-badge" style="background:rgba(239,68,68,.1);color:var(--danger);">Blocked</span>`;
      } else {
        statusBadge = u.role === 'provider'
          ? u.isApproved
            ? `<span class="admin-badge" style="background:rgba(16,185,129,.1);color:var(--success);">Approved</span>`
            : `<span class="admin-badge" style="background:rgba(245,158,11,.1);color:var(--warning);">Pending Review</span>`
          : `<span class="admin-badge" style="background:rgba(16,185,129,.1);color:var(--success);">Active</span>`;
      }

      let actionButtons = '';
      if (u.role === 'admin') {
        actionButtons = '—';
      } else {
        const blockBtn = u.isBlocked
          ? `<button class="btn btn-outline btn-sm btn-success" style="color:var(--success);border-color:var(--success);background:rgba(16,185,129,.05);" onclick="toggleBlock('${u.id}')">Unblock</button>`
          : `<button class="btn btn-outline btn-sm btn-danger" onclick="toggleBlock('${u.id}')">Block</button>`;

        if (u.role === 'provider') {
          const approvalBtn = u.isApproved
            ? `<button class="btn btn-outline btn-sm" style="color:var(--warning);border-color:var(--warning);background:rgba(245,158,11,.05);" onclick="toggleApproval('${u.id}')">Suspend</button>`
            : `<button class="btn btn-primary btn-sm" onclick="toggleApproval('${u.id}')">Approve ✓</button>`;
          
          actionButtons = `<div class="action-cell">${approvalBtn}${blockBtn}</div>`;
        } else {
          actionButtons = `<div class="action-cell">${blockBtn}</div>`;
        }
      }

      tr.innerHTML = `
        <td style="font-weight:600;">${u.name}</td>
        <td>${u.email}</td>
        <td>${roleBadge}</td>
        <td>${details}</td>
        <td>${statusBadge}</td>
        <td>${actionButtons}</td>`;

      tableBody.appendChild(tr);
    });
  }

  // ── Render Service Categories ─────────────────────────────
  function renderCategoriesList() {
    const container   = document.getElementById('admin-categories-list');
    container.innerHTML = '';

    Object.values(categories).forEach(cat => {
      const div = document.createElement('div');
      div.className = 'category-item-admin';

      const subcatHtml = cat.subcategories.length === 0
        ? `<p style="font-size:13px;color:var(--text-muted);font-style:italic;">No subcategories yet. Add one below.</p>`
        : `<table style="width:100%;font-size:13px;border-collapse:collapse;margin-top:10px;background:white;border-radius:var(--radius-sm);">
            <thead>
              <tr style="background:#f1f5f9;text-align:left;">
                <th style="padding:6px 12px;">Name</th>
                <th style="padding:6px 12px;">Price</th>
                <th style="padding:6px 12px;">Duration</th>
                <th style="padding:6px 12px;">Description</th>
              </tr>
            </thead>
            <tbody>
              ${cat.subcategories.map(sub => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 12px;font-weight:600;">${sub.name}</td>
                  <td style="padding:8px 12px;">₹${sub.price}</td>
                  <td style="padding:8px 12px;">${sub.time}</td>
                  <td style="padding:8px 12px;color:var(--text-muted);">${sub.description}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;

      div.innerHTML = `
        <div class="category-header-admin">
          <div>
            <h4 style="font-size:16px;display:inline-flex;align-items:center;gap:8px;">
              <i class="fas ${cat.icon}" style="color:var(--primary);"></i> ${cat.name}
              <span style="font-size:12px;color:var(--text-muted);font-weight:normal;">(ID: ${cat.id})</span>
            </h4>
            <p style="font-size:13px;color:var(--text-muted);margin-top:2px;">${cat.description}</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openAddSubcatModal('${cat.id}','${cat.name.replace(/'/g,"\\'")}')">
            <i class="fas fa-plus"></i> Add Subcategory
          </button>
        </div>
        <div style="margin-top:10px;">${subcatHtml}</div>`;

      container.appendChild(div);
    });
  }

  // ── Toggle Provider Approval ──────────────────────────────
  window.toggleApproval = async (providerId) => {
    // Optimistic update: flip the flag locally and re-render immediately
    const userIdx = users.findIndex(u => u.id === providerId);
    if (userIdx !== -1) {
      users[userIdx].isApproved = !users[userIdx].isApproved;
      const optimisticUser = users[userIdx];
      renderUsersTable();
      if (optimisticUser.isApproved) {
        window.toastSuccess(`${optimisticUser.name}'s provider profile has been approved and activated.`, 'Provider Approved ✅');
      } else {
        window.toastWarning(`${optimisticUser.name}'s account has been suspended.`, 'Account Suspended');
      }
    }

    // Sync with backend in the background (no await on full reload)
    try {
      await window.db.toggleProviderApproval(providerId);
      // Silently refresh stats in background without blocking UI
      window.db.getAdminStats().then(stats => {
        document.getElementById('stat-providers').innerText = stats.totalProviders;
        document.getElementById('stat-pending').innerText   = stats.pendingProviders;
      }).catch(() => {});
    } catch (err) {
      // Rollback optimistic update on failure
      if (userIdx !== -1) {
        users[userIdx].isApproved = !users[userIdx].isApproved;
        renderUsersTable();
      }
      window.toastError(err.message, 'Action Failed');
    }
  };

  // ── Toggle User Block ─────────────────────────────────────
  window.toggleBlock = async (userId) => {
    // Optimistic update: flip the flag locally and re-render immediately
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      users[userIdx].isBlocked = !users[userIdx].isBlocked;
      const optimisticUser = users[userIdx];
      renderUsersTable();
      if (optimisticUser.isBlocked) {
        window.toastWarning(`${optimisticUser.name} has been blocked and cannot access their account.`, 'User Blocked 🛑');
      } else {
        window.toastSuccess(`${optimisticUser.name} has been unblocked and can now access their account.`, 'User Unblocked 🟢');
      }
    }

    // Sync with backend in background
    try {
      await window.db.toggleUserBlock(userId);
    } catch (err) {
      // Rollback optimistic update on failure
      if (userIdx !== -1) {
        users[userIdx].isBlocked = !users[userIdx].isBlocked;
        renderUsersTable();
      }
      window.toastError(err.message, 'Action Failed');
    }
  };

  // ── Add Subcategory Modal ─────────────────────────────────
  window.openAddSubcatModal = (parentId, parentName) => {
    document.getElementById('subcat-parent-id').value    = parentId;
    document.getElementById('subcat-parent-name').innerText = parentName;
    ['subcat-name','subcat-price','subcat-time','subcat-desc'].forEach(id => {
      const el = document.getElementById(id);
      el.value = '';
      window.setFieldError(el, null);
    });
    window.openModal('subcategory-modal');
  };

  // ── Category Form submit ──────────────────────────────────
  catForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    window.clearFormErrors(catForm);

    const idEl   = document.getElementById('cat-id');
    const nameEl = document.getElementById('cat-name');
    const iconEl = document.getElementById('cat-icon');
    const descEl = document.getElementById('cat-desc');

    let hasError = false;
    if (!idEl.value.trim() || !/^[a-z0-9-]+$/.test(idEl.value.trim())) {
      window.setFieldError(idEl, 'Category ID must be lowercase letters, numbers, or hyphens only.');
      hasError = true;
    }
    if (!nameEl.value.trim()) { window.setFieldError(nameEl, 'Category name is required.'); hasError = true; }
    if (!iconEl.value.trim()) { window.setFieldError(iconEl, 'Please provide a Font Awesome class (e.g. fa-wrench).'); hasError = true; }
    if (!descEl.value.trim()) { window.setFieldError(descEl, 'Description is required.'); hasError = true; }
    if (hasError) return;

    const catBtn = catForm.querySelector('[type="submit"]');
    window.setButtonLoading(catBtn, 'Creating…');

    try {
      await window.db.addCategory(idEl.value.trim(), nameEl.value.trim(), iconEl.value.trim(), descEl.value.trim());
      window.toastSuccess(`"${nameEl.value.trim()}" has been added to the service catalogue.`, 'Category Created');
      catForm.reset();
      loadDashboard();
    } catch (err) {
      window.toastError(err.message, 'Category Creation Failed');
    } finally {
      window.resetButton(catBtn);
    }
  });

  // ── Subcategory Form submit ───────────────────────────────
  subcatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    window.clearFormErrors(subcatForm);

    const parentId  = document.getElementById('subcat-parent-id').value;
    const nameEl    = document.getElementById('subcat-name');
    const priceEl   = document.getElementById('subcat-price');
    const timeEl    = document.getElementById('subcat-time');
    const descEl    = document.getElementById('subcat-desc');

    let hasError = false;
    if (!nameEl.value.trim())          { window.setFieldError(nameEl,  'Subcategory name is required.'); hasError = true; }
    if (!priceEl.value || priceEl.value < 1) { window.setFieldError(priceEl, 'Enter a valid price (minimum ₹1).'); hasError = true; }
    if (!timeEl.value.trim())          { window.setFieldError(timeEl,  'Estimated duration is required (e.g. 1.5 hours).'); hasError = true; }
    if (!descEl.value.trim())          { window.setFieldError(descEl,  'Please describe what this service includes.'); hasError = true; }
    if (hasError) return;

    const subcatBtn = subcatForm.querySelector('[type="submit"]');
    window.setButtonLoading(subcatBtn, 'Saving…');

    try {
      await window.db.addSubcategory(parentId, nameEl.value.trim(), priceEl.value, timeEl.value.trim(), descEl.value.trim());
      window.toastSuccess(`"${nameEl.value.trim()}" subcategory created successfully!`, 'Subcategory Added');
      window.closeModal('subcategory-modal');
      loadDashboard();
    } catch (err) {
      window.toastError(err.message, 'Subcategory Creation Failed');
    } finally {
      window.resetButton(subcatBtn);
    }
  });

  // Clear inline errors on input
  [catForm, subcatForm].forEach(form => {
    form.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) window.setFieldError(e.target, null);
    });
  });

  // ── Admin Creation Form submit ───────────────────────────
  const adminForm = document.getElementById('admin-creation-form');
  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      window.clearFormErrors(adminForm);

      const nameEl     = document.getElementById('adm-name');
      const emailEl    = document.getElementById('adm-email');
      const passwordEl = document.getElementById('adm-password');
      const confirmEl  = document.getElementById('adm-confirm');

      let hasError = false;
      if (!nameEl.value.trim()) { window.setFieldError(nameEl, 'Name is required.'); hasError = true; }
      if (!emailEl.value.trim()) { window.setFieldError(emailEl, 'Email address is required.'); hasError = true; }
      if (passwordEl.value.length < 6) { window.setFieldError(passwordEl, 'Password must be at least 6 characters.'); hasError = true; }
      if (passwordEl.value !== confirmEl.value) { window.setFieldError(confirmEl, 'Passwords do not match.'); hasError = true; }

      if (hasError) return;

      const adminBtn = adminForm.querySelector('[type="submit"]');
      window.setButtonLoading(adminBtn, 'Creating Admin…');

      try {
        await window.db.createAdmin(emailEl.value.trim(), nameEl.value.trim(), passwordEl.value);
        window.toastSuccess(`Administrator account for "${nameEl.value.trim()}" created successfully.`, 'Admin Created');
        adminForm.reset();
        users = await window.db.getUsersList();
        renderUsersTable();
        switchPanel('users');
      } catch (err) {
        window.toastError(err.message, 'Admin Registration Failed');
      } finally {
        window.resetButton(adminBtn);
      }
    });

    adminForm.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) window.setFieldError(e.target, null);
    });
  }

  window.openModal  = (id) => document.getElementById(id).classList.add('active');
  window.closeModal = (id) => document.getElementById(id).classList.remove('active');

  await loadDashboard();
});
