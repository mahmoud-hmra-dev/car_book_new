import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'

import Indicator from '@/components/Indicator'
import TrackingMap from '@/components/tracking/TrackingMap'
import type { MapRoute, PlaybackPosition } from '@/components/tracking/TrackingMap'
import * as TraccarService from '@/services/TraccarService'
import { GOOGLE_MAPS_API_KEY } from '@/config/env.config'
import * as helper from '@/utils/helper'
import {
  formatDistanceKm,
  formatDuration,
} from '@/components/tracking/utils'

const { width: SW, height: SH } = Dimensions.get('window')
const SBAR = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24

// ── Colors (matching app theme) ──
const PRIMARY = '#6B3CE6'
const PRIMARY_LIGHT = '#ede7f9'
const BG = '#f5f5f5'
const SURFACE = '#ffffff'
const TEXT1 = '#333333'
const TEXT2 = '#666666'
const TEXT3 = '#999999'
const BORDER = '#e8e8e8'
const GREEN = '#22C55E'
const RED = '#EF4444'
const ORANGE = '#e98003'

// ── Bottom panel constants ──
const PANEL_COLLAPSED = 56
const PANEL_MID = SH * 0.42
const PANEL_MAX = SH * 0.7

// ── Route frame ──
interface RouteFrame {
  lat: number
  lng: number
  speed: number
  sat?: number
  accuracy?: number
  course?: number
  time: string
  timestampMs: number
  ignition?: boolean
  batteryLevel?: number
  address?: string
}

const buildRouteFrames = (positions: bookcarsTypes.TraccarPosition[]): RouteFrame[] =>
  positions
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => {
      const t = p.deviceTime || p.fixTime || p.serverTime || ''
      return {
        lat: p.latitude,
        lng: p.longitude,
        speed: (p.speed || 0) * 1.852,
        sat: p.attributes?.sat,
        accuracy: p.accuracy,
        course: p.course,
        time: String(t),
        timestampMs: t ? new Date(t).getTime() : 0,
        ignition: p.attributes?.ignition,
        batteryLevel: p.attributes?.batteryLevel,
        address: p.address,
      }
    })

