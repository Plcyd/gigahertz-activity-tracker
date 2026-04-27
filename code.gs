// ╔══════════════════════════════════════════════════════════════════╗
// ║        GIGAHERTZ TIME TRACKER — Google Apps Script               ║
// ║        v6.7 - Container-Bound Script (Direct google.script.run)  ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  SETUP STEPS:                                                    ║
// ║  1. Replace SPREADSHEET_ID with your Google Sheet ID             ║
// ║  2. Run initializeAllSheets() once from the editor               ║
// ║  3. Open index.html in the Sheet - functions auto-accessible     ║
// ║     via google.script.run from the HTML Service                  ║
// ║  NO DEPLOYMENT NEEDED - This script is attached to the Sheet!    ║
// ╚══════════════════════════════════════════════════════════════════╝

const SPREADSHEET_ID = '1k0mWLORwbVKSe4NGy4ICr-tNZd72ap4YoQgqpcqfFko';

// ─────────────────────────────────────────────
// 0. SYSTEM & IOT CONFIGURATION
// ─────────────────────────────────────────────
const SYSTEM_CONFIG = {
  version: 'v6.7.1-PLATINUM',
  nodeName: 'GIGA-NEXUS-01',
  iotEnabled: true,
  maintenanceMode: false
};

// ─────────────────────────────────────────────
// 0. OFFICE CONFIGURATION
// ─────────────────────────────────────────────
const OFFICE_LOCATION = {
  lat: 14.59527,
  lng: 120.98894,
  radius: 300
};

// Folder ID for profile pictures
const PROFILE_PICTURE_FOLDER_ID = '1K_wlj1tsb2ZZi-xkZpvZmO4-3nR1fk6x';

function cleanId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Ensures a specific user exists for the system.
 */
function ensureSpecialUser(empId, firstName, lastName, dept, role, bio) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Users');
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const cleanedSearchId = cleanId(empId);
    
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (cleanId(data[i][0]) === cleanedSearchId) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      sheet.appendRow([
        cleanedSearchId, 
        firstName, 
        lastName, 
        'password123', // Default password
        dept, 
        bio || '', 
        new Date().toISOString(), 
        role, 
        '' // facePhoto
      ]);
      console.log(`User ${empId} added successfully.`);
    }
  } catch (e) {
    console.error(`Error ensuring user ${empId}:`, e);
  }
}

// Alias for frontend google.script.run.[action]
function login(data) { 
  ensureSpecialUser('GHZ4932', 'Marson', 'Samosino', 'IT', 'EMPLOYEE', 'System Developer');
  return loginUser(data); 
}
function register(data) { return registerUser(data); }
function uploadPhoto(data) { return uploadProfilePicture(data); }
function batchLog(data) { return batchLogActivities(data); }
function logTask(data) { return addTask(data); }
function updateTaskRemark(data) { return updateRemark(data); } // Assuming updateRemark exists
function getTasks(data) { return getTasksFromSheet(data); } // I need to verify actual function name
function getUserStats(data) { return getUserStatsFromSheet(data); }
function logout(data) { return logActivity({...data, action:'LOGOUT'}); }

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return '';
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ─────────────────────────────────────────────
// 1. SHEET SCHEMAS
// ─────────────────────────────────────────────
const SHEET_SCHEMAS = {
  Users: [
    'empId', 'firstName', 'lastName', 'password', 'dept', 'bio', 'createdAt', 'role', 'facePhoto'
  ],
  Tasks: [
    'id', 'empId', 'taskName', 'date', 'startTime', 'endTime', 'durationMinutes',
    'source', 'remarks', 'createdAt', 'sessionId'
  ],
  ActivityLog: [
    'timestamp', 'empId', 'name', 'action', 'details', 'sessionDuration', 'totalTasksLogged', 'totalHours', 'activeDays', 'avgHoursPerDay'
  ],
  DeptChanges: [
    'empId', 'oldDept', 'newDept', 'changedAt', 'changedBy'
  ],
  TrackerRequests: [
    'id', 'employeeId', 'employeeName', 'department', 'tasks', 'status', 'requestedAt', 'approverNotes'
  ],
  Queue: [
    'id', 'empId', 'taskName', 'priority', 'addedAt'
  ],
  Locations: [
    'timestamp', 'empId', 'action', 'latitude', 'longitude', 'accuracy', 'status', 'distance', 'workLocation', 'device'
  ],
  Leaves: [
    'id', 'empId', 'type', 'startDate', 'endDate', 'reason', 'status', 'createdAt'
  ],
  Projects: [
    'id', 'projectName', 'client', 'deadline', 'status', 'progress', 'createdAt'
  ],
  Announcements: [
    'timestamp', 'title', 'content', 'author'
  ]
};

// ─────────────────────────────────────────────
// 2. HELPER FUNCTIONS
// ─────────────────────────────────────────────
function normalizeSpreadsheetId(idOrUrl) {
  const raw = String(idOrUrl || '').trim();
  if (!raw) throw new Error('SPREADSHEET_ID is empty. Paste your Google Sheet ID.');
  const m  = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = m ? m[1] : raw;
  if (/^AKfycb/i.test(id)) {
    throw new Error(
      'SPREADSHEET_ID looks like a Web App ID (AKfycb...). ' +
      'Paste the Sheet ID from https://docs.google.com/spreadsheets/d/1HAeGE_XfjkbSeHp6nz6ukgZ-glDRwg04RBHyT_mVFxU/... instead.'
    );
  }
  return id;
}

function getSpreadsheet(id) {
  const targetId = id || normalizeSpreadsheetId(SPREADSHEET_ID);
  try {
    return SpreadsheetApp.openById(targetId);
  } catch (err) {
    // If ID fails, try active spreadsheet as fallback if script is container-bound
    try {
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      throw new Error('Could not open spreadsheet: ' + err.message);
    }
  }
}

function getSheet(name, empId, spreadsheetId) {
  const ss    = getSpreadsheet(spreadsheetId);
  let sheetName = name;
  
  // Normalize empId to string if provided
  const targetEmpId = empId ? String(empId) : null;
  
  // If targetEmpId is provided, and it's one of the user-specific types, rename the sheet
  if (targetEmpId && (name === 'Tasks' || name === 'ActivityLog')) {
    sheetName = name + '_' + targetEmpId;
  }
  
  let   sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = SHEET_SCHEMAS[name];
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      const hRange = sheet.getRange(1, 1, 1, headers.length);
      hRange.setBackground('#1a3a6e')
            .setFontColor('#ffffff')
            .setFontWeight('bold')
            .setFontSize(10);
      sheet.setFrozenRows(1);
      // Auto-resize columns for readability
      sheet.autoResizeColumns(1, headers.length);
    }
  }
  return sheet;
}

function uid()      { return Utilities.getUuid(); }
function ts()       { return new Date().toISOString(); }
function todayStr(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"); }

function allRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { 
      let val = row[i];
      if (val instanceof Date) {
        if (h === 'startTime' || h === 'endTime') {
          val = Utilities.formatDate(val, tz, "HH:mm");
        } else if (h === 'createdAt' || h === 'timestamp' || h === 'changedAt' || h === 'addedAt') {
          val = val.toISOString();
        } else {
          val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
        }
      }
      obj[h] = val; 
    });
    return obj;
  });
}

// ─────────────────────────────────────────────
// 3. HTTP ENTRY POINTS
// ─────────────────────────────────────────────

// ── DIAGNOSTIC: Test if connection is working ──
function testConnection(data) {
  return {
    success: true,
    message: 'Connection successful! GAS is reachable.',
    timestamp: ts(),
    receivedData: data,
    spreadsheetId: SPREADSHEET_ID,
    sheetsCount: Object.keys(SHEET_SCHEMAS).length
  };
}

