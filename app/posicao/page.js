'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api, isAdmin } from '../../lib/api'

export default function PosicaoPage() {
  const [posicao, setPosicao] = useState([])
  const [centros, setCentros] = useState([])
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])
  const [estoques, setEstoques] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroCentro, setFiltroCentro] = useState('')
  const [filtroEstoque, setFiltroEstoque] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroAlerta, setFiltroAlerta] = useState(false)
  const [busca, setBusca] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroCentro) params.append('centro_id', filtroCentro)
      if (filtroEstoque) params.append('estoque_id', filtroEstoque)
      if (filtroProduto) params.append('produto_id', filtroProduto)
      if (filtroAlerta) params.append('abaixo_minimo', 'true')
      const [pos, cen, cat, prod, est] = await Promise.all([
        api.get('/posicao?' + params),
        api.get('/centros'),
        api.get('/categorias'),
        api.get('/produtos'),
        api.get('/estoques'),
      ])
      setPosicao(pos)
      setCentros(cen)
      setCategorias(cat)
      setProdutos(prod)
      setEstoques(est)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroCentro, filtroEstoque, filtroProduto, filtroAlerta])

  const produtosFiltrados = filtroCategoria
    ? produtos.filter(p => p.categoria_id === filtroCategoria)
    : produtos

  const centrosFiltrados = filtroEstoque
    ? centros.filter(c => c.estoques?.id === filtroEstoque || c.estoque_id === filtroEstoque)
    : centros

  const dadosFiltrados = posicao.filter(p => {
    if (busca && !p.produto.toLowerCase().includes(busca.toLowerCase()) && !p.sku.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroCategoria) {
      const prod = produtos.find(pr => pr.nome === p.produto || pr.id === p.produto_id)
      if (prod && prod.categoria_id !== filtroCategoria) return false
    }
    return true
  })

  const porEstoque = dadosFiltrados.reduce((acc, p) => {
    if (!acc[p.estoque]) acc[p.estoque] = []
    acc[p.estoque].push(p)
    return acc
  }, {})

  function limparFiltros() {
    setFiltroCentro('')
    setFiltroEstoque('')
    setFiltroCategoria('')
    setFiltroProduto('')
    setFiltroAlerta(false)
    setBusca('')
  }

  return (
    <AppLayout title="Posicao de Estoque">
      <div className="mb-4">
        <h1>Posicao de Estoque</h1>
        <p className="text-muted text-sm mt-1">Saldo atual por produto e centro</p>
      </div>

      <div className="card card-pad mb-4">
        <div className="grid-2" style={{ gap: '1rem' }}>
          <div className="field">
            <label className="label">Buscar produto</label>
            <input className="input" placeholder="Nome ou SKU..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Filtrar por categoria</label>
            <select className="select" value={filtroCategoria} onChange={e => { setFiltroCategoria(e.target.value); setFiltroProduto('') }}>
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Filtrar por produto</label>
            <select className="select" value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}>
              <option value="">Todos os produtos</option>
              {produtosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Filtrar por estoque</label>
            <select className="select" value={filtroEstoque} onChange={e => { setFiltroEstoque(e.target.value); setFiltroCentro('') }}>
              <option value="">Todos os estoques</option>
              {estoques.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Filtrar por centro</label>
            <select className="select" value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)}>
              <option value="">Todos os centros</option>
              {centrosFiltrados.map(c => <option key={c.id} value={c.id}>{c.estoques?.nome} / {c.nome}</option>)}
            </select>
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem' }}>
            <button className={'btn btn-sm ' + (filtroAlerta ? 'btn-danger' : 'btn-secondary')} onClick={() => setFiltroAlerta(a => !a)}>
              Apenas alertas
            </button>
            <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>Limpar</button>
            <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 10 }} />)}
        </div>
      ) : Object.keys(porEstoque).length === 0 ? (
        <div className="card card-pad">
          <div className="empty-state">
            <p className="text-sm">Nenhum item encontrado</p>
          </div>
        </div>
      ) : (
        Object.entries(porEstoque).map(([estoque, itens]) => (
          <div key={estoque} className="card mb-4">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>{estoque}</h3>
              <span className="badge badge-gray">{itens.length} itens</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>SKU</th><th>Produto</th><th>Categoria</th><th>Tipo</th><th>Centro</th><th>Quantidade</th><th>Minimo</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {itens.map(p => (
                    <tr key={p.id}>
                      <td><span className="font-mono text-xs">{p.sku}</span></td>
                      <td style={{ fontWeight: 500 }}>{p.produto}</td>
                      <td className="text-sm text-muted">{p.categoria}</td>
                      <td><span className="badge badge-gray text-xs">{p.tipo === 'materia_prima' ? 'MP' : p.tipo === 'revenda' ? 'RV' : 'AM'}</span></td>
                      <td className="text-sm">{p.centro}</td>
                      <td style={{ fontWeight: 600 }}>{p.quantidade} <span className="text-muted font-mono" style={{ fontSize: '.7rem' }}>{p.unidade}</span></td>
                      <td className="text-sm text-muted">{p.estoque_minimo} {p.unidade}</td>
                      <td>{p.abaixo_minimo ? <span className="badge badge-red">Baixo</span> : <span className="badge badge-green">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </AppLayout>
  )
}
