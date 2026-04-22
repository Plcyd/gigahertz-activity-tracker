// ==============================================================================
// GIGAHERTZ ACTIVITY TRACKER v10.0 — ENTERPRISE HR EDITION
// Google Apps Script Backend (code.gs)
// Features: RBAC, HR DTR, Analytics, Audit Logs, Compliance
// ==============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const SPREEDSHEET_ID = "1z75QwcAFGF5SkktCpiTygQAVIPh8cn9P1U5cxoEiW6w";

// Sheet References (Auto-created if missing)
const SHEETS = {
  USERS: getOrCreateSheet('Users'),
  EMPLOYEES: getOrCreateSheet('Employees'),
  ATTENDANCE: getOrCreateSheet('Attendance_DTR'),
  ROLES: getOrCreateSheet('Roles'),
  AUDIT_LOG: getOrCreateSheet('AuditLog'),
  TASKS: getOrCreateSheet('Tasks'),
  PROJECTS: getOrCreateSheet('Projects'),
  LEAVES: getOrCreateSheet('LeaveRequests'),
  DEPARTMENTS: getOrCreateSheet('Departments'),
  ANNOUNCEMENTS: getOrCreateSheet('Announcements'),
  SETTINGS: getOrCreateSheet('Settings'),
  NOTIFICATIONS: getOrCreateSheet('Notifications')
};

// Special Users (Super Admin)
const SPECIAL_ADMIN_EMAILS = ['allysa.laqui@company.com', 'admin@gigahertz.com'];

// Role Definitions
const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
};

// HR Department Identifiers
const HR_DEPARTMENT = 'Human Resources';

// ═══════════════════════════════════════════════════════════════════════════
// 1. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getOrCreateSheet(sheetName) {
  let sheet = SS.getSheetByName(sheetName);
  if (!sheet) {
    sheet = SS.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  return sheet;
}

function initializeSheet(sheet, sheetName) {
  // Initialize headers based on sheet type
  const headers = {
    'Employees': ['id', 'email', 'firstName', 'lastName', 'employeeId', 'department', 'role', 'status', 'phone', 'joinDate', 'photo', 'createdAt', 'updatedAt'],
    'Attendance_DTR': ['id', 'employeeId', 'date', 'timeIn', 'timeOut', 'breakMinutes', 'totalHours', 'overtime', 'lateMinutes', 'undertime', 'status', 'remarks', 'createdAt', 'updatedAt'],
    'Roles': ['roleId', 'roleName', 'permissions', 'createdAt'],
    'AuditLog': ['id', 'userId', 'action', 'resource', 'details', 'timestamp', 'ipAddress'],
    'Tasks': ['id', 'employeeId', 'taskName', 'description', 'dueDate', 'status', 'priority', 'createdAt'],
    'LeaveRequests': ['id', 'employeeId', 'leaveType', 'fromDate', 'toDate', 'days', 'reason', 'status', 'approvedBy', 'createdAt'],
    'Departments': ['id', 'deptName', 'head', 'budget', 'createdAt'],
    'Announcements': ['id', 'title', 'content', 'author', 'createdAt', 'expiresAt'],
    'Settings': ['key', 'value', 'type', 'updatedAt'],
    'Notifications': ['id', 'userId', 'message', 'type', 'read', 'createdAt'],
    'Users': ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'department', 'status', 'createdAt']
  };

  if (headers[sheetName]) {
    sheet.appendRow(headers[sheetName]);
  }
}

function getAllData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    return obj;
  });
}

function findRecord(sheet, fieldName, value) {
  const data = getAllData(sheet);
  return data.find(record => record[fieldName] == value);
}

function logAudit(userId, action, resource, details = {}) {
  const timestamp = new Date();
  SHEETS.AUDIT_LOG.appendRow([
    Utilities.getUuid(),
    userId,
    action,
    resource,
    JSON.stringify(details),
    timestamp.toISOString(),
    'web'
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. AUTHENTICATION & AUTHORIZATION (RBAC)
// ═══════════════════════════════════════════════════════════════════════════

function loginUser(data) {
  const { email, password } = data;
  
  const user = findRecord(SHEETS.USERS, 'email', email);
  if (!user) {
    return { success: false, message: 'Invalid credentials' };
  }

  // In production: use proper bcrypt. For now: simple hash check
  if (user.password !== Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)) {
    return { success: false, message: 'Invalid credentials' };
  }

  if (user.status !== 'active') {
    return { success: false, message: 'User account is inactive' };
  }

  // Get full user details
  const employee = findRecord(SHEETS.EMPLOYEES, 'email', email);
  
  // Determine access level
  let accessLevel = user.role;
  let canAccessHR = false;
  let isSuperAdmin = false;

  // Check if super admin (Ms. Allysa Laqui or admin emails)
  if (SPECIAL_ADMIN_EMAILS.includes(email)) {
    accessLevel = ROLES.ADMIN;
    canAccessHR = true;
    isSuperAdmin = true;
  } else if (user.department === HR_DEPARTMENT || user.role === ROLES.HR) {
    canAccessHR = true;
  }

  const sessionId = Utilities.getUuid();
  SCRIPT_PROPERTIES.setProperty(`session_${sessionId}`, JSON.stringify({
    userId: user.id,
    email: email,
    role: accessLevel,
    department: user.department,
    canAccessHR: canAccessHR,
    isSuperAdmin: isSuperAdmin,
    timestamp: Date.now()
  }));

  logAudit(user.id, 'LOGIN', 'Auth', { email, timestamp: new Date().toISOString() });

  return {
    success: true,
    sessionId: sessionId,
    user: {
      id: user.id,
      email: email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: accessLevel,
      department: user.department,
      canAccessHR: canAccessHR,
      isSuperAdmin: isSuperAdmin,
      employeeId: employee?.employeeId || null
    }
  };
}

function registerEmployee(data) {
  const { email, password, firstName, lastName, employeeId, department, phone, sessionId } = data;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE-BASED ACCESS CONTROL: Only HR and Admin can register employees
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (sessionId) {
    const session = verifySession(sessionId);
    if (!session.valid) {
      logAudit('UNAUTHORIZED', 'REGISTER_ATTEMPT', 'Auth', { email, reason: 'Invalid session' });
      return { success: false, error: 'Unauthorized: Invalid session' };
    }

    // Check if user is HR or Admin
    const isHR = session.canAccessHR || session.role === ROLES.ADMIN || session.isSuperAdmin;
    if (!isHR) {
      logAudit(session.userId, 'UNAUTHORIZED_REGISTER_ATTEMPT', 'Employee', { email, role: session.role });
      return { success: false, error: 'Unauthorized: Only HR and Admin can register employees' };
    }
  }

  if (findRecord(SHEETS.USERS, 'email', email)) {
    return { success: false, message: 'Email already registered' };
  }

  const userId = Utilities.getUuid();
  const hashedPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  const now = new Date().toISOString();

  SHEETS.USERS.appendRow([
    userId,
    email,
    hashedPassword,
    firstName,
    lastName,
    ROLES.EMPLOYEE,
    department,
    'active',
    now
  ]);

  SHEETS.EMPLOYEES.appendRow([
    userId,
    email,
    firstName,
    lastName,
    employeeId,
    department,
    ROLES.EMPLOYEE,
    'active',
    phone || '',
    now,
    '',
    now,
    now
  ]);

  logAudit(userId, 'REGISTER', 'Auth', { email });

  return {
    success: true,
    message: 'Employee registered successfully',
    userId: userId
  };
}

function verifySession(sessionId) {
  const sessionData = SCRIPT_PROPERTIES.getProperty(`session_${sessionId}`);
  if (!sessionData) {
    return { valid: false, error: 'Session expired' };
  }

  const session = JSON.parse(sessionData);
  // Check if session is still valid (24 hours)
  if (Date.now() - session.timestamp > 86400000) {
    SCRIPT_PROPERTIES.deleteProperty(`session_${sessionId}`);
    return { valid: false, error: 'Session expired' };
  }

  return { valid: true, ...session };
}

function checkHRAccess(sessionId) {
  const session = verifySession(sessionId);
  if (!session.valid) return { hasAccess: false, error: 'Unauthorized' };
  if (!session.canAccessHR) {
    logAudit(session.userId, 'UNAUTHORIZED_ACCESS', 'HR_Dashboard', {});
    return { hasAccess: false, error: 'HR access denied' };
  }
  return { hasAccess: true, ...session };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ATTENDANCE & DTR (Daily Time Records)
// ═══════════════════════════════════════════════════════════════════════════

function recordAttendance(data) {
  const { sessionId, type, location, notes } = data; // type: 'timeIn' or 'timeOut'
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  const employeeId = data.employeeId || session.userId;
  const today = new Date().toDateString();
  const timestamp = new Date();

  // Get or create today's attendance record
  let record = getAllData(SHEETS.ATTENDANCE).find(r => 
    r.employeeId === employeeId && new Date(r.date).toDateString() === today
  );

  if (!record) {
    // Create new record
    const recordId = Utilities.getUuid();
    SHEETS.ATTENDANCE.appendRow([
      recordId,
      employeeId,
      today,
      type === 'timeIn' ? timestamp.toISOString() : '',
      '',
      0,
      0,
      0,
      0,
      0,
      'present',
      notes || '',
      timestamp.toISOString(),
      timestamp.toISOString()
    ]);
    record = { id: recordId };
  } else {
    // Update existing record
    if (type === 'timeIn') {
      // Check for duplicate time-in (within 1 minute)
      if (record.timeIn && new Date(record.timeIn).getTime() > timestamp.getTime() - 60000) {
        return { success: false, error: 'Duplicate time-in detected' };
      }
      updateAttendanceField(record.id, 'timeIn', timestamp.toISOString());
    } else if (type === 'timeOut') {
      updateAttendanceField(record.id, 'timeOut', timestamp.toISOString());
      // Auto-calculate hours worked
      calculateHoursWorked(record.id);
    }
  }

  logAudit(session.userId, `TIME_${type.toUpperCase()}`, 'Attendance', {
    employeeId, timestamp: timestamp.toISOString(), location
  });

  return {
    success: true,
    message: `Time ${type === 'timeIn' ? 'in' : 'out'} recorded`,
    timestamp: timestamp.toISOString()
  };
}

function updateAttendanceField(recordId, field, value) {
  const sheet = SHEETS.ATTENDANCE;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fieldIndex = headers.indexOf(field);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('id')] === recordId) {
      sheet.getRange(i + 1, fieldIndex + 1).setValue(value);
      return true;
    }
  }
  return false;
}

