'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

const PRIORIDADE_BADGE = { urgente: 'badge-red', alto: 'badge-amber', medio: 'badge-blue' }
const PRIORIDADE_LABEL = { urgente: 'Urgente', alto: 'Alto', medio: 'Medio' }

export default function SugestaoComprasPage() {
  const [sugestoes, setSugestoes] = useState([])
  const [estoques, setEstoques] = useState([])
  const [filtroEstoque, setFiltroEstoque] = useState('')
  const [loading, setLoading] = useState(true)
  const [gerandoExcel, setGerandoExcel] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  useEffect(() => {
    api.get('/estoques').then(data => setEstoques(data))
  }, [])

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroEstoque) params.append('estoque_id', filtroEstoque)
      const data = await api.get('/analytics/sugestao-compras?' + params)
      setSugestoes(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroEstoque])

  async function gerarExcel() {
    setGerandoExcel(true)
    try {
      const XLSX = (await import('xlsx')).default
      const dados = sugestoes.map(s => ({
        'Prioridade': PRIORIDADE_LABEL[s.prioridade],
        'Produto': s.nome,
        'Unidade': s.unidade,
        'Estoque Atual': s.estoque_atual,
        'Estoque Minimo': s.estoque_minimo,
        'Venda Semanal': s.venda_semanal,
        'Estoque Ideal': s.estoque_ideal,
        'Quantidade Sugerida': s.quantidade_sugerida,
      }))
      const ws = XLSX.utils.json_to_sheet(dados)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sugestao de Compras')
      XLSX.writeFile(wb, 'sugestao_compras.xlsx')
    } finally { setGerandoExcel(false) }
  }

  async function gerarPdf() {
    setGerandoPdf(true)
    try {
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })
      const estoqueNome = filtroEstoque ? estoques.find(e => e.id === filtroEstoque)?.nome : 'Todos os estoques'
      doc.setFontSize(14)
      doc.text('Sugestao de Compras', 14, 15)
      doc.setFontSize(9)
      doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 22)
      doc.text('Estoque: ' + estoqueNome, 14, 28)
      doc.text('Baseado nas vendas da ultima semana e estoque minimo', 14, 34)
      doc.autoTable({
        head: [['Prioridade', 'Produto', 'Unid', 'Estoque Atual', 'Est. Minimo', 'Venda Semanal', 'Est. Ideal', 'Qtd Sugerida']],
        body: sugestoes.map(s => [
          PRIORIDADE_LABEL[s.prioridade],
          s.nome,
          s.unidade,
          s.estoque_atual,
          s.estoque_minimo,
          s.venda_semanal,
          s.estoque_ideal,
          s.quantidade_sugerida
        ]),
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save('sugestao_compras.pdf')
    } finally { setGerandoPdf(false) }
  }

  const urgentes = sugestoes.filter(s => s.prioridade === 'urgente').length
  const altos = sugestoes.filter(s => s.prioridade === 'alto').length
  const medios = sugestoes.filter(s => s.prioridade === 'medio').length

  return (
    <AppLayout title="Sugestao de Compras">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Sugestao de Compras</h1>
          <p className="text-muted text-sm mt-1">Baseado no estoque minimo e vendas da ultima semana</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
          <button className="btn btn-secondary" onClick={gerarExcel} disabled={gerandoExcel || sugestoes.length === 0}>
            {gerandoExcel ? <span className="spinner" /> : 'Exportar Excel'}
          </button>
          <button className="btn btn-primary" onClick={gerarPdf} disabled={gerandoPdf || sugestoes.length === 0}>
            {gerandoPdf ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <div className="card card-pad mb-4">
        <div className="field" style={{ maxWidth: 320 }}>
          <label className="label">Filtrar por estoque</label>
          <select className="select" value={filtroEstoque} onChange={e => setFiltroEstoque(e.target.value)}>
            <option value="">Todos os estoques</option>
            {estoques.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      {!loading && sugestoes.length > 0 && (
        <div className="stats-grid mb-4">
          <div className="stat-card">
            <div className="stat-label">Urgente</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{urgentes}</div>
            <div className="stat-sub">Estoque zerado</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Prioridade Alta</div>
            <div className="stat-value" style={{ color: 'var(--amber)' }}>{altos}</div>
            <div className="stat-sub">Abaixo do minimo</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Prioridade Media</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{medios}</div>
            <div className="stat-sub">Abaixo do ideal</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total de itens</div>
            <div className="stat-value">{sugestoes.length}</div>
            <div className="stat-sub">Para comprar</div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : sugestoes.length === 0 ? (
          <div className="empty-state card-pad">
            <p className="text-sm">Nenhuma sugestao de compra no momento</p>
            <p className="text-xs text-muted" style={{ marginTop: '.5rem' }}>Todos os produtos estao com estoque adequado</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Prioridade</th>
                  <th>Produto</th>
                  <th>Estoque Atual</th>
                  <th>Estoque Minimo</th>
                  <th>Venda Semanal</th>
                  <th>Estoque Ideal</th>
                  <th>Qtd Sugerida</th>
                </tr>
              </thead>
              <tbody>
                {sugestoes.map(s => (
                  <tr key={s.produto_id}>
                    <td><span className={'badge ' + PRIORIDADE_BADGE[s.prioridade]}>{PRIORIDADE_LABEL[s.prioridade]}</span></td>
                    <td style={{ fontWeight: 500 }}>{s.nome}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: s.estoque_atual <= 0 ? 'var(--red)' : s.estoque_atual < s.estoque_minimo ? 'var(--amber)' : 'var(--text)' }}>
                        {s.estoque_atual} {s.unidade}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{s.estoque_minimo} {s.unidade}</td>
                    <td className="text-sm">{s.venda_semanal} {s.unidade}</td>
                    <td className="text-sm">{s.estoque_ideal} {s.unidade}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1rem' }}>
                        {s.quantidade_sugerida} {s.unidade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
