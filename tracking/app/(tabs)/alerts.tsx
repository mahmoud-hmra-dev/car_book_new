import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { Text, SegmentedButtons } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, formatTimestamp } from '@/utils/tracking'
import i18n from '@/lang/i18n'

const AlertsScreen = () => {
  const [tab, setTab] = useState('events')
  const [events, setEvents] = useState<bookcarsTypes.TraccarEventCenterEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await TraccarService.getEventCenter({ limit: 50 })
      setEvents(data || [])
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'events') loadEvents()
  }, [tab, loadEvents])

  const renderEvent = ({ item }: { item: bookcarsTypes.TraccarEventCenterEntry }) => {
    const typeColor = EVENT_TYPE_COLORS[item.type || ''] || colors.textMuted
    const typeLabel = EVENT_TYPE_LABELS[item.type || ''] || item.type || 'Unknown'

    return (
      <View style={[styles.eventCard, { borderLeftColor: typeColor }]}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: `${typeColor}22` }]}>
            <Text style={[styles.eventTypeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <Text style={styles.eventTime}>{formatTimestamp(item.eventTime)}</Text>
        </View>
        <Text style={styles.eventVehicle}>{item.carName || 'Unknown Vehicle'}</Text>
        {item.address ? <Text style={styles.eventAddress}>{item.address}</Text> : null}
        {item.geofenceName ? (
          <Text style={styles.eventGeofence}>{'📍'} {item.geofenceName}</Text>
        ) : null}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('ALERTS')}</Text>
      </View>

      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'events', label: i18n.t('EVENTS') },
          { value: 'rules', label: i18n.t('ALERT_RULES') },
        ]}
        style={styles.segmented}
        theme={{ colors: { secondaryContainer: colors.primaryLight, onSecondaryContainer: colors.primary } }}
      />

      {tab === 'events' ? (
        <FlatList
          data={events}
          keyExtractor={(item, index) => `${item.id || index}`}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadEvents} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="bell-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{i18n.t('NO_EVENTS')}</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-cog-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>{i18n.t('NO_ALERT_RULES')}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.textPrimary },
  segmented: { marginHorizontal: spacing.xl, marginBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, gap: spacing.md },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  eventTypeBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: 6 },
  eventTypeText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  eventTime: { fontSize: typography.sizes.caption, color: colors.textMuted },
  eventVehicle: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  eventAddress: { fontSize: typography.sizes.small, color: colors.textSecondary, marginTop: spacing.xxs },
  eventGeofence: { fontSize: typography.sizes.small, color: colors.info, marginTop: spacing.xs },
  emptyContainer: { alignItems: 'center', paddingTop: spacing.massive },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
})

export default AlertsScreen
