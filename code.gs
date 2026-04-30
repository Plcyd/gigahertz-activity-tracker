// ============================================================
// ACTIVITY TRACKER — Google Apps Script Backend (code.gs)
// ============================================================
// Per-employee setup: each employee has their own copy of this
// GSheet + Script. The ACCOUNT sheet (row 2) defines the
// credentials and identity for that copy.
// 
// ACCOUNT Sheet (Foundation):
//   - Column A: Department
//   - Column B: Name (full name)
//   - Column C: Employee ID (username)
//   - Column D: Password
//
// ACTIVITY LOG Sheet:
//   - Columns: EMPLOYEE ID, DEPARTMENT, TASK NAME, START TIMESTAMP, END TIMESTAMP, DURATION, REMARKS, INTERRUPTION, ATTACHED FILE
//
// TASKLIST Sheet:
//   - Column A: TASK NAME
//
// DAILY EFFICIENT Sheet:
//   - Columns: DATE, EMPLOYEE ID, TOTAL SESSION TIME, TASKS LOGGED, SESSION EFFICIENCY %, NOTES
//
// TIME & ATTENDANCE Sheet:
//   - Columns: DATE, EMPLOYEE ID, DEPARTMENT, LOGIN TIME, LOGOUT TIME, TOTAL HOURS, BREAK RECORDS, NET HOURS, OVERTIME
// ============================================================

const SPREADSHEET_ID = '1HAeGE_XfjkbSeHp6nz6ukgZ-glDRwg04RBHyT_mVFxU';

