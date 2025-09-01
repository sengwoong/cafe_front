import { useGameStore } from '../store/game'

export default function RoomPanel({ roomId = 1, connected }) {
  const users = useGameStore(s => s.users)
  const objects = useGameStore(s => s.objects)
  return (
    <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 2, background: '#141a2b', color: 'white', padding: 8, borderRadius: 6, width: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Room #{roomId}</span>
        <span style={{ color: connected ? '#34d399' : '#f87171' }}>{connected ? 'ONLINE' : 'OFFLINE'}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
        유저: {users?.length ?? 0} / 오브젝트: {objects?.length ?? 0}
      </div>
    </div>
  )
}