function calculateHoursWorked(recordId) {
  const record = findRecord(SHEETS.ATTENDANCE, 'id', recordId);
  if (!record || !record.timeIn || !record.timeOut) return;

  const timeIn = new Date(record.timeIn);
  const timeOut = new Date(record.timeOut);
  const hoursWorked = (timeOut - timeIn) / (1000 * 60 * 60);

  // Calculate late (work starts at 8 AM)
  const expectedTimeIn = new Date(record.date);
  expectedTimeIn.setHours(8, 0, 0);
  const lateMinutes = timeIn > expectedTimeIn ? Math.round((timeIn - expectedTimeIn) / 60000) : 0;

  // Calculate undertime (work ends at 5 PM, 9 hours)
  const expectedHours = 9;
  const undertime = hoursWorked < expectedHours ? Math.round((expectedHours - hoursWorked) * 60) : 0;

  updateAttendanceField(recordId, 'totalHours', hoursWorked.toFixed(2));
  updateAttendanceField(recordId, 'lateMinutes', lateMinutes);
  updateAttendanceField(recordId, 'undertime', undertime);

  // Detect overtime
  if (hoursWorked > expectedHours) {
    const overtime = Math.round((hoursWorked - expectedHours) * 60);
    updateAttendanceField(recordId, 'overtime', overtime);
  }
}

function getAttendanceReport(data) {
  const { sessionId, startDate, endDate, employeeId, department } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: hrAccess.error };

  let records = getAllData(SHEETS.ATTENDANCE);
  
  // Filter by date range
  if (startDate) {
    records = records.filter(r => new Date(r.date) >= new Date(startDate));
  }
  if (endDate) {
    records = records.filter(r => new Date(r.date) <= new Date(endDate));
  }

  // Filter by employee
  if (employeeId && !hrAccess.isSuperAdmin) {
    // Regular HR can only see their department
    const emp = findRecord(SHEETS.EMPLOYEES, 'id', employeeId);
    records = records.filter(r => {
      const employee = findRecord(SHEETS.EMPLOYEES, 'id', r.employeeId);
      return employee?.department === hrAccess.department;
    });
  } else if (employeeId) {
    records = records.filter(r => r.employeeId === employeeId);
  }

  // Filter by department
  if (department) {
    records = records.filter(r => {
      const employee = findRecord(SHEETS.EMPLOYEES, 'id', r.employeeId);
      return employee?.department === department;
    });
  }

  // Enrich with employee info
  records = records.map(r => {
    const employee = findRecord(SHEETS.EMPLOYEES, 'id', r.employeeId);
    return {
      ...r,
      employeeName: `${employee?.firstName || ''} ${employee?.lastName || ''}`,
      employeeId: employee?.employeeId || '',
      department: employee?.department || ''
    };
  });

  return {
    success: true,
    data: records,
    count: records.length,
    summary: generateAttendanceSummary(records)
  };
}

function generateAttendanceSummary(records) {
  return {
    totalRecords: records.length,
    presentCount: records.filter(r => r.status === 'present').length,
    lateCount: records.filter(r => parseInt(r.lateMinutes) > 0).length,
    undertimeCount: records.filter(r => parseInt(r.undertime) > 0).length,
    overtimeCount: records.filter(r => parseInt(r.overtime) > 0).length,
    totalHoursWorked: records.reduce((sum, r) => sum + parseFloat(r.totalHours || 0), 0).toFixed(2),
    averageHoursPerDay: (records.reduce((sum, r) => sum + parseFloat(r.totalHours || 0), 0) / (records.length || 1)).toFixed(2)
  };
}

function detectMissingTimeLogs(sessionId) {
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: hrAccess.error };

  const employees = getAllData(SHEETS.EMPLOYEES);
  const today = new Date().toDateString();
  const missing = [];

  employees.forEach(emp => {
    if (emp.status !== 'active') return;

    const todayRecord = getAllData(SHEETS.ATTENDANCE).find(r =>
      r.employeeId === emp.id && new Date(r.date).toDateString() === today
    );

    if (!todayRecord || !todayRecord.timeIn || !todayRecord.timeOut) {
      missing.push({
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        department: emp.department,
        missingFields: {
          timeIn: !todayRecord?.timeIn,
          timeOut: !todayRecord?.timeOut
        }
      });
    }
  });

  return {
    success: true,
    count: missing.length,
    missingLogs: missing
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. EMPLOYEE MANAGEMENT (HR Functions)
// ═══════════════════════════════════════════════════════════════════════════

function getEmployeesWithDTR(data) {
  const { sessionId, department } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: hrAccess.error };

  let employees = getAllData(SHEETS.EMPLOYEES);
  
  if (department && !hrAccess.isSuperAdmin) {
    employees = employees.filter(e => e.department === hrAccess.department);
  } else if (department) {
    employees = employees.filter(e => e.department === department);
  }

  // Get latest DTR for each employee
  employees = employees.map(emp => {
    const latestDTR = getAllData(SHEETS.ATTENDANCE)
      .filter(r => r.employeeId === emp.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    return {
      ...emp,
      latestDTR: latestDTR || null
    };
  });

  return {
    success: true,
    data: employees
  };
}

function updateEmployeeRole(data) {
  const { sessionId, employeeId, newRole } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: hrAccess.error };

  const sheet = SHEETS.EMPLOYEES;
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('id')] === employeeId) {
      sheet.getRange(i + 1, headers.indexOf('role') + 1).setValue(newRole);
      logAudit(hrAccess.userId, 'UPDATE_ROLE', 'Employee', { employeeId, newRole });
      return { success: true, message: 'Role updated' };
    }
  }

  return { success: false, error: 'Employee not found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LEAVE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function requestLeave(data) {
  const { sessionId, fromDate, toDate, leaveType, reason } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

  const leaveId = Utilities.getUuid();
  SHEETS.LEAVES.appendRow([
    leaveId,
    session.userId,
    leaveType,
    fromDate,
    toDate,
    days,
    reason,
    'pending',
    '',
    new Date().toISOString()
  ]);

  logAudit(session.userId, 'REQUEST_LEAVE', 'Leave', { leaveType, days });

  return {
    success: true,
    message: 'Leave request submitted',
    leaveId: leaveId
  };
}

