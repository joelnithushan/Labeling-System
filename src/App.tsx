import { useState, useEffect, useCallback } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import PrintLabel from './pages/PrintLabel'
import Barcodes from './pages/Barcodes'
import Settings from './pages/Settings'
import Login from './pages/Login'

const SESSION_KEY = 'mill_auth'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem(SESSION_KEY) === '1'
  })

  const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    const settings = await window.electron.db.getSettings()
    const valid =
      username === (settings.username || 'admin') &&
      password === (settings.password || 'admin')
    if (valid) {
      localStorage.setItem(SESSION_KEY, '1')
      setIsLoggedIn(true)
    }
    return valid
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setIsLoggedIn(false)
  }, [])

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-900 overflow-hidden">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
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
