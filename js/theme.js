/* ==========================================================================
   js/theme.js — E-Learniz v3 Personalization & Theme Engine
   Handles:
   - Light / Dark / Auto (System) Theme Modes
   - 7 Curated Accent Color Presets + Any Custom Hex Color Picker
   - Dynamic Background Vibes (Midnight, OLED Black, Cyber Slate, Charcoal,
     Cool Breeze, Pure Snow, Warm Latte, Pastel Mint)
   - Corner Radius / Border Radius Variations (Playful, Minimal, Pill)
   - Font Selection (Plus Jakarta Sans, Fredoka, JetBrains Mono)
   - Layout Density (Comfortable vs Compact) & Ambient Glow Toggle
   - Real-time Synchronous Booting & Instant Live Preview
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'elearniz_theme_settings';
  const COMPAT_THEME_KEY = 'elearniz_theme';

  const DEFAULT_SETTINGS = {
    mode: 'auto', // 'dark' | 'light' | 'auto' (Default: otomatis sistem)
    version: 3,
    lang: 'id',   // 'id' | 'en'
    accent: 'blue', // 'blue' | 'mint' | 'violet' | 'amber' | 'rose' | 'cyber' | 'ruby' | 'custom'
    customAccentHex: '#2563eb',
    bgStyleDark: 'midnight', // 'midnight' | 'oled' | 'slate' | 'charcoal'
    bgStyleLight: 'breeze',   // 'breeze' | 'snow' | 'latte' | 'mint'
    radius: 'playful', // 'playful' | 'minimal' | 'pill'
    font: 'plus-jakarta', // 'plus-jakarta' | 'poppins' | 'quicksand' | 'fredoka' | 'outfit' | 'lexend' | 'inter' | 'jetbrains'
    ambientGlow: true,
    density: 'comfortable' // 'comfortable' | 'compact'
  };

  const ACCENT_PRESETS = {
    blue: {
      key: 'blue',
      name: 'Sky Blue',
      desc: 'Default E-Learniz',
      dot: '#38bdf8',
      light: {
        accent: '#2563eb',
        accentLight: '#38bdf8',
        accentSoft: '#dbeafe',
        accentGradient: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
        accentGlow: 'rgba(37, 99, 235, 0.14)',
        shadowAccent: 'rgba(37, 99, 235, 0.22)'
      },
      dark: {
        accent: '#38bdf8',
        accentLight: '#7dd3fc',
        accentSoft: 'rgba(56, 189, 248, 0.16)',
        accentGradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
        accentGlow: 'rgba(56, 189, 248, 0.08)',
        shadowAccent: 'rgba(56, 189, 248, 0.28)'
      }
    },
    mint: {
      key: 'mint',
      name: 'Fresh Mint',
      desc: 'Segar & Menenangkan',
      dot: '#10b981',
      light: {
        accent: '#059669',
        accentLight: '#10b981',
        accentSoft: '#d1fae5',
        accentGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        accentGlow: 'rgba(16, 185, 129, 0.14)',
        shadowAccent: 'rgba(16, 185, 129, 0.22)'
      },
      dark: {
        accent: '#34d399',
        accentLight: '#6ee7b7',
        accentSoft: 'rgba(52, 211, 153, 0.16)',
        accentGradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
        accentGlow: 'rgba(52, 211, 153, 0.08)',
        shadowAccent: 'rgba(52, 211, 153, 0.28)'
      }
    },
    violet: {
      key: 'violet',
      name: 'Playful Violet',
      desc: 'Kreatif & Elegan',
      dot: '#8b5cf6',
      light: {
        accent: '#7c3aed',
        accentLight: '#8b5cf6',
        accentSoft: '#ede9fe',
        accentGradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
        accentGlow: 'rgba(139, 92, 246, 0.14)',
        shadowAccent: 'rgba(139, 92, 246, 0.22)'
      },
      dark: {
        accent: '#a78bfa',
        accentLight: '#c4b5fd',
        accentSoft: 'rgba(167, 139, 250, 0.16)',
        accentGradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
        accentGlow: 'rgba(167, 139, 250, 0.08)',
        shadowAccent: 'rgba(167, 139, 250, 0.28)'
      }
    },
    amber: {
      key: 'amber',
      name: 'Sunny Amber',
      desc: 'Ceria & Hangat',
      dot: '#f59e0b',
      light: {
        accent: '#d97706',
        accentLight: '#f59e0b',
        accentSoft: '#fef3c7',
        accentGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
        accentGlow: 'rgba(245, 158, 11, 0.14)',
        shadowAccent: 'rgba(245, 158, 11, 0.22)'
      },
      dark: {
        accent: '#fbbf24',
        accentLight: '#fde68a',
        accentSoft: 'rgba(251, 191, 36, 0.16)',
        accentGradient: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)',
        accentGlow: 'rgba(251, 191, 36, 0.08)',
        shadowAccent: 'rgba(251, 191, 36, 0.28)'
      }
    },
    rose: {
      key: 'rose',
      name: 'Coral Rose',
      desc: 'Hangat & Manis',
      dot: '#f43f5e',
      light: {
        accent: '#e11d48',
        accentLight: '#f43f5e',
        accentSoft: '#ffe4e6',
        accentGradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
        accentGlow: 'rgba(244, 63, 94, 0.14)',
        shadowAccent: 'rgba(244, 63, 94, 0.22)'
      },
      dark: {
        accent: '#fb7185',
        accentLight: '#fda4af',
        accentSoft: 'rgba(251, 113, 133, 0.16)',
        accentGradient: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)',
        accentGlow: 'rgba(251, 113, 133, 0.08)',
        shadowAccent: 'rgba(251, 113, 133, 0.28)'
      }
    },
    cyber: {
      key: 'cyber',
      name: 'Neon Cyber',
      desc: 'Teal & Futuristik',
      dot: '#06b6d4',
      light: {
        accent: '#0891b2',
        accentLight: '#06b6d4',
        accentSoft: '#cffafe',
        accentGradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
        accentGlow: 'rgba(6, 182, 212, 0.14)',
        shadowAccent: 'rgba(6, 182, 212, 0.22)'
      },
      dark: {
        accent: '#22d3ee',
        accentLight: '#67e8f9',
        accentSoft: 'rgba(34, 211, 238, 0.16)',
        accentGradient: 'linear-gradient(135deg, #0e7490 0%, #22d3ee 100%)',
        accentGlow: 'rgba(34, 211, 238, 0.08)',
        shadowAccent: 'rgba(34, 211, 238, 0.28)'
      }
    },
    ruby: {
      key: 'ruby',
      name: 'Crimson Ruby',
      desc: 'Tegas & Kontras',
      dot: '#ef4444',
      light: {
        accent: '#dc2626',
        accentLight: '#ef4444',
        accentSoft: '#fee2e2',
        accentGradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        accentGlow: 'rgba(239, 68, 68, 0.14)',
        shadowAccent: 'rgba(239, 68, 68, 0.22)'
      },
      dark: {
        accent: '#f87171',
        accentLight: '#fca5a5',
        accentSoft: 'rgba(248, 113, 113, 0.16)',
        accentGradient: 'linear-gradient(135deg, #b91c1c 0%, #f87171 100%)',
        accentGlow: 'rgba(248, 113, 113, 0.08)',
        shadowAccent: 'rgba(248, 113, 113, 0.28)'
      }
    }
  };

  const BG_STYLES = {
    dark: {
      midnight: {
        name: 'Midnight Navy',
        desc: 'Default v3, biru gelap elegan',
        dot: '#0a0e17',
        vars: {
          '--bg-page': '#0a0e17',
          '--bg-surface': '#121826',
          '--bg-subtle': '#1a2337',
          '--bg-muted': '#151d2e',
          '--input-bg': '#162036',
          '--input-border': 'rgba(255, 255, 255, 0.14)',
          '--border-color': 'rgba(255, 255, 255, 0.08)',
          '--border-strong': 'rgba(255, 255, 255, 0.16)'
        }
      },
      oled: {
        name: 'OLED Pure Black',
        desc: 'Hitam pekat, hemat daya AMOLED',
        dot: '#000000',
        vars: {
          '--bg-page': '#000000',
          '--bg-surface': '#0a0a0c',
          '--bg-subtle': '#141418',
          '--bg-muted': '#101014',
          '--input-bg': '#111115',
          '--input-border': 'rgba(255, 255, 255, 0.18)',
          '--border-color': 'rgba(255, 255, 255, 0.12)',
          '--border-strong': 'rgba(255, 255, 255, 0.22)'
        }
      },
      slate: {
        name: 'Cyber Slate',
        desc: 'Nuansa abu-abu biru sejuk',
        dot: '#0f172a',
        vars: {
          '--bg-page': '#0b1120',
          '--bg-surface': '#131d31',
          '--bg-subtle': '#1e293b',
          '--bg-muted': '#17233a',
          '--input-bg': '#17243c',
          '--input-border': 'rgba(255, 255, 255, 0.15)',
          '--border-color': 'rgba(255, 255, 255, 0.09)',
          '--border-strong': 'rgba(255, 255, 255, 0.18)'
        }
      },
      charcoal: {
        name: 'Warm Charcoal',
        desc: 'Nuansa arang netral dan lembut',
        dot: '#18181b',
        vars: {
          '--bg-page': '#101012',
          '--bg-surface': '#18181b',
          '--bg-subtle': '#27272a',
          '--bg-muted': '#202024',
          '--input-bg': '#222226',
          '--input-border': 'rgba(255, 255, 255, 0.14)',
          '--border-color': 'rgba(255, 255, 255, 0.08)',
          '--border-strong': 'rgba(255, 255, 255, 0.16)'
        }
      }
    },
    light: {
      breeze: {
        name: 'Cool Breeze',
        desc: 'Default v3, biru langit sangat lembut',
        dot: '#f3f7ff',
        vars: {
          '--bg-page': '#f3f7ff',
          '--bg-surface': '#ffffff',
          '--bg-subtle': '#eef4ff',
          '--bg-muted': '#f8fafc',
          '--input-bg': '#ffffff',
          '--input-border': '#cbd5e1',
          '--border-color': '#e2e8f0',
          '--border-strong': '#cbd5e1'
        }
      },
      snow: {
        name: 'Pure Snow',
        desc: 'Putih salju bersih & minimalis',
        dot: '#f8fafc',
        vars: {
          '--bg-page': '#f8fafc',
          '--bg-surface': '#ffffff',
          '--bg-subtle': '#f1f5f9',
          '--bg-muted': '#e2e8f0',
          '--input-bg': '#ffffff',
          '--input-border': '#cbd5e1',
          '--border-color': '#e2e8f0',
          '--border-strong': '#94a3b8'
        }
      },
      latte: {
        name: 'Warm Paper',
        desc: 'Krem hangat, nyaman untuk membaca',
        dot: '#faf7f2',
        vars: {
          '--bg-page': '#faf7f2',
          '--bg-surface': '#ffffff',
          '--bg-subtle': '#f4efe6',
          '--bg-muted': '#ece5d8',
          '--input-bg': '#ffffff',
          '--input-border': '#d6cbbe',
          '--border-color': '#e6decfe0',
          '--border-strong': '#c5b7a5'
        }
      },
      mint: {
        name: 'Pastel Mint',
        desc: 'Sentuhan mint pastel menyejukkan',
        dot: '#f0fdf4',
        vars: {
          '--bg-page': '#f0fdf4',
          '--bg-surface': '#ffffff',
          '--bg-subtle': '#dcfce7',
          '--bg-muted': '#bbf7d0',
          '--input-bg': '#ffffff',
          '--input-border': '#a7f3d0',
          '--border-color': '#d1fae5',
          '--border-strong': '#6ee7b7'
        }
      }
    }
  };

  const RADIUS_PRESETS = {
    playful: {
      name: 'Playful (Default)',
      desc: 'Kurva ramah khas E-Learniz (16px)',
      vars: {
        '--radius-sm': '10px',
        '--radius-md': '16px',
        '--radius-lg': '22px'
      }
    },
    minimal: {
      name: 'Modern Minimal',
      desc: 'Sudut lebih tegas & rapi (10px)',
      vars: {
        '--radius-sm': '6px',
        '--radius-md': '10px',
        '--radius-lg': '14px'
      }
    },
    pill: {
      name: 'Super Smooth (Pill)',
      desc: 'Ekstra membulat & modern (22px)',
      vars: {
        '--radius-sm': '14px',
        '--radius-md': '22px',
        '--radius-lg': '30px'
      }
    }
  };

  const FONT_PRESETS = {
    'plus-jakarta': {
      name: 'Plus Jakarta Sans',
      desc: 'Modern, proporsional & terbaca jelas',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    'poppins': {
      name: 'Poppins',
      desc: 'Geometris rapi, populer & elegan',
      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    'quicksand': {
      name: 'Quicksand',
      desc: 'Membulat lembut, hangat & estetik',
      fontFamily: "'Quicksand', sans-serif"
    },
    'fredoka': {
      name: 'Fredoka Playful',
      desc: 'Ceria, santai & ramah anak muda',
      fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif"
    },
    'outfit': {
      name: 'Outfit Modern',
      desc: 'Futuristik, minimalis & tajam',
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    'lexend': {
      name: 'Lexend Reader',
      desc: 'Didesain khusus kenyamanan membaca',
      fontFamily: "'Lexend', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    'inter': {
      name: 'Inter Clean',
      desc: 'Standar aplikasi global, jernih & netral',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    'jetbrains': {
      name: 'JetBrains Mono',
      desc: 'Techy monospace, khas anak koding RPL',
      fontFamily: "'JetBrains Mono', monospace"
    }
  };

  /* ------------------------------------------------------------------------
     COLOR MATH HELPERS (Hex to RGB, Tint, Shade, Custom Accent)
     ------------------------------------------------------------------------ */
  function hexToRgb(hex) {
    let clean = String(hex || '').trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      return { r: 37, g: 99, b: 235 };
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHex(r, g, b) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('');
  }

  function adjustBrightness(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const factor = percent / 100;
    if (factor > 0) {
      return rgbToHex(
        r + (255 - r) * factor,
        g + (255 - g) * factor,
        b + (255 - b) * factor
      );
    }
    return rgbToHex(
      r * (1 + factor),
      g * (1 + factor),
      b * (1 + factor)
    );
  }

  function computeCustomAccent(hex, isDark) {
    const cleanHex = String(hex || '').trim().startsWith('#') ? hex : '#' + hex;
    const { r, g, b } = hexToRgb(cleanHex);

    if (isDark) {
      const brightened = adjustBrightness(cleanHex, 24);
      const lighter = adjustBrightness(cleanHex, 45);
      return {
        accent: brightened,
        accentLight: lighter,
        accentSoft: `rgba(${r}, ${g}, ${b}, 0.20)`,
        accentGradient: `linear-gradient(135deg, ${cleanHex} 0%, ${brightened} 100%)`,
        accentGlow: `rgba(${r}, ${g}, ${b}, 0.10)`,
        shadowAccent: `rgba(${r}, ${g}, ${b}, 0.32)`
      };
    }

    const darker = adjustBrightness(cleanHex, -14);
    const lighter = adjustBrightness(cleanHex, 20);
    return {
      accent: cleanHex,
      accentLight: lighter,
      accentSoft: `rgba(${r}, ${g}, ${b}, 0.12)`,
      accentGradient: `linear-gradient(135deg, ${darker} 0%, ${cleanHex} 100%)`,
      accentGlow: `rgba(${r}, ${g}, ${b}, 0.14)`,
      shadowAccent: `rgba(${r}, ${g}, ${b}, 0.22)`
    };
  }

  function t(key, fallback) {
    if (window.ELearnizI18n && typeof window.ELearnizI18n.t === 'function') {
      return window.ELearnizI18n.t(key, fallback);
    }
    return fallback !== undefined ? fallback : key;
  }

  /* ------------------------------------------------------------------------
     STATE MANAGEMENT (Load, Save, Resolve)
     ------------------------------------------------------------------------ */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.version || parsed.version < 3) {
          parsed.version = 3;
          if (!parsed.lang) {
            parsed.lang = (window.ELearnizI18n && window.ELearnizI18n.getLanguage()) || 'id';
          }
          saveSettings(parsed);
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (_) {}

    const initLang = (window.ELearnizI18n && window.ELearnizI18n.getLanguage()) || 'id';
    return { ...DEFAULT_SETTINGS, mode: 'auto', lang: initLang, version: 3 };
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {}
  }

  function getSystemMode() {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function resolveEffectiveMode(mode) {
    if (mode === 'auto' || !mode) {
      return getSystemMode();
    }
    return mode === 'light' ? 'light' : 'dark';
  }

  let currentSettings = loadSettings();

  /* ------------------------------------------------------------------------
     APPLY THEME TO DOM
     ------------------------------------------------------------------------ */
  function applyTheme(settingsToApply) {
    const s = settingsToApply || currentSettings;
    const effectiveMode = resolveEffectiveMode(s.mode);
    const isDark = effectiveMode === 'dark';

    const root = document.documentElement;

    // 1. Data attributes
    root.setAttribute('data-theme', effectiveMode);
    root.setAttribute('data-theme-mode', s.mode);
    root.setAttribute('data-accent', s.accent);
    root.setAttribute('data-radius', s.radius);
    root.setAttribute('data-font', s.font);
    root.setAttribute('data-density', s.density);
    root.setAttribute('data-ambient-glow', String(Boolean(s.ambientGlow)));

    const bgStyleKey = isDark ? (s.bgStyleDark || 'midnight') : (s.bgStyleLight || 'breeze');
    root.setAttribute('data-bg-style', bgStyleKey);

    // 2. Resolve Accent Variables
    let accentVars = null;
    if (s.accent === 'custom' && s.customAccentHex) {
      accentVars = computeCustomAccent(s.customAccentHex, isDark);
    } else {
      const preset = ACCENT_PRESETS[s.accent] || ACCENT_PRESETS.blue;
      accentVars = isDark ? preset.dark : preset.light;
    }

    root.style.setProperty('--accent', accentVars.accent);
    root.style.setProperty('--accent-light', accentVars.accentLight);
    root.style.setProperty('--accent-soft', accentVars.accentSoft);
    root.style.setProperty('--accent-gradient', accentVars.accentGradient);
    root.style.setProperty('--accent-glow', accentVars.accentGlow);
    root.style.setProperty('--shadow-accent', accentVars.shadowAccent);

    // 3. Resolve Background Variables
    const bgGroup = isDark ? BG_STYLES.dark : BG_STYLES.light;
    const activeBg = bgGroup[bgStyleKey] || (isDark ? bgGroup.midnight : bgGroup.breeze);
    if (activeBg && activeBg.vars) {
      Object.keys(activeBg.vars).forEach((varName) => {
        root.style.setProperty(varName, activeBg.vars[varName]);
      });
    }

    // 4. Resolve Radius Variables
    const activeRadius = RADIUS_PRESETS[s.radius] || RADIUS_PRESETS.playful;
    if (activeRadius && activeRadius.vars) {
      Object.keys(activeRadius.vars).forEach((varName) => {
        root.style.setProperty(varName, activeRadius.vars[varName]);
      });
    }

    // 5. Resolve Typography Font
    const activeFont = FONT_PRESETS[s.font] || FONT_PRESETS['plus-jakarta'];
    if (activeFont && activeFont.fontFamily) {
      root.style.setProperty('--font-main', activeFont.fontFamily);
    }

    // 6. Meta Theme Color (status bar mobile / browser toolbar)
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const targetColor = activeBg && activeBg.vars ? activeBg.vars['--bg-surface'] || activeBg.vars['--bg-page'] : (isDark ? '#121826' : '#ffffff');
      metaTheme.setAttribute('content', targetColor);
    }

    // 7. Backward compatibility localStorage 'elearniz_theme'
    try {
      localStorage.setItem(COMPAT_THEME_KEY, effectiveMode);
    } catch (_) {}

    // Dispatch global event for other components if needed
    try {
      window.dispatchEvent(new CustomEvent('elearniz-theme-changed', {
        detail: { settings: s, effectiveMode }
      }));
    } catch (_) {}
  }

  // System theme change listener (for mode = 'auto')
  if (window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (currentSettings.mode === 'auto') {
        applyTheme(currentSettings);
        updatePreviewUI();
        const viewTema = document.getElementById('viewTema');
        if (viewTema && viewTema.classList.contains('active')) {
          renderView();
        }
      }
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleSystemThemeChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handleSystemThemeChange);
    }
  }

  // Run immediate application on script load
  applyTheme(currentSettings);

  /* ------------------------------------------------------------------------
     PUBLIC API
     ------------------------------------------------------------------------ */
  function getSettings() {
    return { ...currentSettings };
  }

  function updateSettings(patch) {
    currentSettings = { ...currentSettings, ...patch, version: 2 };
    saveSettings(currentSettings);
    applyTheme(currentSettings);
    updatePreviewUI();
    return currentSettings;
  }

  function toggleMode() {
    const current = currentSettings.mode || 'auto';
    let next;
    if (current === 'auto') {
      const effective = resolveEffectiveMode('auto');
      // Berpindah ke kebalikan dari tampilan sistem saat ini
      next = effective === 'dark' ? 'light' : 'dark';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'auto'; // kembali ke otomatis sistem
    }
    return updateSettings({ mode: next });
  }

  function resetToDefault() {
    currentSettings = { ...DEFAULT_SETTINGS, mode: 'auto', version: 2 };
    saveSettings(currentSettings);
    applyTheme(currentSettings);
    renderView();
    if (window.ELearnizUI && typeof window.ELearnizUI.toast === 'function') {
      window.ELearnizUI.toast('Tema dan personalisasi telah dikembalikan ke standar (Otomatis Sistem)! ✨', 'success');
    }
  }

  /* ------------------------------------------------------------------------
     VIEW RENDERER FOR #viewTema
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

  function updatePreviewUI() {
    const previewContainer = document.getElementById('themeLivePreviewCard');
    if (!previewContainer) return;

    const s = currentSettings;
    const isDark = resolveEffectiveMode(s.mode) === 'dark';
    const accentObj = s.accent === 'custom'
      ? computeCustomAccent(s.customAccentHex, isDark)
      : (ACCENT_PRESETS[s.accent] ? (isDark ? ACCENT_PRESETS[s.accent].dark : ACCENT_PRESETS[s.accent].light) : ACCENT_PRESETS.blue.dark);

    // Update mini daily top bar gradient
    const topBar = previewContainer.querySelector('.pmd-top-bar');
    if (topBar) {
      topBar.style.background = `linear-gradient(90deg, ${accentObj.accent}, ${accentObj.accentLight}, #f59e0b)`;
    }

    // Update active badges & chips in preview
    const activeBadge = previewContainer.querySelector('.pmd-badge-active');
    if (activeBadge) {
      activeBadge.style.background = accentObj.accentSoft;
      activeBadge.style.color = accentObj.accent;
    }

    const previewChip = previewContainer.querySelector('.preview-chip-active');
    if (previewChip) {
      previewChip.style.background = accentObj.accentSoft;
      previewChip.style.color = accentObj.accent;
      previewChip.style.borderColor = accentObj.accent;
    }

    const previewBtn = previewContainer.querySelector('.preview-btn-sample.btn-primary');
    if (previewBtn) {
      previewBtn.style.background = accentObj.accentGradient;
    }

    // Mode label inside preview
    const modeBadge = previewContainer.querySelector('.tpc-mode-tag');
    if (modeBadge) {
      if (s.mode === 'auto') {
        modeBadge.textContent = isDark ? '💻 Otomatis (Gelap)' : '💻 Otomatis (Terang)';
      } else {
        modeBadge.textContent = isDark ? '🌙 Mode Gelap' : '☀️ Mode Terang';
      }
    }

    const accentBadge = previewContainer.querySelector('.tpc-accent-tag');
    if (accentBadge) {
      const accName = s.accent === 'custom' ? `Kustom (${s.customAccentHex})` : (ACCENT_PRESETS[s.accent] ? ACCENT_PRESETS[s.accent].name : 'Sky Blue');
      accentBadge.textContent = `🎨 ${accName}`;
    }
  }

  function renderView() {
    const container = document.getElementById('viewTema');
    if (!container) return;

    const s = currentSettings;
    const isDark = resolveEffectiveMode(s.mode) === 'dark';
    const isSystemDark = getSystemMode() === 'dark';

    const bgStylesCurrent = isDark ? BG_STYLES.dark : BG_STYLES.light;
    const activeBgKey = isDark ? (s.bgStyleDark || 'midnight') : (s.bgStyleLight || 'breeze');

    const previewModeTag = s.mode === 'auto'
      ? (isDark ? '💻 Otomatis (Gelap)' : '💻 Otomatis (Terang)')
      : (isDark ? '🌙 Mode Gelap' : '☀️ Mode Terang');

    container.innerHTML = `
      <div class="main-layout theme-layout">
        <!-- ================= KOLOM KIRI: STICKY LIVE PREVIEW ================= -->
        <div class="left-section theme-preview-column">
          <div class="theme-preview-card" id="themeLivePreviewCard">
            <div class="tpc-header">
              <div class="tpc-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> Pratinjau Langsung</div>
              <div class="tpc-tags">
                <span class="tpc-mode-tag">${previewModeTag}</span>
                <span class="tpc-accent-tag">🎨 ${s.accent === 'custom' ? `Kustom (${s.customAccentHex})` : (ACCENT_PRESETS[s.accent]?.name || 'Sky Blue')}</span>
              </div>
            </div>

            <p class="tpc-subhead">
              Sentuh dan coba langsung elemen di bawah ini untuk melihat aksen baru secara interaktif!
            </p>

            <!-- Mini Daily Card Sample -->
            <div class="preview-mini-daily">
              <div class="pmd-top-bar"></div>
              <div class="pmd-head">
                <div>
                  <span class="pmd-day-badge"><i class="fa-regular fa-calendar"></i> Hari Ini</span>
                  <h4 class="pmd-title">Jadwal Pelajaran Kelas</h4>
                </div>
                <span class="pmd-badge-active">SEKARANG</span>
              </div>
              <div class="pmd-period">
                <div class="pmd-time"><i class="fa-regular fa-clock"></i> 07:15 - 08:45</div>
                <div class="pmd-subject">
                  <i class="fa-solid fa-code"></i>
                  <span>Pemrograman Web & Perangkat Bergerak</span>
                </div>
              </div>
            </div>

            <!-- Mini Course Card Sample with Interactive Button -->
            <div class="preview-mini-card">
              <div class="pmc-header">
                <div class="pmc-tag"><i class="fa-solid fa-pen-ruler"></i> Desain UI/UX & Tema</div>
                <span class="pmc-pin" title="Disematkan"><i class="fa-solid fa-thumbtack"></i></span>
              </div>
              <h4 class="pmc-title">Kustomisasi Aksen & Personalisasi Tema</h4>
              <p class="pmc-desc">Sentuh tombol "Tandai Selesai" di bawah untuk melihat animasi feedback.</p>

              <div class="pmc-actions">
                <button type="button" class="preview-task-btn" id="previewTaskBtn">
                  <i class="fa-regular fa-square-check"></i>
                  <span id="previewTaskBtnText">Tandai Selesai</span>
                </button>
                <span class="preview-due"><i class="fa-regular fa-calendar-check"></i> Besok 23:59</span>
              </div>
            </div>

            <!-- Mini UI Elements Demo -->
            <div class="preview-mini-elements">
              <button type="button" class="btn-primary preview-btn-sample">
                <i class="fa-solid fa-bolt"></i> Aksi Utama
              </button>
              <button type="button" class="btn-secondary preview-btn-sample">
                Batal
              </button>
              <span class="preview-chip-active">Chip Aktif</span>
            </div>

            <div class="tpc-footer-note">
              <i class="fa-solid fa-cloud-arrow-up"></i> Semua personalisasi tersimpan otomatis di perangkatmu.
            </div>
          </div>
        </div>

        <!-- ================= KOLOM KANAN: PENGATURAN PERSONALISASI ================= -->
        <div class="right-section theme-settings-column">
          <!-- Hero Header -->
          <div class="theme-hero-card">
            <div class="thc-left">
              <div class="thc-icon"><i class="fa-solid fa-palette"></i></div>
              <div>
                <h1 class="thc-title">Personalisasi & Tema</h1>
                <p class="thc-subtitle">Sesuaikan aksen warna, mode tampilan, sudut tombol, dan gaya latar belajar sesuai seleramu.</p>
              </div>
            </div>
            <button type="button" class="btn-theme-reset" id="btnThemeReset" title="Kembalikan semua ke setelan pabrik">
              <i class="fa-solid fa-rotate-left"></i> <span>Reset Standar</span>
            </button>
          </div>

          <!-- Section 1: Mode Tampilan -->
          <div class="theme-panel-card">
            <div class="tpc-card-header">
              <div class="tpc-header-icon"><i class="fa-solid fa-circle-half-stroke"></i></div>
              <div>
                <h3>Mode Tampilan</h3>
                <p>Pilih pencahayaan yang paling pas untuk mata dan lingkungan belajarmu.</p>
              </div>
            </div>
            <div class="theme-modes-grid">
              <button type="button" class="theme-mode-btn ${s.mode === 'auto' ? 'active' : ''}" data-mode="auto">
                <div class="tmb-icon"><i class="fa-solid fa-laptop" style="color:#10b981;"></i></div>
                <div class="tmb-text">
                  <strong>Otomatis <span class="tmb-badge-default">Bawaan</span></strong>
                  <span>Sistem (${isSystemDark ? 'Aktif: Gelap 🌙' : 'Aktif: Terang ☀️'})</span>
                </div>
                ${s.mode === 'auto' ? '<i class="fa-solid fa-check tmb-check"></i>' : ''}
              </button>

              <button type="button" class="theme-mode-btn ${s.mode === 'light' ? 'active' : ''}" data-mode="light">
                <div class="tmb-icon"><i class="fa-solid fa-sun" style="color:#f59e0b;"></i></div>
                <div class="tmb-text">
                  <strong>Terang</strong>
                  <span>Cerah & bersih untuk siang hari</span>
                </div>
                ${s.mode === 'light' ? '<i class="fa-solid fa-check tmb-check"></i>' : ''}
              </button>

              <button type="button" class="theme-mode-btn ${s.mode === 'dark' ? 'active' : ''}" data-mode="dark">
                <div class="tmb-icon"><i class="fa-solid fa-moon" style="color:#38bdf8;"></i></div>
                <div class="tmb-text">
                  <strong>Gelap</strong>
                  <span>Teduh & nyaman untuk malam hari</span>
                </div>
                ${s.mode === 'dark' ? '<i class="fa-solid fa-check tmb-check"></i>' : ''}
              </button>
            </div>
          </div>

          <!-- Section: Pilihan Bahasa (Language) -->
          <div class="theme-panel-card">
            <div class="tpc-card-header">
              <div class="tpc-header-icon"><i class="fa-solid fa-language"></i></div>
              <div>
                <h3>${t('theme_lang_title', 'Pilihan Bahasa')}</h3>
                <p>${t('theme_lang_desc', 'Pilih bahasa antarmuka untuk portal E-Learniz.')}</p>
              </div>
            </div>
            <div class="theme-lang-grid">
              <button type="button" class="theme-lang-btn ${(s.lang || 'id') === 'id' ? 'active' : ''}" data-lang="id">
                <span class="tlb-flag">🇮🇩</span>
                <div class="tlb-meta">
                  <strong>${t('theme_lang_id', 'Bahasa Indonesia')}</strong>
                  <small>${t('theme_lang_id_desc', 'Bahasa default sistem')}</small>
                </div>
                ${(s.lang || 'id') === 'id' ? '<i class="fa-solid fa-circle-check tlb-check"></i>' : ''}
              </button>

              <button type="button" class="theme-lang-btn ${s.lang === 'en' ? 'active' : ''}" data-lang="en">
                <span class="tlb-flag">🇬🇧</span>
                <div class="tlb-meta">
                  <strong>${t('theme_lang_en', 'English')}</strong>
                  <small>${t('theme_lang_en_desc', 'English interface')}</small>
                </div>
                ${s.lang === 'en' ? '<i class="fa-solid fa-circle-check tlb-check"></i>' : ''}
              </button>
            </div>
          </div>

          <!-- Section 2: Palet Warna Aksen Utama -->
          <div class="theme-panel-card">
            <div class="tpc-card-header">
              <div class="tpc-header-icon"><i class="fa-solid fa-droplet"></i></div>
              <div>
                <h3>${t('theme_accent_title', 'Warna Aksen Utama')}</h3>
                <p>${t('theme_accent_desc', 'Warna identitas untuk tombol, sorotan menu, ikon header, dan indikator tugas.')}</p>
              </div>
            </div>

            <div class="theme-accents-grid">
              ${Object.keys(ACCENT_PRESETS).map((key) => {
                const item = ACCENT_PRESETS[key];
                const isSelected = s.accent === key;
                return `
                  <button type="button" class="theme-accent-btn ${isSelected ? 'active' : ''}" data-accent="${esc(item.key)}">
                    <span class="tab-color-dot" style="background: ${item.dot}; box-shadow: 0 0 10px ${item.dot}66;"></span>
                    <div class="tab-meta">
                      <strong>${esc(item.name)}</strong>
                      <small>${esc(item.desc)}</small>
                    </div>
                    ${isSelected ? '<i class="fa-solid fa-circle-check tab-check"></i>' : ''}
                  </button>
                `;
              }).join('')}

              <!-- Custom Accent Button: Identik dengan tombol aksen lainnya, auto-apply instan tanpa form box -->
              <button type="button" class="theme-accent-btn ${s.accent === 'custom' ? 'active' : ''}" id="btnCustomAccent" data-accent="custom" title="Klik untuk memilih warna bebas">
                <span class="tab-color-dot" id="customColorDot" style="background: ${s.accent === 'custom' ? s.customAccentHex : 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #2563eb, #8b5cf6, #f43f5e)'}; box-shadow: 0 0 10px ${s.accent === 'custom' ? s.customAccentHex + '66' : 'rgba(37,99,235,0.2)'};"></span>
                <div class="tab-meta">
                  <strong>${t('theme_custom_color_title', 'Pilih Sendiri')}</strong>
                  <small id="customColorMetaText">${s.accent === 'custom' ? s.customAccentHex : t('theme_custom_color_desc', 'Warna Bebas / Kustom')}</small>
                </div>
                ${s.accent === 'custom' ? '<i class="fa-solid fa-circle-check tab-check"></i>' : '<i class="fa-solid fa-eye-dropper tab-check" style="opacity:0.55;"></i>'}
                <input type="color" id="nativeCustomColorPicker" value="${esc(s.customAccentHex || '#2563eb')}" style="position:absolute; opacity:0; pointer-events:none; width:0; height:0;" />
              </button>
            </div>
          </div>

          <!-- Section 3: Gaya Latar Belakang (Background Vibe) -->
          <div class="theme-panel-card">
            <div class="tpc-card-header">
              <div class="tpc-header-icon"><i class="fa-solid fa-layer-group"></i></div>
              <div>
                <h3>Nuansa Latar Belakang (${isDark ? 'Mode Gelap' : 'Mode Terang'})</h3>
                <p>Tingkat kepekatan kontras dan corak warna kanvas di belakang kartu.</p>
              </div>
            </div>

            <div class="theme-bg-grid">
              ${Object.keys(bgStylesCurrent).map((key) => {
                const bg = bgStylesCurrent[key];
                const isSelected = activeBgKey === key;
                return `
                  <button type="button" class="theme-bg-btn ${isSelected ? 'active' : ''}" data-bg-style="${esc(key)}">
                    <span class="tbg-preview" style="background: ${bg.dot}; border: 1px solid var(--border-color);"></span>
                    <div class="tbg-meta">
                      <strong>${esc(bg.name)}</strong>
                      <small>${esc(bg.desc)}</small>
                    </div>
                    ${isSelected ? '<i class="fa-solid fa-circle-check tbg-check"></i>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Section 4: Kelengkungan Sudut (Border Radius) & Tipografi -->
          <div class="theme-panel-card">
            <div class="tpc-card-header">
              <div class="tpc-header-icon"><i class="fa-solid fa-shapes"></i></div>
              <div>
                <h3>Bentuk Sudut & Tipografi</h3>
                <p>Atur kelengkungan tombol/kartu dan jenis huruf yang paling kamu sukai.</p>
              </div>
            </div>

            <!-- Sub: Radius -->
            <label class="theme-group-label"><i class="fa-solid fa-vector-square"></i> Kelengkungan Sudut (Corner Radius)</label>
            <div class="theme-radius-grid">
              ${Object.keys(RADIUS_PRESETS).map((key) => {
                const r = RADIUS_PRESETS[key];
                const isSelected = s.radius === key;
                return `
                  <button type="button" class="theme-radius-btn ${isSelected ? 'active' : ''}" data-radius="${esc(key)}">
                    <div class="trb-sample trb-sample-${esc(key)}"></div>
                    <strong>${esc(r.name)}</strong>
                    <small>${esc(r.desc)}</small>
                    ${isSelected ? '<i class="fa-solid fa-circle-check trb-check"></i>' : ''}
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Sub: Fonts -->
            <label class="theme-group-label" style="margin-top: 1.5rem;"><i class="fa-solid fa-font"></i> Pilihan Tipografi / Font</label>
            <div class="theme-fonts-grid">
              ${Object.keys(FONT_PRESETS).map((key) => {
                const f = FONT_PRESETS[key];
                const isSelected = s.font === key;
                return `
                  <button type="button" class="theme-font-btn ${isSelected ? 'active' : ''}" data-font="${esc(key)}" style="font-family: ${f.fontFamily};">
                    <span class="tfb-preview">Aa Gg 123</span>
                    <strong>${esc(f.name)}</strong>
                    <small style="font-family: var(--font-main);">${esc(f.desc)}</small>
                    ${isSelected ? '<i class="fa-solid fa-circle-check tfb-check"></i>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Section 5: Efek & Kerapatan Tampilan -->
          <div class="theme-panel-card">
            <div class="tpc-card-header">
              <div class="tpc-header-icon"><i class="fa-solid fa-sliders"></i></div>
              <div>
                <h3>Efek & Kerapatan Tampilan</h3>
                <p>Pengaturan visual tambahan untuk memaksimalkan kenyamanan belajar.</p>
              </div>
            </div>

            <div class="theme-extras-list">
              <!-- Glow Toggle -->
              <div class="theme-extra-row">
                <div class="ter-meta">
                  <div class="ter-icon"><i class="fa-solid fa-sun-plant-wilt"></i></div>
                  <div>
                    <strong>Ambient Glow Background</strong>
                    <p>Efek kilau cahaya gradien ambient yang lembut di latar belakang aplikasi.</p>
                  </div>
                </div>
                <label class="theme-switch">
                  <input type="checkbox" id="themeToggleGlow" ${s.ambientGlow ? 'checked' : ''} />
                  <span class="theme-switch-slider"></span>
                </label>
              </div>

              <!-- Density Toggle -->
              <div class="theme-extra-row">
                <div class="ter-meta">
                  <div class="ter-icon"><i class="fa-solid fa-compress"></i></div>
                  <div>
                    <strong>Kerapatan Tampilan (Density)</strong>
                    <p>Pilih tampilan nyaman berspasi lega atau mode ringkas/padat.</p>
                  </div>
                </div>
                <div class="theme-segmented-ctrl">
                  <button type="button" class="${s.density === 'comfortable' ? 'active' : ''}" data-density="comfortable">
                    Nyaman
                  </button>
                  <button type="button" class="${s.density === 'compact' ? 'active' : ''}" data-density="compact">
                    Ringkas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindThemeEvents(container);
    updatePreviewUI();
  }

  /* ------------------------------------------------------------------------
     INTERACTIVE EVENTS BINDING
     ------------------------------------------------------------------------ */
  function bindThemeEvents(container) {
    if (!container) return;

    // 1. Reset Button
    const resetBtn = container.querySelector('#btnThemeReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Kembalikan semua warna, mode, dan tata letak tema ke setelan standar E-Learniz?')) {
          resetToDefault();
        }
      });
    }

    // 2. Mode Buttons
    container.querySelectorAll('button[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        updateSettings({ mode });
        renderView();
        const effective = resolveEffectiveMode(mode);
        const toastMsg = mode === 'dark'
          ? 'Mode Gelap diaktifkan 🌙'
          : (mode === 'light' ? 'Mode Terang diaktifkan ☀️' : `Mode Otomatis Sistem diaktifkan 💻 (${effective === 'dark' ? 'Gelap' : 'Terang'})`);
        if (window.ELearnizUI && window.ELearnizUI.toast) window.ELearnizUI.toast(toastMsg, 'info');
      });
    });

    // 3. Accent Buttons
    container.querySelectorAll('button[data-accent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const accent = btn.getAttribute('data-accent');
        updateSettings({ accent });
        renderView();
        const name = ACCENT_PRESETS[accent]?.name || 'Sky Blue';
        if (window.ELearnizUI && window.ELearnizUI.toast) window.ELearnizUI.toast(`Aksen warna diubah ke ${name}! ✨`, 'info');
      });
    });

    // 4. Custom Accent Picker & Hex Input
    const colorPicker = container.querySelector('#customColorPicker');
    const hexInput = container.querySelector('#customColorHexInput');
    const applyCustomBtn = container.querySelector('#btnApplyCustomColor');

    if (colorPicker && hexInput) {
      colorPicker.addEventListener('input', (e) => {
        const val = e.target.value;
        hexInput.value = val.replace(/^#/, '');
        updateSettings({ accent: 'custom', customAccentHex: val });
      });

      hexInput.addEventListener('input', (e) => {
        let val = e.target.value.trim().replace(/^#/, '');
        if (val.length === 6) {
          colorPicker.value = '#' + val;
          updateSettings({ accent: 'custom', customAccentHex: '#' + val });
        }
      });

      if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', () => {
          let val = hexInput.value.trim().replace(/^#/, '');
          if (!/^[0-9a-fA-F]{3,6}$/.test(val)) {
            if (window.ELearnizUI && window.ELearnizUI.toast) window.ELearnizUI.toast('Masukkan kode HEX yang valid (contoh: 2563eb)', 'error');
            return;
          }
          if (val.length === 3) {
            val = val.split('').map((c) => c + c).join('');
          }
          const fullHex = '#' + val;
          colorPicker.value = fullHex;
          updateSettings({ accent: 'custom', customAccentHex: fullHex });
          renderView();
          if (window.ELearnizUI && window.ELearnizUI.toast) window.ELearnizUI.toast(`Warna kustom ${fullHex} berhasil diterapkan! 🎨`, 'success');
        });
      }
    }

    // 5. Background Style Buttons
    container.querySelectorAll('button[data-bg-style]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const styleKey = btn.getAttribute('data-bg-style');
        const isDark = resolveEffectiveMode(currentSettings.mode) === 'dark';
        if (isDark) {
          updateSettings({ bgStyleDark: styleKey });
        } else {
          updateSettings({ bgStyleLight: styleKey });
        }
        renderView();
      });
    });

    // 6. Corner Radius Buttons
    container.querySelectorAll('button[data-radius]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const radius = btn.getAttribute('data-radius');
        updateSettings({ radius });
        renderView();
      });
    });

    // 7. Typography Buttons
    container.querySelectorAll('button[data-font]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const font = btn.getAttribute('data-font');
        updateSettings({ font });
        renderView();
      });
    });

    // 8. Ambient Glow Toggle
    const glowToggle = container.querySelector('#themeToggleGlow');
    if (glowToggle) {
      glowToggle.addEventListener('change', (e) => {
        updateSettings({ ambientGlow: e.target.checked });
      });
    }

    // 9. Density Segmented Buttons
    container.querySelectorAll('button[data-density]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const density = btn.getAttribute('data-density');
        updateSettings({ density });
        renderView();
      });
    });

    // 10. Interactive Mini Task Button in Preview
    const previewTaskBtn = container.querySelector('#previewTaskBtn');
    const previewTaskText = container.querySelector('#previewTaskBtnText');
    if (previewTaskBtn) {
      previewTaskBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isDone = previewTaskBtn.classList.toggle('completed');
        if (isDone) {
          previewTaskBtn.querySelector('i').className = 'fa-solid fa-circle-check';
          if (previewTaskText) previewTaskText.textContent = 'Selesai Dicatat! 🎉';
        } else {
          previewTaskBtn.querySelector('i').className = 'fa-regular fa-square-check';
          if (previewTaskText) previewTaskText.textContent = 'Tandai Selesai';
        }
      });
    }
  }

  // Expose to window
  window.ELearnizTheme = {
    getSettings,
    updateSettings,
    toggleMode,
    resetToDefault,
    renderView,
    applyTheme,
    resolveEffectiveMode
  };
})();