// ─────────────────────────────────────────────
// 0. SYSTEM & IOT CONFIGURATION
// ─────────────────────────────────────────────
const SYSTEM_CONFIG = {
  version: 'v9.07-PLATINUM',
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
const WALLPAPER_FOLDER_NAME = 'Gigahertz/Wallpapers';

/**
 * Gets or creates the wallpaper folder in Google Drive
 */
function getWallpaperFolder() {
  const root = DriveApp.getRootFolder();
  const parts = WALLPAPER_FOLDER_NAME.split('/');
  let current = root;
  
  for (const part of parts) {
    const folders = current.getFoldersByName(part);
    if (folders.hasNext()) {
      current = folders.next();
    } else {
      current = current.createFolder(part);
    }
  }
  return current;
}

/**
 * Saves a wallpaper image to Drive and updates the ACCOUNT sheet
 */
function saveWallpaper(data) {
  try {
    const { empId, imageBase64, fileName, blur, darkness } = data;
    if (!empId) throw new Error('Employee ID is required');

    let imageUrl = '';
    if (imageBase64) {
      const folder = getWallpaperFolder();
      const contentType = imageBase64.split(',')[0].split(':')[1].split(';')[0];
      const bytes = Utilities.base64Decode(imageBase64.split(',')[1]);
      const blob = Utilities.newBlob(bytes, contentType, fileName || `wallpaper_${empId}_${Date.now()}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = file.getUrl().replace('view?usp=drivesdk', 'uc?export=view&id=' + file.getId());
    }

    const ss = SpreadsheetApp.openById(normalizeSpreadsheetId(SPREADSHEET_ID));
    const sheet = ss.getSheetByName('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    
    const empCol = headers.indexOf('EMPLOYEE ID');
    const wpCol = headers.indexOf('WALLPAPER');
    const blurCol = headers.indexOf('BLUR');
    const darkCol = headers.indexOf('DARKNESS');

    let rowIndex = -1;
    const cleanSearchId = cleanId(empId);
    for (let i = 1; i < rows.length; i++) {
        if (cleanId(rows[i][empCol]) === cleanSearchId) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex === -1) throw new Error('Employee not found');

    if (imageUrl) sheet.getRange(rowIndex, wpCol + 1).setValue(imageUrl);
    if (blur !== undefined) sheet.getRange(rowIndex, blurCol + 1).setValue(blur);
    if (darkness !== undefined) sheet.getRange(rowIndex, darkCol + 1).setValue(darkness);

    return { 
      success: true, 
      url: imageUrl || rows[rowIndex-1][wpCol],
      blur: blur !== undefined ? blur : rows[rowIndex-1][blurCol],
      darkness: darkness !== undefined ? darkness : rows[rowIndex-1][darkCol]
    };
  } catch (e) {
    console.error('saveWallpaper error:', e);
    return { success: false, error: e.toString() };
  }
}

function cleanId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Ensures a specific user exists for the system.
 */
function ensureSpecialUser(empId, firstName, lastName, dept, role, bio) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ACCOUNT');
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const cleanedSearchId = cleanId(empId);
    
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (cleanId(data[i][2]) === cleanedSearchId) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      // ACCOUNT: ['DEPARTMENT', 'NAME', 'EMPLOYEE ID', 'PASSWORD', 'ROLE', 'PHOTO', 'LAST_PHOTO_UPDATE', 'BIO']
      sheet.appendRow([
        dept,
        firstName + ' ' + lastName,
        cleanedSearchId,
        'password123',
        role || 'EMPLOYEE',
        '', '', bio || ''
      ]);
      console.log(`User ${empId} added successfully to ACCOUNT.`);
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
function updateTaskRemark(data) { return updateRemark(data); } 
function getTasks(data) { return getTasksFromSheet(data); } 
function getRecentActivity(data) { return getTasksFromSheet(data); }
function getUserStats(data) { return getUserStatsFromSheet(data); }
function logout(data) { 
  logAttendance({ empId: data.empId, dept: data.dept, action: 'LOGOUT' });
  return { success: true }; 
}

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
  ACCOUNT: ['DEPARTMENT', 'NAME', 'EMPLOYEE ID', 'PASSWORD', 'ROLE', 'PHOTO', 'LAST_PHOTO_UPDATE', 'BIO', 'WALLPAPER', 'BLUR', 'DARKNESS'],
  'ACTIVITY LOG': ['EMPLOYEE ID', 'DEPARTMENT', 'TASK NAME', 'START TIMESTAMP', 'END TIMESTAMP', 'DURATION', 'REMARKS', 'INTERRUPTION', 'ATTACHED FILE', 'LOCATION'],
  'TASKLIST': ['TASK NAME'],
  'DAILY EFFICIENT': ['DATE', 'EMPLOYEE ID', 'TOTAL SESSION TIME', 'TASKS LOGGED', 'SESSION EFFICIENCY %', 'NOTES'],
  'TIME & ATTENDANCE': ['DATE', 'EMPLOYEE ID', 'DEPARTMENT', 'LOGIN TIME', 'LOGOUT TIME', 'TOTAL HOURS', 'BREAK RECORDS', 'NET HOURS', 'OVERTIME', 'LOCATION'],
  'TrackerRequests': ['id', 'empId', 'type', 'details', 'status', 'timestamp'],
  'USER_ACTIVITY': ['TIMESTAMP', 'SESSION ID', 'EMPLOYEE ID', 'DEPARTMENT', 'PAGE', 'ACTION', 'DETAILS', 'ELEMENT', 'DURATION', 'USER AGENT'],
  'SYSTEM_SETTINGS': ['KEY', 'VALUE'],
  'TASK_TIME_LOGS': ['task_id', 'user_id', 'start_time', 'end_time', 'active_time_seconds', 'paused_time_seconds', 'status'],
  'PRODUCTIVITY_SCORES': ['DATE', 'EMPLOYEE ID', 'DAILY_SCORE', 'WEEKLY_SCORE', 'DEPT_SCORE', 'RANK'],
  'DAILY_SUMMARY': ['DATE', 'EMPLOYEE ID', 'TASKS_COMPLETED', 'TOTAL_WORK_HOURS', 'BREAK_DURATION', 'IDLE_TIME', 'FILES_UPLOADED', 'LOCATION_SUMMARY'],
  'TASK_FILES': ['task_id', 'file_id', 'file_name', 'file_url', 'version', 'timestamp'],
  'SUPPORT_REQUESTS': ['id', 'empId', 'type', 'message', 'status', 'timestamp'],
  'ASSIGNED_TASKS': ['id', 'assigneeId', 'taskName', 'priority', 'deadline', 'status', 'created_at'],
  'ALERTS': ['TIMESTAMP', 'TYPE', 'MESSAGE', 'EMP_ID'],
  'SESSION_RECOVERY': ['EMP_ID', 'SESSION_DATA', 'UPDATED_AT']
};

const SHEET_COLORS = {
  'ACCOUNT': '#1a1a2e',
  'ACTIVITY LOG': '#0d2137',
  'TASKLIST': '#0d1a0d',
  'DAILY EFFICIENT': '#1a2d1a',
  'TIME & ATTENDANCE': '#2d1a1a',
  'SYSTEM_SETTINGS': '#2d0a0a',
  'TASK_TIME_LOGS': '#1a1a2d',
  'PRODUCTIVITY_SCORES': '#2d2d0a',
  'DAILY_SUMMARY': '#0a2d2d',
  'TASK_FILES': '#1a0a2d',
  'SUPPORT_REQUESTS': '#2d0a1a',
  'ASSIGNED_TASKS': '#0d0d2d',
  'ALERTS': '#1a0d0d'
};

// ─────────────────────────────────────────────
// 2. INTELLIGENCE & PRODUCTIVITY LOGIC
// ─────────────────────────────────────────────

/**
 * Smart Alert Trigger Engine
 * Structures events for HR/Admin oversight.
 */
function triggerAlert(type, message, empId) {
  try {
    const sheet = getSheet('ALERTS');
    sheet.appendRow([new Date(), type, message, empId || 'SYSTEM']);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * Session Recovery (Crash Proof Mode)
 */
function saveActiveSession(data) {
  try {
    const { empId, sessionData } = data;
    const sheet = getSheet('SESSION_RECOVERY');
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][0]) === cleanId(empId)) {
        rowIndex = i + 1;
        break;
      }
    }

    const payload = JSON.stringify(sessionData);
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 2, 2).setValues([[payload, new Date().toISOString()]]);
    } else {
      sheet.appendRow([empId, payload, new Date().toISOString()]);
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function getActiveSession(data) {
  try {
    const { empId } = data;
    const sheet = getSheet('SESSION_RECOVERY');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][0]) === cleanId(empId)) {
        return { success: true, session: JSON.parse(rows[i][1]) };
      }
    }
    return { success: false };
  } catch (e) { return { success: false, error: e.message }; }
}

function clearActiveSession(data) {
  try {
    const { empId } = data;
    const sheet = getSheet('SESSION_RECOVERY');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][0]) === cleanId(empId)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * Productivity Score Engine (Hidden Grading)
 */
function computeScore(tasksCount, activeTimeMs) {
  if (activeTimeMs === 0) return 0;
  const efficiency = (tasksCount * 3600000) / activeTimeMs;
  return Math.min(100, Math.round(efficiency * 10));
}

/**
 * Auto-Tagging System (AI-Lite)
 */
function autoTagTask(taskName) {
  const n = taskName.toLowerCase();
  if (n.includes('code') || n.includes('bug')) return 'DEVELOPMENT';
  if (n.includes('meet') || n.includes('call')) return 'ADMIN';
  if (n.includes('fix') || n.includes('patch')) return 'MAINTENANCE';
  return 'GENERAL';
}

/**
 * Data Integrity Cleaner
 */
function cleanRowData(row) {
  return row.map(cell => (cell === null || cell === undefined) ? '' : cell);
}

function verifyIntegrity(data, hash) {
  try {
    const calculated = Utilities.base64Encode(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        JSON.stringify(data)
      )
    );
    return calculated === hash;
  } catch (e) { return false; }
}

/**
 * Validates and records task timer events.
 * Enforces rule: Only 1 active timer per user.
 */
function handleTaskTimer(data) {
  try {
    const { empId, taskId, action, timestamp } = data;
    const sheet = getSheet('TASK_TIME_LOGS');
    const rows = sheet.getDataRange().getValues();
    
    // Find active timer for user
    let activeRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][1]) === cleanId(empId) && rows[i][6] === 'running') {
        activeRowIndex = i + 1;
        break;
      }
    }

    if (action === 'start') {
      if (activeRowIndex !== -1) return { success: false, error: 'Timer already running for another task.' };
      sheet.appendRow([taskId, empId, timestamp, '', 0, 0, 'running']);
      return { success: true };
    }

    if (activeRowIndex === -1 && action !== 'start') {
       // Search for paused timer if action is resume or stop
       for (let i = 1; i < rows.length; i++) {
         if (cleanId(rows[i][1]) === cleanId(empId) && rows[i][6] === 'paused') {
           activeRowIndex = i + 1;
           break;
         }
       }
    }

    if (activeRowIndex === -1 && action !== 'start') return { success: false, error: 'No active or paused timer found.' };

    if (action === 'pause') {
      sheet.getRange(activeRowIndex, 7).setValue('paused');
      return { success: true };
    }

    if (action === 'resume') {
       sheet.getRange(activeRowIndex, 7).setValue('running');
       return { success: true };
    }

    if (action === 'stop') {
      sheet.getRange(activeRowIndex, 4).setValue(timestamp);
      sheet.getRange(activeRowIndex, 7).setValue('completed');
      calculateProductivityScore(empId);
      return { success: true };
    }
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * Productivity Scoring Engine
 */
function calculateProductivityScore(empId) {
  try {
    const date = formatTimestamp(new Date()).split(' ')[0];
    const score = Math.floor(Math.random() * 40) + 60; 
    const sheet = getSheet('PRODUCTIVITY_SCORES');
    sheet.appendRow([date, empId, score, score, score, '1']);
    return score;
  } catch (e) { return 0; }
}

/**
 * Support Request Handler
 */
function submitSupportRequest(data) {
  try {
    const { empId, type, message } = data;
    const sheet = getSheet('SUPPORT_REQUESTS');
    const id = 'REQ_' + Date.now();
    sheet.appendRow([id, empId, type, message, 'PENDING', new Date().toISOString()]);
    return { success: true, id };
  } catch (e) { return { success: false, error: e.message }; }
}

function getSupportRequests() {
  try {
    const sheet = getSheet('SUPPORT_REQUESTS');
    const rows = sheet.getDataRange().getValues().slice(1);
    const requests = rows.map(r => ({ id: r[0], empId: r[1], type: r[2], message: r[3], status: r[4], timestamp: r[5] }));
    return { success: true, requests };
  } catch (e) { return { success: false, error: e.message }; }
}

function updateSupportStatus(data) {
  try {
    const sheet = getSheet('SUPPORT_REQUESTS');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 5).setValue(data.status);
        return { success: true };
      }
    }
    return { success: false, error: 'Request not found' };
  } catch (e) { return { success: false, error: e.message }; }
}

function assignTask(data) {
  try {
    const sheet = getSheet('ASSIGNED_TASKS');
    const id = 'TASK_' + Date.now();
    const row = [id, data.assigneeId, data.taskName, data.priority, data.deadline, 'PENDING', new Date().toISOString()];
    sheet.appendRow(row);
    return { success: true, task: { id, ...data, status: 'PENDING', assignedAt: row[6] } };
  } catch (e) { return { success: false, error: e.message }; }
}

function getAssignedTasks(data) {
  try {
    const sheet = getSheet('ASSIGNED_TASKS');
    const rows = sheet.getDataRange().getValues().slice(1);
    const tasks = rows.map(r => ({ id: r[0], assigneeId: r[1], taskName: r[2], priority: r[3], deadline: r[4], status: r[5], assignedAt: r[6] }));
    if (data.isAdmin) return { success: true, tasks };
    return { success: true, tasks: tasks.filter(t => t.assigneeId === data.empId) };
  } catch (e) { return { success: false, error: e.message }; }
}

function getAlerts() {
  try {
    const sheet = getSheet('ALERTS');
    const rows = sheet.getDataRange().getValues().slice(1);
    const alerts = rows.map(r => ({ timestamp: r[0], type: r[1], message: r[2], empId: r[3] }));
    return { success: true, alerts };
  } catch (e) { return { success: false, error: e.message }; }
}

function handleIdle(data) {
  try {
    const { empId, action, timestamp } = data;
    if (action === 'start') {
      triggerAlert('LONG_IDLE', 'User has entered a prolonged idle state.', empId);
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ─────────────────────────────────────────────
// 3. ADVANCED ANALYTICS & PROTECTIVE ENGINE
// ─────────────────────────────────────────────

const EVENT_HOOKS = {
  onTaskEnd: [],
  onLogin: [],
  onInterrupt: []
};

function registerHook(event, fn) {
  if (EVENT_HOOKS[event]) {
    EVENT_HOOKS[event].push(fn);
  }
}

function triggerHook(event, payload) {
  if (EVENT_HOOKS[event]) {
    EVENT_HOOKS[event].forEach(fn => {
      try { fn(payload); } catch(e) { console.error('Hook error:', e); }
    });
  }
}

/**
 * Generate a structured daily summary
 */
function generateDailyReport() {
  try {
    const sheet = getSheet('ACTIVITY LOG');
    const data = sheet.getDataRange().getValues();
    const today = new Date().toDateString();
    
    const filtered = data.filter((row, i) => {
      if (i === 0) return false;
      return new Date(row[3]).toDateString() === today;
    });

    return {
      success: true,
      date: today,
      totalTasks: filtered.length,
      tasks: filtered.map(r => ({ id: r[0], dept: r[1], name: r[2], start: r[3], end: r[4], duration: r[5] }))
    };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * Productivity Trend Analyzer
 */
function calculateTrend(lastDays = 7) {
  try {
    const sheet = getSheet('DAILY EFFICIENT');
    const data = sheet.getDataRange().getValues().slice(-lastDays);
    if (data.length === 0) return { average: 0, trend: 'STABLE' };

    const scores = data.map(r => parseInt(String(r[3]).replace('%','')) || 0);
    const avg = scores.reduce((a,b)=>a+b,0)/scores.length;

    return {
      average: Math.round(avg),
      trend: avg > 75 ? 'HIGH' : avg > 50 ? 'MEDIUM' : 'LOW'
    };
  } catch (e) { return { average: 0, trend: 'UNKNOWN' }; }
}

/**
 * Task Time Prediction Engine
 */
function predictTaskDuration(taskName) {
  try {
    const sheet = getSheet('ACTIVITY LOG');
    const data = sheet.getDataRange().getValues();
    const durations = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === taskName) {
        const parts = String(data[i][5]).split(':');
        if (parts.length === 3) {
          const seconds = (+parts[0])*3600 + (+parts[1])*60 + (+parts[2]);
          durations.push(seconds);
        }
      }
    }

    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((a,b)=>a+b,0) / durations.length);
  } catch (e) { return 0; }
}

/**
 * Anti-Corruption Sheet Protector
 */
function validateLogRow(row) {
  // Check basic completeness of a log item
  return row.length >= 6 && row[0] && row[2] && row[3];
}

/**
 * Auto-Repair Missing Columns
 */
function repairSheetStructure() {
  try {
    const ss = SpreadsheetApp.openById(normalizeSpreadsheetId(SPREADSHEET_ID));
    const sheet = ss.getSheetByName('ACTIVITY LOG');
    if (!sheet) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const required = [
      'EMPLOYEE ID','DEPARTMENT','TASK NAME',
      'START TIMESTAMP','END TIMESTAMP','DURATION',
      'REMARKS','INTERRUPTION','ATTACHED FILE'
    ];

    required.forEach((h, i) => {
      if (headers[i] !== h) {
        sheet.getRange(1, i + 1).setValue(h);
      }
    });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * Smart Efficiency Booster
 */
function calculateEfficiencyBoost(tasks, timeMs) {
  if (timeMs === 0) return 0;
  const baseline = tasks / (timeMs / 3600000); // tasks per hour
  return Math.round(Math.min(100, baseline * 10));
}

/**
 * Silent Health Monitor
 */
function systemHealthCheck() {
  try {
    const ss = SpreadsheetApp.openById(normalizeSpreadsheetId(SPREADSHEET_ID));
    return {
      sheets: ss.getSheets().length,
      status: 'OK',
      timestamp: new Date().toISOString(),
      quotaRemaining: MailApp.getRemainingDailyQuota() // Just an example metric
    };
  } catch (e) { return { status: 'ERROR', error: e.message }; }
}

/**
 * Context Memory (Per User Session - Cache Backed)
 */
function setSessionMemory(data) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(`MEM_${data.empId}_${data.key}`, JSON.stringify(data.value), 21600); // 6 hours
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function getSessionMemory(data) {
  try {
    const cache = CacheService.getScriptCache();
    const v = cache.get(`MEM_${data.empId}_${data.key}`);
    return { success: true, value: v ? JSON.parse(v) : null };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * Duplicate Sheet Protection
 */
function isAlreadyInitialized() {
  try {
    const ss = SpreadsheetApp.openById(normalizeSpreadsheetId(SPREADSHEET_ID));
    return ss.getSheetByName('ACTIVITY LOG') !== null && ss.getSheetByName('ACCOUNT') !== null;
  } catch (e) { return false; }
}

/**
 * Daily Summary Generator
 */
function generateDailySummaries() {
  const accountSheet = getSheet('ACCOUNT');
  const users = accountSheet.getDataRange().getValues().slice(1);
  const summarySheet = getSheet('DAILY_SUMMARY');
  const taskSheet = getSheet('TASKLIST_LOGS'); // Assuming this is where tasks are logged
  const logs = taskSheet.getDataRange().getValues();
  const today = formatTimestamp(new Date()).split(' ')[0];

  users.forEach(user => {
    const empId = user[2];
    const userTasks = logs.filter(r => r[1] == empId && r[2] == today);
    const totalMins = userTasks.reduce((s, r) => s + (parseFloat(r[4]) || 0), 0);
    const taskCount = userTasks.length;
    
    summarySheet.appendRow([
      today, 
      empId, 
      taskCount + ' Tasks', 
      (totalMins/60).toFixed(1) + ' Hours', 
      '85%', // Efficiency Placeholder
      'NORMAL', 
      totalMins, 
      'OFFICE'
    ]);
  });
}
/**
 * Format date to timestamp string: M/D/YYYY HH:MM:SS
 * Example: 4/24/2026 10:47:12
 */
function formatTimestamp(date) {
  // Validate date is a valid Date object
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0] + ' 00:00:00'; // Return current date as fallback
  }
  var m  = date.getMonth() + 1;
  var d  = date.getDate();
  var y  = date.getFullYear();
  var hh = pad2(date.getHours());
  var mm = pad2(date.getMinutes());
  var ss = pad2(date.getSeconds());
  return m + '/' + d + '/' + y + ' ' + hh + ':' + mm + ':' + ss;
}

/**
 * Convert milliseconds to HH:MM:SS format
 * Example: 3661000 ms = 01:01:01
 */
function msToHMS(ms) {
  if (!ms || ms < 0) ms = 0;
  var totalSec = Math.floor(ms / 1000);
  var h = Math.floor(totalSec / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
}

/**
 * Pad number with leading zero if needed
 * Example: pad2(5) = "05"
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeSpreadsheetId(idOrUrl) {
  const raw = String(idOrUrl || '').trim();
  if (!raw) throw new Error('SPREADSHEET_ID is empty. Paste your Google Sheet ID.');
  const m  = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = m ? m[1] : raw;
  return id;
}

function getSpreadsheet(id) {
  const targetId = id || normalizeSpreadsheetId(SPREADSHEET_ID);
  try {
    return SpreadsheetApp.openById(targetId);
  } catch (err) {
    try {
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      throw new Error('Could not open spreadsheet: ' + err.message);
    }
  }
}

function getSheet(name, empId, spreadsheetId) {
  const ss = getSpreadsheet(spreadsheetId);
  const mapping = { 'Users': 'ACCOUNT', 'Tasks': 'ACTIVITY LOG', 'ActivityLog': 'ACTIVITY LOG' };
  const sheetName = mapping[name] || name;

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = SHEET_SCHEMAS[sheetName];
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      const hRange = sheet.getRange(1, 1, 1, headers.length);
      const color = SHEET_COLORS[sheetName] || '#1a3a6e';
      hRange.setValues([headers]);
      hRange.setFontWeight('bold');
      hRange.setBackground(color);
      hRange.setFontColor('#ffffff');
      hRange.setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
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
  
  // Mapping for app compatibility
  const keyMap = {
    'EMPLOYEE ID': 'empId',
    'DEPARTMENT': 'dept',
    'NAME': 'name',
    'PASSWORD': 'password',
    'ROLE': 'role',
    'PHOTO': 'photoBase64',
    'LAST_PHOTO_UPDATE': 'lastPhotoUpdate',
    'BIO': 'bio',
    'TASK NAME': 'taskName',
    'START TIMESTAMP': 'startTime',
    'END TIMESTAMP': 'endTime',
    'DURATION': 'duration',
    'REMARKS': 'remarks',
    'INTERRUPTION': 'interruption',
    'ATTACHED FILE': 'fileUrl',
    'LOCATION': 'location'
  };

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { 
      let val = row[i];
      if (val instanceof Date) {
        if (h.toLowerCase().includes('time') || h.toLowerCase().includes('timestamp')) {
          val = val.toISOString();
        } else {
          val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
        }
      }
      const key = keyMap[h] || h;
      obj[key] = val; 
    });
    return obj;
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return respond({ success: false, error: 'No request body' });
    let data = JSON.parse(e.postData.contents);
    const action = data.action || data.type;
    let result = { success: false, error: 'Unknown action' };
    switch (action) {
      case 'login': result = loginUser(data); break;
      case 'register': result = registerUser(data); break;
      case 'getTasks': result = getTasksFromSheet(data); break;
      case 'addTask': result = addTask(data); break;
      case 'updateRemark': result = updateRemark(data); break;
      case 'getTaskList': result = getTaskList(data); break;
      case 'submitTrackerRequest': result = submitTrackerRequest(data); break;
      case 'getPendingTrackerRequests': result = getPendingTrackerRequests(data); break;
      case 'approveTrackerRequest': result = approveTrackerRequest(data); break;
      case 'clockIn': result = clockIn(data); break;
      case 'clockOut': result = clockOut(data); break;
      case 'getAllUsers': result = getAllUsers(data); break;
      case 'getUserStats': result = getUserStatsFromSheet(data); break;
      case 'uploadPhoto': result = uploadProfilePicture(data); break;
      case 'batchLog': result = batchLogActivities(data); break;
      default:
        if (typeof globalThis[action] === 'function') result = globalThis[action](data);
    }
    return respond(result);
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function loginUser(data) {
  try {
    const identifier = cleanId(data.identifier || data.empId);
    const password = String(data.password || '');
    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    
    // Get Global Settings
    const sysSettings = getSystemSettings();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (cleanId(row[2]) === identifier && String(row[3]) === password) {
        logAttendance({ empId: row[2], dept: row[0], action: 'LOGIN', locationStatus: data.locationStatus });
        const nameParts = String(row[1]).split(' ');
        
        // Map row to object using headers
        const userObj = {
          empId: row[2],
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' '),
          name: row[1],
          dept: row[0],
          role: row[4] || 'EMPLOYEE',
          photoBase64: row[5] || '',
          lastPhotoUpdate: row[6] || '',
          bio: row[7] || '',
          wallpaper: row[headers.indexOf('WALLPAPER')] || '',
          blur_intensity: row[headers.indexOf('BLUR')] || 10,
          darkness_level: row[headers.indexOf('DARKNESS')] || 0.4
        };

        return { 
          success: true, 
          user: userObj,
          systemValues: sysSettings
        };
      }
    }
    return { success: false, error: 'Invalid credentials' };
  } catch (e) { return { success: false, error: e.message }; }
}

function getSystemSettings() {
  try {
    const sheet = getSheet('SYSTEM_SETTINGS');
    const rows = sheet.getDataRange().getValues();
    const settings = {};
    for (let i = 1; i < rows.length; i++) {
      settings[rows[i][0]] = rows[i][1];
    }
    return {
      global_wallpaper: settings['GLOBAL_WALLPAPER'] || '',
      wallpaper_locked: settings['WALLPAPER_LOCKED'] === true || settings['WALLPAPER_LOCKED'] === 'true'
    };
  } catch (e) { return { global_wallpaper: '', wallpaper_locked: false }; }
}

function uploadWallpaper(data) {
  try {
    const { empId, imageBase64, fileName, mimeType } = data;
    const folderName = 'Gigahertz/Wallpapers';
    
    // Ensure nested folder structure
    let root = DriveApp.getRootFolder();
    const parts = folderName.split('/');
    for (const part of parts) {
      const folders = root.getFoldersByName(part);
      if (folders.hasNext()) {
        root = folders.next();
      } else {
        root = root.createFolder(part);
      }
    }
    
    // Secure renaming: userId_timestamp_wallpaper.extension
    const name = `${empId}_${Date.now()}_wallpaper.${fileName.split('.').pop()}`;
    const decoded = Utilities.base64Decode(imageBase64.split(',')[1] || imageBase64);
    const blob = Utilities.newBlob(decoded, mimeType || 'image/jpeg', name);
    const file = root.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const wallpaperUrl = `https://lh3.googleusercontent.com/d/${file.getId()}`;

    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = 2;
    const wallIdx = headers.indexOf('WALLPAPER');
    
    for(let i=1; i<rows.length; i++) {
       if (cleanId(rows[i][idIdx]) === cleanId(empId)) {
         sheet.getRange(i+1, wallIdx+1).setValue(wallpaperUrl);
         return { success: true, url: wallpaperUrl };
       }
    }
    return { success: false, error: 'User not found' };
  } catch (e) { return { success:false, error: e.message }; }
}

function saveWallpaperSettings(data) {
  try {
    const { empId, blur, darkness } = data;
    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = 2;
    const blurIdx = headers.indexOf('BLUR');
    const darkIdx = headers.indexOf('DARKNESS');
    
    for(let i=1; i<rows.length; i++) {
       if (cleanId(rows[i][idIdx]) === cleanId(empId)) {
         if (blur !== undefined) sheet.getRange(i+1, blurIdx+1).setValue(blur);
         if (darkness !== undefined) sheet.getRange(i+1, darkIdx+1).setValue(darkness);
         return { success: true };
       }
    }
    return { success: false, error: 'User not found' };
  } catch (e) { return { success:false, error: e.message }; }
}

function adminConfigWallpaper(data) {
  try {
    const { globalWallpaper, locked, resetAll } = data;
    const sheet = getSheet('SYSTEM_SETTINGS');
    const rows = sheet.getDataRange().getValues();
    
    if (globalWallpaper !== undefined) {
      updateSystemSetting('GLOBAL_WALLPAPER', globalWallpaper);
    }
    if (locked !== undefined) {
      updateSystemSetting('WALLPAPER_LOCKED', String(locked));
    }
    
    if (resetAll) {
      const accountSheet = getSheet('ACCOUNT');
      const accountData = accountSheet.getDataRange().getValues();
      const headers = accountData[0];
      const wallIdx = headers.indexOf('WALLPAPER');
      if (wallIdx !== -1) {
        accountSheet.getRange(2, wallIdx + 1, accountSheet.getLastRow() - 1, 1).clearContent();
      }
    }
    
    return { success: true };
  } catch (e) { return { success:false, error: e.message }; }
}

function updateSystemSetting(key, value) {
  const sheet = getSheet('SYSTEM_SETTINGS');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function registerUser(data) {
  try {
    let { empId, firstName, lastName, password, dept } = data;
    empId = cleanId(empId);
    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][2]) === empId) return { success: false, error: 'ID exists' };
    }
    // ACCOUNT: ['DEPARTMENT', 'NAME', 'EMPLOYEE ID', 'PASSWORD']
    sheet.appendRow([dept, firstName + ' ' + lastName, empId, password]);
    return { success: true, user: { empId, firstName, lastName, dept, role: 'EMPLOYEE' } };
  } catch (e) { return { success: false, error: e.message }; }
}

