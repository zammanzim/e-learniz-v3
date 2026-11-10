/* ==========================================================================
   js/i18n.js — E-Learniz v3 Internationalization (i18n) Engine
   Supports: Bahasa Indonesia (id) & English (en)
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'elearniz_language';
  const DEFAULT_LANG = 'id';

  const TRANSLATIONS = {
    id: {
      // Navigation & Sections
      nav_main_section: 'Utama',
      nav_subjects_section: 'Mata Pelajaran',
      nav_home: 'Beranda',
      nav_tugas: 'Daftar Tugas',
      nav_materi: 'Materi Pelajaran',
      nav_tema: 'Personalisasi',
      nav_bottom_home: 'Beranda',
      nav_bottom_tugas: 'Tugas',
      nav_bottom_materi: 'Materi',
      nav_bottom_menu: 'Menu',
      nav_bottom_profile: 'Profil',

      // Header & Profile Dropdown
      header_greeting_prefix: 'Haii, ',
      header_guest: 'Tamu Kelas',
      header_switch_class: 'Pilih Kelas',
      header_profile: 'Profil Saya',
      header_signout: 'Keluar Akun',
      header_visitor: 'Pengunjung',

      // Home & Daily Card
      home_announcements_title: 'Pengumuman Kelas',
      home_btn_add_announcement: 'Buat Pengumuman',
      home_no_announcements: 'Belum ada pengumuman kelas untuk saat ini.',
      dc_task_shortcut: 'TUGAS',
      dc_uniform: 'Seragam',
      dc_activity: 'Kegiatan',
      dc_notes: 'Catatan',
      dc_schedule: 'Jadwal Pelajaran',
      dc_chores: 'Piket Kelas',
      dc_no_schedule: 'Belum ada jadwal pelajaran hari ini.',
      dc_no_chores: 'Tidak ada jadwal piket hari ini.',
      dc_today: 'Hari Ini',
      dc_tomorrow: 'Besok',
      dc_schedule_badge: 'Jadwal',

      // Days (Full & Short)
      day_1: 'Senin',
      day_2: 'Selasa',
      day_3: 'Rabu',
      day_4: 'Kamis',
      day_5: 'Jumat',
      day_6: 'Sabtu',
      day_7: 'Minggu',
      day_short_1: 'Sen',
      day_short_2: 'Sel',
      day_short_3: 'Rab',
      day_short_4: 'Kam',
      day_short_5: 'Jum',
      day_short_6: 'Sab',
      day_short_7: 'Min',

      // Tugas (Tasks Page)
      tasks_page_title: 'Daftar Tugas',
      tasks_filter_pending: 'Belum Selesai',
      tasks_filter_completed: 'Sudah Selesai',
      tasks_filter_all: 'Semua',
      tasks_all_subjects: 'Semua Mapel',
      tasks_completed_summary: 'Tugas Selesai',
      tasks_no_tasks: 'Tidak ada tugas yang sesuai.',
      task_mark_done: 'Tandai Selesai',
      task_mark_undone: 'Batal Selesai',
      task_due: 'Batas Waktu',

      // Materi (Study Materials Page)
      materials_page_title: 'Materi Pelajaran',
      materials_search_placeholder: 'Cari judul materi, topik, atau isi...',
      materials_no_materials: 'Belum ada materi pelajaran yang diunggah.',

      // Subjects (Mapel Page)
      subjects_all_title: 'Semua Mata Pelajaran',
      subjects_search_placeholder: 'Cari nama mapel atau guru...',
      subjects_count_suffix: 'Mapel',

      // Theme / Personalization
      theme_page_title: 'Personalisasi & Tema',
      theme_page_subtitle: 'Sesuaikan aksen warna, mode tampilan, sudut tombol, bahasa, dan gaya latar belajar sesuai seleramu.',
      theme_btn_reset: 'Reset Standar',
      theme_preview_title: 'Pratinjau Langsung',
      theme_preview_subtitle: 'Tampilan komponen dengan personalisasimu',
      theme_mode_title: 'Mode Tampilan',
      theme_mode_desc: 'Pilih pencahayaan yang paling pas untuk mata dan lingkungan belajarmu.',
      theme_mode_auto: 'Otomatis',
      theme_mode_auto_desc: 'Sistem',
      theme_mode_light: 'Terang',
      theme_mode_light_desc: 'Cerah & bersih untuk siang hari',
      theme_mode_dark: 'Gelap',
      theme_mode_dark_desc: 'Teduh & nyaman untuk malam hari',
      theme_default_badge: 'Bawaan',
      theme_lang_title: 'Pilihan Bahasa',
      theme_lang_desc: 'Pilih bahasa antarmuka untuk portal E-Learniz.',
      theme_lang_id: 'Bahasa Indonesia',
      theme_lang_id_desc: 'Bahasa default sistem',
      theme_lang_en: 'English',
      theme_lang_en_desc: 'Antarmuka berbahasa Inggris',
      theme_accent_title: 'Warna Aksen Utama',
      theme_accent_desc: 'Warna identitas untuk tombol, sorotan menu, ikon header, dan indikator tugas.',
      theme_custom_color_title: 'Pilih Sendiri',
      theme_custom_color_desc: 'Warna Bebas / Kustom',
      theme_bg_title: 'Nuansa Latar Belakang',
      theme_bg_desc: 'Tingkat kepekatan kontras dan corak warna kanvas di belakang kartu.',
      theme_radius_title: 'Bentuk Sudut & Tipografi',
      theme_radius_desc: 'Atur kelengkungan tombol/kartu dan jenis huruf yang paling kamu sukai.',
      theme_corner_radius: 'Kelengkungan Sudut (Corner Radius)',
      theme_fonts: 'Pilihan Tipografi / Font',
      theme_extras_title: 'Efek & Kerapatan Tampilan',
      theme_extras_desc: 'Pengaturan visual tambahan untuk memaksimalkan kenyamanan belajar.',
      theme_glow_title: 'Ambient Glow Background',
      theme_glow_desc: 'Efek kilau cahaya gradien ambient yang lembut di latar belakang aplikasi.',
      theme_density_title: 'Kepadatan Tata Letak',
      theme_density_desc: 'Pilih jarak spasi antar elemen yang lega atau lebih padat/ringkas.',
      theme_density_comfortable: 'Lega',
      theme_density_compact: 'Ringkas',
      theme_saved_note: 'Semua personalisasi tersimpan otomatis di perangkatmu.',

      // Modal Card Form
      modal_create_title: 'Tambah Konten Baru',
      modal_edit_title: 'Edit Konten',
      modal_kind_label: 'Jenis Konten',
      modal_kind_announcement: 'Pengumuman Kelas',
      modal_kind_subject: 'Materi / Tugas Mapel',
      modal_subject_label: 'Mata Pelajaran',
      modal_big_title_label: 'Judul Utama (Big Title)',
      modal_big_title_placeholder: 'Contoh: Tugas Bab 3 — Persamaan Kuadrat',
      modal_title_label: 'Subjudul / Bab (Opsional)',
      modal_title_placeholder: 'Contoh: Latihan Hal. 45 No. 1–10',
      modal_content_label: 'Isi Lengkap / Instruksi',
      modal_content_placeholder: 'Tulis penjelasan materi, pengumuman, atau instruksi pengerjaan tugas...',
      modal_small_label: 'Catatan Kecil / Deadline Ketik',
      modal_small_placeholder: 'Contoh: Dikumpulkan di meja guru',
      modal_due_label: 'Batas Waktu (Tanggal & Jam)',
      modal_attachments_label: 'Berkas & Lampiran (Cloudflare R2)',
      modal_has_task_label: 'Jadikan Tugas (Bisa Ditandai Selesai)',
      modal_pinned_label: 'Pin di Paling Atas',
      modal_btn_cancel: 'Batal',
      modal_btn_save: 'Simpan',
      modal_btn_saving: 'Menyimpan...'
    },

    en: {
      // Navigation & Sections
      nav_main_section: 'Main Menu',
      nav_subjects_section: 'Subjects',
      nav_home: 'Home',
      nav_tugas: 'Tasks',
      nav_materi: 'Materials',
      nav_tema: 'Personalize',
      nav_bottom_home: 'Home',
      nav_bottom_tugas: 'Tasks',
      nav_bottom_materi: 'Materials',
      nav_bottom_menu: 'Menu',
      nav_bottom_profile: 'Profile',

      // Header & Profile Dropdown
      header_greeting_prefix: 'Hello, ',
      header_guest: 'Class Guest',
      header_switch_class: 'Switch Class',
      header_profile: 'My Profile',
      header_signout: 'Sign Out',
      header_visitor: 'Visitors',

      // Home & Daily Card
      home_announcements_title: 'Class Announcements',
      home_btn_add_announcement: 'New Announcement',
      home_no_announcements: 'No class announcements at this time.',
      dc_task_shortcut: 'TASKS',
      dc_uniform: 'Uniform',
      dc_activity: 'Activity',
      dc_notes: 'Notes',
      dc_schedule: 'Class Schedule',
      dc_chores: 'Class Duty',
      dc_no_schedule: 'No class schedule for today.',
      dc_no_chores: 'No cleaning duty assigned today.',
      dc_today: 'Today',
      dc_tomorrow: 'Tomorrow',
      dc_schedule_badge: 'Schedule',

      // Days (Full & Short)
      day_1: 'Monday',
      day_2: 'Tuesday',
      day_3: 'Wednesday',
      day_4: 'Thursday',
      day_5: 'Friday',
      day_6: 'Saturday',
      day_7: 'Sunday',
      day_short_1: 'Mon',
      day_short_2: 'Tue',
      day_short_3: 'Wed',
      day_short_4: 'Thu',
      day_short_5: 'Fri',
      day_short_6: 'Sat',
      day_short_7: 'Sun',

      // Tugas (Tasks Page)
      tasks_page_title: 'Task List',
      tasks_filter_pending: 'Pending',
      tasks_filter_completed: 'Completed',
      tasks_filter_all: 'All',
      tasks_all_subjects: 'All Subjects',
      tasks_completed_summary: 'Completed Tasks',
      tasks_no_tasks: 'No matching tasks found.',
      task_mark_done: 'Mark as Done',
      task_mark_undone: 'Mark as Incomplete',
      task_due: 'Due Date',

      // Materi (Study Materials Page)
      materials_page_title: 'Study Materials',
      materials_search_placeholder: 'Search materials, topics, or content...',
      materials_no_materials: 'No study materials uploaded yet.',

      // Subjects (Mapel Page)
      subjects_all_title: 'All Subjects',
      subjects_search_placeholder: 'Search subject or teacher name...',
      subjects_count_suffix: 'Subjects',

      // Theme / Personalization
      theme_page_title: 'Personalization & Theme',
      theme_page_subtitle: 'Customize accent colors, theme modes, button styles, language, and study canvas to your liking.',
      theme_btn_reset: 'Reset to Default',
      theme_preview_title: 'Live Preview',
      theme_preview_subtitle: 'Component preview with your personalization',
      theme_mode_title: 'Display Mode',
      theme_mode_desc: 'Choose the lighting that best fits your eyes and study environment.',
      theme_mode_auto: 'Auto',
      theme_mode_auto_desc: 'System',
      theme_mode_light: 'Light',
      theme_mode_light_desc: 'Bright & clean for daytime',
      theme_mode_dark: 'Dark',
      theme_mode_dark_desc: 'Gentle & cool for nighttime',
      theme_default_badge: 'Default',
      theme_lang_title: 'Language',
      theme_lang_desc: 'Select your preferred interface language for E-Learniz.',
      theme_lang_id: 'Bahasa Indonesia',
      theme_lang_id_desc: 'Default system language',
      theme_lang_en: 'English',
      theme_lang_en_desc: 'English interface',
      theme_accent_title: 'Accent Color',
      theme_accent_desc: 'Identity color for buttons, highlights, header icons, and task indicators.',
      theme_custom_color_title: 'Custom Color',
      theme_custom_color_desc: 'Any Hex / Custom Color',
      theme_bg_title: 'Background Canvas',
      theme_bg_desc: 'Contrast depth and canvas background vibe behind the cards.',
      theme_radius_title: 'Corner Radius & Typography',
      theme_radius_desc: 'Adjust button/card curve styles and select your favorite typography.',
      theme_corner_radius: 'Corner Radius',
      theme_fonts: 'Typography / Font Choice',
      theme_extras_title: 'Visual Effects & Density',
      theme_extras_desc: 'Extra visual options to maximize your study comfort.',
      theme_glow_title: 'Ambient Glow Background',
      theme_glow_desc: 'Soft ambient glow gradient lighting across the application background.',
      theme_density_title: 'Layout Density',
      theme_density_desc: 'Choose between comfortable breathing space or compact density.',
      theme_density_comfortable: 'Comfortable',
      theme_density_compact: 'Compact',
      theme_saved_note: 'All personalizations are automatically saved to your device.',

      // Modal Card Form
      modal_create_title: 'Add New Content',
      modal_edit_title: 'Edit Content',
      modal_kind_label: 'Content Type',
      modal_kind_announcement: 'Class Announcement',
      modal_kind_subject: 'Subject Material / Task',
      modal_subject_label: 'Subject',
      modal_big_title_label: 'Main Title (Big Title)',
      modal_big_title_placeholder: 'Example: Chapter 3 Task — Quadratic Equations',
      modal_title_label: 'Subtitle / Chapter (Optional)',
      modal_title_placeholder: 'Example: Exercise Page 45 No. 1–10',
      modal_content_label: 'Full Content / Instructions',
      modal_content_placeholder: 'Write explanation, announcement details, or assignment instructions...',
      modal_small_label: 'Quick Note / Deadline',
      modal_small_placeholder: 'Example: Submit at teacher\'s desk',
      modal_due_label: 'Due Date & Time',
      modal_attachments_label: 'Attachments & Files (Cloudflare R2)',
      modal_has_task_label: 'Mark as Task (Can be completed)',
      modal_pinned_label: 'Pin to Top',
      modal_btn_cancel: 'Cancel',
      modal_btn_save: 'Save',
      modal_btn_saving: 'Saving...'
    }
  };

  let currentLang = DEFAULT_LANG;

  function initLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'id') {
        currentLang = saved;
      } else {
        // Also check theme settings for compatibility
        const themeRaw = localStorage.getItem('elearniz_theme_settings');
        if (themeRaw) {
          const parsed = JSON.parse(themeRaw);
          if (parsed && (parsed.lang === 'en' || parsed.lang === 'id')) {
            currentLang = parsed.lang;
          }
        }
      }
    } catch (_) {}
    document.documentElement.lang = currentLang;
  }

  function getLanguage() {
    return currentLang;
  }

  function t(key, fallback) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.id;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    const defaultDict = TRANSLATIONS.id;
    if (defaultDict && defaultDict[key] !== undefined) {
      return defaultDict[key];
    }
    return fallback !== undefined ? fallback : key;
  }

  function applyToDOM(root) {
    const container = root || document;
    container.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (text) {
        el.textContent = text;
      }
    });

    container.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = t(key);
      if (text) {
        el.setAttribute('placeholder', text);
      }
    });

    container.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const text = t(key);
      if (text) {
        el.setAttribute('title', text);
      }
    });
  }

  function setLanguage(lang, triggerEvents = true) {
    if (lang !== 'id' && lang !== 'en') return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
    document.documentElement.lang = lang;
    applyToDOM();

    if (triggerEvents) {
      window.dispatchEvent(new CustomEvent('elearniz:languagechange', { detail: { lang } }));
    }
  }

  function getDayName(dayNum) {
    return t(`day_${dayNum}`, 'Hari');
  }

  function getDayShort(dayNum) {
    return t(`day_short_${dayNum}`, 'Hari');
  }

  // Self-init on script evaluation
  initLanguage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyToDOM());
  } else {
    applyToDOM();
  }

  window.ELearnizI18n = {
    t,
    getLanguage,
    setLanguage,
    applyToDOM,
    getDayName,
    getDayShort,
    translations: TRANSLATIONS
  };
})();
