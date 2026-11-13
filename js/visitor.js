/* ==========================================================================
   js/visitor.js — Visitor Counter & Today's Visitor List
   Parity dengan e-learniz-v2:
   - tab kelas
   - status online (Supabase Realtime Presence)
   - avatar, role, halaman terakhir, waktu kunjungan
   - detail perangkat yang bisa dibuka/tutup
   - realtime update tabel v3.visitors
   - auto reset 15:00 WIB + tombol bersihkan (staff)

   Sumber data:
   - Pengguna login : tabel v3.visitors (1 baris per user, upsert by user_id)
   - Tamu          : localStorage (tidak punya user_id)
   - Jika DB/RLS sedang bermasalah, daftar lokal tetap ditampilkan.

   Semua waktu ditampilkan dalam WIB.
   ========================================================================== */
(function () {
  'use strict';

  const AUTO_RESET_KEY = 'elearniz_v3_visitor_auto_reset';
  const AUTO_RESET_DATE_KEY = 'elearniz_v3_visitor_auto_reset_date';
  const AUTO_RESET_HOUR = 15;
  const POLL_INTERVAL_MS = 20000;

  let cachedVisitors = [];
  let classes = [];
  let activeClassId = null;
  let activeUser = null;
  let selectedClassId = null;

  let onlineUsers = new Map();
  let presenceChannel = null;
  let visitorsChannel = null;
  let visitorsChannelClass = null;

  let modalOpen = false;
  let modalObserver = null;
  let pollTimer = null;
  let autoResetTimer = null;
  let refreshTimer = null;
  let routeHandlerBound = false;
  let expandedVisitorKeys = new Set();

  /* ------------------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------------------ */
  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function t(key, fallback) {
    if (window.ELearnizI18n && typeof window.ELearnizI18n.t === 'function') {
      return window.ELearnizI18n.t(key, fallback);
    }
    return fallback !== undefined ? fallback : key;
  }

  function roleLabel(role) {
    const value = String(role || '').toLowerCase();
    if (value === 'super_admin' || value === 'superadmin') return 'Super Admin';
    if (value === 'class_admin' || value === 'admin') return t('user_role_admin', 'Admin Kelas');
    if (value === 'teacher' || value === 'guru' || value === 'staff') return t('subj_default_teacher', 'Guru / Staf');
    if (value === 'student') return t('user_role_student', 'Siswa');
    return t('header_guest_name', 'Tamu');
  }

  function roleClass(role) {
    const value = String(role || '').toLowerCase();
    if (value === 'super_admin' || value === 'superadmin') return 'is-super';
    if (value === 'class_admin' || value === 'admin') return 'is-admin';
    if (value === 'teacher' || value === 'guru' || value === 'staff') return 'is-teacher';
    if (value === 'guest') return 'is-guest';
    return 'is-student';
  }

  function isStaffUser(user) {
    const role = String((user && user.role) || '').toLowerCase();
    return ['super_admin', 'superadmin', 'class_admin', 'admin', 'teacher', 'guru', 'staff'].includes(role);
  }

  function toast(message, type) {
    if (window.ELearnizUI && typeof window.ELearnizUI.toast === 'function') {
      window.ELearnizUI.toast(message, type || 'info');
    }
  }

  function getClient() {
    return window.ELearnizDB && window.ELearnizDB.getClient
      ? window.ELearnizDB.getClient()
      : null;
  }

  function pageNameFromHash() {
    const raw = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
    const parts = raw.split('/').filter(Boolean);
    const route = parts[0] ? parts[0].toLowerCase() : 'home';

    if (route === 'tugas') return 'Daftar Tugas';
    if (route === 'materi' || route === 'material' || route === 'materials') return 'Materi Pelajaran';
    if (route === 'mapel') {
      if (!parts[1]) return 'Daftar Mata Pelajaran';
      const nameEl = document.getElementById('subjectName');
      const name = nameEl ? String(nameEl.textContent || '').trim() : '';
      return name ? `Mapel: ${name}` : 'Mata Pelajaran';
    }
    return 'Beranda';
  }

  function formatTime(value) {
    const T = window.ELearnizTime;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    if (T && typeof T.formatDate === 'function') {
      return T.formatDate(d, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateShort(value) {
    const T = window.ELearnizTime;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    if (T && typeof T.formatDate === 'function') {
      return T.formatDate(d, { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function formatVisitedAt(value) {
    if (!value) return 'Hari ini';
    const T = window.ELearnizTime;
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'Hari ini';

    const time = formatTime(d);
    const todayKey = T && typeof T.dateKey === 'function'
      ? T.dateKey(new Date())
      : new Date().toISOString().slice(0, 10);
    const dayKey = T && typeof T.dateKey === 'function'
      ? T.dateKey(d)
      : d.toISOString().slice(0, 10);

    if (todayKey === dayKey) return `Hari ini • ${time}`;
    return `${formatDateShort(d)} • ${time}`;
  }

  function deviceDetailHtml(v) {
    const lines = [];
    const device = [v.device_type, v.platform].filter(Boolean).join(' • ');
    if (device) lines.push(`<span><i class="fa-solid fa-display"></i> ${esc(device)}</span>`);
    if (v.screen_resolution) lines.push(`<span><i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${esc(v.screen_resolution)}</span>`);
    if (v.browser_language) lines.push(`<span><i class="fa-solid fa-language"></i> ${esc(v.browser_language)}</span>`);
    if (v.user_agent) lines.push(`<span><i class="fa-solid fa-code"></i> ${esc(v.user_agent)}</span>`);
    return lines.length ? lines.join('') : '';
  }

  function getOrGenerateGuestId() {
    if (window.ELearnizDB && typeof window.ELearnizDB.getGuestId === 'function') {
      return window.ELearnizDB.getGuestId();
    }
    try {
      let gid = localStorage.getItem('elearniz_v3_guest_id');
      if (!gid) {
        gid = 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem('elearniz_v3_guest_id', gid);
      }
      return gid;
    } catch (_) {
      return 'g_' + Date.now().toString(36);
    }
  }

  function getLocalGuestName() {
    try {
      return localStorage.getItem('elearniz_v3_guest_name') || 'Tamu';
    } catch (_) {
      return 'Tamu';
    }
  }

  function visitorKey(v) {
    if (!v) return '';
    if (v.visitor_key) return v.visitor_key;
    if (v.user_id) return `u:${v.user_id}`;
    if (v.guest_id) return `g:${v.guest_id}`;
    const name = String(v.display_name || '').trim();
    return name ? `n:${name.toLowerCase()}` : '';
  }

  function isUserOnline(v) {
    if (!v) return false;
    const key = visitorKey(v);
    if (key && onlineUsers.has(key)) return true;
    if (v.user_id && (onlineUsers.has(String(v.user_id)) || onlineUsers.has(`u:${v.user_id}`))) return true;
    if (v.guest_id && onlineUsers.has(`g:${v.guest_id}`)) return true;
    return false;
  }

  /* ------------------------------------------------------------------------
     BADGE & LIST
     ------------------------------------------------------------------------ */
  function updateBadge(count) {
    const badge = document.getElementById('visitorCount');
    if (badge) badge.textContent = String(Number(count) || 0);
  }

  function updateModalCount(count) {
    const el = document.getElementById('visitorModalCount');
    if (el) el.textContent = String(Number(count) || 0);
  }

  async function refreshBadge() {
    if (!activeClassId) {
      updateBadge(0);
      return;
    }

    let count = 0;
    try {
      // Saat modal terbuka pada kelas aktif, pakai cache daftar yang baru direfresh.
      // Saat modal tertutup, baca count DB (atau fallback ke cache jika ada).
      if (modalOpen &&
          Number(selectedClassId) === Number(activeClassId) &&
          cachedVisitors.length > 0) {
        count = cachedVisitors.length;
      } else {
        count = await window.ELearnizDB.countVisitors(activeClassId);
        if (count === 0 && cachedVisitors.length > 0) {
          count = cachedVisitors.length;
        }
      }
      updateBadge(count);
      if (!modalOpen) updateModalCount(count);
    } catch (err) {
      console.warn('refreshBadge error:', err);
    }
  }

  async function refreshVisitors() {
    const target = selectedClassId || activeClassId;
    if (!target) {
      cachedVisitors = [];
      return;
    }
    try {
      cachedVisitors = await window.ELearnizDB.listVisitors(target);
    } catch (err) {
      console.warn('refreshVisitors error:', err);
      cachedVisitors = [];
    }
    if (modalOpen) {
      renderVisitorBody(document.getElementById('visitorModalBody'));
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(async () => {
      refreshTimer = null;
      await refreshVisitors();
      await refreshBadge();
    }, 450);
  }

  /* ------------------------------------------------------------------------
     REALTIME — VISITORS TABLE
     ------------------------------------------------------------------------ */
  function cleanupVisitorsChannel() {
    if (visitorsChannel) {
      try { visitorsChannel.unsubscribe(); } catch (_) {}
      visitorsChannel = null;
    }
    visitorsChannelClass = null;
  }

  function setupVisitorsChannel() {
    const target = selectedClassId || activeClassId;
    if (!target) return;
    if (visitorsChannel && Number(visitorsChannelClass) === Number(target)) return;

    cleanupVisitorsChannel();

    const client = getClient();
    if (!client || typeof client.channel !== 'function') return;

    visitorsChannelClass = target;
    visitorsChannel = client.channel(`v3-visitors-${target}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'v3',
        table: 'visitors',
        filter: `class_id=eq.${Number(target)}`
      }, () => scheduleRefresh())
      .subscribe();
  }

  /* ------------------------------------------------------------------------
     REALTIME — PRESENCE (ONLINE)
     ------------------------------------------------------------------------ */
  function cleanupPresence() {
    if (presenceChannel) {
      try { presenceChannel.unsubscribe(); } catch (_) {}
      presenceChannel = null;
    }
    onlineUsers = new Map();
  }

  function rebuildOnlineUsers() {
    onlineUsers = new Map();
    if (presenceChannel && typeof presenceChannel.presenceState === 'function') {
      const state = presenceChannel.presenceState() || {};
      Object.keys(state).forEach((key) => {
        (state[key] || []).forEach((meta) => {
          if (!meta) return;
          const k = String(meta.id || key);
          onlineUsers.set(k, {
            id: k,
            user_id: meta.user_id || null,
            guest_id: meta.guest_id || null,
            display_name: meta.nickname || (meta.role === 'guest' ? 'Tamu' : 'Pengguna'),
            nickname: meta.nickname || '',
            role: meta.role || (meta.guest_id ? 'guest' : 'student'),
            class_id: meta.class_id,
            avatar_url: meta.avatar_url || '',
            online_at: meta.online_at || ''
          });
        });
      });
    }
    if (modalOpen) renderVisitorBody(document.getElementById('visitorModalBody'));
  }

  function setupPresence() {
    cleanupPresence();
    const client = getClient();
    if (!client || typeof client.channel !== 'function') return;

    const guestId = activeUser ? null : getOrGenerateGuestId();
    const key = activeUser && activeUser.id
      ? `u:${activeUser.id}`
      : `g:${guestId}`;

    const nickname = activeUser
      ? (activeUser.display_name || activeUser.full_name || activeUser.nickname || 'Pengguna')
      : getLocalGuestName();

    const role = activeUser ? (activeUser.role || 'student') : 'guest';
    const classId = activeClassId || (activeUser ? activeUser.class_id : null);

    presenceChannel = client.channel('elearniz-v3-online', {
      config: { presence: { key } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, rebuildOnlineUsers)
      .on('presence', { event: 'join' }, rebuildOnlineUsers)
      .on('presence', { event: 'leave' }, rebuildOnlineUsers)
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || !presenceChannel) return;
        try {
          await presenceChannel.track({
            id: key,
            user_id: activeUser ? activeUser.id : null,
            guest_id: guestId,
            nickname,
            role,
            class_id: classId,
            avatar_url: activeUser ? (activeUser.avatar_url || '') : '',
            online_at: new Date().toISOString()
          });
        } catch (_) {}
      });
  }

  /* ------------------------------------------------------------------------
     LOG KUNJUNGAN
     ------------------------------------------------------------------------ */
  async function logCurrentVisit() {
    if (!activeClassId) return;
    try {
      let prevGuestId = null;
      try {
        prevGuestId = localStorage.getItem('elearniz_v3_guest_id');
      } catch (_) {}
      const guestId = activeUser ? prevGuestId : getOrGenerateGuestId();
      const guestName = activeUser ? null : getLocalGuestName();
      const res = await window.ELearnizDB.logVisit(activeClassId, {
        userId: activeUser ? activeUser.id : null,
        guestId,
        displayName: activeUser
          ? (activeUser.display_name || activeUser.full_name || activeUser.username || 'Pengguna')
          : (guestName !== 'Tamu' ? guestName : null),
        role: activeUser ? (activeUser.role || 'student') : 'guest',
        lastPage: pageNameFromHash()
      });
      if (res && res.display_name && !activeUser) {
        try {
          localStorage.setItem('elearniz_v3_guest_name', res.display_name);
        } catch (_) {}
      }
    } catch (err) {
      // Data lokal sudah tersimpan di logVisit; DB bisa dicoba lagi nanti.
      console.warn('logVisit error:', err);
    }
  }

  function onRouteChange() {
    logCurrentVisit();
  }

  function bindRouteLogging() {
    if (routeHandlerBound) return;
    routeHandlerBound = true;
    window.addEventListener('hashchange', onRouteChange);

    // Shortcut parity v2: Ctrl+Q buka/tutup popup pengunjung.
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || String(e.key || '').toLowerCase() !== 'q') return;
      e.preventDefault();
      const modal = document.getElementById('visitorModal');
      if (modal && modal.classList.contains('is-open')) {
        if (window.ELearnizUI && window.ELearnizUI.popup) {
          window.ELearnizUI.popup.close(modal);
        } else {
          modal.classList.remove('is-open');
        }
      } else {
        openVisitorModal();
      }
    });
  }

  /* ------------------------------------------------------------------------
     AUTO RESET 15:00 WIB
     ------------------------------------------------------------------------ */
  function isAutoResetOn() {
    try {
      return localStorage.getItem(AUTO_RESET_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function stopAutoResetWatcher() {
    if (autoResetTimer) {
      clearInterval(autoResetTimer);
      autoResetTimer = null;
    }
  }

  async function checkAutoReset() {
    if (!isAutoResetOn() || !isStaffUser(activeUser)) return;

    const T = window.ELearnizTime;
    const now = new Date();
    const parts = T && T.getParts ? T.getParts(now) : {
      hour: now.getHours(),
      minute: now.getMinutes()
    };
    const today = T && T.dateKey ? T.dateKey(now) : now.toISOString().slice(0, 10);

    if ((Number(parts.hour) * 60 + Number(parts.minute)) < AUTO_RESET_HOUR * 60) return;

    let lastReset = '';
    try { lastReset = localStorage.getItem(AUTO_RESET_DATE_KEY) || ''; } catch (_) {}
    if (lastReset === today) return;

    try {
      await window.ELearnizDB.clearVisitors();
      try { localStorage.setItem(AUTO_RESET_DATE_KEY, today); } catch (_) {}
      await refreshVisitors();
      await refreshBadge();
      toast('Daftar pengunjung direset otomatis (15:00 WIB).', 'info');
    } catch (err) {
      console.warn('auto reset visitor error:', err);
    }
  }

  function startAutoResetWatcher() {
    stopAutoResetWatcher();
    if (!isAutoResetOn() || !isStaffUser(activeUser)) return;
    checkAutoReset();
    autoResetTimer = setInterval(checkAutoReset, 60000);
  }

  function setAutoReset(on) {
    try { localStorage.setItem(AUTO_RESET_KEY, on ? 'true' : 'false'); } catch (_) {}
    if (on) startAutoResetWatcher();
    else stopAutoResetWatcher();
  }

  /* ------------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------------ */
  function skeletonHtml() {
    return `
      <div class="visitor-skeleton" role="status" aria-label="${esc(t('visitor_loading', 'Memuat pengunjung...'))}">
        ${[0, 1, 2, 3].map(() => `
          <div class="visitor-skeleton-item">
            <span class="sk sk-circle" style="width:34px;height:34px;flex-shrink:0;"></span>
            <span style="flex:1;display:flex;flex-direction:column;gap:6px;">
              <span class="sk" style="width:55%;height:12px;"></span>
              <span class="sk" style="width:35%;height:10px;"></span>
            </span>
          </div>`).join('')}
      </div>`;
  }

  function mergedVisitorList(target) {
    const list = [];
    const seen = new Set();

    cachedVisitors.forEach((v) => {
      const key = visitorKey(v);
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push(v);
    });

    // Presence hanya untuk status online (dot); baris pengunjung berasal dari DB / localStorage.
    list.sort((a, b) => new Date(b.visited_at || 0) - new Date(a.visited_at || 0));
    return list;
  }

  function onlineCountFor(target) {
    let count = 0;
    onlineUsers.forEach((u) => {
      if (target && u.class_id && Number(u.class_id) !== Number(target)) return;
      count += 1;
    });
    return count;
  }

  function visitorItemHtml(v) {
    const name = String(v.display_name || 'Tamu');
    const initial = name.charAt(0).toUpperCase() || '?';
    const avatar = v.avatar_url
      ? (window.ELearnizDB.mediaUrl ? window.ELearnizDB.mediaUrl(v.avatar_url) : v.avatar_url)
      : '';
    const online = isUserOnline(v);
    const detail = deviceDetailHtml(v);
    const hasDevice = Boolean(detail);
    const key = visitorKey(v);
    const expanded = expandedVisitorKeys.has(key);

    return `
      <div class="visitor-item${hasDevice ? ' has-device' : ''}${expanded ? ' expanded' : ''}" data-visitor-key="${esc(key)}">
        <div class="visitor-avatar-wrap">
          <div class="visitor-avatar"${avatar ? ` style="background-image:url('${esc(avatar)}');"` : ''}>${avatar ? '' : esc(initial)}</div>
          ${online ? '<span class="visitor-online-dot visitor-online-dot--avatar" title="Online"></span>' : ''}
        </div>
        <div class="visitor-main">
          <div class="visitor-top">
            <span class="visitor-name">${esc(name)}</span>
            <span class="visitor-role ${roleClass(v.role)}">${esc(roleLabel(v.role))}</span>
          </div>
          <div class="visitor-sub">
            <span class="visitor-page"><i class="fa-solid fa-location-dot"></i> ${esc(v.last_page || 'Muter-muter')}</span>
            <span class="visitor-time">${esc(formatVisitedAt(v.visited_at))}</span>
          </div>
          ${hasDevice ? `<div class="visitor-device-detail">${detail}</div>` : ''}
        </div>
        ${hasDevice ? '<i class="fa-solid fa-chevron-down visitor-chevron"></i>' : ''}
      </div>`;
  }

  function tabsHtml(target) {
    if (!classes || classes.length < 2) return '';
    return `
      <div class="visitor-tabs" role="tablist" aria-label="Pilih kelas">
        ${classes.map((c) => `
          <button type="button" role="tab"
            class="visitor-tab${Number(c.id) === Number(target) ? ' active' : ''}"
            aria-selected="${Number(c.id) === Number(target) ? 'true' : 'false'}"
            data-visitor-class="${esc(c.id)}">${esc(c.name || 'Kelas')}</button>`).join('')}
      </div>`;
  }

  function adminBarHtml() {
    if (!isStaffUser(activeUser)) return '';
    const checked = isAutoResetOn() ? ' checked' : '';
    return `
      <div class="visitor-admin-bar">
        <label class="visitor-auto-reset">
          <input type="checkbox" id="visitorAutoReset"${checked}>
          <span>Auto reset 15:00</span>
        </label>
        <button type="button" class="visitor-reset-btn" id="visitorResetBtn">
          <i class="fa-solid fa-rotate-right"></i> ${esc(t('visitor_reset_btn', 'Bersihkan'))}
        </button>
      </div>`;
  }

  function renderVisitorBody(modalBody) {
    if (!modalBody) return;

    const target = Number(selectedClassId || activeClassId) || null;
    const list = mergedVisitorList(target);
    const onlineCount = onlineCountFor(target);

    updateModalCount(list.length);

    const listHtml = list.length
      ? list.map(visitorItemHtml).join('')
      : `
        <div class="visitor-empty">
          <i class="fa-solid fa-users"></i>
          <h4>${esc(t('visitor_empty', 'Belum Ada Pengunjung'))}</h4>
          <p>${esc(t('visitor_empty_desc', 'Daftar pengunjung kelas ini akan tampil di sini.'))}</p>
        </div>`;

    const prevList = modalBody.querySelector('.visitor-list');
    const prevScrollTop = prevList ? prevList.scrollTop : 0;

    modalBody.innerHTML = `
      ${tabsHtml(target)}
      <div class="visitor-summary">
        <div class="visitor-summary-main">
          <strong>${list.length}</strong>
          <span>${esc(t('visitor_unit', 'pengunjung'))}</span>
        </div>
        <div class="visitor-online-pill">
          <span class="visitor-online-dot"></span>
          <span><strong>${onlineCount}</strong> online</span>
        </div>
      </div>
      <div class="visitor-section-title">
        <span><i class="fa-solid fa-clock-rotate-left"></i> ${esc(t('visitor_recent_title', 'Pengunjung Terakhir'))}</span>
      </div>
      <div class="visitor-list">${listHtml}</div>
      ${adminBarHtml()}
    `;

    const nextList = modalBody.querySelector('.visitor-list');
    if (nextList && prevScrollTop) nextList.scrollTop = prevScrollTop;

    bindBodyInteractions(modalBody);
  }

  /* ------------------------------------------------------------------------
     INTERAKSI MODAL
     ------------------------------------------------------------------------ */
  function bindBodyInteractions(body) {
    if (!body) return;

    body.onclick = (e) => {
      const tab = e.target.closest('[data-visitor-class]');
      if (tab) {
        e.preventDefault();
        switchVisitorClass(tab.getAttribute('data-visitor-class'));
        return;
      }

      const resetBtn = e.target.closest('#visitorResetBtn');
      if (resetBtn) {
        e.preventDefault();
        handleReset(resetBtn);
        return;
      }

      const item = e.target.closest('.visitor-item.has-device');
      if (item) {
        const key = item.getAttribute('data-visitor-key') || '';
        item.classList.toggle('expanded');
        if (item.classList.contains('expanded')) expandedVisitorKeys.add(key);
        else expandedVisitorKeys.delete(key);
      }
    };

    body.onchange = (e) => {
      if (e.target && e.target.id === 'visitorAutoReset') {
        setAutoReset(Boolean(e.target.checked));
      }
    };
  }

  async function switchVisitorClass(classId) {
    selectedClassId = Number(classId) || activeClassId;
    cachedVisitors = [];
    setupVisitorsChannel();
    const body = document.getElementById('visitorModalBody');
    if (body) body.innerHTML = skeletonHtml();
    await refreshVisitors();
  }

  async function handleReset(btn) {
    const confirmed = window.ELearnizUI && window.ELearnizUI.popup && window.ELearnizUI.popup.confirm
      ? await window.ELearnizUI.popup.confirm({
          title: 'Reset Pengunjung',
          message: 'Bersihkan daftar pengunjung hari ini?',
          confirmText: 'Bersihkan',
          cancelText: 'Batal',
          isDanger: true
        })
      : window.confirm('Bersihkan daftar pengunjung hari ini?');

    if (!confirmed) return;

    const original = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reset...';
    }

    try {
      await window.ELearnizDB.clearVisitors(selectedClassId || activeClassId);
      await refreshVisitors();
      await refreshBadge();
      toast('Daftar pengunjung telah direset.', 'success');
    } catch (err) {
      console.warn('reset visitor error:', err);
      toast('Gagal reset daftar pengunjung.', 'error');
    } finally {
      if (btn && btn.isConnected) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    }
  }

  /* ------------------------------------------------------------------------
     MODAL OPEN / CLOSE
     ------------------------------------------------------------------------ */
  function closeProfileDropdown() {
    if (typeof window.toggleProfileDropdown === 'function') {
      window.toggleProfileDropdown(false);
      return;
    }
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu) dropdownMenu.classList.remove('show', 'is-open');
    const caretIcon = document.getElementById('caretIcon');
    if (caretIcon) caretIcon.classList.remove('rotate');
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
      if (!modalOpen) return;
      await refreshVisitors();
      await refreshBadge();
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function observeModal(modal) {
    if (!modal) return;
    if (modalObserver) modalObserver.disconnect();
    modalObserver = new MutationObserver(() => {
      const open = modal.classList.contains('is-open');
      if (open) {
        modalOpen = true;
        return;
      }
      if (!modalOpen) return;

      modalOpen = false;
      stopPolling();
      selectedClassId = activeClassId;
      setupVisitorsChannel();
      refreshVisitors().then(refreshBadge);
    });
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  async function openVisitorModal() {
    const modal = document.getElementById('visitorModal');
    const body = document.getElementById('visitorModalBody');
    if (!modal || !body) return;

    closeProfileDropdown();

    modalOpen = true;
    selectedClassId = activeClassId;
    if (cachedVisitors.length > 0) {
      renderVisitorBody(body);
    } else {
      body.innerHTML = skeletonHtml();
    }
    observeModal(modal);

    if (window.ELearnizUI && window.ELearnizUI.popup) {
      window.ELearnizUI.popup.open(modal);
    } else {
      modal.classList.add('is-open');
    }

    setupVisitorsChannel();
    await refreshVisitors();
    await refreshBadge();
    startPolling();
  }

  function bindTrigger() {
    const triggerBtn = document.getElementById('visitorTrigger');
    if (triggerBtn) {
      triggerBtn.onclick = (e) => {
        if (e) e.preventDefault();
        openVisitorModal();
      };
    }
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  async function loadClasses() {
    try {
      classes = await window.ELearnizDB.listClasses();
    } catch (err) {
      console.warn('loadClasses visitor error:', err);
      classes = [];
    }
    if ((!classes || classes.length === 0) && activeClassId) {
      classes = [{ id: activeClassId, name: 'Kelas' }];
    }
  }

  function cleanupAll() {
    cleanupPresence();
    cleanupVisitorsChannel();
    stopPolling();
    stopAutoResetWatcher();
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (modalObserver) {
      modalObserver.disconnect();
      modalObserver = null;
    }
    modalOpen = false;
    cachedVisitors = [];
  }

  async function initVisitorCounter(classId, currentUser) {
    cleanupAll();

    activeClassId = classId ? Number(classId) : null;
    activeUser = currentUser || null;
    selectedClassId = activeClassId;

    bindRouteLogging();
    await loadClasses();
    await logCurrentVisit();

    setupPresence();
    setupVisitorsChannel();

    await refreshVisitors();
    await refreshBadge();

    bindTrigger();
    startAutoResetWatcher();
  }

  window.ELearnizVisitor = {
    initVisitorCounter,
    refresh: refreshVisitors,
    open: openVisitorModal
  };
})();
