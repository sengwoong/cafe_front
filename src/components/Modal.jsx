export default function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          background: '#111827', color: 'white', padding: 16, borderRadius: 8, minWidth: 320
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>{title}</strong>
          <button onClick={onClose}>닫기</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}


