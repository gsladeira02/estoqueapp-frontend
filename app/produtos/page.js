'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api, isAdmin } from '../../lib/api'

const TIPO_LABEL = { materia_prima: 'Materia-prima', revenda: 'Revenda', ambos: 'Ambos' }
const TIPO_BADGE = { materia_prima: 'badge-blue', revenda: 'badge-green', ambos: 'badge-amber' }

export default function ProdutosPage() {
  const [aba, setAba] = useState('produtos')
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalCategoria, setModalCategoria] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', descricao: '', categoria_id: '', tipo: 'materia_prima', unidade: 'un', estoque_minimo: '', valor_venda: '' })
  const [formCat, setFormCat] = useState({ nome: '', descricao: '' })
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
    setForm({ nome: '', descricao: '', categoria_id: '', tipo: 'materia_prima', unidade: 'un', estoque_minimo: '', valor_venda: '' })
    setErro('')
    setModal(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({ nome: p.nome, descricao: p.descricao || '', categoria_id: p.categoria_id, tipo: p.tipo, unidade: p.unidade, estoque_minimo: p.estoque_minimo, valor_venda: p.valor_venda || '' })
    setErro('')
    setModal(true)
  }

  async function apagar(id) {
    if (!confirm('Tem certeza que deseja apagar este produto?')) return
    try {
      await api.put(`/produtos/${id}`, { ativo: false })
      carregar()
    } catch (e) { alert(e.message) }
  }

  async function apagarCategoria(id) {
    if (!confirm('Tem certeza que deseja apagar esta categoria?')) return
    try {
      await api.put(`/categorias/${id}`, { ativo: false })
      carregar()
    } catch (e) { alert(e.message) }
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      if (editando) {
        await api.put(`/produtos/${editando.id}`, { ...form, valor_venda: Number(form.valor_venda) || 0 })
      } else {
        const sku = 'P' + Date.now().toString().slice(-6)
        await api.post('/produtos', { ...form, sku, estoque_minimo: Number(form.estoque_minimo) || 0, valor_venda: Number(form.valor_venda) || 0 })
      }
      setModal(false)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function salvarCategoria() {
    setErro('')
    setSalvando(true)
    try {
      await api.post('/categorias', formCat)
      setModalCategoria(false)
      setFormCat({ nome: '', descricao: '' })
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  return (
    <AppLayout title="Produtos">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Produtos</h1>
          <p className="text-muted text-sm mt-1">Base de dados de produtos e categorias</p>
        </div>
        {admin && (
          <div className="flex gap-2">
            {aba === 'produtos' && <button className="btn btn-primary" onClick={abrirNovo}>+ Novo produto</button>}
            {aba === 'categorias' && <button className="btn btn-primary" onClick={() => { setFormCat({ nome: '', descricao: '' }); setErro(''); setModalCategoria(true) }}>+ Nova categoria</button>}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button className={'btn btn-sm ' + (aba === 'produtos' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('produtos')}>Produtos</button>
        <button className={'btn btn-sm ' + (aba === 'categorias' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('categorias')}>Categorias</button>
      </div>

      {aba === 'produtos' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <input className="input" placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth: 360 }} />
          </div>
          <div className="card">
            {loading ? (
              <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
            ) : produtos.length === 0 ? (
              <div className="empty-state card-pad"><p className="text-sm">Nenhum produto cadastrado</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nome</th><th>Categoria</th><th>Tipo</th><th>Unidade</th><th>Min.</th><th>Valor Venda</th><th></th></tr></thead>
                  <tbody>
                    {produtos.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.nome}</td>
                        <td className="text-sm text-m
