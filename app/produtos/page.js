'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { api, isAdmin } from '../../lib/api'

const TIPO_LABEL = { materia_prima: 'Materia-prima', revenda: 'Revenda', ambos: 'Ambos' }
const TIPO_BADGE = { materia_prima: 'badge-blue', revenda: 'badge-green', ambos: 'badge-amber' }

export default function ProdutosPage() {
  const [aba, setAba] = useState('produtos')
  const [produtos, setProdutos] = useState([])
  const [produtosVenda, setProdutosVenda] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalCategoria, setModalCategoria] = useState(false)
  const [editando, setEditando] = useState(null)
  const [tipoModal, setTipoModal] = useState('materia_prima')
  const [form, setForm] = useState({ nome: '', descricao: '', categoria_id: '', tipo: 'materia_prima', unidade: 'un', estoque_minimo: '', valor_venda: '', dias_validade: '', unidade_insumo: '', fator_conversao: '' })
  const [formCat, setFormCat] = useState({ nome: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const admin = isAdmin()

  async function carregar() {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        api.get('/produtos?busca=' + busca + (filtroCategoria ? '&categoria_id=' + filtroCategoria : '')),
        api.get('/categorias')
      ])
      setProdutos(p.filter(x => x.tipo === 'materia_prima'))
      setProdutosVenda(p.filter(x => x.tipo === 'revenda' || x.tipo === 'ambos'))
      setCategorias(c)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [busca, filtroCategoria])

  function abrirNovo(tipo) {
    setEditando(null)
    setTipoModal(tipo)
    setForm({ nome: '', descricao: '', categoria_id: '', tipo, unidade: 'un', estoque_minimo: '', valor_venda: '', dias_validade: '', unidade_insumo: '', fator_conversao: '' })
    setErro('')
    setModal(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setTipoModal(p.tipo)
    setForm({
      nome: p.nome, descricao: p.descricao || '', categoria_id: p.categoria_id,
      tipo: p.tipo, unidade: p.unidade, estoque_minimo: p.estoque_minimo,
      valor_venda: p.valor_venda || '', dias_validade: p.dias_validade || '',
      unidade_insumo: p.unidade_insumo || '', fator_conversao: p.fator_conversao || ''
    })
    setErro('')
    setModal(true)
  }

  async function apagar(id) {
    if (!confirm('Tem certeza que deseja apagar este produto?')) return
    try { await api.put('/produtos/' + id, { ativo: false }); carregar() } catch (e) { alert(e.message) }
  }

  async function apagarCategoria(id) {
    if (!confirm('Tem certeza que deseja apagar esta categoria?')) return
    try { await api.put('/categorias/' + id, { ativo: false }); carregar() } catch (e) { alert(e.message) }
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      const payload = {
        ...form,
        valor_venda: Number(form.valor_venda) || 0,
        dias_validade: form.dias_validade ? Number(form.dias_validade) : null,
        fator_conversao: form.fator_conversao ? Number(form.fator_conversao) : null,
        unidade_insumo: form.unidade_insumo || null
      }
      if (editando) {
        await api.put('/produtos/' + editando.id, payload)
      } else {
        const sku = 'P' + Date.now().toString().slice(-6)
        await api.post('/produtos', { ...payload, sku, estoque_minimo: Number(form.estoque_minimo) || 0 })
      }
      setModal(false)
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  async function salvarCategoria() {
    setErro('')
    setSalvando(true)
    try {
      await api.post('/categorias', formCat)
      setModalCategoria(false)
      setFormCat({ nome: '', descricao: '' })
      carregar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  const isVenda = aba === 'venda'
  const listaAtual = isVenda ? produtosVenda : produtos
  const isAmbos = form.tipo === 'ambos'

  return (
    <AppLayout title="Produtos">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Produtos</h1>
          <p className="text-muted text-sm mt-1">Base de dados de produtos e categorias</p>
        </div>
        {admin && (
          <div className="flex gap-2">
            {aba === 'produtos' && <button className="btn btn-primary" onClick={() => abrirNovo('materia_prima')}>+ Novo produto</button>}
            {aba === 'venda' && <button className="btn btn-primary" onClick={() => abrirNovo('revenda')}>+ Novo produto de venda</button>}
            {aba === 'categorias' && <button className="btn btn-primary" onClick={() => { setFormCat({ nome: '', descricao: '' }); setErro(''); setModalCategoria(true) }}>+ Nova categoria</button>}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button className={'btn btn-sm ' + (aba === 'produtos' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('produtos')}>Produtos</button>
        <button className={'btn btn-sm ' + (aba === 'venda' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('venda')}>Produtos de Venda</button>
        <button className={'btn btn-sm ' + (aba === 'categorias' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAba('categorias')}>Categorias</button>
      </div>

      {(aba === 'produtos' || aba === 'venda') && (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <input className="input" placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth: 280 }} />
            <select className="select" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {(busca || filtroCategoria) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setFiltroCategoria('') }}>Limpar</button>
            )}
          </div>
          <div className="card">
            {loading ? (
              <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
            ) : listaAtual.length === 0 ? (
              <div className="empty-state card-pad"><p className="text-sm">Nenhum produto encontrado</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Unidade</th>
                      <th>Conversao</th>
                      <th>Min.</th>
                      {isVenda && <th>Valor Venda</th>}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaAtual.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.nome}</td>
                        <td className="text-sm text-muted">{p.categorias?.nome}</td>
                        <td><span className={'badge ' + TIPO_BADGE[p.tipo]}>{TIPO_LABEL[p.tipo]}</span></td>
                        <td className="text-sm">{p.unidade}</td>
                        <td className="text-sm text-muted">
                          {p.fator_conversao && p.unidade_insumo
                            ? '1 ' + p.unidade + ' = ' + p.fator_conversao + ' ' + p.unidade_insumo
                            : '-'}
                        </td>
                        <td className="text-sm">{p.estoque_minimo}</td>
                        {isVenda && <td className="text-sm font-semibold">{p.valor_venda ? 'R$ ' + Number(p.valor_venda).toFixed(2).replace('.', ',') : '-'}</td>}
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
        </>
      )}

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
                      <td>{admin && <button className="btn btn-danger btn-sm" onClick={() => apagarCategoria(c.id)}>Apagar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editando ? 'Editar produto' : (tipoModal === 'revenda' ? 'Novo produto de venda' : 'Novo produto')}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Nome *</label>
                <input className="input" placeholder="Nome do produto" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">Categoria *</label>
                  <select className="select" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Tipo *</label>
                  <select className="select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="materia_prima">Materia-prima</option>
                    <option value="revenda">Revenda</option>
                    <option value="ambos">Ambos (venda + insumo)</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">Unidade *</label>
                  <select className="select" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="m">m</option>
                    <option value="cx">cx</option>
                    <option value="pc">pc</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Estoque minimo</label>
                  <input className="input" type="number" min="0" step="0.001" placeholder="0" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} />
                </div>
              </div>

              {isAmbos && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '.875rem', marginBottom: '.25rem' }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '.6rem' }}>
                    Conversao como insumo
                  </div>
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
                        <option value="m">m</option>
                      </select>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="label">{'Fator: 1 ' + form.unidade + ' = ? ' + (form.unidade_insumo || '...')}</label>
                      <input
                        className="input"
                        type="number"
                        min="0.001"
                        step="0.001"
                        placeholder="Ex: 330"
                        value={form.fator_conversao}
                        onChange={e => setForm(f => ({ ...f, fator_conversao: e.target.value }))}
                      />
                    </div>
                  </div>
                  {form.fator_conversao && form.unidade_insumo && (
                    <div style={{ fontSize: '.78rem', color: 'var(--text-2)', marginTop: '.5rem' }}>
                      {'Ao transferir como insumo: 1 ' + form.unidade + ' -> ' + form.fator_conversao + ' ' + form.unidade_insumo}
                    </div>
                  )}
                </div>
              )}

              <div className="grid-2">
                <div className="field">
                  <label className="label">Valor de venda (R$)</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0,00" value={form.valor_venda} onChange={e => setForm(f => ({ ...f, valor_venda: e.target.value }))} />
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
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando || !form.nome || !form.categoria_id}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCategoria && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalCategoria(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Nova categoria</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalCategoria(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Nome *</label>
                <input className="input" placeholder="Nome da categoria" value={formCat.nome} onChange={e => setFormCat(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Descricao</label>
                <input className="input" placeholder="Descricao opcional" value={formCat.descricao} onChange={e => setFormCat(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              {erro && <div className="alert alert-red text-sm">{erro}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalCategoria(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCategoria} disabled={salvando || !formCat.nome}>
                {salvando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
