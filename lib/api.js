const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function req(method, path, body) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/login'
    return
  }

  if (!res.ok) throw new Error(data.erro || 'Erro na requisicao')
  return data
}

export const api = {
  get:    (path)       => req('GET',   path),
  post:   (path, body) => req('POST',  path, body),
  put:    (path, body) => req('PUT',   path, body),
  patch:  (path, body) => req('PATCH', path, body),
  delete: (path)       => req('DELETE', path),
}

export function salvarSessao(token, usuario) {
  localStorage.setItem('token', token)
  localStorage.setItem('usuario', JSON.stringify(usuario))
}

export function getUsuario() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null }
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  window.location.href = '/login'
}

export function isAdmin() {
  return getUsuario()?.papel === 'admin'
}
