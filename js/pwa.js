// =========================================================================
// PWA — registrasi Service Worker + tombol Install App (E-Learniz v3)
// Pola identik OSIS TARPAN ONE: Aman di file:// & HTTP/HTTPS, auto-update rapi.
// =========================================================================
(function () {
  "use strict";

  var reloadSiap = false;

  function toast(msg, tipe) {
    if (window.ELearnizUI && typeof window.ELearnizUI.toast === "function") {
      window.ELearnizUI.toast(msg, tipe || "info");
    }
  }

  // ---- 1) Registrasi Service Worker ----
  function daftarSW() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return; // file:// tidak dukung SW
    var swUrl = "sw.js";
    var punyaControllerAwal = !!navigator.serviceWorker.controller;

    // Rem: reload otomatis maksimal 1x per 60 detik per tab
    function bolehMuatUlang() {
      try {
        var kunci = "pwa_last_reload";
        var terakhir = parseInt(sessionStorage.getItem(kunci) || "0", 10);
        if (Date.now() - terakhir < 60000) return false;
        sessionStorage.setItem(kunci, String(Date.now()));
        return true;
      } catch (e) {
        if (reloadSiap) return false;
        reloadSiap = true;
        return true;
      }
    }

    function mintaAktif(reg) {
      if (reg.waiting && navigator.serviceWorker.controller) {
        toast("Versi baru siap — memuat ulang…", "info");
        reg.waiting.postMessage("SKIP_WAITING");
      }
    }

    navigator.serviceWorker
      .register(swUrl)
      .then(function (reg) {
        mintaAktif(reg);
        reg.addEventListener("updatefound", function () {
          var baru = reg.installing;
          if (!baru) return;
          baru.addEventListener("statechange", function () {
            if (baru.state === "installed") mintaAktif(reg);
          });
        });
      })
      .catch(function () {});

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!punyaControllerAwal) {
        punyaControllerAwal = true;
        return;
      }
      if (!bolehMuatUlang()) return;
      location.reload();
    });
  }

  // ---- 2) Tombol Install App ----
  var promptTunda = null;

  function sudahStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  async function pasang() {
    if (typeof window.toggleProfileDropdown === "function") {
      window.toggleProfileDropdown(false);
    }
    if (!promptTunda) return false;
    try {
      promptTunda.prompt();
      await promptTunda.userChoice.catch(function () {});
    } catch (e) {}
    promptTunda = null;
    sembunyiTombol();
    return true;
  }

  function tampilTombol() {
    if (sudahStandalone()) return;
    var dropdownBtn = document.getElementById("dropdownInstallBtn");
    var loginBtn = document.getElementById("loginInstallBtn");
    if (dropdownBtn) dropdownBtn.style.display = "flex";
    if (loginBtn) loginBtn.style.display = "inline-flex";
  }

  function sembunyiTombol() {
    var dropdownBtn = document.getElementById("dropdownInstallBtn");
    var loginBtn = document.getElementById("loginInstallBtn");
    if (dropdownBtn) dropdownBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "none";
  }

  function pasangListenerTombol() {
    var dropdownBtn = document.getElementById("dropdownInstallBtn");
    if (dropdownBtn && !dropdownBtn._boundPwa) {
      dropdownBtn._boundPwa = true;
      dropdownBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var ios = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
        if (ios && !promptTunda) {
          toast("iPhone: ketuk Bagikan → Tambah ke Layar Utama", "info");
          return;
        }
        pasang();
      });
    }

    var loginBtn = document.getElementById("loginInstallBtn");
    if (loginBtn && !loginBtn._boundPwa) {
      loginBtn._boundPwa = true;
      loginBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var ios = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
        if (ios && !promptTunda) {
          toast("iPhone: ketuk Bagikan → Tambah ke Layar Utama", "info");
          return;
        }
        pasang();
      });
    }
  }

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  onReady(function () {
    daftarSW();
    pasangListenerTombol();
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    if (ios && !sudahStandalone()) {
      tampilTombol();
    }
  });

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    promptTunda = e;
    pasangListenerTombol();
    tampilTombol();
  });

  window.addEventListener("appinstalled", function () {
    promptTunda = null;
    sembunyiTombol();
    toast("Aplikasi berhasil terpasang! 🎉", "success");
  });

  window.PwaInstall = {
    pasang: pasang,
    tersedia: function () {
      if (sudahStandalone()) return false;
      return !!promptTunda || /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    }
  };
})();
