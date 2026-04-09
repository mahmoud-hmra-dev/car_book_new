import React, { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import * as UserService from '@/services/UserService'
import * as bookcarsTypes from ':bookcars-types'

type AuthState = {
  user: bookcarsTypes.User | null
  loggedIn: boolean
  loading: boolean
  language: string
}

type AuthContextType = AuthState & {
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loggedIn: false,
    loading: true,
    language: 'en',
  })

  const checkAuth = useCallback(async () => {
    try {
      const lang = await UserService.getLanguage()
      const isLoggedIn = await UserService.loggedIn()
      if (isLoggedIn) {
        const user = await UserService.getCurrentUser()
        setState({ user, loggedIn: true, loading: false, language: lang })
      } else {
        setState({ user: null, loggedIn: false, loading: false, language: lang })
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await UserService.signin({ email, password })
      if (res.status === 200 && res.data.accessToken) {
        setState({
          user: res.data,
          loggedIn: true,
          loading: false,
          language: res.data.language || 'en',
        })
        return { success: true }
      }
      return { success: false, error: 'Invalid credentials' }
    } catch (err: any) {
      const msg = err?.response?.status === 401 ? 'Invalid email or password' : 'Connection error'
      return { success: false, error: msg }
    }
  }, [])

  const signOut = useCallback(async () => {
    await UserService.signout(true)
    setState({ user: null, loggedIn: false, loading: false, language: state.language })
  }, [state.language])

  const refresh = useCallback(async () => {
    await checkAuth()
  }, [checkAuth])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
