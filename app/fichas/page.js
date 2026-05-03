'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api, isAdmin } from '../../lib/api'

const TIPO_BADGE = { revenda: 'badge-green', ambos: 'badge-amber' }
const TIPO_LABEL = { revenda: 'Revenda', ambos: 'Ambos' }

export default function FichasTecnicasPage() {
  const [aba, setAba] = useState('fichas')
  const [produtosVenda, setProdutosVenda] = useState([])
  const [insumos, setInsumos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [ficha, setFicha] = useState([])
  const [loadingFicha, setLoadingFicha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [novoItem, setNovoItem] = useState({ insumo_id: '', quantidade: '', unidade: 'un' })

  // Modal produto de venda
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', descricao: '', categoria_venda_id: '', tipo: 'revenda', unidade: 'un', estoque_minimo: '', valor_venda: '', dias_validade: '', unidade_insumo: '', fator_conversao: '' })
  const [salvandoProduto, setSalvandoProduto] = useState(false)
  const [erroProduto, setErroProduto] = useState('')

  // Modal categoria de venda
  const [modalCat, setModalCat] = useState(false)
  const [editandoCat, setEditandoCat] = useState(null)
  const [formCat, setFormCat] = useState({ nome: '', descricao: '' })
  const [salvandoCat, setSalvandoCat] = useState(false)
  const [erroCat, setErroCat] = useState('')

  const admin = isAdmin()

  async function carregar() {
    setLoading(true)
    try {
      const [vendas, todos, cats] = await Promise.all([
        api.get('/produtos?eh_produto_venda=true'),
        api.get('/produtos'),
        api.get('/categorias-venda')
      ])
      setProdutosVenda(vendas)
      setInsumos(todos.filter(x => x.tipo === 'materia_prima' || x.tipo === 'ambos'))
      setCategorias(cats)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  // ── Fichas ────────────────────────────────────────────────────────────

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
      unidade: novoItem.unidade || insumo?.unidade_insumo || insumo?.unidade || 'un',
      insumos: insumo
    }])
    setNovoItem({ insumo_id: '', quantidade: '', unidade: 'un' })
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
      const itens = ficha.map(f => ({ insumo_id: f.insumo_id, quantidade: Number(f.quantidade), unidade: f.unidade }))
      await api.post('/fichas/' + produtoSelecionado.id, { itens })
      setSucesso('Ficha tecnica salva com sucesso!')
      setTimeout(() => setSucesso(''), 4000)
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  // ── Produtos de Venda ─────────────────────────────────────────────────

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', descricao: '', categoria_venda_id: '', tipo: 'revenda', unidade: 'un', estoque_minimo: '', valor_venda: '', dias_validade: '', unidade_insumo: '', fator_conversao: '' })
    setErroProduto('')
    setModal(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({
      nome: p.nome, descricao: p.descricao || '',
      categoria_venda_id: p.categoria_venda_id || '',
      tipo: p.tipo, unidade: p.unidade, estoque_minimo: p.estoque_minimo,
      valor_venda: p.valor_venda || '', dias_validade: p.dias_validade || '',
      unidade_insumo: p.unidade_insumo || '', fator_conversao: p.fator_conversao || ''
    })
    setErroProduto('')
    setModal(true)
  }

  async function salvarProduto() {
    setErroProduto('')
    setSalvandoProduto(true)
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        categoria_venda_id: form.categoria_venda_id || null,
        tipo: form.tipo,
        unidade: form.unidade,
        eh_produto_venda: true,
        valor_venda: Number(form.valor_venda) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        dias_validade: form.dias_validade ? Number(form.dias_validade) : null,
        fator_conversao: form.fator_conversao ? Number(form.fator_conversao) : null,
        unidade_insumo: form.unidade_insumo || null
      }
      if (editando) {
        await api.put('/produtos/' + editando.id, payload)
      } else {
        // Precisa de categoria_id para a tabela produtos — usa a primeira categoria geral disponível ou cria sem
        const todasCats = await api.get('/categorias')
        const catPadrao = todasCats[0]?.id
        const sku = 'PV' + Date.now().toString().slice(-6)
        await api.post('/produtos', { ...payload, sku, categoria_id: catPadrao || null })
      }
      setModal(false)
      carregar()
    } catch (e) { setErroProduto(e.message) } finally { setSalvandoProduto(false) }
  }

  async function apagar(id) {
    if (!confirm('Apagar este produto de venda?')) return
    try { await api.put('/produtos/' + id, { ativo: false }); carregar() } catch (e) { alert(e.message) }
  }

  // ── Categorias de Venda ───────────────────────────────────────────────

  function abrirNovaCat() {
    setEditandoCat(null)
    setFormCat({ nome: '', descricao: '' })
    setErroCat('')
    setModalCat(true)
  }

  function abrirEditarCat(c) {
    setEditandoCat(c)
    setFormCat({ nome: c.nome, descricao: c.descricao || '' })
    setErroCat('')
    setModalCat(true)
  }

  async function salvarCategoria() {
    setErroCat('')
    setSalvandoCat(true)
    try {
      if (editandoCat) {
        await api.put('/categorias-venda/' + editandoCat.id, formCat)
      } else {
        await api.post('/categorias-venda', formCat)
      }
      setModalCat(false)
      carregar()
    } catch (e) { setErroCat(e.message) } finally { setSalvandoCat(false) }
  }

  async function apagarCategoria(id) {
    if (!confirm('Apagar esta categoria?')) return
    try { await api.put('/categorias-venda/' + id, { ativo: false }); carregar() } catch (e) { alert(e.message) }
  }

  const produtosFiltrados = produtosVenda.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const isAmbos = form.tipo === 'ambos'

  return (
    <AppLayout title="Fichas Tecnicas">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Fichas Tecnicas</h1>
          <p className="text-muted text-sm mt-1">Produtos de venda e composicao de insumos</p>
        </div>
        {admin && aba === 'produtos' && <button className="btn btn-primary" onClick={abrirNovo}>+ Novo produto de venda</button>}
        {admin && aba === 'categorias' && <button className="btn btn-primary" onClick={abrirNovaCat}>+ Nova categoria</button>}
      </div>

      <div className="flex gap-2 mb-4">
        <button className={'btn btn-sm ' + (aba === 'fichas' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('fichas')}>Fichas Tecnicas</button>
        <button className={'btn btn-sm ' + (aba === 'produtos' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('produtos')}>Produtos de Venda</button>
        <button className={'btn btn-sm ' + (aba === 'categorias' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('categorias')}>Categorias</button>
      </div>

      {/* ── ABA: FICHAS ── */}
      {aba === 'fichas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '.5rem', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Produtos de Venda</div>
            <div style={{ marginBottom: '.75rem' }}>
              <input className="input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ width: '100%' }} />
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><div className="spinner" /></div>
            ) : produtosFiltrados.length === 0 ? (
              <p className="text-sm text-muted" style={{ padding: '.5rem' }}>Nenhum produto de venda. Cadastre na aba "Produtos de Venda".</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                {produtosFiltrados.map(p => (
                  <button key={p.id} onClick={() => selecionarProduto(p)} style={{
                    width: '100%', textAlign: 'left', padding: '.5rem .75rem', borderRadius: 8,
                    border: 'none', cursor: 'pointer', transition: 'background .15s',
                    background: produtoSelecionado?.id === p.id ? 'var(--accent-s)' : 'transparent',
                    color: produtoSelecionado?.id === p.id ? 'var(--accent)' : 'var(--text-1)',
                    fontWeight: produtoSelecionado?.id === p.id ? 600 : 400
                  }}>
                    <div style={{ fontSize: '.85rem' }}>{p.nome}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2 }}>{p.unidade} · {p.categorias_venda?.nome || '-'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {!produtoSelecionado ? (
              <div className="card card-pad empty-state">
                <p className="text-sm">Selecione um produto de venda para montar sua ficha tecnica</p>
              </div>
            ) : (
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{produtoSelecionado.nome}</div>
                    <div className="text-sm text-muted">Insumos por <strong>1 {produtoSelecionado.unidade}</strong> vendida</div>
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
                        <p className="text-sm">Nenhum insumo ainda. Adicione abaixo.</p>
                      </div>
                    ) : (
                      <div className="table-wrap" style={{ marginBottom: '1.25rem' }}>
                        <table>
                          <thead><tr><th>Insumo</th><th style={{ width: 150 }}>Quantidade</th><th style={{ width: 80 }}>Unidade</th><th></th></tr></thead>
                          <tbody>
                            {ficha.map(item => (
                              <tr key={item.insumo_id}>
                                <td style={{ fontWeight: 500 }}>{item.insumos?.nome || item.insumo_id}</td>
                                <td>
                                  <input className="input" type="number" min="0.001" step="0.001" value={item.quantidade}
                                    onChange={e => atualizarQtd(item.insumo_id, e.target.value)}
                                    style={{ padding: '.3rem .5rem', fontSize: '.85rem' }} />
                                </td>
                                <td className="text-sm text-muted">{item.unidade}</td>
                                <td><button className="btn btn-danger btn-sm" onClick={() => removerItemLocal(item.insumo_id)}>Remover</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem', border: '1px dashed var(--border)' }}>
                      <div className="text-sm" style={{ fontWeight: 600, marginBottom: '.75rem', color: 'var(--text-2)' }}>+ Adicionar insumo</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 80px auto', gap: '.5rem', alignItems: 'end' }}>
                        <div className="field" style={{ margin: 0 }}>
                          <label className="label">Produto (insumo)</label>
                          <select className="select" value={novoItem.insumo_id}
                            onChange={e => {
                              const ins = insumos.find(i => i.id === e.target.value)
                              setNovoItem(n => ({ ...n, insumo_id: e.target.value, unidade: ins?.unidade_insumo || ins?.unidade || 'un' }))
                            }}>
                            <option value="">Selecione...</option>
                            {insumos.filter(i => !ficha.find(f => f.insumo_id === i.id)).map(i => (
                              <option key={i.id} value={i.id}>{i.nome} ({i.unidade_insumo || i.unidade})</option>
                            ))}
                          </select>
                        </div>
                        <div className="field" style={{ margin: 0 }}>
                          <label className="label">Quantidade</label>
                          <input className="input" type="number" min="0.001" step="0.001" placeholder="0" value={novoItem.quantidade} onChange={e => setNovoItem(n => ({ ...n, quantidade: e.target.value }))} />
                        </div>
                        <div className="field" style={{ margin: 0 }}>
                          <label className="label">Unidade</label>
                          <input className="input" value={novoItem.unidade} onChange={e => setNovoItem(n => ({ ...n, unidade: e.target.value }))} placeholder="un" />
                        </div>
                        <button className="btn btn-primary" onClick={adicionarItem} style={{ marginBottom: 1 }}>Adicionar</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA: PRODUTOS DE VENDA ── */}
      {aba === 'produtos' && (
        <div className="card">
          {loading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : produtosVenda.length === 0 ? (
            <div className="empty-state card-pad"><p className="text-sm">Nenhum produto de venda cadastrado</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Categoria</th><th>Tipo</th><th>Unidade</th><th>Conversao</th><th>Valor Venda</th><th></th></tr></thead>
                <tbody>
                  {produtosVenda.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.nome}</td>
                      <td className="text-sm text-muted">{p.categorias_venda?.nome || '-'}</td>
                      <td><span className={'badge ' + (TIPO_BADGE[p.tipo] || 'badge-gray')}>{TIPO_LABEL[p.tipo] || p.tipo}</span></td>
                      <td className="text-sm">{p.unidade}</td>
                      <td className="text-sm text-muted">
                        {p.fator_conversao && p.unidade_insumo ? '1 ' + p.unidade + ' = ' + p.fator_conversao + ' ' + p.unidade_insumo : '-'}
                      </td>
                      <td className="text-sm">{p.valor_venda ? 'R$ ' + Number(p.valor_venda).toFixed(2).replace('.', ',') : '-'}</td>
                      <td>
                        {admin && (
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>Editar</button>
                            <button className="btn btn-danger btn-sm" onClick={() => apagar(p.id)}>Apagar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA: CATEGORIAS ── */}
      {aba === 'categorias' && (
        <div className="card">
          {loading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : categorias.length === 0 ? (
            <div className="empty-state card-pad"><p className="text-sm">Nenhuma categoria cadastrada</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Descricao</th><th></th></tr></thead>
                <tbody>
                  {categorias.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.nome}</td>
                      <td className="text-sm text-muted">{c.descricao || '-'}</td>
                      <td>
                        {admin && (
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" onClick={() => abrirEditarCat(c)}>Editar</button>
                            <button className="btn btn-danger btn-sm" onClick={() => apagarCategoria(c.id)}>Apagar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal produto de venda */}
      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editando ? 'Editar produto de venda' : 'Novo produto de venda'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Nome *</label>
                <input className="input" placeholder="Ex: Drink Tropical" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">Categoria</label>
                  <select className="select" value={form.categoria_venda_id} onChange={e => setForm(f => ({ ...f, categoria_venda_id: e.target.value }))}>
                    <option value="">Sem categoria</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Tipo *</label>
                  <select className="select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="revenda">Revenda</option>
                    <option value="ambos">Ambos (venda + insumo)</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">Unidade de venda *</label>
                  <select className="select" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="cx">cx</option>
                    <option value="pc">pc</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Valor de venda (R$)</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0,00" value={form.valor_venda} onChange={e => setForm(f => ({ ...f, valor_venda: e.target.value }))} />
                </div>
              </div>
              {isAmbos && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '.875rem' }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '.6rem' }}>Conversao como insumo</div>
                  <div className="grid-2">
                    <div className="field" style={{ margin: 0 }}>
                      <label className="label">Unidade como insumo</label>
                      <select className="select" value={form.unidade_insumo} onChange={e => setForm(f => ({ ...f, unidade_insumo: e.target.value }))}>
                        <option value="">Mesma unidade</option>
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="un">un</option>
                      </select>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="label">{'Fator: 1 ' + form.unidade + ' = ? ' + (form.unidade_insumo || '...')}</label>
                      <input className="input" type="number" min="0.001" step="0.001" placeholder="Ex: 330" value={form.fator_conversao} onChange={e => setForm(f => ({ ...f, fator_conversao: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}
              <div className="grid-2">
                <div className="field">
                  <label className="label">Estoque minimo</label>
                  <input className="input" type="number" min="0" step="0.001" placeholder="0" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Dias de validade</label>
                  <input className="input" type="number" min="1" placeholder="Ex: 30" value={form.dias_validade} onChange={e => setForm(f => ({ ...f, dias_validade: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="label">Descricao</label>
                <textarea className="textarea" placeholder="Descricao opcional..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              {erroProduto && <div className="alert alert-red text-sm">{erroProduto}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarProduto} disabled={salvandoProduto || !form.nome}>
                {salvandoProduto ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal categoria */}
      {modalCat && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalCat(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editandoCat ? 'Editar categoria' : 'Nova categoria'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalCat(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Nome *</label>
                <input className="input" placeholder="Ex: Drinks, Porcoes..." value={formCat.nome} onChange={e => setFormCat(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Descricao</label>
                <input className="input" placeholder="Descricao opcional" value={formCat.descricao} onChange={e => setFormCat(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              {erroCat && <div className="alert alert-red text-sm">{erroCat}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalCat(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCategoria} disabled={salvandoCat || !formCat.nome}>
                {salvandoCat ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
