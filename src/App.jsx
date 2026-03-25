import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ══ CONFIG ══
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnS3-Mf2Qbp481UszTmwbHYvxakDlpl3AbXr5pHNLnIcMRbDpVqsw7b4bNtLWLVT_u/exec';
const USE_LOCAL = APPS_SCRIPT_URL === 'https://script.google.com/macros/s/AKfycbwnS3-Mf2Qbp481UszTmwbHYvxakDlpl3AbXr5pHNLnIcMRbDpVqsw7b4bNtLWLVT_u/exec';

const DEPARTMENTS = ['AUDIT', 'AMS', 'ACCOUNTING', 'HR', 'MARKETING', 'PROCESS IMPROVEMENT', 'SALES AND SERVICE SUPPORT', 'ONLINE SALES', 'RMA', 'PRODUCT DEPARTMENT', 'FACILITIES', 'WAREHOUSE'];
const DEPT_TASKS = {
  'AUDIT': ['Internal Audit Report', 'Risk Assessment', 'Compliance Review', 'Control Testing', 'Document Verification'],
  'AMS': ['Account Management Review', 'Client Check-in Call', 'Service Level Review', 'Account Renewal Processing', 'Client Issue Resolution'],
  'ACCOUNTING': ['Invoice Processing', 'Bank Reconciliation', 'Financial Statement Preparation', 'Tax Filing', 'Payroll Processing'],
  'HR': ['Recruitment Screening', 'Onboarding Session', 'Performance Evaluation', 'Training Coordination', 'Policy Update'],
  'MARKETING': ['Campaign Planning', 'Social Media Management', 'Content Creation', 'Market Research', 'Brand Collateral Design'],
  'PROCESS IMPROVEMENT': ['Process Mapping', 'Gap Analysis', 'KPI Monitoring', 'SOP Development', 'Workflow Optimization'],
  'SALES AND SERVICE SUPPORT': ['Customer Support Call', 'Lead Follow-up', 'CRM Data Entry', 'Proposal Writing', 'After-Sales Check'],
  'ONLINE SALES': ['Product Listing Update', 'Order Processing', 'Customer Inquiry Response', 'Sales Report', 'Return Coordination'],
  'RMA': ['Return Request Processing', 'Quality Inspection', 'Repair Assessment', 'Replacement Coordination', 'RMA Documentation'],
  'PRODUCT DEPARTMENT': ['Product Testing', 'Spec Sheet Review', 'Quality Assurance Check', 'Product Documentation', 'Feature Analysis'],
  'FACILITIES': ['Facility Inspection', 'Maintenance Coordination', 'Asset Inventory', 'Safety Compliance Check', 'Vendor Management'],
  'WAREHOUSE': ['Inventory Count', 'Stock Receiving', 'Order Packing', 'Delivery Coordination', 'Warehouse Audit'],
};
const PRESET = ['Admin Tasks', 'Client Call', 'Code Review', 'Documentation', 'Meeting', 'Planning & Strategy', 'Research', 'Testing', 'Training / Learning'];
const COLORS = ['#1a3af5', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#db2777', '#65a30d'];

// ══ HOLIDAY SYSTEM ══
const HOLIDAYS = [
  { month: 1, day: 1, name: "New Year's Day", emoji: '🎆', bg: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1920&q=80' },
  { month: 2, day: 14, name: "Valentine's Day", emoji: '❤️', bg: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1920&q=80' },
  { month: 4, day: 9, name: "Araw ng Kagitingan", emoji: '🇵🇭', bg: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1920&q=80' },
  { month: 5, day: 1, name: "Labor Day", emoji: '👷', bg: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1920&q=80' },
  { month: 6, day: 12, name: "Independence Day 🇵🇭", emoji: '🇵🇭', bg: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1920&q=80' },
  { month: 10, day: 31, name: "Halloween", emoji: '🎃', bg: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=1920&q=80' },
  { month: 11, day: 1, name: "All Saints Day", emoji: '🕯️', bg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80' },
  { month: 11, day: 30, name: "Bonifacio Day 🇵🇭", emoji: '🇵🇭', bg: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1920&q=80' },
  { month: 12, day: 25, name: "Christmas Day", emoji: '🎄', bg: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1920&q=80' },
  { month: 12, day: 30, name: "Rizal Day 🇵🇭", emoji: '🇵🇭', bg: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1920&q=80' },
  { month: 12, day: 31, name: "New Year's Eve", emoji: '🎉', bg: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1920&q=80' },
];
const getTodayHoliday = () => { const d = new Date(); return HOLIDAYS.find(h => h.month === d.getMonth() + 1 && h.day === d.getDate()) || null; };
const isAnniversary = () => { const d = new Date(); return d.getMonth() === 11 && d.getDate() === 15; };

// ══ LOCAL DB ══
const ldb = {
  getUsers: () => JSON.parse(localStorage.getItem('gh_users') || '[]'),
  saveUsers: (u) => localStorage.setItem('gh_users', JSON.stringify(u)),
  getTasks: () => JSON.parse(localStorage.getItem('gh_tasks') || '[]'),
  saveTasks: (t) => localStorage.setItem('gh_tasks', JSON.stringify(t)),
  getEmpTasks: () => JSON.parse(localStorage.getItem('gh_emp_tasks') || '[]'),
  uid: () => 'id_' + Math.random().toString(36).slice(2),
};

const localAPI = {
  async login(email, password) {
    const u = ldb.getUsers().find(u => u.email === email && u.password === password);
    if (u) return { success: true, user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, dept: u.dept || '', gender: u.gender || 'other' } };
    return { success: false, error: 'Invalid email or password.' };
  },
  async register({ firstName, lastName, email, password, dept, gender, photoBase64 }) {
    if (!dept) return { success: false, error: 'Please select a department.' };
    const users = ldb.getUsers();
    if (users.find(u => u.email === email)) return { success: false, error: 'Email already registered.' };
    const id = ldb.uid();
    users.push({ id, firstName, lastName, email, password, dept, gender: gender || 'other', photoBase64: photoBase64 || '', createdAt: new Date().toISOString(), loginCount: 0, deptChangedAt: '' });
    ldb.saveUsers(users);
    // Auto-assign dept tasks
    const et = ldb.getEmpTasks();
    (DEPT_TASKS[dept] || []).slice(0, 5).forEach(taskName => {
      et.push({ id: ldb.uid(), userId: id, userEmail: email, dept, taskName, description: 'Auto-assigned on registration', frequency: 'Daily', priority: 'Medium', createdAt: new Date().toISOString() });
    });
    localStorage.setItem('gh_emp_tasks', JSON.stringify(et));
    return { success: true, user: { id, firstName, lastName, email, dept, gender: gender || 'other' } };
  },
  async getTasks({ userId, startDate, endDate }) {
    let t = ldb.getTasks().filter(t => t.userId === userId);
    if (startDate) t = t.filter(x => x.date >= startDate);
    if (endDate) t = t.filter(x => x.date <= endDate);
    t.sort((a, b) => b.date.localeCompare(a.date) || (b.startTime || '').localeCompare(a.startTime || ''));
    return { success: true, tasks: t };
  },
  async addTask(task) { const tasks = ldb.getTasks(), id = ldb.uid(); const t = { id, ...task, createdAt: new Date().toISOString() }; tasks.push(t); ldb.saveTasks(tasks); return { success: true, task: t }; },
  async updateTask({ taskId, taskName }) {
    const tasks = ldb.getTasks(), i = tasks.findIndex(t => t.id === taskId);
    if (i < 0) return { success: false, error: 'Not found' };
    tasks[i] = { ...tasks[i], taskName }; ldb.saveTasks(tasks); return { success: true };
  },
  async logout() { return { success: true }; },
  async timerStart({ userId, userEmail, taskName }) {
    const id = ldb.uid(), logs = JSON.parse(localStorage.getItem('gh_timerlogs') || '[]');
    logs.push({ id, userId, userEmail, taskName, startedAt: new Date().toISOString(), stoppedAt: '', durationSeconds: 0, savedAsTask: 'NO' });
    localStorage.setItem('gh_timerlogs', JSON.stringify(logs));
    return { success: true, timerId: id };
  },
  async timerStop({ timerId, durationSeconds, savedAsTask }) {
    const logs = JSON.parse(localStorage.getItem('gh_timerlogs') || '[]');
    const i = logs.findIndex(l => l.id === timerId);
    if (i >= 0) { logs[i].stoppedAt = new Date().toISOString(); logs[i].durationSeconds = durationSeconds || 0; logs[i].savedAsTask = savedAsTask ? 'YES' : 'NO'; localStorage.setItem('gh_timerlogs', JSON.stringify(logs)); }
    return { success: true };
  },
  async logActivity(data) {
    const logs = JSON.parse(localStorage.getItem('gh_activity') || '[]');
    logs.push({ id: ldb.uid(), timestamp: new Date().toISOString(), ...data });
    localStorage.setItem('gh_activity', JSON.stringify(logs));
    return { success: true };
  },
  async getEmployeeTasks({ userId }) {
    const tasks = ldb.getEmpTasks().filter(t => t.userId === userId);
    return { success: true, tasks };
  },
};

const remoteAPI = {
  async call(action, data = {}) {
    const body = JSON.stringify({ action, ...data });
    const attempt = async () => {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 30000);
      try {
        const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', redirect: 'follow', body, signal: ctrl.signal });
        clearTimeout(timer); const text = await res.text();
        try { return JSON.parse(text); } catch { return { success: false, error: 'Server error — check deployment' }; }
      } catch (err) { clearTimeout(timer); if (err.name === 'AbortError') return { success: false, error: 'Timed out.' }; throw err; }
    };
    try { return await attempt(); } catch (err) { await new Promise(r => setTimeout(r, 2000)); try { return await attempt(); } catch (e) { return { success: false, error: 'Network error: ' + e.message }; } }
  },
  async ping() { try { const res = await fetch(APPS_SCRIPT_URL + '?action=ping'); return res.json(); } catch (e) { return { success: false, error: e.message }; } },
  login: (e, p) => remoteAPI.call('login', { email: e, password: p }),
  register: (d) => remoteAPI.call('register', d),
  logout: (d) => remoteAPI.call('logout', d),
  getTasks: (d) => remoteAPI.call('getTasks', d),
  addTask: (d) => remoteAPI.call('addTask', d),
  updateTask: (d) => remoteAPI.call('updateTask', d),
  timerStart: (d) => remoteAPI.call('timerStart', d),
  timerStop: (d) => remoteAPI.call('timerStop', d),
  logActivity: (d) => remoteAPI.call('logActivity', d),
  getEmployeeTasks: (d) => remoteAPI.call('getEmployeeTasks', d),
};

const api = USE_LOCAL ? localAPI : remoteAPI;
const fireLog = (action, details, user) => { if (!user) return; api.logActivity({ userId: user.id, userEmail: user.email, action, details, status: 'SUCCESS' }).catch(() => { }); };

// ══ HELPERS ══
const todayStr = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => new Date().toTimeString().slice(0, 5);
const fmtMins = m => `${String(Math.floor(m / 60)).padStart(2, '0')}h ${String(Math.floor(m % 60)).padStart(2, '0')}m`;
const fmtHHMMSS = s => { if (s < 0) s = 0; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; };
const fmtDate12 = d => { if (!d) return ''; const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); };
const fmt12 = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const minsFromT = (s, e) => { if (!s || !e) return 0; const [sh, sm] = s.split(':').map(Number); const [eh, em] = e.split(':').map(Number); return Math.max(0, (eh * 60 + em) - (sh * 60 + sm)); };

// Special name trigger for red theme
const hasRedThemeName = (firstName) => {
  const n = (firstName || '').toLowerCase();
  return n === 'piolo' || n === 'daniel';
};

const useLiveClock = startDate => {
  const [s, setS] = useState(startDate ? Math.floor((Date.now() - new Date(startDate)) / 1000) : 0);
  useEffect(() => { if (!startDate) { setS(0); return; } const t = setInterval(() => setS(Math.floor((Date.now() - new Date(startDate)) / 1000)), 1000); return () => clearInterval(t); }, [startDate]);
  return s;
};

// ══ LOGO ══
const LOGO_B64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC";
const Logo = ({ size = 44, white = false }) => (<div style={{ width: size, height: size, borderRadius: size > 40 ? 12 : 8, background: white ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,.2)' }}><span style={{ fontSize: size * 0.55, lineHeight: 1 }}>⚡</span></div>);

const Notif = ({ msg, type, onDone }) => { useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []); return <div className={`notif ${type || ''}`}>{msg}</div>; };
const ErrBox = ({ msg }) => msg ? <div className="err-box">{msg}</div> : null;

// ══ PASSWORD EYE TOGGLE ══
const PwInput = ({ value, onChange, placeholder, onKeyDown, className = 'form-input' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input className={className} type={show ? 'text' : 'password'} placeholder={placeholder || '••••••••'} value={value} onChange={onChange} onKeyDown={onKeyDown} />
      <button type="button" className="pw-eye" onClick={() => setShow(s => !s)}>
        {show ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
      </button>
    </div>
  );
};

// ══ CONFETTI ══
const Confetti = () => {
  const pieces = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i, left: `${Math.random() * 100}%`, delay: `${Math.random() * 4}s`, duration: `${3 + Math.random() * 4}s`,
    color: ['#1a3af5', '#4d6fff', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'][Math.floor(Math.random() * 6)],
    size: `${6 + Math.random() * 8}px`, shape: Math.random() > 0.5 ? '50%' : '0'
  })), []);
  return (
    <div className="confetti-wrap">
      {pieces.map(p => <div key={p.id} className="confetti-piece" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, background: p.color, width: p.size, height: p.size, borderRadius: p.shape }} />)}
    </div>
  );
};

// ══ ANNIVERSARY BANNER ══
const AnniversaryBanner = () => (
  <>
    <Confetti />
    <div className="anniversary-banner">
      🎉 Happy Anniversary Gigahertz! 🎂 December 15, 2001 — Still Going Strong! ⚡
    </div>
  </>
);

// ══ HOLIDAY BG ══
const HolidayBg = ({ holiday }) => (
  <div className="holiday-bg" style={{ backgroundImage: `url(${holiday.bg})` }} />
);

// ══ WASH HAND REMINDER ══
const WashHandReminder = ({ user, onDismiss }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const gender = (user?.gender || 'other').toLowerCase();
    if (gender !== 'male') return;
    const t = setTimeout(() => setShow(true), 2 * 60 * 1000); // 2 minutes after login
    return () => clearTimeout(t);
  }, [user]);
  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => setShow(true), 30 * 60 * 1000); // every 30 min
    return () => clearInterval(t);
  }, [show]);
  if (!show) return null;
  return (
    <div className="wash-overlay">
      <div className="wash-card">
        <div className="wash-icon">🧼</div>
        <div className="wash-title">Time to Wash Your Hands!</div>
        <div className="wash-msg">Hey {user?.firstName}! 👋 Remember to wash your hands regularly.<br />It keeps you and your teammates healthy and safe! 💪<br /><br />Wet → Soap → Scrub 20s → Rinse → Dry</div>
        <button className="wash-btn" onClick={() => { setShow(false); onDismiss && onDismiss(); }}>✓ Got it! Going to wash now</button>
      </div>
    </div>
  );
};

// ══ EASTER EGG — Monopoly ══
const EasterEgg = ({ onClose }) => (
  <div className="easter-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="easter-card">
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎩🎲</div>
      <div className="easter-title">🏦 Monopoly Secret Room 🏦</div>
      <div className="easter-board">
        <div style={{ textAlign: 'center', fontWeight: 800, color: '#ffd700', marginBottom: 8, fontSize: 15 }}>🎩 You found the Easter Egg! 🎩</div>
        <p>🎲 <strong>Fun Monopoly Facts:</strong></p>
        <p style={{ marginTop: 8 }}>💰 Mayfair (Boardwalk) is the most expensive property.</p>
        <p>🏨 You need 4 houses before a hotel.</p>
        <p>🚂 Own all railroads? That's ₱200 per visit!</p>
        <p>🏛️ The original game was patented in <strong>1935</strong>.</p>
        <p>🎯 "Go to Jail" is the most landed-on square.</p>
        <p>⏱️ Average game: <strong>1–4 hours</strong> (or friendships lost).</p>
        <p>🌍 Monopoly exists in <strong>47 languages</strong>, 114 countries.</p>
        <p style={{ marginTop: 8, color: '#ffd700' }}>🤫 <em>"The banker never really loses."</em></p>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 10 }}>You found this by clicking the logo 10 times! 🎉</div>
      <button className="easter-close" onClick={onClose}>🚂 Back to Work, Monopoly Man!</button>
    </div>
  </div>
);

