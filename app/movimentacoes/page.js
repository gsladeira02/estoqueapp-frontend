'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

const TIPOS = { entrada: 'Entrada', saida: 'Saida', ajuste: 'Ajuste' }
const BADGE = { entrada: 'badge-green', saida: 'badge-red', ajuste: 'badge-blue' }

export default function MovimentacoesPage() {
  const [movs, setMovs] = useState([])
  const [alertas, setAlertas] = useState({ vencendo: [], vencidos: [] })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [produtos, setProdutos] = useState([])
  const [centros, setCentros] = useState([])
  const [form, setForm] = useState({ produto_id: '', centro_id: '', tipo: 'entrada', quantidade: '', motivo: '', documento: '', custo_unitario: '', data_validade: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [abaAlerta, setAbaAlerta] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroTipo) params.append('tipo', filtroTipo)
      if (dataInicio) params.append('data_inicio', dataInicio)
      if (dataFim) params.append('data_fim', dataFim + 'T23:59:59')
      params.append('limite', '200')
      const [data, alerta] = await Promise.all([
        api.get('/movimentacoes?' + params),
        api.get('/movimentacoes/alertas-validade?dias=30')
      ])
      setMovs(data.dados || [])
      setAlertas(alerta)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroTipo, dataInicio, dataFim])

  async function abrirModal() {
    const [p, c] = await Promise.all([api.get('/produtos'), api.get('/centros')])
    setProdutos(p)
    setCentros(c)
    setForm({ produto_id: '', centro_id: '', tipo: 'entrada', quantidade: '', motivo: '', documento: '', custo_unitario: '', data_validade: '' })
    setErro('')
    setModal(true)
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      const res = await api.post('/movimentacoes', {
        ...form,
        quantidade: Number(form.quantidade),
        custo_unitario: Number(form.custo_unitario) || 0,
        data_validade: form.data_validade || null,
      })
      setSucesso('Movimentacao registrada! Saldo atual: ' + res.saldo_atual)
      setModal(false)
      carregar()
      setTimeout(() => setSucesso(''), 4000)
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  const custoTotal = Number(form.quantidade || 0) * Number(form.custo_unitario || 0)

  function limparFiltros() {
    setFiltroTipo('')
    setDataInicio('')
    setDataFim('')
  }

  function diasParaVencer(data) {
    const hoje = new Date()
    const validade = new Date(data)
    const diff = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24))
    return diff
  }

  const totalAlertas = alertas.vencendo.length + alertas.vencidos.length

  return (
    <AppLayout title="Movimentacoes">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Movimentacoes</h1>
          <p className="text-muted text-sm mt-1">Entradas, saidas e ajustes</p>
        </div>
        <div className="flex gap-2">
          {totalAlertas > 0 && (
            <button className={'btn btn-sm ' + (abaAlerta ? 'btn-danger' : 'btn-secondary')} onClick={() => setAbaAlerta(a => !a)}>
              Alertas de validade ({totalAlertas})
            </button>
          )}
          <button className="btn btn-primary" onClick={abrirModal}>+ Nova</button>
        </div>
      </div>

      {sucesso && <div className="alert alert-green mb-4">{sucesso}</div>}

      {abaAlerta && totalAlertas > 0 && (
        <div className="card mb-4">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--red-s)' }}>
            <h3 style={{ color: 'var(--red)' }}>Alertas de Validade</h3>
          </div>
          {alertas.vencidos.length > 0 && (
            <>
              <div style={{ padding: '.75rem 1.25rem', background: 'var(--red-s)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, color: 'var(--red)', fontSize: '.8rem' }}>VENCIDOS</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Produto</th><th>Centro</th><th>Quantidade</th><th>Vencimento</th></tr></thead>
                  <tbody>
                    {alertas.vencidos.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.produtos?.nome}</td>
                        <td className="text-sm">{a.centros?.estoques?.nome} / {a.centros?.nome}</td>
                        <td>{a.quantidade} {a.produtos?.unidade}</td>
                        <td><span className="badge badge-red">{new Date(a.data_validade).toLocaleDateString('pt-BR')} (vencido)</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {alertas.vencendo.length > 0 && (
            <>
              <div style={{ padding: '.75rem 1.25rem', background: 'var(--amber-s)', borderBottom: '1px solid var(--border)', borderTop: alertas.vencidos.length > 0 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontWeight: 600, color: 'var(--amber)', fontSize: '.8rem' }}>VENCENDO EM 30 DIAS</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Produto</th><th>Centro</th><th>Quantidade</th><th>Vencimento</th><th>Dias restantes</th></tr></thead>
                  <tbody>
                    {alertas.vencendo.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.produtos?.nome}</td>
                        <td className="text-sm">{a.centros?.estoques?.nome} / {a.centros?.nome}</td>
                        <td>{a.quantidade} {a.produtos?.unidade}</td>
                        <td className="text-sm">{new Date(a.data_validade).toLocaleDateString('pt-BR')}</td>
                        <td><span className="badge badge-amber">{diasParaVencer(a.data_validade)} dias</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <div className="card card-pad mb-4">
        <div className="grid-2" style={{ gap: '1rem' }}>
          <div className="field">
            <label className="label">Tipo</label>
            <select className="select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Data inicio</label>
            <input className="input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Data fim</label>
            <input className="input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>Limpar filtros</button>
            <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : movs.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhuma movimentacao encontrada</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Produto</th><th>Centro</th><th>Tipo</th><th>Qtd</th><th>Custo Unit.</th><th>Custo Total</th><th>Validade</th><th>Motivo</th><th>Usuario</th><th>Data</th></tr>
              </thead>
              <tbody>
                {movs.map(m => {
                  const dias = m.data_validade ? diasParaVencer(m.data_validade) : null
                  return (
                    <tr key={m.id}>
                      <td><div style={{ fontWeight: 500 }}>{m.produtos?.nome}</div></td>
                      <td><div>{m.centros?.nome}</div><div className="text-xs text-muted">{m.centros?.estoques?.nome}</div></td>
                      <td><span className={'badge ' + BADGE[m.tipo]}>{TIPOS[m.tipo]}</span></td>
                      <td style={{ fontWeight: 600 }}>{m.quantidade} {m.produtos?.unidade}</td>
                      <td className="text-sm">{m.custo_unitario ? 'R$ ' + Number(m.custo_unitario).toFixed(2).replace('.', ',') : '-'}</td>
                      <td className="text-sm font-semibold">{m.custo_total ? 'R$ ' + Number(m.custo_total).toFixed(2).replace('.', ',') : '-'}</td>
                      <td>
                        {m.data_validade ? (
                          <span className={'badge ' + (dias < 0 ? 'badge-red' : dias <= 30 ? 'badge-amber' : 'badge-green')}>
                            {new Date(m.data_validade).toLocaleDateString('pt-BR')}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-sm text-muted">{m.motivo || '-'}</td>
                      <td className="text-sm">{m.usuarios?.nome}</td>
                      <td className="text-xs text-muted">{new Date(m.criado_em).toLocaleString('pt-BR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Nova Movimentacao</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Tipo</label>
                <select className="select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saida</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Produto</label>
                <select className="select" value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}>
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
              <div className="field">
                <label className="label">Quantidade</label>
                <input className="input" type="number" min="0.001" step="0.001" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Data de validade</label>
                <input className="input" type="date" value={form.data_validade} onChange={e => setForm(f => ({ ...f, data_validade: e.target.value }))} />
              </div>
              {form.tipo === 'entrada' && (
                <div className="grid-2">
                  <div className="field">
                    <label className="label">Custo unitario (R$)</label>
                    <input className="input" type="number" min="0" step="0.01" placeholder="0,00" value={form.custo_unitario} onChange={e => setForm(f => ({ ...f, custo_unitario: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="label">Custo total (R$)</label>
                    <input className="input" type="text" readOnly value={custoTotal > 0 ? 'R$ ' + custoTotal.toFixed(2).replace('.', ',') : '-'} style={{ background: 'var(--bg)', color: 'var(--text-2)', cursor: 'not-allowed' }} />
                  </div>
                </div>
              )}
              <div className="grid-2">
                <div className="field">
                  <label className="label">Motivo</label>
                  <input className="input" placeholder="Compra, venda..." value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Documento / NF</label>
                  <input className="input" placeholder="NF-001..." value={form.documento} onChange={e => setForm(f => ({ ...f, documento: e.target.value }))} />
                </div>
              </div>
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando || !form.produto_id || !form.centro_id || !form.quantidade}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
