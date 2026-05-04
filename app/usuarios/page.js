'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', papel: 'operador', centros: [] })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const [u, c] = await Promise.all([api.get('/usuarios'), api.get('/centros')])
      setUsuarios(u)
      setCentros(c)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  async function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', email: '', senha: '', papel: 'operador', centros: [] })
    setErro('')
    setModal(true)
  }

  async function abrirEditar(u) {
    const { centros: cList } = await api.get(`/usuarios/${u.id}`)
    setEditando(u)
    setForm({ nome: u.nome, email: u.email, senha: '', papel: u.papel, centros: (cList || []).map(c => c.centro_id) })
    setErro('')
    setModal(true)
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      const payload = { ...form }
      if (!payload.senha) delete payload.senha
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, payload)
      } else {
        await api.post('/usuarios', payload)
      }
      setModal(false)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function toggleAtivo(u) {
    if (!confirm(`${u.ativo ? 'Desativar' : 'Ativar'} o usuario ${u.nome}?`)) return
    await api.put(`/usuarios/${u.id}`, { ativo: !u.ativo })
    carregar()
  }

  async function apagar(u) {
    if (!confirm(`Apagar permanentemente o usuario ${u.nome}? Esta acao nao pode ser desfeita.`)) return
    try {
      await api.delete(`/usuarios/${u.id}`)
      carregar()
    } catch (e) { alert(e.message) }
  }

  function toggleCentro(id) {
    setForm(f => ({
      ...f,
      centros: f.centros.includes(id) ? f.centros.filter(c => c !== id) : [...f.centros, id]
    }))
  }

  const centrosPorEstoque = centros.reduce((acc, c) => {
    const est = c.estoques?.nome || 'Outros'
    if (!acc[est]) acc[est] = []
    acc[est].push(c)
    return acc
  }, {})

  return (
    <AppLayout title="Usuarios">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Usuarios</h1>
          <p className="text-muted text-sm mt-1">Gerencie acessos e permissoes</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo usuario</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.nome}</td>
                    <td className="text-sm text-muted">{u.email}</td>
                    <td><span className={`badge ${u.papel === 'admin' ? 'badge-blue' : 'badge-gray'}`}>{u.papel === 'admin' ? 'Admin' : 'Operador'}</span></td>
                    <td><span className={`badge ${u.ativo ? 'badge-green' : 'badge-red'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(u)}>Editar</button>
                        <button className={`btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-secondary'}`} onClick={() => toggleAtivo(u)}>
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => apagar(u)}>Apagar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editando ? 'Editar usuario' : 'Novo usuario'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Nome *</label>
                <input className="input" placeholder="Nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">E-mail *</label>
                  <input className="input" type="email" placeholder="email@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">{editando ? 'Nova senha (opcional)' : 'Senha *'}</label>
                  <input className="input" type="password" placeholder="••••••••" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="label">Papel *</label>
                <select className="select" value={form.papel} onChange={e => setForm(f => ({ ...f, papel: e.target.value, centros: [] }))}>
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {form.papel === 'operador' && (
                <div className="field">
                  <label className="label">Centros com acesso</label>
                  <div className="card card-pad" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(centrosPorEstoque).map(([estoque, lista]) => (
                      <div key={estoque}>
                        <div className="text-xs font-semibold text-muted" style={{ marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>{estoque}</div>
                        {lista.map(c => (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.3rem 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.centros.includes(c.id)} onChange={() => toggleCentro(c.id)} />
                            <span className="text-sm">{c.nome}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando || !form.nome || !form.email}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
