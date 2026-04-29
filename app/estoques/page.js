'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function EstoquesPage() {
  const [estoques, setEstoques] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nome: '', descricao: '', localizacao: '', estoque_id: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const data = await api.get('/estoques')
      setEstoques(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  async function salvarEstoque() {
    setErro('')
    setSalvando(true)
    try {
      await api.post('/estoques', { nome: form.nome, descricao: form.descricao })
      setModal(null)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function salvarCentro() {
    setErro('')
    setSalvando(true)
    try {
      await api.post('/centros', { estoque_id: form.estoque_id, nome: form.nome, localizacao: form.localizacao })
      setModal(null)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  function abrirCentro(estoque_id) {
    setForm({ nome: '', localizacao: '', estoque_id })
    setErro('')
    setModal('centro')
  }

  return (
    <AppLayout title="Estoques e Centros">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Estoques e Centros</h1>
          <p className="text-muted text-sm mt-1">Gerencie a estrutura de armazenamento</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ nome: '', descricao: '' }); setErro(''); setModal('estoque') }}>
          + Novo estoque
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      ) : (
        estoques.map(e => (
          <div key={e.id} className="card mb-4">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>{e.nome} {e.descricao && <span className="text-sm text-muted">— {e.descricao}</span>}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => abrirCentro(e.id)}>+ Centro</button>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {(!e.centros || e.centros.length === 0) ? (
                <p className="text-sm text-muted">Nenhum centro cadastrado</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem' }}>
                  {e.centros.filter(c => c.ativo).map(c => (
                    <div key={c.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: '.5rem .85rem' }}>
                      <div style={{ fontWeight: 500, fontSize: '.875rem' }}>{c.nome}</div>
                      {c.localizacao && <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{c.localizacao}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {modal === 'estoque' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Novo estoque</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Nome *</label>
                <input className="input" placeholder="Ex: Galpao Central" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Descricao</label>
                <input className="input" placeholder="Descricao opcional" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarEstoque} disabled={salvando || !form.nome}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'centro' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Novo centro</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Estoque</label>
                <select className="select" value={form.estoque_id} onChange={e => setForm(f => ({ ...f, estoque_id: e.target.value }))}>
                  {estoques.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Nome do centro *</label>
                <input className="input" placeholder="Ex: Prateleira A..." value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCentro} disabled={salvando || !form.nome}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
