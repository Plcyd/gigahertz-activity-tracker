// ==============================================================================
// SETTINGS UI - Clean, organized settings panel
// ==============================================================================

const SettingsUI = {
  /**
   * Initialize settings
   */
  init() {
    this.createSettingsPanel();
  },

  /**
   * Create settings panel
   */
  createSettingsPanel() {
    const settingsContainer = document.createElement('div');
    settingsContainer.id = 'settingsPanel';
    settingsContainer.className = 'settings-panel';
    
    settingsContainer.innerHTML = `
      <div class="settings-overlay" id="settingsOverlay"></div>
      <div class="settings-modal">
        <div class="settings-header">
          <h2>⚙️ Settings</h2>
          <button class="settings-close" id="settingsClose">&times;</button>
        </div>

        <div class="settings-content">
          <!-- Theme Settings -->
          <div class="settings-section">
            <h3>🎨 Theme</h3>
            <div class="setting-item">
              <label>Color Theme</label>
              <select id="themeSelect" class="theme-selector">
                <option value="frutiger">Frutiger Aero 💧</option>
                <option value="plumber-dudes">Plumber Dudes 🎮</option>
                <option value="gray">Gray 🖤</option>
                <option value="dark">Dark Mode 🌑</option>
                <option value="light">Sky Blue ☁️</option>
                <option value="neon">Neon Cyber ⚡</option>
              </select>
            </div>
          </div>

          <!-- Location Settings -->
          <div class="settings-section">
            <h3>📍 Location Tracking</h3>
            <div class="setting-item">
              <label>Enable Location Sharing</label>
              <div class="toggle-switch">
                <input type="checkbox" id="locationToggle" class="toggle-input" />
                <label for="locationToggle" class="toggle-label"></label>
              </div>
              <p class="setting-help">Allow app to track your location for geofencing</p>
            </div>
          </div>

          <!-- Notification Settings -->
          <div class="settings-section">
            <h3>🔔 Notifications</h3>
            <div class="setting-item">
              <label>Browser Notifications</label>
              <div class="toggle-switch">
                <input type="checkbox" id="notifToggle" class="toggle-input" checked />
                <label for="notifToggle" class="toggle-label"></label>
              </div>
            </div>
            <div class="setting-item">
              <label>Email Notifications</label>
              <div class="toggle-switch">
                <input type="checkbox" id="emailToggle" class="toggle-input" />
                <label for="emailToggle" class="toggle-label"></label>
              </div>
            </div>
          </div>

          <!-- Display Settings -->
          <div class="settings-section">
            <h3>👁️ Display</h3>
            <div class="setting-item">
              <label>Animations</label>
              <div class="toggle-switch">
                <input type="checkbox" id="animToggle" class="toggle-input" checked />
                <label for="animToggle" class="toggle-label"></label>
              </div>
            </div>
            <div class="setting-item">
              <label>Compact Mode</label>
              <div class="toggle-switch">
                <input type="checkbox" id="compactToggle" class="toggle-input" />
                <label for="compactToggle" class="toggle-label"></label>
              </div>
            </div>
          </div>

          <!-- Privacy Settings -->
          <div class="settings-section">
            <h3>🔒 Privacy</h3>
            <div class="setting-item">
              <label>Activity Logging</label>
              <div class="toggle-switch">
                <input type="checkbox" id="logToggle" class="toggle-input" checked />
                <label for="logToggle" class="toggle-label"></label>
              </div>
              <p class="setting-help">Log your activities for analytics</p>
            </div>
          </div>

          <!-- Account Settings -->
          <div class="settings-section">
            <h3>👤 Account</h3>
            <div class="setting-item">
              <button class="btn btn-secondary" id="changePasswordBtn">🔑 Change Password</button>
            </div>
            <div class="setting-item">
              <button class="btn btn-danger" id="clearDataBtn">🗑️ Clear Local Data</button>
            </div>
          </div>

          <!-- About Section -->
          <div class="settings-section">
            <h3>ℹ️ About</h3>
            <div class="setting-item">
              <p class="setting-info">
                <strong>Gigahertz PPOS v9.0</strong><br/>
                Personnel Position & Occupancy System<br/>
                © 2026 Gigahertz Computer Systems
              </p>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn btn-primary" id="settingsSave">💾 Save Settings</button>
          <button class="btn btn-secondary" id="settingsCancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(settingsContainer);
    this.attachListeners();
    this.loadSettings();
  },

  /**
   * Attach event listeners
   */
  attachListeners() {
    const settingsClose = document.getElementById('settingsClose');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const settingsCancel = document.getElementById('settingsCancel');
    const settingsSave = document.getElementById('settingsSave');

    if (settingsClose) settingsClose.addEventListener('click', () => this.closeSettings());
    if (settingsOverlay) settingsOverlay.addEventListener('click', () => this.closeSettings());
    if (settingsCancel) settingsCancel.addEventListener('click', () => this.closeSettings());
    if (settingsSave) settingsSave.addEventListener('click', () => this.saveSettings());

    // Theme change
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        if (window.ThemeEngine) {
          window.ThemeEngine.switchTheme(e.target.value);
        }
      });
    }

    // Location toggle with confirmation
    const locationToggle = document.getElementById('locationToggle');
    if (locationToggle) {
      locationToggle.addEventListener('change', async (e) => {
        if (window.LocationTracker && e.target.checked) {
          const confirmed = await window.LocationTracker.showToggleConfirmation();
          if (!confirmed) {
            e.target.checked = false;
          }
        }
      });
    }

    // Clear data
    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => this.clearLocalData());
    }
  },

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    const theme = localStorage.getItem('selectedTheme') || 'frutiger';
    const locationEnabled = localStorage.getItem('locationEnabled') === 'true';
    const notifEnabled = localStorage.getItem('notifEnabled') !== 'false';
    const emailEnabled = localStorage.getItem('emailEnabled') === 'true';
    const animEnabled = localStorage.getItem('animEnabled') !== 'false';
    const compactEnabled = localStorage.getItem('compactEnabled') === 'true';
    const logEnabled = localStorage.getItem('logEnabled') !== 'false';

    document.getElementById('themeSelect').value = theme;
    document.getElementById('locationToggle').checked = locationEnabled;
    document.getElementById('notifToggle').checked = notifEnabled;
    document.getElementById('emailToggle').checked = emailEnabled;
    document.getElementById('animToggle').checked = animEnabled;
    document.getElementById('compactToggle').checked = compactEnabled;
    document.getElementById('logToggle').checked = logEnabled;
  },

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    localStorage.setItem('notifEnabled', document.getElementById('notifToggle').checked);
    localStorage.setItem('emailEnabled', document.getElementById('emailToggle').checked);
    localStorage.setItem('animEnabled', document.getElementById('animToggle').checked);
    localStorage.setItem('compactEnabled', document.getElementById('compactToggle').checked);
    localStorage.setItem('logEnabled', document.getElementById('logToggle').checked);

    this.showNotification('✓ Settings saved successfully', 'success');
    this.closeSettings();
  },

  /**
   * Clear local data
   */
  clearLocalData() {
    if (confirm('Are you sure? This will clear all local data.')) {
      localStorage.clear();
      sessionStorage.clear();
      this.showNotification('✓ Local data cleared', 'success');
      setTimeout(() => window.location.reload(), 1500);
    }
  },

  /**
   * Show settings panel
   */
  showSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel) {
      panel.classList.add('visible');
    }
  },

  /**
   * Close settings panel
   */
  closeSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel) {
      panel.classList.remove('visible');
    }
  },

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `settings-notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
  SettingsUI.init();
});
