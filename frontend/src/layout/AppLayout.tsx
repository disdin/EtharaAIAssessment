import { NavLink, Outlet } from 'react-router-dom'

import '@/layout/AppLayout.css'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined
}

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="app-brand" end>
          HRMS Lite
        </NavLink>
        <nav className="app-nav" aria-label="Primary">
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/employees" className={navClass}>
            Employees
          </NavLink>
          <NavLink to="/attendance" className={navClass}>
            Attendance
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
