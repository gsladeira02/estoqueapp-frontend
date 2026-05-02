'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function EtiquetasPage() {
  const [produtos, setProdutos] = useState([])
  const [centros, setCentros] = useState([])
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [fabricacao, setFabricacao] = useState(new Date().toISOString().split('T')[0])
  const [quantidade, setQuantidade] = useState('')
  const [centroId, setCentroId] = useState('')
  const [copias, setCopias] = useState(1)
  const [registrarEntrada, setRegistrarEntrada] = useState(true)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([api.get('/produtos'), api.get('/centros')]).then(([p, c]) => {
      setProdutos(p)
      setCentros(c)
      setLoading(false)
    })
  }, [])

  function selecionarProduto(id) {
    const p = produtos.find(p => p.id === id)
    setProdutoSelecionado(p)
  }

  function calcularValidade() {
    if (!produtoSelecionado?.dias_validade || !fabricacao) return null
    const data = new Date(fabricacao + 'T00:00:00')
    data.setDate(data.getDate() + Number(produtoSelecionado.dias_validade))
    return data
  }

  const dataValidade = calcularValidade()
  const dataFabricacaoFormatada = fabricacao ? new Date(fabricacao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
  const dataValidadeFormatada = dataValidade ? dataValidade.toLocaleDateString('pt-BR') : '-'
  const dataValidadeISO = dataValidade ? dataValidade.toISOString().split('T')[0] : null

  const centroSelecionado = centros.find(c => c.id === centroId)

  async function imprimirERegistrar() {
    setErro('')
    setSucesso('')

    if (registrarEntrada && (!centroId || !quantidade)) {
      setErro('Selecione o local de fabricacao e informe a quantidade para registrar a entrada.')
      return
    }

    setSalvando(true)
    try {
      if (registrarEntrada && centroId && quantidade) {
        await api.post('/movimentacoes', {
          produto_id: produtoSelecionado.id,
          centro_id: centroId,
          tipo: 'entrada',
          quantidade: Number(quantidade),
          motivo: 'Entrada via etiquetadora',
          data_validade: dataValidadeISO || null,
        })
        setSucesso('Entrada registrada com sucesso!')
        setTimeout(() => setSucesso(''), 4000)
      }

      const qtdCopias = Number(copias) || 1
      const etiquetas = Array.from({ length: qtdCopias })

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
            }
            .etiqueta:last-child { page-break-after: avoid; }
            .topo { text-align: center; border-bottom: 1px solid #000; padding-bottom: 3mm; margin-bottom: 3mm; }
            .empresa { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: .05em; }
            .produto-nome { font-size: 16pt; font-weight: 900; text-align: center; line-height: 1.2; margin: 3mm 0; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2mm; margin: 2mm 0; }
            .info-item { border: 1px solid #000; border-radius: 2mm; padding: 2mm; text-align: center; }
            .info-label { font-size: 6pt; text-transform: uppercase; letter-spacing: .05em; color: #555; margin-bottom: 1mm; font-weight: bold; }
            .info-valor { font-size: 11pt; font-weight: 900; }
            .local-box { border: 1px solid #000; border-radius: 2mm; padding: 2mm 3mm; margin: 2mm 0; }
            .local-label { font-size: 6pt; text-transform: uppercase; letter-spacing: .05em; color: #555; font-weight: bold; }
            .local-valor { font-size: 10pt; font-weight: 700; }
            .datas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin: 2mm 0; }
            .data-item { border: 2px solid #000; border-radius: 2mm; padding: 2mm; text-align: center; }
            .data-label { font-size: 6pt; text-transform: uppercase; letter-spacing: .05em; color: #555; margin-bottom: 1mm; font-weight: bold; }
            .data-valor { font-size: 11pt; font-weight: 900; }
            .validade-box { border: 3px solid #000; border-radius: 2mm; padding: 3mm; text-align: center; margin: 2mm 0; background: #f0f0f0; }
            .validade-label { font-size: 7pt; text-transform: uppercase; letter-spacing: .05em; font-weight: bold; margin-bottom: 1mm; }
            .validade-valor { font-size: 18pt; font-weight: 900; letter-spacing: .05em; }
            .dias-info { font-size: 7pt; color: #555; margin-top: 1mm; }
            .rodape { text-align: center; font-size: 6pt; color: #777; border-top: 1px solid #ccc; padding-top: 2mm; }
            @media print { body { margin: 0; padding: 0; } }
            @page { size: 100mm 150mm; margin: 0; }
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
                  <div class="info-valor">${quantidade || '-'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Unidade</div>
                  <div class="info-valor">${produtoSelecionado?.unidade || '-'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Validade</div>
                  <div class="info-valor">${produtoSelecionado?.dias_validade ? produtoSelecionado.dias_validade + 'd' : '-'}</div>
                </div>
              </div>
              ${centroSelecionado ? `
              <div class="local-box">
                <div class="local-label">Local de fabricacao</div>
                <div class="local-valor">${centroSelecionado.estoques?.nome} / ${centroSelecionado.nome}</div>
              </div>
              ` : ''}
              <div class="datas-grid">
                <div class="data-item">
                  <div class="data-label">Fabricacao</div>
                  <div class="data-valor">${dataFabricacaoFormatada}</div>
                </div>
                <div class="data-item">
                  <div class="data-label">Vence em</div>
                  <div class="data-valor">${dataValidadeFormatada}</div>
                </div>
              </div>
              ${dataValidade ? `
              <div class="validade-box">
                <div class="validade-label">Consumir ate</div>
                <div class="validade-valor">${dataValidadeFormatada}</div>
                <div class="dias-info">${produtoSelecionado?.dias_validade} dias apos fabricacao</div>
              </div>
              ` : ''}
              <div class="rodape">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          `).join('')}
          <script>window.onload = function() { window.print() }</script>
        </body>
        </html>
      `)
      janela.document.close()
    } catch (e) {
      setErro(e.message || 'Erro ao registrar entrada')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <AppLayout title="Etiquetas">
      <div className="mb-4">
        <h1>Etiquetadora</h1>
        <p className="text-muted text-sm mt-1">Formato 100x150mm — Elgin L42 Pro</p>
      </div>

      {sucesso && <div className="alert alert-green mb-4">{sucesso}</div>}
      {erro && <div className="alert alert-red mb-4">{erro}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: '1rem' }}>Configurar etiqueta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label className="label">Produto *</label>
              <select className="select" value={produtoSelecionado?.id || ''} onChange={e => selecionarProduto(e.target.value)}>
                <option value="">Selecione o produto...</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} {p.dias_validade ? '(' + p.dias_validade + ' dias)' : ''}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="label">Local de fabricacao *</label>
              <select className="select" value={centroId} onChange={e => setCentroId(e.target.value)}>
                <option value="">Selecione o local...</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.estoques?.nome} / {c.nome}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="label">Quantidade *</label>
              <input className="input" type="number" min="0" step="0.001" placeholder="Ex: 10" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
            </div>

            <div className="field">
              <label className="label">Data de fabricacao</label>
              <input className="input" type="date" value={fabricacao} onChange={e => setFabricacao(e.target.value)} />
            </div>

            {produtoSelecionado?.dias_validade && (
              <div className="alert alert-green" style={{ fontSize: '.8rem' }}>
                Validade calculada automaticamente: <strong>{dataValidadeFormatada}</strong> ({produtoSelecionado.dias_validade} dias)
              </div>
            )}
            {produtoSelecionado && !produtoSelecionado.dias_validade && (
              <div className="alert alert-amber" style={{ fontSize: '.8rem' }}>
                Este produto nao tem dias de validade configurado. Configure em Produtos → Editar.
              </div>
            )}

            <div className="field">
              <label className="label">Numero de copias</label>
              <input className="input" type="number" min="1" max="100" placeholder="1" value={copias} onChange={e => setCopias(e.target.value)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)' }}>
              <input type="checkbox" id="registrarEntrada" checked={registrarEntrada} onChange={e => setRegistrarEntrada(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="registrarEntrada" style={{ fontSize: '.875rem', cursor: 'pointer', fontWeight: 500 }}>
                Registrar entrada no estoque automaticamente
              </label>
            </div>

            <button
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', marginTop: '.25rem' }}
              onClick={imprimirERegistrar}
              disabled={!produtoSelecionado || salvando}
            >
              {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Imprimir e registrar entrada'}
            </button>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: '1rem' }}>Preview</h3>
          {produtoSelecionado ? (
            <div style={{ border: '2px dashed var(--border-2)', borderRadius: 'var(--radius)', padding: '1.25rem', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '.6rem' }}>
                <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>EstoqueApp</div>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase', lineHeight: 1.2 }}>{produtoSelecionado.nome}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem' }}>
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.6rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.15rem', fontWeight: 700 }}>Qtd</div>
                  <div style={{ fontWeight: 900, fontSize: '.95rem' }}>{quantidade || '-'}</div>
                </div>
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.6rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.15rem', fontWeight: 700 }}>Unid</div>
                  <div style={{ fontWeight: 900, fontSize: '.95rem' }}>{produtoSelecionado.unidade}</div>
                </div>
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.6rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.15rem', fontWeight: 700 }}>Val.</div>
                  <div style={{ fontWeight: 900, fontSize: '.95rem' }}>{produtoSelecionado.dias_validade ? produtoSelecionado.dias_validade + 'd' : '-'}</div>
                </div>
              </div>
              {centroSelecionado && (
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.4rem .6rem' }}>
                  <div style={{ fontSize: '.6rem', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 }}>Local de fabricacao</div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{centroSelecionado.estoques?.nome} / {centroSelecionado.nome}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                <div style={{ border: '2px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.6rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.15rem', fontWeight: 700 }}>Fabricacao</div>
                  <div style={{ fontWeight: 900, fontSize: '.9rem' }}>{dataFabricacaoFormatada}</div>
                </div>
                <div style={{ border: '2px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.6rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.15rem', fontWeight: 700 }}>Vence em</div>
                  <div style={{ fontWeight: 900, fontSize: '.9rem' }}>{dataValidadeFormatada}</div>
                </div>
              </div>
              {dataValidade && (
                <div style={{ border: '3px solid var(--border-2)', borderRadius: 'var(--radius-s)', padding: '.6rem', textAlign: 'center', background: 'var(--surface)' }}>
                  <div style={{ fontSize: '.6rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.2rem', fontWeight: 700 }}>Consumir ate</div>
                  <div style={{ fontWeight: 900, fontSize: '1.3rem', letterSpacing: '.05em' }}>{dataValidadeFormatada}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text-3)', marginTop: '.2rem' }}>{produtoSelecionado.dias_validade} dias apos fabricacao</div>
                </div>
              )}
              <div style={{ textAlign: 'center', fontSize: '.6rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: '.4rem' }}>
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
