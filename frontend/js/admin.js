// Admin Dashboard Logic
let users      = [];
let categories = {};
let currentUsersFilter = 'all';

let tableBody, catForm, subcatForm;
let tabAll, tabConsumers, tabProviders, tabPending;

// ── Panel Switching ───────────────────────────────────────
const switchPanel = (panelId) => {
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

// ── Toggle Provider Approval ──────────────────────────────
const toggleApproval = async (providerId) => {
  // Optimistic update: flip the flag locally and re-render immediately
  const userIdx = users.findIndex(u => u.id === providerId);
  if (userIdx !== -1) {
    users[userIdx].isApproved = !users[userIdx].isApproved;
    const optimisticUser = users[userIdx];
    renderUsersTable();
    if (optimisticUser.isApproved) {
      toastSuccess(`${optimisticUser.name}'s provider profile has been approved and activated.`, 'Provider Approved ✅');
    } else {
      toastWarning(`${optimisticUser.name}'s account has been suspended.`, 'Account Suspended');
    }
  }

  // Sync with backend in the background (no await on full reload)
  try {
    await toggleProviderApproval(providerId);
    // Silently refresh stats in background without blocking UI
    getAdminStats().then(stats => {
      document.getElementById('stat-providers').innerText = stats.totalProviders;
      document.getElementById('stat-pending').innerText   = stats.pendingProviders;
    }).catch(() => {});
  } catch (err) {
    // Rollback optimistic update on failure
    if (userIdx !== -1) {
      users[userIdx].isApproved = !users[userIdx].isApproved;
      renderUsersTable();
    }
    toastError(err.message, 'Action Failed');
  }
};

// ── Toggle User Block ─────────────────────────────────────
const toggleBlock = async (userId) => {
  // Optimistic update: flip the flag locally and re-render immediately
  const userIdx = users.findIndex(u => u.id === userId);
  if (userIdx !== -1) {
    users[userIdx].isBlocked = !users[userIdx].isBlocked;
    const optimisticUser = users[userIdx];
    renderUsersTable();
    if (optimisticUser.isBlocked) {
      toastWarning(`${optimisticUser.name} has been blocked and cannot access their account.`, 'User Blocked 🛑');
    } else {
      toastSuccess(`${optimisticUser.name} has been unblocked and can now access their account.`, 'User Unblocked 🟢');
    }
  }

  // Sync with backend in background
  try {
    await toggleUserBlock(userId);
  } catch (err) {
    // Rollback optimistic update on failure
    if (userIdx !== -1) {
      users[userIdx].isBlocked = !users[userIdx].isBlocked;
      renderUsersTable();
    }
    toastError(err.message, 'Action Failed');
  }
};

// ── Add Subcategory Modal ─────────────────────────────────
const openAddSubcatModal = (parentId, parentName) => {
  document.getElementById('subcat-parent-id').value    = parentId;
  document.getElementById('subcat-parent-name').innerText = parentName;
  ['subcat-name','subcat-price','subcat-time','subcat-desc'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
    setFieldError(el, null);
  });
  openModal('subcategory-modal');
};

const openModal  = (id) => document.getElementById(id).classList.add('active');
const closeModal = (id) => document.getElementById(id).classList.remove('active');

