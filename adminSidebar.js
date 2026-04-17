// ==============================================================================
// ADMIN SIDEBAR - User Management Component
// ==============================================================================
// Spreadsheet: https://docs.google.com/spreadsheets/d/1z75QwcAFGF5SkktCpiTygQAVIPh8cn9P1U5cxoEiW6w
// GAS Endpoint: https://script.google.com/macros/s/AKfycbw8bLplq_YA0oPbOuFTniFnhjMTOuFv9H-9GVd-Dp_r2zDMvfGlobqqQpc16tqoMesV/exec
// ==============================================================================

const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw8bLplq_YA0oPbOuFTniFnhjMTOuFv9H-9GVd-Dp_r2zDMvfGlobqqQpc16tqoMesV/exec';

class AdminSidebar {
  constructor() {
    this.employees = [];
    this.currentEditId = null;
    this.formMode = 'add'; // 'add' or 'edit'
    this.init();
  }

  /**
   * Initialize the sidebar and load existing employees
   */
  async init() {
    this.render();
    await this.loadEmployees();
    this.attachEventListeners();
  }

  /**
   * Render the sidebar HTML structure
   */
  render() {
    const sidebarHTML = `
      <aside class="admin-sidebar">
        <div class="sidebar-header">
          <h2>👥 User Management</h2>
          <button class="btn-close-sidebar" id="closeSidebar" title="Close">&times;</button>
        </div>

        <div class="sidebar-content">
          <!-- Form Section -->
          <div class="form-section">
            <h3 id="formTitle">Register New Employee</h3>
            
            <form id="userForm" class="user-form">
              <div class="form-group">
                <label for="empId">Employee ID</label>
                <input type="text" id="empId" name="empId" placeholder="GHZ0001" required />
              </div>

              <div class="form-group">
                <label for="firstName">First Name</label>
                <input type="text" id="firstName" name="firstName" placeholder="John" required />
              </div>

              <div class="form-group">
                <label for="lastName">Last Name</label>
                <input type="text" id="lastName" name="lastName" placeholder="Doe" required />
              </div>

              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required />
              </div>

              <div class="form-group">
                <label for="dept">Department</label>
                <select id="dept" name="dept" required>
                  <option value="">-- Select Department --</option>
                  <option value="ACCOUNTING">📊 ACCOUNTING</option>
                  <option value="INTERNAL AUDIT">📋 INTERNAL AUDIT</option>
                  <option value="HR">👥 HR</option>
                  <option value="FACILITIES">🏢 FACILITIES</option>
                  <option value="PROCESS IMP.">📈 PROCESS IMP.</option>
                  <option value="MARKETING">🎯 MARKETING</option>
                  <option value="ONLINE SALES">💻 ONLINE SALES</option>
                  <option value="PRODUCT">📦 PRODUCT</option>
                  <option value="RMA">🔄 RMA</option>
                  <option value="SALES & SUPPORT">🤝 SALES & SUPPORT</option>
                  <option value="WAREHOUSE">🏭 WAREHOUSE</option>
                  <option value="IT / NEXUS CORE">🖥️ IT / NEXUS CORE</option>
                </select>
              </div>

              <div class="form-group">
                <label for="role">Role</label>
                <select id="role" name="role" required>
                  <option value="">-- Select Role --</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

              <div class="form-group">
                <label for="status">Status</label>
                <select id="status" name="status" required>
                  <option value="">-- Select Status --</option>
                  <option value="Active">Active</option>
                  <option value="Idle">Idle</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div class="form-group">
                <label for="bio">Bio</label>
                <textarea id="bio" name="bio" placeholder="Brief bio or notes..." rows="3"></textarea>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" id="submitBtn">Register Employee</button>
                <button type="reset" class="btn btn-secondary" id="resetBtn">Clear</button>
                <button type="button" class="btn btn-danger" id="cancelEditBtn" style="display:none;">Cancel Edit</button>
              </div>
            </form>
          </div>

          <!-- Employees List Section -->
          <div class="list-section">
            <h3>Registered Employees</h3>
            <div class="search-box">
              <input type="text" id="employeeSearch" placeholder="🔍 Search by name or ID..." />
            </div>
            <div id="employeesList" class="employees-list">
              <p class="loading">Loading employees...</p>
            </div>
          </div>
        </div>
      </aside>
    `;

    // Create container if it doesn't exist
    let container = document.getElementById('adminSidebarContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'adminSidebarContainer';
      document.body.appendChild(container);
    }
    container.innerHTML = sidebarHTML;
  }

