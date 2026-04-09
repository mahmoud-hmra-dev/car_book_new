import { useEffect, useState } from 'react'
import { I18nManager } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as PaperProvider } from 'react-native-paper'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import Toast from 'react-native-toast-message'

import { AuthProvider, useAuth } from '@/context/AuthContext'
import { FleetProvider } from '@/context/FleetContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { paperTheme } from '@/theme'
import * as UserService from '@/services/UserService'
import i18n from '@/lang/i18n'

SplashScreen.preventAutoHideAsync()

const NavigationGuard = () => {
  const { loggedIn, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!loggedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (loggedIn && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [loggedIn, loading, segments])

  return null
}

const RootLayout = () => {
  const [appIsReady, setAppIsReady] = useState(false)

  useEffect(() => {
    const prepare = async () => {
      try {
        const lang = await UserService.getLanguage()
        const finalLang = lang || 'en'
        i18n.locale = finalLang
        console.log('[App] Language:', finalLang)

        const isRTL = finalLang === 'ar'
        if (I18nManager.isRTL !== isRTL) {
          I18nManager.allowRTL(isRTL)
          I18nManager.forceRTL(isRTL)
        }
      } catch (e) {
        console.warn(e)
        i18n.locale = 'en'
      } finally {
        setAppIsReady(true)
        await SplashScreen.hideAsync()
      }
    }
    prepare()
  }, [])

  if (!appIsReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <SettingsProvider>
            <AuthProvider>
              <FleetProvider>
                <ExpoStatusBar style="light" backgroundColor="#0D1117" />
                <NavigationGuard />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D1117' } }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(screens)" />
                </Stack>
                <Toast />
              </FleetProvider>
            </AuthProvider>
          </SettingsProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default RootLayout