const calculateBearing = (from: [number, number], to: [number, number]) => {
  const [lat1, lng1] = from.map((v) => (v * Math.PI) / 180)
  const [lat2, lng2] = to.map((v) => (v * Math.PI) / 180)
  const dLng = lng2 - lng1
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

const MovementHistory = () => {
  const router = useRouter()
  const { carId, carName, licensePlate } = useLocalSearchParams<{ carId: string; carName: string; licensePlate: string }>()

  // ── Date state ──
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const [toDate, setToDate] = useState(new Date())
  const [showFromDate, setShowFromDate] = useState(false)
  const [showFromTime, setShowFromTime] = useState(false)
  const [showToDate, setShowToDate] = useState(false)
  const [showToTime, setShowToTime] = useState(false)

  // ── Data state ──
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<bookcarsTypes.TraccarVehicleReportBundle | null>(null)
  const [routePositions, setRoutePositions] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [snapMode, setSnapMode] = useState<'idle' | 'loading' | 'snapped' | 'raw'>('idle')
  const [displayPoints, setDisplayPoints] = useState<[number, number][]>([])
  const [playbackPoints, setPlaybackPoints] = useState<[number, number][]>([])

  // ── Playback state ──
  const [playing, setPlaying] = useState(false)
  const [playIndex, setPlayIndex] = useState(0)
  const [playSpeed, setPlaySpeed] = useState(4)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Panel animation ──
  const panelAnim = useRef(new Animated.Value(PANEL_MID)).current
  const panelSnap = useRef(PANEL_MID)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        panelAnim.setValue(Math.max(PANEL_COLLAPSED, Math.min(PANEL_MAX, panelSnap.current - gs.dy)))
      },
      onPanResponderRelease: (_, gs) => {
        const cur = panelSnap.current - gs.dy
        let target: number
        if (gs.vy < -0.5) target = panelSnap.current < PANEL_MID ? PANEL_MID : PANEL_MAX
        else if (gs.vy > 0.5) target = panelSnap.current > PANEL_MID ? PANEL_MID : PANEL_COLLAPSED
        else {
          const dists = [PANEL_COLLAPSED, PANEL_MID, PANEL_MAX].map((s) => Math.abs(cur - s))
          target = [PANEL_COLLAPSED, PANEL_MID, PANEL_MAX][dists.indexOf(Math.min(...dists))]
        }
        panelSnap.current = target
        Animated.spring(panelAnim, { toValue: target, useNativeDriver: false, tension: 80, friction: 12 }).start()
      },
    }),
  ).current

  // ── Derived ──
  const frames = useMemo(() => buildRouteFrames(routePositions), [routePositions])
  const totalFrames = frames.length

  const routeStats = useMemo(() => {
    if (!reports?.summary && (!reports?.trips || reports.trips.length === 0)) return null
    const distance = reports?.summary?.distance ?? reports?.trips?.reduce((s, t) => s + (t.distance || 0), 0) ?? 0
    const duration = reports?.trips?.length ? reports.trips.reduce((s, t) => s + (t.duration || 0), 0) : 0
    const avgSpeed = reports?.summary?.averageSpeed ?? 0
    const maxSpeed = reports?.summary?.maxSpeed ?? 0
    return { distance, duration, avgSpeed, maxSpeed }
  }, [reports])

  const currentFrame = totalFrames > 0 ? frames[Math.min(playIndex, totalFrames - 1)] : null
  const nextFrame = totalFrames > 1 && playIndex < totalFrames - 1 ? frames[playIndex + 1] : null

  const heading = useMemo(() => {
    if (!currentFrame || !nextFrame) return 0
    return calculateBearing([currentFrame.lat, currentFrame.lng], [nextFrame.lat, nextFrame.lng])
  }, [currentFrame, nextFrame])

  const progress = totalFrames > 1 ? Math.round((playIndex / (totalFrames - 1)) * 100) : 0

  // ── Map route ──
  const mapRoute: MapRoute | undefined = useMemo(() => {
    if (displayPoints.length < 2) return undefined
    return { points: displayPoints, color: PRIMARY }
  }, [displayPoints])

  // ── Playback state for map ──
  const mapPlayback = useMemo(() => {
    if (totalFrames < 2 || !currentFrame) return undefined
    const pos: PlaybackPosition = {
      lat: playbackPoints[playIndex]?.[0] ?? currentFrame.lat,
      lng: playbackPoints[playIndex]?.[1] ?? currentFrame.lng,
      speed: currentFrame.speed,
      sat: currentFrame.sat,
      accuracy: currentFrame.accuracy,
      time: currentFrame.time,
      course: heading,
      ignition: currentFrame.ignition,
      batteryLevel: currentFrame.batteryLevel,
      deviceStatus: currentFrame.speed > 2 ? 'moving' : 'stopped',
    }
    return { playing, progress: playIndex, animSpeed: playSpeed, position: pos }
  }, [playing, playIndex, playSpeed, totalFrames, currentFrame, heading, playbackPoints])

  // ── API ──
  const loadHistory = async () => {
    if (!carId) return
    setLoading(true)
    setPlaying(false)
    setPlayIndex(0)
    setSnapMode('idle')
    try {
      const [reportData, positions] = await Promise.all([
        TraccarService.getReports(carId, fromDate.toISOString(), toDate.toISOString()),
        TraccarService.getRoute(carId, fromDate.toISOString(), toDate.toISOString()),
      ])
      setReports(reportData)
      setRoutePositions(positions)

      // Build raw points
      const raw: [number, number][] = positions
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => [p.latitude, p.longitude])
      setDisplayPoints(raw)
      setPlaybackPoints(raw)

      // Snap to roads
      if (raw.length >= 2 && GOOGLE_MAPS_API_KEY) {
        setSnapMode('loading')
        try {
          const snapped = await TraccarService.snapToRoads(raw, GOOGLE_MAPS_API_KEY)
          setDisplayPoints(snapped.displayPoints)
          setPlaybackPoints(snapped.playbackPoints)
          setSnapMode('snapped')
        } catch {
          setSnapMode('raw')
        }
      } else {
        setSnapMode(raw.length >= 2 ? 'raw' : 'idle')
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Playback engine ──
  useEffect(() => {
    if (!playing || totalFrames < 2) return
    if (playIndex >= totalFrames - 1) {
      setPlaying(false)
      return
    }
    const cur = frames[playIndex]
    const nxt = frames[playIndex + 1]
    const deltaMs = nxt.timestampMs && cur.timestampMs ? nxt.timestampMs - cur.timestampMs : 4000
    const delay = Math.max(100, Math.min(1200, Math.abs(deltaMs) / playSpeed))

    timerRef.current = setTimeout(() => setPlayIndex((v) => Math.min(v + 1, totalFrames - 1)), delay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, playIndex, playSpeed, totalFrames, frames])

  const togglePlay = () => {
    if (playIndex >= totalFrames - 1) setPlayIndex(0)
    setPlaying((v) => !v)
  }
  const restart = () => { setPlaying(false); setPlayIndex(0) }
  const speeds = [1, 2, 4, 8, 16]
  const cycleSpeed = () => {
    const i = speeds.indexOf(playSpeed)
    setPlaySpeed(speeds[(i + 1) % speeds.length])
  }

  // ── Scrubber ──
  const scrubberWidth = SW - 64
  const scrubberPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setPlaying(false),
      onPanResponderMove: (evt) => {
        const x = Math.max(0, Math.min(scrubberWidth, evt.nativeEvent.locationX))
        const idx = Math.round((x / scrubberWidth) * Math.max(1, totalFrames - 1))
        setPlayIndex(idx)
      },
    }),
  ).current

  // ── Handle map my-location request ──
  const handleMapPress = useCallback((lat: number, lng: number) => {
    if (lat === -999 && lng === -999) {
      const { getCurrentPositionAsync, requestForegroundPermissionsAsync } = require('expo-location')
      ;(async () => {
        try {
          const { status } = await requestForegroundPermissionsAsync()
          if (status !== 'granted') return
          await getCurrentPositionAsync({ accuracy: 4 })
        } catch { /* ignore */ }
      })()
    }
  }, [])

  // ══════════════════════════════════
  // RENDER
  // ══════════════════════════════════

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Full-screen map */}
      <TrackingMap
        markers={[]}
        route={mapRoute}
        onMapPress={handleMapPress}
        playback={mapPlayback}
        height={SH}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={PRIMARY} />
        </Pressable>
        <View style={s.topInfo}>
          <Text style={s.topName} numberOfLines={1}>{carName || 'Vehicle'}</Text>
          <Text style={s.topPlate}>{licensePlate || '---'}</Text>
        </View>
        <MaterialIcons name="directions-car" size={24} color={PRIMARY} />
      </View>

      {/* Bottom panel */}
      <Animated.View style={[s.panel, { height: panelAnim }]}>
        {/* Handle */}
        <View {...panResponder.panHandlers} style={s.panelHandle}>
          <View style={s.handleBar} />
        </View>

        <ScrollView style={s.panelScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {/* Date pickers */}
          <View style={s.dateRow}>
            <View style={s.dateCol}>
              <Text style={s.dateLabel}>FROM</Text>
              <View style={s.dateBtnRow}>
                <Pressable style={[s.dateBtn, { flex: 1 }]} onPress={() => setShowFromDate(true)}>
                  <MaterialIcons name="calendar-today" size={13} color={PRIMARY} />
                  <Text style={s.dateText}>{format(fromDate, 'MM/dd/yyyy')}</Text>
                </Pressable>
                <Pressable style={s.dateBtn} onPress={() => setShowFromTime(true)}>
                  <MaterialIcons name="access-time" size={13} color={PRIMARY} />
                  <Text style={s.dateText}>{format(fromDate, 'hh:mm a')}</Text>
                </Pressable>
              </View>
              {showFromDate && <DateTimePicker value={fromDate} mode="date" onChange={(_, d) => { setShowFromDate(Platform.OS === 'ios'); if (d) setFromDate(d) }} />}
              {showFromTime && <DateTimePicker value={fromDate} mode="time" onChange={(_, d) => { setShowFromTime(Platform.OS === 'ios'); if (d) setFromDate(d) }} />}
            </View>
            <View style={s.dateCol}>
              <Text style={s.dateLabel}>TO</Text>
              <View style={s.dateBtnRow}>
                <Pressable style={[s.dateBtn, { flex: 1 }]} onPress={() => setShowToDate(true)}>
                  <MaterialIcons name="calendar-today" size={13} color={PRIMARY} />
                  <Text style={s.dateText}>{format(toDate, 'MM/dd/yyyy')}</Text>
                </Pressable>
                <Pressable style={s.dateBtn} onPress={() => setShowToTime(true)}>
                  <MaterialIcons name="access-time" size={13} color={PRIMARY} />
                  <Text style={s.dateText}>{format(toDate, 'hh:mm a')}</Text>
                </Pressable>
              </View>
              {showToDate && <DateTimePicker value={toDate} mode="date" minimumDate={fromDate} onChange={(_, d) => { setShowToDate(Platform.OS === 'ios'); if (d) setToDate(d) }} />}
              {showToTime && <DateTimePicker value={toDate} mode="time" onChange={(_, d) => { setShowToTime(Platform.OS === 'ios'); if (d) setToDate(d) }} />}
            </View>
          </View>

          {/* Load button */}
          <Pressable style={[s.loadBtn, loading && s.disabled]} onPress={loadHistory} disabled={loading}>
            {loading ? <Indicator /> : <>
              <MaterialIcons name="history" size={18} color="#fff" />
              <Text style={s.loadBtnText}>Movement history</Text>
            </>}
          </Pressable>

          {/* Route stats */}
          {routeStats && (
            <View style={s.statsGrid}>
              {[
                { label: 'DISTANCE', value: formatDistanceKm(routeStats.distance), icon: 'straighten' as const },
                { label: 'TIME', value: formatDuration(routeStats.duration), icon: 'timer' as const },
                { label: 'AVG SPEED', value: routeStats.avgSpeed ? `${Math.round(routeStats.avgSpeed)} km/h` : '-', icon: 'speed' as const },
                { label: 'MAX SPEED', value: routeStats.maxSpeed ? `${Math.round(routeStats.maxSpeed)} km/h` : '-', icon: 'flash-on' as const },
              ].map((st2) => (
                <View key={st2.label} style={s.statBox}>
                  <MaterialIcons name={st2.icon} size={14} color={PRIMARY} />
                  <Text style={s.statVal}>{st2.value}</Text>
                  <Text style={s.statLabel}>{st2.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Playback player */}
          {totalFrames >= 2 && (
            <View style={s.player}>
              {/* Controls */}
              <View style={s.playerRow}>
                <Pressable style={s.ctrlBtn} onPress={restart}>
                  <MaterialIcons name="replay" size={20} color={TEXT2} />
                </Pressable>
                <Pressable style={s.playBtn} onPress={togglePlay}>
                  <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={30} color="#fff" />
                </Pressable>
                <Pressable style={s.speedBtn} onPress={cycleSpeed}>
                  <Text style={s.speedText}>{playSpeed}x</Text>
                  <MaterialIcons name="expand-more" size={14} color={TEXT2} />
                </Pressable>
              </View>

              {/* Scrubber */}
              <View style={s.scrubberWrap} {...scrubberPan.panHandlers}>
                <View style={s.scrubberTrack}>
                  <View style={[s.scrubberFill, { width: `${progress}%` }]} />
                </View>
                <View style={[s.scrubberThumb, { left: (progress / 100) * scrubberWidth - 8 }]} />
              </View>

              {/* Time / progress info */}
              <View style={s.playerInfo}>
                <Text style={s.playerTime}>
                  {currentFrame?.time ? (() => { try { const d = new Date(currentFrame.time); return isNaN(d.getTime()) ? '' : format(d, 'hh:mm:ss a') } catch { return '' } })() : ''}
                </Text>
                <Text style={s.playerPct}>{progress}%</Text>
              </View>

              {/* Snap status + speed */}
              <View style={s.playerInfo}>
                <Text style={s.snapText}>
                  {snapMode === 'loading' ? 'Snapping to roads...'
                    : snapMode === 'snapped' ? 'Route aligned to nearby roads for a cleaner replay.'
                    : ''}
                </Text>
                <Text style={s.playerSpeed}>
                  {currentFrame ? `${Math.round(currentFrame.speed)} km/h` : '0 km/h'}
                </Text>
              </View>
            </View>
          )}

          {/* Trips */}
          {reports && reports.trips.length > 0 && (
            <View style={s.tripsWrap}>
              <Text style={s.tripsTitle}>Trips ({reports.trips.length})</Text>
              {reports.trips.map((trip, i) => (
                <View key={`t-${i}`} style={s.tripCard}>
                  <View style={s.tripPt}><View style={[s.tripDot, { backgroundColor: GREEN }]} /><Text style={s.tripAddr} numberOfLines={1}>{trip.startAddress || 'Unknown'}</Text></View>
                  <View style={s.tripLine} />
                  <View style={s.tripPt}><View style={[s.tripDot, { backgroundColor: RED }]} /><Text style={s.tripAddr} numberOfLines={1}>{trip.endAddress || 'Unknown'}</Text></View>
                  <View style={s.tripMeta}>
                    <Text style={s.tripMetaText}>{formatDistanceKm(trip.distance || 0)}</Text>
                    <Text style={s.tripMetaDot}>{'\u2022'}</Text>
                    <Text style={s.tripMetaText}>{formatDuration(trip.duration || 0)}</Text>
                    {trip.maxSpeed != null && <><Text style={s.tripMetaDot}>{'\u2022'}</Text><Text style={s.tripMetaText}>Max {Math.round(trip.maxSpeed)} km/h</Text></>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {!routeStats && !loading && (
            <Text style={s.hint}>Select a date range and tap "Movement history" to load</Text>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      </Animated.View>
    </View>
  )
}

// ══════════════════════════════════
// STYLES
// ══════════════════════════════════

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // ── Top bar ──
  topBar: {
    position: 'absolute', top: SBAR + 8, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16,
    padding: 10, gap: 10,
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  topInfo: { flex: 1 },
  topName: { fontSize: 16, fontWeight: '800', color: TEXT1 },
  topPlate: { fontSize: 11, color: TEXT2, letterSpacing: 0.5, marginTop: 1 },

  // ── Panel ──
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  panelHandle: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
  panelScroll: { flex: 1, paddingHorizontal: 16 },

  // ── Dates ──
  dateRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 9, color: TEXT3, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
  dateBtnRow: { flexDirection: 'row', gap: 5 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 9, gap: 5 },
  dateText: { fontSize: 11, color: TEXT1, fontWeight: '500' },

  // ── Load ──
  loadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 13, marginTop: 12, marginBottom: 12 },
  loadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },

  // ── Stats ──
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statBox: { width: (SW - 56) / 2, backgroundColor: BG, borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: TEXT1, marginTop: 3 },
  statLabel: { fontSize: 8, color: TEXT3, fontWeight: '700', letterSpacing: 0.5, marginTop: 2, textTransform: 'uppercase' },

  // ── Player ──
  player: { backgroundColor: BG, borderRadius: 16, padding: 16, marginBottom: 14 },
  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 },
  ctrlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  playBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 8,
  },
  speedBtn: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, gap: 2 },
  speedText: { fontSize: 14, fontWeight: '700', color: TEXT1 },

  // ── Scrubber ──
  scrubberWrap: { height: 24, justifyContent: 'center', marginBottom: 4 },
  scrubberTrack: { height: 4, backgroundColor: BORDER, borderRadius: 2, overflow: 'hidden' },
  scrubberFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 2 },
  scrubberThumb: {
    position: 'absolute', top: 4, width: 16, height: 16, borderRadius: 8,
    backgroundColor: PRIMARY, borderWidth: 3, borderColor: '#fff',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3,
  },

  // ── Player info ──
  playerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  playerTime: { fontSize: 12, color: TEXT2, fontWeight: '600' },
  playerPct: { fontSize: 12, color: TEXT2, fontWeight: '600' },
  snapText: { fontSize: 10, color: TEXT3, fontStyle: 'italic', flex: 1 },
  playerSpeed: { fontSize: 14, fontWeight: '800', color: TEXT1, marginLeft: 8 },

  // ── Trips ──
  tripsWrap: { marginTop: 4 },
  tripsTitle: { fontSize: 15, fontWeight: '800', color: TEXT1, marginBottom: 10 },
  tripCard: { backgroundColor: BG, borderRadius: 12, padding: 12, marginBottom: 8 },
  tripPt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripDot: { width: 8, height: 8, borderRadius: 4 },
  tripLine: { width: 2, height: 14, backgroundColor: BORDER, marginLeft: 3, marginVertical: 2 },
  tripAddr: { fontSize: 12, color: TEXT1, flex: 1 },
  tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER },
  tripMetaText: { fontSize: 11, color: TEXT2 },
  tripMetaDot: { color: TEXT3, fontSize: 8 },

  // ── Hint ──
  hint: { color: TEXT3, fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 20 },
})

export default MovementHistory
