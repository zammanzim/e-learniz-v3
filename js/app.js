/* ==========================================================================
   js/app.js — E-Learniz v3 Main Controller
   Manages the 3 Core Pages:
   1. Beranda (Daily Card Final + Pengumuman Kelas)
   2. Daftar Tugas (User Task Profile + Sliding Filter + Mapel Chips + Tugas)
   3. Halaman Subject (#subjectInfoCard + Search/Type Chips + Materi/Tugas)
   ========================================================================== */
(function () {
  const state = {
    classes: [],
    activeClass: null,
    currentUser: null,
    isAdmin: false,
    isSuperAdmin: false,
    subjects: [],
    subjectsMap: {},
    cards: [],
    scheduleDays: [],
    completedTaskIds: new Set(),

    // Navigation state
    activeView: 'home', // 'home' | 'materi' | 'tugas' | 'subject'
    activeSubjectId: null,
    selectedDayOfWeek: null,
    isDailyCardEditing: false,
    scheduleDrafts: {},

    // Materi filter state
    materiMapelFilter: 'all',
    materiSearchQuery: '',

    // Tugas filter state
    taskTab: 'pending', // 'pending' | 'done' | 'all'
    taskMapelFilter: 'all',
    taskSearchQuery: '',

    // Subject filter state
    allSubjectsSearch: '',
    subjectSearch: '',
    subjectTypeFilter: 'all' // 'all' | 'tugas' | 'materi' | 'pinned'
  };

  let lastRouteHash = '#/';

  function showToast(message, type = 'info') {
    if (window.ELearnizUI && window.ELearnizUI.toast) {
      window.ELearnizUI.toast(message, type);
    }
  }

  function classifyAttachment(url) {
    if (window.ELearnizCards && window.ELearnizCards.classifyAttachment) {
      return window.ELearnizCards.classifyAttachment(url);
    }
    return { type: 'file', ext: 'FILE', name: 'Berkas', icon: 'fa-solid fa-file', color: '#2563eb' };
  }

  /* ------------------------------------------------------------------------
     INITIALIZATION & DATA LOADING
     ------------------------------------------------------------------------ */
  async function initApp() {
    bindModals();
    bindTaskFilters();
    bindMateriToolbar();
    bindSubjectToolbar();
    bindAdminControls();

    // Hash Router Listener (Deep linking + tombol back browser)
    // pushState dipakai supaya back/forward terasa normal, sedangkan
    // hashchange tetap ditangani untuk link anchor biasa.
    window.addEventListener('hashchange', handleRouteFromHash);
    window.addEventListener('popstate', () => {
      // Popstate yang hanya menutup modal tidak mengubah hash. Jangan
      // ikut memindahkan halaman saat itu terjadi.
      if ((window.location.hash || '#/') === lastRouteHash) return;
      handleRouteFromHash();
    });

    // Navigation callbacks
    window.ELearnizSidebar.initNavigation({
      onNavigateHome: () => switchView('home'),
      onNavigateMateri: () => switchView('materi'),
      onNavigateTugas: () => switchView('tugas'),
      onNavigateSubject: (sid) => {
        switchView('subject', sid || null);
      }
    });

    try {
      await loadClassAndData();
    } catch (err) {
      console.error('Gagal memuat data awal:', err);
      if (window.ELearnizSkeleton) window.ELearnizSkeleton.clear();
      showToast('Gagal memuat data. Periksa koneksi lalu segarkan halaman.', 'error');
    } finally {
      if (window.ELearnizSkeleton) window.ELearnizSkeleton.hide();
    }
    handleRouteFromHash();
  }

  async function loadClassAndData() {
    try {
      state.classes = await window.ELearnizDB.listClasses();
    } catch (_) {
      state.classes = [];
    }

    const activeSlug = window.ELearnizAuth.getActiveClassSlug();
    state.activeClass = state.classes.find((c) => c.slug === activeSlug) || state.classes.find((c) => c.slug === 'xirpl2') || state.classes[0] || {
      id: 2,
      slug: 'xirpl2',
      name: 'XI - RPL 2',
      school_year: '2026/2027'
    };

    // Jangan percaya localStorage mentah untuk staff. Sesi Supabase Auth
    // dan role di v3.users diverifikasi ulang setiap halaman dimuat.
    try {
      const verified = await window.ELearnizAuth.verifyStaffSession();
      state.currentUser = verified || window.ELearnizAuth.getCurrentUser();
    } catch (_) {
      state.currentUser = window.ELearnizAuth.getCurrentUser();
    }
    state.isAdmin = window.ELearnizAuth.isAdmin(state.currentUser);
    state.isSuperAdmin = window.ELearnizAuth.isSuperAdmin(state.currentUser);

    // Kalau bukan super_admin (misal: student), kunci kelas ke class_id user jika ada
    if (state.currentUser && state.currentUser.class_id && !state.isSuperAdmin) {
      const lockedClass = state.classes.find((c) => Number(c.id) === Number(state.currentUser.class_id));
      if (lockedClass) {
        state.activeClass = lockedClass;
      }
    }

    const classId = state.activeClass.id;
    const [subjects, cards, scheduleDays, completedSet] = await Promise.all([
      window.ELearnizDB.listSubjects(classId),
      window.ELearnizDB.listCards(classId),
      window.ELearnizDB.getScheduleWithPeriods(classId),
      window.ELearnizDB.getCompletedCardIds(classId, state.currentUser ? state.currentUser.id : null)
    ]);

    state.subjects = subjects || [];
    state.subjectsMap = {};
    state.subjects.forEach((s) => {
      state.subjectsMap[String(s.id)] = s;
    });

    state.cards = cards || [];
    state.scheduleDays = scheduleDays || [];
    state.completedTaskIds = completedSet instanceof Set ? completedSet : new Set(completedSet || []);

    if (!state.activeSubjectId && state.subjects.length > 0) {
      state.activeSubjectId = state.subjects[0].id;
    }

    renderHeaderAndAuthUI();
    renderAllViews();

    window.ELearnizVisitor.initVisitorCounter(classId, state.currentUser);
  }

  /* ------------------------------------------------------------------------
     HEADER, PROFILE DROPDOWN & CLASS SWITCHER
     ------------------------------------------------------------------------ */
  function renderHeaderAndAuthUI() {
    const user = state.currentUser;
    const nickname = user
      ? (user.nickname || user.username || (user.display_name ? user.display_name.split(' ')[0] : 'Tamu'))
      : 'Tamu';
    const fullName = user ? (user.display_name || user.full_name || nickname) : 'Mode Tamu';

    const greetingEl = document.getElementById('greeting');
    const welcomeTextEl = document.getElementById('welcomeText');
    const avatarEl = document.getElementById('profileAvatar');
    const ddName = document.getElementById('dropdownUserName');
    const ddRole = document.getElementById('dropdownUserRole');
    const loginBtn = document.getElementById('dropdownLoginBtn');
    const logoutBtn = document.getElementById('dropdownLogoutBtn');

    if (greetingEl) greetingEl.textContent = `Haii, ${nickname}`;
    if (welcomeTextEl) welcomeTextEl.textContent = `Haii, ${nickname}! 👋`;
    if (avatarEl) avatarEl.textContent = nickname.charAt(0).toUpperCase();
    if (ddName) ddName.textContent = fullName;
    if (ddRole) {
      ddRole.textContent = state.isSuperAdmin
        ? 'Super Admin'
        : (state.isAdmin ? 'Admin Kelas' : (user ? 'Siswa Aktif' : 'Mode Tamu'));
    }

    if (loginBtn) loginBtn.style.display = user ? 'none' : 'flex';
    if (logoutBtn) {
      logoutBtn.style.display = user ? 'flex' : 'none';
      logoutBtn.onclick = (e) => {
        e.preventDefault();
        window.ELearnizAuth.logout();
        window.location.href = 'login.html';
      };
    }

    const goMateriLink = document.getElementById('dropdownGoMateri');
    if (goMateriLink) {
      goMateriLink.onclick = (e) => {
        e.preventDefault();
        switchView('materi');
      };
    }

    const goTugasLink = document.getElementById('dropdownGoTugas');
    if (goTugasLink) {
      goTugasLink.onclick = (e) => {
        e.preventDefault();
        switchView('tugas');
      };
    }

    // Theme Switcher Toggle inside Profile Dropdown
    function updateThemeUI() {
      const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
      const themeIcon = document.getElementById('dropdownThemeIcon');
      const themeText = document.getElementById('dropdownThemeText');
      if (themeIcon) {
        themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        themeIcon.style.color = isDark ? '#fbbf24' : '#64748b';
      }
      if (themeText) {
        themeText.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
      }
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('elearniz_theme', next);
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', next === 'dark' ? '#121826' : '#ffffff');
      updateThemeUI();
      showToast(next === 'dark' ? 'Mode Gelap diaktifkan 🌙' : 'Mode Terang diaktifkan ☀️');
    }

    updateThemeUI();

    const themeToggle = document.getElementById('dropdownThemeToggle');
    if (themeToggle && !themeToggle._bound) {
      themeToggle._bound = true;
      themeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTheme();
      });
    }

    // Admin visibility
    document.querySelectorAll('.admin-only').forEach((el) => {
      el.style.display = state.isAdmin ? 'inline-flex' : 'none';
    });
    const fabContainer = document.getElementById('adminFabContainer');
    if (fabContainer) {
      fabContainer.style.display = state.isAdmin ? 'flex' : 'none';
    }

    // Class switcher: KHUSUS super_admin saja
    const classSwitcherWrap = document.getElementById('classSwitcherWrap');
    if (classSwitcherWrap) {
      classSwitcherWrap.style.display = state.isSuperAdmin ? 'block' : 'none';
    }

    const badgeEl = document.getElementById('activeClassBadge');
    const triggerBtn = document.getElementById('classSwitcherTrigger');
    const dropdownEl = document.getElementById('classSwitcherDropdown');

    if (badgeEl && state.activeClass) {
      badgeEl.textContent = state.activeClass.name;
    }

    if (state.isSuperAdmin && triggerBtn && dropdownEl) {
      const esc = window.ELearnizCards.escapeHtml;
      dropdownEl.innerHTML = state.classes.map((c) => `
        <button type="button" class="${c.slug === state.activeClass.slug ? 'active' : ''}" data-slug="${esc(c.slug)}">
          <span>${esc(c.name)}</span>
          ${c.slug === state.activeClass.slug ? '<i class="fa-solid fa-check"></i>' : ''}
        </button>
      `).join('');

      triggerBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownEl.classList.contains('show') && !dropdownEl.classList.contains('is-closing');
        const caret = document.getElementById('classCaretIcon');
        if (isOpen) {
          if (typeof window.closeClassDropdown === 'function') {
            window.closeClassDropdown();
          } else {
            dropdownEl.classList.add('is-closing');
            if (caret) caret.classList.remove('rotate');
            setTimeout(() => dropdownEl.classList.remove('show', 'is-closing'), 160);
          }
        } else {
          dropdownEl.classList.remove('is-closing');
          dropdownEl.classList.add('show');
          if (caret) caret.classList.add('rotate');
        }
      };

      dropdownEl.querySelectorAll('button[data-slug]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const slug = btn.getAttribute('data-slug');
          if (typeof window.closeClassDropdown === 'function') {
            window.closeClassDropdown();
          } else {
            dropdownEl.classList.remove('show');
            const caret = document.getElementById('classCaretIcon');
            if (caret) caret.classList.remove('rotate');
          }

          // Close profile dropdown
          if (typeof window.toggleProfileDropdown === 'function') {
            window.toggleProfileDropdown(false);
          } else {
            const profileDropdown = document.getElementById('dropdownMenu');
            if (profileDropdown) profileDropdown.classList.remove('show');
            const pCaret = document.getElementById('caretIcon');
            if (pCaret) pCaret.classList.remove('rotate');
          }

          if (slug && slug !== state.activeClass.slug) {
            window.ELearnizAuth.setActiveClassSlug(slug);
            state.activeSubjectId = null;
            await loadClassAndData();
            showToast(`Berpindah ke kelas ${state.activeClass.name}`);
          }
        });
      });
    }
  }

  /* ------------------------------------------------------------------------
     VIEW ROUTING & HASH ROUTER (Beranda, Materi, Daftar Tugas, Subject)
     ------------------------------------------------------------------------ */
  function handleRouteFromHash() {
    const rawHash = (window.location.hash || '').replace(/^#\/?/, '').trim();
    lastRouteHash = window.location.hash || '#/';
    if (!rawHash) {
      switchView('home', null, false);
      return;
    }
    const parts = rawHash.split('/').filter(Boolean);
    const route = parts[0] ? parts[0].toLowerCase() : 'home';

    if (route === 'tugas' || route === 'task' || route === 'tasks') {
      switchView('tugas', null, false);
    } else if (route === 'materi' || route === 'material' || route === 'materials') {
      switchView('materi', null, false);
    } else if (route === 'mapel' || route === 'subject' || route === 'subjects') {
      const subjectKey = parts[1];
      if (subjectKey) {
        const found = state.subjects.find((s) => String(s.id) === String(subjectKey) || s.slug === subjectKey);
        switchView('subject', found ? found.id : subjectKey, false);
      } else {
        // Tanpa parameter mapel di link -> tampilkan daftar semua mapel (Req 14)
        switchView('subject', null, false);
      }
    } else {
      switchView('home', null, false);
    }
  }

  function routeHashFor(viewName) {
    if (viewName === 'tugas') return '#/tugas';
    if (viewName === 'materi') return '#/materi';
    if (viewName === 'subject') {
      if (!state.activeSubjectId) return '#/mapel';
      const subj = state.subjects.find((s) => String(s.id) === String(state.activeSubjectId));
      const ref = (subj && (subj.slug || subj.id)) || state.activeSubjectId;
      return `#/mapel/${encodeURIComponent(ref)}`;
    }
    return '#/';
  }

  function switchView(viewName, subjectId, updateHash = true) {
    state.activeView = viewName;
    if (viewName !== 'home') {
      state.isDailyCardEditing = false;
      state.scheduleDrafts = {};
    }
    if (viewName === 'subject') {
      state.activeSubjectId = subjectId || null;
    }

    document.getElementById('viewHome').classList.toggle('active', viewName === 'home');
    document.getElementById('viewMateri').classList.toggle('active', viewName === 'materi');
    document.getElementById('viewTugas').classList.toggle('active', viewName === 'tugas');
    document.getElementById('viewSubject').classList.toggle('active', viewName === 'subject');

    if (updateHash) {
      const nextHash = routeHashFor(viewName);
      if ((window.location.hash || '#/') !== nextHash) {
        history.pushState(null, '', nextHash);
      }
      lastRouteHash = nextHash;
    }

    window.ELearnizSidebar.updateActiveNavIndicators(viewName, state.activeSubjectId);
    renderAllViews();
    window.scrollTo(0, 0);
  }

  function normalizeLabel(value) {
    return String(value || '')
      .toLowerCase()
      // Singkatan yang umum dipakai di jadwal.
      .replace(/\bmtk\b/g, 'matematika')
      .replace(/\bb\s*\.?\s*(indonesia|inggris|sunda|jepang)\b/g, 'bahasa $1')
      .replace(/[^a-z0-9]+/g, '');
  }

  function findSubjectForPeriod(period) {
    if (!period) return null;
    if (period.subject_id) {
      const byId = state.subjects.find((s) => String(s.id) === String(period.subject_id));
      if (byId) return byId;
    }
    const label = normalizeLabel(period.subject_name || period.label);
    if (!label) return null;

    return state.subjects.find((s) => {
      const name = normalizeLabel(s.name);
      if (!name) return false;
      if (name === label) return true;
      // Cocokkan variasi panjang (mis. "Matematika Wajib") tanpa membuat
      // singkatan pendek seperti "PP" cocok dengan "PPK".
      const shorter = name.length <= label.length ? name : label;
      const longer = name.length > label.length ? name : label;
      return shorter.length >= 5 && longer.includes(shorter);
    }) || null;
  }

  // Map subject_id -> 'today' | 'tomorrow' berdasarkan jadwal WIB.
  function buildSchedulePriorityMap() {
    const T = window.ELearnizTime;
    const now = new Date();
    const todayIso = T ? T.isoDay(now) : (now.getDay() === 0 ? 7 : now.getDay());
    const tomorrowIso = todayIso >= 7 ? 1 : todayIso + 1;
    const map = {};

    const markDay = (dayNum, level) => {
      const day = (state.scheduleDays || []).find((d) => Number(d.day_of_week) === Number(dayNum));
      if (!day || !Array.isArray(day.periods)) return;
      day.periods.forEach((period) => {
        const subj = findSubjectForPeriod(period);
        if (!subj) return;
        const key = String(subj.id);
        if (level === 'today') map[key] = 'today';
        else if (!map[key]) map[key] = 'tomorrow';
      });
    };

    markDay(todayIso, 'today');
    markDay(tomorrowIso, 'tomorrow');
    return map;
  }

  function priorityRank(priorityMap, subjectId) {
    if (!subjectId) return 2;
    const value = priorityMap[String(subjectId)];
    if (value === 'today') return 0;
    if (value === 'tomorrow') return 1;
    return 2;
  }

  function sortCardsByPriority(cards, priorityMap) {
    return [...cards].sort((a, b) => {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff !== 0) return pinDiff;

      const rankDiff = priorityRank(priorityMap, a.subject_id) - priorityRank(priorityMap, b.subject_id);
      if (rankDiff !== 0) return rankDiff;

      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;

      return Number(b.id) - Number(a.id);
    });
  }

  function renderAllViews() {
    // Compute materi & pending tasks per subject & total
    const allMateriCards = state.cards.filter((c) => Boolean(c.subject_id) && (!c.has_task || c.kind === 'materi'));
    const taskCards = state.cards.filter((c) => c.has_task);
    const pendingTaskCards = taskCards.filter((c) => !state.completedTaskIds.has(String(c.id)));
    const pendingBySubject = {};
    pendingTaskCards.forEach((c) => {
      if (c.subject_id) {
        const key = String(c.subject_id);
        pendingBySubject[key] = (pendingBySubject[key] || 0) + 1;
      }
    });

    const priorityMap = buildSchedulePriorityMap();

    // Update Sidebar badges & subject list
    const sbMateriBadge = document.getElementById('sidebarMateriBadge');
    if (sbMateriBadge) {
      sbMateriBadge.textContent = String(allMateriCards.length);
      sbMateriBadge.style.display = allMateriCards.length > 0 ? 'inline-block' : 'none';
    }

    const sbBadge = document.getElementById('sidebarPendingBadge');
    if (sbBadge) {
      sbBadge.textContent = String(pendingTaskCards.length);
      sbBadge.style.display = pendingTaskCards.length > 0 ? 'inline-block' : 'none';
    }

    window.ELearnizSidebar.renderSidebarSubjects(
      state.subjects,
      pendingBySubject,
      { view: state.activeView, subjectId: state.activeSubjectId },
      (sid) => switchView('subject', sid)
    );

    if (state.activeView === 'home') renderHomeView(pendingTaskCards.length, priorityMap);
    else if (state.activeView === 'materi') renderMateriView(allMateriCards, priorityMap);
    else if (state.activeView === 'tugas') renderTugasView(taskCards, pendingTaskCards, priorityMap);
    else if (state.activeView === 'subject') renderSubjectView(priorityMap);
  }

  /* ------------------------------------------------------------------------
     1. HALAMAN BERANDA (Daily Card Final + Pengumuman Kelas)
     ------------------------------------------------------------------------ */
  function renderHomeView(pendingTaskCount, priorityMap = {}) {
    const dcContainer = document.getElementById('dailyInfoCard');
    window.ELearnizCards.renderDailyCard(dcContainer, {
      scheduleDays: state.scheduleDays,
      scheduleDrafts: state.scheduleDrafts || {},
      selectedDayOfWeek: state.selectedDayOfWeek,
      pendingTaskCount,
      subjects: state.subjects,
      isAdmin: state.isAdmin,
      isEditing: Boolean(state.isDailyCardEditing),
      onShortcutTugas: () => switchView('tugas'),
      onClickSubject: (sid) => switchView('subject', sid),
      onToggleEditMode: (active) => {
        state.isDailyCardEditing = active;
        if (!active) {
          state.scheduleDrafts = {};
        }
      },
      onSelectDay: (dayNum, currentDraft) => {
        if (state.isDailyCardEditing && currentDraft) {
          if (!state.scheduleDrafts) state.scheduleDrafts = {};
          state.scheduleDrafts[Number(currentDraft.day_of_week)] = currentDraft;
        }
        state.selectedDayOfWeek = Number(dayNum);
        renderAllViews();
      },
      onSaveDailyCard: async (allDraftsOrDayNum, maybePayload) => {
        try {
          let draftsToSave = [];
          if (typeof allDraftsOrDayNum === 'object' && allDraftsOrDayNum !== null && !maybePayload) {
            draftsToSave = Object.entries(allDraftsOrDayNum).map(([dayNum, payload]) => ({
              dayNum: Number(dayNum),
              payload
            }));
          } else {
            draftsToSave = [{ dayNum: Number(allDraftsOrDayNum), payload: maybePayload }];
          }

          if (draftsToSave.length === 0) return;

          for (const item of draftsToSave) {
            await window.ELearnizDB.updateScheduleDay(state.activeClass.id, item.dayNum, item.payload);
          }

          state.scheduleDays = await window.ELearnizDB.getScheduleWithPeriods(state.activeClass.id);
          state.scheduleDrafts = {};
          state.isDailyCardEditing = false;
          renderAllViews();

          const count = draftsToSave.length;
          const msg = count > 1
            ? `Daily Card (${count} hari) berhasil diperbarui!`
            : 'Daily Card berhasil diperbarui!';
          showToast(msg, 'success');
        } catch (err) {
          showToast('Gagal menyimpan Daily Card: ' + (err.message || err), 'error');
          throw err;
        }
      }
    });

    // Pengumuman list
    const announcementCards = state.cards
      .filter((c) => c.kind === 'announcement')
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

    const annContainer = document.getElementById('announcementList');
    window.ELearnizCards.renderCourseCardList(annContainer, announcementCards, {
      completedTaskSet: state.completedTaskIds,
      subjectsMap: state.subjectsMap,
      showSubjectOrigin: false,
      isAdmin: state.isAdmin,
      priorityMap,
      emptyTitle: 'Belum Ada Pengumuman Kelas',
      emptySubtitle: 'Pengumuman terbaru dari pengurus kelas atau wali kelas akan tampil di sini.',
      onToggleTask: handleToggleTaskProgress,
      onOpenDetail: openCardDetailModal,
      onEditCard: openEditCardModal,
      onDeleteCard: handleDeleteCard,
      onTogglePin: handleTogglePinCard
    });
  }

  /* ------------------------------------------------------------------------
     2. HALAMAN DAFTAR TUGAS (#userTaskProfile + Sliding Filter + Mapel Chips)
     ------------------------------------------------------------------------ */
  function syncTaskFilterUI() {
    const filterWrapper = document.getElementById('taskFilters');
    if (!filterWrapper) return;
    filterWrapper.classList.toggle('tab-done', state.taskTab === 'done');
    filterWrapper.classList.toggle('tab-all', state.taskTab === 'all');
    filterWrapper.querySelectorAll('.filter-tab-btn[data-task-tab]').forEach((b) => {
      const isActive = b.getAttribute('data-task-tab') === state.taskTab;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function bindTaskFilters() {
    const filterWrapper = document.getElementById('taskFilters');
    if (filterWrapper) {
      filterWrapper.querySelectorAll('.filter-tab-btn[data-task-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-task-tab');
          if (!['pending', 'done', 'all'].includes(tab)) return;
          state.taskTab = tab;
          syncTaskFilterUI();
          renderAllViews();
        });
      });
      syncTaskFilterUI();
    }

    // Task Search Box listener (Req 10)
    const searchInput = document.getElementById('taskSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      let t = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.taskSearchQuery = searchInput.value.trim().toLowerCase();
          renderTugasOnly();
        }, 140);
      });
    }
  }

  function renderTugasOnly() {
    const taskCards = state.cards.filter((c) => c.has_task);
    const pending = taskCards.filter((c) => !state.completedTaskIds.has(String(c.id)));
    renderTugasView(taskCards, pending, buildSchedulePriorityMap());
  }

  function renderTugasView(allTaskCards, pendingTaskCards, priorityMap = {}) {
    const profileContainer = document.getElementById('userTaskProfile');
    const totalCount = allTaskCards.length;
    const completedCount = totalCount - pendingTaskCards.length;
    const doneTaskCards = allTaskCards.filter((c) => state.completedTaskIds.has(String(c.id)));

    window.ELearnizCards.renderUserTaskProfile(
      profileContainer,
      state.currentUser,
      totalCount,
      completedCount
    );

    const pendingCountEl = document.getElementById('tabPendingCount');
    const doneCountEl = document.getElementById('tabDoneCount');
    const allCountEl = document.getElementById('tabAllCount');
    if (pendingCountEl) pendingCountEl.textContent = String(pendingTaskCards.length);
    if (doneCountEl) doneCountEl.textContent = String(doneTaskCards.length);
    if (allCountEl) allCountEl.textContent = String(totalCount);
    syncTaskFilterUI();

    // Mapel Filter Chips
    const chipsContainer = document.getElementById('mapelFilterChips');
    if (chipsContainer) {
      const esc = window.ELearnizCards.escapeHtml;
      const safeColor = window.ELearnizUI.safeColor;
      const subjectsWithTasks = state.subjects.filter((s) =>
        allTaskCards.some((c) => String(c.subject_id) === String(s.id))
      );

      const countFor = (sid) => allTaskCards.filter((c) => String(c.subject_id) === String(sid)).length;
      const iconFor = (icon) => {
        const value = String(icon || 'fa-book');
        return /^fa-[a-z0-9-]+$/i.test(value) ? `fa-solid ${value}` : 'fa-solid fa-book';
      };

      chipsContainer.innerHTML = [
        `<button type="button" class="mapel-chip-tugas ${state.taskMapelFilter === 'all' ? 'active' : ''}" data-mapel-chip="all">
          <i class="fa-solid fa-layer-group"></i> <span>Semua Mapel</span>
          <span class="mapel-chip-count">${totalCount}</span>
        </button>`,
        ...subjectsWithTasks.map((s) => `
          <button type="button" class="mapel-chip-tugas ${String(state.taskMapelFilter) === String(s.id) ? 'active' : ''}" data-mapel-chip="${esc(s.id)}">
            <i class="${iconFor(s.icon)}" style="color:${safeColor(s.color)}"></i>
            <span>${esc(s.name)}</span>
            <span class="mapel-chip-count">${countFor(s.id)}</span>
          </button>
        `)
      ].join('');

      chipsContainer.querySelectorAll('[data-mapel-chip]').forEach((chip) => {
        chip.addEventListener('click', () => {
          state.taskMapelFilter = chip.getAttribute('data-mapel-chip');
          renderAllViews();
        });
      });
    }

    // Filter task cards by Tab, Mapel, and Search Query
    let filtered = allTaskCards;
    if (state.taskTab === 'pending') filtered = filtered.filter((c) => !state.completedTaskIds.has(String(c.id)));
    else if (state.taskTab === 'done') filtered = filtered.filter((c) => state.completedTaskIds.has(String(c.id)));

    if (state.taskMapelFilter !== 'all') {
      filtered = filtered.filter((c) => String(c.subject_id) === String(state.taskMapelFilter));
    }
    if (state.taskSearchQuery) {
      const q = state.taskSearchQuery;
      filtered = filtered.filter((c) => {
        const subj = c.subject_id ? state.subjectsMap[String(c.subject_id)] : null;
        const sName = subj ? subj.name.toLowerCase() : '';
        const big = (c.big_title || '').toLowerCase();
        const sub = (c.title || '').toLowerCase();
        const content = (c.content || '').toLowerCase();
        const small = (c.small || '').toLowerCase();
        return big.includes(q) || sub.includes(q) || content.includes(q) || small.includes(q) || sName.includes(q);
      });
    }

    filtered = sortCardsByPriority(filtered, priorityMap);

    const taskListContainer = document.getElementById('taskList');
    const isSearchActive = Boolean(state.taskSearchQuery);
    let emptyTitle = 'Belum Ada Tugas di Filter Ini';
    let emptySubtitle = 'Tugas dari mata pelajaran akan muncul di daftar ini.';

    if (isSearchActive) {
      emptyTitle = 'Tidak Ada Tugas Ditemukan';
      emptySubtitle = `Tidak ada tugas yang cocok dengan kata kunci "${state.taskSearchQuery}".`;
    } else if (state.taskTab === 'pending') {
      emptyTitle = totalCount === 0 ? 'Belum Ada Tugas' : 'Semua Tugas Sudah Selesai! 🎉';
      emptySubtitle = totalCount === 0
        ? 'Tugas dari mata pelajaran akan muncul di daftar ini.'
        : 'Tidak ada tanggungan tugas yang belum selesai. Kerja bagus!';
    } else if (state.taskTab === 'done') {
      emptyTitle = 'Belum Ada Tugas Selesai';
      emptySubtitle = 'Tandai tugas sebagai selesai, nanti daftarnya muncul di tab ini.';
    }

    window.ELearnizCards.renderCourseCardList(taskListContainer, filtered, {
      completedTaskSet: state.completedTaskIds,
      subjectsMap: state.subjectsMap,
      showSubjectOrigin: true,
      isAdmin: state.isAdmin,
      priorityMap,
      emptyTitle,
      emptySubtitle,
      onToggleTask: handleToggleTaskProgress,
      onOpenDetail: openCardDetailModal,
      onEditCard: openEditCardModal,
      onDeleteCard: handleDeleteCard,
      onTogglePin: handleTogglePinCard
    });
  }

  /* ------------------------------------------------------------------------
     2B. HALAMAN MATERI PELAJARAN (#userMateriProfile + Mapel Chips + Search)
     ------------------------------------------------------------------------ */
  function bindMateriToolbar() {
    const searchInput = document.getElementById('materiSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      let t = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.materiSearchQuery = searchInput.value.trim().toLowerCase();
          renderMateriOnly();
        }, 140);
      });
    }
  }

  function renderMateriOnly() {
    const allMateriCards = state.cards.filter((c) => Boolean(c.subject_id) && (!c.has_task || c.kind === 'materi'));
    renderMateriView(allMateriCards, buildSchedulePriorityMap());
  }

  function renderMateriView(allMateriCards, priorityMap = {}) {
    const profileContainer = document.getElementById('userMateriProfile');
    const totalCount = allMateriCards.length;

    const subjectsWithMateri = state.subjects.filter((s) =>
      allMateriCards.some((c) => String(c.subject_id) === String(s.id))
    );

    if (window.ELearnizCards && window.ELearnizCards.renderUserMateriProfile) {
      window.ELearnizCards.renderUserMateriProfile(
        profileContainer,
        state.currentUser,
        totalCount,
        subjectsWithMateri.length
      );
    }

    // Mapel Filter Chips
    const chipsContainer = document.getElementById('materiMapelFilterChips');
    if (chipsContainer) {
      const esc = window.ELearnizCards.escapeHtml;
      const safeColor = window.ELearnizUI.safeColor;
      const countFor = (sid) => allMateriCards.filter((c) => String(c.subject_id) === String(sid)).length;
      const iconFor = (icon) => {
        const value = String(icon || 'fa-book');
        return /^fa-[a-z0-9-]+$/i.test(value) ? `fa-solid ${value}` : 'fa-solid fa-book';
      };

      chipsContainer.innerHTML = [
        `<button type="button" class="mapel-chip-tugas ${state.materiMapelFilter === 'all' ? 'active' : ''}" data-materi-chip="all">
          <i class="fa-solid fa-layer-group"></i> <span>Semua Mapel</span>
          <span class="mapel-chip-count">${totalCount}</span>
        </button>`,
        ...subjectsWithMateri.map((s) => `
          <button type="button" class="mapel-chip-tugas ${String(state.materiMapelFilter) === String(s.id) ? 'active' : ''}" data-materi-chip="${esc(s.id)}">
            <i class="${iconFor(s.icon)}" style="color:${safeColor(s.color)}"></i>
            <span>${esc(s.name)}</span>
            <span class="mapel-chip-count">${countFor(s.id)}</span>
          </button>
        `)
      ].join('');

      chipsContainer.querySelectorAll('[data-materi-chip]').forEach((chip) => {
        chip.addEventListener('click', () => {
          state.materiMapelFilter = chip.getAttribute('data-materi-chip');
          renderAllViews();
        });
      });
    }

    // Filter materi cards by Mapel and Search Query
    let filtered = allMateriCards;
    if (state.materiMapelFilter !== 'all') {
      filtered = filtered.filter((c) => String(c.subject_id) === String(state.materiMapelFilter));
    }
    if (state.materiSearchQuery) {
      const q = state.materiSearchQuery;
      filtered = filtered.filter((c) => {
        const subj = c.subject_id ? state.subjectsMap[String(c.subject_id)] : null;
        const sName = subj ? subj.name.toLowerCase() : '';
        const big = (c.big_title || '').toLowerCase();
        const sub = (c.title || '').toLowerCase();
        const content = (c.content || '').toLowerCase();
        const small = (c.small || '').toLowerCase();
        return big.includes(q) || sub.includes(q) || content.includes(q) || small.includes(q) || sName.includes(q);
      });
    }

    filtered = sortCardsByPriority(filtered, priorityMap);

    const materiListContainer = document.getElementById('materiList');
    const isSearchActive = Boolean(state.materiSearchQuery);
    let emptyTitle = 'Belum Ada Materi Pembelajaran';
    let emptySubtitle = 'Materi pembelajaran dari bapak/ibu guru akan muncul di daftar ini.';

    if (isSearchActive) {
      emptyTitle = 'Tidak Ada Materi Ditemukan';
      emptySubtitle = `Tidak ada materi yang cocok dengan kata kunci "${state.materiSearchQuery}".`;
    }

    window.ELearnizCards.renderCourseCardList(materiListContainer, filtered, {
      completedTaskSet: state.completedTaskIds,
      subjectsMap: state.subjectsMap,
      showSubjectOrigin: true,
      isAdmin: state.isAdmin,
      priorityMap,
      hideTaskChecklist: true,
      emptyTitle,
      emptySubtitle,
      onOpenDetail: openCardDetailModal,
      onEditCard: openEditCardModal,
      onDeleteCard: handleDeleteCard,
      onTogglePin: handleTogglePinCard
    });
  }

  /* ------------------------------------------------------------------------
     3. HALAMAN SUBJECT (#subjectInfoCard + Search/Chips + Course Cards)
     ------------------------------------------------------------------------ */
  function bindSubjectToolbar() {
    const allSearchInput = document.getElementById('allSubjectsSearchInput');
    if (allSearchInput && !allSearchInput.dataset.bound) {
      allSearchInput.dataset.bound = 'true';
      let t = null;
      allSearchInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.allSubjectsSearch = allSearchInput.value.trim().toLowerCase();
          renderAllSubjectsOverview();
        }, 140);
      });
    }

    const searchInput = document.getElementById('subjectSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      let t = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.subjectSearch = searchInput.value.trim().toLowerCase();
          renderSubjectView();
        }, 140);
      });
    }

    const chipsWrap = document.getElementById('subjectTypeChips');
    if (chipsWrap) {
      chipsWrap.querySelectorAll('.subj-chip[data-subj-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.subjectTypeFilter = btn.getAttribute('data-subj-filter');
          chipsWrap.querySelectorAll('.subj-chip').forEach((b) => {
            b.classList.toggle('active', b === btn);
          });
          renderSubjectView();
        });
      });
    }
  }

  function renderAllSubjectsOverview() {
    const singleLayout = document.getElementById('singleSubjectLayout');
    const allOverview = document.getElementById('allSubjectsOverview');
    const grid = document.getElementById('allSubjectsGrid');
    const countBadge = document.getElementById('allSubjectsCountBadge');

    if (singleLayout) singleLayout.style.display = 'none';
    if (allOverview) allOverview.style.display = 'block';

    const esc = window.ELearnizCards.escapeHtml;
    const safeColor = window.ELearnizUI.safeColor;
    const safeIcon = (icon, fallback = 'fa-book-open') => {
      const value = String(icon || '');
      if (!value) return `fa-solid ${fallback}`;
      if (/^fa-[a-z0-9-]+$/i.test(value)) return `fa-solid ${value}`;
      if (/^fa-(solid|regular|brands) fa-[a-z0-9-]+$/i.test(value)) return value;
      return `fa-solid ${fallback}`;
    };

    const query = state.allSubjectsSearch;
    const visibleSubjects = query
      ? state.subjects.filter((s) => {
          const name = String(s.name || '').toLowerCase();
          const teacher = String(s.teacher_name || '').toLowerCase();
          return name.includes(query) || teacher.includes(query);
        })
      : state.subjects;

    if (countBadge) countBadge.textContent = `${visibleSubjects.length} Mapel Tersedia`;

    if (!grid) return;

    if (state.subjects.length === 0) {
      grid.innerHTML = `
        <div class="empty-card-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-book"></i>
          <h4>Belum Ada Mata Pelajaran</h4>
          <p>Mata pelajaran untuk kelas ini belum ditambahkan.</p>
        </div>
      `;
      return;
    }

    if (visibleSubjects.length === 0) {
      grid.innerHTML = `
        <div class="empty-card-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <h4>Mapel Tidak Ditemukan</h4>
          <p>Tidak ada mapel/guru yang cocok dengan kata kunci tersebut.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = visibleSubjects.map((s) => {
      const subjCards = state.cards.filter((c) => String(c.subject_id) === String(s.id));
      const subjTasks = subjCards.filter((c) => c.has_task);
      const subjPending = subjTasks.filter((c) => !state.completedTaskIds.has(String(c.id)));
      const col = safeColor(s.color);

      return `
        <div class="all-subject-card" data-subj-nav="${esc(s.id)}">
          <div class="asc-header">
            <div class="asc-icon" style="background:${col};">
              <i class="${safeIcon(s.icon)}"></i>
            </div>
            <div class="asc-title-wrap">
              <h3>${esc(s.name)}</h3>
              <span>${esc(s.teacher_name || 'Guru Pengajar')}</span>
            </div>
          </div>
          <div class="asc-stats">
            <div class="asc-stat-pill">
              <span class="asc-stat-num">${subjCards.length}</span>
              <span class="asc-stat-lbl">Konten Mapel</span>
            </div>
            <div class="asc-stat-pill">
              <span class="asc-stat-num">${subjPending.length}</span>
              <span class="asc-stat-lbl">Tugas Aktif</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-subj-nav]').forEach((card) => {
      card.addEventListener('click', () => {
        const sid = card.getAttribute('data-subj-nav');
        if (sid) switchView('subject', sid);
      });
    });
  }

  function renderSubjectView(priorityMap = {}) {
    const singleLayout = document.getElementById('singleSubjectLayout');
    const allOverview = document.getElementById('allSubjectsOverview');

    if (!state.activeSubjectId) {
      renderAllSubjectsOverview();
      return;
    }

    const subject = state.subjects.find((s) => String(s.id) === String(state.activeSubjectId));
    if (!subject) {
      renderAllSubjectsOverview();
      return;
    }

    if (allOverview) allOverview.style.display = 'none';
    if (singleLayout) singleLayout.style.display = '';

    state.activeSubjectId = subject.id;

    const esc = window.ELearnizCards.escapeHtml;
    const safeColor = window.ELearnizUI.safeColor;
    const safeIcon = (icon, fallback = 'fa-book-open') => {
      const value = String(icon || '');
      if (!value) return `fa-solid ${fallback}`;
      if (/^fa-[a-z0-9-]+$/i.test(value)) return `fa-solid ${value}`;
      if (/^fa-(solid|regular|brands) fa-[a-z0-9-]+$/i.test(value)) return value;
      return `fa-solid ${fallback}`;
    };

    // Populate #subjectInfoCard
    const infoCard = document.getElementById('subjectInfoCard');
    const iconBox = document.getElementById('subjectIconBox');
    const iconElem = document.getElementById('subjectIconElem');
    const nameEl = document.getElementById('subjectName');
    const teacherNameEl = document.getElementById('teacherName');
    const teacherPhoneEl = document.getElementById('teacherPhone');
    const totalEl = document.getElementById('totalTasksCount');
    const completedEl = document.getElementById('completedTasksCount');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const feedHeading = document.getElementById('subjectFeedHeading');

    const accentColor = safeColor(subject.color);
    if (infoCard) {
      infoCard.style.setProperty('--subj-accent', accentColor);
    }
    if (iconBox) {
      iconBox.style.color = accentColor;
      iconBox.style.borderColor = accentColor;
      iconBox.style.backgroundColor = `${accentColor}18`;
    }
    if (iconElem) {
      iconElem.className = safeIcon(subject.icon);
    }
    if (nameEl) nameEl.textContent = subject.name;
    if (feedHeading) {
      feedHeading.innerHTML = `<i class="fa-solid fa-book-open-reader"></i> Materi & Tugas — ${esc(subject.name)}`;
    }

    const statusEl = document.getElementById('subjectStatus');
    if (statusEl) {
      if (subject.is_locked) {
        statusEl.innerHTML = '<i class="fa-solid fa-lock"></i> TERKUNCI';
        statusEl.className = 'status-badge locked';
        statusEl.style.display = 'inline-flex';
      } else {
        statusEl.innerHTML = '';
        statusEl.className = 'status-badge';
        statusEl.style.display = 'none';
      }
    }
    if (teacherNameEl) {
      teacherNameEl.textContent = subject.teacher_name || 'Guru Pengajar Belum Diatur';
    }
    if (teacherPhoneEl) {
      if (subject.teacher_phone) {
        const cleanDigits = String(subject.teacher_phone).replace(/\D/g, '');
        const waNumber = cleanDigits.startsWith('0') ? `62${cleanDigits.slice(1)}` : cleanDigits;
        teacherPhoneEl.innerHTML = `
          <a href="https://wa.me/${waNumber}" target="_blank" rel="noopener" class="wa-link" title="Chat WhatsApp Guru">
            <i class="fa-brands fa-whatsapp"></i> Chat Guru
          </a>
        `;
      } else {
        teacherPhoneEl.textContent = '-';
      }
    }

    // Schedule days calculation for this subject
    const DAY_SHORT_NAMES = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
    const subjectNameKey = normalizeLabel(subject.name);
    const scheduledDays = (state.scheduleDays || [])
      .filter((d) => d.periods && d.periods.some((p) => {
        if (p.subject_id && String(p.subject_id) === String(subject.id)) return true;
        const labelKey = normalizeLabel(p.subject_name || p.label);
        return Boolean(subjectNameKey && labelKey && (
          labelKey === subjectNameKey ||
          labelKey.includes(subjectNameKey) ||
          subjectNameKey.includes(labelKey)
        ));
      }))
      .map((d) => DAY_SHORT_NAMES[d.day_of_week])
      .filter(Boolean);
    const scheduleDaysEl = document.getElementById('subjectScheduleDays');
    if (scheduleDaysEl) {
      scheduleDaysEl.textContent = scheduledDays.length > 0 ? scheduledDays.join(', ') : 'Mandiri';
    }

    // Subject cards & progress stats
    const allSubjCards = sortCardsByPriority(
      state.cards.filter((c) => String(c.subject_id) === String(subject.id)),
      priorityMap
    );

    const subjTasks = allSubjCards.filter((c) => c.has_task);
    const subjDoneTasks = subjTasks.filter((c) => state.completedTaskIds.has(String(c.id)));
    const pct = subjTasks.length > 0
      ? Math.round((subjDoneTasks.length / subjTasks.length) * 100)
      : (allSubjCards.length > 0 ? 100 : 0);

    if (totalEl) totalEl.textContent = `${allSubjCards.length} Konten`;
    if (completedEl) completedEl.textContent = subjTasks.length > 0 ? `${subjDoneTasks.length}/${subjTasks.length}` : '0 Tugas';
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressPercent) {
      if (subjTasks.length === 0) {
        progressPercent.textContent = 'Materi Pembelajaran Saja';
      } else {
        progressPercent.textContent = `Tuntas ${subjDoneTasks.length} dari ${subjTasks.length} Tugas (${pct}%)`;
      }
    }

    const captionEl = document.getElementById('subjectCaption');
    if (captionEl) {
      if (subjTasks.length === 0) {
        captionEl.innerHTML = '✨ Belum ada tugas untuk mapel ini. Pelajari materi yang ada ya!';
      } else if (pct === 100) {
        captionEl.innerHTML = '🎉 Hebat! Semua tugas di mapel ini sudah selesai kamu kerjakan!';
      } else {
        const pendingCount = subjTasks.length - subjDoneTasks.length;
        captionEl.innerHTML = `💪 Masih ada ${pendingCount} tugas aktif. Yuk selesaikan tepat waktu!`;
      }
    }

    // Apply toolbar filters
    let filtered = allSubjCards;
    if (state.subjectTypeFilter === 'tugas') {
      filtered = filtered.filter((c) => c.has_task);
    } else if (state.subjectTypeFilter === 'materi') {
      filtered = filtered.filter((c) => !c.has_task);
    } else if (state.subjectTypeFilter === 'pinned') {
      filtered = filtered.filter((c) => c.pinned);
    }

    if (state.subjectSearch) {
      filtered = filtered.filter((c) =>
        [c.big_title, c.title, c.content, c.small]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(state.subjectSearch)
      );
    }

    const listContainer = document.getElementById('subjectCardList');
    window.ELearnizCards.renderCourseCardList(listContainer, filtered, {
      completedTaskSet: state.completedTaskIds,
      subjectsMap: state.subjectsMap,
      showSubjectOrigin: false,
      isAdmin: state.isAdmin,
      priorityMap,
      emptyTitle: `Belum Ada Materi di ${subject.name}`,
      emptySubtitle: 'Materi pelajaran, rangkuman, atau latihan tugas akan tampil di sini.',
      onToggleTask: handleToggleTaskProgress,
      onOpenDetail: openCardDetailModal,
      onEditCard: openEditCardModal,
      onDeleteCard: handleDeleteCard,
      onTogglePin: handleTogglePinCard
    });
  }

  /* ------------------------------------------------------------------------
     TASK PROGRESS TOGGLE & MODAL DETAIL
     ------------------------------------------------------------------------ */
  async function handleToggleTaskProgress(cardId) {
    if (!state.currentUser) {
      showToast('Masuk sebagai siswa dulu supaya progres tugasmu tersimpan.', 'warning');
      return;
    }

    const classId = state.activeClass.id;
    const userId = state.currentUser.id;
    try {
      const updatedSet = await window.ELearnizDB.toggleTaskCompleted(classId, cardId, userId);
      state.completedTaskIds = updatedSet instanceof Set ? updatedSet : new Set(updatedSet || []);
      const isNowDone = state.completedTaskIds.has(String(cardId));
      renderAllViews();
      showToast(isNowDone ? 'Tugas ditandai selesai! 🎉' : 'Status tugas dikembalikan ke belum selesai.');
    } catch (err) {
      showToast('Gagal menyimpan progres tugas: ' + (err.message || err), 'error');
    }
  }

  /* ------------------------------------------------------------------------
     DETAIL MODAL & PHOTO SLIDER (Hardware-Accelerated Carousel Track)
     ------------------------------------------------------------------------ */
  let currentViewerPhotos = [];
  let currentViewerIndex = 0;

  function initSliderTrack(photos, initialIndex = 0) {
    const track = document.getElementById('detailSliderTrack');
    const nav = document.getElementById('sliderNavBtns');
    const counterPill = document.getElementById('photoCounterTag');
    const currentIdxEl = document.getElementById('pvCurrentIdx');
    const totalIdxEl = document.getElementById('pvTotalIdx');

    currentViewerPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
    currentViewerIndex = (initialIndex >= 0 && initialIndex < currentViewerPhotos.length) ? initialIndex : 0;

    if (!track) return;

    if (currentViewerPhotos.length === 0) {
      track.innerHTML = '';
      if (nav) nav.style.display = 'none';
      if (counterPill) counterPill.style.display = 'none';
      return;
    }

    // Render all slides once with async image decoding and GPU acceleration
    const esc = window.ELearnizCards ? window.ELearnizCards.escapeHtml : (s => s || '');
    const classify = classifyAttachment;

    track.innerHTML = currentViewerPhotos.map((url, i) => {
      const meta = classify(url);
      if (meta.type === 'video') {
        return `
          <div class="slider-slide is-video-slide" data-slide-index="${i}">
            <video src="${esc(url)}" controls playsinline preload="metadata" class="slider-video-player"></video>
          </div>
        `;
      }
      if (meta.type === 'image') {
        return `
          <div class="slider-slide" data-slide-index="${i}">
            <img src="${esc(url)}" alt="Lampiran ${i + 1}" decoding="async" loading="eager" />
          </div>
        `;
      }
      // Non-visual documents (PDF, Word, PPT, Excel, ZIP, dll)
      return `
        <div class="slider-slide is-file-slide" data-slide-index="${i}">
          <div class="slide-file-card">
            <div class="slide-file-icon" style="color: ${meta.color}">
              <i class="${meta.icon}"></i>
            </div>
            <h3 class="slide-file-name">${esc(meta.name)}</h3>
            <span class="slide-file-badge">${esc(meta.ext.toUpperCase())} Berkas</span>
            <div class="slide-file-actions">
              <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="btn-primary slide-file-btn">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Berkas
              </a>
              <a href="${esc(url)}" download="${esc(meta.name)}" class="btn-secondary slide-file-btn">
                <i class="fa-solid fa-download"></i> Unduh
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Counter
    if (counterPill) {
      counterPill.style.display = 'inline-flex';
      if (currentIdxEl) currentIdxEl.textContent = String(currentViewerIndex + 1);
      if (totalIdxEl) totalIdxEl.textContent = String(currentViewerPhotos.length);
    }

    // Set initial position instantly without transition
    track.style.transition = 'none';
    track.style.transform = `translate3d(-${currentViewerIndex * 100}%, 0, 0)`;
    track.offsetHeight; // Force layout flush
    track.style.transition = 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)';

    updateSlideNavButtons();
  }

  function goToSlide(newIndex, animate = true) {
    if (newIndex < 0 || newIndex >= currentViewerPhotos.length) return;
    const track = document.getElementById('detailSliderTrack');
    const currentIdxEl = document.getElementById('pvCurrentIdx');

    currentViewerIndex = newIndex;

    if (track) {
      track.style.transition = animate ? 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
      track.style.transform = `translate3d(-${currentViewerIndex * 100}%, 0, 0)`;
    }

    if (currentIdxEl) {
      currentIdxEl.textContent = String(currentViewerIndex + 1);
    }

    updateSlideNavButtons();
  }

  function updateSlideNavButtons() {
    const nav = document.getElementById('sliderNavBtns');
    if (!nav) return;
    const isMulti = currentViewerPhotos.length > 1;
    nav.style.display = isMulti ? 'flex' : 'none';
    if (isMulti) {
      const btnPrev = nav.querySelector('.prev-btn');
      const btnNext = nav.querySelector('.next-btn');
      if (btnPrev) btnPrev.style.visibility = (currentViewerIndex === 0) ? 'hidden' : 'visible';
      if (btnNext) btnNext.style.visibility = (currentViewerIndex === currentViewerPhotos.length - 1) ? 'hidden' : 'visible';
    }
  }

  function nextSlide(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (currentViewerIndex < currentViewerPhotos.length - 1) {
      goToSlide(currentViewerIndex + 1);
    }
  }

  function prevSlide(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (currentViewerIndex > 0) {
      goToSlide(currentViewerIndex - 1);
    }
  }

  function updateSliderUI() {
    goToSlide(currentViewerIndex);
  }

  // Interactive touch swipe gesture for detail photo slider (60fps drag & snap)
  (function initPhotoSliderSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;
    let currentDx = 0;
    let isSwiping = false;
    let isHorizontal = null;

    document.addEventListener('touchstart', (e) => {
      const modal = document.getElementById('cardDetailModal');
      if (!modal || !modal.classList.contains('is-open')) return;
      if (!e.target.closest('#detailSliderWrapper')) return;
      if (e.target.closest('.modern-slider-arrow, .slider-dot, .modern-floating-info-pill, .photo-counter-pill, .close-detail-btn')) return;
      if (currentViewerPhotos.length <= 1) return;

      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      currentDx = 0;
      isSwiping = true;
      isHorizontal = null;

      const track = document.getElementById('detailSliderTrack');
      if (track) track.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isSwiping || currentViewerPhotos.length <= 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - touchStartX;
      const dy = y - touchStartY;

      if (isHorizontal === null) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          isHorizontal = Math.abs(dx) > Math.abs(dy);
        }
      }

      if (!isHorizontal) return;

      currentDx = dx;
      const track = document.getElementById('detailSliderTrack');
      if (track) {
        let pull = dx;
        if ((currentViewerIndex === 0 && dx > 0) || (currentViewerIndex === currentViewerPhotos.length - 1 && dx < 0)) {
          pull = dx * 0.28;
        }
        track.style.transform = `translate3d(calc(-${currentViewerIndex * 100}% + ${pull}px), 0, 0)`;
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      isSwiping = false;

      if (!isHorizontal || currentViewerPhotos.length <= 1) return;

      const track = document.getElementById('detailSliderTrack');
      if (track) {
        track.style.transition = 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)';
      }

      if (currentDx < -40 && currentViewerIndex < currentViewerPhotos.length - 1) {
        goToSlide(currentViewerIndex + 1);
      } else if (currentDx > 40 && currentViewerIndex > 0) {
        goToSlide(currentViewerIndex - 1);
      } else {
        goToSlide(currentViewerIndex);
      }
    }, { passive: true });
  })();

  // Keyboard navigation for photo slider
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('cardDetailModal');
    if (!modal || !modal.classList.contains('is-open')) return;
    if (currentViewerPhotos.length <= 1) return;

    if (e.key === 'ArrowRight') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    }
  });

  // Window resize handler for mobile sheet
  window.addEventListener('resize', () => {
    const modal = document.getElementById('cardDetailModal');
    if (!modal || !modal.classList.contains('is-open')) return;
    const infoSection = document.getElementById('detailInfoSection');
    const toggleInfoBtn = document.getElementById('toggleInfoBtn');
    if (!infoSection) return;

    if (window.innerWidth > 768) {
      infoSection.classList.remove('hidden-mobile', 'full-screen');
      if (toggleInfoBtn) toggleInfoBtn.style.display = 'none';
    } else if (currentViewerPhotos.length > 0) {
      if (infoSection.classList.contains('hidden-mobile') && toggleInfoBtn) {
        toggleInfoBtn.style.display = 'flex';
      }
    }
  });

  function openCardDetailModal(card, photoIndex = 0) {
    const modal = document.getElementById('cardDetailModal');
    const detailBox = document.getElementById('cardDetailBox');
    const infoSection = document.getElementById('detailInfoSection');
    const toggleInfoBtn = document.getElementById('toggleInfoBtn');
    const infoContent = document.getElementById('detailInfoContent');
    const sheetToggleBtn = document.getElementById('sheetToggleBtn');
    const sheetCloseBtn = document.getElementById('sheetCloseBtn');
    const prevBtn = document.getElementById('slidePrevBtn');
    const nextBtn = document.getElementById('slideNextBtn');

    if (!modal || !detailBox || !infoContent) return;

    let photos = [];
    const rawPhotos = card.images || card.photos || card.photo_url || [];
    if (Array.isArray(rawPhotos)) {
      photos = rawPhotos.filter(Boolean);
    } else if (typeof rawPhotos === 'string') {
      try {
        const parsed = JSON.parse(rawPhotos);
        photos = Array.isArray(parsed) ? parsed.filter(Boolean) : [rawPhotos];
      } catch {
        photos = [rawPhotos];
      }
    }

    if (photos.length === 0) {
      detailBox.classList.add('text-only-mode');
    } else {
      detailBox.classList.remove('text-only-mode');
    }

    const isMobile = window.innerWidth <= 768;
    if (infoSection) {
      if (isMobile && photos.length > 0) {
        infoSection.classList.add('hidden-mobile');
        infoSection.classList.remove('full-screen');
        if (toggleInfoBtn) toggleInfoBtn.style.display = 'flex';
      } else {
        infoSection.classList.remove('hidden-mobile', 'full-screen');
        if (toggleInfoBtn) toggleInfoBtn.style.display = 'none';
      }
    }

    if (sheetToggleBtn) {
      const icon = sheetToggleBtn.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-up-right-and-down-left-from-center';
    }

    initSliderTrack(photos, photoIndex);

    const subj = card.subject_id ? state.subjectsMap[String(card.subject_id)] : null;
    const isDone = state.completedTaskIds.has(String(card.id));
    const dueLabel = (window.ELearnizCards && window.ELearnizCards.formatDueLabel)
      ? window.ELearnizCards.formatDueLabel(card.due_date)
      : '';
    // Badge prioritas: hitung dari tanggal tenggat (WIB), bukan dari teks label,
    // karena formatDueLabel() tidak pernah memuat kata "hari ini/besok".
    let dueBadgeLabel = null;
    if (card.due_date) {
      const dueDate = new Date(card.due_date);
      if (!isNaN(dueDate.getTime())) {
        const T = window.ELearnizTime;
        const dueKey = T ? T.dateKey(dueDate) : dueDate.toDateString();
        const nowMs = Date.now();
        const todayKey = T ? T.dateKey(new Date(nowMs)) : new Date(nowMs).toDateString();
        // Tambah 24 jam apa adanya aman karena WIB tidak mengenal DST.
        const tomorrowKey = T ? T.dateKey(new Date(nowMs + 86400000)) : new Date(nowMs + 86400000).toDateString();
        if (dueKey === todayKey) dueBadgeLabel = 'Tenggat Hari Ini';
        else if (dueKey === tomorrowKey) dueBadgeLabel = 'Tenggat Besok';
      }
    }
    const esc = window.ELearnizCards ? window.ELearnizCards.escapeHtml : (s => s || '');
    const classify = classifyAttachment;
    // Warna & icon dari DB wajib divalidasi sebelum masuk atribut style/class.
    const safeColorFn = (window.ELearnizUI && window.ELearnizUI.safeColor)
      ? window.ELearnizUI.safeColor
      : (v) => (/^#[0-9a-fA-F]{3,8}$/.test(String(v || '')) ? String(v) : '#2563eb');
    const safeIconCls = (icon) => {
      const value = String(icon || '');
      return /^fa-[a-z0-9-]+$/i.test(value) ? `fa-solid ${value}` : 'fa-solid fa-book';
    };
    const subjAccent = subj ? safeColorFn(subj.color) : '#2563eb';

    // Helper URL autolink and structured paragraph/list formatter
    const formatContent = (text) => {
      if (!text) return '';
      const processLinks = (str) => {
        return str.replace(/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, (url) => {
          let label = url;
          try {
            const parsed = new URL(url);
            label = parsed.hostname + (parsed.pathname.length > 1 ? parsed.pathname.slice(0, 15) + '…' : '');
          } catch (_) {}
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="detail-link-chip"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span>${label}</span></a>`;
        });
      };

      const rawLines = text.split('\n');
      const formatted = [];
      let inList = false;

      rawLines.forEach((rawLine) => {
        const trimmed = rawLine.trim();
        const bulletMatch = /^[-*•]\s+(.*)$/.exec(trimmed);
        const numMatch = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);

        if (bulletMatch) {
          if (!inList) {
            formatted.push('<ul class="detail-styled-list">');
            inList = true;
          }
          formatted.push(`<li><span class="list-bullet"><i class="fa-solid fa-circle-dot"></i></span><span class="list-text">${processLinks(esc(bulletMatch[1]))}</span></li>`);
        } else if (numMatch) {
          if (!inList) {
            formatted.push('<ol class="detail-styled-list">');
            inList = true;
          }
          formatted.push(`<li><span class="list-num">${numMatch[1]}</span><span class="list-text">${processLinks(esc(numMatch[2]))}</span></li>`);
        } else {
          if (inList) {
            formatted.push('</ul>');
            inList = false;
          }
          if (trimmed.length > 0) {
            formatted.push(`<p class="detail-p">${processLinks(esc(rawLine))}</p>`);
          } else {
            formatted.push('<div class="detail-p-spacer"></div>');
          }
        }
      });

      if (inList) formatted.push('</ul>');
      return formatted.join('');
    };

    infoContent.innerHTML = `
      <div class="detail-header-badges">
        ${subj ? `
          <span class="detail-badge subject-badge" style="--subj-accent:${subjAccent}; border-left-color: ${subjAccent};">
            <i class="${safeIconCls(subj && subj.icon)}"></i>
            <span>${esc(subj.name)}</span>
          </span>
        ` : ''}

        <span class="detail-badge type-badge ${card.has_task ? 'is-task' : 'is-info'}">
          <i class="fa-solid ${card.has_task ? 'fa-list-check' : (subj ? 'fa-book-bookmark' : 'fa-bullhorn')}"></i>
          <span>${card.has_task ? 'Tugas Kelas' : (subj ? 'Materi Pelajaran' : 'Pengumuman')}</span>
        </span>

        ${dueBadgeLabel ? `
          <span class="detail-badge priority-badge ${dueBadgeLabel.includes('Hari Ini') ? 'is-today' : 'is-tomorrow'}">
            <i class="fa-solid fa-bolt"></i>
            <span>${dueBadgeLabel}</span>
          </span>
        ` : ''}
      </div>

      <div class="detail-title-block">
        <h2 class="detail-big-title">
          ${esc(card.big_title || card.title || 'Tanpa Judul')}
        </h2>
        ${(card.title && card.big_title) ? `<div class="detail-sub-title">${esc(card.title)}</div>` : ''}
      </div>

      ${card.content ? `
        <div class="detail-body-card">
          ${formatContent(card.content)}
        </div>
      ` : ''}

      ${(photos.length > 0) ? `
        <div class="detail-attachments-box">
          <h4 class="detail-attachments-title">
            <i class="fa-solid fa-paperclip"></i> Lampiran & Berkas (${photos.length})
          </h4>
          <div class="detail-attachments-list">
            ${photos.map((url) => {
              const m = classify(url);
              return `
                <div class="detail-att-item">
                  <span class="detail-att-icon" style="color: ${m.color};">
                    <i class="${m.icon}"></i>
                  </span>
                  <div class="detail-att-meta">
                    <span class="detail-att-name" title="${esc(m.name)}">${esc(m.name)}</span>
                    <span class="detail-att-tag">${esc(m.ext.toUpperCase())}</span>
                  </div>
                  <div class="detail-att-actions">
                    <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="detail-att-btn" title="Buka di tab baru">
                      <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                    <a href="${esc(url)}" download="${esc(m.name)}" class="detail-att-btn is-download" title="Unduh berkas">
                      <i class="fa-solid fa-download"></i>
                    </a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${(card.small || dueLabel) ? `
        <div class="detail-meta-chip">
          <i class="fa-regular fa-clock"></i>
          <span>${esc([card.small, dueLabel].filter(Boolean).join(' · '))}</span>
        </div>
      ` : ''}

      ${card.has_task ? `
        <div class="detail-task-card ${isDone ? 'is-completed' : 'is-pending'}">
          <div class="detail-task-info">
            <div class="detail-task-icon-circle">
              <i class="fa-solid ${isDone ? 'fa-circle-check' : 'fa-list-check'}"></i>
            </div>
            <div class="detail-task-meta-text">
              <span class="task-card-title">${isDone ? 'Tugas Telah Selesai' : 'Status Pengerjaan Tugas'}</span>
              <span class="task-card-caption">${isDone ? 'Bagus! Progres tugasmu sudah tercatat selesai.' : 'Klik tombol di bawah setelah kamu menyelesaikan tugas.'}</span>
            </div>
          </div>
          <button type="button" class="detail-task-cta-btn ${isDone ? 'completed-btn' : 'action-btn'}" id="modalToggleTaskBtn">
            <i class="fa-solid ${isDone ? 'fa-rotate-left' : 'fa-check'}"></i>
            <span>${isDone ? 'Tandai Belum Selesai' : 'Tandai Selesai Sekarang'}</span>
          </button>
        </div>
      ` : ''}
    `;

    // Bind navigation & sheet controls
    if (prevBtn) prevBtn.onclick = prevSlide;
    if (nextBtn) nextBtn.onclick = nextSlide;

    const detailSheetBackdrop = document.getElementById('detailSheetBackdrop');

    // Immersive Mode: Auto-hide photo controls after 5 seconds of inactivity
    let detailInactivityTimer = null;

    function showViewerControls() {
      detailBox.classList.remove('controls-hidden');
    }

    function hideViewerControls() {
      // Don't auto-hide if user is currently reading the mobile description sheet
      if (infoSection && !infoSection.classList.contains('hidden-mobile') && window.innerWidth <= 768) {
        return;
      }
      detailBox.classList.add('controls-hidden');
    }

    function restartViewerInactivityTimer() {
      showViewerControls();
      if (detailInactivityTimer) clearTimeout(detailInactivityTimer);
      if (photos.length > 0) {
        detailInactivityTimer = setTimeout(() => {
          hideViewerControls();
        }, 5000);
      }
    }

    const interactionEvents = ['pointerdown', 'pointermove', 'touchstart', 'click'];
    const handleViewerInteraction = () => {
      restartViewerInactivityTimer();
    };

    interactionEvents.forEach((ev) => {
      detailBox.addEventListener(ev, handleViewerInteraction, { passive: true });
    });

    const closeObserver = new MutationObserver(() => {
      if (!modal.classList.contains('is-open')) {
        if (detailInactivityTimer) clearTimeout(detailInactivityTimer);
        detailBox.classList.remove('controls-hidden');
        if (detailSheetBackdrop) detailSheetBackdrop.classList.remove('is-active');
        interactionEvents.forEach((ev) => {
          detailBox.removeEventListener(ev, handleViewerInteraction);
        });
        closeObserver.disconnect();
      }
    });
    closeObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });

    // Mobile Description Sheet Controls
    function openMobileSheet() {
      if (!infoSection) return;
      infoSection.style.transform = '';
      infoSection.style.transition = '';
      infoSection.classList.remove('hidden-mobile');
      if (detailSheetBackdrop) detailSheetBackdrop.classList.add('is-active');
      if (toggleInfoBtn) toggleInfoBtn.style.display = 'none';
      showViewerControls();
      if (detailInactivityTimer) clearTimeout(detailInactivityTimer);
    }

    function closeMobileSheet() {
      if (!infoSection) return;
      infoSection.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      infoSection.style.transform = 'translate3d(0, 105%, 0)';
      if (detailSheetBackdrop) detailSheetBackdrop.classList.remove('is-active');
      setTimeout(() => {
        infoSection.classList.add('hidden-mobile');
        infoSection.classList.remove('full-screen');
        infoSection.style.transform = '';
        infoSection.style.transition = '';
        if (toggleInfoBtn) toggleInfoBtn.style.display = 'flex';
        if (sheetToggleBtn) {
          const icon = sheetToggleBtn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-up-right-and-down-left-from-center';
        }
        restartViewerInactivityTimer();
      }, 280);
    }

    infoSection._closeMobileSheet = closeMobileSheet;

    if (toggleInfoBtn) {
      toggleInfoBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        openMobileSheet();
      };
    }

    if (sheetCloseBtn) {
      sheetCloseBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        closeMobileSheet();
      };
    }

    // Tap empty area above sheet to dismiss
    if (detailSheetBackdrop) {
      detailSheetBackdrop.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        closeMobileSheet();
      };
    }

    if (sheetToggleBtn) {
      sheetToggleBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!infoSection) return;
        infoSection.style.transform = '';
        infoSection.style.transition = '';
        const isFull = infoSection.classList.toggle('full-screen');
        const icon = sheetToggleBtn.querySelector('i');
        if (icon) icon.className = isFull ? 'fa-solid fa-down-left-and-up-right-to-center' : 'fa-solid fa-up-right-and-down-left-from-center';
      };
    }

    // Gesture swipe/drag to dismiss or expand mobile sheet
    const sheetHeader = infoSection ? infoSection.querySelector('.sheet-header-mobile') : null;
    if (sheetHeader && !sheetHeader._gestureBound) {
      sheetHeader._gestureBound = true;
      let startY = 0;
      let currentY = 0;
      let isDragging = false;
      let activePointerId = null;

      sheetHeader.addEventListener('pointerdown', (e) => {
        if (e.target.closest('#sheetToggleBtn, #sheetCloseBtn')) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        startY = e.clientY;
        currentY = startY;
        isDragging = true;
        activePointerId = e.pointerId;
        try { sheetHeader.setPointerCapture(e.pointerId); } catch (_) {}

        infoSection.style.transition = 'none';
      });

      sheetHeader.addEventListener('pointermove', (e) => {
        if (!isDragging || e.pointerId !== activePointerId) return;
        currentY = e.clientY;
        const deltaY = currentY - startY;

        if (deltaY > 0) {
          infoSection.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        } else {
          const isFull = infoSection.classList.contains('full-screen');
          const factor = isFull ? 0.2 : 0.45;
          infoSection.style.transform = `translate3d(0, ${deltaY * factor}px, 0)`;
        }
      });

      const handleDragEnd = (e) => {
        if (!isDragging || (e && e.pointerId !== activePointerId)) return;
        isDragging = false;
        try { if (activePointerId !== null) sheetHeader.releasePointerCapture(activePointerId); } catch (_) {}
        activePointerId = null;

        const deltaY = currentY - startY;
        const isFull = infoSection.classList.contains('full-screen');

        if (deltaY > 75) {
          if (isFull && deltaY < 180) {
            // Drop down from full-screen to half-sheet
            infoSection.classList.remove('full-screen');
            infoSection.style.transition = 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)';
            infoSection.style.transform = '';
            const tBtn = document.getElementById('sheetToggleBtn');
            if (tBtn) {
              const icon = tBtn.querySelector('i');
              if (icon) icon.className = 'fa-solid fa-up-right-and-down-left-from-center';
            }
            setTimeout(() => { infoSection.style.transition = ''; }, 260);
          } else {
            if (infoSection._closeMobileSheet) {
              infoSection._closeMobileSheet();
            } else {
              closeMobileSheet();
            }
          }
        } else if (deltaY < -50 && !isFull) {
          // Swipe up to expand to full-screen
          infoSection.classList.add('full-screen');
          infoSection.style.transition = 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)';
          infoSection.style.transform = '';
          const tBtn = document.getElementById('sheetToggleBtn');
          if (tBtn) {
            const icon = tBtn.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-down-left-and-up-right-to-center';
          }
          setTimeout(() => { infoSection.style.transition = ''; }, 260);
        } else {
          // Snap back to 0
          infoSection.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
          infoSection.style.transform = '';
          setTimeout(() => { infoSection.style.transition = ''; }, 220);
        }
      };

      sheetHeader.addEventListener('pointerup', handleDragEnd);
      sheetHeader.addEventListener('pointercancel', handleDragEnd);
    }

    restartViewerInactivityTimer();

    const modalBtn = infoContent.querySelector('#modalToggleTaskBtn');
    if (modalBtn) {
      modalBtn.addEventListener('click', async () => {
        await handleToggleTaskProgress(card.id);
        const updatedIsDone = state.completedTaskIds.has(String(card.id));
        const taskCard = infoContent.querySelector('.detail-task-card');
        if (taskCard) {
          taskCard.className = `detail-task-card ${updatedIsDone ? 'is-completed' : 'is-pending'}`;
          const iconCircle = taskCard.querySelector('.detail-task-icon-circle i');
          if (iconCircle) iconCircle.className = `fa-solid ${updatedIsDone ? 'fa-circle-check' : 'fa-list-check'}`;
          const title = taskCard.querySelector('.task-card-title');
          if (title) title.textContent = updatedIsDone ? 'Tugas Telah Selesai' : 'Status Pengerjaan Tugas';
          const caption = taskCard.querySelector('.task-card-caption');
          if (caption) caption.textContent = updatedIsDone ? 'Bagus! Progres tugasmu sudah tercatat selesai.' : 'Klik tombol di bawah setelah kamu menyelesaikan tugas.';
        }
        modalBtn.className = `detail-task-cta-btn ${updatedIsDone ? 'completed-btn' : 'action-btn'}`;
        modalBtn.innerHTML = `
          <i class="fa-solid ${updatedIsDone ? 'fa-rotate-left' : 'fa-check'}"></i>
          <span>${updatedIsDone ? 'Tandai Belum Selesai' : 'Tandai Selesai Sekarang'}</span>
        `;
      });
    }

    window.ELearnizUI.popup.open(modal);
  }

  // Expose for external navigation & backwards compatibility (like v2 openDetail)
  window.openCardDetailModal = openCardDetailModal;

  /* ------------------------------------------------------------------------
     ADMIN CONTROLS (Create/Edit Card, Edit Subject Info, FAB)
     ------------------------------------------------------------------------ */
  function bindModals() {
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close-modal');
        const m = document.getElementById(id);
        if (m) window.ELearnizUI.popup.close(m);
      });
    });
  }

  function bindAdminControls() {
    const fabMainBtn = document.getElementById('fabMainBtn');

    if (fabMainBtn) {
      fabMainBtn.addEventListener('click', () => {
        // Klik FAB langsung membuka form tambah tugas jika di view tugas, atau materi jika di view lain
        if (state.activeView === 'tugas') {
          openCreateCardModal('subject', true);
        } else {
          openCreateCardModal('subject', false);
        }
      });
    }

    const btnAddAnn = document.getElementById('btnAddAnnouncement');
    if (btnAddAnn) {
      btnAddAnn.addEventListener('click', () => openCreateCardModal('announcement', false));
    }

    const btnAddMateri = document.getElementById('btnAddMateriQuick');
    if (btnAddMateri) {
      btnAddMateri.addEventListener('click', () => openCreateCardModal('subject', false));
    }

    const btnAddTugas = document.getElementById('btnAddTugasQuick');
    if (btnAddTugas) {
      btnAddTugas.addEventListener('click', () => openCreateCardModal('subject', true));
    }

    const btnAddSubj = document.getElementById('btnAddSubjectCard');
    if (btnAddSubj) {
      btnAddSubj.addEventListener('click', () => openCreateCardModal('subject', false));
    }

    // Setup Drag and Drop Uploader for Cloudflare R2
    const dropzone = document.getElementById('cfDropzone');
    const fileInput = document.getElementById('cfImageFile');
    const previewList = document.getElementById('cfImagePreviewList');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('input[type="file"]')) return;
        fileInput.click();
      });

      ['dragenter', 'dragover'].forEach((evName) => {
        dropzone.addEventListener(evName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'dragend'].forEach((evName) => {
        dropzone.addEventListener(evName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer ? e.dataTransfer.files : []);
        if (files.length > 0) {
          handleUploadFiles(files);
        }
      });

      fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files || []);
        if (files.length > 0) {
          handleUploadFiles(files);
        }
        fileInput.value = '';
      });
    }

    if (previewList) {
      previewList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.btn-remove-img');
        if (!removeBtn) return;
        const idx = Number(removeBtn.dataset.removeIndex);
        if (!isNaN(idx) && idx >= 0 && idx < cardFormPhotos.length) {
          const removed = cardFormPhotos.splice(idx, 1)[0];
          if (removed && removed.type === 'draft' && removed.previewUrl) {
            try { URL.revokeObjectURL(removed.previewUrl); } catch (_) {}
          }
          renderImagePreviews();
          showToast('Foto dihapus dari daftar', 'info');
        }
      });
    }

    function handleUploadFiles(files) {
      const disallowedExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'vbs', 'scr', 'msi', 'dll', 'com', 'hta', 'cpl', 'pif', 'reg', 'jar'];
      const validFiles = [];

      for (const file of files) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (disallowedExts.includes(ext)) {
          showToast(`File .${ext} tidak diizinkan demi keamanan.`, 'warning');
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      for (const file of validFiles) {
        const isImg = file.type && file.type.startsWith('image/');
        const isVid = file.type && file.type.startsWith('video/');
        let previewUrl = '';
        if (isImg || isVid) {
          try { previewUrl = URL.createObjectURL(file); } catch (_) {}
        }
        cardFormPhotos.push({
          type: 'draft',
          file,
          previewUrl,
          name: file.name,
          size: file.size
        });
      }

      renderImagePreviews();
      showToast(`${validFiles.length} berkas ditambahkan`, 'info');
    }

    const kindSelect = document.getElementById('cfKind');
    const subjGroup = document.getElementById('cfSubjectGroup');
    if (kindSelect && subjGroup) {
      kindSelect.addEventListener('change', () => {
        subjGroup.style.display = kindSelect.value === 'subject' ? 'flex' : 'none';
      });
      // Enhance select with Universal Dropdown (Req 9)
      window.ELearnizUI.dropdown.enhanceSelect(kindSelect, (val) => {
        subjGroup.style.display = val === 'subject' ? 'flex' : 'none';
      });
    }

    const cardForm = document.getElementById('cardForm');
    if (cardForm) {
      cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = cardForm.querySelector('button[type="submit"]');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        }

        try {
          const id = document.getElementById('cfId').value;
          const kind = document.getElementById('cfKind').value;
          const subject_id = kind === 'subject' ? document.getElementById('cfSubjectId').value : null;
          const big_title = document.getElementById('cfBigTitle').value.trim();
          const title = document.getElementById('cfTitle').value.trim();
          const content = document.getElementById('cfContent').value.trim();
          const small = document.getElementById('cfSmall').value.trim();
          const dueRaw = document.getElementById('cfDueDate').value;
          const dueDateObj = window.ELearnizTime
            ? window.ELearnizTime.parseDatetimeLocal(dueRaw)
            : (dueRaw ? new Date(dueRaw) : null);
          const due_date = dueDateObj ? dueDateObj.toISOString() : null;

          if (!big_title) throw new Error('Judul utama wajib diisi.');
          if (kind === 'subject' && !subject_id) {
            throw new Error('Pilih mata pelajaran untuk materi/tugas ini.');
          }

          // Upload foto draf ke Cloudflare R2 sebelum menyimpan card
          const draftPhotos = cardFormPhotos.filter((p) => p.type === 'draft');
          if (draftPhotos.length > 0) {
            for (let i = 0; i < draftPhotos.length; i++) {
              const draft = draftPhotos[i];
              if (submitBtn) {
                submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up fa-fade"></i> Upload berkas (${i + 1}/${draftPhotos.length})...`;
              }
              const pubUrl = await window.ELearnizDB.uploadMedia(draft.file, 'cards');
              draft.url = pubUrl;
              draft.type = 'existing';
              if (draft.previewUrl) {
                try { URL.revokeObjectURL(draft.previewUrl); } catch (_) {}
              }
            }
          }

          if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan konten...';
          }

          const images = cardFormPhotos.map((p) => p.url).filter(Boolean);
          const has_task = document.getElementById('cfHasTask').checked;
          const pinned = document.getElementById('cfPinned').checked;

          await window.ELearnizDB.saveCard(state.activeClass.id, {
            id: id || undefined,
            kind,
            subject_id: subject_id ? Number(subject_id) : null,
            big_title,
            title,
            content,
            small,
            due_date,
            images,
            has_task,
            pinned
          });

          window.ELearnizUI.popup.close('cardFormModal');
          clearDraftPhotoUrls();
          cardFormPhotos = [];
          state.cards = await window.ELearnizDB.listCards(state.activeClass.id);
          renderAllViews();
          showToast(id ? 'Konten berhasil diperbarui!' : 'Konten baru berhasil ditambahkan!', 'success');
        } catch (err) {
          showToast('Gagal menyimpan konten: ' + (err.message || err), 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }

    // Subject info edit modal
    const btnEditSubj = document.getElementById('btnEditSubjectInfo');
    const subjModal = document.getElementById('subjectFormModal');
    const subjForm = document.getElementById('subjectForm');

    if (btnEditSubj && subjModal) {
      btnEditSubj.addEventListener('click', () => {
        const subj = state.subjects.find((s) => String(s.id) === String(state.activeSubjectId));
        if (!subj) return;
        document.getElementById('sfId').value = subj.id;
        document.getElementById('sfName').value = subj.name || '';
        document.getElementById('sfTeacher').value = subj.teacher_name || '';
        document.getElementById('sfPhone').value = subj.teacher_phone || '';
        document.getElementById('sfIcon').value = subj.icon || 'fa-book';
        document.getElementById('sfColor').value = subj.color || '#2563eb';
        window.ELearnizUI.popup.open(subjModal);
      });
    }

    if (subjForm) {
      subjForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = subjForm.querySelector('button[type="submit"]');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        }

        try {
          const id = document.getElementById('sfId').value;
          const name = document.getElementById('sfName').value.trim();
          const teacher_name = document.getElementById('sfTeacher').value.trim();
          const teacher_phone = document.getElementById('sfPhone').value.trim();
          const icon = document.getElementById('sfIcon').value.trim();
          const color = document.getElementById('sfColor').value;

          await window.ELearnizDB.updateSubject(state.activeClass.id, id, {
            name,
            teacher_name,
            teacher_phone,
            icon,
            color
          });

          window.ELearnizUI.popup.close(subjModal);
          state.subjects = await window.ELearnizDB.listSubjects(state.activeClass.id);
          state.subjectsMap = {};
          state.subjects.forEach((s) => {
            state.subjectsMap[String(s.id)] = s;
          });
          renderAllViews();
          showToast('Informasi mata pelajaran diperbarui!', 'success');
        } catch (err) {
          showToast('Gagal memperbarui mapel: ' + (err.message || err), 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }
  }

  function populateSubjectSelect(selectedId) {
    const sel = document.getElementById('cfSubjectId');
    if (!sel) return;
    const esc = window.ELearnizCards.escapeHtml;
    sel.innerHTML = state.subjects.map((s) =>
      `<option value="${esc(s.id)}" ${String(s.id) === String(selectedId) ? 'selected' : ''}>${esc(s.name)}</option>`
    ).join('');
    // Enhance select with Universal Dropdown (Req 9)
    window.ELearnizUI.dropdown.enhanceSelect(sel);
  }

  function toLocalDatetimeString(dateInput) {
    if (!dateInput) return '';
    if (window.ELearnizTime) return window.ELearnizTime.toDatetimeLocal(dateInput);
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
  }

  let cardFormPhotos = [];

  function clearDraftPhotoUrls() {
    cardFormPhotos.forEach((item) => {
      if (item.type === 'draft' && item.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
      }
    });
  }

  function updateCardImagesHidden() {
    const cfImages = document.getElementById('cfImages');
    if (cfImages) {
      const urls = cardFormPhotos.map((p) => (p.type === 'existing' ? p.url : `[Draf: ${p.name}]`));
      cfImages.value = urls.join(', ');
    }
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderImagePreviews() {
    const container = document.getElementById('cfImagePreviewList');
    if (!container) return;
    updateCardImagesHidden();

    if (cardFormPhotos.length === 0) {
      container.innerHTML = '';
      return;
    }

    const esc = window.ELearnizCards ? window.ELearnizCards.escapeHtml : (s => s || '');
    const classify = classifyAttachment;

    container.innerHTML = cardFormPhotos
      .map((item, idx) => {
        const isDraft = item.type === 'draft';
        const urlOrName = isDraft ? item.name : item.url;
        const meta = classify(urlOrName);

        const badgeHtml = isDraft
          ? `<span class="preview-badge-draft"><i class="fa-solid fa-clock"></i> Draf</span>`
          : `<span class="preview-badge-r2"><i class="fa-solid fa-cloud"></i> R2</span>`;

        let mediaHtml = '';
        if (meta.type === 'image') {
          const src = isDraft ? item.previewUrl : item.url;
          mediaHtml = `<img src="${esc(src)}" alt="Lampiran ${idx + 1}" loading="lazy" decoding="async" />`;
        } else if (meta.type === 'video') {
          const src = isDraft ? item.previewUrl : item.url;
          mediaHtml = `
            <video src="${esc(src)}" preload="metadata" muted class="preview-video-thumb"></video>
            <div class="preview-type-pill"><i class="fa-solid fa-film"></i> Video</div>
          `;
        } else {
          const sizeText = item.size ? formatFileSize(item.size) : '';
          mediaHtml = `
            <div class="preview-file-body">
              <span class="preview-file-icon" style="color:${meta.color};">
                <i class="${meta.icon}"></i>
              </span>
              <span class="preview-file-name" title="${esc(meta.name)}">${esc(meta.name)}</span>
              <span class="preview-file-ext">${esc(meta.ext.toUpperCase())}${sizeText ? ' · ' + sizeText : ''}</span>
            </div>
          `;
        }

        return `
          <div class="preview-card ${meta.type !== 'image' && meta.type !== 'video' ? 'is-file-preview' : ''}" data-index="${idx}">
            ${mediaHtml}
            ${badgeHtml}
            <button type="button" class="btn-remove-img" data-remove-index="${idx}" title="Hapus berkas ini">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        `;
      })
      .join('');
  }

  function openCreateCardModal(kind, forceTaskChecked) {
    document.getElementById('cardFormTitle').textContent = kind === 'subject'
      ? (forceTaskChecked ? 'Tambah Tugas Baru' : 'Tambah Materi Pelajaran')
      : 'Tambah Pengumuman Kelas';
    document.getElementById('cfId').value = '';
    document.getElementById('cfKind').value = kind || 'subject';
    document.getElementById('cfSubjectGroup').style.display = kind === 'announcement' ? 'none' : 'flex';
    populateSubjectSelect(state.activeSubjectId || (state.subjects[0] && state.subjects[0].id));
    window.ELearnizUI.dropdown.enhanceSelect(document.getElementById('cfKind'));
    document.getElementById('cfBigTitle').value = '';
    document.getElementById('cfTitle').value = '';
    document.getElementById('cfContent').value = '';
    document.getElementById('cfSmall').value = '';
    document.getElementById('cfDueDate').value = '';

    clearDraftPhotoUrls();
    cardFormPhotos = [];
    renderImagePreviews();

    const fi = document.getElementById('cfImageFile');
    if (fi) fi.value = '';
    document.getElementById('cfHasTask').checked = Boolean(forceTaskChecked);
    document.getElementById('cfPinned').checked = false;
    window.ELearnizUI.popup.open('cardFormModal');
  }

  function openEditCardModal(card) {
    document.getElementById('cardFormTitle').textContent = 'Edit Konten';
    document.getElementById('cfId').value = card.id;
    document.getElementById('cfKind').value = card.kind || 'subject';
    document.getElementById('cfSubjectGroup').style.display = card.kind === 'announcement' ? 'none' : 'flex';
    populateSubjectSelect(card.subject_id || state.activeSubjectId);
    window.ELearnizUI.dropdown.enhanceSelect(document.getElementById('cfKind'));
    document.getElementById('cfBigTitle').value = card.big_title || '';
    document.getElementById('cfTitle').value = card.title || '';
    document.getElementById('cfContent').value = card.content || '';
    document.getElementById('cfSmall').value = card.small || '';
    document.getElementById('cfDueDate').value = toLocalDatetimeString(card.due_date);

    clearDraftPhotoUrls();
    const existingImgs = Array.isArray(card.images) ? card.images : [];
    cardFormPhotos = existingImgs.map((url) => ({ type: 'existing', url }));
    renderImagePreviews();

    const fi = document.getElementById('cfImageFile');
    if (fi) fi.value = '';
    document.getElementById('cfHasTask').checked = Boolean(card.has_task);
    document.getElementById('cfPinned').checked = Boolean(card.pinned);
    window.ELearnizUI.popup.open('cardFormModal');
  }

  async function handleDeleteCard(card) {
    const ok = await window.ELearnizUI.popup.confirm({
      title: 'Hapus Konten',
      message: `Apakah kamu yakin ingin menghapus "${card.big_title || card.title}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Sekarang',
      cancelText: 'Batal',
      isDanger: true
    });
    if (!ok) return;

    try {
      await window.ELearnizDB.deleteCard(state.activeClass.id, card.id);
      state.cards = await window.ELearnizDB.listCards(state.activeClass.id);
      renderAllViews();
      showToast('Konten berhasil dihapus.', 'success');
    } catch (err) {
      showToast('Gagal menghapus konten: ' + (err.message || err), 'error');
    }
  }

  async function handleTogglePinCard(card) {
    try {
      await window.ELearnizDB.saveCard(state.activeClass.id, {
        ...card,
        pinned: !card.pinned
      });
      state.cards = await window.ELearnizDB.listCards(state.activeClass.id);
      renderAllViews();
      showToast(card.pinned ? 'Pin dilepas.' : 'Kartu dipin di paling atas! 📌', 'info');
    } catch (err) {
      showToast('Gagal mengubah pin: ' + (err.message || err), 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
