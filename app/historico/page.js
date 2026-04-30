'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

const ACAO_BADGE = { criacao: 'badge-green', edicao: 'badge-blue', exclusao: 'badge-red' }
const ACAO_LABEL = { criacao: 'Criacao', edicao: 'Edicao', exclusao: 'Exclusao' }
const TABELA_LABEL = {
  produtos: 'Produto',
  categorias: 'Categoria',
  estoques: 'Estoque',
  centros: 'Centro',
  usuarios: 'Usuario',
  movimentacoes: 'Movimentacao',
  transferencias: 'Transferencia',
  vendas: 'Venda'
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTabela, setFiltroTabela] = useState('')
  const [detalhe, setDetalhe] = useState(null)

  async function carregar() {
    setLoading(true)
    try {
      const params = filtroTabela ? '?tabela=' + filtroTabela : ''
      const data = await api.get('/historico' + params)
      setHistorico(data.dados || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroTabela])

  return (
    <AppLayout title="Historico de Alteracoes">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Historico de Alteracoes</h1>
          <p className="text-muted text-sm mt-1">Registro de todas as acoes no sistema</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={carregar}>Atualizar</button>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {['', 'produtos', 'categorias', 'estoques', 'centros', 'usuarios', 'movimentacoes', 'transferencias', 'vendas'].map(t => (
          <button
            key={t}
            className={'btn btn-sm ' + (filtroTabela === t ? 'btn-primary' : 'btn-secondary')}
            onClick={() => setFiltroTabela(t)}
          >
            {t === '' ? 'Todos' : TABELA_LABEL[t] || t}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : historico.length === 0 ? (
          <div className="empty-state card-pad">
            <p className="text-sm">Nenhuma alteracao registrada ainda</p>
            <p className="text-xs text-muted" style={{ marginTop: '.5rem' }}>As alteracoes serao registradas conforme o sistema for usado</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Usuario</th><th>Acao</th><th>Tabela</th><th>Detalhes</th></tr>
              </thead>
              <tbody>
                {historico.map(h => (
                  <tr key={h.id}>
                    <td className="text-xs text-muted">{new Date(h.criado_em).toLocaleString('pt-BR')}</td>
                    <td className="text-sm">{h.usuarios?.nome || '-'}</td>
                    <td><span className={'badge ' + ACAO_BADGE[h.acao]}>{ACAO_LABEL[h.acao]}</span></td>
                    <td className="text-sm">{TABELA_LABEL[h.tabela] || h.tabela}</td>
                    <td>
                      {(h.dados_anteriores || h.dados_novos) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetalhe(h)}>
                          Ver detalhes
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalhe && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setDetalhe(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Detalhes da Alteracao</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetalhe(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="flex gap-2 mb-2">
                <span className={'badge ' + ACAO_BADGE[detalhe.acao]}>{ACAO_LABEL[detalhe.acao]}</span>
                <span className="badge badge-gray">{TABELA_LABEL[detalhe.tabela] || detalhe.tabela}</span>
              </div>
              <p className="text-xs text-muted mb-4">{new Date(detalhe.criado_em).toLocaleString('pt-BR')} por {detalhe.usuarios?.nome}</p>

              {detalhe.dados_anteriores && (
                <div className="field">
                  <label className="label">Dados anteriores</label>
                  <div style={{ background: 'var(--red-s)', border: '1px solid #fecaca', borderRadius: 'var(--radius-s)', padding: '.75rem', fontSize: '.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(detalhe.dados_anteriores, null, 2)}
                  </div>
                </div>
              )}

              {detalhe.dados_novos && (
                <div className="field">
                  <label className="label">Dados novos</label>
                  <div style={{ background: 'var(--green-s)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-s)', padding: '.75rem', fontSize: '.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(detalhe.dados_novos, null, 2)}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetalhe(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
