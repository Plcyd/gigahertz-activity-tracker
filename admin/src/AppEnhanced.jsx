import { useState, useEffect, useRef, useCallback } from 'react'

// ══ CONFIG ══
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnS3-Mf2Qbp481UszTmwbHYvxakDlpl3AbXr5pHNLnIcMRbDpVqsw7b4bNtLWLVT_u/exec'
const USE_LOCAL = APPS_SCRIPT_URL === 'https://script.google.com/macros/s/AKfycbwnS3-Mf2Qbp481UszTmwbHYvxakDlpl3AbXr5pHNLnIcMRbDpVqsw7b4bNtLWLVT_u/exec'
const ADMIN_EMAIL = 'gigaadmin@gmail.com'
const ADMIN_PASS = 'popo9090!'

const DEPARTMENTS = ['AUDIT', 'AMS', 'ACCOUNTING', 'HR', 'MARKETING', 'PROCESS IMPROVEMENT', 'SALES AND SERVICE SUPPORT', 'ONLINE SALES', 'RMA', 'PRODUCT DEPARTMENT', 'FACILITIES', 'WAREHOUSE']

const DEPT_TASK_TEMPLATES = {
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
}

const FREQ_OPTIONS = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'As Needed']
const PRIO_OPTIONS = ['High', 'Medium', 'Low']

const ACTION_META = {
  REGISTER: { label: 'Registered', c: '#15803d', bg: '#ecfdf5' },
  LOGIN: { label: 'Logged In', c: '#1a3af5', bg: '#eef1ff' },
  LOGOUT: { label: 'Logged Out', c: '#64748b', bg: '#f1f5f9' },
  TASK_ADD: { label: 'Task Added', c: '#15803d', bg: '#ecfdf5' },
  TASK_EDIT: { label: 'Task Edited', c: '#d97706', bg: '#fffbeb' },
  DEPT_CHANGE: { label: 'Dept Changed', c: '#9333ea', bg: '#faf5ff' },
}

