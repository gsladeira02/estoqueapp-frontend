'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function PosicaoPage() {
  const [posicao, setPosicao] = useState([])
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroCentro, setFiltroCentro] = useState('')
  const [filtroAlerta, setFiltroAlerta] = useState(false)
  const [busca, setBusca] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroCentro) params.append('centro_id', filtroCentro)
      if (filtroAlerta) params.append('abaixo_minimo', 'true')
      const [pos, cen] = await Promise.all([api.get(`/posicao?${params}`), api.get('/centros')])
      setPosicao(pos)
      setCentros(cen)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroCentro, filtroAlerta])

  const filtrados = posicao.filter(p => !busca || p.produto.toLowerCase().includes(busca.toLowerCase()) || p.sku.toLowerCase().includes(busca.toLowerCase()))
  const porEstoque = filtrados.reduce((acc, p) => { if (!acc[p.estoque]) acc[p.estoque] = []; acc[p.estoque].push(p); return acc }, {})

  return (
    <AppLayout title="Posicao de Estoque">
      <div className="mb-4">
        <h1>Posicao de Estoque</h1>
        <p className="text-muted text-sm mt-1">Saldo atual por produto e centro</p>
      </div>
      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Buscar produto ou SKU..." value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="select" value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Todos os centros</option>
          {centros.map(c => <option key={c.id} value={c.id}>{c.estoques?.nome} / {c.nome}</option>)}
        </select>
        <button className={`btn btn-sm ${filtroAlerta ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFiltroAlerta(a => !a)}>Apenas alertas</button>
        <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      ) : Object.keys(porEstoque).length === 0 ? (
        <div className="card card-pad"><div className="empty-state"><p className="text-sm">Nenhum item encontrado</p></div></div>
      ) : (
        Object.entries(porEstoque).map(([estoque, itens]) => (
          <div key={estoque} className="card mb-4">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>{estoque}</h3>
              <span className="badge badge-gray">{itens.length} itens</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>SKU</th><th>Produto</th><th>Categoria</th><th>Centro</th><th>Quantidade</th><th>Minimo</th><th>Status</th></tr></thead>
                <tbody>
                  {itens.map(p => (
                    <tr key={p.id}>
                      <td><span className="font-mono text-xs">{p.sku}</span></td>
                      <td style={{ fontWeight: 500 }}>{p.produto}</td>
                      <td className="text-sm text-muted">{p.categoria}</td>
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
