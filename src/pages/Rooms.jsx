import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { getRooms, createRoom } from '../services/api'
import { useRoomsStore } from '../store/rooms'

export default function Rooms() {
  const token = useAuthStore(s => s.token)
  const username = useAuthStore(s => s.username)
  const navigate = useNavigate()
  const { rooms, setRooms, setCurrentRoomId } = useRoomsStore()

  const [name, setName] = useState('새 방')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    ;(async () => {
      try {
        const data = await getRooms(token)
        setRooms(data)
      } catch {
        setError('방 목록 불러오기 실패')
      }
    })()
  }, [token])

  const onCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const room = await createRoom({ name, is_private: false }, token)
      const data = await getRooms(token)
      setRooms(data)
    } catch {
      setError('방 생성 실패')
    } finally {
      setCreating(false)
    }
  }

  const onEnter = (roomId) => {
    setCurrentRoomId(roomId)
    navigate('/game')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>방 목록</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <form onSubmit={onCreate} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder='방 이름' />
          <button disabled={creating}>{creating ? '생성중...' : '방 생성'}</button>
        </form>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <ul style={{ display: 'grid', gap: 8, paddingLeft: 0 }}>
        {rooms.map(r => (
          <li key={r.id} style={{ listStyle: 'none', background: '#141a2b', color: 'white', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>id: {r.id}</div>
            </div>
            <button onClick={() => onEnter(r.id)}>입장</button>
          </li>
        ))}
      </ul>
      <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'grid', gap: 8 }}>
        <button onClick={() => navigate('/game')} style={{ padding: '10px 14px' }}>인벤토리 열기 (I)</button>
        <button onClick={() => navigate('/game')} style={{ padding: '10px 14px' }}>상점 열기 (O)</button>
      </div>
    </div>
  )
}