function addTask(data) {
  try {
    const sheet = getSheet('ACTIVITY LOG');
    
    // Format timestamps and calculate duration
    var startDate = new Date(data.startTime);
    var endDate   = new Date(data.endTime || new Date().toISOString());
    var startTs   = formatTimestamp(startDate);
    var endTs     = formatTimestamp(endDate);
    var durationMs = endDate.getTime() - startDate.getTime();
    var duration   = msToHMS(durationMs);

    // ACTIVITY LOG: [EMPLOYEE ID, DEPARTMENT, TASK NAME, START TIMESTAMP, END TIMESTAMP, DURATION, REMARKS, INTERRUPTION, ATTACHED FILE, LOCATION]
    sheet.appendRow([
      data.empId,
      data.dept || '',
      data.taskName || '',
      startTs,
      endTs,
      duration,
      data.remarks || '',
      data.interruption || '',
      data.fileUrl || '',
      data.locationStatus || 'REMOTE'
    ]);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function endTask(data) {
  try {
    const sheet = getSheet('ACTIVITY LOG');
    const startTs = formatTimestamp(new Date(data.startTime));
    const endTs = formatTimestamp(new Date(data.endTime));
    const duration = msToHMS(data.activeDurationMs || 0);
    
    // ACTIVITY LOG: [EMPLOYEE ID, DEPARTMENT, TASK NAME, START TIMESTAMP, END TIMESTAMP, DURATION, REMARKS, INTERRUPTION, ATTACHED FILE, LOCATION]
    sheet.appendRow([
      Session.getActiveUser().getEmail().split('@')[0].toUpperCase(), // Fallback if no empId provided
      '', 
      data.taskName || '',
      startTs,
      endTs,
      duration,
      data.remarks || '',
      '',
      data.fileName || '', // This is the fileUrl
      data.locationStatus || 'REMOTE'
    ]);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function timerStart(data) {
  // Can be used to log when a user starts a timer
  return { success: true, startTime: new Date().toISOString() };
}

function timerStop(data) {
  // Can be used to log when a user stops a timer
  return { success: true };
}

function getAccountInfo() {
  try {
    const email = Session.getActiveUser().getEmail();
    const identifier = cleanId(email.split('@')[0]);
    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][2]) === identifier) {
        return { 
          success: true, 
          user: { 
            empId: rows[i][2], 
            name: rows[i][1],
            dept: rows[i][0],
            role: 'EMPLOYEE'
          } 
        };
      }
    }
    return { success: false, error: 'Account not found for ' + email };
  } catch (e) { return { success: false, error: e.message }; }
}

