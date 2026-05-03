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
  const [form, setForm] = useState({ produto_id: '', centro_origem_id: '', centro_destino_id: '', quantidade: '', observacao: '', finalidade: '' })
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const admin = isAdmin()

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus) params.append('status', filtroStatus)
      if (dataInicio) params.append('data_inicio', dataInicio)
      if (dataFim) params.append('data_fim', dataFim + 'T23:59:59')
      params.append('limite', '200')
      const data = await api.get('/transferencias?' + params)
      setLista(data.dados || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroStatus, dataInicio, dataFim])

  async function abrirModal() {
    const [p, c] = await Promise.all([api.get('/produtos'), api.get('/centros')])
    setProdutos(p)
    setCentros(c)
    setForm({ produto_id: '', centro_origem_id: '', centro_destino_id: '', quantidade: '', observacao: '', finalidade: '' })
    setProdutoSelecionado(null)
    setErro('')
    setModal(true)
  }

  function selecionarProduto(produto_id) {
    const p = produtos.find(x => x.id === produto_id)
    setProdutoSelecionado(p || null)
    setForm(f => ({ ...f, produto_id, finalidade: '' }))
  }

  const temConversao = produtoSelecionado?.tipo === 'ambos' &&
    form.finalidade === 'materia_prima' &&
    produtoSelecionado?.fator_conversao &&
    produtoSelecionado?.unidade_insumo

  const qtdDestino = temConversao
    ? (Number(form.quantidade || 0) * Number(produtoSelecionado.fator_conversao)).toFixed(3).replace(/\.?0+$/, '')
    : form.quantidade

  const unidadeDestino = temConversao ? produtoSelecionado.unidade_insumo : produtoSelecionado?.unidade

  async function solicitar() {
    setErro('')
    setSalvando(true)
    try {
      await api.post('/transferencias', {
        ...form,
        quantidade: Number(form.quantidade),
        finalidade: form.finalidade || undefined
      })
      setModal(false)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function resolver(acao) {
    setSalvando(true)
    try {
      await api.patch('/transferencias/' + modalAprovar.id + '/resolver', { acao, motivo_rejeicao: motivoRejeicao })
      setModalAprovar(null)
      carregar()
    } catch (e) { alert(e.message) } finally { setSalvando(false) }
  }

  async function cancelar(id) {
    if (!confirm('Cancelar esta transferencia?')) return
    try { await api.patch('/transferencias/' + id + '/cancelar', {}); carregar() } catch (e) { alert(e.message) }
  }

  function imprimirRomaneio(t) {
    const temConv = t.quantidade_destino && t.quantidade_destino !== t.quantidade
    const janela = window.open('', '_blank')
    janela.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Romaneio</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#000;padding:30px}h1{font-size:20px;text-align:center;margin-bottom:4px}.subtitulo{text-align:center;font-size:12px;color:#555;margin-bottom:24px}.secao{border:1px solid #ccc;border-radius:6px;padding:14px;margin-bottom:16px}.secao-titulo{font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.campo{display:flex;flex-direction:column;gap:3px}.campo-label{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.05em}.campo-valor{font-size:14px;font-weight:600}.destaque{font-size:22px;font-weight:700}.assinaturas{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:8px}.assinatura{display:flex;flex-direction:column;align-items:center;gap:8px}.linha-assinatura{width:100%;border-bottom:1px solid #000;margin-top:40px}.assinatura-label{font-size:11px;color:#555}.rodape{text-align:center;font-size:10px;color:#aaa;margin-top:20px}@media print{body{padding:15px}button{display:none}}</style></head><body><h1>Romaneio de Transferencia</h1><p class="subtitulo">Documento de controle de movimentacao entre estoques</p><div class="secao"><div class="secao-titulo">Informacoes</div><div class="grid"><div class="campo"><span class="campo-label">Data</span><span class="campo-valor">' + new Date(t.solicitado_em).toLocaleString('pt-BR') + '</span></div><div class="campo"><span class="campo-label">Status</span><span class="campo-valor">' + STATUS_LABEL[t.status] + '</span></div><div class="campo"><span class="campo-label">Solicitante</span><span class="campo-valor">' + (t.solicitante?.nome || '-') + '</span></div>' + (t.admin ? '<div class="campo"><span class="campo-label">Aprovado por</span><span class="campo-valor">' + t.admin?.nome + '</span></div>' : '') + '</div></div><div class="secao"><div class="secao-titulo">Produto</div><div class="grid"><div class="campo"><span class="campo-label">Nome</span><span class="campo-valor destaque">' + t.produtos?.nome + '</span></div><div class="campo"><span class="campo-label">Quantidade saida</span><span class="campo-valor destaque">' + t.quantidade + ' ' + t.produtos?.unidade + '</span></div>' + (temConv ? '<div class="campo"><span class="campo-label">Quantidade entrada (convertida)</span><span class="campo-valor destaque">' + t.quantidade_destino + ' ' + t.unidade_destino + '</span></div>' : '') + (t.finalidade ? '<div class="campo"><span class="campo-label">Finalidade</span><span class="campo-valor">' + (t.finalidade === 'materia_prima' ? 'Materia-prima' : 'Revenda') + '</span></div>' : '') + '</div></div><div class="secao"><div class="secao-titulo">Origem e Destino</div><div class="grid"><div class="campo"><span class="campo-label">Estoque origem</span><span class="campo-valor">' + t.centro_origem?.estoques?.nome + '</span><span class="campo-label" style="margin-top:4px">Centro</span><span class="campo-valor">' + t.centro_origem?.nome + '</span></div><div class="campo"><span class="campo-label">Estoque destino</span><span class="campo-valor">' + t.centro_destino?.estoques?.nome + '</span><span class="campo-label" style="margin-top:4px">Centro</span><span class="campo-valor">' + t.centro_destino?.nome + '</span></div></div></div><div class="secao"><div class="secao-titulo">Assinaturas</div><div class="assinaturas"><div class="assinatura"><div class="linha-assinatura"></div><span class="assinatura-label">Remetente</span></div><div class="assinatura"><div class="linha-assinatura"></div><span class="assinatura-label">Motorista</span></div><div class="assinatura"><div class="linha-assinatura"></div><span class="assinatura-label">Destinatario</span></div></div></div><div class="rodape">Gerado em ' + new Date().toLocaleString('pt-BR') + '</div><script>window.onload=function(){window.print()}<\/script></body></html>')
    janela.document.close()
  }

  return (
    <AppLayout title="Transferencias">
      <div className="flex items-center justify-between mb-4">
        <div><h1>Transferencias</h1><p className="text-muted text-sm mt-1">Movimentacoes entre estoques</p></div>
        <button className="btn btn-primary" onClick={abrirModal}>+ Solicitar</button>
      </div>

      <div className="card card-pad mb-4">
        <div className="grid-2" style={{ gap: '1rem' }}>
          <div className="field">
            <label className="label">Status</label>
            <select className="select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              {['pendente','aprovada','rejeitada','cancelada'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
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
            <button className="btn btn-ghost btn-sm" onClick={() => { setFiltroStatus(''); setDataInicio(''); setDataFim('') }}>Limpar</button>
            <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : lista.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhuma transferencia encontrada</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Origem / Destino</th>
                  <th>Qtd saida</th>
                  <th>Qtd entrada</th>
                  <th>Finalidade</th>
                  <th>Solicitante</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map(t => (
                  <tr key={t.id}>
                    <td><div style={{ fontWeight: 500 }}>{t.produtos?.nome}</div></td>
                    <td>
                      <div className="text-sm">{t.centro_origem?.estoques?.nome} / {t.centro_origem?.nome}</div>
                      <div className="text-xs text-muted">para {t.centro_destino?.estoques?.nome} / {t.centro_destino?.nome}</div>
                    </td>
                    <td className="text-sm">{t.quantidade} {t.produtos?.unidade}</td>
                    <td className="text-sm">
                      {t.quantidade_destino && t.quantidade_destino !== t.quantidade
                        ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t.quantidade_destino} {t.unidade_destino}</span>
                        : <span>{t.quantidade} {t.produtos?.unidade}</span>
                      }
                    </td>
                    <td className="text-sm text-muted">
                      {t.finalidade === 'materia_prima' ? 'Mat. Prima' : t.finalidade === 'revenda' ? 'Revenda' : '-'}
                    </td>
                    <td className="text-sm">{t.solicitante?.nome}</td>
                    <td><span className={'badge ' + STATUS_BADGE[t.status]}>{STATUS_LABEL[t.status]}</span></td>
                    <td className="text-xs text-muted">{new Date(t.solicitado_em).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => imprimirRomaneio(t)}>Romaneio</button>
                        {admin && t.status === 'pendente' && <button className="btn btn-sm btn-primary" onClick={() => { setModalAprovar(t); setMotivoRejeicao('') }}>Revisar</button>}
                        {t.status === 'pendente' && <button className="btn btn-sm btn-danger" onClick={() => cancelar(t.id)}>Cancelar</button>}
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
            <div className="modal-header"><h2>Solicitar Transferencia</h2><button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button></div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Produto</label>
                <select className="select" value={form.produto_id} onChange={e => selecionarProduto(e.target.value)}>
                  <option value="">Selecione...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.unidade})</option>)}
                </select>
              </div>

              {produtoSelecionado?.tipo === 'ambos' && (
                <div className="field">
                  <label className="label">Finalidade no destino *</label>
                  <select className="select" value={form.finalidade} onChange={e => setForm(f => ({ ...f, finalidade: e.target.value }))}>
                    <option value="">Selecione...</option>
                    <option value="revenda">Revenda (mantém unidade: {produtoSelecionado.unidade})</option>
                    <option value="materia_prima">
                      {'Materia-prima' + (produtoSelecionado.fator_conversao && produtoSelecionado.unidade_insumo
                        ? ' (converte: 1 ' + produtoSelecionado.unidade + ' = ' + produtoSelecionado.fator_conversao + ' ' + produtoSelecionado.unidade_insumo + ')'
                        : '')}
                    </option>
                  </select>
                </div>
              )}

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
                <label className="label">Quantidade (em {produtoSelecionado?.unidade || 'unidades'})</label>
                <input className="input" type="number" min="0.001" step="0.001" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>

              {temConversao && form.quantidade && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '.75rem' }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '.4rem' }}>Conversao aplicada</div>
                  <div style={{ fontSize: '.85rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Sai da origem:</span>
                    <strong>{form.quantidade} {produtoSelecionado.unidade}</strong>
                  </div>
                  <div style={{ fontSize: '.85rem', display: 'flex', justifyContent: 'space-between', marginTop: '.25rem' }}>
                    <span className="text-muted">Chega no destino:</span>
                    <strong style={{ color: 'var(--accent)' }}>{qtdDestino} {unidadeDestino}</strong>
                  </div>
                </div>
              )}

              <div className="field">
                <label className="label">Observacao</label>
                <textarea className="textarea" placeholder="Motivo..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={solicitar}
                disabled={salvando || !form.produto_id || !form.centro_origem_id || !form.centro_destino_id || !form.quantidade || (produtoSelecionado?.tipo === 'ambos' && !form.finalidade)}
              >
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Solicitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAprovar && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalAprovar(null)}>
          <div className="modal">
            <div className="modal-header"><h2>Revisar Transferencia</h2><button className="btn btn-ghost btn-icon" onClick={() => setModalAprovar(null)}>x</button></div>
            <div className="modal-body">
              <div className="card card-pad" style={{ background: 'var(--bg)' }}>
                <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  <div><span className="text-muted">Produto: </span><strong>{modalAprovar.produtos?.nome}</strong></div>
                  <div><span className="text-muted">Quantidade saida: </span><strong>{modalAprovar.quantidade} {modalAprovar.produtos?.unidade}</strong></div>
                  {modalAprovar.quantidade_destino && modalAprovar.quantidade_destino !== modalAprovar.quantidade && (
                    <div><span className="text-muted">Quantidade entrada: </span><strong style={{ color: 'var(--accent)' }}>{modalAprovar.quantidade_destino} {modalAprovar.unidade_destino}</strong></div>
                  )}
                  {modalAprovar.finalidade && (
                    <div><span className="text-muted">Finalidade: </span><strong>{modalAprovar.finalidade === 'materia_prima' ? 'Materia-prima' : 'Revenda'}</strong></div>
                  )}
                  <div><span className="text-muted">De: </span>{modalAprovar.centro_origem?.estoques?.nome} / {modalAprovar.centro_origem?.nome}</div>
                  <div><span className="text-muted">Para: </span>{modalAprovar.centro_destino?.estoques?.nome} / {modalAprovar.centro_destino?.nome}</div>
                  <div><span className="text-muted">Solicitante: </span>{modalAprovar.solicitante?.nome}</div>
                </div>
              </div>
              <div className="field">
                <label className="label">Motivo de rejeicao</label>
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