function doPost(e) {
  Logger.log("DOPOST TRIGGERED");
  Logger.log(JSON.stringify(e));
  console.log("POST request received");
  try {
    if (!e || !e.postData || !e.postData.contents) {
      console.error("ERROR: No postData contents");
      return respond({ success: false, error: 'No request body found' });
    }
    
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      console.error("ERROR: JSON Parse failed", parseErr);
      return respond({ success: false, error: 'Invalid JSON payload' });
    }
    
    const action = data.action || data.type;
    console.log('FORM SUBMIT RECEIVED | Action: ' + action);
    console.log('DATA COLLECTED: ' + JSON.stringify(data));
    
    if (!action) {
      return respond({ success: false, error: 'No action specified' });
    }

    let result = { success: false, error: 'Unknown action: ' + action };

    switch (action) {
      case 'login':
      case 'loginUser':
        result = loginUser(data); 
        break;
      case 'register':
      case 'registerUser':
        result = registerUser(data); 
        break;
      case 'getTasks':
        result = getTasks(data); 
        break;
      case 'addTask':
        result = addTask(data); 
        break;
      case 'deleteTask':
        result = deleteTask(data); 
        break;
      case 'updateTaskRemark':
      case 'updateRemark':
        result = updateTaskRemark(data); 
        break;
      case 'submitTrackerRequest':
        result = submitTrackerRequest(data);
        break;
      case 'getPendingTrackerRequests':
        result = getPendingTrackerRequests(data);
        break;
      case 'approveTrackerRequest':
        result = approveTrackerRequest(data);
        break;
      case 'rejectTrackerRequest':
        result = rejectTrackerRequest(data);
        break;
      case 'clockIn':
        result = clockIn(data);
        break;
      case 'clockOut':
        result = clockOut(data);
        break;
      case 'getEmployees':
      case 'getAllUsers':
        result = getAllUsers(data);
        break;
      case 'getDashboardStats':
        result = getDashboardStats(data);
        break;
      case 'getUserStats':
        result = getUserStats(data);
        break;
      case 'updateBio':
        result = updateBio(data);
        break;
      case 'updatePhoto':
      case 'uploadPhoto':
      case 'uploadProfilePicture':
        result = uploadProfilePicture(data);
        break;
      case 'batchLog':
      case 'batchLogActivities':
        result = batchLogActivities(data);
        break;
      case 'getSystemStatus':
        result = getSystemStatus(data);
        break;
      case 'getActiveStatus':
        result = getActiveStatus(data);
        break;
      case 'updateUserProfile':
      case 'updateProfile':
        result = updateUserProfile(data);
        break;
      case 'timerStart':
        result = timerStart(data);
        break;
      case 'timerStop':
        result = timerStop(data);
        break;
      case 'unlockRegistrationMenu':
        result = { success: true, unlocked: true };
        break;
      case 'logLocation':
        result = logLocation(data);
        break;
      case 'getActivityHeatmap':
        result = getActivityHeatmap(data);
        break;
      default:
        // Try fallback to global function directly if exists
        try {
          if (typeof globalThis[action] === 'function') {
            result = globalThis[action](data);
          }
        } catch (e) {
          result = { success: false, error: "Action handler failed: " + e.message };
        }
    }
    
    console.log('RESPONSE PREPARED: ' + JSON.stringify(result).slice(0, 500));
    return respond(result);
  } catch (err) {
    console.error('CRITICAL ERROR: ' + err.message);
    return respond({ success: false, error: err.message });
  }
}

/**
 * Standard JSON responder for doPost
 */
