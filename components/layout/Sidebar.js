'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUsuario, logout, isAdmin } from '../../lib/api'

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname()
  const usuario = getUsuario()
  const admin = isAdmin()

  const navItems = [
    { href: '/dashboard', label: 'Painel' },
    { href: '/posicao', label: 'Posicao de Estoque' },
    { href: '/movimentacoes', label: 'Movimentacoes' },
    { href: '/transferencias', label: 'Transferencias' },
    { href: '/produtos', label: 'Produtos' },
    { href: '/relatorios', label: 'Relatorios' },
  ]

  const adminItems = [
    { href: '/estoques', label: 'Estoques e Centros' },
    { href: '/usuarios', label: 'Usuarios' },
  ]

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 99 }} />
      )}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="nav-logo">
          <div className="logo-mark">
            <div className="logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            EstoqueApp
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Geral</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item${pathname === item.href ? ' active' : ''}`} onClick={onClose}>
              {item.label}
            </Link>
          ))}

          {admin && (
            <>
              <div className="nav-label" style={{ marginTop: '.75rem' }}>Administracao</div>
              {adminItems.map(item => (
                <Link key={item.href} href={item.href} className={`nav-item${pathname === item.href ? ' active' : ''}`} onClick={onClose}>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </div>

        <div className="nav-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.5rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-s)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                {usuario?.nome?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nome}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{admin ? 'Administrador' : 'Operador'}</div>
            </div>
          </div>
          <button className="btn btn-ghost w-full btn-sm" onClick={logout} style={{ justifyContent: 'flex-start', gap: '.5rem', color: 'var(--text-2)' }}>
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
