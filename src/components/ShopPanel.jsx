import { useState } from 'react'
import { useAuthStore } from '../store/auth'
import { addInventoryItem } from '../services/api'
import { useGameStore } from '../store/game'

const CATALOG = [
  { type: 'balloon', name: '풍선' },
  { type: 'table', name: '테이블' },
  { type: 'chair', name: '의자' },
  { type: 'plant', name: '화분' },
  { type: 'brick', name: '벽돌' },
]

export default function ShopPanel({ onOpenInventory }) {
  const token = useAuthStore(s => s.token)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const setInventory = useGameStore(s => s.setInventory)
  const currentInventory = useGameStore(s => s.inventory)

  const buy = async (type) => {
    setBusy(true); setMsg('')
    // 1) 즉시 UI 업데이트 (임시 아이템)
    const temp = {
      id: -Date.now(),
      user_id: 0,
      type,
      quantity: 1,
      created_at: new Date().toISOString(),
    }
    setInventory([temp, ...currentInventory])
    try {
      // 2) 네트워크는 비동기로 처리하고, 도착 시 교체
      const real = await addInventoryItem({ type, quantity: 1 }, token)
      const next = useGameStore.getState().inventory.map((it) =>
        it.id === temp.id ? real : it
      )
      setInventory(next)
      setMsg(`${type} 구매 완료!`)
      window.__game_ws?.send(JSON.stringify({ event: 'get_inventory', data: {} }))
    } catch (e) {
      // 실패 시 롤백
      const rolled = useGameStore.getState().inventory.filter((it) => it.id !== temp.id)
      setInventory(rolled)
      setMsg('구매 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {CATALOG.map(item => (
        <div key={item.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0e1322', color: 'white', padding: 8, borderRadius: 6 }}>
          <span>{item.name}</span>
          <button disabled={busy} onClick={() => buy(item.type)}>구매</button>
        </div>
      ))}
      {msg && <div style={{ color: '#a3e635' }}>{msg}</div>}
      {onOpenInventory && (
        <button onClick={onOpenInventory}>인벤토리 열기</button>
      )}
    </div>
  )
}


