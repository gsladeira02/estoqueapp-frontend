'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api } from '../../lib/api'

export default function FichasTecnicasPage() {
  const [produtosVenda, setProdutosVenda] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [ficha, setFicha] = useState([])
  const [loadingFicha, setLoadingFicha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [novoItem, setNovoItem] = useState({ insumo_id: '', quantidade: '', unidade: 'un', observacao: '' })

  async function carregar() {
    setLoading(true)
    try {
      const todos = await api.get('/produtos')
      // Esquerda: produtos de venda (revenda ou ambos)
      setProdutosVenda(todos.filter(x => x.tipo === 'revenda' || x.tipo === 'ambos'))
      // Insumos: materia_prima ou ambos
      setInsumos(todos.filter(x => x.tipo === 'materia_prima' || x.tipo === 'ambos'))
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  async function selecionarProduto(produto) {
    setProdutoSelecionado(produto)
    setFicha([])
    setErro('')
    setSucesso('')
    setLoadingFicha(true)
    try {
      const data = await api.get('/fichas/' + produto.id)
      setFicha(data)
    } catch { setFicha([]) } finally { setLoadingFicha(false) }
  }

  function adicionarItem() {
    if (!novoItem.insumo_id || !novoItem.quantidade || Number(novoItem.quantidade) <= 0) {
      setErro('Selecione um insumo e informe a quantidade')
      return
    }
    if (ficha.find(f => f.insumo_id === novoItem.insumo_id)) {
      setErro('Este insumo ja esta na ficha')
      return
    }
    const insumo = insumos.find(i => i.id === novoItem.insumo_id)
    setFicha(f => [...f, {
      insumo_id: novoItem.insumo_id,
      quantidade: Number(novoItem.quantidade),
      unidade: novoItem.unidade || insumo?.unidade || 'un',
      observacao: novoItem.observacao,
      insumos: insumo
    }])
    setNovoItem({ insumo_id: '', quantidade: '', unidade: 'un', observacao: '' })
    setErro('')
  }

  function removerItemLocal(insumo_id) {
    setFicha(f => f.filter(x => x.insumo_id !== insumo_id))
  }

  function atualizarQtd(insumo_id, valor) {
    setFicha(f => f.map(x => x.insumo_id === insumo_id ? { ...x, quantidade: valor } : x))
  }

  async function salvarFicha() {
    if (!produtoSelecionado) return
    setSalvando(true)
    setErro('')
    setSucesso('')
    try {
      const itens = ficha.map(f => ({
        insumo_id: f.insumo_id,
        quantidade: Number(f.quantidade),
        unidade: f.unidade,
        observacao: f.observacao || null
      }))
      await api.post('/fichas/' + produtoSelecionado.id, { itens })
      setSucesso('Ficha tecnica salva com sucesso!')
      setTimeout(() => setSucesso(''), 4000)
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  const produtosFiltrados = produtosVenda.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <AppLayout title="Fichas Tecnicas">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Fichas Tecnicas</h1>
          <p className="text-muted text-sm mt-1">Defina os insumos consumidos por produto de venda</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Lista de produtos de venda */}
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '.5rem', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Produtos de Venda
          </div>
          <div style={{ marginBottom: '.75rem' }}>
            <input
              className="input"
              placeholder="Buscar..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><div className="spinner" /></div>
          ) : produtosFiltrados.length === 0 ? (
            <p className="text-sm text-muted" style={{ padding: '.5rem' }}>
              Nenhum produto de venda encontrado. Cadastre em Produtos → Produtos de Venda.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {produtosFiltrados.map(p => (
                <button
                  key={p.id}
                  onClick={() => selecionarProduto(p)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '.5rem .75rem', borderRadius: 8,
                    border: 'none', cursor: 'pointer', transition: 'background .15s',
                    background: produtoSelecionado?.id === p.id ? 'var(--accent-s)' : 'transparent',
                    color: produtoSelecionado?.id === p.id ? 'var(--accent)' : 'var(--text-1)',
                    fontWeight: produtoSelecionado?.id === p.id ? 600 : 400
                  }}
                >
                  <div style={{ fontSize: '.85rem' }}>{p.nome}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2 }}>{p.unidade} · {p.categorias?.nome}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor da ficha */}
        <div>
          {!produtoSelecionado ? (
            <div className="card card-pad empty-state">
              <p className="text-sm">Selecione um produto de venda para ver ou editar sua ficha tecnica</p>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{produtoSelecionado.nome}</div>
                  <div className="text-sm text-muted">Insumos consumidos a cada <strong>1 {produtoSelecionado.unidade}</strong> vendida</div>
                </div>
                <button className="btn btn-primary" onClick={salvarFicha} disabled={salvando}>
                  {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Salvar ficha'}
                </button>
              </div>

              {sucesso && <div className="alert alert-green mb-4 text-sm">{sucesso}</div>}
              {erro && <div className="alert alert-red mb-4 text-sm">{erro}</div>}

              {loadingFicha ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
              ) : (
                <>
                  {ficha.length === 0 ? (
                    <div className="empty-state" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                      <p className="text-sm">Nenhum insumo na ficha. Adicione abaixo.</p>
                    </div>
                  ) : (
                    <div className="table-wrap" style={{ marginBottom: '1.25rem' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Insumo</th>
                            <th style={{ width: 150 }}>Quantidade</th>
                            <th style={{ width: 80 }}>Unidade</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {ficha.map(item => (
                            <tr key={item.insumo_id}>
                              <td style={{ fontWeight: 500 }}>{item.insumos?.nome || item.insumo_id}</td>
                              <td>
                                <input
                                  className="input"
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={item.quantidade}
                                  onChange={e => atualizarQtd(item.insumo_id, e.target.value)}
                                  style={{ padding: '.3rem .5rem', fontSize: '.85rem' }}
                                />
                              </td>
                              <td className="text-sm text-muted">{item.unidade}</td>
                              <td>
                                <button className="btn btn-danger btn-sm" onClick={() => removerItemLocal(item.insumo_id)}>
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Adicionar novo item */}
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem', border: '1px dashed var(--border)' }}>
                    <div className="text-sm" style={{ fontWeight: 600, marginBottom: '.75rem', color: 'var(--text-2)' }}>
                      + Adicionar insumo
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 80px auto', gap: '.5rem', alignItems: 'end' }}>
                      <div className="field" style={{ margin: 0 }}>
                        <label className="label">Produto (insumo)</label>
                        <select
                          className="select"
                          value={novoItem.insumo_id}
                          onChange={e => {
                            const ins = insumos.find(i => i.id === e.target.value)
                            setNovoItem(n => ({ ...n, insumo_id: e.target.value, unidade: ins?.unidade || 'un' }))
                          }}
                        >
                          <option value="">Selecione...</option>
                          {insumos
                            .filter(i => !ficha.find(f => f.insumo_id === i.id))
                            .map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)
                          }
                        </select>
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label className="label">Quantidade</label>
                        <input
                          className="input"
                          type="number"
                          min="0.001"
                          step="0.001"
                          placeholder="0"
                          value={novoItem.quantidade}
                          onChange={e => setNovoItem(n => ({ ...n, quantidade: e.target.value }))}
                        />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label className="label">Unidade</label>
                        <input
                          className="input"
                          value={novoItem.unidade}
                          onChange={e => setNovoItem(n => ({ ...n, unidade: e.target.value }))}
                          placeholder="un"
                        />
                      </div>
                      <button className="btn btn-primary" onClick={adicionarItem} style={{ marginBottom: 1 }}>
                        Adicionar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
