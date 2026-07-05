// Service Providers Listing Page Logic
document.addEventListener('DOMContentLoaded', async () => {
  // Render navbar & footer (no active tab highlighted)
  window.renderLayout('');

  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('categoryId');
  const subcatId = urlParams.get('subcatId');
  const subcatName = urlParams.get('subcatName');

  if (!categoryId || !subcatId || !subcatName) {
    window.toastWarning('Invalid service selection. Redirecting to home…', 'Missing Information');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  // Set page headers and breadcrumbs
  document.getElementById('breadcrumb-subcat').innerText = subcatName;
  document.getElementById('page-service-title').innerText = `Available Professionals for ${subcatName}`;
  document.getElementById('empty-service-name').innerText = subcatName;

  try {
    const categories = await window.db.getCategories();
    const category = categories[categoryId];
    if (category) {
      document.getElementById('breadcrumb-category').innerText = category.name;
    }
  } catch (err) {
    console.error('Failed to load category details:', err);
  }

  // Load and show providers
  let providers = [];
  const loadingEl = document.getElementById('providers-loading');
  const listWrapper = document.getElementById('providers-list-wrapper');
  const emptyState = document.getElementById('providers-empty-state');
  const sortSelect = document.getElementById('providers-sort');

  try {
    providers = await window.db.getProvidersForService(subcatId);
    loadingEl.style.display = 'none';

    if (providers.length === 0) {
      emptyState.style.display = 'block';
    } else {
      listWrapper.style.display = 'grid';
      renderProvidersList(providers);
    }
  } catch (err) {
    loadingEl.style.display = 'none';
    window.toastError(err.message, 'Query Failed');
  }

  // Handle Sort Change
  sortSelect.addEventListener('change', () => {
    renderProvidersList(providers);
  });

  // Render function
  function renderProvidersList(providersList) {
    listWrapper.innerHTML = '';
    const sortVal = sortSelect.value;
    const sorted = [...providersList];

    if (sortVal === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortVal === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    }

    sorted.forEach(p => {
      const card = document.createElement('div');
      card.className = 'provider-card';
      
      const ratingStars = p.rating > 0 ? `⭐ <strong>${p.rating.toFixed(1)}</strong>` : `⭐ New Pro`;
      const isTopRated = p.rating >= 4.5;
      const badgeHtml = isTopRated ? `<span class="provider-badge"><i class="fas fa-certificate"></i> Verified Pro</span>` : '';

      card.innerHTML = `
        ${badgeHtml}
        <div style="display: flex; gap: 15px; align-items: flex-start; margin-bottom: 20px;">
          <div class="user-avatar" style="width: 55px; height: 55px; font-size: 20px; flex-shrink: 0; background-color: var(--primary);">
            ${p.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 style="margin: 0 0 4px 0; font-size: 18px; color: var(--dark);">${p.name}</h4>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="provider-rating-badge">${ratingStars}</span>
              <span style="font-size: 12px; color: var(--text-muted);">Partner</span>
            </div>
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 25px; line-height: 1.5;">
          Experienced provider verified by CPLS. Fully trained for ${subcatName} services, delivering high-quality and satisfying work.
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 15px; margin-top: auto;">
          <div>
            <span style="display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Pricing Starts At</span>
            <span style="font-weight: 800; color: var(--dark); font-size: 22px;">₹${p.price}</span>
          </div>
          <button class="btn btn-primary" onclick="initiateBooking('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price})">Book Pro</button>
        </div>
      `;
      listWrapper.appendChild(card);
    });
  }

  // Initiate booking (checks login role and opens confirmation modal)
  window.initiateBooking = function(providerId, providerName, price) {
    const currentUser = window.db.getCurrentUser();
    if (!currentUser) {
      window.toastInfo('Please sign in first to book a service.', 'Login Required');
      
      const currentUrl = `providers.html?categoryId=${categoryId}&subcatId=${subcatId}&subcatName=${encodeURIComponent(subcatName)}`;
      setTimeout(() => {
        window.location.href = `login.html?return=${encodeURIComponent(currentUrl)}`;
      }, 1500);
      return;
    }

    if (currentUser.role !== 'consumer') {
      window.toastWarning('Only consumer accounts can book services.', 'Access Denied');
      return;
    }

    // Open booking modal
    openBookingModal(categoryId, subcatId, subcatName, providerId, providerName, price);
  };

  // Dynamic slot availability fetcher
  async function updateAvailableTimeSlots(providerId, dateStr) {
    const timeSelect = document.getElementById('booking-time');
    timeSelect.disabled = true;
    timeSelect.innerHTML = `<option value="">Loading slots...</option>`;

    try {
      const bookedSlots = await window.db.getProviderBookedSlots(providerId, dateStr) || [];
      const defaultSlots = [
        { value: '09:00 AM', label: '09:00 AM – 11:00 AM' },
        { value: '11:00 AM', label: '11:00 AM – 01:00 PM' },
        { value: '01:00 PM', label: '01:00 PM – 03:00 PM' },
        { value: '03:00 PM', label: '03:00 PM – 05:00 PM' },
        { value: '05:00 PM', label: '05:00 PM – 07:00 PM' }
      ];

      let html = `<option value="">Select Time Slot</option>`;
      defaultSlots.forEach(slot => {
        const isBooked = bookedSlots.includes(slot.value);
        if (isBooked) {
          html += `<option value="${slot.value}" disabled style="color: var(--text-muted); text-decoration: line-through;">${slot.label} (Booked)</option>`;
        } else {
          html += `<option value="${slot.value}">${slot.label}</option>`;
        }
      });

      timeSelect.innerHTML = html;
      timeSelect.disabled = false;
    } catch (err) {
      console.error('Failed to load booked slots:', err);
      timeSelect.innerHTML = `<option value="">Failed to load slots</option>`;
      window.toastError('Could not fetch available slots. Please try again.', 'Error');
    }
  }

  // Open booking details modal
  function openBookingModal(catId, subId, subName, providerId, providerName, price) {
    document.getElementById('booking-category').value = catId;
    document.getElementById('booking-subcat-id').value = subId;
    document.getElementById('booking-provider-id').value = providerId;
    document.getElementById('booking-price').value = price;
    
    document.getElementById('booking-service-summary').innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <span style="font-weight: 700; color: var(--dark);">${subName}</span>
        <span style="font-weight: 800; color: var(--primary); font-size: 18px;">₹${price}</span>
      </div>
      <span style="font-size: 13px; color: var(--text-muted); font-weight: 500;"><i class="far fa-user"></i> Professional: <strong>${providerName}</strong></span>
    `;

    // Clear previous form fields
    const bookingForm = document.getElementById('booking-form');
    window.clearFormErrors(bookingForm);
    document.getElementById('booking-time').value = '';
    document.getElementById('booking-address').value = '';

    // Initially disable time select until date is chosen
    const timeSelect = document.getElementById('booking-time');
    timeSelect.disabled = true;
    timeSelect.innerHTML = `<option value="">Choose a date first</option>`;

    // Initialize custom date picker
    const dpContainer = document.getElementById('booking-date-picker');
    dpContainer.innerHTML = '';
    window.bookingDatePicker = window.createDatePicker(dpContainer, {
      placeholder: 'Choose appointment date',
      onChange: async (dateStr) => {
        const dpBtn = dpContainer.querySelector('.datepicker-input-btn');
        if (dpBtn) window.setFieldError(dpBtn, null);
        
        if (dateStr) {
          await updateAvailableTimeSlots(providerId, dateStr);
        } else {
          timeSelect.disabled = true;
          timeSelect.innerHTML = `<option value="">Choose a date first</option>`;
        }
      }
    });

    openModal('booking-modal');
  }

  // Booking Form Submission
  const bookingForm = document.getElementById('booking-form');
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    window.clearFormErrors(bookingForm);

    const category = document.getElementById('booking-category').value;
    const subcatIdVal = document.getElementById('booking-subcat-id').value;
    const providerId = document.getElementById('booking-provider-id').value;
    const price = document.getElementById('booking-price').value;
    const timeEl = document.getElementById('booking-time');
    const addressEl = document.getElementById('booking-address');

    const date = window.bookingDatePicker ? window.bookingDatePicker.getValue() : '';
    const time = timeEl.value;
    const address = addressEl.value.trim();

    let hasError = false;

    if (!date) {
      const dpBtn = document.querySelector('#booking-date-picker .datepicker-input-btn');
      if (dpBtn) window.setFieldError(dpBtn, 'Please pick a date for your appointment.');
      hasError = true;
    }

    if (!time) {
      window.setFieldError(timeEl, 'Please select a preferred time slot.');
      hasError = true;
    }

    if (!address) {
      window.setFieldError(addressEl, 'A service address is required for our professional to arrive.');
      hasError = true;
    }

    if (hasError) return;

    window.setFieldValid(timeEl);
    window.setFieldValid(addressEl);

    try {
      await window.db.createBooking(category, subcatIdVal, providerId, price, date, time, address);
      window.toastSuccess('Booking confirmed! Redirecting to your dashboard…', 'Booking Confirmed 🎉');
      closeModal('booking-modal');
      setTimeout(() => { window.location.href = 'customer-dashboard.html'; }, 1600);
    } catch (error) {
      window.toastError(error.message, 'Booking Failed');
    }
  });

  // Clear errors on typing
  bookingForm.addEventListener('input', (e) => {
    if (e.target.classList.contains('error')) {
      window.setFieldError(e.target, null);
    }
  });
  bookingForm.addEventListener('change', (e) => {
    if (e.target.classList.contains('error')) {
      window.setFieldError(e.target, null);
    }
  });

  // Modal display helpers
  window.openModal = function (modalId) {
    document.getElementById(modalId).classList.add('active');
  };
  window.closeModal = function (modalId) {
    document.getElementById(modalId).classList.remove('active');
  };
});
