'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api, isAdmin } from '../../lib/api'

const TIPO_LABEL = { materia_prima: 'Materia-prima', revenda: 'Revenda', ambos: 'Ambos' }
const TIPO_BADGE = { materia_prima: 'badge-blue', revenda: 'badge-green', ambos: 'badge-amber' }

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ sku: '', nome: '', descricao: '', categoria_id: '', tipo: 'materia_prima', unidade: 'un', estoque_minimo: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const admin = isAdmin()

  async function carregar() {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([api.get(`/produtos?busca=${busca}`), api.get('/categorias')])
      setProdutos(p)
      setCategorias(c)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [busca])

  function abrirNovo() {
    setEditando(null)
    setForm({ sku: '', nome: '', descricao: '', categoria_id: '', tipo: 'materia_prima', unidade: 'un', estoque_minimo: '' })
    setErro('')
    setModal(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({ sku: p.sku, nome: p.nome, descricao: p.descricao || '', categoria_id: p.categoria_id, tipo: p.tipo, unidade: p.unidade, estoque_minimo: p.estoque_minimo })
    setErro('')
    setModal(true)
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      if (editando) {
        await api.put(`/produtos/${editando.id}`, form)
      } else {
        await api.post('/produtos', { ...form, estoque_minimo: Number(form.estoque_minimo) || 0 })
      }
      setModal(false)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  return (
    <AppLayout title="Produtos">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Produtos</h1>
          <p className="text-muted text-sm mt-1">Base de dados de produtos</p>
        </div>
        {admin && <button className="btn btn-primary" onClick={abrirNovo}>+ Novo produto</button>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input className="input" placeholder="Buscar por nome ou SKU..." value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : produtos.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhum produto cadastrado</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>Nome</th><th>Categoria</th><th>Tipo</th><th>Unidade</th><th>Min.</th><th></th></tr></thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={p.id}>
                    <td><span className="font-mono text-sm">{p.sku}</span></td>
                    <td style={{ fontWeight: 500 }}>{p.nome}</td>
                    <td className="text-sm text-muted">{p.categorias?.nome}</td>
                    <td><span className={`badge ${TIPO_BADGE[p.tipo]}`}>{TIPO_LABEL[p.tipo]}</span></td>
                    <td className="text-sm">{p.unidade}</td>
                    <td className="text-sm">{p.estoque_minimo}</td>
                    <td>{admin && <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>Editar</button>}</td>
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
              <h2>{editando ? 'Editar produto' : 'Novo produto'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="field">
                  <label className="label">SKU *</label>
                  <input className="input" placeholder="PROD-001" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Unidade *</label>
                  <select className="select" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="m">m</option>
                    <option value="cx">cx</option>
                    <option value="pc">pc</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label">Nome *</label>
                <input className="input" placeholder="Nome do produto" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">Categoria *</label>
                  <select className="select" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Tipo *</label>
                  <select className="select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="materia_prima">Materia-prima</option>
                    <option value="revenda">Revenda</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label">Estoque minimo</label>
                <input className="input" type="number" min="0" step="0.001" placeholder="0" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Descricao</label>
                <textarea className="textarea" placeholder="Descricao opcional..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando || !form.sku || !form.nome || !form.categoria_id}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
