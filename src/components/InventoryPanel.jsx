import { useGameStore } from '../store/game'
import { useAuthStore } from '../store/auth'
import { addInventoryItem } from '../services/api'

export default function InventoryPanel({ onPlace, onOpenShop }) {
  const inventory = useGameStore(s => s.inventory)
  const selectInventoryItem = useGameStore(s => s.selectInventoryItem)
  const token = useAuthStore(s => s.token)
  const ws = window.__game_ws

  const addSample = async () => {
    try {
      await addInventoryItem({ type: 'chair', quantity: 1, metadata: { color: 'brown' } }, token)
      // 서버에 인벤토리 재요청
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ event: 'get_inventory', data: {} }))
      }
    } catch (e) {
      alert('샘플 추가 실패: 로그인 상태/백엔드 확인')
    }
  }

  return (
    <div style={{ position: 'absolute', left: 8, top: 8, zIndex: 2, background: '#141a2b', color: 'white', padding: 8, borderRadius: 6, width: 220 }}>
      <div style={{ marginBottom: 8, fontWeight: 700 }}>인벤토리</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {inventory.length === 0 && <div style={{ opacity: 0.7 }}>비어있음</div>}
        {inventory.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0e1322', padding: 6, borderRadius: 4 }}>
            <span>{item.type} x{item.quantity}</span>
            <button onMouseDown={() => selectInventoryItem(item.id)} onClick={() => selectInventoryItem(item.id)}>배치</button>
          </div>
        ))}
      </div>
      <button style={{ marginTop: 8, width: '100%' }} onClick={addSample}>샘플 추가(chair)</button>
      {onOpenShop && (
        <button style={{ marginTop: 6, width: '100%' }} onClick={onOpenShop}>쇼핑 열기</button>
      )}
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
        배치 버튼을 누르고 캔버스를 클릭해 설치하세요
      </div>
    </div>
  )
}


