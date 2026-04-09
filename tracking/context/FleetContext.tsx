import React, { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '@/config/env.config'
import { useAuth } from './AuthContext'

type FleetState = {
  items: bookcarsTypes.TraccarFleetItem[]
  health: bookcarsTypes.TraccarFleetHealth | null
  loading: boolean
  lastRefresh: Date | null
  error: string | null
}

type FleetContextType = FleetState & {
  refreshFleet: () => Promise<void>
  autoRefresh: boolean
  setAutoRefresh: (enabled: boolean) => void
  refreshInterval: number
  setRefreshInterval: (ms: number) => void
}

const FleetContext = createContext<FleetContextType | undefined>(undefined)

export const FleetProvider = ({ children }: { children: ReactNode }) => {
  const { loggedIn } = useAuth()
  const [state, setState] = useState<FleetState>({
    items: [],
    health: null,
    loading: false,
    lastRefresh: null,
    error: null,
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(env.TRACKING_REFRESH_INTERVAL)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshFleet = useCallback(async () => {
    if (!loggedIn) return
    setState((prev) => ({ ...prev, loading: prev.items.length === 0, error: null }))
    try {
      const data = await TraccarService.getFleetOverview()
      setState({
        items: data.items || [],
        health: data.health || null,
        loading: false,
        lastRefresh: new Date(),
        error: null,
      })
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load fleet data',
      }))
    }
  }, [loggedIn])

  useEffect(() => {
    if (loggedIn) {
      refreshFleet()
    }
  }, [loggedIn, refreshFleet])

  useEffect(() => {
    if (autoRefresh && loggedIn) {
      intervalRef.current = setInterval(refreshFleet, refreshInterval)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, loggedIn, refreshInterval, refreshFleet])

  return (
    <FleetContext.Provider
      value={{ ...state, refreshFleet, autoRefresh, setAutoRefresh, refreshInterval, setRefreshInterval }}
    >
      {children}
    </FleetContext.Provider>
  )
}

export const useFleet = () => {
  const context = useContext(FleetContext)
  if (!context) throw new Error('useFleet must be used within FleetProvider')
  return context
}
