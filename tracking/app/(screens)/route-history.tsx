import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native'
import { Text, Button, Switch, ActivityIndicator } from 'react-native-paper'
import { useLocalSearchParams, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import TrackingMap, { type MapMarker, type MapRoute } from '@/components/map/TrackingMap'
import * as TraccarService from '@/services/TraccarService'
import { useFleet } from '@/context/FleetContext'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import { formatSpeed, formatDistanceKm, formatDuration } from '@/utils/tracking'
import { formatDateTime } from '@/utils/date'
import { snapToRoads } from '@/utils/snapToRoads'
import i18n from '@/lang/i18n'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlaybackSpeed = 1 | 2 | 4 | 8

interface TripStats {
  totalDistance: number
  totalDuration: number
  maxSpeed: number
  avgSpeed: number
  stopsCount: number
  pointsCount: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KNOTS_TO_KMH = 1.852

const knotsToKmh = (knots?: number): number =>
  knots != null ? knots * KNOTS_TO_KMH : 0

const isValidPoint = (p: bookcarsTypes.TraccarPosition): boolean =>
  p.latitude !== 0 && p.longitude !== 0

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const filterGPSJumps = (
  points: bookcarsTypes.TraccarPosition[],
  maxMeters = 5000,
): bookcarsTypes.TraccarPosition[] => {
  if (points.length < 2) return points
  const result: bookcarsTypes.TraccarPosition[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1]
    const dist = haversineMeters(
      prev.latitude,
      prev.longitude,
      points[i].latitude,
      points[i].longitude,
    )
    if (dist <= maxMeters) {
      result.push(points[i])
    }
  }
  return result
}

const computeTripStats = (points: bookcarsTypes.TraccarPosition[]): TripStats => {
  if (points.length === 0) {
    return { totalDistance: 0, totalDuration: 0, maxSpeed: 0, avgSpeed: 0, stopsCount: 0, pointsCount: 0 }
  }

  let totalDistance = 0
  let maxSpeed = 0
  let speedSum = 0

  for (let i = 0; i < points.length; i++) {
    const spdKmh = knotsToKmh(points[i].speed)
    speedSum += spdKmh
    if (spdKmh > maxSpeed) maxSpeed = spdKmh

    if (i > 0) {
      totalDistance += haversineMeters(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude,
      )
    }
  }

  const avgSpeed = points.length > 0 ? speedSum / points.length : 0

  // Duration from first to last point
  const firstTime = points[0].fixTime || points[0].deviceTime
  const lastTime = points[points.length - 1].fixTime || points[points.length - 1].deviceTime
  let totalDuration = 0
  if (firstTime && lastTime) {
    totalDuration = (new Date(lastTime as string).getTime() - new Date(firstTime as string).getTime()) / 1000
  }

  // Count stops: speed = 0 for > 2 consecutive minutes
  let stopsCount = 0
  let stopStart: number | null = null
  for (let i = 0; i < points.length; i++) {
    const spdKmh = knotsToKmh(points[i].speed)
    if (spdKmh < 1) {
      if (stopStart === null) {
        const t = points[i].fixTime || points[i].deviceTime
        stopStart = t ? new Date(t as string).getTime() : null
      }
    } else {
      if (stopStart !== null) {
        const t = points[i].fixTime || points[i].deviceTime
        if (t) {
          const stopEnd = new Date(t as string).getTime()
          if (stopEnd - stopStart >= 120_000) stopsCount++
        }
      }
      stopStart = null
    }
  }
  // Check if still stopped at end
  if (stopStart !== null && points.length > 1) {
    const t = points[points.length - 1].fixTime || points[points.length - 1].deviceTime
    if (t) {
      const stopEnd = new Date(t as string).getTime()
      if (stopEnd - stopStart >= 120_000) stopsCount++
    }
  }

  return { totalDistance, totalDuration, maxSpeed, avgSpeed, stopsCount, pointsCount: points.length }
}

const speedIntervals: Record<PlaybackSpeed, number> = { 1: 1000, 2: 500, 4: 250, 8: 125 }

// ---------------------------------------------------------------------------
// Quick date presets
// ---------------------------------------------------------------------------

const getToday = () => {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  return { from, to: now }
}

const getYesterday = () => {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0)
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  return { from, to }
}