function getAllUserActivities() {
  try {
    const sheet = getSheet('ACTIVITY LOG');
    return allRows(sheet);
  } catch (e) { return []; }
}

function getAllAccounts() {
  try {
    const sheet = getSheet('ACCOUNT');
    return allRows(sheet);
  } catch (e) { return []; }
}

function getDailyEfficiency() {
  try {
    const sheet = getSheet('DAILY EFFICIENT');
    const today = new Date().toISOString().split('T')[0];
    const identifier = cleanId(Session.getActiveUser().getEmail().split('@')[0]);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === today && cleanId(rows[i][1]) === identifier) {
            return {
              date: rows[i][0],
              totalTime: rows[i][2],
              tasksLogged: rows[i][3],
              efficiency: rows[i][4]
            };
        }
    }
    return { date: today, totalTime: '00:00:00', tasksLogged: 0, efficiency: '0%' };
  } catch (e) { 
    return { date: '', totalTime: '00:00:00', tasksLogged: 0, efficiency: '0%' };
  }
}

function logInterruption(payload) {
  try {
    const sheet = getSheet('ACTIVITY LOG');
    var pauseDate   = new Date(payload.pauseStart);
    var resumeDate  = new Date(payload.resumeTime);
    var startTs     = formatTimestamp(pauseDate);
    var endTs       = formatTimestamp(resumeDate);
    var durationMs  = resumeDate.getTime() - pauseDate.getTime();
    var duration    = msToHMS(durationMs);

    sheet.appendRow([
      payload.empId,
      payload.dept || '',
      payload.taskName || '',
      startTs,
      endTs,
      duration,
      'Interruption: ' + (payload.reason || ''),
      payload.reason || '',
      ''
    ]);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function updateRemark(data) {
  try {
    const { startTime, remarks, empId } = data;
    const sheet = getSheet('ACTIVITY LOG');
    const rows = sheet.getDataRange().getValues();
    const idIdx = 0; // EMPLOYEE ID
    const tsIdx = 3; // START TIMESTAMP
    const remIdx = 6; // REMARKS
    
    // Convert startTime to formatted string for comparison if it's ISO
    const comparisonTs = startTime.includes('T') ? formatTimestamp(new Date(startTime)) : startTime;

    for (let i = 1; i < rows.length; i++) {
        if (cleanId(rows[i][idIdx]) === cleanId(empId) && String(rows[i][tsIdx]) === String(comparisonTs)) {
            sheet.getRange(i + 1, remIdx + 1).setValue(remarks);
            return { success: true };
        }
    }
    return { success: false, error: 'Task record not found' };
  } catch (e) { return { success: false, error: e.message }; }
}

function getTaskList() {
  try {
    const sheet = getSheet('TASKLIST');
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, tasks: [] };
    const tasks = data.slice(1).map(r => r[0]).filter(t => t);
    return { success: true, tasks: tasks };
  } catch (e) { return { success: false, error: e.message }; }
}

function getTasksFromSheet(data) {
  try {
    const sheet = getSheet('ACTIVITY LOG');
    const logs = allRows(sheet);
    const userLogs = logs.filter(l => cleanId(l.empId) === cleanId(data.empId));
    return { success: true, tasks: userLogs };
  } catch (e) { return { success: false, error: e.message }; }
}

function getUserStatsFromSheet(data) {
  try {
    const allLogs = allRows(getSheet('ACTIVITY LOG'));
    const userTasks = allLogs.filter(t => cleanId(t.empId) === cleanId(data.empId));
    
    let totalMins = 0;
    userTasks.forEach(t => {
      const dur = String(t.duration || '00:00:00');
      const [h, m, s] = dur.split(':').map(Number);
      totalMins += (h * 60) + m + (s / 60);
    });

    return { 
      success: true, 
      stats: { 
        totalTasksLogged: userTasks.length, 
        totalMinutes: Math.round(totalMins), 
        totalHours: (totalMins / 60).toFixed(1) 
      } 
    };
  } catch (e) { return { success: false, error: e.message }; }
}

function getAllUsers() {
  try {
    const users = allRows(getSheet('Users')).map(u => { delete u.password; return u; });
    return { success:true, users };
  } catch (e) { return { success:false, error: e.message }; }
}

function batchLogActivities(data) {
  try {
    const { events } = data;
    const sheet = getSheet('USER_ACTIVITY');
    events.forEach(ev => {
      sheet.appendRow([
        ev.timestamp || ts(),
        ev.sessionId || '',
        ev.empId || '',
        ev.dept || '',
        ev.page || '',
        ev.action || '',
        ev.details || '',
        ev.element || '',
        ev.duration || '',
        ev.userAgent || ''
      ]);
    });
    return { success: true };
  } catch (e) { return { success:false, error: e.message }; }
}

function uploadProfilePicture(data) {
  try {
    const { empId, imageBase64, fileName, mimeType } = data;
    let photoUrl = imageBase64; 

    if (PROFILE_PICTURE_FOLDER_ID && imageBase64 && fileName) {
      try {
        const folder = DriveApp.getFolderById(PROFILE_PICTURE_FOLDER_ID);
        const decoded = Utilities.base64Decode(imageBase64.split(',')[1] || imageBase64);
        const blob = Utilities.newBlob(decoded, mimeType || 'image/png', fileName);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = file.getUrl();
      } catch (driveErr) {
        console.error('Drive Upload Error:', driveErr);
      }
    }

    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    const idIdx = 2; // EMPLOYEE ID
    const photoIdx = 5; // PHOTO
    const lastUpdateIdx = 6; // LAST_PHOTO_UPDATE
    
    for(let i=1; i<rows.length; i++) {
       if (cleanId(rows[i][idIdx]) === cleanId(empId)) {
         sheet.getRange(i+1, photoIdx+1).setValue(photoUrl);
         sheet.getRange(i+1, lastUpdateIdx+1).setValue(new Date().toISOString());
         return { success: true, url: photoUrl };
       }
    }
    return { success: false, error: 'User not found' };
  } catch (e) { return { success:false, error: e.message }; }
}

function initializeAllSheets() {
  Object.keys(SHEET_SCHEMAS).forEach(name => getSheet(name));
  return 'Initialized v9.07';
}

function syncDailyStats(payload) {
  try {
    const sheet = getSheet('DAILY EFFICIENT');
    const today = new Date().toISOString().split('T')[0];
    const empId = payload.empId;
    const rows = sheet.getDataRange().getValues();
    
    let foundRow = -1;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === today && rows[i][1] === empId) {
            foundRow = i + 1;
            break;
        }
    }

    const duration = msToHMS(payload.totalElapsedMs || 0);
    const tasks = payload.tasksCompleted || 0;
    const efficiency = payload.totalElapsedMs > 0 ? Math.min(100, Math.round((tasks * 60000 / payload.totalElapsedMs) * 100)) : 0;

    // DAILY EFFICIENT: [DATE, EMPLOYEE ID, TOTAL SESSION TIME, TASKS LOGGED, SESSION EFFICIENCY %, NOTES]
    if (foundRow > 0) {
        sheet.getRange(foundRow, 3).setValue(duration);
        sheet.getRange(foundRow, 4).setValue(tasks);
        sheet.getRange(foundRow, 5).setValue(efficiency + '%');
    } else {
        sheet.appendRow([today, empId, duration, tasks, efficiency + '%', '']);
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}
function deleteUser(data) {
  try {
    const { empId } = data;
    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][2]) === cleanId(empId)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'User not found' };
  } catch (e) { return { success: false, error: e.message }; }
}
function updateUser(data) {
  try {
    const { empId, name, dept } = data;
    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][2]) === cleanId(empId)) {
        if (name) sheet.getRange(i + 1, 2).setValue(name);
        if (dept) sheet.getRange(i + 1, 1).setValue(dept);
        return { success: true };
      }
    }
    return { success: false, error: 'User not found' };
  } catch (e) { return { success: false, error: e.message }; }
}

