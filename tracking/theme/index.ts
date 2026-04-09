import { MD3DarkTheme } from 'react-native-paper'
import colors from './colors'
import spacing from './spacing'
import typography from './typography'

export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceElevated,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.danger,
  },
}

export { colors, spacing, typography }
export default { colors, spacing, typography, paperTheme }
