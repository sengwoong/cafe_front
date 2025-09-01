import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { useAuthStore } from '../store/auth'
import { wsUrl } from '../services/api'
import { useNavigate } from 'react-router-dom'
import InventoryPanel from '../components/InventoryPanel'
import RoomPanel from '../components/RoomPanel'
import { useGameStore } from '../store/game'
import { useRoomsStore } from '../store/rooms'
import Modal from '../components/Modal'
import ShopPanel from '../components/ShopPanel'

export default function Game() {
  const token = useAuthStore(s => s.token)
  const username = useAuthStore(s => s.username)
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const appRef = useRef(null)
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [invOpen, setInvOpen] = useState(true)
  const [shopOpen, setShopOpen] = useState(false)
  const [users, setUsers] = useState([])
  const playerPosRef = useRef({ x: 100, y: 100 })
  const lastSentRef = useRef(0)
  const selfUserIdRef = useRef(null)
  const roomId = useRoomsStore(s => s.currentRoomId) || 1
  const setInventory = useGameStore(s => s.setInventory)
  const setRoomState = useGameStore(s => s.setRoomState)
  const addObject = useGameStore(s => s.addObject)
  const selectedInventoryItemId = useGameStore(s => s.selectedInventoryItemId)
  const clearSelection = useGameStore(s => s.clearSelection)
  const DEBUG = true
  // 서버 전송/이동 제한: 0.5초에 한 번
  const SEND_INTERVAL_MS = 500
  const MOVE_INTERVAL_MS = 500
  // 화면을 100x100 셀로 나눠 이동/전송 (총 10,000칸)
  const GRID_COLS = 100
  const GRID_ROWS = 100
  const lastGridRef = useRef({ col: null, row: null })
  const lastMoveRef = useRef(0)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
  }, [token])

  useEffect(() => {
    if (!canvasRef.current) return
    let app
    let canvasEl
    let destroyed = false

    ;(async () => {
      app = new PIXI.Application()
      await app.init({ resizeTo: window, background: '#4b2e15' })
      if (destroyed) { try { app.destroy(true, { children: true }) } catch {} ; return }
      appRef.current = app
      canvasEl = app.canvas || app.view || app.renderer?.view
      if (!canvasEl) return
      canvasRef.current.appendChild(canvasEl)

      // 배경 안내 텍스트/그리드
      const g = new PIXI.Graphics()
      g.lineStyle(1, 0x2a2f45, 1)
      for (let i = 0; i < (window.innerWidth || 800); i += 40) {
        g.moveTo(i, 0).lineTo(i, window.innerHeight || 600)
      }
      for (let j = 0; j < (window.innerHeight || 600); j += 40) {
        g.moveTo(0, j).lineTo(window.innerWidth || 800, j)
      }
      app.stage.addChild(g)

      const style = new PIXI.TextStyle({ fill: '#ffffff', fontSize: 14 })
      const text = new PIXI.Text('I: 인벤토리 열기/닫기 · WASD 이동', style)
      text.x = 12
      text.y = 12
      app.stage.addChild(text)

      // Pixi 동작 확인용: 좌우로 움직이는 디버그 박스
      const dbg = new PIXI.Graphics()
      dbg.beginFill(0x3b82f6)
      dbg.drawRect(0, 0, 40, 40)
      dbg.endFill()
      dbg.x = 20
      dbg.y = 80
      app.stage.addChild(dbg)
      let dir = 1
      const moveDbg = () => {
        const maxX = (window.innerWidth || 800) - 60
        dbg.x += dir * 2
        if (dbg.x < 20 || dbg.x > maxX) dir *= -1
      }
      app.ticker.add(moveDbg)

      // 클릭: 선택 아이템이 있으면 배치, 없으면 1칸 이동
      const onClick = (e) => {
        const sel = useGameStore.getState().selectedInventoryItemId
        const rect = canvasEl.getBoundingClientRect()
        const clickX = Math.floor(e.clientX - rect.left)
        const clickY = Math.floor(e.clientY - rect.top)
        if (sel) {
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
              event: 'place_object',
              data: { inventory_item_id: sel, room_id: roomId, x: clickX, y: clickY, rotation: 0 }
            }))
            clearSelection()
          }
          return
        }

        // 이동: 현재 셀에서 클릭 방향으로 1칸만 이동 (0.5s 쿨다운)
        const now = Date.now()
        if (now - lastMoveRef.current < MOVE_INTERVAL_MS) return
        const cellW = Math.max(1, Math.floor((window.innerWidth || 800) / GRID_COLS))
        const cellH = Math.max(1, Math.floor((window.innerHeight || 600) / GRID_ROWS))
        const pos = playerPosRef.current
        const curCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pos.x / cellW)))
        const curRow = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pos.y / cellH)))
        const tgtCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(clickX / cellW)))
        const tgtRow = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(clickY / cellH)))
        const dx = Math.sign(tgtCol - curCol)
        const dy = Math.sign(tgtRow - curRow)
        // 축 중 더 멀리 떨어진 방향으로 1칸 이동
        const stepCol = (Math.abs(tgtCol - curCol) >= Math.abs(tgtRow - curRow)) ? curCol + dx : curCol
        const stepRow = (Math.abs(tgtRow - curRow) > Math.abs(tgtCol - curCol)) ? curRow + dy : curRow
        const newCol = Math.max(0, Math.min(GRID_COLS - 1, stepCol))
        const newRow = Math.max(0, Math.min(GRID_ROWS - 1, stepRow))
        const newX = newCol * cellW + Math.floor(cellW / 2)
        const newY = newRow * cellH + Math.floor(cellH / 2)

        // 로컬 반영
        playerPosRef.current = { x: newX, y: newY }
        lastGridRef.current = { col: newCol, row: newRow }
        lastMoveRef.current = now
        setUsers(prev => {
          const id = selfUserIdRef.current
          let found = false
          const next = prev.map(u => {
            const isMe = (id && u.user_id === id) || u.username === username
            if (isMe) { found = true; return { ...u, x: newX, y: newY } }
            return u
          })
          if (!found) return [...prev, { user_id: id || 'self', username: username || 'me', x: newX, y: newY }]
          return next
        })

        // 서버 전송(쿨다운 공유)
        lastSentRef.current = now
        if (wsRef.current) {
          if (DEBUG) console.log('[WS->] update_position (click step)', { room_id: roomId, user_id: selfUserIdRef.current, x: newX, y: newY, col: newCol, row: newRow })
          wsRef.current.send(JSON.stringify({ event: 'update_position', data: { room_id: roomId, user_id: selfUserIdRef.current, x: newX, y: newY } }))
        }
      }
      canvasEl.addEventListener('click', onClick)

      // cleanup
      const cleanup = () => {
        try { canvasEl && canvasEl.removeEventListener('click', onClick) } catch {}
        try { app && app.destroy(true, { children: true }) } catch {}
      }
      appRef.current.__cleanup = cleanup
    })()

    return () => {
      destroyed = true
      if (appRef.current?.__cleanup) appRef.current.__cleanup()
    }
  }, [])

  // WASD: 1칸씩 이동(0.5초 쿨다운)
  useEffect(() => {
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase()
      if (k === 'i') { setInvOpen(v => !v); return }
      if (k === 'o') { setShopOpen(v => !v); return }
      const now = Date.now()
      if (now - lastMoveRef.current < MOVE_INTERVAL_MS) return
      const cellW = Math.max(1, Math.floor((window.innerWidth || 800) / GRID_COLS))
      const cellH = Math.max(1, Math.floor((window.innerHeight || 600) / GRID_ROWS))
      const pos = playerPosRef.current
      const curCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pos.x / cellW)))
      const curRow = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pos.y / cellH)))
      let newCol = curCol
      let newRow = curRow
      if (k === 'w') newRow = Math.max(0, curRow - 1)
      if (k === 's') newRow = Math.min(GRID_ROWS - 1, curRow + 1)
      if (k === 'a') newCol = Math.max(0, curCol - 1)
      if (k === 'd') newCol = Math.min(GRID_COLS - 1, curCol + 1)
      if (newCol === curCol && newRow === curRow) return
      const newX = newCol * cellW + Math.floor(cellW / 2)
      const newY = newRow * cellH + Math.floor(cellH / 2)
      playerPosRef.current = { x: newX, y: newY }
      lastGridRef.current = { col: newCol, row: newRow }
      lastMoveRef.current = now
      setUsers(prev => {
        const id = selfUserIdRef.current
        let found = false
        const next = prev.map(u => {
          const isMe = (id && u.user_id === id) || u.username === username
          if (isMe) { found = true; return { ...u, x: newX, y: newY } }
          return u
        })
        if (!found) return [...prev, { user_id: id || 'self', username: username || 'me', x: newX, y: newY }]
        return next
      })
      lastSentRef.current = now
      if (wsRef.current) {
        if (DEBUG) console.log('[WS->] update_position (WASD step)', { room_id: roomId, user_id: selfUserIdRef.current, x: newX, y: newY, col: newCol, row: newRow })
        wsRef.current.send(JSON.stringify({ event: 'update_position', data: { room_id: roomId, user_id: selfUserIdRef.current, x: newX, y: newY } }))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [roomId])

  useEffect(() => {
    if (!token) return
    const ws = new WebSocket(wsUrl(token))
    wsRef.current = ws
    window.__game_ws = ws
    ws.onopen = () => {
      setConnected(true)
      const initPos = playerPosRef.current
      if (DEBUG) console.log('[WS] open, join_room', { room_id: roomId, x: initPos.x, y: initPos.y })
      ws.send(JSON.stringify({ event: 'join_room', data: { room_id: roomId, x: initPos.x, y: initPos.y } }))
      ws.send(JSON.stringify({ event: 'get_inventory', data: {} }))
      ws.send(JSON.stringify({ event: 'get_room_state', data: { room_id: roomId } }))
      // 서버가 유저 리스트를 비워 보내더라도 내 점을 먼저 그리도록 로컬 상태 시드
      setUsers(prev => prev.length ? prev : [{ user_id: selfUserIdRef.current || 'self', username: username || 'me', x: initPos.x, y: initPos.y }])
    }
    // helpers for user-layer management
    const getUsersLayer = () => {
      if (!appRef.current.__usersLayer) {
        const usersLayer = new PIXI.Container()
        appRef.current.__usersLayer = usersLayer
        appRef.current.__userNodes = new Map()
        appRef.current.stage.addChild(usersLayer)
      }
      return appRef.current.__usersLayer
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (DEBUG && (msg.event === 'room_state' || msg.event === 'position_updated')) console.log('[WS<-]', msg.event, msg.data)
        if (msg.event === 'inventory') {
          setInventory(msg.data.items || [])
        } else if (msg.event === 'room_state') {
          setRoomState({ users: msg.data.users || [], objects: msg.data.objects || [] })
          // 내 user_id 동기화
          const me = (msg.data.users || []).find(u => u.username === username)
          if (me && me.user_id) selfUserIdRef.current = me.user_id
          // 오브젝트 레이어 갱신
          if (appRef.current.__objectsLayer) {
            try { appRef.current.stage.removeChild(appRef.current.__objectsLayer) } catch {}
          }
          const layer = new PIXI.Container()
          for (const o of (msg.data.objects || [])) {
            const g = new PIXI.Graphics()
            const color = o.type === 'chair' ? 0xffffff : o.type === 'wall' ? 0x0066ff : 0x5ac8fa
            g.beginFill(color)
            g.drawRect(o.x - 8, o.y - 8, 16, 16)
            g.endFill()
            if (o.owner_username) {
              const label = new PIXI.Text(o.owner_username, { fill: '#ffffff', fontSize: 10 })
              label.x = o.x + 10; label.y = o.y - 10
              layer.addChild(label)
            }
            layer.addChild(g)
          }
          appRef.current.__objectsLayer = layer
          appRef.current.stage.addChild(layer)
          // 유저 상태 갱신 → 별도의 useEffect가 레이어를 재구축
          setUsers(msg.data.users || [])
        } else if (msg.event === 'object_placed') {
          addObject(msg.data)
          const g = new PIXI.Graphics()
          const type = msg.data.type
          const color = type === 'chair' ? 0xffffff
            : type === 'table' ? 0xcccccc
            : type === 'desk' ? 0x8b5a2b
            : type === 'plant' ? 0x22c55e
            : type === 'balloon' ? 0xff4d6d
            : type === 'pot' ? 0xa0522d
            : type === 'brick' ? 0xb22222
            : type === 'wall' ? 0x0066ff
            : 0xffcc00
          const size = type === 'table' ? 24 : type === 'desk' ? 28 : type === 'balloon' ? 14 : 16
          g.beginFill(color)
          g.drawRect(msg.data.x - size/2, msg.data.y - size/2, size, size)
          g.endFill()
          g.eventMode = 'static'
          g.cursor = 'pointer'
          g.on('rightclick', () => {
            // 우클릭: 회수 (WS로 서버 구현시 이벤트 전송)
            // 임시로 화면에서 제거만 처리
            try { appRef.current.stage.removeChild(g); g.destroy() } catch {}
          })
          appRef.current.stage.addChild(g)
          if (msg.data.owner_username) {
            const label = new PIXI.Text(msg.data.owner_username, { fill: '#ffffff', fontSize: 10 })
            label.x = msg.data.x + 10; label.y = msg.data.y - 10
            appRef.current.stage.addChild(label)
          }
        } else if (msg.event === 'user_joined') {
          setUsers(prev => {
            const exists = prev.some(u => (u.user_id || u.username) === (msg.data.user_id || msg.data.username))
            return exists ? prev : [...prev, msg.data]
          })
        } else if (msg.event === 'user_left') {
          setUsers(prev => prev.filter(u => u.user_id !== msg.data.user_id))
        } else if (msg.event === 'position_updated') {
          setUsers(prev => {
            let found = false
            const next = prev.map(u => {
              if ((u.user_id || u.username) === (msg.data.user_id || msg.data.username)) {
                found = true
                return { ...u, x: msg.data.x, y: msg.data.y }
              }
              return u
            })
            return found ? next : [...prev, msg.data]
          })
        }
      } catch {}
    }
    ws.onclose = () => { if (DEBUG) console.log('[WS] close'); setConnected(false) }
    return () => ws.close()
  }, [token, roomId])

  // users 상태가 바뀔 때마다 유저 레이어를 완전히 재구축
  useEffect(() => {
    if (!appRef.current) return
    if (!users) return
    const app = appRef.current
    if (!app.__usersLayer) {
      app.__usersLayer = new PIXI.Container()
      app.stage.addChild(app.__usersLayer)
    }
    const layer = app.__usersLayer
    layer.removeChildren()
    const nodes = new Map()
    users.forEach(u => {
      if (!selfUserIdRef.current && u.username === username && u.user_id) selfUserIdRef.current = u.user_id
      const isMe = (selfUserIdRef.current && u.user_id === selfUserIdRef.current) || u.username === username
      const dot = new PIXI.Graphics()
      dot.beginFill(isMe ? 0x000000 : 0x00ffcc)
      dot.drawCircle(0, 0, 6)
      dot.endFill()
      dot.x = u.x; dot.y = u.y
      const label = new PIXI.Text(u.username || `user${u.user_id}`, { fill: '#ffffff', fontSize: 10 })
      label.x = u.x + 8; label.y = u.y - 8
      layer.addChild(dot)
      layer.addChild(label)
      nodes.set(u.user_id || u.username, { dot, label })
    })
    app.__userNodes = nodes
  }, [users])

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div style={{ position: 'absolute', zIndex: 1, padding: 8, color: 'white' }}>
        <div>유저: {username || '게스트'}</div>
        <div>연결: {connected ? 'ON' : 'OFF'}</div>
      </div>
      <Modal open={invOpen} onClose={() => setInvOpen(false)} title="인벤토리 (I)">
        <InventoryPanel onOpenShop={() => { setShopOpen(true); setInvOpen(false) }} />
      </Modal>
      <Modal open={shopOpen} onClose={() => setShopOpen(false)} title="상점 (O)">
        <ShopPanel onOpenInventory={() => { setInvOpen(true); setShopOpen(false) }} />
      </Modal>
      <RoomPanel roomId={roomId} connected={connected} />
      <div ref={canvasRef} />
      <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'grid', gap: 8, zIndex: 5 }}>
        <button onClick={() => setInvOpen(true)} style={{ padding: '10px 14px' }}>인벤토리 열기 (I)</button>
        <button onClick={() => setShopOpen(true)} style={{ padding: '10px 14px' }}>쇼핑 열기 (O)</button>
      </div>
    </div>
  )
}


