import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '@/context/AuthContext'
import { colors, spacing, typography } from '@/theme'
import i18n from '@/lang/i18n'

type MenuItem = {
  icon: string
  label: string
  route?: string
  onPress?: () => void
  color?: string
}

const MoreScreen = () => {
  const router = useRouter()
  const { signOut, user } = useAuth()

  const menuItems: MenuItem[][] = [
    [
      { icon: 'map-marker-radius', label: i18n.t('GEOFENCES'), route: '/(screens)/geofences' },
      { icon: 'chart-bar', label: i18n.t('REPORTS'), route: '/(screens)/reports' },
      { icon: 'route', label: i18n.t('ROUTE_HISTORY'), route: '/(screens)/route-history' },
    ],
    [
      { icon: 'account-group', label: i18n.t('DRIVERS'), route: '/(screens)/drivers' },
      { icon: 'wrench', label: i18n.t('MAINTENANCE'), route: '/(screens)/maintenance' },
      { icon: 'bell-cog', label: i18n.t('NOTIFICATION_SETTINGS'), route: '/(screens)/notifications-settings' },
    ],
    [
      { icon: 'cog', label: i18n.t('SETTINGS'), route: '/(screens)/settings' },
    ],
    [
      { icon: 'logout', label: i18n.t('SIGN_OUT'), onPress: signOut, color: colors.danger },
    ],
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('MORE')}</Text>
        {user && (
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.userName}>{user.fullName || 'Admin'}</Text>
              <Text style={styles.userEmail}>{user.email || ''}</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            {section.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => {
                  if (item.onPress) item.onPress()
                  else if (item.route) router.push(item.route as any)
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={22}
                  color={item.color || colors.textSecondary}
                />
                <Text style={[styles.menuLabel, item.color ? { color: item.color } : null]}>
                  {item.label}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text style={styles.version}>{i18n.t('VERSION')} 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.textPrimary },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  userEmail: { fontSize: typography.sizes.small, color: colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuLabel: { flex: 1, fontSize: typography.sizes.body, color: colors.textPrimary },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: typography.sizes.caption, marginTop: spacing.lg },
})

export default MoreScreen
