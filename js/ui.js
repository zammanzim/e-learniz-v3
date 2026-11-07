/**
 * js/ui.js — E-Learniz Universal UI System
 * Components:
 * 1. Universal Toast (Success, Error, Warning, Info)
 * 2. Universal Popup (Alert, Confirm, Custom Modals, Scroll-Lock, Fade In/Out, Esc/Enter/Back Navigation)
 * 3. Universal Dropdown (Custom Accessible Select Replacement with Keyboard Nav)
 */

(function () {
  'use strict';

  // State
  const activePopups = [];
  const dropdownInstances = new Map();
  let toastContainer = null;
  let isBackNavigating = false;

  /* ==========================================================================
     1. SCROLL LOCK CONTROLLER (No page jump, preserves scroll position)
     ========================================================================== */
  const ScrollLock = {
    lockCount: 0,
    savedScrollY: 0,

    lock() {
      if (this.lockCount === 0) {
        this.savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.savedScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      }
      this.lockCount++;
    },

    unlock() {
      this.lockCount = Math.max(0, this.lockCount - 1);
      if (this.lockCount === 0) {
        const y = this.savedScrollY;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, y);
      }
    }
  };

  /* ==========================================================================
     2. UNIVERSAL TOAST SYSTEM
     ========================================================================== */
  function ensureToastContainer() {
    if (!toastContainer || !document.body.contains(toastContainer)) {
      let existing = document.getElementById('universalToastContainer');
      if (!existing) {
        existing = document.createElement('div');
        existing.id = 'universalToastContainer';
        existing.className = 'universal-toast-container';
        existing.setAttribute('aria-live', 'polite');
        existing.setAttribute('aria-atomic', 'true');
        document.body.appendChild(existing);
      }
      toastContainer = existing;
    }
    return toastContainer;
  }

  const TOAST_ICONS = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-xmark',
    warning: 'fa-solid fa-triangle-exclamation',
    info: 'fa-solid fa-circle-info'
  };

  function showToast(message, type = 'info', duration = 3200) {
    const container = ensureToastContainer();
    const cleanType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

    const toast = document.createElement('div');
    toast.className = `u-toast u-toast-${cleanType}`;
    toast.innerHTML = `
      <div class="u-toast-icon">
        <i class="${TOAST_ICONS[cleanType]}"></i>
      </div>
      <div class="u-toast-msg">${escapeHtml(message)}</div>
    `;

    let timerId = null;

    const dismiss = () => {
      if (timerId) clearTimeout(timerId);
      if (toast.classList.contains('is-closing')) return;
      toast.classList.add('is-closing');
      toast.addEventListener('animationend', () => {
        toast.remove();
      }, { once: true });
      setTimeout(() => toast.remove(), 350); // Fallback
    };

    toast.addEventListener('click', dismiss);

    container.appendChild(toast);

    if (duration > 0) {
      timerId = setTimeout(dismiss, duration);
    }

    return { dismiss };
  }

  /* ==========================================================================
     2.5 UNIVERSAL TOP-RIGHT NOTIFICATION SYSTEM (Toast-like + Confirm Actions)
     ========================================================================== */
  let notifContainer = null;

  function ensureNotifContainer() {
    if (!notifContainer || !document.body.contains(notifContainer)) {
      let existing = document.getElementById('universalNotifContainer');
      if (!existing) {
        existing = document.createElement('div');
        existing.id = 'universalNotifContainer';
        existing.className = 'universal-notif-container';
        existing.setAttribute('aria-live', 'polite');
        existing.setAttribute('aria-atomic', 'true');
        document.body.appendChild(existing);
      }
      notifContainer = existing;
    }
    return notifContainer;
  }

  const NOTIF_ICONS = {
    info: 'fa-solid fa-bell',
    success: 'fa-solid fa-circle-check',
    warning: 'fa-solid fa-triangle-exclamation',
    error: 'fa-solid fa-circle-xmark',
    danger: 'fa-solid fa-triangle-exclamation'
  };

  const NOTIF_TITLES = {
    info: 'Pemberitahuan',
    success: 'Berhasil',
    warning: 'Peringatan',
    error: 'Terjadi Kesalahan',
    danger: 'Konfirmasi Tindakan'
  };

  /**
   * Show a notification in the top-right corner.
   * Supports auto-dismiss (like toast) or interactive actions/confirm (like popup confirm).
   */
  function showNotif(messageOrOptions, maybeOptions = {}) {
    const opts = typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, ...maybeOptions }
      : { ...messageOrOptions };

    const type = ['success', 'warning', 'error', 'danger', 'info'].includes(opts.type)
      ? opts.type
      : 'info';

    const title = opts.title || NOTIF_TITLES[type] || 'Pemberitahuan';
    const message = opts.message || '';
    const iconClass = opts.icon || NOTIF_ICONS[type] || NOTIF_ICONS.info;
    const duration = opts.duration !== undefined ? Number(opts.duration) : 4500;
    const actions = Array.isArray(opts.actions) ? opts.actions : [];
    const timeText = opts.time || '';

    const container = ensureNotifContainer();

    const notif = document.createElement('div');
    const notifId = `uNotif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    notif.id = notifId;
    notif.className = `u-notif u-notif-${type}${actions.length > 0 ? ' has-actions' : ''}`;
    notif.setAttribute('role', 'alert');

    // Build actions HTML
    let actionsHtml = '';
    if (actions.length > 0) {
      actionsHtml = `
        <div class="u-notif-actions">
          ${actions.map((act, idx) => `
            <button type="button" class="u-notif-btn ${act.class || (act.primary ? 'btn-primary' : 'btn-secondary')}" data-action-idx="${idx}">
              ${act.icon ? act.icon : ''}
              <span>${escapeHtml(act.text || 'Aksi')}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    const hasProgressBar = duration > 0;

    notif.innerHTML = `
      <div class="u-notif-glow"></div>
      <div class="u-notif-main">
        <div class="u-notif-badge ${type}">
          <i class="${iconClass}"></i>
        </div>
        <div class="u-notif-content">
          <div class="u-notif-header">
            <div class="u-notif-title">${escapeHtml(title)}</div>
            ${timeText ? `<span class="u-notif-time">${escapeHtml(timeText)}</span>` : ''}
          </div>
          <div class="u-notif-msg">${escapeHtml(message)}</div>
        </div>
        <button type="button" class="u-notif-close-btn" aria-label="Tutup notifikasi">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      ${actionsHtml}
      ${hasProgressBar ? `<div class="u-notif-progress"><div class="u-notif-progress-bar" style="animation-duration: ${duration}ms"></div></div>` : ''}
    `;

    let timerId = null;
    let remainingTime = duration;
    let timerStartTime = Date.now();
    let isClosed = false;

    const dismiss = () => {
      if (isClosed) return;
      isClosed = true;
      if (timerId) clearTimeout(timerId);

      notif.classList.add('is-closing');
      notif.addEventListener('animationend', () => {
        notif.remove();
      }, { once: true });
      setTimeout(() => notif.remove(), 350);

      if (typeof opts.onClose === 'function') {
        opts.onClose();
      }
    };

    // Close button click
    const closeBtn = notif.querySelector('.u-notif-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
    }

    // Action button listeners
    if (actions.length > 0) {
      const btnEls = notif.querySelectorAll('.u-notif-btn');
      btnEls.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = Number(btn.dataset.actionIdx);
          const act = actions[idx];
          let keepOpen = false;
          if (act && typeof act.onClick === 'function') {
            const res = act.onClick({ dismiss, notif, event: e });
            if (res === true) keepOpen = true;
          }
          if (!keepOpen) {
            dismiss();
          }
        });
      });
    }

    // Timer handling with Pause & Resume on hover
    const startTimer = (ms) => {
      if (ms <= 0) return;
      timerStartTime = Date.now();
      timerId = setTimeout(dismiss, ms);
    };

    if (hasProgressBar) {
      startTimer(duration);

      const progressBar = notif.querySelector('.u-notif-progress-bar');

      notif.addEventListener('mouseenter', () => {
        if (isClosed) return;
        if (timerId) clearTimeout(timerId);
        remainingTime -= (Date.now() - timerStartTime);
        if (remainingTime < 500) remainingTime = 500;
        if (progressBar) progressBar.style.animationPlayState = 'paused';
      });

      notif.addEventListener('mouseleave', () => {
        if (isClosed) return;
        if (progressBar) progressBar.style.animationPlayState = 'running';
        startTimer(remainingTime);
      });
    }

    container.appendChild(notif);

    return {
      id: notifId,
      dismiss,
      element: notif
    };
  }

  /**
   * Top-Right Notification with Confirm / Cancel buttons (Popup Confirm equivalent in notif format)
   * Returns a Promise resolving to true (confirmed) or false (cancelled / dismissed).
   */
  function confirmNotif(options = {}) {
    const {
      title = 'Konfirmasi Tindakan',
      message = 'Apakah kamu yakin ingin melanjutkan?',
      confirmText = 'Ya, Lanjutkan',
      cancelText = 'Batal',
      isDanger = false,
      type,
      duration = 0,
      onConfirm,
      onCancel
    } = typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        if (result && typeof onConfirm === 'function') onConfirm();
        if (!result && typeof onCancel === 'function') onCancel();
        resolve(result);
      };

      const finalType = type || (isDanger ? 'danger' : 'info');

      showNotif({
        title,
        message,
        type: finalType,
        duration,
        actions: [
          {
            text: cancelText,
            class: 'btn-secondary',
            onClick: () => {
              finish(false);
            }
          },
          {
            text: confirmText,
            class: isDanger ? 'btn-danger' : 'btn-primary',
            icon: isDanger ? '<i class="fa-solid fa-trash-can"></i> ' : '<i class="fa-solid fa-check"></i> ',
            onClick: () => {
              finish(true);
            }
          }
        ],
        onClose: () => {
          finish(false);
        }
      });
    });
  }

  function clearAllNotifs() {
    if (!notifContainer) return;
    const notifs = notifContainer.querySelectorAll('.u-notif');
    notifs.forEach((el) => {
      el.classList.add('is-closing');
      setTimeout(() => el.remove(), 250);
    });
  }

  const normalizeNotifOpts = (opts) => (typeof opts === 'string' ? { title: opts } : (opts || {}));

  /* ==========================================================================
     3. UNIVERSAL POPUP SYSTEM (Alert, Confirm, Modals, Esc, Enter, Back)
     ========================================================================== */
  // Pointer / Touch drag-to-dismiss gesture for bottom sheet modals
  function initBottomSheetGestures(modal) {
    if (modal.dataset.sheetGestureBound === 'true') return;
    const dialog = modal.querySelector('.modal-dialog');
    const handle = modal.querySelector('.modal-sheet-handle') || modal.querySelector('.sheet-drag-handle');
    if (!dialog || !handle) return;
    modal.dataset.sheetGestureBound = 'true';

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let activePointerId = null;

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      startY = e.clientY;
      currentY = startY;
      isDragging = true;
      activePointerId = e.pointerId;
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      dialog.style.transition = 'none';
      dialog.style.animation = 'none';
    });

    handle.addEventListener('pointermove', (e) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      currentY = e.clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        dialog.style.transform = `translate3d(0, ${deltaY}px, 0)`;
      } else {
        // Rubber-band resistance when dragging upwards
        dialog.style.transform = `translate3d(0, ${deltaY * 0.15}px, 0)`;
      }
    });

    const endDrag = (e) => {
      if (!isDragging || (e && e.pointerId !== activePointerId)) return;
      isDragging = false;
      try { if (activePointerId !== null) handle.releasePointerCapture(activePointerId); } catch (_) {}
      activePointerId = null;

      const deltaY = currentY - startY;
      if (deltaY > 80) {
        // Dragged down to dismiss: glide down smoothly and close without re-animation
        dialog.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
        dialog.style.transform = 'translate3d(0, 100%, 0)';
        modal.style.transition = 'opacity 0.22s ease';
        modal.style.opacity = '0';
        setTimeout(() => {
          closeModal(modal, { immediate: true });
        }, 220);
      } else {
        // Dragged up or not enough: spring back smoothly to resting position
        dialog.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
        dialog.style.transform = 'translate3d(0, 0, 0)';
        modal.style.transition = 'opacity 0.24s ease';
        modal.style.opacity = '1';
        setTimeout(() => {
          dialog.style.transition = '';
          modal.style.transition = '';
          modal.style.opacity = '';
          // Keep animation set to 'none' so CSS sheetSlideUp is NEVER restarted!
          dialog.style.animation = 'none';
        }, 240);
      }
    };

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  function openModal(modalOrId) {
    const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (!modal) return;

    if (modal.classList.contains('is-open')) return;

    modal.style.opacity = '';
    modal.style.transition = '';

    // Reset any inline drag transforms on dialog
    const dialog = modal.querySelector('.modal-dialog');
    if (dialog) {
      dialog.style.transform = '';
      dialog.style.transition = '';
      dialog.style.animation = '';
    }

    modal.classList.remove('is-closing');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    ScrollLock.lock();
    activePopups.push(modal);

    // Initialize bottom-sheet swipe gestures if applicable
    const isBottomSheet = modal.classList.contains('modal-bottom-sheet-backdrop') || modal.id === 'cardFormModal';
    if (isBottomSheet) {
      initBottomSheetGestures(modal);
      // Once the opening entrance animation finishes, lock animation to 'none'
      // to prevent accidental re-animations during touch interactions
      setTimeout(() => {
        if (modal.classList.contains('is-open') && !modal.classList.contains('is-closing') && dialog) {
          dialog.style.animation = 'none';
        }
      }, 350);
    }

    // Push history state for mobile back button
    try {
      history.pushState({ elearnizModalOpen: modal.id || 'anonymous_modal' }, '');
    } catch (_) {}

    // Focus first interactive element inside dialog
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      setTimeout(() => focusable.focus(), 60);
    }
  }

  function closeModal(modalOrId, options = {}) {
    const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (!modal || !modal.classList.contains('is-open')) return;

    // Remove from active stack
    const idx = activePopups.indexOf(modal);
    if (idx !== -1) {
      activePopups.splice(idx, 1);
    }

    // Immediate cleanup when gesture has already animated the element off-screen
    if (options.immediate) {
      modal.classList.remove('is-open', 'is-closing');
      modal.setAttribute('aria-hidden', 'true');
      ScrollLock.unlock();
      const dialog = modal.querySelector('.modal-dialog');
      if (dialog) {
        dialog.style.transform = '';
        dialog.style.transition = '';
        dialog.style.animation = '';
      }
      modal.style.transition = '';
      modal.style.opacity = '';
      if (modal.dataset.dynamicPopup === 'true') {
        modal.remove();
      }

      if (!options.fromPopState && history.state && history.state.elearnizModalOpen) {
        isBackNavigating = true;
        history.back();
        setTimeout(() => { isBackNavigating = false; }, 100);
      }
      return;
    }

    if (modal.classList.contains('is-closing')) return;
    modal.classList.add('is-closing');

    let hasCompleted = false;
    const onComplete = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      modal.classList.remove('is-open', 'is-closing');
      modal.setAttribute('aria-hidden', 'true');
      ScrollLock.unlock();
      const dialog = modal.querySelector('.modal-dialog');
      if (dialog) {
        dialog.style.transform = '';
        dialog.style.transition = '';
        dialog.style.animation = '';
      }
      modal.style.transition = '';
      modal.style.opacity = '';
      if (modal.dataset.dynamicPopup === 'true') {
        modal.remove();
      }
    };

    modal.addEventListener('animationend', onComplete, { once: true });
    setTimeout(onComplete, 240); // Matched with popUpFadeOut animation

    // Revert history state if closed manually and not via popstate
    if (!options.fromPopState && history.state && history.state.elearnizModalOpen) {
      isBackNavigating = true;
      history.back();
      setTimeout(() => { isBackNavigating = false; }, 100);
    }
  }

  function closeTopmostPopup() {
    // 1. Close any open custom dropdown first
    const openDropdown = document.querySelector('.u-dropdown.is-open');
    if (openDropdown) {
      closeDropdown(openDropdown);
      return true;
    }

    // 2. Close active popup
    if (activePopups.length > 0) {
      const top = activePopups[activePopups.length - 1];
      closeModal(top);
      return true;
    }
    return false;
  }

  // Handle mobile Back Button (popstate)
  window.addEventListener('popstate', (e) => {
    if (isBackNavigating) return;
    if (activePopups.length > 0) {
      const top = activePopups[activePopups.length - 1];
      closeModal(top, { fromPopState: true });
    }
  });

  // Handle Keyboard (Escape & Enter)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const closed = closeTopmostPopup();
      if (closed) {
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (e.key === 'Enter') {
      if (activePopups.length > 0) {
        const top = activePopups[activePopups.length - 1];
        // Only trigger confirm shortcut if not currently in a multiline textarea
        if (e.target && e.target.tagName === 'TEXTAREA') return;

        const confirmBtn = top.querySelector('[data-popup-confirm="true"]');
        if (confirmBtn && !confirmBtn.disabled) {
          e.preventDefault();
          confirmBtn.click();
        }
      }
    }
  });

  // Dynamic Informational Popup (Popup.alert)
  function alertPopup(options = {}) {
    const {
      title = 'Informasi',
      message = '',
      okText = 'Mengerti',
      type = 'info'
    } = typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      const dialogId = `uAlert_${Date.now()}`;
      const iconClass = TOAST_ICONS[type] || TOAST_ICONS.info;

      const modalEl = document.createElement('div');
      modalEl.id = dialogId;
      modalEl.className = 'modal-backdrop u-modal-center';
      modalEl.dataset.dynamicPopup = 'true';
      modalEl.innerHTML = `
        <div class="modal-dialog u-dialog-sm confirm-dialog" role="dialog" aria-modal="true">
          <div class="modal-header confirm-header">
            <div class="confirm-header-left">
              <div class="confirm-badge info"><i class="${iconClass}"></i></div>
              <h3>${escapeHtml(title)}</h3>
            </div>
            <button type="button" class="modal-close-btn" data-close="true" aria-label="Tutup">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body confirm-body">
            <p class="confirm-message">${escapeHtml(message)}</p>
          </div>
          <div class="modal-footer confirm-footer">
            <button type="button" class="btn-primary" data-ok="true">
              <i class="fa-solid fa-check"></i>
              <span>${escapeHtml(okText)}</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      const handleOk = () => {
        closeModal(modalEl);
        resolve();
      };

      modalEl.querySelector('[data-ok="true"]').addEventListener('click', handleOk);
      modalEl.querySelector('[data-close="true"]').addEventListener('click', () => {
        closeModal(modalEl);
        resolve();
      });

      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          closeModal(modalEl);
          resolve();
        }
      });

      openModal(modalEl);
    });
  }

  // Dynamic Confirmation Popup (Popup.confirm)
  function confirmPopup(options = {}) {
    const {
      title = 'Konfirmasi',
      message = 'Apakah kamu yakin ingin melanjutkan?',
      confirmText = 'Ya, Lanjutkan',
      cancelText = 'Batal',
      isDanger = false,
      onConfirm,
      onCancel
    } = typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      const dialogId = `uConfirm_${Date.now()}`;

      const modalEl = document.createElement('div');
      modalEl.id = dialogId;
      modalEl.className = 'modal-backdrop u-modal-center';
      modalEl.dataset.dynamicPopup = 'true';
      modalEl.innerHTML = `
        <div class="modal-dialog u-dialog-sm confirm-dialog ${isDanger ? 'is-danger-dialog' : ''}" role="dialog" aria-modal="true">
          <div class="modal-header confirm-header">
            <div class="confirm-header-left">
              ${isDanger
                ? '<div class="confirm-badge danger"><i class="fa-solid fa-triangle-exclamation"></i></div>'
                : '<div class="confirm-badge info"><i class="fa-solid fa-circle-question"></i></div>'}
              <h3>${escapeHtml(title)}</h3>
            </div>
            <button type="button" class="modal-close-btn" data-cancel="true" aria-label="Tutup">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body confirm-body">
            <p class="confirm-message">${escapeHtml(message)}</p>
          </div>
          <div class="modal-footer confirm-footer">
            <button type="button" class="btn-secondary" data-cancel="true">
              ${escapeHtml(cancelText)}
            </button>
            <button type="button" class="${isDanger ? 'btn-danger' : 'btn-primary'}" data-popup-confirm="true">
              ${isDanger ? '<i class="fa-solid fa-trash-can"></i>' : '<i class="fa-solid fa-check"></i>'}
              <span>${escapeHtml(confirmText)}</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      const handleConfirm = () => {
        closeModal(modalEl);
        if (typeof onConfirm === 'function') onConfirm();
        resolve(true);
      };

      const handleCancel = () => {
        closeModal(modalEl);
        if (typeof onCancel === 'function') onCancel();
        resolve(false);
      };

      modalEl.querySelector('[data-popup-confirm="true"]').addEventListener('click', handleConfirm);
      modalEl.querySelectorAll('[data-cancel="true"]').forEach((b) => b.addEventListener('click', handleCancel));

      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) handleCancel();
      });

      openModal(modalEl);
    });
  }

  // Delegated close listener for standard static modals
  document.addEventListener('click', (e) => {
    // Backdrop click
    if (e.target && e.target.classList.contains('modal-backdrop') && e.target.classList.contains('is-open')) {
      closeModal(e.target);
      return;
    }
    // Close button
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      const targetId = closeBtn.getAttribute('data-close-modal');
      closeModal(targetId);
    }
  });

  /* ==========================================================================
     4. UNIVERSAL DROPDOWN (Accessible custom select replacement)
     ========================================================================== */
  function closeDropdown(dropdownEl) {
    if (!dropdownEl || !dropdownEl.classList.contains('is-open')) return;
    if (dropdownEl.classList.contains('is-closing')) return;
    dropdownEl.classList.add('is-closing');
    const trigger = dropdownEl.querySelector('.u-dropdown-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      dropdownEl.classList.remove('is-open', 'is-closing');
    }, 180);
  }

  function openDropdown(dropdownEl) {
    // Close any other open dropdown first
    document.querySelectorAll('.u-dropdown.is-open').forEach((d) => {
      if (d !== dropdownEl) closeDropdown(d);
    });
    dropdownEl.classList.remove('is-closing');
    dropdownEl.classList.add('is-open');
    const trigger = dropdownEl.querySelector('.u-dropdown-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    // Scroll active item into view
    const activeItem = dropdownEl.querySelector('.u-dropdown-option.is-selected');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }

  function enhanceSelect(nativeSelect, onChangeCallback) {
    if (!nativeSelect) return null;
    if (dropdownInstances.has(nativeSelect)) {
      // Re-sync options if already enhanced
      const existing = dropdownInstances.get(nativeSelect);
      existing.sync();
      return existing;
    }

    // Hide native select visually but keep in DOM for forms
    nativeSelect.style.position = 'absolute';
    nativeSelect.style.opacity = '0';
    nativeSelect.style.pointerEvents = 'none';
    nativeSelect.style.width = '1px';
    nativeSelect.style.height = '1px';
    nativeSelect.tabIndex = -1;

    const dropdown = document.createElement('div');
    dropdown.className = 'u-dropdown';
    if (nativeSelect.disabled) dropdown.classList.add('is-disabled');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'u-dropdown-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'u-dropdown-label';
    const triggerArrow = document.createElement('i');
    triggerArrow.className = 'fa-solid fa-chevron-down u-dropdown-arrow';

    trigger.appendChild(triggerLabel);
    trigger.appendChild(triggerArrow);
    dropdown.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'u-dropdown-menu';
    menu.setAttribute('role', 'listbox');
    dropdown.appendChild(menu);

    nativeSelect.parentNode.insertBefore(dropdown, nativeSelect.nextSibling);

    const syncOptions = () => {
      menu.innerHTML = '';
      const options = Array.from(nativeSelect.options);
      const selectedIndex = nativeSelect.selectedIndex;
      const selectedOpt = nativeSelect.options[selectedIndex];

      triggerLabel.textContent = selectedOpt ? selectedOpt.textContent : (nativeSelect.getAttribute('placeholder') || 'Pilih...');

      options.forEach((opt, idx) => {
        const item = document.createElement('div');
        item.className = 'u-dropdown-option';
        item.setAttribute('role', 'option');
        item.setAttribute('data-value', opt.value);
        item.setAttribute('data-index', String(idx));

        const isSelected = idx === selectedIndex;
        if (isSelected) {
          item.classList.add('is-selected');
          item.setAttribute('aria-selected', 'true');
        }

        item.innerHTML = `
          <span class="u-dropdown-opt-text">${escapeHtml(opt.textContent)}</span>
          <i class="fa-solid fa-check u-dropdown-check"></i>
        `;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          selectIndex(idx);
          closeDropdown(dropdown);
          trigger.focus();
        });

        menu.appendChild(item);
      });
    };

    const selectIndex = (idx) => {
      if (idx < 0 || idx >= nativeSelect.options.length) return;
      nativeSelect.selectedIndex = idx;
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      syncOptions();
      if (typeof onChangeCallback === 'function') {
        onChangeCallback(nativeSelect.value, nativeSelect.options[idx]);
      }
    };

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (nativeSelect.disabled) return;
      if (dropdown.classList.contains('is-open')) {
        closeDropdown(dropdown);
      } else {
        openDropdown(dropdown);
      }
    });

    // Keyboard navigation
    trigger.addEventListener('keydown', (e) => {
      if (nativeSelect.disabled) return;
      const isOpen = dropdown.classList.contains('is-open');

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          openDropdown(dropdown);
          return;
        }
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const newIndex = Math.min(Math.max(nativeSelect.selectedIndex + delta, 0), nativeSelect.options.length - 1);
        selectIndex(newIndex);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isOpen) {
          closeDropdown(dropdown);
        } else {
          openDropdown(dropdown);
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeDropdown(dropdown);
      }
    });

    // Native change listener (if changed externally via JS)
    nativeSelect.addEventListener('change', () => {
      syncOptions();
    });

    syncOptions();

    const instance = {
      dropdown,
      sync: syncOptions,
      destroy: () => {
        dropdown.remove();
        nativeSelect.style.position = '';
        nativeSelect.style.opacity = '';
        nativeSelect.style.pointerEvents = '';
        nativeSelect.style.width = '';
        nativeSelect.style.height = '';
        nativeSelect.tabIndex = 0;
        dropdownInstances.delete(nativeSelect);
      }
    };

    dropdownInstances.set(nativeSelect, instance);
    return instance;
  }

  // Global click outside to close dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.u-dropdown')) {
      document.querySelectorAll('.u-dropdown.is-open').forEach(closeDropdown);
    }
  });

  /* ==========================================================================
     HELPERS
     ========================================================================== */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Warna aksen dari DB hanya boleh hex; selain itu pakai fallback.
  // Mencegah injeksi CSS lewat atribut style.
  function safeColor(value, fallback = '#2563eb') {
    const s = String(value || '').trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : fallback;
  }

  // Public API
  window.ELearnizUI = {
    escapeHtml,
    safeColor,
    toast: showToast,
    notif: {
      show: showNotif,
      info: (msg, opts) => showNotif(msg, { ...normalizeNotifOpts(opts), type: 'info' }),
      success: (msg, opts) => showNotif(msg, { ...normalizeNotifOpts(opts), type: 'success' }),
      warning: (msg, opts) => showNotif(msg, { ...normalizeNotifOpts(opts), type: 'warning' }),
      error: (msg, opts) => showNotif(msg, { ...normalizeNotifOpts(opts), type: 'error' }),
      danger: (msg, opts) => showNotif(msg, { ...normalizeNotifOpts(opts), type: 'danger' }),
      confirm: confirmNotif,
      clearAll: clearAllNotifs
    },
    popup: {
      open: openModal,
      close: closeModal,
      alert: alertPopup,
      confirm: confirmPopup
    },
    dropdown: {
      enhanceSelect,
      closeAll: () => document.querySelectorAll('.u-dropdown.is-open').forEach(closeDropdown)
    },
    ScrollLock
  };

  // Helper shortcuts for compatibility
  window.showToast = (msg, type = 'info', duration) => showToast(msg, type, duration);
  window.showPopup = (msg, type = 'info') => alertPopup({ message: msg, type });
  window.showNotif = (msg, opts) => showNotif(msg, opts);
  window.confirmNotif = (opts) => confirmNotif(opts);
})();
