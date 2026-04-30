'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function RelatoriosPage() {
  const [posicao, setPosicao] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [transferencias, setTransferencias] = useState([])
  const [vendas, setVendas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])
  const [estoques, setEstoques] = useState([])
  const [loading, setLoading] = useState(false)
  const [gerandoExcel, setGerandoExcel] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [tipo, setTipo] = useState('posicao')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroEstoque, setFiltroEstoque] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    async function carregarFiltros() {
      const [c, p, e] = await Promise.all([api.get('/categorias'), api.get('/produtos'), api.get('/estoques')])
      setCategorias(c)
      setProdutos(p)
      setEstoques(e)
    }
    carregarFiltros()
  }, [])

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limite', '500')
      if (dataInicio) params.append('data_inicio', dataInicio)
      if (dataFim) params.append('data_fim', dataFim + 'T23:59:59')

      if (tipo === 'posicao') {
        if (filtroEstoque) params.append('estoque_id', filtroEstoque)
        if (filtroProduto) params.append('produto_id', filtroProduto)
        const data = await api.get('/posicao?' + params)
        setPosicao(data)
      } else if (tipo === 'movimentacoes') {
        if (filtroProduto) params.append('produto_id', filtroProduto)
        const data = await api.get('/movimentacoes?' + params)
        setMovimentacoes(data.dados || [])
      } else if (tipo === 'transferencias') {
        const data = await api.get('/transferencias?' + params)
        setTransferencias(data.dados || [])
      } else if (tipo === 'vendas') {
        const data = await api.get('/vendas?' + params)
        setVendas(data.dados || [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [tipo, filtroCategoria, filtroProduto, filtroEstoque, dataInicio, dataFim])

  const produtosFiltrados = filtroCategoria ? produtos.filter(p => p.categoria_id === filtroCategoria) : produtos

  function aplicarFiltros(dados) {
    let resultado = dados
    if (filtroCategoria && tipo === 'posicao') {
      resultado = resultado.filter(p => {
        const prod = produtos.find(pr => pr.nome === p.produto)
        return prod?.categoria_id === filtroCategoria
      })
    }
    if (filtroEstoque && tipo === 'posicao') {
      resultado = resultado.filter(p => {
        const est = estoques.find(e => e.id === filtroEstoque)
        return p.estoque === est?.nome
      })
    }
    return resultado
  }

  const dadosFiltrados = tipo === 'posicao' ? aplicarFiltros(posicao)
    : tipo === 'movimentacoes' ? movimentacoes
    : tipo === 'transferencias' ? transferencias
    : vendas

  const totalVendas = tipo === 'vendas' ? vendas.reduce((acc, v) => acc + Number(v.valor_total), 0) : 0

  async function gerarExcel() {
    setGerandoExcel(true)
    try {
      const XLSX = (await import('xlsx')).default
      let dados = []
      let nomeArquivo = ''
      if (tipo === 'posicao') {
        nomeArquivo = 'posicao_estoque.xlsx'
        dados = dadosFiltrados.map(p => ({ 'Estoque': p.estoque, 'Centro': p.centro, 'Produto': p.produto, 'Categoria': p.categoria, 'Tipo': p.tipo, 'Unidade': p.unidade, 'Quantidade': p.quantidade, 'Estoque Minimo': p.estoque_minimo, 'Status': p.abaixo_minimo ? 'Abaixo do minimo' : 'OK' }))
      } else if (tipo === 'movimentacoes') {
        nomeArquivo = 'movimentacoes.xlsx'
        dados = dadosFiltrados.map(m => ({ 'Data': new Date(m.criado_em).toLocaleString('pt-BR'), 'Tipo': m.tipo, 'Produto': m.produtos?.nome, 'Centro': m.centros?.nome, 'Estoque': m.centros?.estoques?.nome, 'Quantidade': m.quantidade, 'Unidade': m.produtos?.unidade, 'Custo Unitario': m.custo_unitario || 0, 'Custo Total': m.custo_total || 0, 'Motivo': m.motivo || '', 'Usuario': m.usuarios?.nome }))
      } else if (tipo === 'transferencias') {
        nomeArquivo = 'transferencias.xlsx'
        dados = dadosFiltrados.map(t => ({ 'Data': new Date(t.solicitado_em).toLocaleString('pt-BR'), 'Produto': t.produtos?.nome, 'Quantidade': t.quantidade, 'Origem': t.centro_origem?.estoques?.nome + ' / ' + t.centro_origem?.nome, 'Destino': t.centro_destino?.estoques?.nome + ' / ' + t.centro_destino?.nome, 'Status': t.status, 'Solicitante': t.solicitante?.nome, 'Aprovador': t.admin?.nome || '' }))
      } else if (tipo === 'vendas') {
        nomeArquivo = 'vendas.xlsx'
        dados = dadosFiltrados.map(v => ({ 'Data': new Date(v.criado_em).toLocaleString('pt-BR'), 'Produto': v.produtos?.nome, 'Centro': v.centros?.nome, 'Estoque': v.centros?.estoques?.nome, 'Quantidade': v.quantidade, 'Unidade': v.produtos?.unidade, 'Valor Unitario': v.valor_unitario, 'Valor Total': v.valor_total, 'Observacao': v.observacao || '', 'Usuario': v.usuarios?.nome }))
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
        colunas = ['Estoque', 'Centro', 'Produto', 'Categoria', 'Tipo', 'Qtd', 'Unid', 'Min', 'Status']
        linhas = dadosFiltrados.map(p => [p.estoque, p.centro, p.produto, p.categoria, p.tipo, p.quantidade, p.unidade, p.estoque_minimo, p.abaixo_minimo ? 'Baixo' : 'OK'])
      } else if (tipo === 'movimentacoes') {
        titulo = 'Historico de Movimentacoes'
        colunas = ['Data', 'Tipo', 'Produto', 'Centro', 'Qtd', 'Unid', 'Custo Unit.', 'Custo Total', 'Usuario']
        linhas = dadosFiltrados.map(m => [new Date(m.criado_em).toLocaleDateString('pt-BR'), m.tipo, m.produtos?.nome, m.centros?.nome, m.quantidade, m.produtos?.unidade, m.custo_unitario || 0, m.custo_total || 0, m.usuarios?.nome])
      } else if (tipo === 'transferencias') {
        titulo = 'Transferencias'
        colunas = ['Data', 'Produto', 'Qtd', 'Origem', 'Destino', 'Status', 'Solicitante', 'Aprovador']
        linhas = dadosFiltrados.map(t => [new Date(t.solicitado_em).toLocaleDateString('pt-BR'), t.produtos?.nome, t.quantidade, t.centro_origem?.estoques?.nome + ' / ' + t.centro_origem?.nome, t.centro_destino?.estoques?.nome + ' / ' + t.centro_destino?.nome, t.status, t.solicitante?.nome, t.admin?.nome || '-'])
      } else if (tipo === 'vendas') {
        titulo = 'Relatorio de Vendas'
        colunas = ['Data', 'Produto', 'Centro', 'Qtd', 'Unid', 'Valor Unit.', 'Valor Total', 'Usuario']
        linhas = dadosFiltrados.map(v => [new Date(v.criado_em).toLocaleDateString('pt-BR'), v.produtos?.nome, v.centros?.nome, v.quantidade, v.produtos?.unidade, 'R$ ' + Number(v.valor_unitario).toFixed(2).replace('.', ','), 'R$ ' + Number(v.valor_total).toFixed(2).replace('.', ','), v.usuarios?.nome])
      }
      doc.setFontSize(14)
      doc.text(titulo, 14, 15)
      doc.setFontSize(9)
      doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 22)
      if (dataInicio || dataFim) doc.text('Periodo: ' + (dataInicio || '-') + ' ate ' + (dataFim || '-'), 14, 28)
      doc.autoTable({ head: [colunas], body: linhas, startY: dataInicio || dataFim ? 34 : 28, styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] } })
      doc.save(titulo.toLowerCase().replace(/ /g, '_') + '.pdf')
    } finally { setGerandoPdf(false) }
  }

  function limparFiltros() {
    setFiltroCategoria('')
    setFiltroProduto('')
    setFiltroEstoque('')
    setDataInicio('')
    setDataFim('')
  }

  return (
    <AppLayout title="Relatorios">
      <div className="flex items-center justify-between mb-4">
        <div><h1>Relatorios</h1><p className="text-muted text-sm mt-1">Exporte dados em Excel ou PDF</p></div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={gerarExcel} disabled={gerandoExcel || loading || dadosFiltrados.length === 0}>
            {gerandoExcel ? <span className="spinner" /> : 'Exportar Excel'}
          </button>
          <button className="btn btn-primary" onClick={gerarPdf} disabled={gerandoPdf || loading || dadosFiltrados.length === 0}>
            {gerandoPdf ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {[['posicao','Posicao de Estoque'],['movimentacoes','Movimentacoes'],['transferencias','Transferencias'],['vendas','Vendas']].map(([v,l]) => (
          <button key={v} className={'btn btn-sm ' + (tipo === v ? 'btn-primary' : 'btn-secondary')} onClick={() => setTipo(v)}>{l}</button>
        ))}
      </div>

      <div className="card card-pad mb-4">
        <div className="grid-2" style={{ gap: '1rem' }}>
          {tipo !== 'transferencias' && tipo !== 'vendas' && (
            <>
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
                <select className="select" value={filtroEstoque} onChange={e => setFiltroEstoque(e.target.value)}>
                  <option value="">Todos os estoques</option>
                  {estoques.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            </>
          )}
          {tipo !== 'posicao' && (
            <>
              <div className="field">
                <label className="label">Data inicio</label>
                <input className="input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Data fim</label>
                <input className="input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </>
          )}
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>Limpar filtros</button>
          </div>
          {tipo === 'vendas' && totalVendas > 0 && (
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
        ) : dadosFiltrados.length === 0 ? (
          <div className="empty-state card-pad"><p className="text-sm">Nenhum dado encontrado</p></div>
        ) : (
          <div className="table-wrap">
            {tipo === 'posicao' && (
              <table>
                <thead><tr><th>Estoque</th><th>Centro</th><th>Produto</th><th>Categoria</th><th>Tipo</th><th>Quantidade</th><th>Minimo</th><th>Status</th></tr></thead>
                <tbody>{dadosFiltrados.map(p => (
                  <tr key={p.id}>
                    <td>{p.estoque}</td><td>{p.centro}</td><td style={{ fontWeight: 500 }}>{p.produto}</td>
                    <td className="text-sm text-muted">{p.categoria}</td><td className="text-sm">{p.tipo}</td>
                    <td style={{ fontWeight: 600 }}>{p.quantidade} {p.unidade}</td>
                    <td className="text-sm text-muted">{p.estoque_minimo}</td>
                    <td>{p.abaixo_minimo ? <span className="badge badge-red">Baixo</span> : <span className="badge badge-green">OK</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {tipo === 'movimentacoes' && (
              <table>
                <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Centro</th><th>Quantidade</th><th>Custo Unit.</th><th>Custo Total</th><th>Usuario</th></tr></thead>
                <tbody>{dadosFiltrados.map(m => (
                  <tr key={m.id}>
                    <td className="text-xs">{new Date(m.criado_em).toLocaleString('pt-BR')}</td>
                    <td><span className={'badge ' + (m.tipo === 'entrada' ? 'badge-green' : m.tipo === 'saida' ? 'badge-red' : 'badge-blue')}>{m.tipo}</span></td>
                    <td style={{ fontWeight: 500 }}>{m.produtos?.nome}</td>
                    <td className="text-sm">{m.centros?.nome}</td>
                    <td style={{ fontWeight: 600 }}>{m.quantidade} {m.produtos?.unidade}</td>
                    <td className="text-sm">{m.custo_unitario ? 'R$ ' + Number(m.custo_unitario).toFixed(2).replace('.', ',') : '-'}</td>
                    <td className="text-sm">{m.custo_total ? 'R$ ' + Number(m.custo_total).toFixed(2).replace('.', ',') : '-'}</td>
                    <td className="text-sm">{m.usuarios?.nome}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {tipo === 'transferencias' && (
              <table>
                <thead><tr><th>Data</th><th>Produto</th><th>Quantidade</th><th>Origem</th><th>Destino</th><th>Status</th><th>Solicitante</th><th>Aprovador</th></tr></thead>
                <tbody>{dadosFiltrados.map(t => (
                  <tr key={t.id}>
                    <td className="text-xs">{new Date(t.solicitado_em).toLocaleDateString('pt-BR')}</td>
                    <td style={{ fontWeight: 500 }}>{t.produtos?.nome}</td>
                    <td>{t.quantidade} {t.produtos?.unidade}</td>
                    <td className="text-sm">{t.centro_origem?.estoques?.nome} / {t.centro_origem?.nome}</td>
                    <td className="text-sm">{t.centro_destino?.estoques?.nome} / {t.centro_destino?.nome}</td>
                    <td><span className={'badge ' + (t.status === 'aprovada' ? 'badge-green' : t.status === 'pendente' ? 'badge-amber' : 'badge-red')}>{t.status}</span></td>
                    <td className="text-sm">{t.solicitante?.nome}</td>
                    <td className="text-sm">{t.admin?.nome || '-'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {tipo === 'vendas' && (
              <table>
                <thead><tr><th>Data</th><th>Produto</th><th>Centro</th><th>Quantidade</th><th>Valor Unit.</th><th>Valor Total</th><th>Usuario</th></tr></thead>
                <tbody>{dadosFiltrados.map(v => (
                  <tr key={v.id}>
                    <td className="text-xs">{new Date(v.criado_em).toLocaleString('pt-BR')}</td>
                    <td style={{ fontWeight: 500 }}>{v.produtos?.nome}</td>
                    <td className="text-sm">{v.centros?.nome}</td>
                    <td>{v.quantidade} {v.produtos?.unidade}</td>
                    <td className="text-sm">R$ {Number(v.valor_unitario).toFixed(2).replace('.', ',')}</td>
                    <td style={{ fontWeight: 600 }}>R$ {Number(v.valor_total).toFixed(2).replace('.', ',')}</td>
                    <td className="text-sm">{v.usuarios?.nome}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
