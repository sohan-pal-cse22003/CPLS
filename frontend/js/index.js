// Home Page script logic

// Modal helpers (top-level so inline onclick="..." in HTML can call them)
const openModal = function (modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
};

const closeModal = function (modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
};

// Trigger: close subcat → redirect to providers listing page
const triggerBooking = function (categoryId, subcatId, subcatName) {
  closeModal('subcategories-modal');
  window.location.href = `providers.html?categoryId=${categoryId}&subcatId=${subcatId}&subcatName=${encodeURIComponent(subcatName)}`;
};

// ── Open Category Details Modal ──────────────────────────────
async function openSubcategoriesModal(categoryId) {
  const categories = await getCategories();
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
      <div class="subcat-item-action">
        <button class="btn btn-outline btn-sm btn-primary"
          onclick="triggerBooking('${category.id}','${sub.id}','${sub.name.replace(/'/g, "\\'")}')">
          Select Service
        </button>
      </div>
    `;
    list.appendChild(item);
  });

  openModal('subcategories-modal');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Render navbar & footer
  renderLayout('home');

  const searchInput    = document.getElementById('search-input');
  const suggestionsBox = document.getElementById('suggestions-box');
  const searchBtn      = document.getElementById('search-btn');

  // ── Load and render Categories ────────────────────────────
  const categories = await getCategories();
  renderCategories(categories);

  // ── Search input: auto-suggestions ───────────────────────
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.trim().length === 0) {
      suggestionsBox.classList.remove('active');
      suggestionsBox.innerHTML = '';
      return;
    }
    const suggestions = await getSearchSuggestions(query);
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
    const suggestions = await getSearchSuggestions(query);
    if (suggestions.length > 0) {
      const first = suggestions[0];
      suggestionsBox.classList.remove('active');
      if (first.type === 'category') {
        openSubcategoriesModal(first.id);
      } else {
        triggerBooking(first.categoryId, first.id, first.title);
      }
    } else {
      toastWarning(
        `No services match "<strong>${query}</strong>". Try "plumbing", "haircut", or "AC service".`,
        'No Results Found'
      );
    }
  });

  // Render categories on landing grid
  function renderCategories(categoriesList) {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.values(categoriesList).forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <div class="category-icon-wrapper">
          <i class="fas ${cat.icon}"></i>
        </div>
        <h3>${cat.name}</h3>
        <p>${cat.description}</p>
        <span class="category-link">Explore services <i class="fas fa-chevron-right"></i></span>
      `;
      card.addEventListener('click', () => openSubcategoriesModal(cat.id));
      grid.appendChild(card);
    });
  }

  // Render suggestion results list
  function renderSuggestions(list) {
    const box = suggestionsBox;
    box.innerHTML = '';

    if (list.length === 0) {
      box.classList.remove('active');
      return;
    }

    box.classList.add('active');
    list.forEach(item => {
      const el = document.createElement('div');
      el.className = 'suggestion-item';
      el.innerHTML = `
        <i class="fas ${item.type === 'category' ? 'fa-th-large' : 'fa-tools'}"></i>
        <span>${item.title}</span>
        ${item.type === 'subcategory' ? `<small>in ${item.categoryName}</small>` : ''}
      `;
      el.addEventListener('click', () => {
        box.classList.remove('active');
        searchInput.value = item.title;
        if (item.type === 'category') {
          openSubcategoriesModal(item.id);
        } else {
          triggerBooking(item.categoryId, item.id, item.title);
        }
      });
      box.appendChild(el);
    });
  }
});
