import { useState, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { useLocalSearchParams, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import TrackingMap, { type MapMarker, type MapRoute } from '@/components/map/TrackingMap'
import { useFleet } from '@/context/FleetContext'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import { formatSpeed, formatDistanceKm } from '@/utils/tracking'
import { formatDateTime } from '@/utils/date'
import { getDefaultDateRange } from '@/utils/date'
import i18n from '@/lang/i18n'

const RouteHistoryScreen = () => {
  const { carId: paramCarId } = useLocalSearchParams<{ carId: string }>()
  const { items } = useFleet()
  const [selectedCarId, setSelectedCarId] = useState<string | undefined>(paramCarId)
  const activeCarId = selectedCarId || paramCarId
  const defaultRange = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(new Date(defaultRange.from))
  const [toDate, setToDate] = useState(new Date(defaultRange.to))
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [route, setRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadRoute = useCallback(async () => {
    if (!activeCarId) return
    setLoading(true)
    try {
      const data = await TraccarService.getRoute(activeCarId, fromDate.toISOString(), toDate.toISOString())
      setRoute(data || [])
      setLoaded(true)
    } catch (err) {
      console.error('Failed to load route:', err)
    } finally {
      setLoading(false)
    }
  }, [activeCarId, fromDate, toDate])

  const totalDistance = route.length > 1 ? route.reduce((acc, p, i) => {
    if (i === 0) return 0
    const prev = route[i - 1]
    const R = 6371000
    const dLat = (p.latitude - prev.latitude) * Math.PI / 180
    const dLon = (p.longitude - prev.longitude) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, 0) : 0

  // Build route for map
  const mapRoute: MapRoute | undefined = route.length > 1
    ? { points: route.map((p) => [p.latitude, p.longitude] as [number, number]), color: '#58A6FF' }
    : undefined

  // Start/end markers
  const mapMarkers: MapMarker[] = []
  if (route.length > 0) {
    mapMarkers.push({
      id: 'start', lat: route[0].latitude, lng: route[0].longitude,
      color: '#00D68F', label: 'Start', status: 'moving',
    })
    if (route.length > 1) {
      const last = route[route.length - 1]
      mapMarkers.push({
        id: 'end', lat: last.latitude, lng: last.longitude,
        color: '#FF6B6B', label: 'End', status: 'stopped',
      })
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('ROUTE_HISTORY') }} />

      {/* Vehicle Selector (when no carId from params) */}
      {!paramCarId && (
        <View style={styles.vehiclePickerSection}>
          <Text style={styles.pickerLabel}>{i18n.t('SELECT_VEHICLE')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleChipRow}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.carId}
                style={[styles.vehicleChip, activeCarId === item.carId && styles.vehicleChipActive]}
                onPress={() => { setSelectedCarId(item.carId); setRoute([]); setLoaded(false) }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="car" size={14} color={activeCarId === item.carId ? colors.primary : colors.textSecondary} />
                <Text style={[styles.vehicleChipText, activeCarId === item.carId && styles.vehicleChipTextActive]} numberOfLines={1}>
                  {item.carName || item.licensePlate || item.carId}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!activeCarId ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="car-search" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>{i18n.t('SELECT_VEHICLE')}</Text>
        </View>
      ) : (
        <>
      <TrackingMap markers={mapMarkers} route={mapRoute} height="flex" />

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
            <MaterialCommunityIcons name="calendar-start" size={16} color={colors.primary} />
            <Text style={styles.dateText}>{formatDateTime(fromDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
            <MaterialCommunityIcons name="calendar-end" size={16} color={colors.primary} />
            <Text style={styles.dateText}>{formatDateTime(toDate)}</Text>
          </TouchableOpacity>
        </View>

        <Button mode="contained" onPress={loadRoute} loading={loading} disabled={loading} buttonColor={colors.primary} textColor={colors.textInverse} style={styles.loadBtn}>
          {i18n.t('LOAD_ROUTE')}
        </Button>

        {loaded && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDistanceKm(totalDistance)}</Text>
              <Text style={styles.statLabel}>{i18n.t('DISTANCE')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{route.length}</Text>
              <Text style={styles.statLabel}>{i18n.t('POINTS')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {route.length > 0 ? formatSpeed(Math.max(...route.map((p) => (p.speed || 0) * 1.852))) : '--'}
              </Text>
              <Text style={styles.statLabel}>{i18n.t('MAX_SPEED')}</Text>
            </View>
          </View>
        )}
      </View>
        </>
      )}

      <DateTimePickerModal isVisible={showFromPicker} mode="datetime" date={fromDate} onConfirm={(d) => { setFromDate(d); setShowFromPicker(false) }} onCancel={() => setShowFromPicker(false)} />
      <DateTimePickerModal isVisible={showToPicker} mode="datetime" date={toDate} onConfirm={(d) => { setToDate(d); setShowToPicker(false) }} onCancel={() => setShowToPicker(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  controls: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.xl, paddingBottom: spacing.xxxl,
  },
  dateRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 10, padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  dateText: { color: colors.textPrimary, fontSize: typography.sizes.small },
  loadBtn: { borderRadius: 10, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.primary },
  statLabel: { fontSize: typography.sizes.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  vehiclePickerSection: { padding: spacing.xl, paddingBottom: spacing.sm },
  pickerLabel: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  vehicleChipRow: { gap: spacing.sm },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  vehicleChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  vehicleChipText: { color: colors.textSecondary, fontSize: typography.sizes.small, maxWidth: 120 },
  vehicleChipTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
})

export default RouteHistoryScreen
