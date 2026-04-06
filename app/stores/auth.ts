import { defineStore } from 'pinia'

interface User {
  id: number
  email: string
  nickname: string
  level: number
  totalExp: number
  basicCoin: number
}

interface AuthState {
  user: User | null
  accessToken: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.accessToken,
  },

  actions: {
    setAuth(user: User, token: string) {
      this.user = user
      this.accessToken = token
    },
    clearAuth() {
      this.user = null
      this.accessToken = null
    },
  },
})