  /**
   * Load employees from the spreadsheet via GAS
   */
  async loadEmployees() {
    try {
      const response = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ action: 'getEmployees' })
      });

      const result = await response.json();
      if (result.success && result.data) {
        this.employees = result.data;
        this.renderEmployeesList();
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
      this.showNotification('Failed to load employees', 'error');
    }
  }

  /**
   * Render the employees list
   */
  renderEmployeesList(filter = '') {
    const listContainer = document.getElementById('employeesList');
    let filtered = this.employees;

    if (filter) {
      filtered = this.employees.filter(emp =>
        emp.firstName?.toLowerCase().includes(filter.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(filter.toLowerCase()) ||
        emp.empId?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = '<p class="no-data">No employees found</p>';
      return;
    }

    const html = filtered.map(emp => `
      <div class="employee-card">
        <div class="employee-info">
          <h4>${emp.firstName} ${emp.lastName}</h4>
          <p class="emp-id">ID: ${emp.empId}</p>
          <p class="emp-dept">${emp.dept || 'N/A'}</p>
          <p class="emp-role">Role: <span class="badge ${emp.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}">${emp.role}</span></p>
          <p class="emp-status">Status: <span class="badge ${emp.status === 'Active' ? 'badge-ok' : emp.status === 'Idle' ? 'badge-warn' : 'badge-danger'}">${emp.status}</span></p>
          ${emp.bio ? `<p class="emp-bio">${emp.bio}</p>` : ''}
        </div>
        <div class="employee-actions">
          <button class="btn btn-sm btn-primary" data-id="${emp.empId}" onclick="adminSidebar.editEmployee('${emp.empId}')">Edit</button>
          <button class="btn btn-sm btn-danger" data-id="${emp.empId}" onclick="adminSidebar.deleteEmployee('${emp.empId}')">Delete</button>
        </div>
      </div>
    `).join('');

    listContainer.innerHTML = html;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = document.getElementById('userForm');
    const closeBtn = document.getElementById('closeSidebar');
    const searchInput = document.getElementById('employeeSearch');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSidebar());
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderEmployeesList(e.target.value);
      });
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => this.cancelEdit());
    }
  }

  /**
   * Handle form submission (register or update)
   */
  async handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('userForm'));
    const data = Object.fromEntries(formData);

    try {
      const action = this.formMode === 'add' ? 'registerEmployee' : 'updateProfile';
      const response = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ action, ...data })
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification(
          this.formMode === 'add' ? 'Employee registered successfully!' : 'Employee updated successfully!',
          'success'
        );
        document.getElementById('userForm').reset();
        this.formMode = 'add';
        this.currentEditId = null;
        this.loadEmployees();
        this.resetForm();
      } else {
        this.showNotification(result.error || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showNotification('An error occurred', 'error');
    }
  }

  /**
   * Edit an existing employee
   */
  editEmployee(empId) {
    const employee = this.employees.find(e => e.empId === empId);
    if (!employee) return;

    this.formMode = 'edit';
    this.currentEditId = empId;

    document.getElementById('formTitle').textContent = `Edit ${employee.firstName} ${employee.lastName}`;
    document.getElementById('empId').value = employee.empId;
    document.getElementById('firstName').value = employee.firstName;
    document.getElementById('lastName').value = employee.lastName;
    document.getElementById('dept').value = employee.dept;
    document.getElementById('role').value = employee.role;
    document.getElementById('status').value = employee.status;
    document.getElementById('bio').value = employee.bio || '';
    document.getElementById('password').value = employee.password || '';

    document.getElementById('empId').disabled = true;
    document.getElementById('submitBtn').textContent = 'Update Employee';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';

    // Scroll form into view
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Delete an employee
   */
  async deleteEmployee(empId) {
    if (!confirm(`Are you sure you want to delete employee ${empId}?`)) return;

    try {
      const response = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteEmployee', empId })
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('Employee deleted successfully', 'success');
        this.loadEmployees();
      } else {
        this.showNotification(result.error || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      this.showNotification('An error occurred', 'error');
    }
  }

  /**
   * Cancel editing and reset form
   */
  cancelEdit() {
    this.formMode = 'add';
    this.currentEditId = null;
    this.resetForm();
  }

  /**
   * Reset form to initial state
   */
  resetForm() {
    document.getElementById('userForm').reset();
    document.getElementById('formTitle').textContent = 'Register New Employee';
    document.getElementById('empId').disabled = false;
    document.getElementById('submitBtn').textContent = 'Register Employee';
    document.getElementById('cancelEditBtn').style.display = 'none';
  }

  /**
   * Close sidebar
   */
  closeSidebar() {
    const container = document.getElementById('adminSidebarContainer');
    if (container) {
      container.style.display = 'none';
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
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
}

// Initialize globally
let adminSidebar;
document.addEventListener('DOMContentLoaded', () => {
  adminSidebar = new AdminSidebar();
});
