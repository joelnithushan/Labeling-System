import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Stock from './pages/Stock'
import PrintLabel from './pages/PrintLabel'
import Barcodes from './pages/Barcodes'
import Settings from './pages/Settings'

const AUTH_KEY = 'mill_auth'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem(AUTH_KEY) === '1'
  )

  async function handleLogin(username: string, password: string): Promise<boolean> {
    const settings = await window.electron.db.getSettings()
    const ok = username === settings.username && password === settings.password
    if (ok) localStorage.setItem(AUTH_KEY, '1')
    return ok
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY)
    setIsLoggedIn(false)
  }

  // Apply saved theme on startup
  useEffect(() => {
    window.electron.db.getSettings().then(s => {
      document.documentElement.classList.toggle('theme-light', s.theme === 'light')
    })
  }, [])

  // Keep state in sync if localStorage is changed elsewhere (e.g. another tab)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === AUTH_KEY) setIsLoggedIn(e.newValue === '1')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={async (u, p) => {
          const ok = await handleLogin(u, p)
          if (ok) setIsLoggedIn(true)
          return ok
        }}
      />
    )
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-900 overflow-hidden">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/print" element={<PrintLabel />} />
            <Route path="/barcodes" element={<Barcodes />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
