import { View } from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as PaperProvider } from 'react-native-paper'
import * as SplashScreen from 'expo-splash-screen'
import type * as NotificationsType from 'expo-notifications'

let Notifications: typeof NotificationsType | null = null
try {
  Notifications = require('expo-notifications') as typeof NotificationsType
} catch {
  // expo-notifications not available in Expo Go (SDK 53+)
}
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import Toast from 'react-native-toast-message'

import * as helper from '@/utils/helper'
import * as NotificationService from '@/services/NotificationService'
import * as UserService from '@/services/UserService'
import { AuthProvider } from '@/context/AuthContext'
import { GlobalProvider } from '@/context/GlobalContext'
import { SettingProvider } from '@/context/SettingContext'

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowList: true,
    }),
  })
}

SplashScreen.preventAutoHideAsync()

const RootLayout = () => {
  const router = useRouter()
  const [appIsReady, setAppIsReady] = useState(false)
  const responseListener = useRef<NotificationsType.EventSubscription | null>(null)

  useEffect(() => {
    const register = async () => {
      try {
        const loggedIn = await UserService.loggedIn()
        if (loggedIn) {
          const currentUser = await UserService.getCurrentUser()
          if (currentUser?._id) {
            await helper.registerPushToken(currentUser._id)
          }
        }
      } catch (e) {
        console.warn(e)
      } finally {
        setAppIsReady(true)
      }
    }

    register()

    if (Notifications) {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
        try {
          const { data } = response.notification.request.content
          if (data?.booking) {
            if (data.user && data.notification) {
              await NotificationService.markAsRead(data.user as string, [data.notification as string])
            }
            router.push({ pathname: '/update-booking', params: { id: data.booking as string } })
          } else {
            router.push('/notifications')
          }
        } catch (err) {
          helper.error(err, false)
        }
      })
    }

    return () => {
      responseListener.current?.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync()
    }
  }, [appIsReady])

  if (!appIsReady) {
    return null
  }

  return (
    <View style={{ flex: 1 }}>
      <ExpoStatusBar style="light" backgroundColor="#6B3CE6" translucent={false} />

      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SettingProvider>
          <GlobalProvider>
            <AuthProvider>
              <SafeAreaProvider>
                <PaperProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(screens)" />
                  </Stack>
                </PaperProvider>
              </SafeAreaProvider>
            </AuthProvider>
          </GlobalProvider>
        </SettingProvider>
      </GestureHandlerRootView>

      <Toast />
    </View>
  )
}

export default RootLayout
