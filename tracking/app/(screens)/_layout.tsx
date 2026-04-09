import { Stack } from 'expo-router'
import { colors } from '@/theme'

const ScreensLayout = () => (
  <Stack
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: { fontWeight: '600' },
      contentStyle: { backgroundColor: colors.background },
    }}
  />
)

export default ScreensLayout
