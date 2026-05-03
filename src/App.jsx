import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import TomorrowTasks from './pages/TomorrowTasks.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import Reports from './pages/Reports.jsx'
import Finance from './pages/Finance.jsx'
import TodayPopup from './components/TodayPopup.jsx'
import { supabase } from './lib/supabase.js'

const NAV = [
  { to: '/', icon: '◈', label: '대시보드' },
  { to: '/projects', icon: '◉', label: '프로젝트' },
  { to: '/tomorrow', icon: '◎', label: '내일 할 일' },
  { to: '/calendar', icon: '▦', label: '달력' },
  { to: '/reports', icon: '◆', label: '리포트' },
]

export default function App() {
  const [showPopup, setShowPopup] = useState(false)
  const [todayTasks, setTodayTasks] = useState([])
  const [todayEvents, setTodayEvents] = useState([])
  const location = useLocation()

  useEffect(() => {
    fetchTodayTasks()
    // 앱 실행 시 팝업
    const shown = sessionStorage.getItem('popup_shown')
    if (!shown) {
      setTimeout(() => setShowPopup(true), 600)
      sessionStorage.setItem('popup_shown', '1')
    }
  }, [])

  async function fetchTodayTasks() {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: dTasks }, { data: dEvents }] = await Promise.all([
      supabase.from('daily_tasks').select('*').eq('task_date', today).order('assigned_to'),
      supabase.from('calendar_events').select('*').eq('event_date', today).order('assigned_to')
    ])
    setTodayTasks(dTasks || [])
    setTodayEvents(dEvents || [])
  }

  const isFinance = location.pathname.startsWith('/finance')

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">한<span>페이지</span></div>
        <nav className="sidebar-nav">
          <div className="nav-section">메뉴</div>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          <div className="nav-section" style={{ marginTop: 12 }}>재무</div>
          <NavLink
            to="/finance"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">₩</span>
            매출 관리
          </NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard onRefresh={fetchTodayTasks} />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/tomorrow" element={<TomorrowTasks />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/finance" element={<Finance />} />
        </Routes>
      </main>

      {showPopup && (
        <TodayPopup
          tasks={todayTasks}
          events={todayEvents}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  )
}
