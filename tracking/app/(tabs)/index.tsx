import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFleet } from '@/context/FleetContext'
import { colors, spacing, typography } from '@/theme'
import { buildFleetCounts, formatRelativeAge } from '@/utils/tracking'
import i18n from '@/lang/i18n'

const DashboardScreen = () => {
  const router = useRouter()
  const { items, loading, lastRefresh, refreshFleet } = useFleet()
  const counts = buildFleetCounts(items)

  const statsData = [
    { label: i18n.t('TOTAL_VEHICLES'), count: counts.total, color: colors.textPrimary, filter: 'all' },
    { label: i18n.t('MOVING'), count: counts.moving, color: colors.moving, filter: 'moving' },
    { label: i18n.t('IDLE'), count: counts.idle, color: colors.idle, filter: 'idle' },
    { label: i18n.t('STOPPED'), count: counts.stopped, color: colors.stopped, filter: 'stopped' },
    { label: i18n.t('OFFLINE'), count: counts.offline, color: colors.offline, filter: 'offline' },
    { label: i18n.t('STALE'), count: counts.stale, color: colors.stale, filter: 'stale' },
  ]

  const quickActions = [
    { icon: 'map-marker-radius' as const, label: i18n.t('LIVE_MAP'), route: '/(tabs)/map' },
    { icon: 'chart-bar' as const, label: i18n.t('REPORTS'), route: '/(screens)/reports' },
    { icon: 'map-marker-radius' as const, label: i18n.t('GEOFENCES'), route: '/(screens)/geofences' },
    { icon: 'account-group' as const, label: i18n.t('DRIVERS'), route: '/(screens)/drivers' },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('DASHBOARD')}</Text>
        {lastRefresh && (
          <Text style={styles.lastUpdated}>
            {i18n.t('LAST_UPDATED')}: {formatRelativeAge(lastRefresh)}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshFleet}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Fleet Health Section */}
        <Text style={styles.sectionTitle}>{i18n.t('FLEET_HEALTH')}</Text>
        <View style={styles.statsGrid}>
          {statsData.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={styles.statCard}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/(tabs)/vehicles', params: { filter: stat.filter } })}
            >
              <View style={[styles.statIndicator, { backgroundColor: stat.color }]} />
              <Text style={[styles.statCount, { color: stat.color }]}>{stat.count}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{i18n.t('QUICK_ACTIONS')}</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => router.push(action.route as any)}
            >
              <MaterialCommunityIcons name={action.icon} size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Alerts */}
        <Text style={styles.sectionTitle}>{i18n.t('RECENT_ALERTS')}</Text>
        <View style={styles.alertsCard}>
          <Text style={styles.emptyText}>{i18n.t('NO_ALERTS')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.textPrimary },
  lastUpdated: { fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingTop: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statIndicator: { width: 8, height: 8, borderRadius: 4, marginBottom: spacing.sm },
  statCount: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold },
  statLabel: { fontSize: typography.sizes.small, color: colors.textSecondary, marginTop: spacing.xxs },
  actionsRow: { flexDirection: 'row', gap: spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionLabel: { fontSize: typography.sizes.caption, color: colors.textSecondary, textAlign: 'center' },
  alertsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body },
})

export default DashboardScreen
