'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api, isAdmin } from '../../lib/api'

const STATUS_BADGE = { pendente: 'badge-amber', aprovada: 'badge-green', rejeitada: 'badge-red', cancelada: 'badge-gray' }
const STATUS_LABEL = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada', cancelada: 'Cancelada' }

export default function TransferenciasPage() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalAprovar, setModalAprovar] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [centros, setCentros] = useState([])
  const [form, setForm] = useState({ produto_id: '', centro_origem_id: '', centro_destino_id: '', quantidade: '', observacao: '' })
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const admin = isAdmin()

  async function carregar() {
    setLoading(true)
    try {
      const params = filtroStatus ? `?status=${filtroStatus}` : ''
      const data = await api.get(`/transferencias${params}`)
      setLista(data.dados || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroStatus])

  async function abrirModal() {
    const [p, c] = await Promise.all([api.get('/produtos'), api.get('/centros')])
    setProdutos(p)
    setCentros(c)
    setForm({ produto_id: '', centro_origem_id: '', centro_destino_id: '', quantidade: '', observacao: '' })
    setErro('')
    setModal(true)
  }

  async function solicitar() {
    setErro('')
    setSalvando(true)
    try {
      await api.post('/transferencias', { ...form, quantidade: Number(form.quantidade) })
      setModal(false)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function resolver(acao) {
    setSalvando(true)
    try {
      await api.patch(`/transferencias/${modalAprovar.id}/resolver`, { acao, motivo_rejeicao: motivoRejeicao })
      setModalAprovar(null)
      carregar()
    } catch (e) { alert(e.message) } finally { setSalvando(false) }
  }

  async function cancelar(id) {
    if (!confirm('Cancelar esta transferencia?')) return
    try { await api.patch(`/transferencias/${id}/cancelar`, {}); carregar() } catch (e) { alert(e.message) }
  }

  return (
    <AppLayout title="Transferencias">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Transferencias</h1>
          <p className="text-muted text-sm mt-1">Movimentacoes entre estoques</p>
        </div>
        <button className="btn btn-primary" onClick={abrirModal}>+ Solicitar</button>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {['', 'pendente', 'aprovada', 'rejeitada', 'cancelada'].map(s => (
          <button key={s} className={`btn btn-sm ${filtroStatus === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltroStatus(s)}>
            {s === '' ? 'Todas' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : lista.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhuma transferencia encontrada</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Produto</th><th>Origem / Destino</th><th>Qtd</th><th>Solicitante</th><th>Status</th><th>Data</th><th></th></tr></thead>
              <tbody>
                {lista.map(t => (
                  <tr key={t.id}>
                    <td><div style={{ fontWeight: 500 }}>{t.produtos?.nome}</div><div className="text-xs text-muted">{t.produtos?.sku}</div></td>
                    <td><div className="text-sm">{t.centro_origem?.estoques?.nome} / {t.centro_origem?.nome}</div><div className="text-xs text-muted">para {t.centro_destino?.estoques?.nome} / {t.centro_destino?.nome}</div></td>
                    <td>{t.quantidade} {t.produtos?.unidade}</td>
                    <td className="text-sm">{t.solicitante?.nome}</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                    <td className="text-xs text-muted">{new Date(t.solicitado_em).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="flex gap-2">
                        {admin && t.status === 'pendente' && (
                          <button className="btn btn-sm btn-primary" onClick={() => { setModalAprovar(t); setMotivoRejeicao('') }}>Revisar</button>
                        )}
                        {t.status === 'pendente' && (
                          <button className="btn btn-sm btn-danger" onClick={() => cancelar(t.id)}>Cancelar</button>
                        )}
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
              <h2>Solicitar Transferencia</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Produto</label>
                <select className="select" value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Centro de origem</label>
                <select className="select" value={form.centro_origem_id} onChange={e => setForm(f => ({ ...f, centro_origem_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {centros.map(c => <option key={c.id} value={c.id}>{c.estoques?.nome} / {c.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Centro de destino</label>
                <select className="select" value={form.centro_destino_id} onChange={e => setForm(f => ({ ...f, centro_destino_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {centros.filter(c => c.id !== form.centro_origem_id).map(c => <option key={c.id} value={c.id}>{c.estoques?.nome} / {c.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Quantidade</label>
                <input className="input" type="number" min="0.001" step="0.001" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Observacao</label>
                <textarea className="textarea" placeholder="Motivo da transferencia..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={solicitar} disabled={salvando || !form.produto_id || !form.centro_origem_id || !form.centro_destino_id || !form.quantidade}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Solicitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAprovar && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalAprovar(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Revisar Transferencia</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalAprovar(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="card card-pad" style={{ background: 'var(--bg)' }}>
                <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  <div><span className="text-muted">Produto: </span><strong>{modalAprovar.produtos?.nome}</strong></div>
                  <div><span className="text-muted">Quantidade: </span><strong>{modalAprovar.quantidade} {modalAprovar.produtos?.unidade}</strong></div>
                  <div><span className="text-muted">De: </span>{modalAprovar.centro_origem?.estoques?.nome} / {modalAprovar.centro_origem?.nome}</div>
                  <div><span className="text-muted">Para: </span>{modalAprovar.centro_destino?.estoques?.nome} / {modalAprovar.centro_destino?.nome}</div>
                  <div><span className="text-muted">Solicitante: </span>{modalAprovar.solicitante?.nome}</div>
                </div>
              </div>
              <div className="field">
                <label className="label">Motivo de rejeicao (se for rejeitar)</label>
                <textarea className="textarea" placeholder="Informe o motivo..." value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => resolver('rejeitar')} disabled={salvando}>Rejeitar</button>
              <button className="btn btn-primary" onClick={() => resolver('aprovar')} disabled={salvando}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Aprovar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