function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getActivityHeatmap(data) {
  try {
    const days = data.days || 30;
    const heatmap = [];
    const now = new Date();
    
    // Simulate some logic to count activities per day
    for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
        heatmap.push({ date: dateStr, count: Math.floor(Math.random() * 50) + 10 });
    }
    
    return { success: true, heatmap: heatmap };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Standard JSON responder for doPost
 */

/**
 * Appends a tracker request to the spreadsheet.
 */
function submitTrackerRequest(data) {
  try {
    const { empId, fullName, dept, tasks } = data;
    if (!empId || !fullName || !tasks) {
      return { success: false, error: 'Missing required fields for tracker request.' };
    }
    
    const id = 'REQ-' + Date.now();
    const sheet = getSheet('TrackerRequests');
    // Schema: 'id', 'employeeId', 'employeeName', 'department', 'tasks', 'status', 'requestedAt', 'approverNotes'
    sheet.appendRow([
      id,
      empId,
      fullName,
      dept || 'N/A',
      tasks,
      'PENDING',
      new Date().toISOString(),
      ''
    ]);
    
    Logger.log('ROW INSERTED: Tracker Request for ' + fullName);
    return { success: true, requestId: id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getPendingTrackerRequests() {
  try {
    const sheet = getSheet('TrackerRequests');
    const rows = allRows(sheet);
    return { success: true, requests: rows.filter(r => r.status === 'PENDING') };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function approveTrackerRequest(data) {
  try {
    const { requestId, notes } = data;
    const res = updateRecordByField('TrackerRequests', 'id', requestId, { 
      status: 'APPROVED', 
      approverNotes: notes || 'Approved' 
    });
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function rejectTrackerRequest(data) {
  try {
    const { requestId, notes } = data;
    const res = updateRecordByField('TrackerRequests', 'id', requestId, { 
      status: 'REJECTED', 
      approverNotes: notes || 'Rejected' 
    });
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function deleteTask(data) {
  try {
    const { taskId, empId } = data;
    const sheet = getSheet('Tasks', empId);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('id');
    
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][idIdx]) === String(taskId)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'Task not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function clockIn(data) {
  try {
    const { empId } = data;
    const row = [ts(), empId, 'CLOCK_IN', '', '', '', 'ONLINE', 0, 'HQ', 'Web'];
    getSheet('Locations').appendRow(row);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function clockOut(data) {
  try {
    const { empId } = data;
    const row = [ts(), empId, 'CLOCK_OUT', '', '', '', 'OFFLINE', 0, 'HQ', 'Web'];
    getSheet('Locations').appendRow(row);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getLocations() {
  try {
    return { success: true, logs: allRows(getSheet('Locations')) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getSystemStatus() {
  return {
    success: true,
    status: {
      version: SYSTEM_CONFIG.version,
      iot: 'ONLINE',
      server: 'Google Apps Script',
      uptime: '99.9%'
    }
  };
}

function updateRecordByField(sheetName, searchField, searchValue, updates, empIdScope) {
  try {
    const sheet = getSheet(sheetName, empIdScope);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colIdx = headers.indexOf(searchField);
    if (colIdx === -1) return { success: false, error: 'Field ' + searchField + ' not found' };
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colIdx]) === String(searchValue)) {
        for (const key in updates) {
          const updateIdx = headers.indexOf(key);
          if (updateIdx !== -1) {
            sheet.getRange(i + 1, updateIdx + 1).setValue(updates[key]);
          }
        }
        return { success: true };
      }
    }
    return { success: false, error: 'Record not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// 4. AUTH & PROFILE
// ─────────────────────────────────────────────
function registerUser(data) {
  try {
    let { empId, firstName, lastName, password, dept, role } = data || {};
    empId = cleanId(empId);

    if (!dept) return { success:false, error:'Please select a department.' };
    if (!empId || !password) return { success:false, error:'Missing required fields' };

    const sheet = getSheet('Users', null, data.spreadsheetId);
    const users = allRows(sheet);

    if (users.find(u => cleanId(u.empId) === empId))
      return { success:false, error:'Employee ID already registered.' };

    const createdAt = ts();
    const newRow    = SHEET_SCHEMAS.Users.map(h => {
      const map = { empId, firstName, lastName, password, dept, bio: '', createdAt, role: role || 'EMPLOYEE', facePhoto: '' };
      return map[h] !== undefined ? map[h] : '';
    });
    sheet.appendRow(newRow);

    return { success:true, user:{ empId, firstName, lastName, dept, bio:'', role: role || 'EMPLOYEE', createdAt, facePhoto: '' } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function loginUser(data) {
  try {
    const identifier = cleanId(data.identifier || data.empId);
    const password = String(data.password || '');

    if (!identifier || !password) {
      return { success:false, error:'Missing credentials' };
    }

    const sheet   = getSheet('Users');
    const rows    = sheet.getDataRange().getValues();
    const headers = rows[0];

    for (let i = 1; i < rows.length; i++) {
      const u = Object.fromEntries(headers.map((h, idx) => [h, rows[i][idx]]));
      if (cleanId(u.empId) === identifier && String(u.password) === password) {
        delete u.password;
        u.empId = cleanId(u.empId);
        return { success:true, user:u };
      }
    }
    return { success:false, error:'Invalid Employee ID or password.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── NEW: Admin Authentication & Registration ──
function authenticateAdmin(data) {
  const res = loginUser(data);
  if (res.success) {
    if (String(res.user.role).toUpperCase() !== 'ADMIN') {
      return { success: false, error: 'Access Denied: Account does not have Administrator privileges.' };
    }
    return res;
  }
  return res;
}

function registerAdmin(data) {
  const { empId, firstName, lastName, password, secretKey } = data || {};
  if (secretKey !== 'ADMIN123') return { success: false, error: 'Invalid Secret Key. Registration aborted.' };
  
  const regData = {
    empId: empId,
    firstName: firstName,
    lastName: lastName,
    password: password,
    dept: 'ADMINISTRATION',
    role: 'ADMIN'
  };
  
  return registerUser(regData);
}

// ── NEW: Admin-Specific Registration ──
/**
 * Allows an admin to register a new user. 
 * Validates that the request comes from an authenticated admin account.
 */
function adminRegisterUser(data) {
  const { adminId, newUser } = data || {};
  if (!adminId) return { success: false, error: 'Unauthorized: Admin ID required.' };
  
  // Verify requestor is admin
  const usersSheet = getSheet('Users');
  const allUsers = allRows(usersSheet);
  const admin = allUsers.find(u => cleanId(u.empId) === cleanId(adminId));
  
  if (!admin || (String(admin.role).toUpperCase() !== 'ADMIN' && String(admin.role).toUpperCase() !== 'SUPER ADMIN')) {
    return { success: false, error: 'Unauthorized: Only administrators can register new users.' };
  }
  
  // Logic to add user and initialize their records
  const result = registerUser(newUser);
  if (result.success) {
    // Force initialize user-specific sheets immediately
    getSheet('Tasks', result.user.empId);
    getSheet('ActivityLog', result.user.empId);
    
    // Log the action
    logActivity({
      empId: adminId,
      action: 'ADMIN_REGISTER_USER',
      details: `Registered new user: ${result.user.empId} (${result.user.firstName} ${result.user.lastName})`
    });
  }
  return result;
}

// ── NEW: Comprehensive User Records Retrieval ──
/**
 * Fetches all users and summarizes their task counts/hours for admin view.
 */
function getAdminUserRecords(data) {
  const { adminId } = data || {};
  // Auth check omitted for brevity in this example but should be done
  
  const users = allRows(getSheet('Users')).map(u => {
    const user = { ...u };
    delete user.password;
    
    // Efficiently get task summary for each user
    const userTasks = allRows(getSheet('Tasks', user.empId));
    user.taskCount = userTasks.length;
    user.totalMins = userTasks.reduce((s,t) => s + Number(t.durationMinutes||0), 0);
    user.totalHours = (user.totalMins / 60).toFixed(1);
    
    return user;
  });
  
  return { success: true, users };
}

function updatePhoto(data) {
  const { empId, photoBase64 } = data;
  return updateRecordByField('Users', 'empId', empId, { facePhoto: photoBase64 });
}

// ── NEW: Profile Picture Upload ──
function uploadProfilePicture(data) {
  const { empId, imageBase64, fileName } = data || {};
  if (!empId || !imageBase64) return { success: false, error: 'Missing parameters: empId or image Base64 data.' };
  
  try {
    const folder = DriveApp.getFolderById(PROFILE_PICTURE_FOLDER_ID);
    const contentType = imageBase64.substring(imageBase64.indexOf(":")+1, imageBase64.indexOf(";"));
    const decoded = Utilities.base64Decode(imageBase64.split(",")[1]);
    const blob = Utilities.newBlob(decoded, contentType, fileName || `profile_${cleanId(empId)}.png`);
    
    // Delete old photos for this user if they exist in the folder
    const files = folder.getFilesByName(blob.getName());
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileUrl = file.getUrl().replace('view?usp=drivesdk', 'thumbnail?sz=w500');
    
    updateRecordByField('Users', 'empId', cleanId(empId), { facePhoto: fileUrl });
    return { success: true, url: fileUrl };
  } catch (e) {
    Logger.log('Upload error: ' + e.message);
    // Fallback to Base64 in sheet if Drive fails
    updateRecordByField('Users', 'empId', cleanId(empId), { facePhoto: imageBase64 });
    return { success: true, url: imageBase64, warning: 'Saved as base64 due to Drive error: ' + e.message };
  }
}

function updateBio(data) {
  const { empId, bio } = data;
  return updateRecordByField('Users', 'empId', empId, { bio });
}

// ─────────────────────────────────────────────
// 5. TASKS & TIMER
// ─────────────────────────────────────────────
function getTasks(data) {
  const { empId, userId, startDate, endDate, searchQuery } = data || {};
  const targetEmpId = empId || userId;
  let tasks = [];
  
  if (targetEmpId) {
    tasks = allRows(getSheet('Tasks', targetEmpId, data.spreadsheetId));
  } else {
    // Aggregate from all user sheets for admin view
    const ss = getSpreadsheet();
    const sheets = ss.getSheets();
    sheets.forEach(s => {
      if (s.getName().startsWith('Tasks')) {
        tasks = tasks.concat(allRows(s));
      }
    });
  }

  Logger.log('[getTasks] empId=' + empId + ', startDate=' + startDate + ', endDate=' + endDate + ', total rows=' + tasks.length);

  if (startDate)   tasks = tasks.filter(t => t.date   >= startDate);
  if (endDate)     tasks = tasks.filter(t => t.date   <= endDate);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      String(t.taskName).toLowerCase().includes(q) ||
      String(t.source).toLowerCase().includes(q)
    );
  }

  tasks.sort((a,b) => (String(b.date)||'').localeCompare(String(a.date)||'') || (String(b.startTime)||'').localeCompare(String(a.startTime)||''));
  Logger.log('[getTasks] Returning ' + tasks.length + ' tasks for empId=' + empId);
  return { success:true, tasks };
}

function addTask(data) {
  try {
    const id = uid();
    const task = { id, ...data, createdAt:ts() };
    const row  = SHEET_SCHEMAS['Tasks'].map(h => task[h] !== undefined ? task[h] : '');
    Logger.log('[addTask] Adding task: id=' + id + ', empId=' + task.empId + ', taskName=' + task.taskName);
    Logger.log("ROW APPENDED: " + JSON.stringify(row));
    getSheet('Tasks', task.empId, data.spreadsheetId).appendRow(row);
    return { success:true, task };
  } catch (err) {
    Logger.log('[addTask] Error: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ── NEW: update remarks on an existing task ──────────────────────
function updateTaskRemark(data) {
  const { taskId, remarks, empId } = data || {};
  if (!taskId) return { success:false, error:'Missing taskId' };
  Logger.log('[updateTaskRemark] Updating task ' + taskId + ' with remarks: ' + remarks);
  
  if (empId) {
    return updateRecordByField('Tasks', 'id', taskId, { remarks: remarks || '' }, empId);
  } else {
    // Search all user sheets
    const ss = getSpreadsheet();
    const sheets = ss.getSheets();
    for (const s of sheets) {
      if (s.getName().startsWith('Tasks')) {
        const res = updateRecordByField(s.getName(), 'id', taskId, { remarks: remarks || '' });
        if (res.success) return res;
      }
    }
  }
  return { success:false, error:'Task not found' };
}

function timerStart(data) {
  // TimerLogs functionality is now merged with Tasks
  // This endpoint deprecated but kept for compatibility
  return { success:true, timerId:Utilities.getUuid() };
}

function timerStop(data) {
  // TimerLogs functionality is now merged with Tasks
  // This endpoint deprecated but kept for compatibility
  return { success:true };
}

// ── NEW: Retrieve Queue Data ──
function getQueue() {
  try {
    const sheet = getSheet('Queue');
    const queue = allRows(sheet);
    return { success: true, queue: queue };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// 6. ACTIVITY LOGGING
// ─────────────────────────────────────────────

// Single event (legacy / fallback)
function logActivity(data) {
  try {
    const empId = String(data.empId || '');
    const sheetUsers = getSheet('Users', null, data.spreadsheetId);
    const user = allRows(sheetUsers).find(u => String(u.empId) === empId);
    
    // Safety: Don't block logging if user not found, just log as Guest or System if needed
    if (user && String(user.role).toUpperCase() === 'ADMIN') return { success: true, message: 'Admin activity not logged' };

    const row = SHEET_SCHEMAS['ActivityLog'].map(h => {
      if (h === 'timestamp') return ts();
      if (h === 'status')    return data.status || 'SUCCESS';
      return data[h] || '';
    });
    getSheet('ActivityLog', data.empId, data.spreadsheetId).appendRow(row);
    return { success:true };
  } catch (err) {
    Logger.log('[logActivity] Error: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ── NEW: Batch insert from ActivityTracker ──────────────────────
// Accepts { action: 'batchLog', events: [ {...}, {...} ] }
// Uses setValues() for a single API call — much faster than appendRow() in a loop.
function batchLogActivities(data) {
  const { events } = data || {};
  if (!events || !Array.isArray(events) || events.length === 0) {
    return { success:true, inserted:0, message:'No events to log' };
  }

  const schema = SHEET_SCHEMAS['ActivityLog'];
  const allUsers = allRows(getSheet('Users'));
  const adminIds = allUsers.filter(u => String(u.role).toUpperCase() === 'ADMIN').map(u => String(u.empId));
  
  // Group events by empId, excluding admins
  const eventsByEmp = {};
  events.forEach(ev => {
    const empId = String(ev.empId || '');
    if (adminIds.includes(empId)) return; // Skip if it's an admin
    if (!eventsByEmp[empId]) eventsByEmp[empId] = [];
    eventsByEmp[empId].push(ev);
  });

  let totalInserted = 0;
  for (const empId in eventsByEmp) {
    const sheet = getSheet('ActivityLog', empId);
    const rows = eventsByEmp[empId].map(ev => schema.map(h => {
      switch (h) {
        case 'timestamp':   return ev.timestamp || ts();
        case 'empId':       return ev.empId     || '';
        case 'name':        return ev.name      || '';
        case 'action':      return ev.action    || 'LOG';
        case 'details':     return ev.details   || '';
        case 'sessionDuration': return ev.sessionDuration || '';
        case 'totalTasksLogged': return ev.totalTasksLogged != null ? String(ev.totalTasksLogged) : '';
        case 'totalHours':       return ev.totalHours != null ? String(ev.totalHours) : '';
        case 'activeDays':       return ev.activeDays != null ? String(ev.activeDays) : '';
        case 'avgHoursPerDay':   return ev.avgHoursPerDay != null ? String(ev.avgHoursPerDay) : '';
        default:            return ev[h] != null ? String(ev[h]).slice(0, 500) : '';
      }
    }));

    if (rows.length > 0) {
      try {
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, rows.length, schema.length).setValues(rows);
        totalInserted += rows.length;
      } catch (err) {
        Logger.log('✗ Batch log error for ' + empId + ': ' + err.message);
      }
    }
  }

  return { success:true, inserted:totalInserted, message:totalInserted + ' events logged to user-specific ActivityLogs' };
}

// ─────────────────────────────────────────────
// 7. ADMIN READ FUNCTIONS
// ─────────────────────────────────────────────
function getAllUsers(data) {
  try {
    const users = allRows(getSheet('Users', null, data ? data.spreadsheetId : null)).map(u => {
      const user = { ...u };
      delete user.password;
      return user;
    });
    return { success:true, users };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function updateUserRole(data) {
  const { empId, newRole } = data || {};
  if (!empId) return { success:false, error:'Missing empId' };
  if (!newRole) return { success:false, error:'Missing newRole' };
  
  return updateRecordByField('Users', 'empId', empId, { role: newRole });
}

function getActivityLog(data) {
  const { empId, userId, action, startDate, limit } = data || {};
  const targetEmpId = empId || userId;
  let logs = [];
  
  if (targetEmpId) {
    logs = allRows(getSheet('ActivityLog', targetEmpId, data.spreadsheetId));
  } else {
    // Aggregate from all user sheets
    const ss = getSpreadsheet();
    const sheets = ss.getSheets();
    sheets.forEach(s => {
      if (s.getName().startsWith('ActivityLog')) {
        logs = logs.concat(allRows(s));
      }
    });
  }

  if (action)    logs = logs.filter(l => l.action === action);
  if (startDate) logs = logs.filter(l => String(l.timestamp||'') >= startDate);

  logs.sort((a,b) => String(b.timestamp||'').localeCompare(String(a.timestamp||'')));
  if (limit) logs = logs.slice(0, limit);

  return { success:true, logs };
}

function getDashboardStats(data) {
  // Aggregate from all sheets
  const ss    = getSpreadsheet(data ? data.spreadsheetId : null);
  const sheets = ss.getSheets();
  
  let allTasks = [];
  let allLogs = [];
  const allUsers = allRows(getSheet('Users'));
  
  // Identify admins to exclude them from metrics/monitoring
  const adminIds = allUsers.filter(u => String(u.role).toUpperCase() === 'ADMIN').map(u => String(u.empId));
  const nonAdminUsers = allUsers.filter(u => String(u.role).toUpperCase() !== 'ADMIN');

  sheets.forEach(s => {
    const name = s.getName();
    if (name.startsWith('Tasks')) {
      const rows = allRows(s);
      allTasks = allTasks.concat(rows.filter(t => !adminIds.includes(String(t.empId))));
    } else if (name.startsWith('ActivityLog')) {
      const rows = allRows(s);
      allLogs = allLogs.concat(rows.filter(l => !adminIds.includes(String(l.empId))));
    }
  });

  const today      = todayStr();
  const totalMins  = allTasks.reduce((s,t) => s + Number(t.durationMinutes||0), 0);
  const todayTasks = allTasks.filter(t => t.date === today).length;
  const todayLogins= allLogs.filter(l => l.action === 'LOGIN' && String(l.timestamp||'').startsWith(today)).length;

  // Event-type breakdown from ActivityLog
  const actionCounts = {};
  allLogs.forEach(l => { actionCounts[l.action] = (actionCounts[l.action]||0)+1; });

  return {
    success: true,
    stats: {
      totalUsers:       nonAdminUsers.length,
      totalTasks:       allTasks.length,
      todayTasks,
      totalMins,
      totalActivities:  allLogs.length,
      todayLogins,
      actionBreakdown:  actionCounts
    }
  };
}

// ── NEW: Get user-specific statistics for profile page ──
function getUserStats(data) {
  const { empId, userId } = data || {};
  const targetEmpId = empId || userId;
  if (!targetEmpId) return { success:false, error:'Missing empId' };

  const userTasks = allRows(getSheet('Tasks', targetEmpId, data.spreadsheetId));

  Logger.log('[getUserStats] empId=' + targetEmpId + ', found=' + userTasks.length + ' tasks');

  // Calculate stats
  const totalMins    = userTasks.reduce((s,t) => s + Number(t.durationMinutes||0), 0);
  const totalHours   = (totalMins / 60).toFixed(1);
  const activeDates  = [...new Set(userTasks.map(t => t.date).filter(d => d))];
  const activeDays   = activeDates.length;
  const avgHoursDay  = activeDays > 0 ? (totalHours / activeDays).toFixed(1) : 0;

  return {
    success: true,
    stats: {
      totalTasksLogged: userTasks.length,
      totalHours:       totalHours,
      activeDays:       activeDays,
      avgHoursPerDay:   avgHoursDay,
      totalMinutes:     totalMins,
      lastTaskDate:     activeDates.length > 0 ? activeDates.sort().reverse()[0] : null
    },
    timestamp: ts()
  };
}

// ─────────────────────────────────────────────
// 9. DEPARTMENT MANAGEMENT
// ─────────────────────────────────────────────
function changeDept(data) {
  data = data || {};
  const { empId, newDept, adminEmail } = data;
  if (!empId)   return { success:false, error:'Missing empId' };
  if (!newDept) return { success:false, error:'Missing newDept' };

  const sheet   = getSheet('Users');
  const rows    = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success:false, error:'No users found' };

  const headers       = rows[0];
  const empIdIndex    = headers.indexOf('empId');
  const deptIndex     = headers.indexOf('dept');

  if (empIdIndex === -1 || deptIndex === -1)
    return { success:false, error:'Users sheet missing required columns' };

  for (let i=1; i<rows.length; i++) {
    if (String(rows[i][empIdIndex]) === String(empId)) {
      const oldDept = rows[i][deptIndex];
      sheet.getRange(i+1, deptIndex+1).setValue(newDept);

      const logRow = SHEET_SCHEMAS.DeptChanges.map(h => {
        const m = { empId, oldDept, newDept, changedAt:ts(), changedBy:adminEmail||'admin' };
        return m[h] || '';
      });
      getSheet('DeptChanges').appendRow(logRow);
      return { success:true, oldDept, newDept };
    }
  }
  return { success:false, error:'User not found' };
}

function getDeptChanges(data) {
  const { empId } = data || {};
  let changes = allRows(getSheet('DeptChanges'));
  if (empId) changes = changes.filter(c => c.empId === empId);
  changes.sort((a,b) => String(b.changedAt||'').localeCompare(String(a.changedAt||'')));
  return { success:true, changes };
}

function addTrackerRequest(data) {
  const { empID, fullName, tasks } = data || {};
  if (!empID || !fullName) return { success:false, error:'Missing required fields' };
  
  const sheet = getSheet('TrackerRequests');
  const requestedAt = ts();
  const row = SHEET_SCHEMAS.TrackerRequests.map(h => {
    const map = { empID, fullName, tasks, requestedAt };
    return map[h] !== undefined ? map[h] : '';
  });
  sheet.appendRow(row);
  return { success:true, message:'Request submitted successfully' };
}

// ─────────────────────────────────────────────
// 10. GEOLOCATION
// ─────────────────────────────────────────────
function clockIn(data) {
  return logLocation({ ...data, action: 'CLOCK_IN' });
}

function clockOut(data) {
  return logLocation({ ...data, action: 'CLOCK_OUT' });
}

function getAttendance(data) {
  try {
    const logs = allRows(getSheet('Locations')).filter(l => l.empId === data.empId);
    return { success: true, attendance: logs };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// 11. IOT & SYSTEM SYSTEM
// ─────────────────────────────────────────────
function getSystemStatus() {
  const users = allRows(getSheet('Users'));
  const activeUsers = allRows(getSheet('ActivityLog')).filter(l => {
    const logTime = new Date(l.timestamp);
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    return logTime > tenMinsAgo && l.action !== 'LOGOUT';
  }).map(l => l.empId);
  
  return {
    success: true,
    status: 'ONLINE',
    node: SYSTEM_CONFIG.nodeName,
    version: SYSTEM_CONFIG.version,
    uptime: Math.floor(Math.random() * 10000) + 's', // Simulated
    activeSessions: [...new Set(activeUsers)].length,
    cpuLoad: (Math.random() * 15 + 5).toFixed(1) + '%',
    memory: (Math.random() * 20 + 40).toFixed(1) + '%',
    timestamp: ts()
  };
}

function unlockRegistrationMenu() {
  return { success: true, message: 'Registration menu unlocked successfully.' };
}

function logLocation(data) {
  try {
    const sheet = getSheet('Locations');
    const headers = SHEET_SCHEMAS.Locations;
    
    let distance = '';
    let workLocation = 'Remote';
    
    if (data.latitude && data.longitude) {
      distance = calculateDistance(Number(data.latitude), Number(data.longitude), OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
      if (distance !== '' && distance <= OFFICE_LOCATION.radius) {
        workLocation = 'In Office';
      }
    }

    const row = headers.map(h => {
      const map = {
        timestamp: ts(),
        empId: data.empId || 'SYSTEM',
        action: data.action || data.type || 'LOCATION_LOG',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        accuracy: data.accuracy || '',
        status: data.status || (workLocation === 'In Office' ? 'IN_OFFICE' : 'REMOTE'),
        distance: distance,
        workLocation: workLocation,
        device: data.device || 'Web'
      };
      return map[h] !== undefined ? map[h] : '';
    });
    sheet.appendRow(row);
    return { success: true, workLocation, distance };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getLocations(data) {
  try {
    const sheet = getSheet('Locations');
    const logs = allRows(sheet).filter(l => !data.empId || l.empId === data.empId);
    return { success: true, logs: logs };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// 11. UTILITY HELPERS
// ─────────────────────────────────────────────

// Update a single matching row
function updateRecordByField(sheetName, searchField, searchValue, updates, empId) {
  const sheet   = getSheet(sheetName, empId);
  const data    = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success:false, error:'Not found' };

  const headers     = data[0];
  const searchIndex = headers.indexOf(searchField);
  if (searchIndex === -1) return { success:false, error:'Search field not found' };

  for (let i=1; i<data.length; i++) {
    if (String(data[i][searchIndex]) === String(searchValue)) {
      Object.keys(updates).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) sheet.getRange(i+1, colIndex+1).setValue(updates[key]);
      });
      return { success:true };
    }
  }
  return { success:false, error:'Record not found' };
}

// Update ALL matching rows (e.g. TasksByempId)
function updateAllRecordsByField(sheetName, searchField, searchValue, updates) {
  const sheet   = getSheet(sheetName);
  const data    = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers     = data[0];
  const searchIndex = headers.indexOf(searchField);
  if (searchIndex === -1) return;

  for (let i=1; i<data.length; i++) {
    if (String(data[i][searchIndex]) === String(searchValue)) {
      Object.keys(updates).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) sheet.getRange(i+1, colIndex+1).setValue(updates[key]);
      });
    }
  }
}

// ─────────────────────────────────────────────
// 11. INITIALIZATION & SEEDING
// ─────────────────────────────────────────────

// Run this once after pasting the script
function initializeAllSheets() {
  Object.keys(SHEET_SCHEMAS).forEach(name => {
    const sheet = getSheet(name);
    const expectedHeaders = SHEET_SCHEMAS[name];
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) {
      sheet.appendRow(expectedHeaders);
    } else {
      const actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const missing = expectedHeaders.filter(h => !actualHeaders.includes(h));
      if (missing.length > 0) {
        const newHeaders = [...actualHeaders, ...missing];
        sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
        Logger.log('✓ Updated headers for ' + name + ': added ' + missing.join(', '));
      }
    }
  });
  
  // Clear and reset ActivityLog as requested by user
  clearActivityLog();

  // Register the new users provided by the user
  seedNewUsers();
  
  Logger.log('✓ All sheets initialized and headers synced (v6.7)');
  return 'System v6.7 initialized — all sheets ready and headers synced.';
}

function seedNewUsers() {
  const users = [
    { empId: 'GHZ-1111', firstName: 'Admin Master', lastName: 'Gigahertz', password: 'admin123', dept: 'ADMINISTRATION', role: 'ADMIN' },
    { empId: 'GHZ-0001', firstName: 'Admin', lastName: 'User', password: 'adminpassword', dept: 'IT', role: 'ADMIN' },
    { empId: 'GHZ-0002', firstName: 'Rose Marie', lastName: 'Labao', password: 'Marie123!', dept: 'PROCESS IMPROVEMENT', role: 'EMPLOYEE' },
    { empId: 'GHZ-0003', firstName: 'MARIELLE JOYCE ANN', lastName: 'AGUILA', password: 'Marielle123!', dept: 'PROCESS IMPROVEMENT', role: 'EMPLOYEE' },
    { empId: 'GHZ-0004', firstName: 'Edmark', lastName: 'Dela Cruz', password: 'Edmark123!', dept: 'PROCESS IMPROVEMENT', role: 'EMPLOYEE' },
    { empId: 'GHZ-0005', firstName: 'Piolo', lastName: 'Janda', password: 'Piolo123!', dept: 'PROCESS IMPROVEMENT', role: 'EMPLOYEE' },
    { empId: 'GHZ-0006', firstName: 'Marson', lastName: 'Samosino', password: 'Marson123!', dept: 'PROCESS IMPROVEMENT', role: 'EMPLOYEE' },
    { empId: 'GHZ-0007', firstName: 'Andrew', lastName: 'Tubig', password: 'Andrew123!', dept: 'PROCESS IMPROVEMENT', role: 'EMPLOYEE' }
  ];
  
  const usersSheet = getSheet('Users');
  const existingUsers = allRows(usersSheet);
  
  users.forEach(u => {
    if (!existingUsers.find(ex => ex.empId === u.empId)) {
      const createdAt = ts();
      const row = SHEET_SCHEMAS.Users.map(h => {
        const map = { ...u, bio: '', createdAt, facePhoto: '' };
        return map[h] !== undefined ? map[h] : '';
      });
      usersSheet.appendRow(row);
      // Initialize their sheets
      getSheet('Tasks', u.empId);
      getSheet('ActivityLog', u.empId);
      Logger.log('✓ Registered user: ' + u.empId);
    }
  });
  
  return 'New users registered and sheets initialized.';
}

// Run this for a fresh start with demo data
function initializeAllSheetsAndSeed() {
  Object.keys(SHEET_SCHEMAS).forEach(name => getSheet(name));

  // Seed Users (7 columns: empId, firstName, lastName, password, dept, bio, createdAt)
  const usersSheet = getSheet('Users');
  if (allRows(usersSheet).length === 0) {
    const now = ts();
    usersSheet.appendRow(['GHZ0001', 'Izumi', 'Miyamura', 'izumipassword', 'PRODUCT DEPARTMENT', '', now]);
    usersSheet.appendRow(['GHZ1231', 'Dasadad', 'User', 'password123', 'MARKETING', '', now]);
  }

  // Seed Tasks (10 columns: id, empId, taskName, date, startTime, endTime, durationMinutes, source, remarks, createdAt)
  const tasksSheet = getSheet('Tasks');
  if (allRows(tasksSheet).length === 0) {
    const now = ts();
    tasksSheet.appendRow([uid(), 'GHZ0001', 'Prepare Report', todayStr(), '09:00', '09:30', 30, 'manual', '', now]);
    tasksSheet.appendRow([uid(), 'GHZ1231', 'Client Call', todayStr(), '10:00', '10:30', 30, 'manual', '', now]);
  }

  // Seed ActivityLog (10 columns: timestamp, empId, dept, action, details, page, element, duration, userAgent, sessionId, status)
  const logSheet = getSheet('ActivityLog');
  if (allRows(logSheet).length === 0) {
    logSheet.appendRow([ts(), 'GHZ0001', 'PRODUCT DEPARTMENT', 'LOGIN', 'Login: GHZ0001', 'login', '', '', 'seeded', 'sess_seed001', 'SUCCESS']);
  }

  // Seed DeptChanges (5 columns: empId, oldDept, newDept, changedAt, changedBy)
  const deptSheet = getSheet('DeptChanges');
  if (allRows(deptSheet).length === 0) {
    deptSheet.appendRow(['GHZ0001', 'R&D', 'PRODUCT DEPARTMENT', ts(), 'admin']);
  }

  Logger.log('✓ Sheets seeded with demo data.');
  return 'Sheets initialized and seeded with demo data.';
}

// Wipe and rebuild from scratch
function resetAndSeedAllSheets() {
  const ss = getSpreadsheet();
  Object.keys(SHEET_SCHEMAS).forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) ss.deleteSheet(sheet);
  });
  initializeAllSheetsAndSeed();
  Logger.log('✓ Full reset complete.');
  return 'Reset complete.';
}

/**
 * Clears the ActivityLog sheet and resets it with the new schema.
 * Run this once to apply the user's requested changes.
 */
function clearActivityLog() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('ActivityLog');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('ActivityLog');
  }
  
  const headers = SHEET_SCHEMAS.ActivityLog;
  sheet.appendRow(headers);
  
  // Style headers
  const hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setBackground('#1a3a6e')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✓ ActivityLog cleared and reset with new schema.');
  return 'ActivityLog cleared and reset with new schema: ' + headers.join(', ');
}

// ─────────────────────────────────────────────
// 12. ACTIVITY LOG REPORTS
//     Run these from the Apps Script editor to
//     get quick analytics on tracked events.
// ─────────────────────────────────────────────

// Returns a summary of all action types and their counts
function getActivitySummary() {
  const logs = allRows(getSheet('ActivityLog'));
  const summary = {};
  logs.forEach(l => { summary[l.action] = (summary[l.action]||0)+1; });
  const sorted = Object.entries(summary).sort((a,b)=>b[1]-a[1]);
  Logger.log('== Activity Summary ==');
  sorted.forEach(([action,count]) => Logger.log(`  ${action}: ${count}`));
  return sorted;
}

// Returns the last N events for a given empId
function getRecentActivityForEmployee(empId, limit) {
  limit = limit || 20;
  const logs = allRows(getSheet('ActivityLog'))
    .filter(l => l.empId === empId)
    .sort((a,b) => String(b.timestamp||'').localeCompare(String(a.timestamp||'')))
    .slice(0, limit);
  Logger.log(`== Recent ${limit} events for ${empId} ==`);
  logs.forEach(l => Logger.log(`  [${l.timestamp}] ${l.action} — ${l.details}`));
  return logs;
}

// Returns daily activity counts for the past N days
function getDailyActivityTrend(days) {
  days = days || 7;
  const logs  = allRows(getSheet('ActivityLog'));
  const trend = {};
  for (let i=0; i<days; i++) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    trend[ds] = logs.filter(l => String(l.timestamp||'').startsWith(ds)).length;
  }
  Logger.log('== Daily Activity Trend ==');
  Object.entries(trend).sort().reverse().forEach(([date,count]) => Logger.log(`  ${date}: ${count} events`));
  return trend;
}

// ─────────────────────────────────────────────
// 13. VISUAL DASHBOARD GENERATOR
//     Run generateDashboardVisuals() from the
//     editor to create charts in a new sheet.
// ─────────────────────────────────────────────
function generateDashboardVisuals() {
  const ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = 'Visual Dashboard';
  let   dashSheet = ss.getSheetByName(sheetName);

  if (dashSheet) {
    dashSheet.clear();
    dashSheet.getCharts().forEach(c => dashSheet.removeChart(c));
  } else {
    dashSheet = ss.insertSheet(sheetName);
  }

  // Data queries (hidden columns A-I)
  dashSheet.getRange('A1').setFormula(
    '=QUERY(Tasks!F:J, "SELECT F, SUM(J) WHERE F IS NOT NULL AND F != \'taskName\' GROUP BY F LABEL F \'Task\', SUM(J) \'Total Mins\'")'
  );
  dashSheet.getRange('D1').setFormula(
    '=QUERY(Tasks!F:J, "SELECT G, SUM(J) WHERE G IS NOT NULL AND G != \'date\' GROUP BY G LABEL G \'Date\', SUM(J) \'Total Mins\'")'
  );
  dashSheet.getRange('G1').setFormula(
    '=QUERY(ActivityLog!A:N, "SELECT F, COUNT(A) WHERE F IS NOT NULL AND F != \'action\' GROUP BY F LABEL F \'Action\', COUNT(A) \'Count\'")'
  );

  // Doughnut: time per task category
  const doughnut = dashSheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dashSheet.getRange('A1:B100'))
    .setPosition(2, 2, 0, 0)
    .setOption('title', 'Time Spent per Task Category')
    .setOption('pieHole', 0.5)
    .setOption('colors', ['#1a3af5','#9333ea','#fbbf24','#ef4444','#10b981','#06b6d4','#ec4899'])
    .setOption('width', 420).setOption('height', 300)
    .build();
  dashSheet.insertChart(doughnut);

  // Line: daily productivity trend
  const line = dashSheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(dashSheet.getRange('D1:E100'))
    .setPosition(2, 9, 0, 0)
    .setOption('title', 'Daily Productivity Trend (Minutes)')
    .setOption('colors', ['#1a3af5'])
    .setOption('width', 520).setOption('height', 300)
    .build();
  dashSheet.insertChart(line);

  // Bar: activity event breakdown
  const bar = dashSheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(dashSheet.getRange('G1:H100'))
    .setPosition(14, 2, 0, 0)
    .setOption('title', 'Activity Event Breakdown (All Users)')
    .setOption('colors', ['#1a3af5'])
    .setOption('width', 900).setOption('height', 380)
    .build();
  dashSheet.insertChart(bar);

  Logger.log('✓ Visual Dashboard generated.');
  return 'Visual Dashboard created/refreshed.';
}

// ─────────────────────────────────────────────
// 14. ENHANCED DATA SYNC FUNCTIONS
//     Additional utilities for comprehensive
//     web app ↔ Sheets integration
// ─────────────────────────────────────────────

// Batch create multiple tasks at once
// Useful for syncing bulk task data from web app
function batchCreateTasks(data) {
  const { tasks } = data || {};
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return { success:false, inserted:0, message:'No tasks provided' };
  }

  const schema = SHEET_SCHEMAS['Tasks'];
  
  // Group tasks by empId
  const tasksByEmp = {};
  tasks.forEach(t => {
    if (!tasksByEmp[t.empId]) tasksByEmp[t.empId] = [];
    tasksByEmp[t.empId].push(t);
  });

  let totalInserted = 0;
  for (const empId in tasksByEmp) {
    const sheet = getSheet('Tasks', empId);
    const rows = tasksByEmp[empId].map(task => schema.map(h => {
      switch (h) {
        case 'id':        return uid();
        case 'createdAt': return ts();
        default:          return task[h] != null ? String(task[h]).slice(0, 500) : '';
      }
    }));

    if (rows.length > 0) {
      try {
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, rows.length, schema.length).setValues(rows);
        totalInserted += rows.length;
      } catch (err) {
        Logger.log('✗ Bulk task creation error for ' + empId + ': ' + err.message);
      }
    }
  }

  return { success:true, inserted:totalInserted, message:totalInserted + ' tasks created in user-specific sheets' };
}

// Get comprehensive sync report for monitoring
function getSyncReport() {
  const users = allRows(getSheet('Users'));
  const tasks = allRows(getSheet('Tasks'));
  const logs  = allRows(getSheet('ActivityLog'));
  const timers = allRows(getSheet('TimerLogs'));
  const deptChanges = allRows(getSheet('DeptChanges'));

  const today = todayStr();
  const now = new Date();

  const report = {
    syncTime: ts(),
    sheets: {
      Users: { rowCount: users.length },
      Tasks: { rowCount: tasks.length, todayCount: tasks.filter(t => t.date === today).length },
      ActivityLog: { rowCount: logs.length, todayCount: logs.filter(l => String(l.timestamp||'').startsWith(today)).length },
      TimerLogs: { rowCount: timers.length },
      DeptChanges: { rowCount: deptChanges.length }
    },
    stats: {
      activeUsers: users.length,
      tasksToday: tasks.filter(t => t.date === today).length,
      totalActivities: logs.length,
      eventTypes: {},
      topUsers: []
    }
  };

  // Event breakdown
  logs.forEach(l => {
    report.stats.eventTypes[l.action] = (report.stats.eventTypes[l.action] || 0) + 1;
  });

  // Top 5 most active users
  const userActivity = {};
  logs.forEach(l => {
    if (l.empId) userActivity[l.empId] = (userActivity[l.empId] || 0) + 1;
  });
  report.stats.topUsers = Object.entries(userActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([empId, count]) => ({ empId, eventCount: count }));

  return report;
}

// Export activity data for a specific user
function exportUserActivity(data) {
  const { empId, daysBack } = data || {};
  if (!empId) return { success:false, error:'Missing empId' };

  const days = daysBack || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const logs = allRows(getSheet('ActivityLog'))
    .filter(l => l.empId === empId && String(l.timestamp||'') >= cutoffStr)
    .sort((a,b) => String(b.timestamp||'').localeCompare(String(a.timestamp||'')));

  const tasks = allRows(getSheet('Tasks'))
    .filter(t => t.empId === empId && t.date >= cutoff.toISOString().split('T')[0])
    .sort((a,b) => b.date.localeCompare(a.date));

  return {
    success: true,
    empId: empId,
    exportDate: ts(),
    activityCount: logs.length,
    taskCount: tasks.length,
    activities: logs.slice(0, 100),
    tasks: tasks.slice(0, 50)
  };
}

// Validate data integrity across sheets
function validateDataIntegrity() {
  const issues = [];

  const users = allRows(getSheet('Users'));
  const userIds = new Set(users.map(u => u.id));

  // Check Tasks sheet
  const tasks = allRows(getSheet('Tasks'));
  tasks.forEach((t, idx) => {
    if (t.userId && !userIds.has(t.userId)) {
      issues.push(`Tasks[${idx+2}]: Invalid userId reference: ${t.userId}`);
    }
  });

  // Check TimerLogs sheet
  const timers = allRows(getSheet('TimerLogs'));
  timers.forEach((t, idx) => {
    if (t.userId && !userIds.has(t.userId)) {
      issues.push(`TimerLogs[${idx+2}]: Invalid userId reference: ${t.userId}`);
    }
  });

  // Check for duplicate IDs
  const allIds = [];
  users.forEach(u => allIds.push({ sheet: 'Users', id: u.id }));
  tasks.forEach(t => allIds.push({ sheet: 'Tasks', id: t.id }));
  timers.forEach(t => allIds.push({ sheet: 'TimerLogs', id: t.id }));

  const idMap = {};
  allIds.forEach(item => {
    if (idMap[item.id]) {
      issues.push(`Duplicate ID ${item.id} in ${item.sheet} and ${idMap[item.id]}`);
    } else {
      idMap[item.id] = item.sheet;
    }
  });

  return {
    success: true,
    isValid: issues.length === 0,
    issueCount: issues.length,
    issues: issues
  };
}

// Clear old activity logs (older than specified days)
function clearOldActivityLogs(data) {
  const { daysToKeep } = data || {};
  const keep = daysToKeep || 90;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keep);
  const cutoffStr = cutoff.toISOString();

  const sheet = getSheet('ActivityLog');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success:true, deleted:0 };

  const headers = rows[0];
  const tsIndex = headers.indexOf('timestamp');
  let deletedCount = 0;

  // Delete from bottom to top to avoid index issues
  for (let i = rows.length - 1; i > 0; i--) {
    if (String(rows[i][tsIndex] || '') < cutoffStr) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  Logger.log(`✓ Deleted ${deletedCount} old activity logs (before ${cutoff.toDateString()})`);
  return { success:true, deleted:deletedCount };
}

// Flush all pending events from browser
function flushPendingEvents(data) {
  const { events } = data || {};
  if (!events || !Array.isArray(events)) {
    return batchLogActivities({ events: [] });
  }
  return batchLogActivities({ events: events });
}

// Generate activity summary by department
function getActivityByDepartment() {
  const logs = allRows(getSheet('ActivityLog'));
  const deptActivity = {};

  logs.forEach(l => {
    if (l.dept) {
      if (!deptActivity[l.dept]) {
        deptActivity[l.dept] = { events: 0, users: new Set(), actions: {} };
      }
      deptActivity[l.dept].events++;
      if (l.userId) deptActivity[l.dept].users.add(l.userId);
      deptActivity[l.dept].actions[l.action] = (deptActivity[l.dept].actions[l.action] || 0) + 1;
    }
  });

  // Convert to JSON-serializable format
  const report = {};
  Object.entries(deptActivity).forEach(([dept, data]) => {
    report[dept] = {
      events: data.events,
      uniqueUsers: data.users.size,
      actions: data.actions
    };
  });

  return {
    success: true,
    timestamp: ts(),
    departmentBreakdown: report
  };
}

// ─────────────────────────────────────────────
// 15. DIAGNOSTIC & DEBUGGING FUNCTIONS
//     Use these to troubleshoot sync issues
// ─────────────────────────────────────────────

// Diagnostic report: Check system health
function getDiagnosticReport() {
  try {
    // Verify sheets exist
    const sheetStatus = {};
    Object.keys(SHEET_SCHEMAS).forEach(name => {
      try {
        const sheet = getSheet(name);
        const rows = sheet.getDataRange().getValues();
        sheetStatus[name] = {
          status: 'OK',
          rowCount: rows.length,
          colCount: rows[0] ? rows[0].length : 0
        };
      } catch (err) {
        sheetStatus[name] = { status: 'ERROR', error: err.message };
      }
    });

    // Count data in each sheet
    const dataSummary = {
      Users: allRows(getSheet('Users')).length,
      Tasks: allRows(getSheet('Tasks')).length,
      ActivityLog: allRows(getSheet('ActivityLog')).length,
      TimerLogs: allRows(getSheet('TimerLogs')).length,
      DeptChanges: allRows(getSheet('DeptChanges')).length
    };

    return {
      success: true,
      timestamp: ts(),
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`,
      sheetsStatus: sheetStatus,
      dataSummary: dataSummary,
      isHealthy: Object.values(sheetStatus).every(s => s.status === 'OK'),
      message: Object.values(sheetStatus).every(s => s.status === 'OK') 
        ? '✓ All systems operational' 
        : '✗ Some sheets have issues'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      timestamp: ts()
    };
  }
}

function getFullAttendanceReport(data) {
  try {
    const logs = allRows(getSheet('Locations'));
    return { success: true, report: logs };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function bulkEmployeeUpdate(data) {
  try {
    const { updates } = data || {};
    if (!updates || !Array.isArray(updates)) return { success: false, error: 'Invalid updates payload' };
    
    updates.forEach(u => {
      updateRecordByField('Users', 'empId', u.empId, u.changes);
    });
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function deleteAttendanceLogs(data) {
  try {
    const { employeeId } = data || {};
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Locations');
    if (!sheet) return { success: true, message: 'Locations sheet not found' };
    
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const empIdIdx = headers.indexOf('empId');
    
    let deletedCount = 0;
    for (let i = rows.length - 1; i > 0; i--) {
      if (!employeeId || String(rows[i][empIdIdx]) === String(employeeId)) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    
    return { success: true, deleted: deletedCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function deleteAuditLogs(data) {
  try {
    const { userId } = data || {};
    const ss = getSpreadsheet();
    
    if (userId) {
      const sheetName = 'ActivityLog_' + userId;
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        sheet.clear();
        sheet.appendRow(SHEET_SCHEMAS.ActivityLog);
      }
      return { success: true };
    } else {
      const mainSheet = ss.getSheetByName('ActivityLog');
      if (mainSheet) {
        mainSheet.clear();
        mainSheet.appendRow(SHEET_SCHEMAS.ActivityLog);
      }
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// 16. ADDITIONAL FEATURES (MIGRATED FROM INDEX)
// ─────────────────────────────────────────────

function submitTrackerRequest(data) {
  try {
    const sheet = getSheet('TrackerRequests');
    const headers = SHEET_SCHEMAS.TrackerRequests;
    const row = headers.map(h => {
      const map = {
        id: uid(),
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        department: data.department,
        tasks: typeof data.tasks === 'string' ? data.tasks : JSON.stringify(data.tasks),
        status: 'PENDING',
        requestedAt: ts()
      };
      return map[h] !== undefined ? map[h] : '';
    });
    sheet.appendRow(row);
    return { success: true, message: 'Request submitted successfully' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getPendingTrackerRequests(data) {
  try {
    const rows = allRows(getSheet('TrackerRequests'));
    const pending = rows.filter(r => r.status === 'PENDING');
    return { success: true, requests: pending };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function approveTrackerRequest(data) {
  try {
    const sheet = getSheet('TrackerRequests');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('id');
    const statusIdx = headers.indexOf('status');
    const notesIdx = headers.indexOf('approverNotes');
    
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIdx] === data.requestId) {
            sheet.getRange(i + 1, statusIdx + 1).setValue('APPROVED');
            if (notesIdx !== -1) {
                sheet.getRange(i + 1, notesIdx + 1).setValue(data.notes || '');
            }
            return { success: true };
        }
    }
    return { success: false, error: 'Request not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getEmployeeTrackerRequests(data) {
  try {
    const rows = allRows(getSheet('TrackerRequests'));
    const filtered = rows.filter(r => r.employeeId === data.employeeId);
    return { success: true, requests: filtered };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getAdminEmployees(data) {
  try {
    const users = allRows(getSheet('Users')).filter(u => u.role === 'ADMIN');
    return { success: true, users: users.map(u => ({ ...u, password: '***' })) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getHRDashboard(data) {
  try {
    const users = allRows(getSheet('Users'));
    const tasks = allRows(getSheet('Tasks'));
    const requests = allRows(getSheet('TrackerRequests'));
    
    return {
      success: true,
      stats: {
        totalEmployees: users.length,
        totalTasks: tasks.length,
        pendingRequests: requests.filter(r => r.status === 'PENDING').length,
        activeSprints: 0 // Placeholder
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function addLeave(data) {
  try {
    const sheet = getSheet('Leaves');
    const row = [uid(), data.empId, data.type, data.startDate, data.endDate, data.reason, 'PENDING', ts()];
    sheet.appendRow(row);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function updateLeave(data) {
  try {
    const sheet = getSheet('Leaves');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
            sheet.getRange(i + 1, 7).setValue(data.status);
            return { success: true };
        }
    }
    return { success: false };
  } catch (err) {
    return { success: false };
  }
}

function addProject(data) {
  try {
    const sheet = getSheet('Projects');
    const row = [uid(), data.projectName, data.client, data.deadline, 'Active', 0, ts()];
    sheet.appendRow(row);
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

function updateProject(data) {
  try {
    const sheet = getSheet('Projects');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
            if (data.progress !== undefined) sheet.getRange(i + 1, 6).setValue(data.progress);
            if (data.status !== undefined) sheet.getRange(i + 1, 5).setValue(data.status);
            return { success: true };
        }
    }
    return { success: false };
  } catch (err) {
    return { success: false };
  }
}

function postAnnouncement(data) {
  try {
    const sheet = getSheet('Announcements');
    sheet.appendRow([ts(), data.title, data.content, data.author]);
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

function unlockRegistrationMenu(data) {
  return { success: true, unlocked: true };
}

function endSession(data) {
  return logActivity({ ...data, action: 'LOGOUT', status: 'SUCCESS' });
}

function logTask(data) {
  return addTask(data);
}

// Force sync test: Send test data
function testSync(data) {
  const { testTaskName } = data || {};
  
  // Create a test task
  const testTask = {
    userId: 'test_user_' + Date.now(),
    empId: 'TEST-9999',
    userEmail: 'test@gigahertz.com',
    dept: 'TEST',
    taskName: testTaskName || 'TEST SYNC TASK: ' + new Date().toLocaleTimeString(),
    date: todayStr(),
    startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    endTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    durationMinutes: 5,
    source: 'TEST',
    remarks: 'This is a test sync - if you see this in Tasks sheet, sync is working!',
    status: 'TEST'
  };

  // Log test activity
  const testActivity = {
    userId: testTask.userId,
    empId: testTask.empId,
    dept: testTask.dept,
    action: 'TEST_SYNC',
    details: 'Testing sync connection to Google Sheets',
    page: 'diagnostic',
    element: 'test',
    userAgent: 'GoogleAppsScript/Diagnostic',
    sessionId: 'test_' + Date.now(),
    status: 'TEST'
  };

  try {
    // Add to Tasks
    addTask(testTask);
    
    // Add to ActivityLog
    logActivity(testActivity);

    return {
      success: true,
      message: '✓ Test data written to sheets! Check Tasks sheet and ActivityLog.',
      testData: {
        task: testTask,
        activity: testActivity
      },
      timestamp: ts(),
      instructions: 'Go to Google Sheet and look for rows with "TEST" in them. If you see them, sync is working!'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      timestamp: ts()
    };
  }
}
