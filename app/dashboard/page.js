'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api, isAdmin, getUsuario } from '../../lib/api'

export default function DashboardPage() {
  const [painel, setPainel] = useState(null)
  const [posicao, setPosicao] = useState([])
  const [loading, setLoading] = useState(true)
  const admin = isAdmin()
  const usuario = getUsuario()

  useEffect(() => {
    async function carregar() {
      try {
        if (admin) {
          const data = await api.get('/painel')
          setPainel(data)
        } else {
          const data = await api.get('/posicao')
          setPosicao(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  if (loading) return (
    <AppLayout title="Painel">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="spinner" />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout title="Painel">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Ola, {usuario?.nome?.split(' ')[0]}</h1>
        <p className="text-muted text-sm mt-1">
          {admin ? 'Visao geral de todos os estoques' : 'Seus centros de estoque'}
        </p>
      </div>

      {admin && painel && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Produtos</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>
                {new Set(painel.consolidado.map(c => c.produto_id)).size}
              </div>
              <div className="stat-sub">cadastrados</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Transferencias</div>
              <div className="stat-value" style={{ color: 'var(--amber)' }}>
                {painel.resumo.total_pendentes}
              </div>
              <div className="stat-sub">pendentes</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Alertas</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>
                {painel.resumo.total_alertas}
              </div>
              <div className="stat-sub">estoque baixo</div>
            </div>
          </div>

          {painel.alertas_estoque_baixo.length > 0 && (
            <div className="card mb-4">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <h3>Estoque abaixo do minimo</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Produto</th><th>Centro</th><th>Atual</th><th>Minimo</th></tr>
                  </thead>
                  <tbody>
                    {painel.alertas_estoque_baixo.map(a => (
                      <tr key={a.id}>
                        <td><div style={{ fontWeight: 500 }}>{a.produto}</div><div className="text-xs text-muted">{a.sku}</div></td>
                        <td><div>{a.estoque}</div><div className="text-xs text-muted">{a.centro}</div></td>
                        <td><span className="badge badge-red">{a.quantidade} {a.unidade}</span></td>
                        <td className="text-muted">{a.estoque_minimo} {a.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {painel.transferencias_pendentes.length > 0 && (
            <div className="card">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Transferencias pendentes</h3>
                <a href="/transferencias" className="btn btn-ghost btn-sm">Ver todas</a>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Produto</th><th>Origem / Destino</th><th>Qtd</th><th>Solicitante</th></tr>
                  </thead>
                  <tbody>
                    {painel.transferencias_pendentes.map(t => (
                      <tr key={t.id}>
                        <td><div style={{ fontWeight: 500 }}>{t.produto}</div></td>
                        <td><div className="text-sm">{t.estoque_origem} / {t.centro_origem}</div><div className="text-xs text-muted">para {t.estoque_destino} / {t.centro_destino}</div></td>
                        <td>{t.quantidade} {t.unidade}</td>
                        <td className="text-sm">{t.solicitante}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {painel.transferencias_pendentes.length === 0 && painel.alertas_estoque_baixo.length === 0 && (
            <div className="card card-pad">
              <div className="empty-state">
                <p style={{ fontWeight: 600 }}>Tudo em ordem!</p>
                <p className="text-sm">Sem alertas ou transferencias pendentes.</p>
              </div>
            </div>
          )}
        </>
      )}

      {!admin && (
        <div className="card">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h3>Posicao atual</h3>
          </div>
          {posicao.length === 0 ? (
            <div className="empty-state card-pad">
              <p className="text-sm">Nenhum produto registrado ainda.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Produto</th><th>Centro</th><th>Quantidade</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {posicao.map(p => (
                    <tr key={p.id}>
                      <td><div style={{ fontWeight: 500 }}>{p.produto}</div><div className="text-xs text-muted">{p.sku}</div></td>
                      <td><div>{p.centro}</div><div className="text-xs text-muted">{p.estoque}</div></td>
                      <td>{p.quantidade} {p.unidade}</td>
                      <td>{p.abaixo_minimo ? <span className="badge badge-red">Baixo</span> : <span className="badge badge-green">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
