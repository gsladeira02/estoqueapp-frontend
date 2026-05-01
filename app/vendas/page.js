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
  const [form, setForm] = useState({ produto_id: '', centro_id: '', quantidade: '', valor_unitario: '', observacao: '', data_venda: new Date().toISOString().split('T')[0] })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

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

  useEffect(() => { carregar() }, [dataInicio, dataFim])

  async function abrirModal() {
    const [p, c] = await Promise.all([api.get('/produtos'), api.get('/centros')])
    setProdutos(p)
    setCentros(c)
    setForm({ produto_id: '', centro_id: '', quantidade: '', valor_unitario: '', observacao: '', data_venda: new Date().toISOString().split('T')[0] })
    setErro('')
    setModal(true)
  }

  function selecionarProduto(produto_id) {
    const produto = produtos.find(p => p.id === produto_id)
    setForm(f => ({ ...f, produto_id, valor_unitario: produto?.valor_venda || '' }))
  }

  const valorTotal = Number(form.quantidade || 0) * Number(form.valor_unitario || 0)

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      await api.post('/vendas', {
        ...form,
        quantidade: Number(form.quantidade),
        valor_unitario: Number(form.valor_unitario),
        data_venda: form.data_venda || new Date().toISOString().split('T')[0]
      })
      setSucesso('Venda registrada com sucesso!')
      setModal(false)
      carregar()
      setTimeout(() => setSucesso(''), 4000)
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function remover(id) {
    if (!confirm('Remover esta venda?')) return
    try { await api.delete('/vendas/' + id); carregar() } catch (e) { alert(e.message) }
  }

  const totalVendas = vendas.reduce((acc, v) => acc + Number(v.valor_total), 0)

  return (
    <AppLayout title="Vendas">
      <div className="flex items-center justify-between mb-4">
        <div><h1>Vendas</h1><p className="text-muted text-sm mt-1">Registro de vendas de produtos</p></div>
        <button className="btn btn-primary" onClick={abrirModal}>+ Nova venda</button>
      </div>

      {sucesso && <div className="alert alert-green mb-4">{sucesso}</div>}

      <div className="card card-pad mb-4">
        <div className="grid-2" style={{ gap: '1rem' }}>
          <div className="field">
            <label className="label">Data inicio</label>
            <input className="input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Data fim</label>
            <input className="input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setDataInicio(''); setDataFim('') }}>Limpar</button>
            <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
          </div>
          {vendas.length > 0 && (
            <div className="stat-card" style={{ margin: 0 }}>
              <div className="stat-label">Total do periodo</div>
              <div className="stat-value" style={{ color: 'var(--green)', fontSize: '1.4rem' }}>
                R$ {totalVendas.toFixed(2).replace('.', ',')}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : vendas.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhuma venda registrada</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data Venda</th><th>Produto</th><th>Centro</th><th>Quantidade</th><th>Valor Unit.</th><th>Valor Total</th><th>Observacao</th><th>Usuario</th><th></th></tr></thead>
              <tbody>
                {vendas.map(v => (
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
          <div className="modal">
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
                <label className="label">Valor total (R$)</label>
                <input className="input" type="text" readOnly value={valorTotal > 0 ? 'R$ ' + valorTotal.toFixed(2).replace('.', ',') : '-'} style={{ background: 'var(--bg)', color: 'var(--text-2)', cursor: 'not-allowed' }} />
              </div>
              <div className="field">
                <label className="label">Observacao</label>
                <input className="input" placeholder="Observacao opcional..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
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
