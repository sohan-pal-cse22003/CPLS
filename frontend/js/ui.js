/* =============================================
   GLOBAL SHARED UTILITIES
   - Toast Notification System
   - Modern Date Picker Component
   - Inline Field Validation Helper
   ============================================= */

// ─── TOAST SYSTEM ───────────────────────────────────────────────
(function () {
  // Inject container once
  function ensureContainer() {
    if (!document.getElementById('toast-container')) {
      const el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
    }
    return document.getElementById('toast-container');
  }

  const ICONS = {
    success: 'fas fa-check-circle',
    error:   'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info:    'fas fa-info-circle',
  };

  const TITLES = {
    success: 'Success',
    error:   'Error',
    warning: 'Warning',
    info:    'Info',
  };

  /**
   * Show a toast notification.
   * @param {string} message - Body message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} [title]  - Override default title
   * @param {number} [duration] - ms before auto-dismiss (default 4000)
   */
  window.showToast = function (message, type = 'info', title = '', duration = 4000) {
    const container = ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconClass = ICONS[type] || ICONS.info;
    const titleText = title || TITLES[type] || 'Notification';

    toast.innerHTML = `
      <i class="${iconClass} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${titleText}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close"><i class="fas fa-times"></i></button>
      <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));

    container.appendChild(toast);

    // Auto-dismiss
    const timer = setTimeout(() => dismissToast(toast), duration);
    toast._timer = timer;

    return toast;
  };

  function dismissToast(toast) {
    if (toast._dismissed) return;
    toast._dismissed = true;
    clearTimeout(toast._timer);
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  // Convenience shorthands
  window.toastSuccess = (msg, title) => window.showToast(msg, 'success', title);
  window.toastError   = (msg, title) => window.showToast(msg, 'error',   title);
  window.toastWarning = (msg, title) => window.showToast(msg, 'warning', title);
  window.toastInfo    = (msg, title) => window.showToast(msg, 'info',    title);
})();


// ─── INLINE FIELD VALIDATION HELPER ─────────────────────────────
/**
 * Set an inline error below a field element.
 * @param {HTMLElement} fieldEl  - The input / button element
 * @param {string|null} message  - Error message. null = clear error.
 */
window.setFieldError = function (fieldEl, message) {
  // Remove existing error sibling
  const existingErr = fieldEl.parentNode.querySelector('.field-error');
  if (existingErr) existingErr.remove();
  fieldEl.classList.remove('error', 'success');

  if (message) {
    fieldEl.classList.add('error');
    const errEl = document.createElement('span');
    errEl.className = 'field-error';
    errEl.innerHTML = `<i class="fas fa-exclamation-circle"></i>${message}`;
    fieldEl.insertAdjacentElement('afterend', errEl);
  }
};

/**
 * Mark a field as valid (green border).
 */
window.setFieldValid = function (fieldEl) {
  const existingErr = fieldEl.parentNode.querySelector('.field-error');
  if (existingErr) existingErr.remove();
  fieldEl.classList.remove('error');
  fieldEl.classList.add('success');
};

/**
 * Clear all validation states in a form.
 */
window.clearFormErrors = function (formEl) {
  formEl.querySelectorAll('.field-error').forEach(el => el.remove());
  formEl.querySelectorAll('.error, .success').forEach(el => {
    el.classList.remove('error', 'success');
  });
};


// ─── MODERN DATE PICKER COMPONENT ──────────────────────────────
/**
 * Creates a shadcn/ui-inspired date picker.
 *
 * Usage:
 *   const dp = createDatePicker('#my-wrapper', {
 *     onChange: (dateStr) => console.log(dateStr),  // 'YYYY-MM-DD'
 *     placeholder: 'Pick a date',
 *   });
 *   dp.getValue();    // returns 'YYYY-MM-DD' or ''
 *   dp.setValue('2026-08-15');
 *   dp.destroy();
 *
 * @param {string|HTMLElement} containerSel
 * @param {{ onChange, placeholder, minDate, maxDate }} options
 */
window.createDatePicker = function (containerSel, options = {}) {
  const container = typeof containerSel === 'string'
    ? document.querySelector(containerSel)
    : containerSel;
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = options.minDate || new Date(today); // default: today
  const maxDate = options.maxDate || (() => {          // default: +24 months
    const d = new Date(today);
    d.setMonth(d.getMonth() + 24);
    return d;
  })();

  let selectedDate = null;   // Date object or null
  let viewYear  = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-based

  // ── Build DOM ────────────────────────────────────────────
  container.classList.add('datepicker-wrapper');

  // Trigger button
  const triggerBtn = document.createElement('button');
  triggerBtn.type = 'button';
  triggerBtn.className = 'datepicker-input-btn';
  triggerBtn.setAttribute('aria-haspopup', 'true');
  triggerBtn.setAttribute('aria-expanded', 'false');
  triggerBtn.innerHTML = `
    <i class="far fa-calendar-alt"></i>
    <span class="dp-display">${options.placeholder || 'Select date'}</span>
    <i class="fas fa-chevron-down" style="margin-left:auto;font-size:11px;"></i>
  `;
  container.appendChild(triggerBtn);

  // Popup
  const popup = document.createElement('div');
  popup.className = 'datepicker-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.innerHTML = `
    <div style="position:relative;">
      <!-- Month/Year overlay (hidden by default) -->
      <div class="dp-overlay" id="dp-month-overlay">
        <div class="dp-overlay-title">
          <h4 id="dp-overlay-label">Select Month</h4>
          <button class="dp-overlay-close" id="dp-overlay-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="dp-grid-3" id="dp-overlay-grid"></div>
      </div>

      <!-- Header -->
      <div class="dp-header">
        <button class="dp-nav-btn" id="dp-prev-btn" aria-label="Previous Month">
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="dp-month-year">
          <button class="dp-month-btn" id="dp-month-btn"></button>
          <button class="dp-year-btn"  id="dp-year-btn"></button>
        </div>
        <button class="dp-nav-btn" id="dp-next-btn" aria-label="Next Month">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- Weekday labels -->
      <div class="dp-weekdays">
        ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d =>
          `<div class="dp-weekday">${d}</div>`).join('')}
      </div>

      <!-- Days Grid -->
      <div class="dp-days-grid" id="dp-days-grid"></div>
    </div>
  `;
  container.appendChild(popup);

  // ── Element refs ─────────────────────────────────────────
  const prevBtn       = popup.querySelector('#dp-prev-btn');
  const nextBtn       = popup.querySelector('#dp-next-btn');
  const monthBtn      = popup.querySelector('#dp-month-btn');
  const yearBtn       = popup.querySelector('#dp-year-btn');
  const daysGrid      = popup.querySelector('#dp-days-grid');
  const monthOverlay  = popup.querySelector('#dp-month-overlay');
  const overlayGrid   = popup.querySelector('#dp-overlay-grid');
  const overlayLabel  = popup.querySelector('#dp-overlay-label');
  const overlayClose  = popup.querySelector('#dp-overlay-close-btn');
  const dpDisplay     = triggerBtn.querySelector('.dp-display');

  // ── Helpers ───────────────────────────────────────────────
  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  function clamp(date) {
    if (date < minDate) return false;
    if (date > maxDate) return false;
    return true;
  }

  // ── Render calendar ───────────────────────────────────────
  function renderCalendar() {
    // Update header
    monthBtn.textContent = MONTH_NAMES[viewMonth];
    yearBtn.textContent  = viewYear;

    // Prev / Next navigation bounds
    const firstDayOfView = new Date(viewYear, viewMonth, 1);
    const lastDayOfView  = new Date(viewYear, viewMonth + 1, 0);
    prevBtn.disabled = firstDayOfView <= minDate;
    nextBtn.disabled = lastDayOfView  >= maxDate;

    // Days
    daysGrid.innerHTML = '';
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0-Sun

    // Fill leading blanks from prev month
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = createDayEl(prevMonthDays - i, true);
      d.classList.add('outside-month', 'disabled');
      daysGrid.appendChild(d);
    }

    // Fill current month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const el   = createDayEl(day, false);

      if (isSameDay(date, today)) el.classList.add('today');
      if (selectedDate && isSameDay(date, selectedDate)) el.classList.add('selected');
      if (!clamp(date)) el.classList.add('disabled');

      el.addEventListener('click', () => {
        if (el.classList.contains('disabled')) return;
        selectedDate = date;
        updateDisplay();
        renderCalendar();
        closePopup();
        if (options.onChange) options.onChange(formatDate(date));
      });

      daysGrid.appendChild(el);
    }

    // Fill trailing blanks
    const totalCells = firstWeekday + daysInMonth;
    const trailing   = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= trailing; i++) {
      const d = createDayEl(i, true);
      d.classList.add('outside-month', 'disabled');
      daysGrid.appendChild(d);
    }
  }

  function createDayEl(day, outside) {
    const el = document.createElement('div');
    el.className = 'dp-day';
    el.textContent = day;
    if (outside) el.classList.add('outside-month');
    return el;
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(date) {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function updateDisplay() {
    if (selectedDate) {
      dpDisplay.textContent = formatDisplayDate(selectedDate);
      dpDisplay.classList.remove('dp-placeholder');
      triggerBtn.classList.add('has-value');
    } else {
      dpDisplay.textContent = options.placeholder || 'Select date';
      dpDisplay.classList.add('dp-placeholder');
      triggerBtn.classList.remove('has-value');
    }
  }

  // ── Month overlay ─────────────────────────────────────────
  let overlayMode = 'month'; // 'month' | 'year'

  function showMonthOverlay() {
    overlayMode = 'month';
    overlayLabel.textContent = `Select Month — ${viewYear}`;
    overlayGrid.innerHTML = '';

    MONTH_NAMES.forEach((name, idx) => {
      const el = document.createElement('div');
      el.className = 'dp-overlay-item';
      el.textContent = name.slice(0, 3);

      const firstOfMonth = new Date(viewYear, idx, 1);
      const lastOfMonth  = new Date(viewYear, idx + 1, 0);
      const isDisabled = lastOfMonth < minDate || firstOfMonth > maxDate;

      if (isDisabled) el.classList.add('disabled');
      if (idx === viewMonth) el.classList.add('selected');

      el.addEventListener('click', () => {
        if (isDisabled) return;
        viewMonth = idx;
        closeOverlay();
        renderCalendar();
      });

      overlayGrid.appendChild(el);
    });

    monthOverlay.classList.add('open');
  }

  function showYearOverlay() {
    overlayMode = 'year';
    overlayLabel.textContent = 'Select Year';
    overlayGrid.innerHTML = '';

    const startYear = minDate.getFullYear();
    const endYear   = maxDate.getFullYear();

    for (let y = startYear; y <= endYear; y++) {
      const el = document.createElement('div');
      el.className = 'dp-overlay-item';
      el.textContent = y;
      if (y === viewYear) el.classList.add('selected');

      el.addEventListener('click', () => {
        viewYear = y;
        closeOverlay();
        showMonthOverlay();
      });

      overlayGrid.appendChild(el);
    }

    monthOverlay.classList.add('open');
  }

  function closeOverlay() {
    monthOverlay.classList.remove('open');
  }

  // ── Popup open/close ─────────────────────────────────────
  function openPopup() {
    popup.classList.add('open');
    triggerBtn.setAttribute('aria-expanded', 'true');
    renderCalendar();
  }

  function closePopup() {
    popup.classList.remove('open');
    monthOverlay.classList.remove('open');
    triggerBtn.setAttribute('aria-expanded', 'false');
  }

  function togglePopup() {
    popup.classList.contains('open') ? closePopup() : openPopup();
  }

  // ── Event listeners ───────────────────────────────────────
  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopup();
  });

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  monthBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showMonthOverlay();
  });

  yearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showYearOverlay();
  });

  overlayClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOverlay();
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) closePopup();
  });

  // Keyboard escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
  });

  // ── Initial render ────────────────────────────────────────
  updateDisplay();

  // ── Public API ────────────────────────────────────────────
  return {
    getValue() {
      return selectedDate ? formatDate(selectedDate) : '';
    },
    setValue(dateStr) {
      if (!dateStr) { selectedDate = null; updateDisplay(); return; }
      const d = new Date(dateStr + 'T00:00:00');
      if (!isNaN(d)) {
        selectedDate = d;
        viewYear  = d.getFullYear();
        viewMonth = d.getMonth();
        updateDisplay();
        if (popup.classList.contains('open')) renderCalendar();
      }
    },
    clear() { selectedDate = null; updateDisplay(); },
    destroy() { container.innerHTML = ''; container.classList.remove('datepicker-wrapper'); },
  };
};
