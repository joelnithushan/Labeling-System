import { HashRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import PrintLabel from './pages/PrintLabel'
import Barcodes from './pages/Barcodes'
import Settings from './pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-900 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/print" element={<PrintLabel />} />
            <Route path="/barcodes" element={<Barcodes />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
