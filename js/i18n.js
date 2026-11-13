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
      // General App
      app_name: 'E-Learniz',
      app_version: 'v3.0',
      app_tagline: 'Portal Belajar Kelas',

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
      nav_bottom_subject: 'Mapel',
      nav_bottom_menu: 'Menu',
      nav_bottom_profile: 'Profil',

      // Header & Profile Dropdown
      header_greeting_prefix: 'Haii, ',
      header_guest_name: 'Mode Tamu',
      header_guest_role: 'Guest Read-Only',
      header_switch_class: 'Ganti Kelas',
      header_materials_menu: 'Materi Pembelajaran',
      header_tasks_menu: 'Progres Tugas Saya',
      header_theme_menu: 'Personalisasi Tema',
      header_visitors_menu: 'Pengunjung',
      header_install_app: 'Install Aplikasi',
      header_login: 'Masuk Akun',
      header_logout: 'Keluar Akun',
      header_theme_toggle_title: 'Ganti Tema',
      theme_mode_auto_label: 'Otomatis (Sistem)',
      theme_mode_dark_label: 'Mode Gelap',
      theme_mode_light_label: 'Mode Terang',

      // Home & Daily Card
      home_announcements_title: 'Pengumuman Kelas',
      home_btn_add_announcement: 'Buat Pengumuman',
      home_no_announcements_title: 'Belum Ada Pengumuman Kelas',
      home_no_announcements_desc: 'Belum ada pengumuman kelas untuk saat ini.',
      dc_task_shortcut: 'TUGAS',
      dc_task_shortcut_title: 'Lihat Daftar Tugas',
      dc_uniform: 'Seragam',
      dc_activity: 'Kegiatan',
      dc_notes: 'Catatan',
      dc_schedule: 'JADWAL PELAJARAN',
      dc_chores: 'JADWAL PIKET',
      dc_no_schedule: 'Belum ada jadwal pelajaran di hari ini.',
      dc_no_chores: 'Belum diatur',
      dc_today: 'Hari Ini',
      dc_tomorrow: 'Besok',
      dc_schedule_badge: 'Jadwal',
      dc_now: 'SEKARANG',
      dc_draft_unsaved: '(Draf belum disimpan)',

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
      tasks_all_class_tasks: 'Semua Tugas Kelas',
      tasks_btn_add: 'Tambah Tugas',
      tasks_search_placeholder: 'Cari tugas berdasarkan judul, bab, catatan, atau mapel...',
      tasks_filter_pending: 'Belum Selesai',
      tasks_filter_completed: 'Sudah Selesai',
      tasks_filter_all: 'Semua',
      tasks_chip_all_subjects: 'Semua Mapel',
      tasks_completed_summary: 'Tugas Selesai',
      tasks_profile_title: 'Progres Tugas Saya',
      tasks_profile_count_format: 'Kamu sudah menyelesaikan {completed} dari {total} tugas',
      tasks_profile_caption_start: 'Yuk mulai cicil tugasmu satu per satu biar makin ringan! 🚀',
      tasks_profile_caption_empty: 'Asyik! Belum ada tugas kelas yang aktif saat ini. 🎉',
      tasks_profile_caption_all_done: 'Luar biasa! Kamu sudah menyelesaikan semua tugas kelas! 🏆✨',
      tasks_profile_caption_half: 'Mantap! Lebih dari separuh tugas sudah beres, semangat! 💪',
      tasks_status_completed: 'Selesai',
      tasks_status_pending: 'Belum Selesai',
      tasks_empty_filter_title: 'Belum Ada Tugas di Filter Ini',
      tasks_empty_filter_desc: 'Coba ganti filter status atau pilih mata pelajaran lain.',
      tasks_empty_all_title: 'Belum Ada Tugas',
      tasks_empty_all_desc: 'Belum ada tugas kelas yang ditambahkan saat ini.',
      tasks_all_done_title: 'Semua Tugas Sudah Selesai! 🎉',
      tasks_all_done_desc: 'Kerja bagus! Kamu sudah menyelesaikan semua tugas kelas.',
      tasks_empty_done_title: 'Belum Ada Tugas Selesai',
      tasks_empty_done_desc: 'Tugas yang sudah kamu tandai selesai akan muncul di sini.',
      tasks_search_no_results: 'Tidak Ada Tugas Ditemukan',
      tasks_search_no_results_desc: 'Tidak ada tugas yang cocok dengan kata kunci "{query}".',

      // Materi (Study Materials Page)
      materials_page_title: 'Materi Pelajaran',
      materials_all_title: 'Semua Materi Pelajaran',
      materials_btn_add: 'Tambah Materi',
      materials_search_placeholder: 'Cari materi berdasarkan judul, bab, catatan, atau mapel...',
      materials_chip_all_subjects: 'Semua Mapel',
      materials_profile_title: 'Koleksi Materi Belajar',
      materials_profile_total_label: 'Total Materi',
      materials_profile_subjects_label: 'Mapel Aktif',
      materials_profile_caption_empty: 'Belum ada materi pembelajaran yang diunggah saat ini. Tetap semangat! 📚',
      materials_profile_caption_many: 'Banyak materi tersedia! Yuk perdalam pemahamanmu dengan membaca modul & catatan guru. 🌟',
      materials_profile_caption_normal: 'Jelajahi dan pelajari materi kelas dari semua mata pelajaran kapan saja! 📖',
      materials_empty_title: 'Belum Ada Materi Pembelajaran',
      materials_empty_desc: 'Materi yang diunggah oleh guru atau admin akan tampil di sini.',
      materials_search_no_results: 'Tidak Ada Materi Ditemukan',
      materials_search_no_results_desc: 'Tidak ada materi yang cocok dengan kata kunci "{query}".',

      // Subjects (Mapel Page)
      subjects_all_title: 'Semua Mata Pelajaran',
      subjects_search_placeholder: 'Cari nama mapel atau guru...',
      subjects_count_suffix: 'Mata Pelajaran',
      subjects_btn_add: 'Tambah Mapel',
      subjects_tab_all: 'Semua',
      subjects_tab_materials: 'Materi',
      subjects_tab_tasks: 'Tugas',
      subjects_teacher_label: 'Guru Pengampu',
      subjects_teacher_unset: 'Belum diisi',
      subjects_total_materials: 'Materi',
      subjects_total_tasks: 'Tugas',
      subjects_empty_subject_title: 'Belum Ada Konten di Mapel Ini',
      subjects_empty_subject_desc: 'Belum ada materi atau tugas yang ditambahkan untuk mapel ini.',
      subjects_empty_overview_title: 'Belum Ada Mata Pelajaran',
      subjects_empty_overview_desc: 'Mata pelajaran belum ditambahkan ke kelas ini.',
      subjects_completed_tasks_label: 'Tugas Tuntas',
      subjects_schedule_days_label: 'Jadwal Hari',
      subjects_btn_add_content: 'Tambah Materi / Tugas',

      // Course Cards & Tasks
      card_task_done: 'Selesai',
      card_task_mark_done: 'Tandai Selesai',
      card_task_tooltip_done: 'Klik untuk tandai belum selesai',
      card_task_tooltip_pending: 'Klik untuk tandai selesai',
      card_due_prefix: 'Tenggat',
      card_due_today: 'Tenggat Hari Ini',
      card_due_tomorrow: 'Tenggat Besok',
      due_overdue: 'Terlewat',
      due_urgent: 'Segera',
      card_pinned: 'Disematkan',
      card_attachment_label: 'Lampiran Materi',
      card_attachments_count: '{count} Berkas',
      card_btn_open: 'Buka Detail',

      // Modal Detail / Lightbox
      detail_task_status_title_done: 'Tugas Telah Selesai',
      detail_task_status_title_pending: 'Status Pengerjaan Tugas',
      detail_task_status_desc_done: 'Bagus! Progres tugasmu sudah tercatat selesai.',
      detail_task_status_desc_pending: 'Klik tombol di bawah setelah kamu menyelesaikan tugas.',
      detail_task_cta_done: 'Tandai Belum Selesai',
      detail_task_cta_pending: 'Tandai Selesai Sekarang',
      detail_attachments_title: 'Berkas & Lampiran',
      detail_notes_title: 'Catatan & Petunjuk',
      detail_subject_info: 'Informasi Mapel',
      detail_sheet_title: 'Detail Kartu & Tugas',
      detail_sheet_pill: 'Lihat Detail & Tugas',
      detail_close: 'Tutup',

      // Modal Card Form
      modal_create_title: 'Tambah Konten Baru',
      modal_edit_title: 'Edit Konten',
      modal_task_create_title: 'Tambah Tugas Baru',
      modal_material_create_title: 'Tambah Materi Pelajaran',
      modal_announcement_create_title: 'Tambah Pengumuman Kelas',
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
      modal_drop_text: 'Klik atau seret foto/berkas tugas ke sini',
      modal_has_task_label: 'Jadikan Tugas (Bisa Ditandai Selesai)',
      modal_pinned_label: 'Pin di Paling Atas',
      modal_btn_cancel: 'Batal',
      modal_btn_save: 'Simpan',
      modal_btn_saving: 'Menyimpan...',

      // Modal Subject Form
      modal_subject_create_title: 'Tambah Mata Pelajaran',
      modal_subject_edit_title: 'Edit Mata Pelajaran',
      modal_subject_name_label: 'Nama Mata Pelajaran',
      modal_subject_name_placeholder: 'Contoh: Matematika Wajib',
      modal_subject_teacher_label: 'Guru Pengampu',
      modal_subject_teacher_placeholder: 'Contoh: Ibu Rina, S.Pd.',
      modal_subject_color_label: 'Warna Aksen Mapel',
      modal_subject_icon_label: 'Ikon Mapel',

      // Modal Visitor
      visitor_title: 'Pengunjung',
      visitor_online_summary: 'Online Sekarang',
      visitor_total_visits: 'Total Kunjungan',
      visitor_tab_class: 'Pengunjung Kelas',
      visitor_tab_all: 'Semua Pengunjung',
      visitor_empty: 'Belum Ada Pengunjung',
      visitor_empty_desc: 'Daftar pengunjung kelas ini akan tampil di sini.',
      visitor_loading: 'Memuat pengunjung...',
      visitor_unit: 'pengunjung',
      visitor_recent_title: 'Pengunjung Terakhir',
      visitor_reset_btn: 'Bersihkan',

      // Theme / Personalization
      theme_page_title: 'Personalisasi & Tema',
      theme_page_subtitle: 'Sesuaikan aksen warna, mode tampilan, sudut tombol, bahasa, dan gaya latar belajar sesuai seleramu.',
      theme_btn_reset: 'Reset Standar',
      theme_preview_title: 'Pratinjau Langsung',
      theme_preview_subtitle: 'Sentuh dan coba langsung elemen di bawah ini untuk melihat aksen baru secara interaktif!',
      theme_preview_now: 'SEKARANG',
      theme_preview_schedule_title: 'Jadwal Pelajaran Kelas',
      theme_preview_subject_name: 'Pemrograman Web & Perangkat Bergerak',
      theme_preview_course_tag: 'Desain UI/UX & Tema',
      theme_preview_course_title: 'Kustomisasi Aksen & Personalisasi Tema',
      theme_preview_course_desc: 'Sentuh tombol "Tandai Selesai" di bawah untuk melihat animasi feedback.',
      theme_preview_due_sample: 'Besok 23:59',
      theme_preview_primary_action: 'Aksi Utama',
      theme_preview_secondary_action: 'Batal',
      theme_preview_chip_active: 'Chip Aktif',
      theme_mode_title: 'Mode Tampilan',
      theme_mode_desc: 'Pilih pencahayaan yang paling pas untuk mata dan lingkungan belajarmu.',
      theme_mode_auto: 'Otomatis',
      theme_mode_auto_desc: 'Sistem',
      theme_mode_light: 'Terang',
      theme_mode_light_desc: 'Cerah & bersih untuk siang hari',
      theme_mode_dark: 'Gelap',
      theme_mode_dark_desc: 'Teduh & nyaman untuk malam hari',
      theme_default_badge: 'Bawaan',
      theme_active_prefix: 'Aktif: ',
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
      theme_density_title: 'Kerapatan Tampilan (Density)',
      theme_density_desc: 'Pilih tampilan nyaman berspasi lega atau mode ringkas/padat.',
      theme_density_comfortable: 'Nyaman',
      theme_density_compact: 'Ringkas',
      theme_saved_note: 'Semua personalisasi tersimpan otomatis di perangkatmu.',

      // Toasts
      toast_task_done: 'Tugas ditandai selesai! 🎉',
      toast_task_undone: 'Status tugas dikembalikan ke belum selesai.',
      toast_theme_reset: 'Tema dan personalisasi telah dikembalikan ke standar! ✨',
      toast_lang_changed_en: 'Language switched to English! 🇬🇧',
      toast_lang_changed_id: 'Bahasa diubah ke Bahasa Indonesia! 🇮🇩',
      toast_accent_changed: 'Aksen warna diubah ke {name}! ✨',
      toast_login_required_task: 'Masuk sebagai siswa dulu supaya progres tugasmu tersimpan.',
      toast_task_save_error: 'Gagal menyimpan progres tugas: ',
      toast_mode_dark: 'Mode Gelap diaktifkan 🌙',
      toast_mode_light: 'Mode Terang diaktifkan ☀️',
      toast_mode_auto: 'Mode Otomatis Sistem diaktifkan 💻 ({status})',
      confirm_reset_theme: 'Kembalikan semua warna, mode, dan tata letak tema ke setelan standar E-Learniz?',

      // Extra Roles & Badges
      user_role_admin: 'Admin Kelas',
      user_role_student: 'Siswa Aktif',
      detail_type_task: 'Tugas Kelas',
      detail_type_materi: 'Materi Pelajaran',
      detail_type_announcement: 'Pengumuman',
      subj_overview_available: 'Mapel Tersedia',
      subj_empty_title: 'Belum Ada Mata Pelajaran',
      subj_empty_desc: 'Mata pelajaran untuk kelas ini belum ditambahkan.',
      subj_search_no_results: 'Mapel Tidak Ditemukan',
      subj_search_no_results_desc: 'Tidak ada mapel/guru yang cocok dengan kata kunci tersebut.',
      subj_default_teacher: 'Guru Pengajar',
      subj_stat_content: 'Konten Mapel',
      subj_stat_tasks: 'Tugas Aktif',
      subj_feed_heading: 'Materi & Tugas',
      subj_locked: 'TERKUNCI',
      subj_no_teacher: 'Guru Pengajar Belum Diatur',
      subj_chat_teacher: 'Chat Guru',
      subj_schedule_independent: 'Mandiri',
      subj_content_count_suffix: 'Konten',
      subj_tasks_count_suffix: 'Tugas',
      subj_materi_only: 'Materi Pembelajaran Saja',
      subj_progress_tasks: 'Tuntas {completed} dari {total} Tugas ({pct}%)',
      subj_caption_no_tasks: 'Belum ada tugas untuk mapel ini. Pelajari materi yang ada ya!',
      subj_caption_all_done: 'Hebat! Semua tugas di mapel ini sudah selesai kamu kerjakan!',
      subj_caption_pending_tasks: 'Masih ada {count} tugas aktif. Yuk selesaikan tepat waktu!',
      subj_empty_feed_title: 'Belum Ada Materi di {subject}',
      subj_empty_feed_desc: 'Materi pelajaran, rangkuman, atau latihan tugas akan tampil di sini.'
    },

    en: {
      // General App
      app_name: 'E-Learniz',
      app_version: 'v3.0',
      app_tagline: 'Class Learning Portal',

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
      nav_bottom_subject: 'Subjects',
      nav_bottom_menu: 'Menu',
      nav_bottom_profile: 'Profile',

      // Header & Profile Dropdown
      header_greeting_prefix: 'Hii, ',
      header_guest_name: 'Guest Mode',
      header_guest_role: 'Guest Read-Only',
      header_switch_class: 'Switch Class',
      header_materials_menu: 'Learning Materials',
      header_tasks_menu: 'My Task Progress',
      header_theme_menu: 'Theme Personalization',
      header_visitors_menu: 'Visitors',
      header_install_app: 'Install App',
      header_login: 'Sign In',
      header_logout: 'Sign Out',
      header_theme_toggle_title: 'Toggle Theme',
      theme_mode_auto_label: 'Auto (System)',
      theme_mode_dark_label: 'Dark Mode',
      theme_mode_light_label: 'Light Mode',

      // Home & Daily Card
      home_announcements_title: 'Class Announcements',
      home_btn_add_announcement: 'New Announcement',
      home_no_announcements_title: 'No Class Announcements',
      home_no_announcements_desc: 'There are no class announcements at this time.',
      dc_task_shortcut: 'TASKS',
      dc_task_shortcut_title: 'View Task List',
      dc_uniform: 'Uniform',
      dc_activity: 'Activity',
      dc_notes: 'Notes',
      dc_schedule: 'CLASS SCHEDULE',
      dc_chores: 'CLEANING DUTY',
      dc_no_schedule: 'No class schedule for today.',
      dc_no_chores: 'Not assigned',
      dc_today: 'Today',
      dc_tomorrow: 'Tomorrow',
      dc_schedule_badge: 'Schedule',
      dc_now: 'NOW',
      dc_draft_unsaved: '(Unsaved draft)',

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
      tasks_all_class_tasks: 'All Class Tasks',
      tasks_btn_add: 'Add Task',
      tasks_search_placeholder: 'Search tasks by title, chapter, notes, or subject...',
      tasks_filter_pending: 'Pending',
      tasks_filter_completed: 'Completed',
      tasks_filter_all: 'All',
      tasks_chip_all_subjects: 'All Subjects',
      tasks_completed_summary: 'Completed Tasks',
      tasks_profile_title: 'My Task Progress',
      tasks_profile_count_format: 'You have completed {completed} of {total} tasks',
      tasks_profile_caption_start: 'Let\'s tackle your tasks one by one to keep it light! 🚀',
      tasks_profile_caption_empty: 'Awesome! No active class tasks right now. 🎉',
      tasks_profile_caption_all_done: 'Outstanding! You have completed all class tasks! 🏆✨',
      tasks_profile_caption_half: 'Great work! More than half of tasks are done, keep going! 💪',
      tasks_status_completed: 'Done',
      tasks_status_pending: 'Pending',
      tasks_empty_filter_title: 'No Tasks in this Filter',
      tasks_empty_filter_desc: 'Try changing the status filter or select another subject.',
      tasks_empty_all_title: 'No Tasks Found',
      tasks_empty_all_desc: 'No class tasks have been added yet.',
      tasks_all_done_title: 'All Tasks Completed! 🎉',
      tasks_all_done_desc: 'Great job! You have finished all class assignments.',
      tasks_empty_done_title: 'No Completed Tasks',
      tasks_empty_done_desc: 'Tasks you mark as completed will appear here.',
      tasks_search_no_results: 'No Tasks Found',
      tasks_search_no_results_desc: 'No tasks matched your search keyword "{query}".',

      // Materi (Study Materials Page)
      materials_page_title: 'Study Materials',
      materials_all_title: 'All Study Materials',
      materials_btn_add: 'Add Material',
      materials_search_placeholder: 'Search materials by title, chapter, notes, or subject...',
      materials_chip_all_subjects: 'All Subjects',
      materials_profile_title: 'Study Material Collection',
      materials_profile_total_label: 'Total Materials',
      materials_profile_subjects_label: 'Active Subjects',
      materials_profile_caption_empty: 'No study materials uploaded yet. Stay motivated! 📚',
      materials_profile_caption_many: 'Plenty of materials available! Deepen your understanding with modules and notes. 🌟',
      materials_profile_caption_normal: 'Explore and learn class materials from all subjects anytime! 📖',
      materials_empty_title: 'No Study Materials',
      materials_empty_desc: 'Materials uploaded by teachers or admins will appear here.',
      materials_search_no_results: 'No Materials Found',
      materials_search_no_results_desc: 'No materials matched your search keyword "{query}".',

      // Subjects (Mapel Page)
      subjects_all_title: 'All Subjects',
      subjects_search_placeholder: 'Search subject or teacher name...',
      subjects_count_suffix: 'Subjects',
      subjects_btn_add: 'Add Subject',
      subjects_tab_all: 'All',
      subjects_tab_materials: 'Materials',
      subjects_tab_tasks: 'Tasks',
      subjects_teacher_label: 'Subject Teacher',
      subjects_teacher_unset: 'Not set',
      subjects_total_materials: 'Materials',
      subjects_total_tasks: 'Tasks',
      subjects_empty_subject_title: 'No Content in this Subject',
      subjects_empty_subject_desc: 'No materials or tasks have been added for this subject yet.',
      subjects_empty_overview_title: 'No Subjects Found',
      subjects_empty_overview_desc: 'No subjects have been added to this class yet.',
      subjects_completed_tasks_label: 'Tasks Done',
      subjects_schedule_days_label: 'Schedule Days',
      subjects_btn_add_content: 'Add Material / Task',

      // Course Cards & Tasks
      card_task_done: 'Done',
      card_task_mark_done: 'Mark as Done',
      card_task_tooltip_done: 'Click to mark as incomplete',
      card_task_tooltip_pending: 'Click to mark as completed',
      card_due_prefix: 'Due',
      card_due_today: 'Due Today',
      card_due_tomorrow: 'Due Tomorrow',
      due_overdue: 'Overdue',
      due_urgent: 'Due Soon',
      card_pinned: 'Pinned',
      card_attachment_label: 'Material Attachment',
      card_attachments_count: '{count} Files',
      card_btn_open: 'View Details',

      // Modal Detail / Lightbox
      detail_task_status_title_done: 'Task Completed',
      detail_task_status_title_pending: 'Task Progress Status',
      detail_task_status_desc_done: 'Awesome! Your task progress is marked as completed.',
      detail_task_status_desc_pending: 'Click the button below after completing the assignment.',
      detail_task_cta_done: 'Mark as Incomplete',
      detail_task_cta_pending: 'Mark as Completed Now',
      detail_attachments_title: 'Files & Attachments',
      detail_notes_title: 'Notes & Instructions',
      detail_subject_info: 'Subject Info',
      detail_sheet_title: 'Card & Task Details',
      detail_sheet_pill: 'View Details & Task',
      detail_close: 'Close',

      // Modal Card Form
      modal_create_title: 'Add New Content',
      modal_edit_title: 'Edit Content',
      modal_task_create_title: 'Add New Task',
      modal_material_create_title: 'Add Study Material',
      modal_announcement_create_title: 'Add Class Announcement',
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
      modal_drop_text: 'Click or drag files/photos here',
      modal_has_task_label: 'Mark as Task (Can be completed)',
      modal_pinned_label: 'Pin to Top',
      modal_btn_cancel: 'Cancel',
      modal_btn_save: 'Save',
      modal_btn_saving: 'Saving...',

      // Modal Subject Form
      modal_subject_create_title: 'Add Subject',
      modal_subject_edit_title: 'Edit Subject',
      modal_subject_name_label: 'Subject Name',
      modal_subject_name_placeholder: 'Example: Mathematics',
      modal_subject_teacher_label: 'Subject Teacher',
      modal_subject_teacher_placeholder: 'Example: Mrs. Smith',
      modal_subject_color_label: 'Subject Accent Color',
      modal_subject_icon_label: 'Subject Icon',

      // Modal Visitor
      visitor_title: 'Visitors',
      visitor_online_summary: 'Online Now',
      visitor_total_visits: 'Total Visits',
      visitor_tab_class: 'Class Visitors',
      visitor_tab_all: 'All Visitors',
      visitor_empty: 'No Visitors Yet',
      visitor_empty_desc: 'Visitor records for this class will appear here.',
      visitor_loading: 'Loading visitors...',
      visitor_unit: 'visitors',
      visitor_recent_title: 'Recent Visitors',
      visitor_reset_btn: 'Clear',

      // Theme / Personalization
      theme_page_title: 'Personalization & Theme',
      theme_page_subtitle: 'Customize accent colors, theme modes, button styles, language, and study canvas to your liking.',
      theme_btn_reset: 'Reset to Default',
      theme_preview_title: 'Live Preview',
      theme_preview_subtitle: 'Interact with the elements below to preview the accent styles live!',
      theme_preview_now: 'NOW',
      theme_preview_schedule_title: 'Class Schedule',
      theme_preview_subject_name: 'Web & Mobile Application Programming',
      theme_preview_course_tag: 'UI/UX Design & Theme',
      theme_preview_course_title: 'Accent Customization & Theme Personalization',
      theme_preview_course_desc: 'Tap "Mark as Done" below to see interactive feedback.',
      theme_preview_due_sample: 'Tomorrow 23:59',
      theme_preview_primary_action: 'Primary Action',
      theme_preview_secondary_action: 'Cancel',
      theme_preview_chip_active: 'Active Chip',
      theme_mode_title: 'Display Mode',
      theme_mode_desc: 'Choose the lighting that best fits your eyes and study environment.',
      theme_mode_auto: 'Auto',
      theme_mode_auto_desc: 'System',
      theme_mode_light: 'Light',
      theme_mode_light_desc: 'Bright & clean for daytime',
      theme_mode_dark: 'Dark',
      theme_mode_dark_desc: 'Gentle & cool for nighttime',
      theme_default_badge: 'Default',
      theme_active_prefix: 'Active: ',
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

      // Toasts
      toast_task_done: 'Task marked as completed! 🎉',
      toast_task_undone: 'Task marked as incomplete.',
      toast_theme_reset: 'Theme and personalization reset to default! ✨',
      toast_lang_changed_en: 'Language switched to English! 🇬🇧',
      toast_lang_changed_id: 'Bahasa diubah ke Bahasa Indonesia! 🇮🇩',
      toast_accent_changed: 'Accent color changed to {name}! ✨',
      toast_login_required_task: 'Please log in as a student to save your task progress.',
      toast_task_save_error: 'Failed to save task progress: ',
      toast_mode_dark: 'Dark Mode activated 🌙',
      toast_mode_light: 'Light Mode activated ☀️',
      toast_mode_auto: 'System Auto Mode activated 💻 ({status})',
      confirm_reset_theme: 'Reset all theme colors, display modes, and layout to E-Learniz defaults?',

      // Extra Roles & Badges
      user_role_admin: 'Class Admin',
      user_role_student: 'Student',
      detail_type_task: 'Class Task',
      detail_type_materi: 'Subject Material',
      detail_type_announcement: 'Announcement',
      subj_overview_available: 'Subjects Available',
      subj_empty_title: 'No Subjects Found',
      subj_empty_desc: 'No subjects have been added to this class yet.',
      subj_search_no_results: 'No Subjects Found',
      subj_search_no_results_desc: 'No subjects or teachers matched your search keyword.',
      subj_default_teacher: 'Teacher',
      subj_stat_content: 'Content',
      subj_stat_tasks: 'Active Tasks',
      subj_feed_heading: 'Materials & Tasks',
      subj_locked: 'LOCKED',
      subj_no_teacher: 'Teacher Not Set',
      subj_chat_teacher: 'Chat Teacher',
      subj_schedule_independent: 'Self-study',
      subj_content_count_suffix: 'Items',
      subj_tasks_count_suffix: 'Tasks',
      subj_materi_only: 'Study Materials Only',
      subj_progress_tasks: 'Completed {completed} of {total} Tasks ({pct}%)',
      subj_caption_no_tasks: 'No tasks for this subject yet. Explore the materials!',
      subj_caption_all_done: 'Great job! You completed all tasks in this subject!',
      subj_caption_pending_tasks: 'There are still {count} active tasks. Complete them on time!',
      subj_empty_feed_title: 'No Content in {subject}',
      subj_empty_feed_desc: 'Class materials, summaries, or assignments will appear here.'
    }
  };

  let currentLang = DEFAULT_LANG;

  function initLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'id') {
        currentLang = saved;
      } else {
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

  function format(key, params = {}, fallback) {
    let str = t(key, fallback);
    if (!str) return '';
    Object.keys(params).forEach((paramKey) => {
      str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
    });
    return str;
  }

  function applyToDOM(root) {
    const container = root || document;

    container.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (!text) return;

      // If element has an icon or badge child, preserve it
      const icon = el.querySelector('i');
      if (icon && el.childNodes.length > 1) {
        const span = el.querySelector('span:not(.sidebar-badge):not(.visitor-count-badge):not(.badge)');
        if (span && span.parentNode === el) {
          span.textContent = text;
        } else {
          let foundTextNode = false;
          el.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
              node.nodeValue = ' ' + text;
              foundTextNode = true;
            }
          });
          if (!foundTextNode) {
            el.innerHTML = icon.outerHTML + ' ' + text;
          }
        }
      } else {
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

    container.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      const text = t(key);
      if (text) {
        el.setAttribute('aria-label', text);
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
    format,
    getLanguage,
    setLanguage,
    applyToDOM,
    getDayName,
    getDayShort,
    translations: TRANSLATIONS
  };
})();
