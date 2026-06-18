// Authentication logic script
document.addEventListener('DOMContentLoaded', () => {
  let isLoginMode = true;
  let selectedRole = 'consumer';

  // DOM Elements
  const authTitle             = document.getElementById('auth-title');
  const authSubtitle          = document.getElementById('auth-subtitle');
  const submitBtn             = document.getElementById('auth-submit-btn');
  const toggleText            = document.getElementById('toggle-text');
  const authForm              = document.getElementById('auth-form');
  const nameGroup             = document.getElementById('name-group');
  const confirmPasswordGroup  = document.getElementById('confirm-password-group');
  const registerDetails       = document.getElementById('register-details');
  const providerFields        = document.getElementById('provider-fields');
  const roleOptions           = document.querySelectorAll('.role-option');
  const providerServicesCheckboxes = document.getElementById('provider-services-checkboxes');

  // Field refs
  const emailEl     = document.getElementById('auth-email');
  const passwordEl  = document.getElementById('auth-password');
  const nameEl      = document.getElementById('auth-name');
  const confirmEl   = document.getElementById('auth-confirm-password');

  // Populate provider services checklist dynamically
  async function populateServicesCheckboxes() {
    if (!providerServicesCheckboxes) return;
    try {
      const categories = await window.db.getCategories();
      providerServicesCheckboxes.innerHTML = '';
      
      Object.values(categories).forEach(cat => {
        const catHeader = document.createElement('div');
        catHeader.style.fontWeight = '700';
        catHeader.style.fontSize = '12px';
        catHeader.style.color = 'var(--primary)';
        catHeader.style.marginTop = '8px';
        catHeader.style.textTransform = 'uppercase';
        catHeader.style.letterSpacing = '0.5px';
        catHeader.innerHTML = `<i class="fas ${cat.icon}"></i> ${cat.name}`;
        providerServicesCheckboxes.appendChild(catHeader);

        cat.subcategories.forEach(sub => {
          const itemDiv = document.createElement('div');
          itemDiv.style.display = 'flex';
          itemDiv.style.alignItems = 'center';
          itemDiv.style.justifyContent = 'space-between';
          itemDiv.style.padding = '8px 12px';
          itemDiv.style.border = '1px solid var(--border)';
          itemDiv.style.borderRadius = 'var(--radius-sm)';
          itemDiv.style.background = 'var(--light)';

          itemDiv.innerHTML = `
            <label class="form-checkbox" style="font-weight: 500; font-size: 13px; margin: 0; flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" name="provider-service" value="${sub.id}" style="width: 16px; height: 16px; cursor: pointer;" onchange="const p = document.getElementById('reg-price-${sub.id}'); p.disabled = !this.checked; if(!this.checked) p.value=''">
              <span>${sub.name} <span style="color: var(--text-muted); font-size: 11px;">(Base: ₹${sub.price})</span></span>
            </label>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 12px; color: var(--text-muted);">₹</span>
              <input type="number" id="reg-price-${sub.id}" class="form-control" placeholder="${sub.price}" disabled style="width: 80px; padding: 4px 6px; font-size: 12px; height: auto; margin: 0;" min="1">
            </div>
          `;
          providerServicesCheckboxes.appendChild(itemDiv);
        });
      });
    } catch (e) {
      console.error('Failed to load categories for signup:', e);
    }
  }

  // Check URL params to set initial state
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('register') === 'true') toggleMode(false);
  if (urlParams.get('role') === 'provider')  selectRole('provider');

  populateServicesCheckboxes();

  // Clear errors when checkboxes change
  if (providerServicesCheckboxes) {
    providerServicesCheckboxes.addEventListener('change', () => {
      window.setFieldError(providerServicesCheckboxes, null);
    });
  }

  // ── Toggle Login/Register Mode ─────────────────────────────
  function bindToggleBtn() {
    const btn = document.getElementById('toggle-auth-mode');
    if (btn) btn.addEventListener('click', () => toggleMode(!isLoginMode));
  }
  bindToggleBtn();

  // ── Role Selection ─────────────────────────────────────────
  roleOptions.forEach(opt => {
    opt.addEventListener('click', () => selectRole(opt.getAttribute('data-role')));
  });

  function selectRole(role) {
    selectedRole = role;
    roleOptions.forEach(o => o.classList.remove('active'));
    const el = document.getElementById(`role-${role}`);
    if (el) el.classList.add('active');

    if (role === 'provider') {
      providerFields.style.display = 'block';
    } else {
      providerFields.style.display = 'none';
    }
  }

  function toggleMode(toLogin) {
    isLoginMode = toLogin;
    window.clearFormErrors(authForm);

    if (isLoginMode) {
      authTitle.innerText    = 'Welcome Back';
      authSubtitle.innerText = 'Login to manage your bookings and services';
      submitBtn.innerText    = 'Sign In';
      toggleText.innerHTML   = `Don't have an account? <span id="toggle-auth-mode">Sign Up</span>`;
      nameGroup.style.display            = 'none';
      confirmPasswordGroup.style.display = 'none';
      registerDetails.style.display      = 'none';
      nameEl.required    = false;
      confirmEl.required = false;
    } else {
      authTitle.innerText    = 'Create an Account';
      authSubtitle.innerText = 'Register to start booking or providing local services';
      submitBtn.innerText    = 'Sign Up';
      toggleText.innerHTML   = `Already have an account? <span id="toggle-auth-mode">Sign In</span>`;
      nameGroup.style.display            = 'block';
      confirmPasswordGroup.style.display = 'block';
      registerDetails.style.display      = 'block';
      nameEl.required    = true;
      confirmEl.required = true;
      selectRole(selectedRole);
    }
    bindToggleBtn();
  }

  // ── Clear inline errors on typing ─────────────────────────
  authForm.addEventListener('input', (e) => {
    if (e.target.classList.contains('error')) {
      window.setFieldError(e.target, null);
    }
  });

  // ── Form Submit ────────────────────────────────────────────
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    window.clearFormErrors(authForm);

    const email    = emailEl.value.trim();
    const password = passwordEl.value;

    // Basic inline validation
    let hasError = false;

    if (!email) {
      window.setFieldError(emailEl, 'Email address is required.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.setFieldError(emailEl, 'Please enter a valid email address.');
      hasError = true;
    }

    if (!password) {
      window.setFieldError(passwordEl, 'Password cannot be empty.');
      hasError = true;
    }

    if (!isLoginMode) {
      const name    = nameEl.value.trim();
      const confirm = confirmEl.value;

      if (!name) {
        window.setFieldError(nameEl, 'Full name is required.');
        hasError = true;
      }

      if (password && password.length < 6) {
        window.setFieldError(passwordEl, 'Password must be at least 6 characters.');
        hasError = true;
      }

      if (!confirm) {
        window.setFieldError(confirmEl, 'Please confirm your password.');
        hasError = true;
      } else if (password !== confirm) {
        window.setFieldError(confirmEl, 'Passwords do not match.');
        hasError = true;
      }

      if (selectedRole === 'provider') {
        const checked = authForm.querySelectorAll('input[name="provider-service"]:checked');
        if (checked.length === 0) {
          window.setFieldError(providerServicesCheckboxes, 'Please select at least one service you can provide.');
          hasError = true;
        }
      }
    }

    if (hasError) return;

    // Disable button to prevent double submit
    submitBtn.disabled = true;
    submitBtn.textContent = isLoginMode ? 'Signing In…' : 'Creating Account…';

    try {
      if (isLoginMode) {
        // LOGIN
        const res  = await window.db.login(email, password);
        window.toastSuccess(`Welcome back, ${res.user.name}!`, 'Login Successful');
        setTimeout(() => redirectUser(res.user), 900);
      } else {
        // REGISTER
        const name     = nameEl.value.trim();
        let services = [];
        if (selectedRole === 'provider') {
          const checked = authForm.querySelectorAll('input[name="provider-service"]:checked');
          services = Array.from(checked).map(c => {
            const subcatId = c.value;
            const priceEl = document.getElementById(`reg-price-${subcatId}`);
            const priceVal = priceEl && priceEl.value ? Number(priceEl.value) : null;
            return { id: subcatId, price: priceVal };
          });
        }
        const res      = await window.db.register(email, name, password, selectedRole, services);

        if (selectedRole === 'provider') {
          window.toastInfo(
            'Registration successful! Your provider profile will be activated after admin review. You can sign in below.',
            'Pending Approval'
          );
          setTimeout(() => toggleMode(true), 2500);
        } else {
          window.toastSuccess(`Account created! Welcome, ${name}!`, 'Registration Successful 🎉');
          setTimeout(() => redirectUser(res.user), 1000);
        }
      }
    } catch (error) {
      window.toastError(error.message, isLoginMode ? 'Login Failed' : 'Registration Failed');
      submitBtn.disabled = false;
      submitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
    }
  });

  // ── Route user after auth ──────────────────────────────────
  function redirectUser(user) {
    const returnUrl = urlParams.get('return');
    if (returnUrl) { window.location.href = returnUrl; return; }
    if (user.role === 'admin')    { window.location.href = 'admin-dashboard.html'; return; }
    if (user.role === 'provider') { window.location.href = 'provider-dashboard.html'; return; }
    window.location.href = 'customer-dashboard.html';
  }
});
