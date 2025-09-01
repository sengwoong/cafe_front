const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export async function login({ username, password }) {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password || 'any')
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!res.ok) throw new Error('Login failed')
  return res.json()
}

export function wsUrl(token) {
  const base = (import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000')
  return `${base}/api/v1/ws?token=${encodeURIComponent(token)}`
}

export async function registerUser({ username, avatar_url }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, avatar_url }),
  })
  if (!res.ok) throw new Error('Register failed')
  return res.json()
}

export async function addInventoryItem({ type, quantity = 1, metadata }, token) {
  const res = await fetch(`${BASE_URL}/inventory/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ type, quantity, metadata: metadata || null }),
  })
  if (!res.ok) throw new Error('Add inventory failed')
  return res.json()
}

// Rooms
export async function getRooms(token, { skip = 0, limit = 100, public_only = true } = {}) {
  const qs = new URLSearchParams({ skip, limit, public_only })
  const res = await fetch(`${BASE_URL}/rooms/?${qs.toString()}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) throw new Error('Get rooms failed')
  return res.json()
}

export async function createRoom({ name, is_private = false }, token) {
  const res = await fetch(`${BASE_URL}/rooms/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, is_private }),
  })
  if (!res.ok) throw new Error('Create room failed')
  return res.json()
}

export async function pickupObject(objectId, token) {
  // 임시: 서버에 DELETE가 없다면 /inventory/place 반대로 동작하는 엔드포인트가 필요
  // 여기서는 WS로 처리하므로 REST는 더미로 유지
  return { ok: true }
}


