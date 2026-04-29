'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function RelatoriosPage() {
  const [posicao, setPosicao] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [transferencias, setTransferencias] = useState([])
  const [loading, setLoading] = useState(false)
  const [gerandoExcel, setGerandoExcel] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [tipo, setTipo] = useState('posicao')

  async function carregar() {
    setLoading(true)
    try {
      if (tipo === 'posicao') {
        const data = await api.get('/posicao')
        setPosicao(data)
      } else if (tipo === 'movimentacoes') {
        const data = await api.get('/movimentacoes?limite=500')
        setMovimentacoes(data.dados || [])
      } else if (tipo === 'transferencias') {
        const data = await api.get('/transferencias?limite=500')
        setTransferencias(data.dados || [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [tipo])

  async function gerarExcel() {
    setGerandoExcel(true)
    try {
      const XLSX = (await import('xlsx')).default
      let dados = []
      let nomeArquivo = ''

      if (tipo === 'posicao') {
        nomeArquivo = 'posicao_estoque.xlsx'
        dados = posicao.map(p => ({
          'Estoque': p.estoque,
          'Centro': p.centro,
          'Produto': p.produto,
          'Categoria': p.categoria,
          'Tipo': p.tipo,
          'Unidade': p.unidade,
          'Quantidade': p.quantidade,
          'Estoque Minimo': p.estoque_minimo,
          'Status': p.abaixo_minimo ? 'Abaixo do minimo' : 'OK',
        }))
      } else if (tipo === 'movimentacoes') {
        nomeArquivo = 'movimentacoes.xlsx'
        dados = movimentacoes.map(m => ({
          'Data': new Date(m.criado_em).toLocaleString('pt-BR'),
          'Tipo': m.tipo,
          'Produto': m.produtos?.nome,
          'Centro': m.centros?.nome,
          'Estoque': m.centros?.estoques?.nome,
          'Quantidade': m.quantidade,
          'Unidade': m.produtos?.unidade,
          'Motivo': m.motivo || '',
          'Documento': m.documento || '',
          'Usuario': m.usuarios?.nome,
        }))
      } else if (tipo === 'transferencias') {
        nomeArquivo = 'transferencias.xlsx'
        dados = transferencias.map(t => ({
          'Data': new Date(t.solicitado_em).toLocaleString('pt-BR'),
          'Produto': t.produtos?.nome,
          'Quantidade': t.quantidade,
          'Unidade': t.produtos?.unidade,
          'Origem': t.centro_origem?.estoques?.nome + ' / ' + t.centro_origem?.nome,
          'Destino': t.centro_destino?.estoques?.nome + ' / ' + t.centro_destino?.nome,
          'Status': t.status,
          'Solicitante': t.solicitante?.nome,
          'Aprovador': t.admin?.nome || '',
        }))
      }

      const ws = XLSX.utils.json_to_sheet(dados)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Relatorio')
      XLSX.writeFile(wb, nomeArquivo)
    } finally { setGerandoExcel(false) }
  }

  async function gerarPdf() {
    setGerandoPdf(true)
    try {
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })

      let titulo = ''
      let colunas = []
      let linhas = []

      if (tipo === 'posicao') {
        titulo = 'Posicao de Estoque'
        colunas = ['Estoque', 'Centro', 'Produto', 'Tipo', 'Qtd', 'Unid', 'Min', 'Status']
        linhas = posicao.map(p => [
          p.estoque, p.centro, p.produto, p.tipo,
          p.quantidade, p.unidade, p.estoque_minimo,
          p.abaixo_minimo ? 'Baixo' : 'OK'
        ])
      } else if (tipo === 'movimentacoes') {
        titulo = 'Historico de Movimentacoes'
        colunas = ['Data', 'Tipo', 'Produto', 'Centro', 'Qtd', 'Unid', 'Motivo', 'Usuario']
        linhas = movimentacoes.map(m => [
          new Date(m.criado_em).toLocaleDateString('pt-BR'),
          m.tipo, m.produtos?.nome, m.centros?.nome,
          m.quantidade, m.produtos?.unidade,
          m.motivo || '', m.usuarios?.nome
        ])
      } else if (tipo === 'transferencias') {
        titulo = 'Transferencias'
        colunas = ['Data', 'Produto', 'Qtd', 'Origem', 'Destino', 'Status', 'Solicitante']
        linhas = transferencias.map(t => [
          new Date(t.solicitado_em).toLocaleDateString('pt-BR'),
          t.produtos?.nome, t.quantidade,
          t.centro_origem?.estoques?.nome + ' / ' + t.centro_origem?.nome,
          t.centro_destino?.estoques?.nome + ' / ' + t.centro_destino?.nome,
          t.status, t.solicitante?.nome
        ])
      }

      doc.setFontSize(14)
      doc.text(titulo, 14, 15)
      doc.setFontSize(9)
      doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 22)

      doc.autoTable({
        head: [colunas],
        body: linhas,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })

      doc.save(titulo.toLowerCase().replace(/ /g, '_') + '.pdf')
    } finally { setGerandoPdf(false) }
  }

  const dados = tipo === 'posicao' ? posicao : tipo === 'movimentacoes' ? movimentacoes : transferencias

  return (
    <AppLayout title="Relatorios">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Relatorios</h1>
          <p className="text-muted text-sm mt-1">Exporte dados em Excel ou PDF</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={gerarExcel} disabled={gerandoExcel || loading || dados.length === 0}>
            {gerandoExcel ? <span className="spinner" /> : 'Exportar Excel'}
          </button>
          <button className="btn btn-primary" onClick={gerarPdf} disabled={gerandoPdf || loading || dados.length === 0}>
            {gerandoPdf ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button className={'btn btn-sm ' + (tipo === 'posicao' ? 'btn-primary' : 'btn-secondary')} onClick={() => setTipo('posicao')}>Posicao de Estoque</button>
        <button className={'btn btn-sm ' + (tipo === 'movimentacoes' ? 'btn-primary' : 'btn-secondary')} onClick={() => setTipo('movimentacoes')}>Movimentacoes</button>
        <button className={'btn btn-sm ' + (tipo === 'transferencias' ? 'btn-primary' : 'btn-secondary')} onClick={() => setTipo('transferencias')}>Transferencias</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : dados.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhum dado encontrado</p></div>
        ) : (
          <div className="table-wrap">
            {tipo === 'posicao' && (
              <table>
                <thead><tr><th>Estoque</th><th>Centro</th><th>Produto</th><th>Tipo</th><th>Quantidade</th><th>Minimo</th><th>Status</th></tr></thead>
                <tbody>
                  {posicao.map(p => (
                    <tr key={p.id}>
                      <td>{p.estoque}</td>
                      <td>{p.centro}</td>
                      <td style={{ fontWeight: 500 }}>{p.produto}</td>
                      <td className="text-sm">{p.tipo}</td>
                      <td style={{ fontWeight: 600 }}>{p.quantidade} {p.unidade}</td>
                      <td className="text-sm text-muted">{p.estoque_minimo}</td>
                      <td>{p.abaixo_minimo ? <span className="badge badge-red">Baixo</span> : <span className="badge badge-green">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tipo === 'movimentacoes' && (
              <table>
                <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Centro</th><th>Quantidade</th><th>Motivo</th><th>Usuario</th></tr></thead>
                <tbody>
                  {movimentacoes.map(m => (
                    <tr key={m.id}>
                      <td className="text-xs">{new Date(m.criado_em).toLocaleString('pt-BR')}</td>
                      <td><span className={'badge ' + (m.tipo === 'entrada' ? 'badge-green' : m.tipo === 'saida' ? 'badge-red' : 'badge-blue')}>{m.tipo}</span></td>
                      <td style={{ fontWeight: 500 }}>{m.produtos?.nome}</td>
                      <td className="text-sm">{m.centros?.nome}</td>
                      <td style={{ fontWeight: 600 }}>{m.quantidade} {m.produtos?.unidade}</td>
                      <td className="text-sm text-muted">{m.motivo || '-'}</td>
                      <td className="text-sm">{m.usuarios?.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tipo === 'transferencias' && (
              <table>
                <thead><tr><th>Data</th><th>Produto</th><th>Quantidade</th><th>Origem</th><th>Destino</th><th>Status</th><th>Solicitante</th></tr></thead>
                <tbody>
                  {transferencias.map(t => (
                    <tr key={t.id}>
                      <td className="text-xs">{new Date(t.solicitado_em).toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 500 }}>{t.produtos?.nome}</td>
                      <td>{t.quantidade} {t.produtos?.unidade}</td>
                      <td className="text-sm">{t.centro_origem?.estoques?.nome} / {t.centro_origem?.nome}</td>
                      <td className="text-sm">{t.centro_destino?.estoques?.nome} / {t.centro_destino?.nome}</td>
                      <td><span className={'badge ' + (t.status === 'aprovada' ? 'badge-green' : t.status === 'pendente' ? 'badge-amber' : 'badge-red')}>{t.status}</span></td>
                      <td className="text-sm">{t.solicitante?.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
