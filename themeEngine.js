// ==============================================================================
// THEME ENGINE & LOCATION TRACKING - Frontend JavaScript
// ==============================================================================
// Features:
//  - Theme switching with gear icon
//  - Dynamic logo changes based on theme
//  - Location sharing notification for new users
//  - Text color bug fixes when switching themes
//  - Confirmation warnings for location sharing toggle
// ==============================================================================

const ThemeEngine = {
  // Theme logo mappings - different logos for different themes
  logoMap: {
    'frutiger': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg',
    'light': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg',
    'dark': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg',
    'midnight': 'https://contents.smsupermalls.com/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg',
    'neon': 'https://contents.smsupermalls.com/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg',
    'plumber-dudes': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/neon/cyberpunk_logo.png',
    'matrix': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg',
    'synthwave': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/vaporwave/logo.png',
    'gray': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg',
    'default': 'https://d3up48wss6lvj.cloudflare.net/data/uploads/2020/07/GIGAHERTZ_COMPUTER_SYSTEM.jpg'
  },

  // Current theme
  currentTheme: 'frutiger',

  // Location permission state
  locationPermission: localStorage.getItem('locationPermission') || null,

  /**
   * Initialize theme engine
   */
  init() {
    this.setupThemeToggle();
    this.setupThemeMenu();
    this.loadSavedTheme();
    this.fixTextColorBug();
    this.updateLogoForTheme(this.currentTheme);
    this.setupLocationWarning();
  },

  /**
   * Setup theme toggle button
   */
  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const themeMenu = document.getElementById('themeMenu');
      if (themeMenu) {
        themeMenu.classList.toggle('open');
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      const themeMenu = document.getElementById('themeMenu');
      const themeToggle = document.getElementById('themeToggle');
      if (themeMenu && themeToggle && !themeMenu.contains(e.target) && !themeToggle.contains(e.target)) {
        themeMenu.classList.remove('open');
      }
    });
  },

  /**
   * Setup theme menu with all available themes
   */
  setupThemeMenu() {
    const themeMenu = document.getElementById('themeMenu');
    if (!themeMenu) return;

    const themes = [
      { id: 'frutiger', label: 'Frutiger Aero 💧' },
      { id: 'plumber-dudes', label: 'Plumber Dudes 🎮' },
      { id: 'gray', label: 'Gray 🖤' },
      { id: 'light', label: 'Sky Blue ☁️' },
      { id: 'dark', label: 'Dark Mode 🌑' },
      { id: 'midnight', label: 'Midnight 🌌' },
      { id: 'forest', label: 'Forest 🌿' },
      { id: 'ocean', label: 'Deep Ocean 🌊' },
      { id: 'neon', label: 'Neon Cyber ⚡' },
      { id: 'matrix', label: 'Matrix 🖥️' },
      { id: 'synthwave', label: 'Synthwave 🌃' },
      { id: 'cyberpunk', label: 'Cyberpunk 👾' },
      { id: 'dracula', label: 'Dracula 🦇' },
      { id: 'nordtheme', label: 'Nord Theme ❄️' },
      { id: 'gruvbox', label: 'Gruvbox 🍂' },
      { id: 'candy', label: 'Candy Pop 🍬' },
      { id: 'rose', label: 'Rose 🌹' },
    ];

    themeMenu.innerHTML = themes.map(theme => `
      <div class="theme-option" data-theme="${theme.id}" onclick="ThemeEngine.switchTheme('${theme.id}')">
        ${theme.label}
      </div>
    `).join('');
  },

  /**
   * Switch to a specific theme
   */
  switchTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('selectedTheme', themeId);
    this.currentTheme = themeId;

    // Close theme menu
    const themeMenu = document.getElementById('themeMenu');
    if (themeMenu) {
      themeMenu.classList.remove('open');
    }

    // Update logo
    this.updateLogoForTheme(themeId);

    // Fix text colors
    this.fixTextColorBug();

    // Show feedback
    this.showThemeNotification(`Theme changed to ${themeId}`);
  },

  /**
   * Load previously saved theme
   */
  loadSavedTheme() {
    const saved = localStorage.getItem('selectedTheme') || 'frutiger';
    document.documentElement.setAttribute('data-theme', saved);
    this.currentTheme = saved;
  },

  /**
   * Update logo based on theme
   */
  updateLogoForTheme(themeId) {
    const logo = document.getElementById('headerLogo');
    if (!logo) return;

    const logoUrl = this.logoMap[themeId] || this.logoMap['default'];
    logo.src = logoUrl;

    // Add theme-specific logo styling
    if (themeId === 'plumber-dudes') {
      logo.style.filter = 'drop-shadow(0 0 8px rgba(255, 0, 128, 0.6))';
    } else if (themeId === 'neon' || themeId === 'matrix') {
      logo.style.filter = 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))';
    } else if (themeId === 'dark' || themeId === 'midnight') {
      logo.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))';
    } else if (themeId === 'gray') {
      logo.style.filter = 'brightness(0.9) contrast(1.1)';
    } else {
      logo.style.filter = '';
    }
  },

  /**
   * Fix text color bugs when switching themes
   */
  fixTextColorBug() {
    // Fix input text colors
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.style.color = 'var(--tx)';
      input.style.caretColor = 'var(--p)';
    });

    // Fix button text colors
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      if (btn.classList.contains('btn-primary') || btn.classList.contains('btn-login')) {
        btn.style.color = '#fff';
      } else if (btn.classList.contains('btn-danger')) {
        btn.style.color = '#fff';
      } else {
        btn.style.color = 'var(--tx)';
      }
    });

    // Fix label text colors
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      label.style.color = 'var(--tx)';
    });

    // Fix heading text colors
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      heading.style.color = 'var(--tx)';
    });

    // Force reflow to apply changes
    void document.documentElement.offsetHeight;
  },

  /**
   * Show theme notification
   */
  showThemeNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 30px;
      background: var(--glass);
      color: var(--tx);
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      backdrop-filter: blur(10px);
      border: 1px solid var(--gborder);
      z-index: 998;
      animation: slideUp 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
};

