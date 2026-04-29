'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import { getUsuario } from '../../lib/api'

export default function AppLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const usuario = getUsuario()
    if (!usuario) router.replace('/login')
  }, [])

  if (!mounted) return null

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <div className="topbar">
          <button className="btn btn-ghost btn-icon menu-toggle" onClick={() => setSidebarOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          {title && <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h2>}
        </div>
        <div className="page">
          {children}
        </div>
      </div>
    </div>
  )
}