const getLast7Days = () => {
  const now = new Date()
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return { from, to: now }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RouteHistoryScreen = () => {
  const { carId: paramCarId } = useLocalSearchParams<{ carId: string }>()
  const { items } = useFleet()

  // Vehicle selection
  const [selectedCarId, setSelectedCarId] = useState<string | undefined>(paramCarId)
  const activeCarId = selectedCarId || paramCarId

  // Date range
  const [fromDate, setFromDate] = useState(() => getToday().from)
  const [toDate, setToDate] = useState(() => getToday().to)
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [activePreset, setActivePreset] = useState<string>('today')

  // Route data
  const [rawRoute, setRawRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [displayRoute, setDisplayRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(false)

  // Playback state
  const [playing, setPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
  const [currentIndex, setCurrentIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Custom slider
  const [sliderWidth, setSliderWidth] = useState(0)

  // Trip stats
  const [stats, setStats] = useState<TripStats | null>(null)

  // Snapped display points (for the map polyline)
  const [snappedMapPoints, setSnappedMapPoints] = useState<[number, number][] | null>(null)

  // -------------------------------------------------------------------------
  // Quick presets
  // -------------------------------------------------------------------------

  const applyPreset = useCallback((preset: string) => {
    setActivePreset(preset)
    let range: { from: Date, to: Date }
    switch (preset) {
      case 'yesterday':
        range = getYesterday()
        break
      case 'last7':
        range = getLast7Days()
        break
      default:
        range = getToday()
    }
    setFromDate(range.from)
    setToDate(range.to)
  }, [])

  // -------------------------------------------------------------------------
  // Load route
  // -------------------------------------------------------------------------

  const loadRoute = useCallback(async () => {
    if (!activeCarId) return
    setLoading(true)
    setPlaying(false)
    setCurrentIndex(0)
    setStats(null)
    setSnappedMapPoints(null)

    try {
      const data = await TraccarService.getRoute(activeCarId, fromDate.toISOString(), toDate.toISOString())
      const valid = (data || []).filter(isValidPoint)
      const filtered = filterGPSJumps(valid)
      setRawRoute(filtered)
      setDisplayRoute(filtered)
      setLoaded(true)
      setStats(computeTripStats(filtered))

      // If snap is enabled, run snap immediately
      if (snapEnabled && filtered.length > 1) {
        setSnapping(true)
        try {
          const snapped = await snapToRoads(filtered.map((p) => ({ latitude: p.latitude, longitude: p.longitude })))
          setSnappedMapPoints(snapped.map((p) => [p.latitude, p.longitude] as [number, number]))
        } catch {
          // Fallback - no snapping
        } finally {
          setSnapping(false)
        }
      }
    } catch (err) {
      console.error('Failed to load route:', err)
    } finally {
      setLoading(false)
    }
  }, [activeCarId, fromDate, toDate, snapEnabled])

  // -------------------------------------------------------------------------
  // Snap to road toggle
  // -------------------------------------------------------------------------

  const toggleSnap = useCallback(async (enabled: boolean) => {
    setSnapEnabled(enabled)
    if (enabled && rawRoute.length > 1) {
      setSnapping(true)
      try {
        const snapped = await snapToRoads(rawRoute.map((p) => ({ latitude: p.latitude, longitude: p.longitude })))
        setSnappedMapPoints(snapped.map((p) => [p.latitude, p.longitude] as [number, number]))
      } catch {
        // Fallback - no snapping
      } finally {
        setSnapping(false)
      }
    } else {
      setSnappedMapPoints(null)
    }
  }, [rawRoute])

  // -------------------------------------------------------------------------
  // Playback engine
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (playing && displayRoute.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= displayRoute.length - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speedIntervals[playbackSpeed])
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [playing, playbackSpeed, displayRoute.length])

  const togglePlay = useCallback(() => {
    if (displayRoute.length < 2) return
    if (!playing && currentIndex >= displayRoute.length - 1) {
      setCurrentIndex(0)
    }
    setPlaying((prev) => !prev)
  }, [playing, currentIndex, displayRoute.length])

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      const speeds: PlaybackSpeed[] = [1, 2, 4, 8]
      const idx = speeds.indexOf(prev)
      return speeds[(idx + 1) % speeds.length]
    })
  }, [])

  // -------------------------------------------------------------------------
  // Build current playback data
  // -------------------------------------------------------------------------

  const currentPoint = displayRoute[currentIndex] as bookcarsTypes.TraccarPosition | undefined
  const playbackData = currentPoint
    ? {
        speed: knotsToKmh(currentPoint.speed),
        time: (currentPoint.fixTime || currentPoint.deviceTime || '') as string,
        ignition: currentPoint.attributes?.ignition ?? false,
        course: currentPoint.course ?? 0,
      }
    : undefined

  // -------------------------------------------------------------------------
  // Map data
  // -------------------------------------------------------------------------

  const mapPoints: [number, number][] = snappedMapPoints
    || (displayRoute.length > 1
      ? displayRoute.map((p) => [p.latitude, p.longitude] as [number, number])
      : [])

  const mapRoute: MapRoute | undefined = mapPoints.length > 1
    ? { points: mapPoints, color: colors.mapRoute }
    : undefined

  const mapMarkers: MapMarker[] = []
  if (displayRoute.length > 0) {
    mapMarkers.push({
      id: 'start',
      lat: displayRoute[0].latitude,
      lng: displayRoute[0].longitude,
      color: colors.success,
      label: i18n.t('START'),
      status: 'moving',
    })
    if (displayRoute.length > 1) {
      const last = displayRoute[displayRoute.length - 1]
      mapMarkers.push({
        id: 'end',
        lat: last.latitude,
        lng: last.longitude,
        color: colors.danger,
        label: i18n.t('END'),
        status: 'stopped',
      })
    }
  }

  // -------------------------------------------------------------------------
  // Custom slider handler
  // -------------------------------------------------------------------------

  const handleSliderPress = useCallback(
    (evt: any) => {
      if (displayRoute.length < 2 || sliderWidth <= 0) return
      const x = evt.nativeEvent.locationX
      const ratio = Math.max(0, Math.min(1, x / sliderWidth))
      const idx = Math.round(ratio * (displayRoute.length - 1))
      setCurrentIndex(idx)
    },
    [displayRoute.length, sliderWidth],
  )

  const onSliderLayout = useCallback((evt: LayoutChangeEvent) => {
    setSliderWidth(evt.nativeEvent.layout.width)
  }, [])

  const progressRatio = displayRoute.length > 1 ? currentIndex / (displayRoute.length - 1) : 0

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('ROUTE_HISTORY') }} />

      {/* Vehicle Selector */}
      {!paramCarId && (
        <View style={styles.vehiclePickerSection}>
          <Text style={styles.sectionLabel}>{i18n.t('SELECT_VEHICLE')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.carId}
                style={[styles.chip, activeCarId === item.carId && styles.chipActive]}
                onPress={() => {
                  setSelectedCarId(item.carId)
                  setRawRoute([])
                  setDisplayRoute([])
                  setLoaded(false)
                  setStats(null)
                  setPlaying(false)
                  setCurrentIndex(0)
                  setSnappedMapPoints(null)
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="car"
                  size={14}
                  color={activeCarId === item.carId ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[styles.chipText, activeCarId === item.carId && styles.chipTextActive]}
                  numberOfLines={1}
                >
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
          <Text style={styles.emptyText}>{i18n.t('SELECT_VEHICLE_FIRST')}</Text>
        </View>
      ) : (
        <>
          {/* Map */}
          <TrackingMap
            markers={mapMarkers}
            route={mapRoute}
            height="flex"
            playbackIndex={loaded && displayRoute.length > 1 ? currentIndex : undefined}
            playbackData={loaded && displayRoute.length > 1 ? playbackData : undefined}
          />

          {/* Bottom panel */}
          <View style={styles.panel}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Quick date presets */}
              <View style={styles.presetRow}>
                {(['today', 'yesterday', 'last7'] as const).map((preset) => {
                  const labels: Record<string, string> = {
                    today: i18n.t('TODAY'),
                    yesterday: i18n.t('YESTERDAY'),
                    last7: i18n.t('LAST_7_DAYS'),
                  }
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetChip, activePreset === preset && styles.presetChipActive]}
                      onPress={() => applyPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetText, activePreset === preset && styles.presetTextActive]}>
                        {labels[preset]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Date pickers */}
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                  <MaterialCommunityIcons name="calendar-start" size={16} color={colors.primary} />
                  <Text style={styles.dateText} numberOfLines={1}>{formatDateTime(fromDate)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                  <MaterialCommunityIcons name="calendar-end" size={16} color={colors.primary} />
                  <Text style={styles.dateText} numberOfLines={1}>{formatDateTime(toDate)}</Text>
                </TouchableOpacity>
              </View>

              {/* Snap to Road + Load */}
              <View style={styles.actionRow}>
                <View style={styles.snapRow}>
                  <Switch
                    value={snapEnabled}
                    onValueChange={toggleSnap}
                    color={colors.primary}
                  />
                  <Text style={styles.snapLabel}>{i18n.t('SNAP_TO_ROAD')}</Text>
                  {snapping && <ActivityIndicator size={14} color={colors.primary} style={{ marginLeft: spacing.xs }} />}
                </View>
                <Button
                  mode="contained"
                  onPress={loadRoute}
                  loading={loading}
                  disabled={loading || snapping}
                  buttonColor={colors.primary}
                  textColor={colors.textInverse}
                  style={styles.loadBtn}
                  compact
                >
                  {loading ? i18n.t('LOADING') : i18n.t('LOAD_ROUTE')}
                </Button>
              </View>

              {/* No data message */}
              {loaded && displayRoute.length === 0 && (
                <View style={styles.noDataRow}>
                  <MaterialCommunityIcons name="map-marker-off" size={20} color={colors.textMuted} />
                  <Text style={styles.noDataText}>{i18n.t('NO_ROUTE_DATA')}</Text>
                </View>
              )}

              {/* Snapping indicator */}
              {snapping && (
                <View style={styles.snappingRow}>
                  <ActivityIndicator size={16} color={colors.primary} />
                  <Text style={styles.snappingText}>{i18n.t('SNAPPING_ROUTE')}</Text>
                </View>
              )}

              {/* Trip Summary */}
              {loaded && stats && stats.pointsCount > 0 && (
                <View style={styles.statsContainer}>
                  <Text style={styles.sectionLabel}>{i18n.t('TRIP_SUMMARY')}</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <MaterialCommunityIcons name="map-marker-distance" size={18} color={colors.info} />
                      <Text style={styles.statValue}>{formatDistanceKm(stats.totalDistance)}</Text>
                      <Text style={styles.statLabel}>{i18n.t('DISTANCE')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <MaterialCommunityIcons name="clock-outline" size={18} color={colors.warning} />
                      <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
                      <Text style={styles.statLabel}>{i18n.t('TOTAL_DURATION')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <MaterialCommunityIcons name="speedometer" size={18} color={colors.danger} />
                      <Text style={styles.statValue}>{formatSpeed(stats.maxSpeed)}</Text>
                      <Text style={styles.statLabel}>{i18n.t('MAX_SPEED')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <MaterialCommunityIcons name="gauge" size={18} color={colors.primary} />
                      <Text style={styles.statValue}>{formatSpeed(stats.avgSpeed)}</Text>
                      <Text style={styles.statLabel}>{i18n.t('AVG_SPEED')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <MaterialCommunityIcons name="stop-circle-outline" size={18} color={colors.stopped} />
                      <Text style={styles.statValue}>{stats.stopsCount}</Text>
                      <Text style={styles.statLabel}>{i18n.t('STOPS_COUNT')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <MaterialCommunityIcons name="map-marker-multiple" size={18} color={colors.noGps} />
                      <Text style={styles.statValue}>{stats.pointsCount}</Text>
                      <Text style={styles.statLabel}>{i18n.t('POINTS')}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Playback Controls */}
              {loaded && displayRoute.length > 1 && (
                <View style={styles.playbackContainer}>
                  <Text style={styles.sectionLabel}>{i18n.t('PLAYBACK')}</Text>

                  {/* Current point info */}
                  {currentPoint && (
                    <View style={styles.pointInfo}>
                      <View style={styles.speedBig}>
                        <Text style={[
                          styles.speedValue,
                          { color: knotsToKmh(currentPoint.speed) > 80 ? colors.danger : knotsToKmh(currentPoint.speed) > 0 ? colors.primary : colors.textMuted },
                        ]}>
                          {Math.round(knotsToKmh(currentPoint.speed))}
                        </Text>
                        <Text style={styles.speedUnit}>km/h</Text>
                      </View>
                      <View style={styles.pointMeta}>
                        <View style={styles.metaItem}>
                          <MaterialCommunityIcons name="clock-outline" size={13} color={colors.textSecondary} />
                          <Text style={styles.metaText}>
                            {currentPoint.fixTime || currentPoint.deviceTime
                              ? new Date((currentPoint.fixTime || currentPoint.deviceTime) as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : '--'}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <MaterialCommunityIcons
                            name="lightning-bolt"
                            size={13}
                            color={currentPoint.attributes?.ignition ? colors.success : colors.danger}
                          />
                          <Text style={[styles.metaText, { color: currentPoint.attributes?.ignition ? colors.success : colors.danger }]}>
                            {currentPoint.attributes?.ignition ? i18n.t('ON') : i18n.t('OFF')}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <MaterialCommunityIcons name="map-marker" size={13} color={colors.textSecondary} />
                          <Text style={styles.metaText}>{currentIndex + 1}/{displayRoute.length}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Progress bar (custom slider) */}
                  <TouchableOpacity
                    style={styles.sliderContainer}
                    onPress={handleSliderPress}
                    onLayout={onSliderLayout}
                    activeOpacity={1}
                  >
                    <View style={styles.sliderTrack}>
                      <View style={[styles.sliderFill, { width: `${progressRatio * 100}%` }]} />
                      <View style={[styles.sliderThumb, { left: `${progressRatio * 100}%` }]} />
                    </View>
                  </TouchableOpacity>

                  {/* Play / Speed controls */}
                  <View style={styles.controlsRow}>
                    {/* Speed selector */}
                    <TouchableOpacity style={styles.speedBtn} onPress={cycleSpeed} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="play-speed" size={16} color={colors.textSecondary} />
                      <Text style={styles.speedBtnText}>{playbackSpeed}x</Text>
                    </TouchableOpacity>

                    {/* Play/Pause */}
                    <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.7}>
                      <MaterialCommunityIcons
                        name={playing ? 'pause' : 'play'}
                        size={28}
                        color={colors.textInverse}
                      />
                    </TouchableOpacity>

                    {/* Reset */}
                    <TouchableOpacity
                      style={styles.speedBtn}
                      onPress={() => {
                        setPlaying(false)
                        setCurrentIndex(0)
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="skip-backward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </>
      )}

      {/* Date pickers */}
      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="datetime"
        date={fromDate}
        onConfirm={(d) => { setFromDate(d); setShowFromPicker(false); setActivePreset('') }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="datetime"
        date={toDate}
        onConfirm={(d) => { setToDate(d); setShowToPicker(false); setActivePreset('') }}
        onCancel={() => setShowToPicker(false)}
      />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Vehicle picker
  vehiclePickerSection: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipRow: {
    gap: spacing.sm,
  },
  chip: {
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
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    maxWidth: 120,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    marginTop: spacing.md,
  },

  // Bottom panel
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '55%',
  },

  // Presets
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  presetTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  // Date pickers
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
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
  dateText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    flex: 1,
  },

  // Action row (snap + load)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  snapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  snapLabel: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
  },
  loadBtn: {
    borderRadius: 10,
  },

  // No data
  noDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  noDataText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
  },

  // Snapping indicator
  snappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  snappingText: {
    color: colors.primary,
    fontSize: typography.sizes.small,
  },

  // Trip stats
  statsContainer: {
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.xxs,
  },
  statValue: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },

  // Playback
  playbackContainer: {
    marginTop: spacing.xs,
  },

  // Point info
  pointInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  speedBig: {
    alignItems: 'center',
  },
  speedValue: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    lineHeight: 36,
  },
  speedUnit: {
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointMeta: {
    flex: 1,
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
  },

  // Custom slider
  sliderContainer: {
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  // Controls row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  speedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  speedBtnText: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
})

export default RouteHistoryScreen
