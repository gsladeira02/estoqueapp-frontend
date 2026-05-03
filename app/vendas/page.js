'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function VendasPage() {
  const [vendas, setVendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [produtos, setProdutos] = useState([])
  const [centros, setCentros] = useState([])
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState({ produto_id: '', centro_id: '', quantidade: '', valor_unitario: '', observacao: '', data_venda: new Date().toISOString().split('T')[0] })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [ficha, setFicha] = useState([])
  const [loadingFicha, setLoadingFicha] = useState(false)

  // Filtros
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')

  async function carregarOpcoes() {
    const [p, c, cats] = await Promise.all([
      api.get('/produtos'),
      api.get('/centros'),
      api.get('/categorias-venda')
    ])
    setProdutos(p.filter(x => x.eh_produto_venda || x.tipo === 'revenda' || x.tipo === 'ambos'))
    setCentros(c)
    setCategorias(cats)
  }

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dataInicio) params.append('data_inicio', dataInicio)
      if (dataFim) params.append('data_fim', dataFim + 'T23:59:59')
      params.append('limite', '200')
      const data = await api.get('/vendas?' + params)
      setVendas(data.dados || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { carregarOpcoes(); carregar() }, [])
  useEffect(() => { carregar() }, [dataInicio, dataFim])

  async function abrirModal() {
    setForm({ produto_id: '', centro_id: '', quantidade: '', valor_unitario: '', observacao: '', data_venda: new Date().toISOString().split('T')[0] })
    setFicha([])
    setErro('')
    setModal(true)
  }

  async function selecionarProduto(produto_id) {
    const produto = produtos.find(p => p.id === produto_id)
    setForm(f => ({ ...f, produto_id, valor_unitario: produto?.valor_venda || '' }))
    setFicha([])
    if (!produto_id) return
    setLoadingFicha(true)
    try {
      const data = await api.get('/fichas/' + produto_id)
      setFicha(data || [])
    } catch { setFicha([]) } finally { setLoadingFicha(false) }
  }

  const valorTotal = Number(form.quantidade || 0) * Number(form.valor_unitario || 0)

  const previewBaixas = ficha.map(item => ({
    ...item,
    qtdBaixa: (Number(item.quantidade) * Number(form.quantidade || 0)).toFixed(4).replace(/\.?0+$/, '')
  }))

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      const resultado = await api.post('/vendas', {
        ...form,
        quantidade: Number(form.quantidade),
        valor_unitario: Number(form.valor_unitario),
        data_venda: form.data_venda || new Date().toISOString().split('T')[0]
      })
      const baixas = resultado.baixas_automaticas?.length || 0
      setSucesso(baixas > 0
        ? `Venda registrada! ${baixas} insumo(s) baixado(s) automaticamente.`
        : 'Venda registrada com sucesso!')
      setModal(false)
      carregar()
      setTimeout(() => setSucesso(''), 5000)
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function remover(id) {
    if (!confirm('Remover esta venda? Os insumos serão estornados automaticamente.')) return
    try { await api.delete('/vendas/' + id); carregar() } catch (e) { alert(e.message) }
  }

  // Filtros aplicados no frontend
  const vendasFiltradas = vendas.filter(v => {
    if (filtroProduto && v.produtos?.id !== filtroProduto) return false
    if (filtroCentro && v.centros?.id !== filtroCentro) return false
    if (filtroCategoria) {
      const produto = produtos.find(p => p.id === v.produtos?.id)
      if (produto?.categoria_venda_id !== filtroCategoria) return false
    }
    return true
  })

  const totalVendas = vendasFiltradas.reduce((acc, v) => acc + Number(v.valor_total), 0)

  function limparFiltros() {
    setDataInicio('')
    setDataFim('')
    setFiltroProduto('')
    setFiltroCategoria('')
    setFiltroCentro('')
  }

  const temFiltro = dataInicio || dataFim || filtroProduto || filtroCategoria || filtroCentro

  return (
    <AppLayout title="Vendas">
      <div className="flex items-center justify-between mb-4">
        <div><h1>Vendas</h1><p className="text-muted text-sm mt-1">Registro de vendas com baixa automatica de estoque</p></div>
        <button className="btn btn-primary" onClick={abrirModal}>+ Nova venda</button>
      </div>

      {sucesso && <div className="alert alert-green mb-4">{sucesso}</div>}

      <div className="card card-pad mb-4">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="field">
            <label className="label">Data inicio</label>
            <input className="input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Data fim</label>
            <input className="input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Categoria</label>
            <select className="select" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Produto</label>
            <select className="select" value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}>
              <option value="">Todos</option>
              {produtos
                .filter(p => !filtroCategoria || p.categoria_venda_id === filtroCategoria)
                .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Centro de estoque</label>
            <select className="select" value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)}>
              <option value="">Todos</option>
              {centros.map(c => <option key={c.id} value={c.id}>{c.estoques?.nome} / {c.nome}</option>)}
            </select>
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem' }}>
            {temFiltro && <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>Limpar</button>}
            <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
          </div>
        </div>
        {vendasFiltradas.length > 0 && (
          <div className="stat-card" style={{ margin: '1rem 0 0' }}>
            <div className="stat-label">Total do periodo</div>
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: '1.4rem' }}>
              R$ {totalVendas.toFixed(2).replace('.', ',')}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : vendasFiltradas.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhuma venda encontrada</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Centro</th>
                  <th>Qtd</th>
                  <th>Valor Unit.</th>
                  <th>Valor Total</th>
                  <th>Observacao</th>
                  <th>Usuario</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map(v => (
                  <tr key={v.id}>
                    <td className="text-sm">{v.data_venda ? new Date(v.data_venda + 'T00:00:00').toLocaleDateString('pt-BR') : new Date(v.criado_em).toLocaleDateString('pt-BR')}</td>
                    <td style={{ fontWeight: 500 }}>{v.produtos?.nome}</td>
                    <td><div>{v.centros?.nome}</div><div className="text-xs text-muted">{v.centros?.estoques?.nome}</div></td>
                    <td>{v.quantidade} {v.produtos?.unidade}</td>
                    <td>R$ {Number(v.valor_unitario).toFixed(2).replace('.', ',')}</td>
                    <td style={{ fontWeight: 600 }}>R$ {Number(v.valor_total).toFixed(2).replace('.', ',')}</td>
                    <td className="text-sm text-muted">{v.observacao || '-'}</td>
                    <td className="text-sm">{v.usuarios?.nome}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => remover(v.id)}>Remover</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header"><h2>Nova Venda</h2><button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button></div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Data da venda</label>
                <input className="input" type="date" value={form.data_venda} onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Produto</label>
                <select className="select" value={form.produto_id} onChange={e => selecionarProduto(e.target.value)}>
                  <option value="">Selecione...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Centro de estoque</label>
                <select className="select" value={form.centro_id} onChange={e => setForm(f => ({ ...f, centro_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {centros.map(c => <option key={c.id} value={c.id}>{c.estoques?.nome} / {c.nome}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">Quantidade</label>
                  <input className="input" type="number" min="0.001" step="0.001" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Valor unitario (R$)</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0,00" value={form.valor_unitario} onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="label">Valor total</label>
                <input className="input" readOnly value={valorTotal > 0 ? 'R$ ' + valorTotal.toFixed(2).replace('.', ',') : '-'} style={{ background: 'var(--bg)', color: 'var(--text-2)', cursor: 'not-allowed' }} />
              </div>
              <div className="field">
                <label className="label">Observacao</label>
                <input className="input" placeholder="Observacao opcional..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>

              {loadingFicha && <div style={{ textAlign: 'center' }}><div className="spinner" /></div>}
              {!loadingFicha && ficha.length > 0 && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '.75rem' }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '.5rem' }}>Baixa automatica de insumos</div>
                  {previewBaixas.map(item => (
                    <div key={item.insumo_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                      <span style={{ color: 'var(--text-2)' }}>{item.insumos?.nome}</span>
                      <span style={{ fontWeight: 600, color: 'var(--red, #e53e3e)' }}>-{item.qtdBaixa} {item.unidade}</span>
                    </div>
                  ))}
                </div>
              )}
              {!loadingFicha && form.produto_id && ficha.length === 0 && (
                <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>
                  Este produto nao possui ficha tecnica. Nenhum insumo sera baixado.
                </div>
              )}
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando || !form.produto_id || !form.centro_id || !form.quantidade || !form.valor_unitario}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
