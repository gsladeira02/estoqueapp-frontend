'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function EtiquetasPage() {
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState({ produto_id: '', quantidade: '', validade: '', copias: 1 })
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/produtos').then(data => { setProdutos(data); setLoading(false) })
  }, [])

  function selecionarProduto(id) {
    const p = produtos.find(p => p.id === id)
    setProdutoSelecionado(p)
    setForm(f => ({ ...f, produto_id: id }))
  }

  function imprimir() {
    const copias = Number(form.copias) || 1
    const etiquetas = Array.from({ length: copias })

    const janela = window.open('', '_blank')
    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <title>Etiqueta - ${produtoSelecionado?.nome}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: #fff; }
          
          .etiqueta {
            width: 100mm;
            height: 150mm;
            padding: 6mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            border: 1px solid #000;
          }

          .etiqueta:last-child { page-break-after: avoid; }

          .topo {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 4mm;
            margin-bottom: 4mm;
          }

          .empresa {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: .05em;
          }

          .produto-nome {
            font-size: 16pt;
            font-weight: 900;
            text-align: center;
            line-height: 1.2;
            margin: 4mm 0;
            text-transform: uppercase;
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3mm;
            margin: 4mm 0;
          }

          .info-item {
            border: 1px solid #000;
            border-radius: 2mm;
            padding: 2mm 3mm;
            text-align: center;
          }

          .info-label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: #555;
            margin-bottom: 1mm;
          }

          .info-valor {
            font-size: 14pt;
            font-weight: 900;
          }

          .validade-destaque {
            border: 2px solid #000;
            border-radius: 2mm;
            padding: 3mm;
            text-align: center;
            margin: 3mm 0;
          }

          .validade-label {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: .05em;
            margin-bottom: 1mm;
          }

          .validade-valor {
            font-size: 20pt;
            font-weight: 900;
            letter-spacing: .05em;
          }

          .rodape {
            text-align: center;
            font-size: 7pt;
            color: #777;
            border-top: 1px solid #ccc;
            padding-top: 2mm;
          }

          @media print {
            body { margin: 0; padding: 0; }
            .etiqueta { border: none; }
          }

          @page {
            size: 100mm 150mm;
            margin: 0;
          }
        </style>
      </head>
      <body>
        ${etiquetas.map(() => `
          <div class="etiqueta">
            <div class="topo">
              <div class="empresa">EstoqueApp</div>
            </div>

            <div class="produto-nome">${produtoSelecionado?.nome}</div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Quantidade</div>
                <div class="info-valor">${form.quantidade || '-'} ${produtoSelecionado?.unidade || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Unidade</div>
                <div class="info-valor">${produtoSelecionado?.unidade || '-'}</div>
              </div>
            </div>

            ${form.validade ? `
            <div class="validade-destaque">
              <div class="validade-label">Data de Validade</div>
              <div class="validade-valor">${new Date(form.validade + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            </div>
            ` : ''}

            <div class="rodape">
              Gerado em ${new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        `).join('')}
        <script>window.onload = function() { window.print() }</script>
      </body>
      </html>
    `)
    janela.document.close()
  }

  return (
    <AppLayout title="Etiquetas">
      <div className="mb-4">
        <h1>Etiquetadora</h1>
        <p className="text-muted text-sm mt-1">Gere etiquetas para impressao — formato 100x150mm (Elgin L42 Pro)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: '1rem' }}>Configurar etiqueta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label className="label">Produto *</label>
              <select className="select" value={form.produto_id} onChange={e => selecionarProduto(e.target.value)}>
                <option value="">Selecione o produto...</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Quantidade</label>
              <input className="input" type="number" min="0" step="0.001" placeholder="Ex: 10" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Data de validade</label>
              <input className="input" type="date" value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Numero de copias</label>
              <input className="input" type="number" min="1" max="100" placeholder="1" value={form.copias} onChange={e => setForm(f => ({ ...f, copias: e.target.value }))} />
            </div>
            <button
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', marginTop: '.5rem' }}
              onClick={imprimir}
              disabled={!form.produto_id}
            >
              Imprimir etiqueta
            </button>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: '1rem' }}>Preview</h3>
          {produtoSelecionado ? (
            <div style={{ border: '2px dashed var(--border-2)', borderRadius: 'var(--radius)', padding: '1.5rem', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '.75rem' }}>
                <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>EstoqueApp</div>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', lineHeight: 1.2 }}>{produtoSelecionado.nome}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.65rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.2rem' }}>Quantidade</div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{form.quantidade || '-'} {produtoSelecionado.unidade}</div>
                </div>
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.65rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.2rem' }}>Unidade</div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{produtoSelecionado.unidade}</div>
                </div>
              </div>
              {form.validade && (
                <div style={{ border: '2px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.65rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.2rem' }}>Data de Validade</div>
                  <div style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.05em' }}>{new Date(form.validade + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                </div>
              )}
              <div style={{ textAlign: 'center', fontSize: '.65rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: '.5rem' }}>
                {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <p className="text-sm">Selecione um produto para ver o preview</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
