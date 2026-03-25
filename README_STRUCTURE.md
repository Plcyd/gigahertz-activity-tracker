# 📊 Gigahertz Activity Tracker

A comprehensive, modularized React + Vite application suite for employee time tracking and admin management.

## 🏗️ Project Structure

```
gigahertz-activity-tracker/
├── 🟦 Employee App (Root Directory)
│   ├── index.html                 # Vite entry point
│   ├── package.json              # Dependencies & scripts
│   ├── vite.config.js            # Vite config (port 5173)
│   └── src/
│       ├── main.jsx              # React root renderer
│       ├── App.jsx               # Main app component (~1300 lines)
│       └── styles.css            # All styling (~800 lines)
│
└── 🟫 Admin App (Separate Application)
    ├── index.html                # Vite entry point
    ├── package.json              # Dependencies & scripts
    ├── vite.config.js            # Vite config (port 5174)
    └── src/
        ├── main.jsx              # React root renderer
        ├── App.jsx               # Admin app (~500 lines)
        └── styles.css            # Admin styling
```

---

## 🚀 Technologies Used

- **React 18.2.0** - UI component framework
- **Vite 5.0.8** - Modern build tool & dev server
- **Chart.js 4.4.0** - Data visualization (Employee app only)
- **react-chartjs-2** - React Chart.js wrapper
- **CSS Variables** - Theming system (Light/Dark + Color themes)
- **Local Storage** - Demo mode data persistence
- **Google Apps Script** - Optional production API integration

---

## 📱 App Features

### Employee App (Port 5173)
- 🔐 **Authentication** - Register/Login with profile photos
- ⏱️ **Time Tracking** - Session timer with task assignments
- 📊 **Analytics** - Charts and hourly/daily/weekly reports
- 📋 **Task Management** - View assigned tasks by department
- 🎨 **Themes** - Light/Dark mode + Red theme variant
- 💤 **Idle Detection** - 5-10 min idle monitoring
- 📸 **Camera Integration** - Face capture for profile photos
- 🎉 **Features** - Holiday themes, easter eggs, animations

### Admin App (Port 5174)
- 🔐 **Secure Login** - Admin-only access (gigaadmin@gmail.com / popo9090!)
- 📊 **Dashboard** - System overview (users, tasks, hours, activities)
- 👥 **Employee Management** - View/search employees, change departments (30-day lock)
- ✅ **Task Assignment** - Create/edit/delete admin tasks
- 📈 **Activity Logs** - Multi-filter activity tracking
- 🏢 **Department Management** - Dept info and task templates
- 🎨 **Theme System** - 4 color options (Blue/Red/Forest/Ocean) + Light/Dark mode

---

## 🔧 Installation & Setup

### 1. Install Root Dependencies (for both apps)
```bash
npm install
```

### 2. Install Admin App Dependencies
```bash
cd admin && npm install && cd ..
```

---

## 🏃 Running the Applications

### Option A: Run Both Apps Simultaneously

**Terminal 1 - Employee App:**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 - Admin App:**
```bash
cd admin && npm run dev
# Runs on http://localhost:5174
```

### Option B: Run Individual Apps

**Employee App Only:**
```bash
npm run dev          # Dev mode on port 5173
npm run build        # Build for production
```

**Admin App Only:**
```bash
cd admin
npm run dev          # Dev mode on port 5174
npm run build        # Build for production (outputs to ../dist/admin)
```

---

## 🔑 Default Credentials

### Employee App
- No pre-configured accounts (register to create new account)
- Demo uses local storage with seeded employee list

### Admin App
- **Email:** `gigaadmin@gmail.com`
- **Password:** `popo9090!`

---

## 📊 Data Structure

### Employees
- ID, Name, Email, Department
- Login tracking (loginCount, lastLoginAt)
- Department change history (with 30-day lock)
- Profile photo (Base64 or URL)

### Tasks
- Employee-specific task assignments
- Frequency (Daily/Weekly/Monthly/As Needed)
- Priority levels (High/Medium/Low)
- Duration tracking

### Activity Logs
- User actions (LOGIN, LOGOUT, REGISTER, TASK_ADD, TASK_EDIT, DEPT_CHANGE)
- Timestamps for analytics
- Department-specific activity filtering

