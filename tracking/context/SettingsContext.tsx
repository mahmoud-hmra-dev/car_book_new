import React, { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import * as AsyncStorage from '@/utils/AsyncStorage'

type Settings = {
  mapType: 'standard' | 'satellite' | 'hybrid'
  refreshInterval: number
  language: string
  unitSystem: 'metric' | 'imperial'
}

type SettingsContextType = Settings & {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
}

const SETTINGS_KEY = 'bc-tracking-settings'

const defaultSettings: Settings = {
  mapType: 'standard',
  refreshInterval: 30000,
  language: 'en',
  unitSystem: 'metric',
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getObject<Settings>(SETTINGS_KEY)
      if (stored) setSettings({ ...defaultSettings, ...stored })
    }
    load()
  }, [])

  const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      AsyncStorage.storeObject(SETTINGS_KEY, next)
      return next
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ ...settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}