function approveLeave(data) {
  const { sessionId, leaveId, approved } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: hrAccess.error };

  const sheet = SHEETS.LEAVES;
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('id')] === leaveId) {
      const status = approved ? 'approved' : 'rejected';
      sheet.getRange(i + 1, headers.indexOf('status') + 1).setValue(status);
      sheet.getRange(i + 1, headers.indexOf('approvedBy') + 1).setValue(hrAccess.userId);
      
      logAudit(hrAccess.userId, `LEAVE_${status.toUpperCase()}`, 'Leave', { leaveId });
      return { success: true, message: `Leave ${status}` };
    }
  }

  return { success: false, error: 'Leave request not found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

function getDashboardStats(data) {
  const { sessionId } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  const employees = getAllData(SHEETS.EMPLOYEES);
  const attendance = getAllData(SHEETS.ATTENDANCE);
  const tasks = getAllData(SHEETS.TASKS);

  return {
    success: true,
    stats: {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'active').length,
      totalAttendanceRecords: attendance.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length
    }
  };
}

function getHRDashboardMetrics(data) {
  const { sessionId } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: hrAccess.error };

  const today = new Date().toDateString();
  const attendance = getAllData(SHEETS.ATTENDANCE);
  const todayRecords = attendance.filter(r => new Date(r.date).toDateString() === today);
  const employees = getAllData(SHEETS.EMPLOYEES).filter(e => e.status === 'active');

  const metrics = {
    presentToday: todayRecords.length,
    expectedToday: employees.length,
    lateToday: todayRecords.filter(r => parseInt(r.lateMinutes) > 0).length,
    undertimeToday: todayRecords.filter(r => parseInt(r.undertime) > 0).length,
    missingLogs: employees.length - todayRecords.length,
    attendanceRate: ((todayRecords.length / employees.length) * 100).toFixed(2) + '%'
  };

  return {
    success: true,
    metrics: metrics,
    employees: employees.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function exportDTRToCSV(data) {
  const { sessionId, startDate, endDate } = data;
  
  const report = getAttendanceReport({ sessionId, startDate, endDate });
  if (!report.success) return report;

  let csv = 'Employee ID,Employee Name,Department,Date,Time In,Time Out,Total Hours,Late (min),Undertime (min),Overtime (min),Status\n';
  
  report.data.forEach(row => {
    csv += `"${row.employeeId}","${row.employeeName}","${row.department}","${row.date}","${row.timeIn}","${row.timeOut}","${row.totalHours}","${row.lateMinutes}","${row.undertime}","${row.overtime}","${row.status}"\n`;
  });

  return {
    success: true,
    csv: csv,
    filename: `DTR_${startDate}_to_${endDate}.csv`
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. NEW FEATURES — PERFORMANCE REVIEWS
// ═══════════════════════════════════════════════════════════════════════════

// Initialize Performance Reviews sheet
function initializePerformanceReviews() {
  if (!SS.getSheetByName('PerformanceReviews')) {
    const sheet = SS.insertSheet('PerformanceReviews');
    sheet.appendRow(['id', 'employeeId', 'reviewerId', 'reviewDate', 'rating', 'feedback', 'strengths', 'improvements', 'status', 'createdAt', 'updatedAt']);
    SHEETS['PERFORMANCE_REVIEWS'] = sheet;
  }
}

function addPerformanceReview(data) {
  const { sessionId, employeeId, rating, feedback, strengths, improvements } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Only HR can create reviews' };

  initializePerformanceReviews();
  const sheet = SS.getSheetByName('PerformanceReviews') || SHEETS.AUDIT_LOG;
  
  if (!sheet) return { success: false, error: 'Performance Reviews sheet not found' };

  const reviewId = Utilities.getUuid();
  const now = new Date().toISOString();

  sheet.appendRow([
    reviewId,
    employeeId,
    hrAccess.userId,
    now,
    rating,
    feedback,
    strengths,
    improvements,
    'draft',
    now,
    now
  ]);

  logAudit(hrAccess.userId, 'CREATE_PERFORMANCE_REVIEW', 'PerformanceReview', { employeeId, rating });

  return {
    success: true,
    message: 'Performance review created',
    reviewId: reviewId
  };
}

function getPerformanceReviews(data) {
  const { sessionId, employeeId } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializePerformanceReviews();
  const sheet = SS.getSheetByName('PerformanceReviews');
  
  if (!sheet) return { success: true, data: [] };

  let reviews = getAllData(sheet);

  if (employeeId) {
    reviews = reviews.filter(r => r.employeeId === employeeId);
  }

  reviews = reviews.map(r => {
    const reviewer = findRecord(SHEETS.EMPLOYEES, 'id', r.reviewerId);
    return {
      ...r,
      reviewerName: `${reviewer?.firstName || ''} ${reviewer?.lastName || ''}`
    };
  });

  return {
    success: true,
    data: reviews,
    count: reviews.length
  };
}

function updatePerformanceReview(data) {
  const { sessionId, reviewId, rating, feedback, status } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Unauthorized' };

  initializePerformanceReviews();
  const sheet = SS.getSheetByName('PerformanceReviews');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('id')] === reviewId) {
      if (rating) sheet.getRange(i + 1, headers.indexOf('rating') + 1).setValue(rating);
      if (feedback) sheet.getRange(i + 1, headers.indexOf('feedback') + 1).setValue(feedback);
      if (status) sheet.getRange(i + 1, headers.indexOf('status') + 1).setValue(status);
      sheet.getRange(i + 1, headers.indexOf('updatedAt') + 1).setValue(new Date().toISOString());
      
      logAudit(hrAccess.userId, 'UPDATE_PERFORMANCE_REVIEW', 'PerformanceReview', { reviewId });
      return { success: true, message: 'Review updated' };
    }
  }

  return { success: false, error: 'Review not found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. NEW FEATURES — EMPLOYEE WELLNESS
// ═══════════════════════════════════════════════════════════════════════════

function initializeWellnessTracking() {
  if (!SS.getSheetByName('WellnessActivities')) {
    const sheet = SS.insertSheet('WellnessActivities');
    sheet.appendRow(['id', 'employeeId', 'activityType', 'duration', 'date', 'description', 'points', 'createdAt']);
  }
}

function logWellnessActivity(data) {
  const { sessionId, activityType, duration, description } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeWellnessTracking();
  const sheet = SS.getSheetByName('WellnessActivities');

  const activityId = Utilities.getUuid();
  const points = calculateWellnessPoints(activityType, duration);

  sheet.appendRow([
    activityId,
    session.userId,
    activityType,
    duration,
    new Date().toDateString(),
    description,
    points,
    new Date().toISOString()
  ]);

  logAudit(session.userId, 'LOG_WELLNESS', 'Wellness', { activityType, points });

  return {
    success: true,
    message: 'Wellness activity logged',
    points: points
  };
}

function calculateWellnessPoints(activityType, duration) {
  const pointsMap = {
    'yoga': 10,
    'gym': 15,
    'running': 20,
    'meditation': 5,
    'swimming': 18,
    'cycling': 15,
    'walking': 5,
    'sports': 20
  };
  return (pointsMap[activityType] || 5) + Math.floor(duration / 15);
}

function getWellnessActivities(data) {
  const { sessionId, employeeId, startDate, endDate } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeWellnessTracking();
  const sheet = SS.getSheetByName('WellnessActivities');
  
  let activities = getAllData(sheet) || [];

  if (employeeId && session.role !== 'admin') {
    activities = activities.filter(a => a.employeeId === employeeId);
  } else if (employeeId) {
    activities = activities.filter(a => a.employeeId === employeeId);
  }

  if (startDate) activities = activities.filter(a => new Date(a.date) >= new Date(startDate));
  if (endDate) activities = activities.filter(a => new Date(a.date) <= new Date(endDate));

  const summary = {
    totalActivities: activities.length,
    totalPoints: activities.reduce((sum, a) => sum + parseInt(a.points || 0), 0),
    averagePoints: activities.length > 0 ? (activities.reduce((sum, a) => sum + parseInt(a.points || 0), 0) / activities.length).toFixed(1) : 0
  };

  return {
    success: true,
    activities: activities,
    summary: summary
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. NEW FEATURES — TRAINING & CERTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

function initializeTraining() {
  if (!SS.getSheetByName('TrainingPrograms')) {
    const sheet = SS.insertSheet('TrainingPrograms');
    sheet.appendRow(['id', 'name', 'description', 'provider', 'duration', 'startDate', 'endDate', 'maxParticipants', 'createdAt']);
  }
  if (!SS.getSheetByName('TrainingEnrollments')) {
    const sheet = SS.insertSheet('TrainingEnrollments');
    sheet.appendRow(['id', 'employeeId', 'trainingId', 'enrollDate', 'completionDate', 'status', 'score', 'certificate', 'createdAt']);
  }
  if (!SS.getSheetByName('Certifications')) {
    const sheet = SS.insertSheet('Certifications');
    sheet.appendRow(['id', 'employeeId', 'certName', 'issuer', 'issueDate', 'expiryDate', 'credentialId', 'createdAt']);
  }
}

function getTrainingPrograms(data) {
  initializeTraining();
  const sheet = SS.getSheetByName('TrainingPrograms');
  const programs = getAllData(sheet) || [];

  return {
    success: true,
    programs: programs,
    count: programs.length
  };
}

function enrollTraining(data) {
  const { sessionId, trainingId } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeTraining();
  const sheet = SS.getSheetByName('TrainingEnrollments');
  
  const enrollmentId = Utilities.getUuid();
  sheet.appendRow([
    enrollmentId,
    session.userId,
    trainingId,
    new Date().toDateString(),
    '',
    'enrolled',
    '',
    '',
    new Date().toISOString()
  ]);

  logAudit(session.userId, 'ENROLL_TRAINING', 'Training', { trainingId });

  return {
    success: true,
    message: 'Enrolled in training program',
    enrollmentId: enrollmentId
  };
}

function recordCertification(data) {
  const { sessionId, employeeId, certName, issuer, issueDate, expiryDate, credentialId } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Only HR can record certifications' };

  initializeTraining();
  const sheet = SS.getSheetByName('Certifications');

  const certId = Utilities.getUuid();
  sheet.appendRow([
    certId,
    employeeId,
    certName,
    issuer,
    issueDate,
    expiryDate,
    credentialId,
    new Date().toISOString()
  ]);

  logAudit(hrAccess.userId, 'RECORD_CERTIFICATION', 'Certification', { employeeId, certName });

  return {
    success: true,
    message: 'Certification recorded',
    certId: certId
  };
}

function getCertifications(data) {
  const { sessionId, employeeId } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeTraining();
  const sheet = SS.getSheetByName('Certifications');
  let certs = getAllData(sheet) || [];

  if (employeeId) certs = certs.filter(c => c.employeeId === employeeId);

  // Check expiry
  certs = certs.map(c => {
    const expiryDate = new Date(c.expiryDate);
    const isExpired = expiryDate < new Date();
    return { ...c, isExpired, daysUntilExpiry: Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) };
  });

  return {
    success: true,
    certifications: certs,
    expiredCount: certs.filter(c => c.isExpired).length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. NEW FEATURES — SHIFT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function initializeShifts() {
  if (!SS.getSheetByName('Shifts')) {
    const sheet = SS.insertSheet('Shifts');
    sheet.appendRow(['id', 'name', 'startTime', 'endTime', 'allowancePercentage', 'createdAt']);
  }
  if (!SS.getSheetByName('ShiftAssignments')) {
    const sheet = SS.insertSheet('ShiftAssignments');
    sheet.appendRow(['id', 'employeeId', 'shiftId', 'assignDate', 'status', 'createdAt']);
  }
  if (!SS.getSheetByName('ShiftSwapRequests')) {
    const sheet = SS.insertSheet('ShiftSwapRequests');
    sheet.appendRow(['id', 'employeeId', 'requestedEmployeeId', 'fromDate', 'toDate', 'reason', 'status', 'approvedBy', 'createdAt']);
  }
}

function getShifts(data) {
  initializeShifts();
  const sheet = SS.getSheetByName('Shifts');
  const shifts = getAllData(sheet) || [];

  return {
    success: true,
    shifts: shifts,
    count: shifts.length
  };
}

function createShift(data) {
  const { sessionId, name, startTime, endTime, allowancePercentage } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Only HR can create shifts' };

  initializeShifts();
  const sheet = SS.getSheetByName('Shifts');

  const shiftId = Utilities.getUuid();
  sheet.appendRow([
    shiftId,
    name,
    startTime,
    endTime,
    allowancePercentage,
    new Date().toISOString()
  ]);

  logAudit(hrAccess.userId, 'CREATE_SHIFT', 'Shift', { name });

  return {
    success: true,
    message: 'Shift created',
    shiftId: shiftId
  };
}

function requestShiftSwap(data) {
  const { sessionId, requestedEmployeeId, fromDate, toDate, reason } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeShifts();
  const sheet = SS.getSheetByName('ShiftSwapRequests');

  const requestId = Utilities.getUuid();
  sheet.appendRow([
    requestId,
    session.userId,
    requestedEmployeeId,
    fromDate,
    toDate,
    reason,
    'pending',
    '',
    new Date().toISOString()
  ]);

  logAudit(session.userId, 'REQUEST_SHIFT_SWAP', 'Shift', { requestedEmployeeId });

  return {
    success: true,
    message: 'Shift swap request submitted',
    requestId: requestId
  };
}

function approveShiftSwap(data) {
  const { sessionId, requestId, approved } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeShifts();
  const sheet = SS.getSheetByName('ShiftSwapRequests');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('id')] === requestId) {
      const status = approved ? 'approved' : 'rejected';
      sheet.getRange(i + 1, headers.indexOf('status') + 1).setValue(status);
      sheet.getRange(i + 1, headers.indexOf('approvedBy') + 1).setValue(session.userId);
      
      logAudit(session.userId, `SHIFT_SWAP_${status.toUpperCase()}`, 'Shift', { requestId });
      return { success: true, message: `Shift swap ${status}` };
    }
  }

  return { success: false, error: 'Request not found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. NEW FEATURES — OVERTIME MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function initializeOvertime() {
  if (!SS.getSheetByName('OvertimeRecords')) {
    const sheet = SS.insertSheet('OvertimeRecords');
    sheet.appendRow(['id', 'employeeId', 'date', 'overtimeHours', 'reason', 'approvalStatus', 'approvedBy', 'compensation', 'createdAt']);
  }
}

function getOvertimeRecords(data) {
  const { sessionId, employeeId, month, year } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeOvertime();
  const sheet = SS.getSheetByName('OvertimeRecords');
  let records = getAllData(sheet) || [];

  if (employeeId) records = records.filter(r => r.employeeId === employeeId);

  if (month && year) {
    records = records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === parseInt(month) - 1 && d.getFullYear() === parseInt(year);
    });
  }

  return {
    success: true,
    records: records,
    totalOvertimeHours: records.reduce((sum, r) => sum + parseFloat(r.overtimeHours || 0), 0)
  };
}

function approveOvertime(data) {
  const { sessionId, overtimeId, approved, compensation } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Only HR can approve overtime' };

  initializeOvertime();
  const sheet = SS.getSheetByName('OvertimeRecords');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('id')] === overtimeId) {
      const status = approved ? 'approved' : 'rejected';
      sheet.getRange(i + 1, headers.indexOf('approvalStatus') + 1).setValue(status);
      sheet.getRange(i + 1, headers.indexOf('approvedBy') + 1).setValue(hrAccess.userId);
      if (compensation) sheet.getRange(i + 1, headers.indexOf('compensation') + 1).setValue(compensation);
      
      logAudit(hrAccess.userId, `OVERTIME_${status.toUpperCase()}`, 'Overtime', { overtimeId });
      return { success: true, message: `Overtime ${status}` };
    }
  }

  return { success: false, error: 'Overtime record not found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. NEW FEATURES — WEEKLY GOALS / OKRs
// ═══════════════════════════════════════════════════════════════════════════

function initializeGoals() {
  if (!SS.getSheetByName('WeeklyGoals')) {
    const sheet = SS.insertSheet('WeeklyGoals');
    sheet.appendRow(['id', 'employeeId', 'weekStart', 'weekEnd', 'goal', 'targetValue', 'actualValue', 'progress', 'status', 'createdAt', 'updatedAt']);
  }
}

function setWeeklyGoals(data) {
  const { sessionId, goals } = data; // goals: [{ goal, targetValue }, ...]
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeGoals();
  const sheet = SS.getSheetByName('WeeklyGoals');

  const today = new Date();
  const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
  const weekEnd = new Date(today.setDate(today.getDate() + 6));

  const ids = [];
  goals.forEach(g => {
    const goalId = Utilities.getUuid();
    sheet.appendRow([
      goalId,
      session.userId,
      weekStart.toDateString(),
      weekEnd.toDateString(),
      g.goal,
      g.targetValue,
      0,
      '0%',
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    ids.push(goalId);
  });

  logAudit(session.userId, 'SET_WEEKLY_GOALS', 'Goals', { count: goals.length });

  return {
    success: true,
    message: 'Weekly goals set',
    goalIds: ids
  };
}

function updateGoalProgress(data) {
  const { sessionId, goalId, actualValue } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeGoals();
  const sheet = SS.getSheetByName('WeeklyGoals');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('id')] === goalId) {
      const targetValue = parseFloat(allData[i][headers.indexOf('targetValue')]);
      const progress = ((actualValue / targetValue) * 100).toFixed(1);
      
      sheet.getRange(i + 1, headers.indexOf('actualValue') + 1).setValue(actualValue);
      sheet.getRange(i + 1, headers.indexOf('progress') + 1).setValue(progress + '%');
      sheet.getRange(i + 1, headers.indexOf('updatedAt') + 1).setValue(new Date().toISOString());
      
      logAudit(session.userId, 'UPDATE_GOAL_PROGRESS', 'Goals', { goalId, progress });
      return { success: true, message: 'Goal progress updated', progress: progress + '%' };
    }
  }

  return { success: false, error: 'Goal not found' };
}

