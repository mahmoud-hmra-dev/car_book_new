import React, { ReactNode, createContext, useContext, useMemo, useState } from 'react'

export interface GlobalContextType {
  notificationCount: number
  setNotificationCount: React.Dispatch<React.SetStateAction<number>>
}

const GlobalContext = createContext<GlobalContextType | null>(null)

interface GlobalProviderProps {
  children: ReactNode
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [notificationCount, setNotificationCount] = useState(0)
  const value = useMemo(() => ({ notificationCount, setNotificationCount }), [notificationCount])

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  )
}

export const useGlobalContext = () => useContext(GlobalContext)
