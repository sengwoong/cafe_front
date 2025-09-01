import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/api'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login({ username, password })
      setAuth({ token: res.access_token, username })
      navigate('/rooms')
    } catch (err) {
      setError('로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <form onSubmit={onSubmit} style={{ width: 320, display: 'grid', gap: 12 }}>
        <h2>로그인</h2>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <div>
          처음이신가요? <Link to="/register">회원가입</Link>
        </div>
      </form>
    </div>
  )
}