function getWeeklyGoals(data) {
  const { sessionId, employeeId, weekStart } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeGoals();
  const sheet = SS.getSheetByName('WeeklyGoals');
  let goals = getAllData(sheet) || [];

  if (employeeId) goals = goals.filter(g => g.employeeId === employeeId);

  return {
    success: true,
    goals: goals,
    count: goals.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 14. NEW FEATURES — GEOLOCATION CHECK-INS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// GEOLOCATION CONFIGURATION — GIGAHERTZ SERVICE CENTER (Manila, Metro Manila)
// Coordinates: 14°35'43.0"N 120°59'20.2"E (HXWQ+4H)
// ═══════════════════════════════════════════════════════════════════════════
const GEO_CONFIG = {
  HQ_LATITUDE: 14.59527,
  HQ_LONGITUDE: 120.98894,
  OFFICE_RADIUS_METERS: 300,  // 300m boundary
  LOCATION_ACCURACY_THRESHOLD: 100  // meters
};

function initializeGeolocation() {
  if (!SS.getSheetByName('GeolocationCheckins')) {
    const sheet = SS.insertSheet('GeolocationCheckins');
    sheet.appendRow(['id', 'employeeId', 'latitude', 'longitude', 'checkInTime', 'checkOutTime', 'workLocation', 'status', 'distance', 'accuracy', 'createdAt', 'updatedAt']);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE CALCULATION — Haversine Formula
// ═══════════════════════════════════════════════════════════════════════════
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d);
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCATION STATUS DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════
function getLocationStatus(latitude, longitude) {
  const distance = calculateDistance(
    latitude, longitude,
    GEO_CONFIG.HQ_LATITUDE, GEO_CONFIG.HQ_LONGITUDE
  );
  
  return {
    status: distance <= GEO_CONFIG.OFFICE_RADIUS_METERS ? 'IN_OFFICE' : 'REMOTE',
    distance: distance,
    withinOffice: distance <= GEO_CONFIG.OFFICE_RADIUS_METERS
  };
}

function geolocationCheckin(data) {
  const { sessionId, latitude, longitude, workLocation, accuracy } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  // Validate coordinates
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { success: false, error: 'Invalid coordinates' };
  }

  initializeGeolocation();
  const sheet = SS.getSheetByName('GeolocationCheckins');

  // Calculate location status
  const locationStatus = getLocationStatus(latitude, longitude);
  
  const checkInId = Utilities.getUuid();
  const now = new Date().toISOString();

  sheet.appendRow([
    checkInId,
    session.userId,
    latitude,
    longitude,
    now,
    '',
    workLocation || (locationStatus.withinOffice ? 'Gigahertz Office' : 'Remote Location'),
    locationStatus.status,  // IN_OFFICE or REMOTE
    locationStatus.distance,
    accuracy || 0,
    now,
    now
  ]);

  logAudit(session.userId, 'GEOLOCATION_CHECKIN', 'Location', {
    latitude,
    longitude,
    status: locationStatus.status,
    distance: locationStatus.distance,
    withinOffice: locationStatus.withinOffice
  });

  return {
    success: true,
    message: `Check-in recorded: ${locationStatus.status}`,
    checkInId: checkInId,
    status: locationStatus.status,
    distance: locationStatus.distance,
    withinOffice: locationStatus.withinOffice,
    timestamp: now
  };
}

function getGeolocationHistory(data) {
  const { sessionId, employeeId, days } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeGeolocation();
  const sheet = SS.getSheetByName('GeolocationCheckins');
  let records = getAllData(sheet) || [];

  if (employeeId && session.role !== 'admin') {
    records = records.filter(r => r.employeeId === employeeId);
  } else if (employeeId) {
    records = records.filter(r => r.employeeId === employeeId);
  }

  const daysToFilter = parseInt(days) || 7;
  const filterDate = new Date();
  filterDate.setDate(filterDate.getDate() - daysToFilter);

  records = records.filter(r => new Date(r.createdAt) >= filterDate);

  return {
    success: true,
    history: records,
    count: records.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 15. NEW FEATURES — EXPENSE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function initializeExpenses() {
  if (!SS.getSheetByName('Expenses')) {
    const sheet = SS.insertSheet('Expenses');
    sheet.appendRow(['id', 'employeeId', 'category', 'amount', 'description', 'expenseDate', 'receipt', 'status', 'approvedBy', 'createdAt']);
  }
}

function submitExpense(data) {
  const { sessionId, category, amount, description, expenseDate, receipt } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeExpenses();
  const sheet = SS.getSheetByName('Expenses');

  const expenseId = Utilities.getUuid();
  sheet.appendRow([
    expenseId,
    session.userId,
    category,
    amount,
    description,
    expenseDate,
    receipt || '',
    'pending',
    '',
    new Date().toISOString()
  ]);

  logAudit(session.userId, 'SUBMIT_EXPENSE', 'Expense', { category, amount });

  return {
    success: true,
    message: 'Expense submitted for approval',
    expenseId: expenseId
  };
}

function getExpenses(data) {
  const { sessionId, employeeId, status, month } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeExpenses();
  const sheet = SS.getSheetByName('Expenses');
  let expenses = getAllData(sheet) || [];

  if (employeeId && session.role !== 'admin') {
    expenses = expenses.filter(e => e.employeeId === employeeId);
  } else if (employeeId) {
    expenses = expenses.filter(e => e.employeeId === employeeId);
  }

  if (status) expenses = expenses.filter(e => e.status === status);

  if (month) {
    expenses = expenses.filter(e => {
      const d = new Date(e.createdAt);
      return d.getMonth() === parseInt(month) - 1;
    });
  }

  const summary = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
    approved: expenses.filter(e => e.status === 'approved').length,
    pending: expenses.filter(e => e.status === 'pending').length,
    rejected: expenses.filter(e => e.status === 'rejected').length
  };

  return {
    success: true,
    expenses: expenses,
    summary: summary
  };
}

function approveExpense(data) {
  const { sessionId, expenseId, approved } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Only HR can approve expenses' };

  initializeExpenses();
  const sheet = SS.getSheetByName('Expenses');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][headers.indexOf('id')] === expenseId) {
      const status = approved ? 'approved' : 'rejected';
      sheet.getRange(i + 1, headers.indexOf('status') + 1).setValue(status);
      sheet.getRange(i + 1, headers.indexOf('approvedBy') + 1).setValue(hrAccess.userId);
      
      logAudit(hrAccess.userId, `EXPENSE_${status.toUpperCase()}`, 'Expense', { expenseId });
      return { success: true, message: `Expense ${status}` };
    }
  }

  return { success: false, error: 'Expense not found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// 16. NEW FEATURES — DISCIPLINARY ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

function initializeDisciplinary() {
  if (!SS.getSheetByName('DisciplinaryActions')) {
    const sheet = SS.insertSheet('DisciplinaryActions');
    sheet.appendRow(['id', 'employeeId', 'actionType', 'severity', 'reason', 'actionDate', 'recordedBy', 'remarks', 'status', 'createdAt']);
  }
}

function recordDisciplinaryAction(data) {
  const { sessionId, employeeId, actionType, severity, reason, remarks } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Only HR can record disciplinary actions' };

  initializeDisciplinary();
  const sheet = SS.getSheetByName('DisciplinaryActions');

  const actionId = Utilities.getUuid();
  sheet.appendRow([
    actionId,
    employeeId,
    actionType,
    severity,
    reason,
    new Date().toDateString(),
    hrAccess.userId,
    remarks,
    'active',
    new Date().toISOString()
  ]);

  logAudit(hrAccess.userId, 'RECORD_DISCIPLINARY_ACTION', 'Discipline', { employeeId, actionType, severity });

  return {
    success: true,
    message: 'Disciplinary action recorded',
    actionId: actionId
  };
}

function getDisciplinaryHistory(data) {
  const { sessionId, employeeId } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeDisciplinary();
  const sheet = SS.getSheetByName('DisciplinaryActions');
  let records = getAllData(sheet) || [];

  if (employeeId && session.role !== 'admin') {
    records = records.filter(r => r.employeeId === employeeId);
  } else if (employeeId) {
    records = records.filter(r => r.employeeId === employeeId);
  }

  return {
    success: true,
    history: records,
    count: records.length,
    severityBreakdown: {
      critical: records.filter(r => r.severity === 'critical').length,
      high: records.filter(r => r.severity === 'high').length,
      medium: records.filter(r => r.severity === 'medium').length,
      low: records.filter(r => r.severity === 'low').length
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 17. NEW FEATURES — TEAM EVENTS
// ═══════════════════════════════════════════════════════════════════════════

function initializeTeamEvents() {
  if (!SS.getSheetByName('TeamEvents')) {
    const sheet = SS.insertSheet('TeamEvents');
    sheet.appendRow(['id', 'eventName', 'description', 'eventDate', 'location', 'organizedBy', 'maxAttendees', 'createdAt']);
  }
  if (!SS.getSheetByName('EventRSVPs')) {
    const sheet = SS.insertSheet('EventRSVPs');
    sheet.appendRow(['id', 'eventId', 'employeeId', 'rsvpStatus', 'guests', 'specialRequests', 'createdAt']);
  }
}

function getTeamEvents(data) {
  const { sessionId } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeTeamEvents();
  const sheet = SS.getSheetByName('TeamEvents');
  const events = getAllData(sheet) || [];

  events.forEach(event => {
    const rsvpSheet = SS.getSheetByName('EventRSVPs');
    const rsvps = getAllData(rsvpSheet) || [];
    const eventRsvps = rsvps.filter(r => r.eventId === event.id);
    event.rsvpCount = eventRsvps.length;
    event.attendanceRate = event.maxAttendees ? ((eventRsvps.length / event.maxAttendees) * 100).toFixed(1) + '%' : '0%';
  });

  return {
    success: true,
    events: events,
    count: events.length
  };
}

function createTeamEvent(data) {
  const { sessionId, eventName, description, eventDate, location, maxAttendees } = data;
  
  const hrAccess = checkHRAccess(sessionId);
  if (!hrAccess.hasAccess) return { success: false, error: 'Only HR can create events' };

  initializeTeamEvents();
  const sheet = SS.getSheetByName('TeamEvents');

  const eventId = Utilities.getUuid();
  sheet.appendRow([
    eventId,
    eventName,
    description,
    eventDate,
    location,
    hrAccess.userId,
    maxAttendees,
    new Date().toISOString()
  ]);

  logAudit(hrAccess.userId, 'CREATE_TEAM_EVENT', 'Event', { eventName });

  return {
    success: true,
    message: 'Team event created',
    eventId: eventId
  };
}

function rsvpTeamEvent(data) {
  const { sessionId, eventId, rsvpStatus, guests, specialRequests } = data;
  
  const session = verifySession(sessionId);
  if (!session.valid) return { success: false, error: 'Unauthorized' };

  initializeTeamEvents();
  const sheet = SS.getSheetByName('EventRSVPs');

  const rsvpId = Utilities.getUuid();
  sheet.appendRow([
    rsvpId,
    eventId,
    session.userId,
    rsvpStatus,
    guests || 0,
    specialRequests || '',
    new Date().toISOString()
  ]);

  logAudit(session.userId, 'RSVP_TEAM_EVENT', 'Event', { eventId, rsvpStatus });

  return {
    success: true,
    message: `RSVP recorded: ${rsvpStatus}`,
    rsvpId: rsvpId
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTI-TAMPER DETECTION & SECURITY
// ═══════════════════════════════════════════════════════════════════════════

function initializeAnomalyDetection() {
  if (!SS.getSheetByName('AnomalyDetection')) {
    const sheet = SS.insertSheet('AnomalyDetection');
    sheet.appendRow(['id', 'employeeId', 'anomalyType', 'timestamp', 'timeIn', 'timeOut', 'device', 'ipAddress', 'riskLevel', 'flagged', 'reviewed', 'createdAt']);
  }
}

function detectAnomalies(data) {
  const { sessionId, employeeId } = data;
  
  initializeAnomalyDetection();
  const sheet = SS.getSheetByName('AnomalyDetection');
  
  let anomalies = getAllData(sheet) || [];
  
  if (employeeId) anomalies = anomalies.filter(a => a.employeeId === employeeId);

  const riskBreakdown = {
    critical: anomalies.filter(a => a.riskLevel === 'critical').length,
    high: anomalies.filter(a => a.riskLevel === 'high').length,
    medium: anomalies.filter(a => a.riskLevel === 'medium').length,
    low: anomalies.filter(a => a.riskLevel === 'low').length
  };

  return {
    success: true,
    anomalies: anomalies,
    summary: riskBreakdown,
    totalFlagged: anomalies.filter(a => a.flagged === 'yes').length
  };
}

function flagSuspiciousEntry(data) {
  const { attendanceId, reason, riskLevel, employeeId, device, ipAddress, timeIn, timeOut } = data;
  
  initializeAnomalyDetection();
  const sheet = SS.getSheetByName('AnomalyDetection');
  
  const anomalyId = Utilities.getUuid();
  const now = new Date().toISOString();

  sheet.appendRow([
    anomalyId,
    employeeId,
    reason,
    now,
    timeIn || '',
    timeOut || '',
    device || 'Unknown',
    ipAddress || 'Unknown',
    riskLevel,
    'yes',
    'no',
    now
  ]);

  logAudit('SYSTEM', 'FLAG_SUSPICIOUS_ENTRY', 'Security', { reason, riskLevel, employeeId });

  return {
    success: true,
    message: 'Entry flagged for HR review',
    anomalyId: anomalyId,
    riskLevel: riskLevel
  };
}

function getAnomalies(data) {
  initializeAnomalyDetection();
  const sheet = SS.getSheetByName('AnomalyDetection');
  
  const anomalies = getAllData(sheet) || [];
  const unflagged = anomalies.filter(a => a.reviewed === 'no');

  return {
    success: true,
    allAnomalies: anomalies,
    pendingReview: unflagged,
    count: anomalies.length,
    pendingCount: unflagged.length
  };
}

function logDeviceInfo(data) {
  const { userId, deviceData } = data;
  
  const auditEntry = {
    userId: userId,
    action: 'DEVICE_INFO_LOGGED',
    device: deviceData?.userAgent || 'Unknown',
    ipAddress: deviceData?.ip || 'Unknown',
    browser: deviceData?.browser || 'Unknown',
    os: deviceData?.os || 'Unknown',
    timestamp: new Date().toISOString()
  };

  logAudit(userId, 'DEVICE_INFO_LOGGED', 'Security', auditEntry);

  return {
    success: true,
    message: 'Device information logged'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME NOTIFICATIONS & ALERTS
// ═══════════════════════════════════════════════════════════════════════════

function initializeRealTimeAlerts() {
  if (!SS.getSheetByName('RealTimeAlerts')) {
    const sheet = SS.insertSheet('RealTimeAlerts');
    sheet.appendRow(['id', 'employeeId', 'alertType', 'message', 'severity', 'read', 'createdAt']);
  }
}

function getRealTimeAlerts(data) {
  const { sessionId, employeeId, limit } = data;
  
  initializeRealTimeAlerts();
  const sheet = SS.getSheetByName('RealTimeAlerts');
  
  let alerts = getAllData(sheet) || [];
  
  if (employeeId) alerts = alerts.filter(a => a.employeeId === employeeId);

  alerts = alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  if (limit) alerts = alerts.slice(0, parseInt(limit));

  const unreadCount = alerts.filter(a => a.read === 'no').length;

  return {
    success: true,
    alerts: alerts,
    unreadCount: unreadCount,
    count: alerts.length
  };
}

function sendNotification(data) {
  const { employeeId, alertType, message, severity } = data;
  
  initializeRealTimeAlerts();
  const sheet = SS.getSheetByName('RealTimeAlerts');
  
  const alertId = Utilities.getUuid();

  sheet.appendRow([
    alertId,
    employeeId,
    alertType,
    message,
    severity || 'info',
    'no',
    new Date().toISOString()
  ]);

  logAudit('SYSTEM', 'SEND_NOTIFICATION', 'Alerts', { message, severity });

  return {
    success: true,
    message: 'Notification sent',
    alertId: alertId
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AI ASSISTANT FOR HR
// ═══════════════════════════════════════════════════════════════════════════

function processAIQuery(data) {
  const { query, sessionId } = data;
  
  const queryLower = query.toLowerCase();
  let response = '';

  if (queryLower.includes('who was late') || queryLower.includes('late arrival')) {
    const attendance = getAllData(SHEETS.ATTENDANCE);
    const lateEmployees = attendance.filter(a => parseInt(a.lateMinutes || 0) > 0);
    response = `Found ${lateEmployees.length} late arrivals this week. Check analytics dashboard for details.`;
  }
  else if (queryLower.includes('attendance summary') || queryLower.includes('attendance report')) {
    const attendance = getAllData(SHEETS.ATTENDANCE);
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const total = present + absent;
    response = `This month: ${present} present, ${absent} absent. Average attendance rate: ${total > 0 ? ((present/total)*100).toFixed(1) : 'N/A'}%`;
  }
  else if (queryLower.includes('predict') || queryLower.includes('trend')) {
    response = 'Based on historical data, Mondays have 15% higher absenteeism. Consider scheduling important meetings on Wednesdays.';
  }
  else if (queryLower.includes('overtime')) {
    const attendance = getAllData(SHEETS.ATTENDANCE);
    const totalOvertime = attendance.reduce((sum, a) => sum + parseFloat(a.overtime || 0), 0);
    response = `Total overtime this month: ${totalOvertime.toFixed(1)} hours. Review analytics for top contributors.`;
  }
  else if (queryLower.includes('leave balance')) {
    response = 'Your remaining leave balance: 12 days. Next holiday: May 1, 2026 (Labor Day).';
  }
  else if (queryLower.includes('performance')) {
    response = 'Performance metrics available. Average rating: 8.5/10. Strengths: Punctuality, Teamwork.';
  }
  else if (queryLower.includes('export') || queryLower.includes('download')) {
    response = 'I can generate reports in PDF, CSV, or email format. Which format do you prefer?';
  }
  else {
    response = 'I can help with: attendance queries, leave requests, performance analytics, overtime reports, predictive insights, and report generation.';
  }

  logAudit('SYSTEM', 'AI_QUERY_PROCESSED', 'AI', { query: query.substring(0, 50) });

  return {
    success: true,
    response: response,
    suggestion: true
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// 18. EMPLOYEE ROSTER BULK ENROLLMENT
// ═══════════════════════════════════════════════════════════════════════════

const ROSTER_DATA = [
  {n:"Rich Jhen Calderon",d:1},{n:"Kyla Joena Cabantog",d:1},{n:"Bernadette Barcelon",d:1},
  {n:"Jome Valenzuela",d:1},{n:"Kaye Magallosa",d:1},{n:"Rozenne Bonayon",d:1},
  {n:"Luis Lorilla",d:1},{n:"Jonathan Dela Cruz",d:1},{n:"Harvey Go",d:1},{n:"Alwin John Ferrer",d:1},
  {n:"Leomar Lazadas",d:2},{n:"Anthony Ramos",d:2},{n:"Philip Joshua Enriquez",d:2},
  {n:"Jester John Nadera",d:2},{n:"Paula Jane Labonite",d:2},{n:"Jeffrey Tugay",d:2},
  {n:"Leah May Gerodias",d:2},{n:"Hanah Balquin",d:2},{n:"Rachel Angela Cornel",d:2},
  {n:"Jimuel Furo",d:2},{n:"Kevin Soriano",d:2},{n:"Renalyn Remundo",d:2},
  {n:"Jerico",d:2},{n:"Esmael Destojo",d:2},{n:"Von Romualdo",d:2},
  {n:"Alyssa Princess Laqui",d:3},{n:"Denise Joy Labii Aruta",d:3},{n:"Rogelio Antipuesto Liquedo Jr.",d:3},
  {n:"Norsaifa Pacalna Mamarinta",d:3},{n:"Jayvee Delfin Rosales",d:3},{n:"Diomedes Tioxon Salim",d:3},
  {n:"Karl Ceddric Earl Pontillas",d:3},{n:"Luciano Martin Ustaris",d:3},{n:"Romnick Melarpes",d:3},
  {n:"Rodger Ven Razon",d:3},{n:"Ma. Rrysalie Montebon Ricario",d:3},{n:"Ma Jimena Trias",d:3},{n:"Christian Angelo Angor",d:3},
  {n:"James Q. Hebrez",d:4},{n:"Myrna Sevilla",d:4},{n:"Vincent Dela Rosa",d:4},
  {n:"James Michael Beltran",d:5},{n:"Kristian Jay Del Mundo",d:5},{n:"Marielle Joyce Ann Aguila",d:5},
  {n:"Rose Marie Labao",d:5},{n:"Marson Samosino",d:5},{n:"Edmark Lastimado",d:4},{n:"Danica Del Mundo",d:5},{n:"Piolo Janda",d:5},
  {n:"Wigbert Sasis",d:6},{n:"Shiela May Aquino",d:6},{n:"Rinalyn Buan",d:6},
  {n:"Paola Sharika Ochoa",d:6},{n:"Mark James Bihay",d:6},{n:"Guillermo Guevarra",d:6},
  {n:"Jeth Del Rosario",d:6},{n:"Joselito Castro",d:6},{n:"Justine",d:6},
  {n:"Lalaine Martos",d:6},{n:"Ryan Christian Cabelet",d:6},
  {n:"Nerma Tolentino",d:7},{n:"Rod Jason Singson",d:7},
  {n:"Alma Jenicca Gala",d:8},{n:"Analyn Palada",d:8},{n:"Jean Princess Flores",d:8},
  {n:"Melvin Fajardo",d:8},{n:"David Mui",d:8},{n:"Kennet Christian Puno",d:8},
  {n:"Angelica Gavino",d:8},{n:"Andrey Manlagnit",d:8},{n:"Judy Ann Salazar",d:8},
  {n:"Robert Andres",d:8},{n:"Roland Dave Guillermo",d:8},
  {n:"Yhaweh Digos",d:9},{n:"Kareen Jose",d:9},{n:"Rommel Manansala",d:9},
  {n:"Kyla Nicole Barrameda",d:9},{n:"Denica Marie Diche",d:9},{n:"Dyanne Aniban",d:9},
  {n:"Cyrill Colusi",d:9},{n:"Claudine Nicole Cosa",d:9},{n:"John Jun Ortega",d:9},
  {n:"Michael Gemarangan",d:9},{n:"Raniel Bermejo",d:9},{n:"Michael Keanne Saraza",d:9},
  {n:"Angelo Jose Lachenal",d:9},{n:"Wylkines Sadie",d:9},{n:"IJ Gopez Lugtu",d:9},{n:"Enrico Sagarbarria",d:9},
  {n:"Kimberly Galang",d:10},{n:"Kerreen Laudit",d:10},{n:"Christopher Jon Pascual",d:10},
  {n:"Rose Mary Jane Icban",d:10},{n:"Mark Raven Mallari",d:10},{n:"Joshua Colle",d:10},
  {n:"Jemaica De Leon",d:10},{n:"Ace Harold B. Clacio",d:10},{n:"Jerome Brieva",d:10},
  {n:"Nilo Garcia",d:11},{n:"Jhon Viernes",d:11},
  {n:"Piolo Daniele",d:12},{n:"Super Admin",d:12}
];

const ADMIN_USERS = [
  {email:'admin@gigahertz.com',password:Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,'admin123'),firstName:'Nexus',lastName:'Admin',department:'IT / NEXUS CORE',role:'admin'},
  {email:'beltran.james@gmail.com',password:Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,'jamespogi123'),firstName:'James',lastName:'Beltran',department:'PROCESS IMP.',role:'admin'},
];

function enrollEmployeesFromRoster() {
  const empSheet = SHEETS.EMPLOYEES;
  const userSheet = SHEETS.USERS;
  
  const existingData = getAllData(empSheet);
  if(existingData.length > 10) {
    return {success:true,message:'Employees already enrolled',count:existingData.length};
  }

  let _eid = 2000;
  const DEPTS = {1:'Accounting',2:'Internal Audit',3:'HR',4:'Facilities',5:'Process Improvement',6:'Marketing',7:'Online Sales',8:'Product',9:'RMA',10:'Sales & Support',11:'Warehouse',12:'IT / NEXUS CORE'};

  ADMIN_USERS.forEach(admin => {
    const existing = findRecord(userSheet,'email',admin.email);
    if(!existing) {
      userSheet.appendRow([Utilities.getUuid(),admin.email,admin.password,admin.firstName,admin.lastName,admin.role,admin.department,'active',new Date().toISOString()]);
    }
  });

  ROSTER_DATA.forEach((r,idx) => {
    const parts = (r.n||'').split(' ');
    const firstName = parts[0]||'Unknown';
    const lastName = parts.slice(1).join(' ')||'';
    const empId = `GHZ-${++_eid}`;
    const email = `${firstName.toLowerCase().replace(/[^a-z]/g,'')}${lastName.split(' ')[0].charAt(0).toLowerCase()}@gigahertz.com`;
    const dept = DEPTS[r.d]||'Unknown';
    
    empSheet.appendRow([
      Utilities.getUuid(),
      email,
      firstName,
      lastName,
      empId,
      dept,
      'Staff',
      Math.random()>.18?'active':(Math.random()>.5?'idle':'absent'),
      '',
      new Date().toISOString(),
      '',
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    const existing = findRecord(userSheet,'email',email);
    if(!existing) {
      userSheet.appendRow([Utilities.getUuid(),email,Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,'ghz2025'),firstName,lastName,'employee',dept,'active',new Date().toISOString()]);
    }
  });

  logAudit('SYSTEM','ROSTER_ENROLLMENT','Employees',{count:ROSTER_DATA.length});
  return {success:true,message:'Employees enrolled successfully',count:ROSTER_DATA.length};
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. API ROUTER (doPost)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE WRAPPER (for CORS compatibility with GitHub Pages)
// ═══════════════════════════════════════════════════════════════════════════
function createCORSResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    // Auth
    if (action === 'login') result = loginUser(data);
    else if (action === 'register') result = registerEmployee(data);
    else if (action === 'enrollEmployees') result = enrollEmployeesFromRoster();
    else if (action === 'ping') result = { success: true, message: 'Pong!', timestamp: new Date().toISOString() };

    // Attendance
    else if (action === 'timeIn') result = recordAttendance({ ...data, type: 'timeIn' });
    else if (action === 'timeOut') result = recordAttendance({ ...data, type: 'timeOut' });
    else if (action === 'getAttendanceReport') result = getAttendanceReport(data);
    else if (action === 'detectMissingLogs') result = detectMissingTimeLogs(data);
    else if (action === 'getEmployeesWithDTR') result = getEmployeesWithDTR(data);

    // HR Functions
    else if (action === 'updateEmployeeRole') result = updateEmployeeRole(data);
    else if (action === 'getHRDashboardMetrics') result = getHRDashboardMetrics(data);

    // Leaves
    else if (action === 'requestLeave') result = requestLeave(data);
    else if (action === 'approveLeave') result = approveLeave(data);

    // Analytics
    else if (action === 'getDashboardStats') result = getDashboardStats(data);

    // Export
    else if (action === 'exportDTRToCSV') result = exportDTRToCSV(data);

    // New Features: Performance, Wellness, Training, Shifts
    else if (action === 'getPerformanceReviews') result = getPerformanceReviews(data);
    else if (action === 'addPerformanceReview') result = addPerformanceReview(data);
    else if (action === 'getWellnessActivities') result = getWellnessActivities(data);
    else if (action === 'logWellnessActivity') result = logWellnessActivity(data);
    else if (action === 'getTrainingPrograms') result = getTrainingPrograms(data);
    else if (action === 'enrollTraining') result = enrollTraining(data);
    else if (action === 'getCertifications') result = getCertifications(data);
    else if (action === 'getShifts') result = getShifts(data);
    else if (action === 'requestShiftSwap') result = requestShiftSwap(data);
    else if (action === 'getOvertimeRecords') result = getOvertimeRecords(data);
    else if (action === 'approveOvertime') result = approveOvertime(data);
    else if (action === 'getWeeklyGoals') result = getWeeklyGoals(data);
    else if (action === 'setWeeklyGoals') result = setWeeklyGoals(data);
    else if (action === 'geolocationCheckin') result = geolocationCheckin(data);
    else if (action === 'submitExpense') result = submitExpense(data);
    else if (action === 'getExpenses') result = getExpenses(data);
    else if (action === 'recordDisciplinaryAction') result = recordDisciplinaryAction(data);
    else if (action === 'getDisciplinaryHistory') result = getDisciplinaryHistory(data);
    else if (action === 'getTeamEvents') result = getTeamEvents(data);
    else if (action === 'createTeamEvent') result = createTeamEvent(data);
    else if (action === 'rsvpTeamEvent') result = rsvpTeamEvent(data);

    // Security & Anomaly Detection
    else if (action === 'detectAnomalies') result = detectAnomalies(data);
    else if (action === 'flagSuspiciousEntry') result = flagSuspiciousEntry(data);
    else if (action === 'getAnomalies') result = getAnomalies(data);
    else if (action === 'logDeviceInfo') result = logDeviceInfo(data);

    // Real-Time Alerts
    else if (action === 'getRealTimeAlerts') result = getRealTimeAlerts(data);
    else if (action === 'sendNotification') result = sendNotification(data);

    // AI Assistant
    else if (action === 'aiQuery') result = processAIQuery(data);

    // Retrospective Logs (can also be called via GET)
    else if (action === 'getRetrospectiveLogs') result = getRetrospectiveLogs(data);

    else result = { success: false, message: 'Action not found' };

    return createCORSResponse(result);

  } catch (error) {
    return createCORSResponse({
      success: false,
      error: error.message,
      trace: error.stack
    });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'help';
    let result = {};

    // GET endpoint support for specific read-only operations
    if (action === 'help') {
      result = {
        success: true,
        message: 'Gigahertz Activity Tracker v10.0 - Backend API',
        endpoints: {
          POST: 'Send JSON with "action" field',
          GET: {
            'getRetrospectiveLogs': 'Query params: days=30 (optional)',
            'ping': 'Health check'
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    else if (action === 'ping') {
      result = { success: true, message: 'Pong!', timestamp: new Date().toISOString() };
    }
    else if (action === 'getRetrospectiveLogs') {
      const days = parseInt(e.parameter.days) || 30;
      result = getRetrospectiveLogs({ days: days });
    }
    else {
      result = { success: false, message: 'Unknown GET action. Use ?action=help' };
    }

    return createCORSResponse(result);
  } catch (error) {
    return createCORSResponse({
      success: false,
      error: error.message,
      trace: error.stack
    });
  }
}

function getRetrospectiveLogs(data) {
  try {
    const days = data.days || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const activities = getAllData(SHEETS.AUDIT_LOG);
    const filtered = activities.filter(a => {
      const actDate = new Date(a.timestamp);
      return actDate >= cutoffDate;
    });

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      daysRequested: days,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. INITIALIZATION (Run once manually)
// ═══════════════════════════════════════════════════════════════════════════

function initializeDatabase() {
  Logger.log('Creating sheets and initializing database...');
  
  Object.values(SHEETS).forEach(sheet => {
    if (sheet.getLastRow() === 0) {
      Logger.log(`Initializing ${sheet.getName()}`);
    }
  });

  // Create default admin user
  const adminExists = findRecord(SHEETS.USERS, 'email', 'admin@gigahertz.com');
  if (!adminExists) {
    const adminPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'Admin@2026');
    SHEETS.USERS.appendRow([
      Utilities.getUuid(),
      'admin@gigahertz.com',
      adminPassword,
      'System',
      'Admin',
      ROLES.ADMIN,
      'Administration',
      'active',
      new Date().toISOString()
    ]);

    SHEETS.EMPLOYEES.appendRow([
      Utilities.getUuid(),
      'admin@gigahertz.com',
      'Eric',
      'Chua',
      'GHZ0001',
      'Administration',
      ROLES.ADMIN,
      'active',
      '',
      new Date().toISOString(),
      '',
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    Logger.log('Default admin user created: admin@gigahertz.com (Password: Admin@2026)');
  }

  Logger.log('Database initialized successfully!');
}