// ══ LOCAL DB ══
const ldb = {
  uid: () => 'id_' + Math.random().toString(36).slice(2),
  get: (k) => JSON.parse(localStorage.getItem(k) || '[]'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  getUsers: () => JSON.parse(localStorage.getItem('gh_users') || '[]'),
  saveUsers: (u) => localStorage.setItem('gh_users', JSON.stringify(u)),
  getTasks: () => JSON.parse(localStorage.getItem('gh_tasks') || '[]'),
  getEmpTasks: () => JSON.parse(localStorage.getItem('gh_emp_tasks') || '[]'),
  saveEmpTasks: (t) => localStorage.setItem('gh_emp_tasks', JSON.stringify(t)),
  getLogs: () => JSON.parse(localStorage.getItem('gh_activity') || '[]'),
  getDeptChanges: () => JSON.parse(localStorage.getItem('gh_dept_changes') || '[]'),
}

const localAdmin = {
  async getAllUsers() {
    return { success: true, users: ldb.getUsers().map(u => ({ ...u, hasPhoto: !!u.photoBase64 })) }
  },
  async getAllLogs(userId, limit) {
    let logs = ldb.getLogs().filter(l => l.userId !== 'admin_001')
    if (userId && userId !== 'ALL') logs = logs.filter(l => l.userId === userId)
    logs.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    return { success: true, logs: limit ? logs.slice(0, limit) : logs }
  },
  async getStats() {
    const users = ldb.getUsers()
    const tasks = ldb.getTasks()
    const logs = ldb.getLogs()
    const et = ldb.getEmpTasks()
    const today = new Date().toISOString().split('T')[0]
    const totalMins = tasks.reduce((s, t) => s + Number(t.durationMinutes || 0), 0)
    return {
      success: true,
      stats: {
        totalUsers: users.length,
        totalTasks: tasks.length,
        todayTasks: tasks.filter(t => t.date === today).length,
        totalMins,
        totalActivities: logs.filter(l => l.userId !== 'admin_001').length,
        empTasksCount: et.length,
        todayLogins: logs.filter(l => l.action === 'LOGIN' && String(l.timestamp || '').startsWith(today)).length,
      },
    }
  },
  async getAllEmpTasks(dept, userId) {
    let t = ldb.getEmpTasks()
    if (dept) t = t.filter(x => x.dept === dept)
    if (userId) t = t.filter(x => x.userId === userId)
    return { success: true, tasks: t }
  },
  async addEmpTask(d) {
    const tasks = ldb.getEmpTasks()
    const id = ldb.uid()
    const now = new Date().toISOString()
    const t = { id, updatedBy: 'admin', createdAt: now, updatedAt: now, ...d }
    tasks.push(t)
    ldb.saveEmpTasks(tasks)
    return { success: true, task: t }
  },
  async updateEmpTask(id, d) {
    const tasks = ldb.getEmpTasks()
    const i = tasks.findIndex(t => t.id === id)
    if (i < 0) return { success: false, error: 'Task not found' }
    tasks[i] = { ...tasks[i], ...d, updatedAt: new Date().toISOString() }
    ldb.saveEmpTasks(tasks)
    return { success: true, task: tasks[i] }
  },
  async deleteEmpTask(id) {
    const tasks = ldb.getEmpTasks()
    const i = tasks.findIndex(t => t.id === id)
    if (i < 0) return { success: false, error: 'Task not found' }
    tasks.splice(i, 1)
    ldb.saveEmpTasks(tasks)
    return { success: true }
  },
  async changeDept({ userId, newDept }) {
    const users = ldb.getUsers()
    const i = users.findIndex(u => u.id === userId)
    if (i < 0) return { success: false, error: 'User not found' }
    const changedAt = users[i].deptChangedAt
    if (changedAt) {
      const days = (Date.now() - new Date(changedAt)) / (1000 * 60 * 60 * 24)
      if (days < 30) {
        const left = Math.ceil(30 - days)
        return { success: false, error: `Dept locked for ${left} more day${left !== 1 ? 's' : ''}. 1 change per 30 days.` }
      }
    }
    const oldDept = users[i].dept || ''
    const now = new Date().toISOString()
    users[i].dept = newDept
    users[i].deptChangedAt = now
    users[i].deptChangedBy = 'admin'
    ldb.saveUsers(users)
    return { success: true, oldDept, newDept }
  },
}

const aapi = USE_LOCAL ? localAdmin : null

// ══ HELPERS ══
const fmtTs = (ts) => {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const fmtMins = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}h ${String(Math.floor(m % 60)).padStart(2, '0')}m`

const Logo = ({ size = 44, white = false }) => (
  <div style={{ width: size, height: size, borderRadius: size > 40 ? 12 : 8, background: white ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>⚡</span>
  </div>
)

const Notif = ({ msg, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2900)
    return () => clearTimeout(t)
  }, [])
  return <div className={'notif ' + type}>{msg}</div>
}

const PwInput = ({ value, onChange, placeholder, onKeyDown }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="pw-wrap">
      <input className="a-input" type={show ? 'text' : 'password'} placeholder={placeholder || '••••••••'} value={value} onChange={onChange} onKeyDown={onKeyDown} style={{ marginBottom: 0 }} />
      <button type="button" className="pw-eye" onClick={() => setShow(s => !s)}>
        {show ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ══ LOGIN ══
const AdminLogin = ({ onLogin, darkMode, toggleDark }) => {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const submit = () => {
    if (!email || !pw) {
      setErr('Fill in all fields.')
      return
    }
    setLoading(true)
    setErr('')
    setTimeout(() => {
      if (email.trim().toLowerCase() === ADMIN_EMAIL && pw === ADMIN_PASS) {
        setLoading(false)
        onLogin()
      } else {
        setLoading(false)
        setErr('Invalid admin credentials.')
      }
    }, 600)
  }

  return (
    <div className="auth-wrap">
      <button onClick={toggleDark} style={{ position: 'absolute', top: 16, right: 18, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', padding: '7px 9px', borderRadius: 8, color: darkMode ? '#fbbf24' : 'rgba(255,255,255,.6)', fontSize: 18 }}>
        {darkMode ? '☀' : '🌙'}
      </button>
      <div className="auth-card">
        <div className="auth-logo">
          <Logo size={52} />
          <span className="auth-logo-name">Gigahertz Admin</span>
        </div>
        <h1 className="auth-title">Admin Panel</h1>
        <p className="auth-sub">Secure administrative access only</p>
        <div className="auth-chip">
          <span>🔐 Administrator Login</span>
        </div>
        {err && <div className="a-err">{err}</div>}
        <label className="a-label">Admin Email</label>
        <input className="a-input" type="email" placeholder="gigaadmin@gmail.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <label className="a-label" style={{ marginTop: 4 }}>
          Password
        </label>
        <div style={{ marginBottom: 14 }}>
          <PwInput value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <button className="a-btn" onClick={submit} disabled={loading}>
          {loading ? <span className="sp-w" /> : '🔐 Sign In as Admin'}
        </button>
        <p className="auth-note">
          Employee login → use <strong>index.html</strong>
        </p>
      </div>
    </div>
  )
}

// ══ ACTIVITY LOG PAGE ══
const ActivityLogPage = () => {
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('ALL')
  const [filterAction, setFilterAction] = useState('ALL')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    (async () => {
      const [logRes, userRes] = await Promise.all([aapi.getAllLogs(), aapi.getAllUsers()])
      if (logRes.success) setLogs(logRes.logs || [])
      if (userRes.success) setUsers(userRes.users || [])
      setLoading(false)
    })()
  }, [])

  const filtered = logs.filter(l => {
    if (filterUser !== 'ALL' && l.userId !== filterUser) return false
    if (filterAction !== 'ALL' && l.action !== filterAction) return false
    if (searchText && !`${l.userEmail || ''} ${l.action || ''}`.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1 className="pt">🔍 Activity Log</h1>
          <p className="ps">Track all user activities and events</p>
        </div>
        <span className="a-chip">{filtered.length} events</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔎 Search email, action..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}
        />
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
          <option value="ALL">👥 All Users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
          <option value="ALL">📋 All Actions</option>
          {Object.entries(ACTION_META).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)' }}>
          <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--p)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: 8 }}>Loading logs…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 8, padding: 24, textAlign: 'center', color: 'var(--tx2)' }}>
          <p style={{ fontSize: 14 }}>No activities found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--bd)', background: 'var(--bg2)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>Action</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>Timestamp</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((log, idx) => {
                const meta = ACTION_META[log.action] || { label: log.action, c: 'var(--tx2)', bg: 'var(--bg2)' }
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--tx)' }}>
                      <div>{log.userEmail || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>
                      <span style={{ background: meta.bg, color: meta.c, padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--tx2)' }}>{fmtTs(log.timestamp)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--tx2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.description || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ══ EMPLOYEES PAGE ══
const EmployeesPage = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [filterDept, setFilterDept] = useState('ALL')
  const [changingDept, setChangingDept] = useState(null)
  const [newDept, setNewDept] = useState('')
  const [notif, setNotif] = useState(null)

  useEffect(() => {
    (async () => {
      const res = await aapi.getAllUsers()
      if (res.success) setEmployees(res.users || [])
      setLoading(false)
    })()
  }, [])

  const filtered = employees.filter(e => {
    if (filterDept !== 'ALL' && e.dept !== filterDept) return false
    if (searchText && !`${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  const handleChangeDept = async () => {
    if (!newDept) return
    const res = await aapi.changeDept({ userId: changingDept.id, newDept })
    if (res.success) {
      setEmployees(employees.map(e => (e.id === changingDept.id ? { ...e, dept: newDept } : e)))
      setNotif({ msg: `✅ Moved ${changingDept.firstName} to ${newDept}`, type: 'success' })
    } else {
      setNotif({ msg: `❌ ${res.error}`, type: 'error' })
    }
    setChangingDept(null)
    setNewDept('')
  }

  return (
    <div className="page">
      {notif && <Notif msg={notif.msg} type={notif.type} onDone={() => setNotif(null)} />}
      <div className="ph">
        <div>
          <h1 className="pt">👥 Employees</h1>
          <p className="ps">Manage team members and departments</p>
        </div>
        <span className="a-chip">{filtered.length} employees</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔎 Search name, email..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}
        />
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
          <option value="ALL">🏢 All Departments</option>
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)' }}>
          <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--p)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: 8 }}>Loading employees…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 8, padding: 24, textAlign: 'center', color: 'var(--tx2)' }}>
          <p style={{ fontSize: 14 }}>No employees found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(emp => (
            <div key={emp.id} style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{emp.firstName} {emp.lastName}</div>
                <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{emp.email}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--tx2)' }}>
                <span>📋 {emp.dept || '—'}</span>
                <span>🔑 {emp.loginCount || 0} logins</span>
              </div>
              <button onClick={() => { setChangingDept(emp); setNewDept(emp.dept); }} style={{ padding: '8px 12px', background: 'var(--p)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                📁 Change Department
              </button>
            </div>
          ))}
        </div>
      )}

      {changingDept && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => setChangingDept(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: 24, maxWidth: 400, margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--tx)' }}>📁 Change Department</h2>
            <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
              Move {changingDept.firstName} {changingDept.lastName} to a new department
            </p>
            <select value={newDept} onChange={e => setNewDept(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', marginBottom: 16, fontSize: 12 }}>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setChangingDept(null)} style={{ flex: 1, padding: '8px 12px', background: 'var(--bd)', color: 'var(--tx)', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleChangeDept} style={{ flex: 1, padding: '8px 12px', background: 'var(--p)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══ TASKS PAGE ══
const TasksPage = () => {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [notif, setNotif] = useState(null)
  const [formData, setFormData] = useState({ userId: '', taskName: '', description: '', frequency: 'Weekly', priority: 'Medium', dept: '' })
  const [filterDept, setFilterDept] = useState('ALL')

  useEffect(() => {
    (async () => {
      const [taskRes, userRes] = await Promise.all([aapi.getAllEmpTasks(), aapi.getAllUsers()])
      if (taskRes.success) setTasks(taskRes.tasks || [])
      if (userRes.success) setUsers(userRes.users || [])
      setLoading(false)
    })()
  }, [])

  const filtered = tasks.filter(t => (filterDept === 'ALL' ? true : t.dept === filterDept))

  const handleAddTask = async () => {
    if (!formData.userId || !formData.taskName || !formData.dept) {
      setNotif({ msg: '❌ Fill in all fields', type: 'error' })
      return
    }
    const res = await aapi.addEmpTask(formData)
    if (res.success) {
      setTasks([...tasks, res.task])
      setShowAdd(false)
      setFormData({ userId: '', taskName: '', description: '', frequency: 'Weekly', priority: 'Medium', dept: '' })
      setNotif({ msg: '✅ Task created successfully', type: 'success' })
    }
  }

  const handleDeleteTask = async id => {
    const res = await aapi.deleteEmpTask(id)
    if (res.success) {
      setTasks(tasks.filter(t => t.id !== id))
      setNotif({ msg: '✅ Task deleted', type: 'success' })
    }
  }

  return (
    <div className="page">
      {notif && <Notif msg={notif.msg} type={notif.type} onDone={() => setNotif(null)} />}
      <div className="ph">
        <div>
          <h1 className="pt">✅ Employee Tasks</h1>
          <p className="ps">Assign and manage employee tasks</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 14px', background: showAdd ? 'var(--ok)' : 'var(--p)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
          {showAdd ? '✅ Done' : '➕ Add Task'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 4 }}>Employee</label>
              <select value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
                <option value="">Select employee...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 4 }}>Department</label>
              <select value={formData.dept} onChange={e => setFormData({ ...formData, dept: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
                <option value="">Select dept...</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 4 }}>Task Name</label>
              <input type="text" placeholder="Task name..." value={formData.taskName} onChange={e => setFormData({ ...formData, taskName: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 4 }}>Frequency</label>
              <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
                {FREQ_OPTIONS.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 4 }}>Priority</label>
              <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
                {PRIO_OPTIONS.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input type="text" placeholder="Description (optional)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', marginTop: 12, padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }} />
          <button onClick={handleAddTask} style={{ marginTop: 12, padding: '8px 14px', background: 'var(--ok)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Create Task
          </button>
        </div>
      )}

      <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ marginBottom: 16, padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--bg)', color: 'var(--tx)', fontSize: 12 }}>
        <option value="ALL">🏢 All Departments</option>
        {DEPARTMENTS.map(d => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)' }}>
          <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--p)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 8, padding: 24, textAlign: 'center', color: 'var(--tx2)' }}>
          <p>No tasks in this filter</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(task => (
            <div key={task.id} style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{task.taskName}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)' }}>📋 {task.dept}</div>
              {task.description && <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{task.description}</div>}
              <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--tx2)' }}>
                <span>{task.frequency}</span>
                <span>•</span>
                <span style={{ color: task.priority === 'High' ? '#dc2626' : task.priority === 'Medium' ? '#d97706' : '#15803d' }}>🎯 {task.priority}</span>
              </div>
              <button onClick={() => handleDeleteTask(task.id)} style={{ marginTop: 4, padding: '6px 10px', background: 'var(--errb)', color: 'var(--err)', border: '1px solid var(--err)', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                🗑 Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══ DEPARTMENTS PAGE ══
const DepartmentsPage = () => {
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [userRes, taskRes] = await Promise.all([aapi.getAllUsers(), aapi.getAllEmpTasks()])
      if (userRes.success) setUsers(userRes.users || [])
      if (taskRes.success) setTasks(taskRes.tasks || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="page">
      <div className="ph">
        <h1 className="pt">🏢 Departments</h1>
        <p className="ps">Department overview and task templates</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)' }}>
          <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--p)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {DEPARTMENTS.map((dept, idx) => {
            const deptUsers = users.filter(u => u.dept === dept)
            const deptTasks = DEPT_TASK_TEMPLATES[dept] || []
            const assignedCount = tasks.filter(t => t.dept === dept).length
            return (
              <div key={dept} style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: ['#1a3af5', '#15803d', '#d97706', '#dc2626'][idx % 4] }} />
                  {dept}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--tx2)' }}>
                  <span>👥 {deptUsers.length} members</span>
                  <span>✅ {assignedCount} tasks</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>📋 Task Templates:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {deptTasks.slice(0, 3).map(t => (
                      <div key={t} style={{ fontSize: 11, color: 'var(--tx)', paddingLeft: 8, borderLeft: '2px solid var(--p)' }}>
                        • {t}
                      </div>
                    ))}
                    {deptTasks.length > 3 && <div style={{ fontSize: 10, color: 'var(--tx2)', fontStyle: 'italic' }}>+{deptTasks.length - 3} more</div>}
                  </div>
                </div>
                <button style={{ padding: '8px 12px', background: 'var(--p)', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  View Details
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══ SIDEBAR ══
const AdminSidebar = ({ page, setPage, onLogout, darkMode, toggleDark, adminTheme, setAdminTheme }) => {
  const nav = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'activity', label: 'Activity Log', icon: '🔍' },
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
  ]
  const themes = [{ id: 'blue', label: 'Blue' }, { id: 'red', label: 'Red' }, { id: 'forest', label: 'Forest' }, { id: 'ocean', label: 'Ocean' }]

  return (
    <div className="sidebar">
      <div className="sb-logo">
        <Logo size={28} white />
        <span className="sb-logo-name">Gigahertz</span>
      </div>
      <nav className="sb-nav">
        <span className="sb-sec">⚡ Admin Panel</span>
        {nav.map(n => (
          <div key={n.id} className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => setPage(n.id)}>
            <span>{n.icon}</span>
            {n.label}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <div className="theme-wrap">
          <div className="theme-lbl">🎨 Theme</div>
          <div className="theme-dots">
            {themes.map(t => (
              <div key={t.id} className={'t-dot' + (adminTheme === t.id ? ' active' : '')} onClick={() => setAdminTheme(t.id)} title={t.label} />
            ))}
          </div>
        </div>
        <div className="sb-user">
          Administrator
          <strong>{ADMIN_EMAIL}</strong>
          <span className="role-pill">⚡ Admin</span>
        </div>
        <button className="sb-btn" onClick={toggleDark}>
          <span>{darkMode ? '☀' : '🌙'}</span>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button className="logout-btn" onClick={onLogout}>
          <span>🚪</span>
          Logout
        </button>
      </div>
    </div>
  )
}

// ══ ROOT APP ══
export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('gh_admin_session') === '1')
  const [page, setPage] = useState('overview')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gh_dark') === '1')
  const [adminTheme, setAdminTheme] = useState(() => localStorage.getItem('gh_admin_theme') || 'blue')
  const [notif, setNotif] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('gh_dark', darkMode ? '1' : '0')
  }, [darkMode])

  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', adminTheme)
    localStorage.setItem('gh_admin_theme', adminTheme)
  }, [adminTheme])

  const toggleDark = () => setDarkMode(d => !d)

  const doLogin = () => {
    localStorage.setItem('gh_admin_session', '1')
    setLoggedIn(true)
    setNotif({ msg: '⚡ Welcome, Admin!', type: 'success' })
  }

  const doLogout = () => {
    localStorage.removeItem('gh_admin_session')
    setLoggedIn(false)
    setPage('overview')
  }

  if (!loggedIn) return <AdminLogin onLogin={doLogin} darkMode={darkMode} toggleDark={toggleDark} />

  return (
    <div className="layout">
      {notif && <Notif msg={notif.msg} type={notif.type} onDone={() => setNotif(null)} />}
      <AdminSidebar page={page} setPage={setPage} onLogout={doLogout} darkMode={darkMode} toggleDark={toggleDark} adminTheme={adminTheme} setAdminTheme={setAdminTheme} />
      <main className="main">
        {page === 'overview' && <OverviewPage />}
        {page === 'activity' && <ActivityLogPage />}
        {page === 'employees' && <EmployeesPage />}
        {page === 'tasks' && <TasksPage />}
        {page === 'departments' && <DepartmentsPage />}
      </main>
    </div>
  )
}

// ══ OVERVIEW ══
const OverviewPage = () => {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [sr, ur] = await Promise.all([aapi.getStats(), aapi.getAllUsers()])
      if (sr.success) setStats(sr.stats)
      if (ur.success) setUsers(ur.users || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="page"><div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--tx2)' }}><div className="sp-d" /><p>Loading…</p></div></div>

  const scards = stats
    ? [
        { icon: '👥', label: 'Employees', val: stats.totalUsers, c: 'var(--p)' },
        { icon: '✅', label: 'Total Tasks', val: stats.totalTasks, c: 'var(--ok)' },
        { icon: '📋', label: "Today's Tasks", val: stats.todayTasks, c: 'var(--warn)' },
        { icon: '⏱', label: 'Hours Tracked', val: stats.totalMins ? fmtMins(stats.totalMins) : '-', c: '#9333ea' },
      ]
    : []

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1 className="pt">⚡ Admin Overview</h1>
          <p className="ps">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <span className="a-chip">🔐 Secure Admin</span>
      </div>
      <div className="sg">
        {scards.map(s => (
          <div key={s.label} className="sc">
            <div className="sl">
              {s.icon} {s.label}
            </div>
            <div className="sv" style={{ color: s.c }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