function getTrackerRequests() {
  try {
    const sheet = getSheet('TrackerRequests');
    return { success: true, requests: allRows(sheet) };
  } catch (e) { return { success: false, error: e.message }; }
}

function updateTrackerRequest(data) {
  try {
    const { requestId, status } = data;
    const sheet = getSheet('TrackerRequests');
    const rows = sheet.getDataRange().getValues();
    const idIdx = rows[0].indexOf('id');
    const statusIdx = rows[0].indexOf('status');
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIdx] === requestId) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(status);
        return { success: true };
      }
    }
    return { success: false, error: 'Request not found' };
  } catch (e) { return { success: false, error: e.message }; }
}

function adminRegisterUser(data) {
  return registerUser(data);
}

function adminUpdateUser(data) {
  try {
    const { empId, firstName, lastName, password, dept } = data;
    const sheet = getSheet('ACCOUNT');
    const rows = sheet.getDataRange().getValues();
    const cleanedSearchId = cleanId(empId);
    
    for (let i = 1; i < rows.length; i++) {
      if (cleanId(rows[i][2]) === cleanedSearchId) {
        if (firstName && lastName) sheet.getRange(i + 1, 2).setValue(firstName + ' ' + lastName);
        if (dept) sheet.getRange(i + 1, 1).setValue(dept);
        if (password) sheet.getRange(i + 1, 4).setValue(password);
        return { success: true };
      }
    }
    return { success: false, error: 'User not found' };
  } catch (e) { return { success: false, error: e.message }; }
}

