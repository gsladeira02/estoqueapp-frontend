'use client'
import { useState } from 'react'
import { api, salvarSessao } from '../../lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const data = await api.post('/auth/login', { email, senha })
      salvarSessao(data.token, data.usuario)
      window.location.href = '/dashboard'
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem', marginBottom: '.5rem' }}>
            <div className="logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-.02em' }}>EstoqueApp</span>
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '.875rem' }}>Acesse sua conta para continuar</p>
        </div>

        <div className="card card-pad" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label className="label">Senha</label>
              <input className="input" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} required autoComplete="current-password" />
            </div>
            {erro && <div className="alert alert-red" style={{ fontSize: '.8rem' }}>{erro}</div>}
            <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', marginTop: '.25rem', padding: '.7rem' }}>
              {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.75rem', color: 'var(--text-3)' }}>
          EstoqueApp {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
