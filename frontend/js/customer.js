// Customer Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = window.db.getCurrentUser();
  if (!currentUser || currentUser.role !== 'consumer') {
    window.toastError('Unauthorized. Redirecting to login…', 'Access Denied');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  document.getElementById('sidebar-name').innerText    = currentUser.name;
  document.getElementById('sidebar-avatar').innerText  = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('welcome-message').innerText = `Welcome, ${currentUser.name}!`;

  let bookings     = [];
  let categories   = {};
  let currentTab   = 'active';
  let selectedRating = 0;

  const tabActive = document.getElementById('tab-active');
  const tabPast   = document.getElementById('tab-past');

  // ── Load dashboard ────────────────────────────────────────
  async function loadDashboard() {
    bookings = await window.db.getBookings();
    if (Object.keys(categories).length === 0) {
      categories = await window.db.getCategories();
    }

    updateStats();
    renderBookings();
  }

  function updateStats() {
    const total     = bookings.length;
    const active    = bookings.filter(b => ['pending','accepted','in-progress'].includes(b.status)).length;
    const completed = bookings.filter(b => b.status === 'completed').length;

    document.getElementById('stat-total').innerText     = total;
    document.getElementById('stat-active').innerText    = active;
    document.getElementById('stat-completed').innerText = completed;
  }

  function updateLocalBooking(updatedBooking) {
    const idx = bookings.findIndex(b => b.id === updatedBooking.id);
    if (idx !== -1) {
      bookings[idx] = updatedBooking;
    }
    updateStats();
    renderBookings();
  }

  // ── Render booking cards ──────────────────────────────────
  function renderBookings() {
    const wrapper     = document.getElementById('bookings-wrapper');
    wrapper.innerHTML = '';

    const isTabActive = currentTab === 'active';
    const filtered    = bookings.filter(b => {
      const isActive = ['pending','accepted','in-progress'].includes(b.status);
      return isTabActive ? isActive : !isActive;
    });

    if (filtered.length === 0) {
      wrapper.innerHTML = `
        <div style="background:var(--white);border:1px dashed var(--border);padding:50px 20px;text-align:center;border-radius:var(--radius-lg);">
          <i class="far fa-calendar-times" style="font-size:48px;color:var(--text-muted);margin-bottom:15px;display:block;"></i>
          <h4 style="margin-bottom:8px;">No ${isTabActive ? 'Active' : 'Past'} Bookings Found</h4>
          <p style="color:var(--text-muted);font-size:14px;margin-bottom:20px;">Need something done around the house?</p>
          ${isTabActive ? '<a href="index.html" class="btn btn-primary btn-sm">Browse Services Now</a>' : ''}
        </div>`;
      return;
    }



    filtered.forEach(b => {
      const catIcon = categories[b.category]?.icon || 'fa-wrench';
      const card    = document.createElement('div');
      card.className = 'booking-card';

      let badgeClass = 'badge-pending';
      if (b.status === 'accepted')    badgeClass = 'badge-accepted';
      if (b.status === 'in-progress') badgeClass = 'badge-progress';
      if (b.status === 'completed')   badgeClass = 'badge-completed';
      if (b.status === 'cancelled')   badgeClass = 'badge-cancelled';

      const formattedDate = new Date(b.date).toLocaleDateString('en-US', {
        weekday:'short', month:'short', day:'numeric', year:'numeric'
      });

      let actionButtons = '';
      if (b.status === 'pending') {
        actionButtons = `<button class="btn btn-outline btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel Booking</button>`;
      } else if (b.status === 'completed') {
        if (b.rating === 0) {
          actionButtons = `<button class="btn btn-primary btn-sm" onclick="openRatingModal('${b.id}','${b.providerName.replace(/'/g,"\\'")}')"
            >Rate & Review</button>`;
        } else {
          let starsHtml = '';
          for (let i = 1; i <= 5; i++) starsHtml += `<i class="${i <= b.rating ? 'fas' : 'far'} fa-star"></i>`;
          actionButtons = `
            <div style="text-align:right;">
              <div class="star-rating" style="margin-bottom:4px;">${starsHtml}</div>
              <p style="font-size:11px;color:var(--text-muted);font-style:italic;">"${b.comment}"</p>
            </div>`;
        }
      }

      let otpBox = '';
      if (b.status === 'accepted' && b.otp) {
        otpBox = `
          <div style="margin-top: 10px; background: rgba(79, 70, 229, 0.05); border: 1px dashed var(--primary); padding: 8px 12px; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 8px;">
            <i class="fas fa-key" style="color: var(--primary); font-size: 13px;"></i>
            <span style="font-size: 13px; font-weight: 600; color: var(--dark);">Service OTP: <strong style="color: var(--primary); font-size: 15px; letter-spacing: 1px;">${b.otp}</strong></span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="booking-main">
          <div class="booking-service-icon"><i class="fas ${catIcon}"></i></div>
          <div class="booking-details">
            <h3>${b.subcategoryName}</h3>
            <p><i class="far fa-user"></i> Professional: <strong>${b.providerName}</strong></p>
            <p><i class="far fa-calendar"></i> ${formattedDate} at ${b.time}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${b.address}</p>
            ${otpBox}
          </div>
        </div>
        <div class="booking-meta">
          <span class="badge ${badgeClass}">${b.status}</span>
          <span style="font-weight:700;color:var(--dark);font-size:18px;">₹${b.price}</span>
          <div style="margin-top:5px;">${actionButtons}</div>
        </div>`;

      wrapper.appendChild(card);
    });
  }

  // ── Tab switching ─────────────────────────────────────────
  function setActiveTab(el, newTab) {
    currentTab = newTab;
    [tabActive, tabPast].forEach(t => {
      t.style.color            = 'var(--text-muted)';
      t.style.borderBottomColor = 'transparent';
    });
    el.style.color            = 'var(--primary)';
    el.style.borderBottomColor = 'var(--primary)';
    renderBookings();
  }

  tabActive.addEventListener('click', () => setActiveTab(tabActive, 'active'));
  tabPast.addEventListener('click',   () => setActiveTab(tabPast,   'past'));

  // ── Cancel booking ────────────────────────────────────────
  window.cancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const updated = await window.db.updateBookingStatus(bookingId, 'cancelled');
      window.toastSuccess('Your booking has been cancelled successfully.', 'Booking Cancelled');
      updateLocalBooking(updated);
    } catch (err) {
      window.toastError(err.message, 'Cancel Failed');
    }
  };

  // ── Rating modal ──────────────────────────────────────────
  window.openRatingModal = (bookingId, providerName) => {
    document.getElementById('rating-booking-id').value      = bookingId;
    document.getElementById('rating-provider-name').innerText = providerName;
    document.getElementById('rating-comment').value         = '';
    selectedRating = 0;
    resetStars();
    window.openModal('rating-modal');
  };

  const stars      = document.querySelectorAll('#star-rating-selector i');
  const ratingText = document.getElementById('star-rating-text');

  stars.forEach(star => {
    star.addEventListener('mouseover', () => highlightStars(parseInt(star.dataset.rating)));
    star.addEventListener('mouseout',  () => highlightStars(selectedRating));
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.rating);
      highlightStars(selectedRating);
      updateRatingText(selectedRating);
    });
  });

  function highlightStars(val) {
    stars.forEach(s => {
      const v = parseInt(s.dataset.rating);
      s.className = v <= val ? 'fas fa-star active' : 'far fa-star';
    });
  }
  function resetStars() {
    stars.forEach(s => { s.className = 'far fa-star'; s.classList.remove('active'); });
    ratingText.innerText = 'Select rating';
  }
  function updateRatingText(val) {
    const map = { 1:'Poor (1/5)', 2:'Fair (2/5)', 3:'Good (3/5)', 4:'Very Good (4/5)', 5:'Excellent (5/5)' };
    ratingText.innerText = map[val] || 'Select rating';
  }

  document.getElementById('rating-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (selectedRating === 0) {
      window.toastWarning('Please tap a star to rate the service before submitting.', 'Rating Required');
      return;
    }
    const bookingId = document.getElementById('rating-booking-id').value;
    const comment   = document.getElementById('rating-comment').value;
    const commentEl = document.getElementById('rating-comment');

    if (!comment.trim()) {
      window.setFieldError(commentEl, 'Please add a short comment about your experience.');
      return;
    }

    try {
      const updated = await window.db.rateBooking(bookingId, selectedRating, comment);
      window.toastSuccess('Your review has been submitted. Thank you!', 'Review Posted ⭐');
      window.closeModal('rating-modal');
      updateLocalBooking(updated);
    } catch (err) {
      window.toastError(err.message, 'Submission Failed');
    }
  });

  window.openModal  = (id) => document.getElementById(id).classList.add('active');
  window.closeModal = (id) => document.getElementById(id).classList.remove('active');

  await loadDashboard();

  // ── Real-time updates via Server-Sent Events ──────────────
  const evtSource = new EventSource('http://localhost:3000/bookings/events');
  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Refresh dashboard when any booking changes
      loadDashboard();
    } catch (e) {
      console.error('SSE parse error:', e);
    }
  };
  evtSource.onerror = () => {
    console.warn('SSE connection lost, will auto-reconnect...');
  };
});
