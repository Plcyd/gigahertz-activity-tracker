// ==============================================================================
// NAVIGATION SYSTEM - Admin vs User Role-Based
// ==============================================================================
// This file handles all navigation logic without overlapping index.html
// Proper z-index layering and separation of concerns
// ==============================================================================

const NavigationSystem = {
  currentUser: null,
  isAdmin: false,
  activeSidebar: null,

  /**
   * Initialize navigation based on user role
   */
  async init(user) {
    this.currentUser = user;
    this.isAdmin = user?.role === 'ADMIN' || user?.role === 'Admin';
    
    // Render appropriate sidebar
    if (this.isAdmin) {
      this.renderAdminSidebar();
    } else {
      this.renderUserSidebar();
    }

    this.setupEventListeners();
    console.log(`✓ Navigation initialized for ${this.isAdmin ? 'ADMIN' : 'USER'}`);
  },

  /**
   * Render admin-specific sidebar
   */
  renderAdminSidebar() {
    const sidebar = document.createElement('nav');
    sidebar.id = 'navigationSidebar';
    sidebar.className = 'nav-sidebar nav-admin';
    
    sidebar.innerHTML = `
      <div class="nav-header">
        <h3>🔧 Admin Panel</h3>
        <button class="nav-toggle" id="navToggle">☰</button>
      </div>

      <div class="nav-menu">
        <ul class="nav-list">
          <li><a href="#dashboard" class="nav-item" data-view="dashboard">📊 Dashboard</a></li>
          <li><a href="#users" class="nav-item" data-view="users">👥 User Management</a></li>
          <li><a href="#tracking" class="nav-item" data-view="tracking">📍 Attendance Tracking</a></li>
          <li><a href="#analytics" class="nav-item" data-view="analytics">📈 Analytics</a></li>
          <li><a href="#tasks" class="nav-item" data-view="tasks">✓ Tasks</a></li>
          <li><a href="#projects" class="nav-item" data-view="projects">🎯 Projects</a></li>
          <li><a href="#leaves" class="nav-item" data-view="leaves">🏖️ Leave Management</a></li>
          <li><a href="#announcements" class="nav-item" data-view="announcements">📢 Announcements</a></li>
          <li><a href="#settings" class="nav-item" data-view="settings">⚙️ Settings</a></li>
        </ul>
      </div>

      <div class="nav-user">
        <div class="user-info">
          <div class="user-avatar">${(this.currentUser?.firstName?.[0] || 'A').toUpperCase()}</div>
          <div class="user-details">
            <p class="user-name">${this.currentUser?.firstName} ${this.currentUser?.lastName}</p>
            <p class="user-role">Admin</p>
          </div>
        </div>
        <button class="btn-logout" id="logoutBtn">🚪 Logout</button>
      </div>
    `;

    document.body.appendChild(sidebar);
  },

  /**
   * Render user-specific sidebar
   */
  renderUserSidebar() {
    const sidebar = document.createElement('nav');
    sidebar.id = 'navigationSidebar';
    sidebar.className = 'nav-sidebar nav-user';
    
    sidebar.innerHTML = `
      <div class="nav-header">
        <h3>🎯 Menu</h3>
        <button class="nav-toggle" id="navToggle">☰</button>
      </div>

      <div class="nav-menu">
        <ul class="nav-list">
          <li><a href="#dashboard" class="nav-item" data-view="dashboard">📊 Dashboard</a></li>
          <li><a href="#tasks" class="nav-item" data-view="tasks">✓ My Tasks</a></li>
          <li><a href="#timer" class="nav-item" data-view="timer">⏱️ Time Tracker</a></li>
          <li><a href="#leaves" class="nav-item" data-view="leaves">🏖️ Leave Requests</a></li>
          <li><a href="#announcements" class="nav-item" data-view="announcements">📢 Announcements</a></li>
          <li><a href="#leaderboard" class="nav-item" data-view="leaderboard">🏆 Leaderboard</a></li>
          <li><a href="#settings" class="nav-item" data-view="settings">⚙️ Settings</a></li>
        </ul>
      </div>

      <div class="nav-user">
        <div class="user-info">
          <div class="user-avatar">${(this.currentUser?.firstName?.[0] || 'U').toUpperCase()}</div>
          <div class="user-details">
            <p class="user-name">${this.currentUser?.firstName} ${this.currentUser?.lastName}</p>
            <p class="user-role">Staff</p>
          </div>
        </div>
        <button class="btn-logout" id="logoutBtn">🚪 Logout</button>
      </div>
    `;

    document.body.appendChild(sidebar);
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const navToggle = document.getElementById('navToggle');
    const logoutBtn = document.getElementById('logoutBtn');
    const navItems = document.querySelectorAll('.nav-item');

    if (navToggle) {
      navToggle.addEventListener('click', () => this.toggleSidebar());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(item.dataset.view);
      });
    });

    // Close sidebar on mobile when item clicked
    if (window.innerWidth < 768) {
      navItems.forEach(item => {
        item.addEventListener('click', () => this.closeSidebar());
      });
    }
  },

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    const sidebar = document.getElementById('navigationSidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  },

  /**
   * Close sidebar
   */
  closeSidebar() {
    const sidebar = document.getElementById('navigationSidebar');
    if (sidebar) {
      sidebar.classList.remove('open');
    }
  },

  /**
   * Navigate to view
   */
  navigateTo(view) {
    // Dispatch custom event for index.html to handle
    window.dispatchEvent(new CustomEvent('navigationChange', { detail: { view } }));
  },

  /**
   * Handle logout
   */
  logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  },

  /**
   * Update active menu item
   */
  setActiveView(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for user data to be available from index.html
  const checkForUser = setInterval(() => {
    if (window.currentLoggedInUser) {
      clearInterval(checkForUser);
      NavigationSystem.init(window.currentLoggedInUser);
    }
  }, 100);

  // Timeout after 5 seconds
  setTimeout(() => clearInterval(checkForUser), 5000);
});