// ── Load dashboard stats ──────────────────────────────────
async function loadDashboard() {
  const stats = await getAdminStats();
  document.getElementById('stat-revenue').innerText   = `₹${stats.totalRevenue}`;
  document.getElementById('stat-bookings').innerText  = stats.totalBookings;
  document.getElementById('stat-providers').innerText = stats.totalProviders;
  document.getElementById('stat-pending').innerText   = stats.pendingProviders;

  users      = await getUsersList();
  categories = await getCategories();

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

  const listToShow = filters[currentUsersFilter] || users;

  if (listToShow.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
          <i class="fas fa-folder-open" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
          No users matching this filter category.
        </td>
      </tr>
    `;
    return;
  }

  listToShow.forEach((u, idx) => {
    const isProvider = u.role === 'provider';
    const statusText = u.isBlocked
      ? '<span class="badge badge-cancelled">Blocked</span>'
      : isProvider
        ? u.isApproved
          ? '<span class="badge badge-completed">Approved</span>'
          : '<span class="badge badge-pending">Pending Approval</span>'
        : '<span class="badge badge-accepted">Active User</span>';

    const actionBtn = u.isBlocked
      ? `<button class="btn btn-outline btn-sm btn-success" style="color:var(--success);border-color:var(--success);background:rgba(16,185,129,.05);" onclick="toggleBlock('${u.id}')">Unblock</button>`
      : `<button class="btn btn-outline btn-sm btn-danger" onclick="toggleBlock('${u.id}')">Block</button>`;

    const approveBtn = isProvider
      ? u.isApproved
        ? `<button class="btn btn-outline btn-sm" style="color:var(--warning);border-color:var(--warning);background:rgba(245,158,11,.05);" onclick="toggleApproval('${u.id}')">Suspend</button>`
        : `<button class="btn btn-primary btn-sm" onclick="toggleApproval('${u.id}')">Approve ✓</button>`
      : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px; background: ${u.role === 'admin' ? 'var(--dark)' : 'var(--primary)'}">${u.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight: 700; color: var(--dark);">${u.name}</div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: capitalize;">${u.role}</div>
          </div>
        </div>
      </td>
      <td>${u.email}</td>
      <td>${statusText}</td>
      <td>${isProvider ? `⭐ ${u.rating > 0 ? u.rating.toFixed(1) : 'N/A'}` : '—'}</td>
      <td>
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          ${approveBtn}
          ${u.role !== 'admin' ? actionBtn : ''}
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// ── Render Categories Catalogue ───────────────────────────
function renderCategoriesList() {
  const catList = document.getElementById('categories-list');
  if (!catList) return;
  catList.innerHTML = '';

  const list = Object.values(categories);
  if (list.length === 0) {
    catList.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">No categories added to the catalogue.</p>';
    return;
  }

  list.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-admin-card';
    card.innerHTML = `
      <div class="cat-admin-header">
        <div>
          <h4><i class="fas ${cat.icon}"></i> ${cat.name}</h4>
          <span style="font-size: 11px; color: var(--text-muted);">ID: ${cat.id}</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="openAddSubcatModal('${cat.id}','${cat.name.replace(/'/g,"\\'")}')">
          <i class="fas fa-plus"></i> Subcategory
        </button>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">${cat.description}</p>
      <div style="border-top: 1px solid var(--border); padding-top: 10px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 8px;">Sub-services (${cat.subcategories.length})</span>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${cat.subcategories.map(sub => `
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 6px 10px; background: var(--light); border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="font-weight: 600; color: var(--dark);">${sub.name}</span>
              <div style="color: var(--text-muted);">
                <span>₹${sub.price}</span> &bull; <span>${sub.time}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    catList.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    toastError('Unauthorized. Redirecting to login…', 'Access Denied');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  document.getElementById('sidebar-name').innerText   = currentUser.name;
  document.getElementById('sidebar-avatar').innerText = currentUser.name.charAt(0).toUpperCase();

  tableBody    = document.getElementById('users-table-body');
  catForm      = document.getElementById('category-form');
  subcatForm   = document.getElementById('subcategory-form');

  tabAll       = document.getElementById('tab-users-all');
  tabConsumers = document.getElementById('tab-users-consumers');
  tabProviders = document.getElementById('tab-users-providers');
  tabPending   = document.getElementById('tab-users-pending');

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

  // ── Category Form submit ──────────────────────────────────
  catForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(catForm);

    const idEl   = document.getElementById('cat-id');
    const nameEl = document.getElementById('cat-name');
    const iconEl = document.getElementById('cat-icon');
    const descEl = document.getElementById('cat-desc');

    let hasError = false;
    if (!idEl.value.trim() || !/^[a-z0-9-]+$/.test(idEl.value.trim())) {
      setFieldError(idEl, 'Category ID must be lowercase letters, numbers, or hyphens only.');
      hasError = true;
    }
    if (!nameEl.value.trim()) { setFieldError(nameEl, 'Category name is required.'); hasError = true; }
    if (!iconEl.value.trim()) { setFieldError(iconEl, 'Please provide a Font Awesome class (e.g. fa-wrench).'); hasError = true; }
    if (!descEl.value.trim()) { setFieldError(descEl, 'Description is required.'); hasError = true; }
    if (hasError) return;

    const catBtn = catForm.querySelector('[type="submit"]');
    setButtonLoading(catBtn, 'Creating…');

    try {
      await addCategory(idEl.value.trim(), nameEl.value.trim(), iconEl.value.trim(), descEl.value.trim());
      toastSuccess(`"${nameEl.value.trim()}" has been added to the service catalogue.`, 'Category Created');
      catForm.reset();
      loadDashboard();
    } catch (err) {
      toastError(err.message, 'Category Creation Failed');
    } finally {
      resetButton(catBtn);
    }
  });

  // ── Subcategory Form submit ───────────────────────────────
  subcatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(subcatForm);

    const parentId  = document.getElementById('subcat-parent-id').value;
    const nameEl    = document.getElementById('subcat-name');
    const priceEl   = document.getElementById('subcat-price');
    const timeEl    = document.getElementById('subcat-time');
    const descEl    = document.getElementById('subcat-desc');

    let hasError = false;
    if (!nameEl.value.trim())          { setFieldError(nameEl,  'Subcategory name is required.'); hasError = true; }
    if (!priceEl.value || priceEl.value < 1) { setFieldError(priceEl, 'Enter a valid price (minimum ₹1).'); hasError = true; }
    if (!timeEl.value.trim())          { setFieldError(timeEl,  'Estimated duration is required (e.g. 1.5 hours).'); hasError = true; }
    if (!descEl.value.trim())          { setFieldError(descEl,  'Please describe what this service includes.'); hasError = true; }
    if (hasError) return;

    const subcatBtn = subcatForm.querySelector('[type="submit"]');
    setButtonLoading(subcatBtn, 'Saving…');

    try {
      await addSubcategory(parentId, nameEl.value.trim(), priceEl.value, timeEl.value.trim(), descEl.value.trim());
      toastSuccess(`"${nameEl.value.trim()}" subcategory created successfully!`, 'Subcategory Added');
      closeModal('subcategory-modal');
      loadDashboard();
    } catch (err) {
      toastError(err.message, 'Subcategory Creation Failed');
    } finally {
      resetButton(subcatBtn);
    }
  });

  // Clear inline errors on input
  [catForm, subcatForm].forEach(form => {
    form.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) setFieldError(e.target, null);
    });
  });

  // ── Admin Creation Form submit ───────────────────────────
  const adminForm = document.getElementById('admin-creation-form');
  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(adminForm);

      const nameEl     = document.getElementById('adm-name');
      const emailEl    = document.getElementById('adm-email');
      const passwordEl = document.getElementById('adm-password');
      const confirmEl  = document.getElementById('adm-confirm');

      let hasError = false;
      if (!nameEl.value.trim()) { setFieldError(nameEl, 'Name is required.'); hasError = true; }
      if (!emailEl.value.trim()) { setFieldError(emailEl, 'Email address is required.'); hasError = true; }
      if (passwordEl.value.length < 6) { setFieldError(passwordEl, 'Password must be at least 6 characters.'); hasError = true; }
      if (passwordEl.value !== confirmEl.value) { setFieldError(confirmEl, 'Passwords do not match.'); hasError = true; }

      if (hasError) return;

      const adminBtn = adminForm.querySelector('[type="submit"]');
      setButtonLoading(adminBtn, 'Creating Admin…');

      try {
        await createAdmin(emailEl.value.trim(), nameEl.value.trim(), passwordEl.value);
        toastSuccess(`Administrator account for "${nameEl.value.trim()}" created successfully.`, 'Admin Created');
        adminForm.reset();
        users = await getUsersList();
        renderUsersTable();
        switchPanel('users');
      } catch (err) {
        toastError(err.message, 'Admin Registration Failed');
      } finally {
        resetButton(adminBtn);
      }
    });

    adminForm.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) setFieldError(e.target, null);
    });
  }

  const openModal  = (id) => document.getElementById(id).classList.add('active');
  const closeModal = (id) => document.getElementById(id).classList.remove('active');

  await loadDashboard();
});