---

## 🎨 Theming System

### Light/Dark Mode
Both apps support automatic theme switching:
```javascript
localStorage.getItem('gh_dark') === '1' ? 'dark' : 'light'
```

### Admin Color Themes
```javascript
localStorage.getItem('gh_admin_theme') // 'blue' | 'red' | 'forest' | 'ocean'
```

### CSS Variables
```css
--p:      Primary color (theme-dependent)
--ok:     Success indicator (#15803d)
--warn:   Warning indicator (#d97706)
--err:    Error indicator (#dc2626)
--tx:     Text color (theme-dependent)
--tx2:    Secondary text (theme-dependent)
--tx3:    Tertiary text (theme-dependent)
--bg:     Background (theme-dependent)
--bg2:    Secondary background (theme-dependent)
--card:   Card background (theme-dependent)
--bd:     Border color (theme-dependent)
```

---

## 🗄️ Local Storage Schema

### Keys
- `gh_users` - Employee accounts
- `gh_tasks` - Task definitions
- `gh_emp_tasks` - Employee task assignments
- `gh_activity` - Activity logs
- `gh_dept_changes` - Department change audit trail
- `gh_dark` - Theme preference ('0' or '1')
- `gh_admin_theme` - Admin color theme
- `gh_admin_session` - Admin login state

### Demo Data
The admin app includes seeded data:
- 12 employees across all departments
- Pre-configured task templates (5+ per department)
- Sample activity logs for testing

---

## 🔒 API Integration

### Production Mode
To use production APIs instead of local storage:

**Employee App:** Update `APPS_SCRIPT_URL` in `src/App.jsx`
```javascript
const APPS_SCRIPT_URL = 'https://your-google-apps-script-deployment-url'
```

**Admin App:** Update `APPS_SCRIPT_URL` in `admin/src/App.jsx`

API expects endpoints:
- `GET /users` - Fetch all employees
- `POST /activity-log` - Record user activities
- `GET /tasks` - Fetch task assignments
- `POST /task` - Create/update tasks

---

## 🛠️ Development Tips

### File Organization
- **Components** → All components defined inline in App.jsx (ready to extract further)
- **Styles** → Centralized in styles.css with CSS variables
- **Configuration** → Top of App.jsx (easily customizable)
- **APIs** → Abstraction layer (`localAdmin` / `remoteAdmin`)

### Adding New Pages
1. Create component function in App.jsx
2. Add to navigation array (sidebar)
3. Add conditional render in main switch
4. Add styling to styles.css

Example:
```javascript
const MyNewPage = () => (
  <div className="page">
    <div className="ph">
      <h1 className="pt">📝 My Page</h1>
    </div>
    {/* Content here */}
  </div>
)

// In navigation array:
nav.push({ id: 'mypage', label: 'My Page', icon: '📝' })

// In page switch:
{page === 'mypage' && <MyNewPage />}
```

### Responsive Design
Both apps are fully responsive with breakpoints:
- Desktop: Full sidebar + main content
- Tablet (768px): Collapsed sidebar icons only
- Mobile (480px): Simplified grid layouts

---

## 📦 Build & Deployment

### Build for Production

**Employee App:**
```bash
npm run build
# Outputs to: ./dist/
```

**Admin App:**
```bash
cd admin && npm run build
# Outputs to: ../dist/admin/
```

### Deploy to Server
Both builds are static HTML + JS and can be deployed to:
- Vercel
- Netlify
- GitHub Pages
- Traditional web servers (Apache, Nginx)

---

## 🐛 Troubleshooting

### App won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For admin app:
cd admin && rm -rf node_modules package-lock.json
npm install
```

### Port conflicts
- Change port in vite.config.js:
  ```javascript
  server: { port: 3000 } // Use different port
  ```

### Loss of data
- Check browser console for errors
- Verify localStorage is enabled
- Check Application tab in DevTools

---

## 📄 License
Internal Project - Gigahertz

## 👥 Contributors
Development team at Gigahertz

---

## 📞 Support
For issues or questions, contact the development team.

---

**Last Updated:** March 2025  
**Framework:** React 18.2.0 + Vite 5.0.8  
**Status:** Production Ready ✅
