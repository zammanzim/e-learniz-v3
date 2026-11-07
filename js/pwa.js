/* ==========================================================================
   js/pwa.js — E-Learniz v3 PWA Controller
   - Registrasi Service Worker (sw.js)
   - Sinkronisasi warna status bar (<meta name="theme-color">) dengan tema Light/Dark
   - Tombol Install Aplikasi (beforeinstallprompt + panduan iOS Safari)
   - Deteksi status koneksi Offline / Online
   ========================================================================== */
(function () {
  'use strict';

  let deferredPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    const ua = window.navigator.userAgent || '';
    const iOSDevice = /iPad|iPhone|iPod/.test(ua);
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return (iOSDevice || iPadOS) && !window.MSStream;
  }

  function notify(msg, type = 'info') {
    if (window.ELearnizUI && typeof window.ELearnizUI.toast === 'function') {
      window.ELearnizUI.toast(msg, type);
    }
  }

  /* ------------------------------------------------------------------------
     1. SINKRONISASI META THEME-COLOR (Light: #ffffff, Dark: #121826)
     ------------------------------------------------------------------------ */
  function syncThemeColor() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const color = isDark ? '#121826' : '#ffffff';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  }

  function observeThemeChanges() {
    syncThemeColor();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          syncThemeColor();
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  /* ------------------------------------------------------------------------
     2. TOMBOL INSTALL APLIKASI (Dropdown Profil & Halaman Login)
     ------------------------------------------------------------------------ */
  function updateInstallButtonsVisibility() {
    const canInstall = !isStandalone() && (Boolean(deferredPrompt) || isIOS());
    const dropdownBtn = document.getElementById('dropdownInstallBtn');
    const loginBtn = document.getElementById('loginInstallBtn');

    if (dropdownBtn) {
      dropdownBtn.style.display = canInstall ? 'flex' : 'none';
    }
    if (loginBtn) {
      loginBtn.style.display = canInstall ? 'inline-flex' : 'none';
    }
  }

  async function triggerInstallPrompt(e) {
    if (e) e.preventDefault();

    if (typeof window.toggleProfileDropdown === 'function') {
      window.toggleProfileDropdown(false);
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          notify('E-Learniz sedang ditambahkan ke perangkat kamu! 🎉', 'success');
          deferredPrompt = null;
        }
      } catch (_) {}
      updateInstallButtonsVisibility();
      return;
    }

    if (isIOS() && !isStandalone()) {
      if (window.ELearnizUI && typeof window.ELearnizUI.alert === 'function') {
        window.ELearnizUI.alert({
          title: 'Install E-Learniz di iOS',
          message: 'Ketuk ikon Share (Bagikan) di bilah bawah Safari, lalu pilih "Tambah ke Layar Utama" (Add to Home Screen).',
          type: 'info',
          confirmText: 'Mengerti'
        });
      } else {
        alert('Untuk menginstal di iPhone/iPad:\nKetuk ikon Share (Bagikan) di browser lalu pilih "Tambah ke Layar Utama" (Add to Home Screen).');
      }
    }
  }

  function bindInstallEvents() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      updateInstallButtonsVisibility();
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      updateInstallButtonsVisibility();
      notify('Aplikasi E-Learniz berhasil terpasang! 🚀', 'success');
    });

    const dropdownBtn = document.getElementById('dropdownInstallBtn');
    if (dropdownBtn && !dropdownBtn._pwaBound) {
      dropdownBtn._pwaBound = true;
      dropdownBtn.addEventListener('click', triggerInstallPrompt);
    }

    const loginBtn = document.getElementById('loginInstallBtn');
    if (loginBtn && !loginBtn._pwaBound) {
      loginBtn._pwaBound = true;
      loginBtn.addEventListener('click', triggerInstallPrompt);
    }

    updateInstallButtonsVisibility();
  }

  /* ------------------------------------------------------------------------
     3. DETEKSI KONEKSI OFFLINE / ONLINE
     ------------------------------------------------------------------------ */
  function bindConnectivityEvents() {
    window.addEventListener('offline', () => {
      notify('Kamu sedang offline — menampilkan data terakhir yang tersimpan 📡', 'warning');
    });

    window.addEventListener('online', () => {
      notify('Koneksi kembali terhubung 🌐', 'success');
    });
  }

  /* ------------------------------------------------------------------------
     4. REGISTRASI SERVICE WORKER
     ------------------------------------------------------------------------ */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js', { scope: './' })
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch((err) => {
          console.warn('Registrasi Service Worker gagal:', err);
        });
    });
  }

  // Inisialisasi
  observeThemeChanges();
  bindConnectivityEvents();
  registerServiceWorker();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindInstallEvents);
  } else {
    bindInstallEvents();
  }

  window.ELearnizPWA = {
    isStandalone,
    triggerInstallPrompt,
    syncThemeColor
  };
})();
