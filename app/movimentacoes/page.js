'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

const TIPOS = { entrada: 'Entrada', saida: 'Saida', ajuste: 'Ajuste' }
const BADGE = { entrada: 'badge-green', saida: 'badge-red', ajuste: 'badge-blue' }

export default function MovimentacoesPage() {
  const [movs, setMovs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [produtos, setProdutos] = useState([])
  const [centros, setCentros] = useState([])
  const [form, setForm] = useState({ produto_id: '', centro_id: '', tipo: 'entrada', quantidade: '', motivo: '', documento: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const params = filtroTipo ? `?tipo=${filtroTipo}` : ''
      const data = await api.get(`/movimentacoes${params}`)
      setMovs(data.dados || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroTipo])

  async function abrirModal() {
    const [p, c] = await Promise.all([api.get('/produtos'), api.get('/centros')])
    setProdutos(p)
    setCentros(c)
    setForm({ produto_id: '', centro_id: '', tipo: 'entrada', quantidade: '', motivo: '', documento: '' })
    setErro('')
    setModal(true)
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      const res = await api.post('/movimentacoes', { ...form, quantidade: Number(form.quantidade) })
      setSucesso('Movimentacao registrada! Saldo atual: ' + res.saldo_atual)
      setModal(false)
      carregar()
      setTimeout(() => setSucesso(''), 4000)
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  return (
    <AppLayout title="Movimentacoes">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Movimentacoes</h1>
          <p className="text-muted text-sm mt-1">Entradas, saidas e ajustes</p>
        </div>
        <button className="btn btn-primary" onClick={abrirModal}>+ Nova</button>
      </div>

      {sucesso && <div className="alert alert-green mb-4">{sucesso}</div>}

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {['', 'entrada', 'saida', 'ajuste'].map(t => (
          <button key={t} className={`btn btn-sm ${filtroTipo === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltroTipo(t)}>
            {t === '' ? 'Todos' : TIPOS[t]}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : movs.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhuma movimentacao encontrada</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Produto</th><th>Centro</th><th>Tipo</th><th>Qtd</th><th>Motivo</th><th>Usuario</th><th>Data</th></tr></thead>
              <tbody>
                {movs.map(m => (
                  <tr key={m.id}>
                    <td><div style={{ fontWeight: 500 }}>{m.produtos?.nome}</div><div className="text-xs text-muted">{m.produtos?.sku}</div></td>
                    <td><div>{m.centros?.nome}</div><div className="text-xs text-muted">{m.centros?.estoques?.nome}</div></td>
                    <td><span className={`badge ${BADGE[m.tipo]}`}>{TIPOS[m.tipo]}</span></td>
                    <td style={{ fontWeight: 600 }}>{m.quantidade} {m.produtos?.unidade}</td>
                    <td className="text-sm text-muted">{m.motivo || '-'}</td>
                    <td className="text-sm">{m.usuarios?.nome}</td>
                    <td className="text-xs text-muted">{new Date(m.criado_em).toLocaleString('pt-BR')}</td>
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
                <select className="select" value={form.produto_id}
