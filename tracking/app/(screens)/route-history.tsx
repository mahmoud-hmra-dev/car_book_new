import { useState, useRef, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { useLocalSearchParams, Stack } from 'expo-router'
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import { formatSpeed, formatDistanceKm, formatDateTime } from '@/utils/tracking'
import { getDefaultDateRange } from '@/utils/date'
import i18n from '@/lang/i18n'

const RouteHistoryScreen = () => {
  const { carId } = useLocalSearchParams<{ carId: string }>()
  const mapRef = useRef<MapView>(null)
  const defaultRange = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(new Date(defaultRange.from))
  const [toDate, setToDate] = useState(new Date(defaultRange.to))
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [route, setRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadRoute = useCallback(async () => {
    if (!carId) return
    setLoading(true)
    try {
      const data = await TraccarService.getRoute(carId, fromDate.toISOString(), toDate.toISOString())
      setRoute(data || [])
      setLoaded(true)
      if (data?.length && mapRef.current) {
        const coords = data.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
          animated: true,
        })
      }
    } catch (err) {
      console.error('Failed to load route:', err)
    } finally {
      setLoading(false)
    }
  }, [carId, fromDate, toDate])

  const totalDistance = route.length > 1 ? route.reduce((acc, p, i) => {
    if (i === 0) return 0
    const prev = route[i - 1]
    const R = 6371000
    const dLat = (p.latitude - prev.latitude) * Math.PI / 180
    const dLon = (p.longitude - prev.longitude) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, 0) : 0

  const routeCoords = route.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('ROUTE_HISTORY') }} />

      <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={{ latitude: 33.8938, longitude: 35.5018, latitudeDelta: 0.5, longitudeDelta: 0.5 }}>
        {routeCoords.length > 1 && <Polyline coordinates={routeCoords} strokeColor={colors.mapRoute} strokeWidth={4} />}
        {route.length > 0 && (
          <>
            <Marker coordinate={routeCoords[0]} pinColor="green" title={i18n.t('START')} />
            <Marker coordinate={routeCoords[routeCoords.length - 1]} pinColor="red" title={i18n.t('END')} />
          </>
        )}
      </MapView>

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

      <DateTimePickerModal isVisible={showFromPicker} mode="datetime" date={fromDate} onConfirm={(d) => { setFromDate(d); setShowFromPicker(false) }} onCancel={() => setShowFromPicker(false)} />
      <DateTimePickerModal isVisible={showToPicker} mode="datetime" date={toDate} onConfirm={(d) => { setToDate(d); setShowToPicker(false) }} onCancel={() => setShowToPicker(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  controls: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  dateRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: { color: colors.textPrimary, fontSize: typography.sizes.small },
  loadBtn: { borderRadius: 10, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.primary },
  statLabel: { fontSize: typography.sizes.caption, color: colors.textSecondary, marginTop: spacing.xxs },
})

export default RouteHistoryScreen
