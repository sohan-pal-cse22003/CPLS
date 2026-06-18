// Provider Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = window.db.getCurrentUser();
  if (!currentUser || currentUser.role !== 'provider') {
    window.toastError('Unauthorized. Redirecting to login…', 'Access Denied');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  // ── Approval gate ─────────────────────────────────────────
  const categories = await window.db.getCategories();

  if (!currentUser.isApproved) {
    document.getElementById('approval-screen').style.display = 'flex';
    document.getElementById('app-name').innerText = currentUser.name;
    
    const providerServices = currentUser.services || [];
    const serviceNames = [];
    Object.values(categories).forEach(cat => {
      cat.subcategories.forEach(sub => {
        if (providerServices.includes(sub.id)) {
          serviceNames.push(sub.name);
        }
      });
    });
    document.getElementById('app-category').innerText = serviceNames.length > 0 ? serviceNames.join(', ') : 'Not Configured';
    return;
  }

  document.getElementById('dashboard-wrapper').style.display = 'grid';

  // Profile info
  document.getElementById('sidebar-name').innerText    = currentUser.name;
  document.getElementById('sidebar-avatar').innerText  = currentUser.name.charAt(0).toUpperCase();

  function updateSidebarExpert() {
    const providerServices = currentUser.services || [];
    const expertCats = [];
    Object.values(categories).forEach(cat => {
      const hasServiceInCat = cat.subcategories.some(sub => providerServices.includes(sub.id));
      if (hasServiceInCat) {
        expertCats.push(cat.name.split(' ')[0]);
      }
    });
    const expertDisplayName = expertCats.length > 0 ? expertCats.join(' & ') : 'General';
    document.getElementById('sidebar-expert').innerText  = `${expertDisplayName} Professional`;
  }
  updateSidebarExpert();
  document.getElementById('welcome-message').innerText = `Welcome Back, ${currentUser.name}!`;

  // ── Panel Switching ───────────────────────────────────────
  window.switchPanel = (panelId) => {
    const menuJobs = document.getElementById('menu-jobs');
    const menuServices = document.getElementById('menu-services');
    const panelJobs = document.getElementById('panel-jobs');
    const panelServices = document.getElementById('panel-services');

    if (panelId === 'jobs') {
      menuJobs.classList.add('active');
      menuServices.classList.remove('active');
      panelJobs.style.display = 'block';
      panelServices.style.display = 'none';
    } else {
      menuServices.classList.add('active');
      menuJobs.classList.remove('active');
      panelServices.style.display = 'block';
      panelJobs.style.display = 'none';
      renderServicesChecklist();
    }
  };

  // ── Render Services Checklist ─────────────────────────────
  function renderServicesChecklist() {
    const container = document.getElementById('provider-services-checklist');
    if (!container) return;
    container.innerHTML = '';

    const providerServices = currentUser.services || [];

    Object.values(categories).forEach(cat => {
      const group = document.createElement('div');
      group.style.border = '1px solid var(--border)';
      group.style.borderRadius = 'var(--radius-md)';
      group.style.padding = '15px';
      group.style.background = 'var(--light)';

      const header = document.createElement('h4');
      header.style.fontSize = '14px';
      header.style.marginBottom = '10px';
      header.style.color = 'var(--primary)';
      header.innerHTML = `<i class="fas ${cat.icon}"></i> ${cat.name}`;
      group.appendChild(header);

      const itemsDiv = document.createElement('div');
      itemsDiv.style.display = 'grid';
      itemsDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
      itemsDiv.style.gap = '10px';

      cat.subcategories.forEach(sub => {
        const serviceObj = providerServices.find(s => (typeof s === 'string' ? s === sub.id : s.id === sub.id));
        const isChecked = serviceObj ? 'checked' : '';
        const customPrice = (serviceObj && typeof serviceObj === 'object') ? serviceObj.price || '' : '';

        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.padding = '8px 12px';
        itemDiv.style.border = '1px solid var(--border)';
        itemDiv.style.borderRadius = 'var(--radius-sm)';
        itemDiv.style.background = 'var(--white)';

        itemDiv.innerHTML = `
          <label class="form-checkbox" style="font-weight: 500; font-size: 13px; margin: 0; flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="services-edit" value="${sub.id}" ${isChecked} style="width: 16px; height: 16px; cursor: pointer;" onchange="document.getElementById('price-input-${sub.id}').disabled = !this.checked; if(!this.checked) document.getElementById('price-input-${sub.id}').value = ''">
            <span>${sub.name} <span style="color: var(--text-muted); font-size: 11px;">(Base: ₹${sub.price})</span></span>
          </label>
          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="font-size: 12px; color: var(--text-muted);">₹</span>
            <input type="number" id="price-input-${sub.id}" class="form-control" placeholder="${sub.price}" value="${customPrice}" ${isChecked ? '' : 'disabled'} style="width: 80px; padding: 4px 6px; font-size: 12px; height: auto; margin: 0;" min="1">
          </div>
        `;
        itemsDiv.appendChild(itemDiv);
      });

      group.appendChild(itemsDiv);
      container.appendChild(group);
    });
  }

  // Handle services checklist submit
  document.getElementById('my-services-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const checked = document.querySelectorAll('input[name="services-edit"]:checked');
    const servicesData = Array.from(checked).map(c => {
      const subcatId = c.value;
      const priceInput = document.getElementById(`price-input-${subcatId}`);
      const customPrice = priceInput && priceInput.value ? Number(priceInput.value) : null;
      return { id: subcatId, price: customPrice };
    });

    if (servicesData.length === 0) {
      window.toastWarning('Please select at least one service to keep your profile active.', 'Configuration Error');
      return;
    }

    try {
      const updated = await window.db.updateProviderServices(currentUser.id, servicesData);
      currentUser.services = updated.services; // update local ref
      updateSidebarExpert();
      window.toastSuccess('Your services catalog and custom pricing have been updated successfully.', 'Services & Pricing Updated');
      switchPanel('jobs');
      loadDashboard();
    } catch (err) {
      window.toastError(err.message, 'Update Failed');
    }
  });

  // ── Online / Offline toggle ───────────────────────────────
  const onlineToggle   = document.getElementById('provider-online-toggle');
  const onlineStatusLbl = document.getElementById('online-status-lbl');

  onlineToggle.checked = currentUser.online;
  updateOnlineLabel(currentUser.online);

  onlineToggle.addEventListener('change', async () => {
    try {
      const updated = await window.db.toggleProviderStatus(currentUser.id);
      updateOnlineLabel(updated.online);
      const msg = updated.online
        ? 'You are now online. New bookings will be assigned to you.'
        : 'You are now offline. You won\'t receive new bookings.';
      window.toastInfo(msg, updated.online ? 'Status: Online 🟢' : 'Status: Offline 🔴');
    } catch (err) {
      window.toastError(err.message, 'Status Update Failed');
      onlineToggle.checked = !onlineToggle.checked;
    }
  });

  function updateOnlineLabel(isOnline) {
    onlineStatusLbl.innerText = isOnline
      ? 'Online — Ready to receive client bookings'
      : 'Offline — You won\'t receive new bookings';
    onlineStatusLbl.style.color = isOnline ? 'var(--success)' : 'var(--text-muted)';
  }

  let bookings   = [];
  let currentTab = 'requests';

  const tabRequests = document.getElementById('tab-requests');
  const tabActive   = document.getElementById('tab-active');
  const tabHistory  = document.getElementById('tab-history');

  // ── Load dashboard ────────────────────────────────────────
  async function loadDashboard() {
    bookings = await window.db.getBookings();

    const completedList = bookings.filter(b => b.status === 'completed');
    const earnings    = completedList.reduce((sum, b) => sum + b.price, 0);

    // Compute average rating from completed bookings that have a rating
    const ratedBookings = completedList.filter(b => b.rating > 0);
    let rating = 0;
    if (ratedBookings.length > 0) {
      rating = ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length;
    }

    document.getElementById('stat-rating').innerText    = rating > 0 ? rating.toFixed(1) : 'N/A';
    document.getElementById('stat-completed').innerText = completedList.length;
    document.getElementById('stat-earnings').innerText  = `₹${earnings}`;

    renderJobs();
  }

  // ── Render job cards ──────────────────────────────────────
  function renderJobs() {
    const wrapper     = document.getElementById('jobs-wrapper');
    wrapper.innerHTML = '';

    let filtered = [];
    if (currentTab === 'requests') {
      filtered = bookings.filter(b => b.status === 'pending');
    } else if (currentTab === 'active') {
      filtered = bookings.filter(b => ['accepted','in-progress'].includes(b.status));
    } else {
      filtered = bookings.filter(b => ['completed','cancelled'].includes(b.status));
    }

    if (filtered.length === 0) {
      const msgs = {
        requests: 'No new job requests right now. Toggle Online to receive bookings!',
        active:   'No active tasks at hand. Check new requests!',
        history:  'No job history recorded yet.',
      };
      wrapper.innerHTML = `
        <div style="background:var(--white);border:1px dashed var(--border);padding:50px 20px;text-align:center;border-radius:var(--radius-lg);">
          <i class="fas fa-briefcase" style="font-size:40px;color:var(--text-muted);margin-bottom:15px;display:block;"></i>
          <p style="color:var(--text-muted);font-size:14px;">${msgs[currentTab]}</p>
        </div>`;
      return;
    }

    filtered.forEach(b => {
      const catIcon = categories[b.category]?.icon || 'fa-wrench';
      const card    = document.createElement('div');
      card.className = 'booking-card';

      const formattedDate = new Date(b.date).toLocaleDateString('en-US', {
        weekday:'short', month:'short', day:'numeric', year:'numeric'
      });

      let actionButtons = '';
      if (currentTab === 'requests') {
        actionButtons = `
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm btn-danger" onclick="rejectRequest('${b.id}')">Decline</button>
            <button class="btn btn-primary btn-sm" onclick="acceptRequest('${b.id}')">Accept Request</button>
          </div>`;
      } else if (currentTab === 'active') {
        if (b.status === 'accepted') {
          actionButtons = `<button class="btn btn-secondary btn-sm" onclick="promptOtp('${b.id}')">Start Service</button>`;
        } else {
          actionButtons = `<button class="btn btn-sm" style="background-color:var(--success);color:white;" onclick="updateStatus('${b.id}','completed')">Mark Completed ✓</button>`;
        }
      } else {
        if (b.status === 'completed' && b.rating > 0) {
          let starsHtml = '';
          for (let i = 1; i <= 5; i++) starsHtml += `<i class="${i <= b.rating ? 'fas' : 'far'} fa-star"></i>`;
          actionButtons = `
            <div style="text-align:right;">
              <div class="star-rating" style="margin-bottom:4px;">${starsHtml}</div>
              <p style="font-size:11px;color:var(--text-muted);font-style:italic;">"${b.comment}"</p>
            </div>`;
        } else if (b.status === 'completed') {
          actionButtons = `<span style="font-size:12px;color:var(--text-muted);font-style:italic;">Awaiting customer review</span>`;
        } else {
          actionButtons = `<span class="badge badge-cancelled">Cancelled</span>`;
        }
      }

      let badgeClass = 'badge-pending';
      if (b.status === 'accepted')    badgeClass = 'badge-accepted';
      if (b.status === 'in-progress') badgeClass = 'badge-progress';
      if (b.status === 'completed')   badgeClass = 'badge-completed';
      if (b.status === 'cancelled')   badgeClass = 'badge-cancelled';

      card.innerHTML = `
        <div class="booking-main">
          <div class="booking-service-icon"><i class="fas ${catIcon}"></i></div>
          <div class="booking-details">
            <h3>${b.subcategoryName}</h3>
            <p><i class="far fa-user"></i> Customer: <strong>${b.consumerName}</strong></p>
            <p><i class="far fa-calendar"></i> Scheduled: ${formattedDate} at ${b.time}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${b.address}</p>
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
  function switchTab(newTab, element) {
    currentTab = newTab;
    [tabRequests, tabActive, tabHistory].forEach(t => {
      t.style.color            = 'var(--text-muted)';
      t.style.borderBottomColor = 'transparent';
    });
    element.style.color            = 'var(--primary)';
    element.style.borderBottomColor = 'var(--primary)';
    renderJobs();
  }

  tabRequests.addEventListener('click', () => switchTab('requests', tabRequests));
  tabActive.addEventListener('click',   () => switchTab('active',   tabActive));
  tabHistory.addEventListener('click',  () => switchTab('history',  tabHistory));

  // ── Helper: update local booking and re-render ─────────────
  function updateLocalBooking(updatedBooking) {
    const idx = bookings.findIndex(b => b.id === updatedBooking.id);
    if (idx !== -1) {
      bookings[idx] = updatedBooking;
    }
    // Recalc stats
    const completedList = bookings.filter(b => b.status === 'completed');
    const earnings = completedList.reduce((sum, b) => sum + b.price, 0);
    const ratedBookings = completedList.filter(b => b.rating > 0);
    let rating = 0;
    if (ratedBookings.length > 0) {
      rating = ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length;
    }
    document.getElementById('stat-rating').innerText    = rating > 0 ? rating.toFixed(1) : 'N/A';
    document.getElementById('stat-completed').innerText = completedList.length;
    document.getElementById('stat-earnings').innerText  = `₹${earnings}`;
    renderJobs();
  }

  // ── Action handlers ───────────────────────────────────────
  window.acceptRequest = async (bookingId) => {
    try {
      const updated = await window.db.updateBookingStatus(bookingId, 'accepted');
      window.toastSuccess('Job accepted! Find it under "Active Tasks" to manage progress.', 'Job Accepted ✅');
      updateLocalBooking(updated);
    } catch (err) { window.toastError(err.message, 'Action Failed'); }
  };

  window.rejectRequest = async (bookingId) => {
    if (!confirm('Decline this job request?')) return;
    try {
      const updated = await window.db.updateBookingStatus(bookingId, 'cancelled');
      window.toastInfo('Job request declined.', 'Request Declined');
      updateLocalBooking(updated);
    } catch (err) { window.toastError(err.message, 'Action Failed'); }
  };

  window.promptOtp = (bookingId) => {
    document.getElementById('otp-booking-id').value = bookingId;
    document.getElementById('entered-otp').value = '';
    window.openModal('otp-modal');
  };

  document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookingId = document.getElementById('otp-booking-id').value;
    const enteredOtp = document.getElementById('entered-otp').value.trim();

    try {
      const updated = await window.db.updateBookingStatus(bookingId, 'in-progress', enteredOtp);
      window.toastSuccess('OTP verified! Job started. Update the customer on your arrival.', 'Job Started 🚀');
      window.closeModal('otp-modal');
      updateLocalBooking(updated);
    } catch (err) {
      window.toastError(err.message, 'Verification Failed');
    }
  });

  window.updateStatus = async (bookingId, status) => {
    try {
      const updated = await window.db.updateBookingStatus(bookingId, status);
      const msg = status === 'in-progress' ? 'Job started! Update the customer on your arrival.' : 'Job marked as completed!';
      const title = status === 'in-progress' ? 'Job Started 🚀' : 'Job Completed 🎉';
      window.toastSuccess(msg, title);
      updateLocalBooking(updated);
    } catch (err) { window.toastError(err.message, 'Update Failed'); }
  };

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
