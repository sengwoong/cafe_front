import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, login } from '../services/api'
import { useAuthStore } from '../store/auth'

export default function Register() {
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await registerUser({ username, avatar_url: avatarUrl || null })
      const res = await login({ username, password: 'any' })
      setAuth({ token: res.access_token, username })
      navigate('/rooms')
    } catch (err) {
      setError('회원가입 실패: 사용자명 중복일 수 있어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <form onSubmit={onSubmit} style={{ width: 360, display: 'grid', gap: 12 }}>
        <h2>회원가입</h2>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input placeholder="Avatar URL (선택)" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
        <button disabled={loading}>{loading ? '처리 중...' : '가입하기'}</button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <div>
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </div>
      </form>
    </div>
  )
}


