import { create } from 'zustand'
import Cookies from 'js-cookie'

export const useAuthStore = create((set, get) => ({
  token: Cookies.get('token') || null,
  username: Cookies.get('username') || null,

  setAuth: ({ token, username }) => {
    Cookies.set('token', token, { sameSite: 'lax' })
    if (username) Cookies.set('username', username, { sameSite: 'lax' })
    set({ token, username })
  },

  clearAuth: () => {
    Cookies.remove('token')
    Cookies.remove('username')
    set({ token: null, username: null })
  },
}))