// ══ CONNECTION TESTER ══
const ConnectionTester = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [steps, setSteps] = useState([
    { id: 'url', label: 'Apps Script URL configured', state: 'idle', detail: '' },
    { id: 'ping', label: 'API responds to GET ping', state: 'idle', detail: '' },
    { id: 'post', label: 'POST request works', state: 'idle', detail: '' },
    { id: 'sheets', label: 'Google Sheet accessible', state: 'idle', detail: '' },
  ]);
  const setStep = (id, state, detail = '') => setSteps(p => p.map(s => s.id === id ? { ...s, state, detail } : s));
  const run = async () => {
    setStatus('running'); setOpen(true); setSteps(s => s.map(x => ({ ...x, state: 'idle', detail: '' })));
    setStep('url', 'wait'); await new Promise(r => setTimeout(r, 300));
    if (USE_LOCAL) { setStep('url', 'err', 'Replace YOUR_APPS_SCRIPT_URL_HERE in index.html with your deployed Web App URL.'); setStatus('done'); return; }
    setStep('url', 'ok', APPS_SCRIPT_URL.slice(0, 55) + '…');
    setStep('ping', 'wait');
    const ping = await remoteAPI.ping().catch(e => ({ success: false, error: e.message }));
    if (!ping.success) { setStep('ping', 'err', `Ping failed: ${ping.error}`); setStatus('done'); return; }
    setStep('ping', 'ok', ping.message || 'API online ✓');
    setStep('post', 'wait');
    const post = await remoteAPI.call('login', { email: '__test__', password: '__test__' });
    if (post.success === false || post.error) setStep('post', 'ok', 'POST reaches Apps Script ✓');
    else { setStep('post', 'err', `POST failed`); setStatus('done'); return; }
    setStep('sheets', 'wait');
    const st = await remoteAPI.call('getDashboardStats', {}).catch(e => ({ success: false, error: e.message }));
    if (st.success && st.stats) setStep('sheets', 'ok', 'Sheet accessible ✓');
    else setStep('sheets', 'err', `Sheet error: ${st.error || 'Check SPREADSHEET_ID'}`);
    setStatus('done');
  };
  const icon = s => ({ ok: '✓', err: '✕', wait: '…' }[s] || '○');
  const allOk = steps.every(s => s.state === 'ok'), hasErr = steps.some(s => s.state === 'err');
  return (
    <div className="conn-panel">
      <div className="conn-hdr" onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {status === 'idle' && '🔌'}{status === 'running' && <span style={{ color: 'var(--p)' }}>⏳</span>}
          {status === 'done' && allOk && '✅'}{status === 'done' && hasErr && '❌'}
          {USE_LOCAL ? 'Demo Mode — no Google Sheets' : 'Google Sheets Connection Test'}
        </span><span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="conn-body">
          {USE_LOCAL ? (
            <div>
              <p style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 8 }}>Running in <strong>demo mode</strong>.</p>
              <ol style={{ fontSize: 11, color: 'var(--tx2)', paddingLeft: 15, lineHeight: 1.9 }}>
                <li>Create a Google Spreadsheet → copy its ID</li>
                <li>Open apps-script.gs → paste code → run initializeAllSheets()</li>
                <li>Deploy as Web App (Execute as: Me, Access: Anyone)</li>
                <li>Replace <code>YOUR_APPS_SCRIPT_URL_HERE</code> in index.html</li>
              </ol>
            </div>
          ) : (
            <>{steps.map(s => (<div key={s.id} className="conn-step"><div className={`conn-dot ${s.state}`}>{icon(s.state)}</div><div><div className="conn-lbl">{s.label}</div>{s.detail && <div className="conn-detail">{s.detail}</div>}</div></div>))}
              <button className="conn-run" onClick={run} disabled={status === 'running'}>{status === 'running' ? '⏳ Testing…' : status === 'done' ? '🔄 Test Again' : '▶ Test Connection'}</button>
              {status === 'done' && allOk && <div style={{ marginTop: 9, padding: '8px 11px', background: '#ecfdf5', borderRadius: 7, fontSize: 12, color: '#15803d', fontWeight: 600 }}>✅ All checks passed!</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ══ LOGIN PAGE ══
const LoginPage = ({ onLogin, onGoRegister, darkMode, toggleDark }) => {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [logoClicks, setLogoClicks] = useState(0);
  const [showEgg, setShowEgg] = useState(false);

  const handleLogoClick = () => {
    setLogoClicks(c => { if (c + 1 >= 10) { setShowEgg(true); return 0; } return c + 1; });
  };

  const submit = async () => {
    if (!email || !pw) { setErr('Please fill in all fields.'); return; }
    setLoading(true); setErr('');
    const res = await api.login(email.trim(), pw);
    setLoading(false);
    if (res.success) onLogin(res.user, res.sessionId);
    else setErr(res.error || 'Login failed.');
  };
  return (
    <div className="auth-wrap">
      {showEgg && <EasterEgg onClose={() => setShowEgg(false)} />}
      <button onClick={toggleDark} style={{ position: 'absolute', top: 16, right: 18, background: 'rgba(255,255,255,.12)', border: 'none', cursor: 'pointer', padding: '7px 9px', borderRadius: 8, color: darkMode ? '#fbbf24' : '#4d6fff', fontSize: 18, backdropFilter: 'blur(4px)', zIndex: 2 }}>{darkMode ? '☀' : '🌙'}</button>
      <div className="auth-card">
        <div className="auth-logo" onClick={handleLogoClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
          <Logo size={56} /><span className="auth-logo-name">Gigahertz {logoClicks > 0 && logoClicks < 10 && <span style={{ fontSize: 9, color: 'var(--tx3)' }}>({10 - logoClicks} more...)</span>}</span>
        </div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-sub">Sign in to your Gigahertz account</p>
        <ErrBox msg={err} />
        <div className="form-group"><label className="form-label">Company Email</label><input className="form-input" type="email" placeholder="you@gigahertz.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        <div className="form-group"><label className="form-label">Password</label><PwInput value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        <button className="btn btn-p" onClick={submit} disabled={loading}>{loading ? <span className="spinner" /> : 'Sign In'}</button>
        <p className="auth-link">Don't have an account? <a onClick={onGoRegister}>Create Account</a></p>
        <div style={{ marginTop: 14 }}><ConnectionTester /></div>
      </div>
    </div>
  );
};

// ══ REGISTER STEP 1 ══
const RegisterStep1 = ({ onNext, onGoLogin, darkMode, toggleDark }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', dept: '', gender: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const submit = () => {
    const { firstName, lastName, email, dept, gender, password, confirm } = form;
    if (!firstName || !lastName || !email || !dept || !password || !confirm) { setErr('All fields are required, including department and gender.'); return; }
    if (!gender) { setErr('Please select your gender.'); return; }
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setErr(''); onNext(form);
  };
  return (
    <div className="auth-wrap">
      <button onClick={toggleDark} style={{ position: 'absolute', top: 16, right: 18, background: 'rgba(255,255,255,.12)', border: 'none', cursor: 'pointer', padding: '7px 9px', borderRadius: 8, color: darkMode ? '#fbbf24' : '#4d6fff', fontSize: 18, backdropFilter: 'blur(4px)', zIndex: 2 }}>{darkMode ? '☀' : '🌙'}</button>
      <div className="auth-card">
        <div className="auth-logo"><Logo size={56} /><span className="auth-logo-name">Gigahertz</span></div>
        <h1 className="auth-title">Create Employee Account</h1>
        <p className="auth-sub">Register to start tracking your work time</p>
        <ErrBox msg={err} />
        <div className="two-col">
          <div className="form-group"><label className="form-label">First Name</label><input className="form-input" placeholder="First" value={form.firstName} onChange={upd('firstName')} /></div>
          <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" placeholder="Last" value={form.lastName} onChange={upd('lastName')} /></div>
        </div>
        <div className="form-group"><label className="form-label">Company Email</label><input className="form-input" type="email" placeholder="you@gigahertz.com" value={form.email} onChange={upd('email')} /></div>
        <div className="form-group">
          <label className="form-label">Department <span style={{ color: 'var(--danger)' }}>*</span></label>
          <select className="form-input" value={form.dept} onChange={upd('dept')} style={{ appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%238890aa' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center' }}>
            <option value="">— Select your department —</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {form.dept && <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 5 }}>⚠ Department is locked after registration. Only admin can change it.</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Gender</label>
          <div className="gender-row">
            {[{ v: 'male', i: '👨', l: 'Male' }, { v: 'female', i: '👩', l: 'Female' }, { v: 'other', i: '🧑', l: 'Other' }].map(g => (
              <div key={g.v} className={`gender-opt${form.gender === g.v ? ' sel' : ''}`} onClick={() => setForm(p => ({ ...p, gender: g.v }))}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{g.i}</div><div style={{ fontSize: 11 }}>{g.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group"><label className="form-label">Password</label><PwInput value={form.password} onChange={upd('password')} placeholder="Min. 6 characters" /></div>
        <div className="form-group"><label className="form-label">Confirm Password</label><PwInput value={form.confirm} onChange={upd('confirm')} placeholder="Repeat password" onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        <button className="btn btn-p" onClick={submit}>Continue →</button>
        <p className="auth-link">Already have an account? <a onClick={onGoLogin}>Login</a></p>
      </div>
    </div>
  );
};

// ══ REGISTER STEP 2 — FACE CAPTURE ══
const RegisterStep2 = ({ formData, onRegister, onGoLogin }) => {
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null);
  const [camState, setCamState] = useState('idle');
  const [errType, setErrType] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regErr, setRegErr] = useState('');
  const stopStream = () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } };
  const startCamera = async () => {
    stopStream(); setPhoto(null); setCamState('requesting'); setErrType('');
    if (!navigator.mediaDevices?.getUserMedia) { setCamState('error'); setErrType('notfound'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => { videoRef.current.play().catch(() => { }); setCamState('live'); }; }
    } catch (err) {
      stopStream();
      setErrType(err.name === 'NotAllowedError' ? 'permission' : err.name === 'NotFoundError' ? 'notfound' : 'unknown');
      setCamState('error');
    }
  };
  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d'); ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0, c.width, c.height);
    setPhoto(c.toDataURL('image/jpeg', .85)); setCamState('captured'); stopStream();
  };
  const retake = () => { setPhoto(null); startCamera(); };
  useEffect(() => { startCamera(); return () => stopStream(); }, []);
  const submit = async () => {
    if (camState !== 'captured' && camState !== 'live') { setRegErr('Please capture your photo first.'); return; }
    setLoading(true); setRegErr('');
    const res = await api.register({ firstName: formData.firstName, lastName: formData.lastName, email: formData.email, password: formData.password, dept: formData.dept || '', gender: formData.gender || 'other', photoBase64: photo || '' });
    setLoading(false);
    if (res.success) { if (photo && res.user?.id) localStorage.setItem(`gh_photo_${res.user.id}`, photo); onRegister(res.user); }
    else setRegErr(res.error || 'Registration failed.');
  };
  const errMap = { permission: { title: 'Camera permission denied', steps: ['Click 🔒 in address bar', 'Set Camera → Allow', 'Refresh'] }, notfound: { title: 'No camera detected', steps: ['Check camera', 'Try Chrome', 'Restart browser'] }, unknown: { title: 'Camera error', steps: ['Close other camera apps', 'Refresh', 'Try Chrome'] } };
  const ei = errMap[errType] || errMap.unknown;
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo"><Logo size={56} /><span className="auth-logo-name">Gigahertz</span></div>
        <h1 className="auth-title">Verify Your Identity</h1>
        <p className="auth-sub">Position your face and click Capture</p>
        <ErrBox msg={regErr} />
        <div className="face-section">
          <div className="cam-vp">
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {(camState === 'live' || camState === 'requesting') && <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camState === 'live' ? 'block' : 'none' }} />}
            {camState === 'requesting' && <div className="cam-idle"><div className="spinner" style={{ borderTopColor: 'var(--p)', borderColor: 'rgba(26,58,245,.2)', width: 32, height: 32 }} /><p>Starting…</p></div>}
            {camState === 'captured' && photo && <img src={photo} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            {camState === 'idle' && <div className="cam-idle"><p>Click Start Camera below</p></div>}
            {camState === 'error' && <div className="cam-idle"><p style={{ color: '#f87171' }}>Camera error</p></div>}
            {camState === 'live' && <><div className="cam-scan" /><div className="cam-corners"><div className="cc tl" /><div className="cc tr" /><div className="cc bl" /><div className="cc br" /></div></>}
            {camState === 'captured' && <div style={{ position: 'absolute', top: 7, right: 7, background: 'var(--ok)', borderRadius: 99, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>}
          </div>
          <div className="cam-btns">
            {(camState === 'idle' || camState === 'error') && <button className="cam-btn cam-btn-retry" onClick={startCamera}>Start Camera</button>}
            {camState === 'live' && <button className="cam-btn cam-btn-capture" onClick={capture}>📸 Capture</button>}
            {camState === 'captured' && <button className="cam-btn cam-btn-retake" onClick={retake}>Retake</button>}
          </div>
          {camState === 'error' && <div className="cam-err-box"><p>⚠ {ei.title}</p><ol>{ei.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
        </div>
        <button className="btn btn-p" onClick={submit} disabled={loading || (camState !== 'captured' && camState !== 'live')}>{loading ? <span className="spinner" /> : 'Confirm and Register'}</button>
        <p className="auth-link">Already have an account? <a onClick={onGoLogin}>Login</a></p>
      </div>
    </div>
  );
};

// ══ SIDEBAR ══
const Sidebar = ({ page, setPage, user, onLogout, loginTime, darkMode, toggleDark }) => {
  const secs = useLiveClock(loginTime);
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
    { id: 'tasks', label: 'Task Management', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg> },
    { id: 'analytics', label: 'Analytics', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
    { id: 'profile', label: 'My Profile', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  ];
  return (
    <div className="sidebar">
      <div className="sb-logo"><Logo size={32} white /><span className="sb-logo-name">Gigahertz</span></div>
      <nav className="sb-nav">{nav.map(n => <div key={n.id} className={`nav-item${page === n.id ? ' active' : ''}`} onClick={() => setPage(n.id)}>{n.icon}{n.label}</div>)}</nav>
      <div className="sb-bottom">
        {loginTime && <div className="session-wrap"><div className="session-lbl">Session Time</div><div className="session-time">{fmtHHMMSS(secs)}</div><div className="session-since">since {new Date(loginTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div></div>}
        <div className="sb-user">Logged in as<strong>{user?.email}</strong>{user?.dept && <span style={{ display: 'block', marginTop: 3, fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(26,58,245,.25)', color: 'rgba(180,200,255,.9)', width: 'fit-content' }}>{user.dept}</span>}</div>
        <button className="icon-btn" onClick={toggleDark}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{darkMode ? <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></> : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />}</svg>{darkMode ? 'Light Mode' : 'Dark Mode'}</button>
        <button className="logout-btn" onClick={onLogout}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>Logout</button>
      </div>
    </div>
  );
};

// ══ DASHBOARD ══
const DashboardPage = ({ user, tasks, onTasksChanged, activeTimer, setActiveTimer, elapsed, setElapsed, loginTime }) => {
  const [selTask, setSelTask] = useState('');
  const [customTask, setCustomTask] = useState('');
  const [toast, setToast] = useState('');
  const secs = useLiveClock(loginTime);
  const todayTasks = tasks.filter(t => t.date === todayStr());
  const totalMins = todayTasks.reduce((s, t) => s + Number(t.durationMinutes || 0), 0);
  const avgMins = todayTasks.length ? Math.round(totalMins / todayTasks.length) : 0;

  const startTimer = async (name) => {
    if (!name.trim()) return;
    const ss = nowHHMM();
    const res = await api.timerStart({ userId: user.id, userEmail: user.email, taskName: name });
    setActiveTimer({ taskName: name, startStr: ss, timerId: res?.timerId || null });
    setElapsed(0); setToast(`▶ Timer started for "${name}"`); setTimeout(() => setToast(''), 3500);
    fireLog('TIMER_START', `Timer started: "${name}"`, user);
  };
  const stopTimer = async () => {
    if (!activeTimer) return;
    const endStr = nowHHMM(), totalSec = elapsed;
    const mins = totalSec < 60 ? 1 : Math.round(totalSec / 60);
    await api.timerStop({ timerId: activeTimer.timerId, userId: user.id, userEmail: user.email, taskName: activeTimer.taskName, durationSeconds: totalSec, savedAsTask: true });
    await api.addTask({ userId: user.id, userEmail: user.email, taskName: activeTimer.taskName, date: todayStr(), startTime: activeTimer.startStr, endTime: endStr, durationMinutes: mins, source: 'timer' });
    fireLog('TASK_ADD', `Task via timer: "${activeTimer.taskName}" | ${todayStr()} | ${activeTimer.startStr}–${endStr} | ${mins} min`, user);
    const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
    const sum = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    setToast(`✓ "${activeTimer.taskName}" saved — ${sum}`); setTimeout(() => setToast(''), 4500);
    setActiveTimer(null); setElapsed(0); await onTasksChanged();
  };
  const handleAdd = () => { const n = customTask.trim() || selTask; if (n) startTimer(n); };
  const H = Math.floor(elapsed / 3600), M = Math.floor((elapsed % 3600) / 60), S = elapsed % 60;

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}
      <div className="page-hdr">
        <h1 className="page-title">Dashboard {user?.dept && <span style={{ fontSize: 14, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'var(--pl)', color: 'var(--p)', marginLeft: 8 }}>{user.dept}</span>}</h1>
        <p className="page-date"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>{fmtDate12(todayStr())}</p>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--pl)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--p)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div><div className="stat-lbl">Today's Session</div><div className="stat-clock">{fmtHHMMSS(secs)}</div><div className="stat-live"><div className="live-dot" /><span style={{ fontSize: 11, color: 'var(--tx2)' }}>{loginTime ? `Since ${new Date(loginTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#ecfdf5' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg></div><div className="stat-lbl">Tasks Logged</div><div className="stat-val" style={{ color: 'var(--ok)' }}>{todayTasks.length}</div><div className="stat-sub">Entries today</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#faf5ff' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></div><div className="stat-lbl">Avg per Task</div><div className="stat-val" style={{ color: '#9333ea' }}>{fmtMins(avgMins)}</div><div className="stat-sub">Average duration</div></div>
      </div>
      <div className="track-section">
        <div className="track-title">Track Time</div><div className="track-sub">Start tracking time for a new task</div>
        {activeTimer ? (
          <div className="timer-active">
            <div className="timer-lbl">⚡ Currently Tracking</div>
            <div className="timer-task">{activeTimer.taskName}</div>
            <div className="timer-digits-row">
              {H > 0 && <><div><div className="timer-digits">{String(H).padStart(2, '0')}</div><div className="timer-unit">HRS</div></div><div className="timer-sep">:</div></>}
              <div><div className="timer-digits">{String(M).padStart(2, '0')}</div><div className="timer-unit">MIN</div></div>
              <div className="timer-sep">:</div>
              <div><div className="timer-digits" style={{ color: S % 2 === 0 ? '#fff' : 'rgba(255,255,255,.7)', transition: 'color .5s' }}>{String(S).padStart(2, '0')}</div><div className="timer-unit">SEC</div></div>
            </div>
            <div className="timer-meta"><div className="timer-dot" /><span className="timer-meta-txt">LIVE · Started {activeTimer.startStr}</span></div>
            <div className="timer-bar-wrap"><div className="timer-bar" style={{ width: `${(S / 60) * 100}%` }} /></div>
            <button className="stop-btn" onClick={stopTimer}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>Stop Timer &amp; Save</button>
            <div className="timer-hint">Seconds shown live · only minutes saved to database</div>
          </div>
        ) : (
          <>
            <div className="track-row">
              <select className="track-select" value={selTask} onChange={e => setSelTask(e.target.value)}><option value="">— Select a task —</option>{PRESET.map(t => <option key={t} value={t}>{t}</option>)}</select>
              <button className="start-btn" onClick={() => { if (selTask) startTimer(selTask); }}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>Start Timer</button>
            </div>
            <div className="custom-row"><input className="custom-input" placeholder="Or type a custom task and press + Add…" value={customTask} onChange={e => setCustomTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} /><button className="add-btn" onClick={handleAdd}>+ Add</button></div>
          </>
        )}
      </div>
      {/* SCROLLABLE RECENT TASKS */}
      <div className="recent-section">
        <div className="sec-hdr"><span className="sec-title">Recent Tasks</span><span style={{ fontSize: 12, color: 'var(--tx2)' }}>{todayTasks.length} entries today</span></div>
        <div className="recent-scroll">
          {todayTasks.length === 0
            ? <div className="empty-state"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg><p>No tasks today. Start the timer!</p></div>
            : tasks.slice(0, 30).map(t => <div key={t.id} className="task-row"><div><div className="task-name">{t.taskName}</div><div className="task-time">{t.date === 'today' ? 'today' : t.date} · {fmt12(t.startTime)} — {fmt12(t.endTime)}</div></div><span className="dur-badge">{fmtMins(Number(t.durationMinutes) || 0)}</span></div>)
          }
        </div>
      </div>
    </div>
  );
};

// ══ TASK MANAGEMENT — name-only edit, no delete, no time/date edit ══
const RenameModal = ({ task, onSave, onClose }) => {
  const [name, setName] = useState(task?.taskName || '');
  const save = () => { if (!name.trim()) return; onSave(name.trim()); };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 380 }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">Rename Task</div>
        <div className="modal-sub">You can only edit the task name. Time and date are locked.</div>
        <div style={{ marginBottom: 14 }}><label className="form-label">Task Name</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus /></div>
        <div style={{ background: 'var(--pl)', borderRadius: 'var(--rsm)', padding: '9px 12px', fontSize: 12, color: 'var(--p)', marginBottom: 16 }}>
          📅 Date: <strong>{task?.date}</strong> &nbsp;·&nbsp; ⏱ {fmt12(task?.startTime)} — {fmt12(task?.endTime)} &nbsp;·&nbsp; {fmtMins(Number(task?.durationMinutes) || 0)} <em style={{ opacity: .7 }}>(locked)</em>
        </div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-p" onClick={save} style={{ width: 'auto' }}>Save Name</button></div>
      </div>
    </div>
  );
};

const AddTaskModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ taskName: '', date: todayStr(), startTime: '09:00', endTime: '10:00' });
  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const save = () => { if (!form.taskName.trim()) return; const dur = minsFromT(form.startTime, form.endTime); onSave({ ...form, durationMinutes: dur }); };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">Add Task</div><div className="modal-sub">Log a manual time entry</div>
        <div style={{ marginBottom: 14 }}><label className="form-label">Task Name</label><input className="form-input" placeholder="What did you work on?" value={form.taskName} onChange={upd('taskName')} /></div>
        <div style={{ marginBottom: 14 }}><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={upd('date')} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <div style={{ marginBottom: 14 }}><label className="form-label">Start</label><input className="form-input" type="time" value={form.startTime} onChange={upd('startTime')} /></div>
          <div style={{ marginBottom: 14 }}><label className="form-label">End</label><input className="form-input" type="time" value={form.endTime} onChange={upd('endTime')} /></div>
        </div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-p" onClick={save} style={{ width: 'auto' }}>Add Task</button></div>
      </div>
    </div>
  );
};