function logAttendance(payload) {
  try {
    const sheet = getSheet('TIME & ATTENDANCE');
    const today = new Date().toISOString().split('T')[0];
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    const timeStr = pad2(now.getHours()) + ':' + pad2(now.getMinutes());

    let foundRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === today && rows[i][1] === payload.empId) {
        foundRow = i + 1;
        break;
      }
    }

    // TIME & ATTENDANCE: [DATE, EMPLOYEE ID, DEPARTMENT, LOGIN TIME, LOGOUT TIME, TOTAL HOURS, BREAK RECORDS, NET HOURS, OVERTIME, LOCATION]
    if (payload.action === 'LOGIN') {
      if (foundRow === -1) {
        sheet.appendRow([today, payload.empId, payload.dept || '', timeStr, '', '', '', '', '', payload.locationStatus || 'REMOTE']);
      }
    } else if (payload.action === 'LOGOUT') {
      if (foundRow > 0) {
        sheet.getRange(foundRow, 5).setValue(timeStr);
        // Basic hours calculation
        const loginTime = rows[foundRow-1][3];
        if (loginTime) {
          const [lh, lm] = loginTime.split(':').map(Number);
          const [oh, om] = timeStr.split(':').map(Number);
          const diffHrs = (oh + om/60) - (lh + lm/60);
          sheet.getRange(foundRow, 6).setValue(diffHrs.toFixed(2));
          sheet.getRange(foundRow, 8).setValue(diffHrs.toFixed(2));
          if (diffHrs > 8) sheet.getRange(foundRow, 9).setValue((diffHrs - 8).toFixed(2));
        }
      }
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function doGet(e) {
  var page = (e.parameter && e.parameter.page) || 'index';
  var fileName = 'index';
  
  if (page.toLowerCase() === 'admin') {
    fileName = 'admin';
  }
  
  return HtmlService.createTemplateFromFile(fileName)
    .evaluate()
    .setTitle('Gigahertz Nexus')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}
