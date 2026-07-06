// Provider Dashboard Logic

// ── Action handlers declared at top-level so inline onclick="..." can reach them
// (top-level const/function in a non-module script is globally reachable
//  without being a property of window)

let _providerActions = null; // set after DOMContentLoaded

const switchPanel = (panelId) => _providerActions && _providerActions.switchPanel(panelId);
const acceptRequest = (bookingId, btn) => _providerActions && _providerActions.acceptRequest(bookingId, btn);
const rejectRequest = (bookingId, btn) => _providerActions && _providerActions.rejectRequest(bookingId, btn);
const promptOtp = (bookingId) => _providerActions && _providerActions.promptOtp(bookingId);
const updateStatus = (bookingId, status, btn) => _providerActions && _providerActions.updateStatus(bookingId, status, btn);

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'provider') {
    toastError('Unauthorized. Redirecting to login…', 'Access Denied');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  // ── Approval gate ─────────────────────────────────────────
  const categories = await getCategories();

  if (!currentUser.isApproved) {
    document.getElementById('approval-screen').style.display = 'flex';
    document.getElementById('app-name').innerText = currentUser.name;

    const providerServices = currentUser.services || [];
    const serviceNames = [];
    Object.values(categories).forEach(cat => {
      cat.subcategories.forEach(sub => {
        if (providerServices.includes(sub.id)) serviceNames.push(sub.name);
      });
    });
    document.getElementById('app-category').innerText = serviceNames.length > 0 ? serviceNames.join(', ') : 'Not Configured';
    return;
  }

  document.getElementById('dashboard-wrapper').style.display = 'grid';
  document.getElementById('sidebar-name').innerText   = currentUser.name;
  document.getElementById('sidebar-avatar').innerText = currentUser.name.charAt(0).toUpperCase();

  function updateSidebarExpert() {
    const providerServices = currentUser.services || [];
    const expertCats = [];
    Object.values(categories).forEach(cat => {
      if (cat.subcategories.some(sub => providerServices.includes(sub.id)))
        expertCats.push(cat.name.split(' ')[0]);
    });
    document.getElementById('sidebar-expert').innerText = `${expertCats.length > 0 ? expertCats.join(' & ') : 'General'} Professional`;
  }
  updateSidebarExpert();
  document.getElementById('welcome-message').innerText = `Welcome Back, ${currentUser.name}!`;

  // ── Modal helpers ─────────────────────────────────────────
  const openModal  = (id) => document.getElementById(id).classList.add('active');
  const closeModal = (id) => document.getElementById(id).classList.remove('active');

  // ── Render Services Checklist ─────────────────────────────
  function renderServicesChecklist() {
    const container = document.getElementById('provider-services-checklist');
    if (!container) return;
    container.innerHTML = '';
    const providerServices = currentUser.services || [];

    Object.values(categories).forEach(cat => {
      const group = document.createElement('div');
      Object.assign(group.style, { border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'15px', background:'var(--light)' });

      const header = document.createElement('h4');
      Object.assign(header.style, { fontSize:'14px', marginBottom:'10px', color:'var(--primary)' });
      header.innerHTML = `<i class="fas ${cat.icon}"></i> ${cat.name}`;
      group.appendChild(header);

      const itemsDiv = document.createElement('div');
      Object.assign(itemsDiv.style, { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'10px' });

      cat.subcategories.forEach(sub => {
        const serviceObj  = providerServices.find(s => (typeof s === 'string' ? s === sub.id : s.id === sub.id));
        const isChecked   = serviceObj ? 'checked' : '';
        const customPrice = (serviceObj && typeof serviceObj === 'object') ? serviceObj.price || '' : '';

        const itemDiv = document.createElement('div');
        Object.assign(itemDiv.style, { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--white)' });
        itemDiv.innerHTML = `
          <label class="form-checkbox" style="font-weight:500;font-size:13px;margin:0;flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" name="services-edit" value="${sub.id}" ${isChecked} style="width:16px;height:16px;cursor:pointer;"
              onchange="document.getElementById('price-input-${sub.id}').disabled=!this.checked;if(!this.checked)document.getElementById('price-input-${sub.id}').value=''">
            <span>${sub.name} <span style="color:var(--text-muted);font-size:11px;">(Base: ₹${sub.price})</span></span>
          </label>
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:12px;color:var(--text-muted);">₹</span>
            <input type="number" id="price-input-${sub.id}" class="form-control" placeholder="${sub.price}" value="${customPrice}" ${isChecked ? '' : 'disabled'} style="width:80px;padding:4px 6px;font-size:12px;height:auto;margin:0;" min="1">
          </div>`;
        itemsDiv.appendChild(itemDiv);
      });
      group.appendChild(itemsDiv);
      container.appendChild(group);
    });
  }

  // ── Panel Switching (internal) ────────────────────────────
  function _switchPanel(panelId) {
    const menuJobs     = document.getElementById('menu-jobs');
    const menuServices = document.getElementById('menu-services');
    const panelJobs     = document.getElementById('panel-jobs');
    const panelServices = document.getElementById('panel-services');

    if (panelId === 'jobs') {
      menuJobs.classList.add('active');     menuServices.classList.remove('active');
      panelJobs.style.display = 'block';   panelServices.style.display = 'none';
    } else {
      menuServices.classList.add('active'); menuJobs.classList.remove('active');
      panelServices.style.display = 'block'; panelJobs.style.display = 'none';
      renderServicesChecklist();
    }
  }

  // Services form submit
  document.getElementById('my-services-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const checked = document.querySelectorAll('input[name="services-edit"]:checked');
    const servicesData = Array.from(checked).map(c => {
      const priceInput  = document.getElementById(`price-input-${c.value}`);
      const customPrice = priceInput && priceInput.value ? Number(priceInput.value) : null;
      return { id: c.value, price: customPrice };
    });

    if (servicesData.length === 0) {
      toastWarning('Please select at least one service to keep your profile active.', 'Configuration Error');
      return;
    }

    const servicesBtn = e.target.querySelector('[type="submit"]');
    setButtonLoading(servicesBtn, 'Saving…');
    try {
      const updated = await updateProviderServices(currentUser.id, servicesData);
      currentUser.services = updated.services;
      updateSidebarExpert();
      toastSuccess('Your services catalog and custom pricing have been updated successfully.', 'Services & Pricing Updated');
      _switchPanel('jobs');
      loadDashboard();
    } catch (err) {
      toastError(err.message, 'Update Failed');
    } finally {
      resetButton(servicesBtn);
    }
  });

  // ── Online / Offline toggle ───────────────────────────────
  const onlineToggle    = document.getElementById('provider-online-toggle');
  const onlineStatusLbl = document.getElementById('online-status-lbl');
  onlineToggle.checked  = currentUser.online;

  function updateOnlineLabel(isOnline) {
    onlineStatusLbl.innerText    = isOnline ? 'Online — Ready to receive client bookings' : 'Offline — You won\'t receive new bookings';
    onlineStatusLbl.style.color  = isOnline ? 'var(--success)' : 'var(--text-muted)';
  }
  updateOnlineLabel(currentUser.online);

  onlineToggle.addEventListener('change', async () => {
    try {
      const updated = await toggleProviderStatus(currentUser.id);
      updateOnlineLabel(updated.online);
      toastInfo(
        updated.online ? 'You are now online. New bookings will be assigned to you.' : 'You are now offline. You won\'t receive new bookings.',
        updated.online ? 'Status: Online 🟢' : 'Status: Offline 🔴'
      );
    } catch (err) {
      toastError(err.message, 'Status Update Failed');
      onlineToggle.checked = !onlineToggle.checked;
    }
  });

  let bookings   = [];
  let currentTab = 'requests';

  const tabRequests = document.getElementById('tab-requests');
  const tabActive   = document.getElementById('tab-active');
  const tabHistory  = document.getElementById('tab-history');

  async function loadDashboard() {
    bookings = await getBookings();
    const completedList = bookings.filter(b => b.status === 'completed');
    const earnings      = completedList.reduce((sum, b) => sum + b.price, 0);
    const ratedBookings = completedList.filter(b => b.rating > 0);
    const rating        = ratedBookings.length > 0 ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length : 0;
    document.getElementById('stat-rating').innerText    = rating > 0 ? rating.toFixed(1) : 'N/A';
    document.getElementById('stat-completed').innerText = completedList.length;
    document.getElementById('stat-earnings').innerText  = `₹${earnings}`;
    renderJobs();
  }

  function renderJobs() {
    const wrapper = document.getElementById('jobs-wrapper');
    wrapper.innerHTML = '';

    const filtered = currentTab === 'requests'
      ? bookings.filter(b => b.status === 'pending')
      : currentTab === 'active'
        ? bookings.filter(b => ['accepted','in-progress'].includes(b.status))
        : bookings.filter(b => ['completed','cancelled'].includes(b.status));

    if (filtered.length === 0) {
      const msgs = { requests:'No new job requests right now. Toggle Online to receive bookings!', active:'No active tasks at hand. Check new requests!', history:'No job history recorded yet.' };
      wrapper.innerHTML = `<div style="background:var(--white);border:1px dashed var(--border);padding:50px 20px;text-align:center;border-radius:var(--radius-lg);"><i class="fas fa-briefcase" style="font-size:40px;color:var(--text-muted);margin-bottom:15px;display:block;"></i><p style="color:var(--text-muted);font-size:14px;">${msgs[currentTab]}</p></div>`;
      return;
    }

    filtered.forEach(b => {
      const catIcon = categories[b.category]?.icon || 'fa-wrench';
      const card    = document.createElement('div');
      card.className = 'booking-card';
      const formattedDate = new Date(b.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

      let actionButtons = '';
      if (currentTab === 'requests') {
        actionButtons = `<div style="display:flex;gap:8px;"><button class="btn btn-outline btn-sm btn-danger" onclick="rejectRequest('${b.id}',this)">Decline</button><button class="btn btn-primary btn-sm" onclick="acceptRequest('${b.id}',this)">Accept Request</button></div>`;
      } else if (currentTab === 'active') {
        actionButtons = b.status === 'accepted'
          ? `<button class="btn btn-secondary btn-sm" onclick="promptOtp('${b.id}')">Start Service</button>`
          : `<button class="btn btn-sm" style="background-color:var(--success);color:white;" onclick="updateStatus('${b.id}','completed',this)">Mark Completed ✓</button>`;
      } else {
        if (b.status === 'completed' && b.rating > 0) {
          let starsHtml = '';
          for (let i = 1; i <= 5; i++) starsHtml += `<i class="${i <= b.rating ? 'fas' : 'far'} fa-star"></i>`;
          actionButtons = `<div style="text-align:right;"><div class="star-rating" style="margin-bottom:4px;">${starsHtml}</div><p style="font-size:11px;color:var(--text-muted);font-style:italic;">"${b.comment}"</p></div>`;
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

  function switchTab(newTab, element) {
    currentTab = newTab;
    [tabRequests, tabActive, tabHistory].forEach(t => { t.style.color = 'var(--text-muted)'; t.style.borderBottomColor = 'transparent'; });
    element.style.color = 'var(--primary)'; element.style.borderBottomColor = 'var(--primary)';
    renderJobs();
  }
  tabRequests.addEventListener('click', () => switchTab('requests', tabRequests));
  tabActive.addEventListener('click',   () => switchTab('active',   tabActive));
  tabHistory.addEventListener('click',  () => switchTab('history',  tabHistory));

  function updateLocalBooking(updatedBooking) {
    const idx = bookings.findIndex(b => b.id === updatedBooking.id);
    if (idx !== -1) bookings[idx] = updatedBooking;
    const completedList = bookings.filter(b => b.status === 'completed');
    const earnings      = completedList.reduce((sum, b) => sum + b.price, 0);
    const ratedBookings = completedList.filter(b => b.rating > 0);
    const rating        = ratedBookings.length > 0 ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length : 0;
    document.getElementById('stat-rating').innerText    = rating > 0 ? rating.toFixed(1) : 'N/A';
    document.getElementById('stat-completed').innerText = completedList.length;
    document.getElementById('stat-earnings').innerText  = `₹${earnings}`;
    renderJobs();
  }

  // Wire up the top-level proxy functions
  _providerActions = {
    switchPanel : _switchPanel,
    acceptRequest: async (bookingId, btn) => {
      setButtonLoading(btn, 'Accepting…');
      try { const u = await updateBookingStatus(bookingId, 'accepted'); toastSuccess('Job accepted! Find it under "Active Tasks" to manage progress.', 'Job Accepted ✅'); updateLocalBooking(u); }
      catch (err) { toastError(err.message, 'Action Failed'); resetButton(btn); }
    },
    rejectRequest: async (bookingId, btn) => {
      if (!confirm('Decline this job request?')) return;
      setButtonLoading(btn, 'Declining…');
      try { const u = await updateBookingStatus(bookingId, 'cancelled'); toastInfo('Job request declined.', 'Request Declined'); updateLocalBooking(u); }
      catch (err) { toastError(err.message, 'Action Failed'); resetButton(btn); }
    },
    promptOtp: (bookingId) => {
      document.getElementById('otp-booking-id').value = bookingId;
      document.getElementById('entered-otp').value    = '';
      openModal('otp-modal');
    },
    updateStatus: async (bookingId, status, btn) => {
      if (btn) setButtonLoading(btn, status === 'completed' ? 'Completing…' : 'Updating…');
      try {
        const u = await updateBookingStatus(bookingId, status);
        toastSuccess(status === 'in-progress' ? 'Job started!' : 'Job marked as completed!', status === 'in-progress' ? 'Job Started 🚀' : 'Job Completed 🎉');
        updateLocalBooking(u);
      } catch (err) { toastError(err.message, 'Update Failed'); if (btn) resetButton(btn); }
    },
  };

  document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookingId  = document.getElementById('otp-booking-id').value;
    const enteredOtp = document.getElementById('entered-otp').value.trim();
    const otpBtn     = e.target.querySelector('[type="submit"]');
    setButtonLoading(otpBtn, 'Verifying…');
    try {
      const updated = await updateBookingStatus(bookingId, 'in-progress', enteredOtp);
      toastSuccess('OTP verified! Job started. Update the customer on your arrival.', 'Job Started 🚀');
      closeModal('otp-modal');
      updateLocalBooking(updated);
    } catch (err) {
      toastError(err.message, 'Verification Failed');
      resetButton(otpBtn);
    }
  });

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