const TasksPage = ({ user, tasks, onTasksChanged }) => {
  const [fd, setFd] = useState(todayStr());
  const [modal, setModal] = useState(null);// 'add' | task obj for rename
  const [notif, setNotif] = useState(null);
  const show = (msg, type = 'success') => setNotif({ msg, type });
  const filtered = tasks.filter(t => !fd || t.date === fd);
  const totalMins = filtered.reduce((s, t) => s + Number(t.durationMinutes || 0), 0);
  const handleAdd = async (form) => {
    await api.addTask({ userId: user.id, userEmail: user.email, source: 'manual', ...form });
    fireLog('TASK_ADD', `Task added: "${form.taskName}" | ${form.date} | ${form.durationMinutes} min`, user);
    setModal(null); show('Task added!'); await onTasksChanged();
  };
  const handleRename = async (taskName) => {
    await api.updateTask({ taskId: modal.id, userId: user.id, userEmail: user.email, taskName });
    fireLog('TASK_EDIT', `Task renamed: "${taskName}"`, user);
    setModal(null); show('Task name updated!'); await onTasksChanged();
  };
  return (
    <div className="page">
      {notif && <Notif msg={notif.msg} type={notif.type} onDone={() => setNotif(null)} />}
      {modal === 'add' && <AddTaskModal onSave={handleAdd} onClose={() => setModal(null)} />}
      {modal && modal !== 'add' && <RenameModal task={modal} onSave={handleRename} onClose={() => setModal(null)} />}
      <div className="page-hdr"><h1 className="page-title">Task Management</h1><p className="page-sub">View and rename your time entries · No deletions allowed</p></div>
      <div className="tm-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="total-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>Total: {fmtMins(totalMins)}</span>
          <div className="date-filter"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><input type="date" value={fd} onChange={e => setFd(e.target.value)} />{fd && <button onClick={() => setFd('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 15 }}>×</button>}</div>
          {fd && <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{filtered.length} tasks</span>}
        </div>
        <button className="add-task-btn" onClick={() => setModal('add')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Add Task</button>
      </div>
      <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
        {filtered.length === 0
          ? <div className="empty-state"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg><p>No tasks. Add one or change the date filter.</p></div>
          : <table className="gh-table"><thead><tr><th>Task Name</th><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Rename</th></tr></thead><tbody>
            {filtered.map(t => <tr key={t.id}>
              <td style={{ fontWeight: 600 }}>{t.taskName}</td>
              <td style={{ color: 'var(--tx2)', fontSize: 12 }}>{t.date}</td>
              <td>{fmt12(t.startTime)}</td>
              <td>{fmt12(t.endTime)}</td>
              <td><span className="dur-badge">{fmtMins(Number(t.durationMinutes) || 0)}</span></td>
              <td><button className="rename-btn" onClick={() => setModal(t)}>✏ Rename</button></td>
            </tr>)}
          </tbody></table>
        }
      </div>
      <div style={{ marginTop: 9, padding: '8px 12px', background: 'var(--pl)', borderRadius: 'var(--rsm)', fontSize: 12, color: 'var(--p)', border: '1px solid rgba(26,58,245,.15)' }}>
        🔒 <strong>Note:</strong> Only task names can be edited. Dates and times are locked for accuracy. Contact your admin to dispute any entry.
      </div>
    </div>
  );
};

// ══ ANALYTICS ══
const AnalyticsPage = ({ tasks, darkMode }) => {
  const barRef = useRef(null), pieRef = useRef(null), lineRef = useRef(null);
  const barC = useRef(null), pieC = useRef(null), lineC = useRef(null);
  const [dateRange, setDateRange] = useState('week'); // week, month, all
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const getFilteredTasks = () => {
    let filtered = tasks;
    if (dateRange === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const cutoff = d.toISOString().split('T')[0];
      filtered = tasks.filter(t => t.date >= cutoff);
    } else if (dateRange === 'month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const cutoff = d.toISOString().split('T')[0];
      filtered = tasks.filter(t => t.date >= cutoff);
    } else if (dateRange === 'custom' && startDate && endDate) {
      filtered = tasks.filter(t => t.date >= startDate && t.date <= endDate);
    }
    return filtered;
  };
  
  const filteredTasks = getFilteredTasks();
  const allMins = filteredTasks.reduce((s, t) => s + Number(t.durationMinutes || 0), 0);
  const uDays = [...new Set(filteredTasks.map(t => t.date))].length;
  const avgDay = uDays ? Math.round(allMins / uDays) : 0;
  
  const getWeek = () => { const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().split('T')[0]; const label = d.toLocaleDateString('en-US', { weekday: 'short' }); const mins = filteredTasks.filter(t => t.date === ds).reduce((s, t) => s + Number(t.durationMinutes || 0), 0); days.push({ label, mins }); } return days; };
  const getTop = () => { const map = {}; filteredTasks.forEach(t => { map[t.taskName] = (map[t.taskName] || 0) + Number(t.durationMinutes || 0); }); return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, mins], i) => ({ name, mins, color: COLORS[i % COLORS.length] })); };
  const getDist = () => { const h = Array(24).fill(0); filteredTasks.forEach(t => { if (t.startTime) { const hi = parseInt(t.startTime.split(':')[0]); h[hi] += Number(t.durationMinutes || 0); } }); return h.slice(6, 22).map((v, i) => ({ label: `${(6 + i) % 12 || 12}${6 + i < 12 ? 'am' : 'pm'}`, value: v })); };
  
  const getColors = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      primary: s.getPropertyValue('--p').trim() || '#1a3af5',
      text2: s.getPropertyValue('--tx2').trim() || '#6b7280',
      border: s.getPropertyValue('--bd').trim() || '#e5e7eb',
      card: s.getPropertyValue('--card').trim() || '#ffffff',
    };
  };
  
  const exportToCSV = () => {
    let csv = 'Date,Task Name,Duration (minutes),Start Time,End Time\n';
    filteredTasks.forEach(t => {
      csv += `"${t.date}","${t.taskName || 'Untitled'}",${t.durationMinutes || 0},"${t.startTime || '—'}","${t.endTime || '—'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  useEffect(() => {
    const week = getWeek(), top = getTop(), dist = getDist();
    const colors = getColors();
    
    if (barRef.current) { 
      if (barC.current) barC.current.destroy(); 
      barC.current = new Chart(barRef.current, { 
        type: 'bar', 
        data: { 
          labels: week.map(d => d.label), 
          datasets: [{ data: week.map(d => d.mins / 60), backgroundColor: colors.primary, borderRadius: 6, borderSkipped: false }] 
        }, 
        options: { 
          responsive: true, 
          maintainAspectRatio: true,
          plugins: { legend: { display: false } }, 
          scales: { 
            y: { grid: { color: colors.border }, ticks: { callback: v => `${v}h`, color: colors.text2 } }, 
            x: { grid: { display: false }, ticks: { color: colors.text2 } } 
          } 
        } 
      }); 
    }
    
    if (pieRef.current && top.length) { 
      if (pieC.current) pieC.current.destroy(); 
      pieC.current = new Chart(pieRef.current, { 
        type: 'doughnut', 
        data: { 
          labels: top.map(t => t.name), 
          datasets: [{ data: top.map(t => t.mins), backgroundColor: top.map(t => t.color), borderWidth: 2, borderColor: colors.card }] 
        }, 
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, cutout: '65%' } 
      }); 
    }
    
    if (lineRef.current) { 
      if (lineC.current) lineC.current.destroy(); 
      const bgColor = darkMode ? `rgba(26,58,245,.15)` : `rgba(26,58,245,.1)`;
      lineC.current = new Chart(lineRef.current, { 
        type: 'line', 
        data: { 
          labels: dist.map(d => d.label), 
          datasets: [{ 
            data: dist.map(d => d.value / 60), 
            fill: true, 
            backgroundColor: bgColor, 
            borderColor: colors.primary, 
            borderWidth: 2.5, 
            tension: 0.45, 
            pointRadius: 3, 
            pointBackgroundColor: colors.primary 
          }] 
        }, 
        options: { 
          responsive: true, 
          maintainAspectRatio: true,
          plugins: { legend: { display: false } }, 
          scales: { 
            y: { grid: { color: colors.border }, ticks: { callback: v => `${v}h`, color: colors.text2 } }, 
            x: { grid: { display: false }, ticks: { color: colors.text2 } } 
          } 
        } 
      }); 
    }
    return () => { barC.current?.destroy(); pieC.current?.destroy(); lineC.current?.destroy(); };
  }, [filteredTasks, darkMode]);
  
  const top = getTop();
  return (
    <div className="page">
      <div className="page-hdr"><h1 className="page-title">Analytics</h1><p className="page-sub">Your productivity and time usage</p></div>
      
      {/* DATE RANGE SELECTOR */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['week', 'month', 'all', 'custom'].map(r => (
            <button key={r} onClick={() => { setDateRange(r); if (r !== 'custom') { setStartDate(''); setEndDate(''); } }} style={{ padding: '7px 14px', background: dateRange === r ? 'var(--p)' : 'var(--bg)', color: dateRange === r ? 'white' : 'var(--tx)', border: dateRange === r ? 'none' : '1px solid var(--bd)', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: dateRange === r ? 600 : 500, transition: 'all 0.2s' }}>
              {r === 'week' ? '📅 Last 7 Days' : r === 'month' ? '📊 Last Month' : r === 'all' ? '📈 All Time' : '🔧 Custom'}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--bd)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--tx)' }} />
            <span style={{ color: 'var(--tx2)' }}>→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--bd)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--tx)' }} />
          </div>
        )}
        <button onClick={exportToCSV} style={{ padding: '7px 12px', background: 'var(--ok)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📥 Export CSV</button>
      </div>
      
      <div className="analytics-stats">
        {[{ label: 'Total Hours', val: `${Math.floor(allMins / 60)}h ${allMins % 60}m`, icon: '⏱', c: 'var(--p)' }, { label: 'Avg per Day', val: `${Math.floor(avgDay / 60)}h ${avgDay % 60}m`, icon: '📅', c: '#9333ea' }, { label: 'Total Tasks', val: filteredTasks.length, icon: '✅', c: 'var(--ok)' }, { label: 'Active Days', val: uDays, icon: '📆', c: '#d97706' }].map(s => (<div key={s.label} className="stat-card"><div className="stat-lbl">{s.icon} {s.label}</div><div className="stat-val" style={{ color: s.c, fontSize: 26 }}>{s.val}</div></div>))}
      </div>
      <div className="analytics-grid">
        <div className="chart-card"><div className="chart-title">Weekly Summary</div><div className="chart-sub">Hours worked each day this week</div><canvas ref={barRef} /></div>
        <div className="chart-card"><div className="chart-title">Top Tasks by Time</div><div className="chart-sub">Time distribution</div>
          {top.length === 0 ? <p style={{ fontSize: 13, color: 'var(--tx2)', textAlign: 'center', padding: '20px 0' }}>No data yet</p>
            : <><canvas ref={pieRef} style={{ maxHeight: 155, marginBottom: 14 }} />{top.map(t => <div key={t.name} className="top-item"><div className="top-dot" style={{ background: t.color }} /><span className="top-name">{t.name}</span><span className="top-dur">{fmtMins(t.mins)}</span></div>)}</>
          }
        </div>
      </div>
      <div className="chart-card"><div className="chart-title">Time Distribution</div><div className="chart-sub">Hours worked throughout the day (6am–10pm)</div><canvas ref={lineRef} style={{ maxHeight: 190 }} /></div>
    </div>
  );
};

// ══ MY PROFILE ══
const ProfilePage = ({ user, tasks }) => {
  const [empTasks, setEmpTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(() => user?.id ? localStorage.getItem(`gh_photo_${user.id}`) : null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const initials = `${(user?.firstName || '?')[0]}${(user?.lastName || '?')[0]}`.toUpperCase();
  useEffect(() => { (async () => { const r = await api.getEmployeeTasks({ userId: user.id }); if (r.success) setEmpTasks(r.tasks || []); setLoading(false); })(); }, []);
  const handlePhotoUpload = (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 5242880) { alert('File too large (max 5MB)'); return; } const reader = new FileReader(); reader.onload = (event) => { const base64 = event.target.result; setPhoto(base64); setUploadedFile(file.name); if (user?.id) localStorage.setItem(`gh_photo_${user.id}`, base64); alert('✅ Profile picture updated successfully!'); }; reader.readAsDataURL(file); };
  const allMins = tasks.reduce((s, t) => s + Number(t.durationMinutes || 0), 0);
  const todayT = tasks.filter(t => t.date === todayStr());
  const uniqueDays = [...new Set(tasks.map(t => t.date))].length;
  const avgDay = uniqueDays ? Math.round(allMins / uniqueDays) : 0;
  const taskMap = {}; tasks.forEach(t => { taskMap[t.taskName] = (taskMap[t.taskName] || 0) + Number(t.durationMinutes || 0); });
  const favTask = Object.entries(taskMap).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="page">
      <div className="page-hdr"><h1 className="page-title">My Profile</h1><p className="page-sub">Your personal account and productivity overview</p></div>
      {/* Profile header with photo upload */}
      <div className="profile-header" style={{ backgroundImage: 'url(https://rec-data.kalibrr.com/logos/KBZX7J2BDXZEXSF4WMUN-5a1d0b9b.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.3)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div className="profile-avatar" style={{ width: 120, height: 120, fontSize: 48, position: 'relative', border: '4px solid white' }}>
            {photo ? <img src={photo} alt={user?.firstName} /> : initials}
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, background: 'var(--p)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid white' }}>
              <span style={{ fontSize: 18 }}>📷</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          </div>
          <div style={{ color: 'white', position: 'relative', zIndex: 1 }}>
            <div className="profile-name" style={{ color: 'white', fontSize: 28 }}>{user?.firstName} {user?.lastName}</div>
            <div className="profile-email" style={{ color: 'rgba(255,255,255,.9)', fontSize: 14 }}>{user?.email}</div>
            {user?.dept && <div className="profile-dept" style={{ color: 'rgba(255,255,255,.95)', fontSize: 13, marginTop: 6 }}>📋 {user.dept}</div>}
            {uploadedFile && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,.8)', background: 'rgba(0,0,0,.3)', padding: '4px 8px', borderRadius: 4 }}>✅ Updated: {uploadedFile}</div>}
            {user?.gender && <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,.9)' }}>{user.gender === 'male' ? '👨 Male' : user.gender === 'female' ? '👩 Female' : '🧑 Other'}</div>}
          </div>
        </div>
      </div>
      {/* Stats grid */}
      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-card-title">📊 Productivity Stats</div>
          <div className="profile-stat"><span className="profile-stat-lbl">Total Hours Tracked</span><span className="profile-stat-val">{Math.floor(allMins / 60)}h {allMins % 60}m</span></div>
          <div className="profile-stat"><span className="profile-stat-lbl">Total Tasks Logged</span><span className="profile-stat-val">{tasks.length}</span></div>
          <div className="profile-stat"><span className="profile-stat-lbl">Today's Tasks</span><span className="profile-stat-val">{todayT.length}</span></div>
          <div className="profile-stat"><span className="profile-stat-lbl">Avg Per Day</span><span className="profile-stat-val">{fmtMins(avgDay)}</span></div>
          <div className="profile-stat"><span className="profile-stat-lbl">Active Days</span><span className="profile-stat-val">{uniqueDays}</span></div>
          {favTask && <div className="profile-stat"><span className="profile-stat-lbl">Top Task</span><span className="profile-stat-val" style={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{favTask[0]}</span></div>}
        </div>
        <div className="profile-card">
          <div className="profile-card-title">🏢 Account Info</div>
          <div className="profile-stat"><span className="profile-stat-lbl">Name</span><span className="profile-stat-val">{user?.firstName} {user?.lastName}</span></div>
          <div className="profile-stat"><span className="profile-stat-lbl">Email</span><span className="profile-stat-val" style={{ fontSize: 11 }}>{user?.email}</span></div>
          <div className="profile-stat"><span className="profile-stat-lbl">Department</span><span className="profile-stat-val" style={{ fontSize: 11 }}>{user?.dept || '—'}</span></div>
          <div className="profile-stat"><span className="profile-stat-lbl">Gender</span><span className="profile-stat-val">{user?.gender === 'male' ? 'Male' : user?.gender === 'female' ? 'Female' : 'Other'}</span></div>
          <div style={{ marginTop: 13, padding: '9px 12px', background: 'var(--bg)', borderRadius: 'var(--rsm)', fontSize: 11.5, color: 'var(--tx2)', border: '1px solid var(--bd)' }}>🔒 To change your department, contact your admin. Only 1 change allowed per 30 days.</div>
        </div>
      </div>
      {/* Admin-assigned tasks */}
      <div className="emp-tasks-section">
        <div className="sec-hdr"><span className="sec-title">📋 My Assigned Tasks</span><span style={{ fontSize: 12, color: 'var(--tx2)' }}>{empTasks.length} tasks assigned by admin</span></div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 28, color: 'var(--tx2)' }}><div className="spinner" style={{ margin: '0 auto 8px', borderTopColor: 'var(--p)', borderColor: 'rgba(26,58,245,.2)', width: 22, height: 22 }} /><p style={{ fontSize: 12 }}>Loading tasks…</p></div>
            : empTasks.length === 0 ? <div className="empty-state" style={{ padding: 28 }}><p>No tasks assigned yet. Your admin will assign tasks soon!</p></div>
            : empTasks.map(t => (
              <div key={t.id} className="emp-task-row">
                <div>
                  <div className="emp-task-name">{t.taskName}</div>
                  <div className="emp-task-meta">{t.description || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span className="freq-badge">{t.frequency || 'Daily'}</span>
                  <span className={`prio-${t.priority || 'Medium'}`}>{t.priority || 'Medium'}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
      <div style={{ background: 'var(--card)', borderRadius: 'var(--r)', padding: '16px 18px', border: '1px solid var(--bd)', fontSize: 12, color: 'var(--tx2)', lineHeight: 1.7 }}>
        💡 <strong>Tip:</strong> Your assigned tasks above are your regular responsibilities. Use the timer on the Dashboard to track your time! All your logged hours contribute to your productivity report, visible to your admin.
      </div>
    </div>
  );
};

// ══ IDLE WATCHER ══
const IDLE_WARN = 5 * 60, IDLE_MAX = 10 * 60;
const IdleWatcher = ({ user, onIdleOut }) => {
  const [idleSecs, setIdleSecs] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [popSecs, setPopSecs] = useState(0);
  const lastAct = useRef(Date.now());
  const reset = useCallback(() => { lastAct.current = Date.now(); if (!showPopup) setIdleSecs(0); }, [showPopup]);
  useEffect(() => { const evts = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click', 'scroll']; evts.forEach(e => window.addEventListener(e, reset, { passive: true })); return () => evts.forEach(e => window.removeEventListener(e, reset)); }, [reset]);
  useEffect(() => { const t = setInterval(() => { const s = Math.floor((Date.now() - lastAct.current) / 1000); setIdleSecs(s); if (s >= IDLE_WARN && !showPopup) { setShowPopup(true); setPopSecs(0); } }, 1000); return () => clearInterval(t); }, [showPopup]);
  useEffect(() => { if (!showPopup) return; const t = setInterval(() => setPopSecs(p => { const n = p + 1; if (n >= IDLE_MAX - IDLE_WARN) { clearInterval(t); setShowPopup(false); onIdleOut && onIdleOut(idleSecs); } return n; }), 1000); return () => clearInterval(t); }, [showPopup]);
  const here = () => { setShowPopup(false); setIdleSecs(0); lastAct.current = Date.now(); fireLog('IDLE_DISMISSED', `Back after ${Math.round(idleSecs / 60)} min idle`, user); };
  const out = () => { setShowPopup(false); setIdleSecs(0); lastAct.current = Date.now(); fireLog('IDLE_OUT', `Away after ${Math.round(idleSecs / 60)} min idle`, user); onIdleOut && onIdleOut(idleSecs); };
  const grace = IDLE_MAX - IDLE_WARN, pct = Math.min(100, (popSecs / grace) * 100);
  const mm = String(Math.floor(idleSecs / 60)).padStart(2, '0'), ss = String(idleSecs % 60).padStart(2, '0');
  if (!showPopup) return null;
  return (
    <div className="idle-overlay">
      <div className="idle-card">
        <div className="idle-icon">⏰</div>
        <div className="idle-title">Still there?</div>
        <div className="idle-msg">No activity for <strong>{Math.round(idleSecs / 60)} minutes</strong>.<br />Your session clock is still running.</div>
        <div className="idle-time">{mm}:{ss}</div>
        <div className="idle-btns"><button className="idle-here" onClick={here}>👋 I'm here</button><button className="idle-out" onClick={out}>🚶 I stepped away</button></div>
        <div className="idle-prog-wrap"><div className="idle-prog-fill" style={{ width: `${pct}%`, background: pct > 70 ? 'var(--danger)' : 'var(--warn)' }} /></div>
        <p style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 7 }}>Auto-dismissing in {grace - popSecs}s</p>
      </div>
    </div>
  );
};

// ══ ROOT APP ══
const App = () => {
  const [page, setPage] = useState('login');
  const [regData, setRegData] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loginTime, setLoginTime] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [notif, setNotif] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gh_dark') === '1');

  const holiday = getTodayHoliday();
  const anniversary = isAnniversary();
  const isRedTheme = user && hasRedThemeName(user.firstName);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('gh_dark', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    if (isRedTheme) document.body.setAttribute('data-special-theme', 'red');
    else document.body.removeAttribute('data-special-theme');
  }, [isRedTheme]);

  const toggleDark = () => setDarkMode(d => !d);

  useEffect(() => {
    const saved = localStorage.getItem('gh_user');
    const sid = localStorage.getItem('gh_session');
    const lt = localStorage.getItem('gh_login_time');
    if (saved) {
      const u = JSON.parse(saved); setUser(u); setSessionId(sid);
      if (lt) { const d = lt.split('T')[0]; if (d === todayStr()) setLoginTime(lt); else { const n = new Date().toISOString(); setLoginTime(n); localStorage.setItem('gh_login_time', n); } }
      setPage('dashboard'); loadTasks(u);
    }
  }, []);

  useEffect(() => { if (!activeTimer) return; const t = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(t); }, [activeTimer]);

  const loadTasks = async u => {
    const uid = u?.id || user?.id; if (!uid) return;
    const res = await api.getTasks({ userId: uid, startDate: '2020-01-01', endDate: todayStr() });
    if (res.success) setTasks(res.tasks);
  };

  const doLogin = (u, sid) => {
    const lt = new Date().toISOString();
    setUser(u); setSessionId(sid || null); setLoginTime(lt);
    localStorage.setItem('gh_user', JSON.stringify(u));
    if (sid) localStorage.setItem('gh_session', sid);
    localStorage.setItem('gh_login_time', lt);
    loadTasks(u); setPage('dashboard');
    setNotif({ msg: `Welcome back, ${u.firstName}! 👋`, type: 'success' });
    fireLog('LOGIN', 'Login successful', u);
  };

  const doRegister = u => {
    const lt = new Date().toISOString();
    setUser(u); setLoginTime(lt);
    localStorage.setItem('gh_user', JSON.stringify(u));
    localStorage.setItem('gh_login_time', lt);
    setTasks([]); setPage('dashboard');
    setNotif({ msg: `Account created! Welcome, ${u.firstName}! 🎉`, type: 'success' });
    fireLog('REGISTER', `Account created: ${u.firstName} ${u.lastName} <${u.email}>`, u);
  };

  const doLogout = async () => {
    if (user) { fireLog('LOGOUT', 'User logged out', user); await api.logout({ userId: user.id, userEmail: user.email, sessionId }).catch(() => { }); }
    setUser(null); setSessionId(null); setLoginTime(null); setTasks([]); setActiveTimer(null); setElapsed(0);
    document.body.removeAttribute('data-special-theme');
    localStorage.removeItem('gh_user'); localStorage.removeItem('gh_session'); localStorage.removeItem('gh_login_time');
    setPage('login');
  };

  const handleIdleOut = idleSecs => {
    if (activeTimer) {
      api.timerStop({ timerId: activeTimer.timerId, userId: user?.id, userEmail: user?.email, taskName: activeTimer.taskName, durationSeconds: elapsed, savedAsTask: false });
      setActiveTimer(null); setElapsed(0);
      setNotif({ msg: `⏸ Timer paused — ${Math.round(idleSecs / 60)} min idle`, type: 'error' });
    }
  };

  const pages = ['dashboard', 'tasks', 'analytics', 'profile'];

  return (
    <>
      {/* Holiday background */}
      {holiday && <HolidayBg holiday={holiday} />}
      {/* Anniversary */}
      {anniversary && page !== 'login' && page !== 'register' && <AnniversaryBanner />}
      {/* Holiday notification banner */}
      {holiday && page !== 'login' && page !== 'register' && notif === null && (
        <div className="toast" style={{ top: anniversary ? 60 : 16, background: 'linear-gradient(135deg,#1a3af5,#4d6fff,#1a3af5)', color: '#fff', textAlign: 'center', padding: '11px 18px', borderRadius: 'var(--rsm)', fontSize: 13, fontWeight: 600, boxShadow: 'var(--shl)', zIndex: 9999 }}>
          {holiday.emoji} Happy {holiday.name}! Enjoy the day! 🎉
        </div>
      )}
      {/* Notifications */}
      {notif && <Notif msg={notif.msg} type={notif.type} onDone={() => setNotif(null)} />}

      {/* Auth pages */}
      {page === 'login' && <LoginPage onLogin={doLogin} onGoRegister={() => setPage('register')} darkMode={darkMode} toggleDark={toggleDark} />}
      {page === 'register' && <RegisterStep1 onNext={d => { setRegData(d); setPage('register-face'); }} onGoLogin={() => setPage('login')} darkMode={darkMode} toggleDark={toggleDark} />}
      {page === 'register-face' && <RegisterStep2 formData={regData} onRegister={doRegister} onGoLogin={() => setPage('login')} />}

      {/* App layout */}
      {pages.includes(page) && user && (
        <div className="layout">
          <Sidebar page={page} setPage={setPage} user={user} onLogout={doLogout} loginTime={loginTime} darkMode={darkMode} toggleDark={toggleDark} />
          <main className="main" style={{ marginTop: anniversary ? 48 : 0 }}>
            {page === 'dashboard' && <DashboardPage user={user} tasks={tasks} onTasksChanged={() => loadTasks(user)} activeTimer={activeTimer} setActiveTimer={setActiveTimer} elapsed={elapsed} setElapsed={setElapsed} loginTime={loginTime} />}
            {page === 'tasks' && <TasksPage user={user} tasks={tasks} onTasksChanged={() => loadTasks(user)} />}
            {page === 'analytics' && <AnalyticsPage tasks={tasks} darkMode={darkMode} />}
            {page === 'profile' && <ProfilePage user={user} tasks={tasks} />}
          </main>
          <IdleWatcher user={user} onIdleOut={handleIdleOut} />
          <WashHandReminder user={user} />
        </div>
      )}
    </>
  );
};

export default App;