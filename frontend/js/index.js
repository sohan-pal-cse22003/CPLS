// Home Page script logic
document.addEventListener('DOMContentLoaded', async () => {
  // Render navbar & footer
  window.renderLayout('home');

  const searchInput   = document.getElementById('search-input');
  const suggestionsBox = document.getElementById('suggestions-box');
  const searchBtn     = document.getElementById('search-btn');

  // ── Custom Date Picker setup ──────────────────────────────
  const today   = new Date();
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 24);

  let bookingDatePicker = null; // will be created when booking modal opens

  // ── Load and render Categories ────────────────────────────
  const categories = await window.db.getCategories();
  renderCategories(categories);

  // ── Search input: auto-suggestions ───────────────────────
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.trim().length === 0) {
      suggestionsBox.classList.remove('active');
      suggestionsBox.innerHTML = '';
      return;
    }
    const suggestions = await window.db.getSearchSuggestions(query);
    renderSuggestions(suggestions);
  });

  // Close suggestions when clicked outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.classList.remove('active');
    }
  });

  // Search button handler
  searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    const suggestions = await window.db.getSearchSuggestions(query);
    if (suggestions.length > 0) {
      const first = suggestions[0];
      suggestionsBox.classList.remove('active');
      if (first.type === 'category') {
        openSubcategoriesModal(first.id);
      } else {
        triggerBooking(first.categoryId, first.id, first.title, first.price);
      }
    } else {
      window.toastWarning(
        `No services match "<strong>${query}</strong>". Try "plumbing", "haircut", or "AC service".`,
        'No Results Found'
      );
    }
  });

  // Booking form is now handled on the dedicated providers page

});

// ── Render Categories Grid ───────────────────────────────────
function renderCategories(categories) {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';
  Object.values(categories).forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.onclick = () => openSubcategoriesModal(cat.id);
    card.innerHTML = `
      <div class="category-icon">
        <i class="fas ${cat.icon}"></i>
      </div>
      <h3>${cat.name}</h3>
      <p>${cat.description}</p>
    `;
    grid.appendChild(card);
  });
}

// ── Render Autocomplete Suggestions ─────────────────────────
function renderSuggestions(suggestions) {
  const box = document.getElementById('suggestions-box');
  box.innerHTML = '';

  if (suggestions.length === 0) {
    box.classList.remove('active');
    return;
  }

  suggestions.forEach(item => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.innerHTML = `
      <div class="suggestion-info">
        <span class="suggestion-title">${item.title}</span>
        <span class="suggestion-category">${item.categoryName}</span>
      </div>
      <span class="suggestion-badge">${item.badge}</span>
    `;
    div.addEventListener('click', () => {
      box.classList.remove('active');
      document.getElementById('search-input').value = item.title;
      if (item.type === 'category') {
        openSubcategoriesModal(item.id);
      } else {
        triggerBooking(item.categoryId, item.id, item.title, item.price);
      }
    });
    box.appendChild(div);
  });

  box.classList.add('active');
}

// ── Open Category Details Modal ──────────────────────────────
async function openSubcategoriesModal(categoryId) {
  const categories = await window.db.getCategories();
  const category   = categories[categoryId];
  if (!category) return;

  document.getElementById('modal-service-title').innerText = category.name;
  document.getElementById('modal-service-desc').innerText  = category.description;

  const list = document.getElementById('subcat-list');
  list.innerHTML = '';

  category.subcategories.forEach(sub => {
    const item = document.createElement('div');
    item.className = 'subcat-item';
    item.innerHTML = `
      <div class="subcat-item-info">
        <h4>${sub.name}</h4>
        <p>${sub.description}</p>
        <span style="font-size:12px;color:var(--text-muted);display:block;margin-top:4px;">
          <i class="far fa-clock"></i> Est. Time: ${sub.time}
        </span>
      </div>
      <div class="subcat-price-book">
        <span class="subcat-price">₹${sub.price}</span>
        <button class="btn btn-primary btn-sm"
          onclick="triggerBooking('${category.id}','${sub.id}','${sub.name.replace(/'/g, "\\'")}',${sub.price})">
          Book Now
        </button>
      </div>
    `;
    list.appendChild(item);
  });

  openModal('subcategories-modal');
}

// Trigger: close subcat → load & select provider
// Trigger: close subcat → redirect to providers listing page
window.triggerBooking = function (categoryId, subcatId, subcatName) {
  closeModal('subcategories-modal');
  window.location.href = `providers.html?categoryId=${categoryId}&subcatId=${subcatId}&subcatName=${encodeURIComponent(subcatName)}`;
};

// Modal helpers
window.openModal = function (modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
};
window.closeModal = function (modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
};