// ==============================================================================
// LOCATION TRACKING & SHARING
// ==============================================================================

const LocationTracker = {
  isLocationEnabled: localStorage.getItem('locationEnabled') === 'true',
  isLocationDenied: localStorage.getItem('locationDenied') === 'true',

  /**
   * Initialize location tracking
   */
  init() {
    if (this.isLocationDenied) {
      this.setRemoteStatus();
    }
  },

  /**
   * Request location permission from user
   */
  async requestLocationPermission() {
    if (!('geolocation' in navigator)) {
      this.showNotification('Geolocation is not supported by your browser', 'error');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.isLocationEnabled = true;
          localStorage.setItem('locationEnabled', 'true');
          localStorage.setItem('locationDenied', 'false');
          this.showNotification('📍 Location access granted! Tracking enabled.', 'success');
          resolve(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            this.isLocationDenied = true;
            localStorage.setItem('locationDenied', 'true');
            localStorage.setItem('locationEnabled', 'false');
            this.setRemoteStatus();
            this.showNotification('📍 Location access denied. Defaulting to Remote status.', 'warn');
          }
          resolve(false);
        }
      );
    });
  },

  /**
   * Show location permission prompt to new users
   */
  showLocationWarning() {
    const alreadyAsked = sessionStorage.getItem('locationWarningShown');
    if (alreadyAsked) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      animation: fadeIn 0.3s ease;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--card);
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--bd);
      animation: slideUp 0.3s ease;
    `;

    modal.innerHTML = `
      <h2 style="margin: 0 0 12px 0; color: var(--tx); font-size: 24px;">📍 Enable Location Tracking?</h2>
      <p style="margin: 0 0 24px 0; color: var(--tx2); font-size: 14px; line-height: 1.6;">
        Gigahertz PPOS can track your location to determine if you're working in-office or remotely. 
        This helps with attendance verification and geofencing features.
      </p>
      <div style="display: flex; gap: 12px;">
        <button id="locationAccept" style="
          flex: 1;
          padding: 12px;
          background: linear-gradient(160deg, #22c55e, #16a34a);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">✓ Enable Location</button>
        <button id="locationDecline" style="
          flex: 1;
          padding: 12px;
          background: rgba(255, 255, 255, 0.2);
          color: var(--tx);
          border: 1px solid var(--bd);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">✕ Skip for Now</button>
      </div>
      <p style="margin: 16px 0 0 0; font-size: 11px; color: var(--tx3);">
        You can change this in Settings anytime.
      </p>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('locationAccept').addEventListener('click', async () => {
      sessionStorage.setItem('locationWarningShown', 'true');
      overlay.remove();
      await this.requestLocationPermission();
    });

    document.getElementById('locationDecline').addEventListener('click', () => {
      sessionStorage.setItem('locationWarningShown', 'true');
      localStorage.setItem('locationDenied', 'true');
      overlay.remove();
      this.setRemoteStatus();
    });

    // Add hover effects
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
      });
      btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '';
      });
    });
  },

  /**
   * Show confirmation warning before toggling location
   */
  async showToggleConfirmation() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: var(--card);
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        border: 1px solid var(--bd);
        animation: slideUp 0.3s ease;
      `;

      const action = this.isLocationEnabled ? 'disable' : 'enable';
      modal.innerHTML = `
        <h2 style="margin: 0 0 12px 0; color: var(--tx); font-size: 20px;">⚠️ Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}?</h2>
        <p style="margin: 0 0 24px 0; color: var(--tx2); font-size: 14px; line-height: 1.6;">
          Are you sure you want to <strong>${action}</strong> location tracking? 
          ${action === 'disable' ? 'You will be marked as Remote.' : 'Geofencing will be re-enabled.'}
        </p>
        <div style="display: flex; gap: 12px;">
          <button id="confirmToggle" style="
            flex: 1;
            padding: 12px;
            background: linear-gradient(160deg, #ff6b6b, #ff5252);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">Confirm</button>
          <button id="cancelToggle" style="
            flex: 1;
            padding: 12px;
            background: rgba(255, 255, 255, 0.2);
            color: var(--tx);
            border: 1px solid var(--bd);
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">Cancel</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      document.getElementById('confirmToggle').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      document.getElementById('cancelToggle').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
    });
  },

  /**
   * Set remote status (location disabled)
   */
  setRemoteStatus() {
    localStorage.setItem('userStatus', 'Remote');
    this.showNotification('Status set to Remote', 'info');
  },

  /**
   * Get current location
   */
  getCurrentLocation() {
    return new Promise((resolve) => {
      if (!this.isLocationEnabled || this.isLocationDenied) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => {
          resolve(null);
        }
      );
    });
  },

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'rgba(34, 197, 94, 0.9)' :
                    type === 'error' ? 'rgba(239, 68, 68, 0.9)' :
                    type === 'warn' ? 'rgba(245, 158, 11, 0.9)' :
                    'rgba(59, 130, 246, 0.9)';

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${bgColor};
      color: #fff;
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 10000;
      animation: slideInUp 0.3s ease;
      max-width: 320px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutDown 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

// ==============================================================================
// INITIALIZATION
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme engine
  ThemeEngine.init();

  // Initialize location tracker
  LocationTracker.init();

  // Show location warning to new users on login
  const headerLoginBtn = document.getElementById('headerLoginBtn');
  if (headerLoginBtn) {
    headerLoginBtn.addEventListener('click', () => {
      LocationTracker.showLocationWarning();
    });
  }

  // Add animation keyframes to document
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes slideDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(20px); opacity: 0; }
    }

    @keyframes slideInUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes slideOutDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  console.log('✓ Theme Engine initialized');
  console.log('✓ Location Tracker initialized');
});
