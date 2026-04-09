import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  Dimensions,
  Animated,
  StatusBar,
  PanResponder,
  Modal,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'
import TrackingMap from '@/components/tracking/TrackingMap'
import type { MapMarker, MapRoute, MapCircle } from '@/components/tracking/TrackingMap'
import * as TraccarService from '@/services/TraccarService'
import * as helper from '@/utils/helper'
import type { FleetVehicle, TrackingTab } from '@/components/tracking/types'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeAge,
  formatCoordinate,
  formatTimestamp,
  buildFleetVehicles,
  buildFleetCounts,
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  getEventBorderColor,
} from '@/components/tracking/utils'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// ── App theme colors ──
const PRIMARY = '#6B3CE6'
const PRIMARY_LIGHT = '#ede7f9'
const PRIMARY_DARK = '#5228c4'
const BG = '#f5f5f5'
const SURFACE = '#ffffff'
const TEXT_PRIMARY_COLOR = '#333333'
const TEXT_SECONDARY_COLOR = '#666666'
const TEXT_MUTED_COLOR = '#999999'
const BORDER_COLOR = '#e8e8e8'
const GREEN = '#22C55E'
const RED = '#EF4444'
const ORANGE = '#e98003'
const BLUE = '#188ace'

// ── Bottom sheet constants ──
const SHEET_MIN = 130
const SHEET_MID = SCREEN_HEIGHT * 0.45
const SHEET_MAX = SCREEN_HEIGHT * 0.82
const TOOLBAR_HEIGHT = 60
const SNAP_THRESHOLD = 50

const getFilterOptions = () => [
  { key: 'all', label: i18n.t('ALL'), icon: 'apps' as const },
  { key: 'moving', label: i18n.t('STATUS_MOVING'), icon: 'navigation' as const },
  { key: 'idle', label: i18n.t('STATUS_IDLE'), icon: 'pause-circle-outline' as const },
  { key: 'stopped', label: i18n.t('STATUS_STOPPED'), icon: 'stop-circle' as const },
  { key: 'offline', label: i18n.t('STATUS_OFFLINE'), icon: 'cloud-off' as const },
  { key: 'stale', label: i18n.t('STATUS_STALE'), icon: 'schedule' as const },
]

const getToolbarTabs = (): { key: TrackingTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] => [
  { key: 'status', label: i18n.t('STATUS'), icon: 'info-outline' },
  { key: 'route', label: i18n.t('ROUTE_HISTORY'), icon: 'timeline' },
  { key: 'zones', label: i18n.t('GEOFENCES_LABEL'), icon: 'fence' },
  { key: 'events', label: i18n.t('EVENTS'), icon: 'notifications-none' },
  { key: 'device', label: i18n.t('DEVICE'), icon: 'settings-remote' },
]

// ── Geofence area builders ──
const buildCircleArea = (lat: number, lng: number, radiusMeters: number) =>
  `CIRCLE (${lat} ${lng}, ${radiusMeters})`

const Tracking = () => {
  const router = useRouter()

  // ── View state ──
  const [view, setView] = useState<'fleet' | 'vehicle'>('fleet')
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TrackingTab>('status')
  const [sheetOpen, setSheetOpen] = useState(false)

  // ── Fleet data ──
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [integrationEnabled, setIntegrationEnabled] = useState(false)
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Vehicle detail data ──
  const [reports, setReports] = useState<bookcarsTypes.TraccarVehicleReportBundle | null>(null)
  const [routePositions, setRoutePositions] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [events, setEvents] = useState<bookcarsTypes.TraccarEventCenterEntry[]>([])
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [linkedGeofences, setLinkedGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [commandTypes, setCommandTypes] = useState<bookcarsTypes.TraccarCommandType[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [devices, setDevices] = useState<bookcarsTypes.TraccarDevice[]>([])

  // ── Loading states ──
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingZones, setLoadingZones] = useState(false)
  const [loadingCommands, setLoadingCommands] = useState(false)
  const [sendingCommand, setSendingCommand] = useState(false)
  const [deviceSaving, setDeviceSaving] = useState(false)

  // ── Date pickers (separate date and time for Android compat) ──
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const [toDate, setToDate] = useState(new Date())
  const [showFromDatePicker, setShowFromDatePicker] = useState(false)
  const [showFromTimePicker, setShowFromTimePicker] = useState(false)
  const [showToDatePicker, setShowToDatePicker] = useState(false)
  const [showToTimePicker, setShowToTimePicker] = useState(false)

  // ── Device form ──
  const [deviceIdInput, setDeviceIdInput] = useState('')
  const [deviceNameInput, setDeviceNameInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [selectedCommandType, setSelectedCommandType] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')

  // ── Geofence form ──
  const [geoModalVisible, setGeoModalVisible] = useState(false)
  const [geoEditId, setGeoEditId] = useState<number | null>(null)
  const [geoName, setGeoName] = useState('')
  const [geoDescription, setGeoDescription] = useState('')
  const [geoLatitude, setGeoLatitude] = useState('')
  const [geoLongitude, setGeoLongitude] = useState('')
  const [geoRadius, setGeoRadius] = useState('500')
  const [geoSaving, setGeoSaving] = useState(false)
  const [geoLinking, setGeoLinking] = useState<number | null>(null)
  const [geoDrawMode, setGeoDrawMode] = useState(false)

  // ── My location ──
  const [myLat, setMyLat] = useState<number | undefined>(undefined)
  const [myLng, setMyLng] = useState<number | undefined>(undefined)
  const [showMyLoc, setShowMyLoc] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Bottom sheet animation ──
  const sheetAnim = useRef(new Animated.Value(SHEET_MIN)).current
  const sheetSnapRef = useRef(SHEET_MIN)
  const vehicleSheetAnim = useRef(new Animated.Value(0)).current

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        const newVal = Math.max(SHEET_MIN, Math.min(SHEET_MAX, sheetSnapRef.current - gs.dy))
        sheetAnim.setValue(newVal)
      },
      onPanResponderRelease: (_, gs) => {
        const current = sheetSnapRef.current - gs.dy
        let target: number
        if (gs.vy < -0.5 || (gs.dy < -SNAP_THRESHOLD && gs.vy <= 0)) {
          target = sheetSnapRef.current === SHEET_MIN ? SHEET_MID : SHEET_MAX
        } else if (gs.vy > 0.5 || (gs.dy > SNAP_THRESHOLD && gs.vy >= 0)) {
          target = sheetSnapRef.current === SHEET_MAX ? SHEET_MID : SHEET_MIN
        } else {
          const distances = [SHEET_MIN, SHEET_MID, SHEET_MAX].map((snap) => Math.abs(current - snap))
          const minIndex = distances.indexOf(Math.min(...distances))
          target = [SHEET_MIN, SHEET_MID, SHEET_MAX][minIndex]
        }
        sheetSnapRef.current = target
        Animated.spring(sheetAnim, { toValue: target, useNativeDriver: false, tension: 80, friction: 12 }).start()
      },
    }),
  ).current

  // ── Derived data ──
  const counts = useMemo(() => buildFleetCounts(vehicles), [vehicles])

  const filteredVehicles = useMemo(() => {
    let result = vehicles
    if (statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (v) =>
          v.carName.toLowerCase().includes(q)
          || (v.licensePlate && v.licensePlate.toLowerCase().includes(q))
          || (v.supplier && v.supplier.toLowerCase().includes(q)),
      )
    }
    return result
  }, [vehicles, statusFilter, searchQuery])

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.carId === selectedCarId), [vehicles, selectedCarId])

  const isLinked = useMemo(() => typeof selectedVehicle?.deviceId === 'number', [selectedVehicle])

  const buildMarkerData = (v: FleetVehicle, isSelected: boolean): MapMarker => ({
    id: v.carId,
    lat: v.latitude!,
    lng: v.longitude!,
    color: STATUS_COLORS[v.status] || '#64748b',
    label: v.carName,
    selected: isSelected,
    status: v.status,
    speed: v.speed,
    batteryLevel: v.batteryLevel,
    ignition: v.ignition,
    licensePlate: v.licensePlate,
    course: v.course,
    sat: v.sat,
    lastUpdate: v.lastUpdate,
    address: v.address,
  })

  const fleetMarkers: MapMarker[] = useMemo(
    () =>
      filteredVehicles
        .filter((v) => v.latitude != null && v.longitude != null)
        .map((v) => buildMarkerData(v, v.carId === selectedCarId)),
    [filteredVehicles, selectedCarId],
  )

  const vehicleMarker: MapMarker[] = useMemo(() => {
    if (!selectedVehicle || selectedVehicle.latitude == null || selectedVehicle.longitude == null) return []
    return [buildMarkerData(selectedVehicle, true)]
  }, [selectedVehicle])

  const vehicleRoute: MapRoute | undefined = useMemo(() => {
    if (routePositions.length < 2) return undefined
    return {
      points: routePositions
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => [p.latitude, p.longitude] as [number, number]),
      color: PRIMARY,
    }
  }, [routePositions])

  const routeStats = useMemo(() => {
    if (!reports?.summary && (!reports?.trips || reports.trips.length === 0)) return null
    const distance = reports?.summary?.distance ?? reports?.trips?.reduce((sum, t) => sum + (t.distance || 0), 0) ?? 0
    const duration = reports?.trips?.length ? reports.trips.reduce((sum, t) => sum + (t.duration || 0), 0) : 0
    const avgSpeed = reports?.summary?.averageSpeed ?? 0
    const maxSpeed = reports?.summary?.maxSpeed ?? 0
    return { distance, duration, avgSpeed, maxSpeed }
  }, [reports])

  const linkedGeofenceIds = useMemo(
    () => new Set(linkedGeofences.map((g) => g.id).filter((id): id is number => typeof id === 'number')),
    [linkedGeofences],
  )

  // ── Geofence circles for map ──
  const geoCircles: MapCircle[] = useMemo(() => {
    const result: MapCircle[] = []
    // Show existing geofences on the map
    for (const geo of geofences) {
      const circleMatch = geo.area?.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
      if (circleMatch) {
        const isLinked = typeof geo.id === 'number' && linkedGeofenceIds.has(geo.id)
        result.push({
          id: `geo-${geo.id}`,
          lat: parseFloat(circleMatch[1]),
          lng: parseFloat(circleMatch[2]),
          radius: parseFloat(circleMatch[3]),
          color: isLinked ? GREEN : '#94a3b8',
          fillColor: isLinked ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.1)',
          label: geo.name,
        })
      }
    }
    // Show the geofence being drawn/edited
    if (geoLatitude && geoLongitude && (geoDrawMode || geoModalVisible)) {
      result.push({
        id: 'geo-draft',
        lat: parseFloat(geoLatitude),
        lng: parseFloat(geoLongitude),
        radius: parseFloat(geoRadius) || 500,
        color: PRIMARY,
        fillColor: 'rgba(107,60,230,0.2)',
        label: geoName || 'New Geofence',
      })
    }
    return result
  }, [geofences, linkedGeofenceIds, geoLatitude, geoLongitude, geoRadius, geoDrawMode, geoModalVisible, geoName])

  // ── Handle map press for geofence drawing ──
  const handleMapPressForGeo = useCallback((lat: number, lng: number) => {
    if (!geoDrawMode) return
    setGeoLatitude(lat.toFixed(6))
    setGeoLongitude(lng.toFixed(6))
  }, [geoDrawMode])

  // ── API calls ──
  const fetchFleet = useCallback(async () => {
    try {
      const status = await TraccarService.getStatus()
      setIntegrationEnabled(status.enabled)
      if (!status.enabled) {
        setLoading(false)
        setRefreshing(false)
        return
      }
      const data = await TraccarService.getFleetOverview()
      setVehicles(buildFleetVehicles(data.items))
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFleet()
    intervalRef.current = setInterval(fetchFleet, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchFleet])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchFleet()
  }

  const resetDetailState = () => {
    setReports(null)
    setRoutePositions([])
    setEvents([])
    setGeofences([])
    setLinkedGeofences([])
    setCommandTypes([])
    setDevices([])
    setSelectedCommandType('')
    setEventTypeFilter('all')
  }

  const openVehicle = useCallback(
    (carId: string) => {
      setSelectedCarId(carId)
      setActiveTab('status')
      resetDetailState()
      setSheetOpen(false)
      setView('vehicle')
      vehicleSheetAnim.setValue(0)
    },
    [vehicleSheetAnim],
  )

  const backToFleet = () => {
    Animated.timing(vehicleSheetAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
      setView('fleet')
      setSelectedCarId('')
      setSheetOpen(false)
      resetDetailState()
    })
  }

  const handleFleetMarkerPress = useCallback((id: string) => openVehicle(id), [openVehicle])

  const toggleVehicleSheet = (tab: TrackingTab) => {
    if (sheetOpen && activeTab === tab) {
      setSheetOpen(false)
      Animated.spring(vehicleSheetAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 12 }).start()
    } else {
      setActiveTab(tab)
      setSheetOpen(true)
      Animated.spring(vehicleSheetAnim, { toValue: SHEET_MID, useNativeDriver: false, tension: 80, friction: 12 }).start()
    }
  }

  const loadRoute = async () => {
    if (!selectedCarId) return
    setLoadingRoute(true)
    try {
      const [reportData, positions] = await Promise.all([
        TraccarService.getReports(selectedCarId, fromDate.toISOString(), toDate.toISOString()),
        TraccarService.getRoute(selectedCarId, fromDate.toISOString(), toDate.toISOString()),
      ])
      setReports(reportData)
      setRoutePositions(positions)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingRoute(false)
    }
  }

  const loadSnapshot = async () => {
    if (!selectedCarId) return
    setLoadingSnapshot(true)
    try {
      const [reportData, positions, geofenceData, eventData] = await Promise.all([
        TraccarService.getReports(selectedCarId, fromDate.toISOString(), toDate.toISOString()),
        TraccarService.getRoute(selectedCarId, fromDate.toISOString(), toDate.toISOString()),
        TraccarService.getGeofences(selectedCarId),
        TraccarService.getEventCenter({ carId: selectedCarId, from: fromDate.toISOString(), to: toDate.toISOString(), limit: 50 }),
      ])
      setReports(reportData)
      setRoutePositions(positions)
      setLinkedGeofences(geofenceData)
      setEvents(eventData)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingSnapshot(false)
    }
  }

  const loadEvents = async () => {
    if (!selectedCarId) return
    setLoadingEvents(true)
    try {
      const data = await TraccarService.getEventCenter({
        carId: selectedCarId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        types: eventTypeFilter === 'all' ? undefined : [eventTypeFilter],
        limit: 80,
      })
      setEvents(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingEvents(false)
    }
  }

  const loadZones = async () => {
    if (!selectedCarId) return
    setLoadingZones(true)
    try {
      const [allGeo, linkedGeo] = await Promise.all([TraccarService.getGeofences(), TraccarService.getGeofences(selectedCarId)])
      setGeofences(allGeo)
      setLinkedGeofences(linkedGeo)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingZones(false)
    }
  }

  const loadCommandTypes = async () => {
    if (!selectedCarId) return
    setLoadingCommands(true)
    try {
      const [cmds, devs] = await Promise.all([TraccarService.getCommandTypes(selectedCarId), TraccarService.getDevices()])
      setCommandTypes(cmds)
      setDevices(devs)
      if (cmds.length > 0 && !selectedCommandType) setSelectedCommandType(cmds[0].type || '')
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingCommands(false)
    }
  }

  const sendCommand = (commandType: string) => {
    Alert.alert(i18n.t('SEND_COMMAND'), i18n.t('TRACKING_SEND_COMMAND_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('SEND_COMMAND'),
        onPress: async () => {
          setSendingCommand(true)
          try {
            await TraccarService.sendCommand(selectedCarId, { type: commandType, deviceId: selectedVehicle?.deviceId })
            helper.toast('Command sent successfully')
          } catch (err) {
            helper.error(err)
          } finally {
            setSendingCommand(false)
          }
        },
      },
    ])
  }

  const handleLinkDevice = async () => {
    if (!selectedCarId || !deviceIdInput) return
    setDeviceSaving(true)
    try {
      helper.toast('Device linked successfully')
    } catch (err) {
      helper.error(err)
    } finally {
      setDeviceSaving(false)
    }
  }

  const handleUnlinkDevice = async () => {
    if (!selectedCarId) return
    Alert.alert(i18n.t('TRACKING_UNLINK_DEVICE'), i18n.t('TRACKING_UNLINK_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('TRACKING_UNLINK_DEVICE'),
        style: 'destructive',
        onPress: async () => {
          setDeviceSaving(true)
          try {
            helper.toast('Device unlinked successfully')
          } catch (err) {
            helper.error(err)
          } finally {
            setDeviceSaving(false)
          }
        },
      },
    ])
  }

  // ── Geofence CRUD ──
  const openGeoCreate = () => {
    setGeoEditId(null)
    setGeoName('')
    setGeoDescription('')
    setGeoLatitude(selectedVehicle?.latitude?.toFixed(6) || '')
    setGeoLongitude(selectedVehicle?.longitude?.toFixed(6) || '')
    setGeoRadius('500')
    setGeoDrawMode(true)
    // Close the detail sheet so user can see the map and tap
    setSheetOpen(false)
    Animated.spring(vehicleSheetAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 12 }).start()
  }

  const openGeoEdit = (geo: bookcarsTypes.TraccarGeofence) => {
    setGeoEditId(typeof geo.id === 'number' ? geo.id : null)
    setGeoName(geo.name || '')
    setGeoDescription(geo.description || '')
    const circleMatch = geo.area?.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
    if (circleMatch) {
      setGeoLatitude(circleMatch[1])
      setGeoLongitude(circleMatch[2])
      setGeoRadius(circleMatch[3])
    } else {
      setGeoLatitude('')
      setGeoLongitude('')
      setGeoRadius('500')
    }
    setGeoDrawMode(true)
    setSheetOpen(false)
    Animated.spring(vehicleSheetAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 12 }).start()
  }

  const cancelGeoDraw = () => {
    setGeoDrawMode(false)
    setGeoLatitude('')
    setGeoLongitude('')
    setGeoName('')
    setGeoDescription('')
    setGeoEditId(null)
  }

  const confirmGeoDraw = () => {
    if (!geoLatitude || !geoLongitude) {
      Alert.alert(i18n.t('TRACKING_TAP_MAP'), i18n.t('TRACKING_TAP_MAP'))
      return
    }
    setGeoDrawMode(false)
    setGeoModalVisible(true)
  }

  const handleGeoSave = async () => {
    if (!geoName.trim()) {
      Alert.alert(i18n.t('ERROR'), i18n.t('TRACKING_NAME_REQUIRED'))
      return
    }
    if (!geoLatitude || !geoLongitude) {
      Alert.alert(i18n.t('ERROR'), i18n.t('TRACKING_COORDS_REQUIRED'))
      return
    }

    setGeoSaving(true)
    try {
      const area = buildCircleArea(parseFloat(geoLatitude), parseFloat(geoLongitude), parseFloat(geoRadius) || 500)
      const payload: bookcarsTypes.UpsertTraccarGeofencePayload = {
        name: geoName.trim(),
        description: geoDescription.trim() || undefined,
        area,
      }

      if (geoEditId) {
        await TraccarService.updateGeofence(geoEditId, payload)
        helper.toast('Geofence updated')
      } else {
        await TraccarService.createGeofence(payload)
        helper.toast('Geofence created')
      }
      setGeoModalVisible(false)
      loadZones()
    } catch (err) {
      helper.error(err)
    } finally {
      setGeoSaving(false)
    }
  }

  const handleGeoDelete = (geo: bookcarsTypes.TraccarGeofence) => {
    if (typeof geo.id !== 'number') return
    Alert.alert(i18n.t('TRACKING_DELETE_GEOFENCE'), `${i18n.t('TRACKING_DELETE_GEOFENCE_CONFIRM')} "${geo.name}"?`, [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            await TraccarService.deleteGeofence(geo.id as number)
            helper.toast('Geofence deleted')
            loadZones()
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  const handleGeoToggleLink = async (geo: bookcarsTypes.TraccarGeofence) => {
    if (!selectedCarId || typeof geo.id !== 'number') return
    const geoId = geo.id as number
    const isCurrentlyLinked = linkedGeofenceIds.has(geoId)
    setGeoLinking(geoId)
    try {
      if (isCurrentlyLinked) {
        await TraccarService.unlinkGeofence(selectedCarId, geoId)
        helper.toast('Geofence unlinked')
      } else {
        await TraccarService.linkGeofence(selectedCarId, geoId)
        helper.toast('Geofence linked')
      }
      loadZones()
    } catch (err) {
      helper.error(err)
    } finally {
      setGeoLinking(null)
    }
  }

  useEffect(() => {
    if (view !== 'vehicle' || !selectedCarId) return
    if (activeTab === 'zones') loadZones()
    if (activeTab === 'device') loadCommandTypes()
  }, [view, activeTab, selectedCarId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── My location handler ──
  const fetchMyLocation = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getCurrentPositionAsync, requestForegroundPermissionsAsync } = require('expo-location')
      const { status } = await requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(i18n.t('TRACKING_PERMISSION_DENIED'), i18n.t('TRACKING_LOCATION_PERMISSION'))
        return
      }
      const location = await getCurrentPositionAsync({ accuracy: 4 })
      setMyLat(location.coords.latitude)
      setMyLng(location.coords.longitude)
      setShowMyLoc(true)
    } catch (err) {
      helper.error(err)
    }
  }, [])

  // Handle map press including my-location sentinel
  const handleFleetMapPress = useCallback((lat: number, lng: number) => {
    if (lat === -999 && lng === -999) {
      fetchMyLocation()
    }
  }, [fetchMyLocation])

  const handleVehicleMapPress = useCallback((lat: number, lng: number) => {
    if (lat === -999 && lng === -999) {
      fetchMyLocation()
      return
    }
    if (geoDrawMode) {
      handleMapPressForGeo(lat, lng)
    }
  }, [geoDrawMode, handleMapPressForGeo, fetchMyLocation])

  // ════════════════════════════════════════════════════════════════
  // FLEET VIEW
  // ════════════════════════════════════════════════════════════════

  const onlineCount = counts.moving + counts.idle + counts.stopped
  const fleetHealthPct = counts.all > 0 ? Math.round((onlineCount / counts.all) * 100) : 0

  const renderFleetStatusBar = () => (
    <View>
      {/* Fleet health bar */}
      <View style={st.healthRow}>
        <View style={st.healthBarTrack}>
          <View style={[st.healthBarFill, { width: `${fleetHealthPct}%`, backgroundColor: fleetHealthPct > 70 ? GREEN : fleetHealthPct > 40 ? ORANGE : RED }]} />
        </View>
        <Text style={st.healthPct}>{fleetHealthPct}%</Text>
      </View>
      {/* Status counts */}
      <View style={st.fleetStatusBar}>
        {[
          { key: 'all', label: i18n.t('TOTAL'), value: counts.all, color: PRIMARY, icon: 'apps' as const },
          { key: 'moving', label: i18n.t('STATUS_MOVING'), value: counts.moving, color: GREEN, icon: 'navigation' as const },
          { key: 'idle', label: i18n.t('STATUS_IDLE'), value: counts.idle, color: ORANGE, icon: 'pause-circle-outline' as const },
          { key: 'stopped', label: i18n.t('STATUS_STOPPED'), value: counts.stopped, color: BLUE, icon: 'stop-circle' as const },
          { key: 'offline', label: i18n.t('STATUS_OFFLINE'), value: counts.offline, color: TEXT_MUTED_COLOR, icon: 'cloud-off' as const },
        ].map((stat) => (
          <Pressable key={stat.key} style={st.fleetStatusItem} onPress={() => setStatusFilter(stat.key)}>
            <MaterialIcons name={stat.icon} size={14} color={stat.color} />
            <Text style={[st.fleetStatusValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={st.fleetStatusLabel}>{stat.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )

  const renderVehicleListItem = ({ item }: { item: FleetVehicle }) => {
    const dotColor = STATUS_COLORS[item.status] || '#64748b'
    const statusLabel = STATUS_LABELS[item.status] || item.status
    const battery = typeof item.batteryLevel === 'number' ? Math.round(item.batteryLevel) : null
    const batColor = battery !== null ? (battery > 50 ? GREEN : battery > 20 ? ORANGE : RED) : TEXT_MUTED_COLOR
    return (
      <Pressable style={st.vehicleListItem} onPress={() => openVehicle(item.carId)}>
        {/* Left: car icon + info */}
        <View style={st.vehicleListLeft}>
          <View style={[st.vehicleIconCircle, { borderColor: dotColor, backgroundColor: `${dotColor}10` }]}>
            <MaterialIcons name="directions-car" size={18} color={dotColor} />
          </View>
          <View style={st.vehicleListInfo}>
            <Text style={st.vehicleListName} numberOfLines={1}>{item.carName}</Text>
            <Text style={st.vehicleListMeta} numberOfLines={1}>
              {item.licensePlate || '---'}
              {item.supplier ? ` \u00B7 ${item.supplier}` : ''}
            </Text>
            {/* Micro indicators row */}
            <View style={st.microRow}>
              {/* Speed */}
              <View style={st.microItem}>
                <MaterialIcons name="speed" size={10} color={item.speed > 0 ? GREEN : TEXT_MUTED_COLOR} />
                <Text style={[st.microText, item.speed > 0 && { color: GREEN }]}>{Math.round(item.speed)} km/h</Text>
              </View>
              {/* Ignition */}
              <View style={st.microItem}>
                <MaterialIcons name="local-fire-department" size={10} color={item.ignition ? GREEN : RED} />
                <Text style={[st.microText, { color: item.ignition ? GREEN : RED }]}>{item.ignition ? 'ON' : 'OFF'}</Text>
              </View>
              {/* Battery */}
              {battery !== null && (
                <View style={st.microItem}>
                  <MaterialIcons name="battery-std" size={10} color={batColor} />
                  <Text style={[st.microText, { color: batColor }]}>{battery}%</Text>
                </View>
              )}
              {/* Satellites */}
              {item.sat != null && (
                <View style={st.microItem}>
                  <MaterialIcons name="satellite-alt" size={10} color={item.sat >= 8 ? GREEN : item.sat >= 4 ? ORANGE : RED} />
                  <Text style={st.microText}>{item.sat}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {/* Right: status + time */}
        <View style={st.vehicleListRight}>
          <View style={[st.vehicleStatusPill, { backgroundColor: `${dotColor}15` }]}>
            <View style={[st.vehicleStatusDot, { backgroundColor: dotColor }]} />
            <Text style={[st.vehicleStatusText, { color: dotColor }]}>{statusLabel}</Text>
          </View>
          <Text style={st.vehicleListAge}>{formatRelativeAge(item.lastUpdate)}</Text>
        </View>
      </Pressable>
    )
  }

  const renderFleetView = () => (
    <View style={st.fullScreen}>
      {/* Full-screen map - rendered directly, no absolute wrapper */}
      <TrackingMap
        markers={fleetMarkers}
        selectedMarkerId={selectedCarId}
        onMarkerPress={handleFleetMarkerPress}
        onMapPress={handleFleetMapPress}
        showMyLocation={showMyLoc}
        myLocationLat={myLat}
        myLocationLng={myLng}
        height={SCREEN_HEIGHT}
      />

      {/* Floating status overlay */}
      <View style={st.fleetOverlay}>
        {renderFleetStatusBar()}
      </View>

      {/* Bottom sheet */}
      <Animated.View style={[st.bottomSheet, { height: sheetAnim }]}>
        <View {...panResponder.panHandlers} style={st.sheetHandleArea}>
          <View style={st.sheetHandle} />
          <Text style={st.sheetTitle}>{i18n.t('TRACKING_VEHICLES_COUNT')} ({filteredVehicles.length})</Text>
        </View>

        <View style={st.sheetHeader}>
          <View style={st.searchBar}>
            <MaterialIcons name="search" size={18} color={TEXT_MUTED_COLOR} />
            <TextInput
              style={st.searchInput}
              placeholder={i18n.t('TRACKING_SEARCH_VEHICLES')}
              placeholderTextColor={TEXT_MUTED_COLOR}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={16} color={TEXT_MUTED_COLOR} />
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterChipsRow}>
            {getFilterOptions().map((opt) => {
              const isSelected = statusFilter === opt.key
              const count = opt.key === 'all' ? counts.all : (counts as any)[opt.key] || 0
              return (
                <Pressable key={opt.key} style={[st.filterChip, isSelected && st.filterChipActive]} onPress={() => setStatusFilter(opt.key)}>
                  <MaterialIcons name={opt.icon} size={12} color={isSelected ? '#fff' : TEXT_SECONDARY_COLOR} />
                  <Text style={[st.filterChipText, isSelected && st.filterChipTextActive]}>{opt.label}</Text>
                  <Text style={[st.filterChipCount, isSelected && st.filterChipCountActive]}>{count}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredVehicles}
          renderItem={renderVehicleListItem}
          keyExtractor={(item) => item.carId}
          contentContainerStyle={st.vehicleList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={st.emptyContainer}>
              <MaterialIcons name="directions-car" size={40} color={TEXT_MUTED_COLOR} />
              <Text style={st.emptyText}>No vehicles found</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} />}
        />
      </Animated.View>
    </View>
  )

  // ════════════════════════════════════════════════════════════════
  // VEHICLE VIEW - Date Pickers (separate date and time for Android)
  // ════════════════════════════════════════════════════════════════

  const renderDatePickers = () => (
    <View style={st.dateRow}>
      <View style={st.dateField}>
        <Text style={st.dateLabel}>{i18n.t('FROM')}</Text>
        <View style={st.dateTimeRow}>
          <Pressable style={[st.dateBtn, { flex: 1 }]} onPress={() => setShowFromDatePicker(true)}>
            <MaterialIcons name="calendar-today" size={14} color={PRIMARY} />
            <Text style={st.dateText}>{format(fromDate, 'MMM dd')}</Text>
          </Pressable>
          <Pressable style={[st.dateBtn, { flex: 0.7 }]} onPress={() => setShowFromTimePicker(true)}>
            <MaterialIcons name="access-time" size={14} color={PRIMARY} />
            <Text style={st.dateText}>{format(fromDate, 'HH:mm')}</Text>
          </Pressable>
        </View>
        {showFromDatePicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            onChange={(_, date) => {
              setShowFromDatePicker(Platform.OS === 'ios')
              if (date) setFromDate(date)
            }}
          />
        )}
        {showFromTimePicker && (
          <DateTimePicker
            value={fromDate}
            mode="time"
            onChange={(_, date) => {
              setShowFromTimePicker(Platform.OS === 'ios')
              if (date) setFromDate(date)
            }}
          />
        )}
      </View>
      <View style={st.dateField}>
        <Text style={st.dateLabel}>{i18n.t('TO')}</Text>
        <View style={st.dateTimeRow}>
          <Pressable style={[st.dateBtn, { flex: 1 }]} onPress={() => setShowToDatePicker(true)}>
            <MaterialIcons name="calendar-today" size={14} color={PRIMARY} />
            <Text style={st.dateText}>{format(toDate, 'MMM dd')}</Text>
          </Pressable>
          <Pressable style={[st.dateBtn, { flex: 0.7 }]} onPress={() => setShowToTimePicker(true)}>
            <MaterialIcons name="access-time" size={14} color={PRIMARY} />
            <Text style={st.dateText}>{format(toDate, 'HH:mm')}</Text>
          </Pressable>
        </View>
        {showToDatePicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            minimumDate={fromDate}
            onChange={(_, date) => {
              setShowToDatePicker(Platform.OS === 'ios')
              if (date) setToDate(date)
            }}
          />
        )}
        {showToTimePicker && (
          <DateTimePicker
            value={toDate}
            mode="time"
            onChange={(_, date) => {
              setShowToTimePicker(Platform.OS === 'ios')
              if (date) setToDate(date)
            }}
          />
        )}
      </View>
    </View>
  )

  // ── Status Tab ──
  const renderStatusTab = () => {
    if (!selectedVehicle) return null
    const battery = typeof selectedVehicle.batteryLevel === 'number' ? Math.round(selectedVehicle.batteryLevel) : null
    const batteryPercent = battery !== null ? Math.min(100, Math.max(0, battery)) : 0
    const sat = selectedVehicle.sat
    const satColor = sat != null ? (sat >= 8 ? GREEN : sat >= 4 ? ORANGE : RED) : TEXT_MUTED_COLOR
    const accColor = selectedVehicle.accuracy != null ? (selectedVehicle.accuracy < 10 ? GREEN : selectedVehicle.accuracy < 30 ? ORANGE : RED) : TEXT_MUTED_COLOR
    const coords =
      selectedVehicle.latitude != null && selectedVehicle.longitude != null
        ? `${formatCoordinate(selectedVehicle.latitude)}, ${formatCoordinate(selectedVehicle.longitude)}`
        : '-'

    return (
      <ScrollView style={st.tabScroll} showsVerticalScrollIndicator={false}>
        {/* Connection status bar (like Softrasys) */}
        <View style={st.connectionBar}>
          <View style={[st.connDot, { backgroundColor: isLinked ? GREEN : RED }]} />
          <Text style={[st.connLabel, { color: isLinked ? GREEN : RED }]}>
            {isLinked ? i18n.t('TRACKING_ONLINE') : i18n.t('TRACKING_OFFLINE')}
          </Text>
          <View style={st.connSpacer} />
          <Text style={st.connMode}>{i18n.t('TRACKING_MODE_GPS')}</Text>
          {sat != null && <Text style={[st.connSat, { color: satColor }]}>SAT: {sat}</Text>}
        </View>

        {/* Main metrics - 2x2 grid */}
        <View style={st.metricsGrid}>
          {/* Speed - big */}
          <View style={[st.metricBoxLg, { borderColor: selectedVehicle.speed > 0 ? `${GREEN}30` : BORDER_COLOR }]}>
            <MaterialIcons name="speed" size={22} color={selectedVehicle.speed > 0 ? GREEN : TEXT_MUTED_COLOR} />
            <Text style={[st.metricValLg, selectedVehicle.speed > 0 && { color: GREEN }]}>
              {Math.round(selectedVehicle.speed)}
            </Text>
            <Text style={st.metricUnitLg}>km/h</Text>
          </View>
          {/* Battery */}
          <View style={[st.metricBoxLg, { borderColor: battery !== null ? `${battery > 50 ? GREEN : battery > 20 ? ORANGE : RED}30` : BORDER_COLOR }]}>
            <MaterialIcons name="battery-charging-full" size={22} color={battery !== null ? (battery > 50 ? GREEN : battery > 20 ? ORANGE : RED) : TEXT_MUTED_COLOR} />
            <Text style={st.metricValLg}>{battery !== null ? battery : '-'}</Text>
            <Text style={st.metricUnitLg}>%</Text>
            {battery !== null && (
              <View style={st.batteryTrack}>
                <View style={[st.batteryFill, { width: `${batteryPercent}%`, backgroundColor: battery > 50 ? GREEN : battery > 20 ? ORANGE : RED }]} />
              </View>
            )}
          </View>
          {/* Ignition */}
          <View style={[st.metricBoxLg, { borderColor: `${selectedVehicle.ignition ? GREEN : RED}30` }]}>
            <MaterialIcons name="local-fire-department" size={22} color={selectedVehicle.ignition ? GREEN : RED} />
            <Text style={[st.metricValLg, { color: selectedVehicle.ignition ? GREEN : RED, fontSize: 18 }]}>
              {selectedVehicle.ignition ? i18n.t('ON') : i18n.t('OFF')}
            </Text>
            <Text style={st.metricUnitLg}>{i18n.t('TRACKING_ENGINE')}</Text>
          </View>
          {/* GPS Accuracy */}
          <View style={[st.metricBoxLg, { borderColor: `${accColor}30` }]}>
            <MaterialIcons name="satellite-alt" size={22} color={satColor} />
            <Text style={[st.metricValLg, { color: accColor }]}>
              {selectedVehicle.accuracy != null ? `${Math.round(selectedVehicle.accuracy)}m` : '-'}
            </Text>
            <Text style={st.metricUnitLg}>GPS</Text>
          </View>
        </View>

        {/* Detail card */}
        <View style={st.detailCard}>
          <View style={st.detailRow}><MaterialIcons name="memory" size={15} color={TEXT_MUTED_COLOR} /><Text style={st.detailLabel}>{i18n.t('TRACKING_DEVICE_LABEL')}</Text><Text style={st.detailValue} numberOfLines={1}>{selectedVehicle.deviceName || '-'}</Text></View>
          <View style={st.detailDivider} />
          <View style={st.detailRow}><MaterialIcons name="gps-fixed" size={15} color={TEXT_MUTED_COLOR} /><Text style={st.detailLabel}>{i18n.t('TRACKING_COORDINATES_LABEL')}</Text><Text style={st.detailValue} numberOfLines={1}>{coords}</Text></View>
          <View style={st.detailDivider} />
          <View style={st.detailRow}><MaterialIcons name="satellite-alt" size={15} color={satColor} /><Text style={st.detailLabel}>{i18n.t('TRACKING_SATELLITES')}</Text><Text style={[st.detailValue, { color: satColor }]}>{sat != null ? sat : '-'}</Text></View>
          <View style={st.detailDivider} />
          <View style={st.detailRow}><MaterialIcons name="access-time" size={15} color={TEXT_MUTED_COLOR} /><Text style={st.detailLabel}>{i18n.t('TRACKING_LAST_UPDATE')}</Text><Text style={st.detailValue} numberOfLines={1}>{formatTimestamp(selectedVehicle.lastUpdate)}</Text></View>
          {selectedVehicle.totalDistance != null && (<>
            <View style={st.detailDivider} />
            <View style={st.detailRow}><MaterialIcons name="straighten" size={15} color={TEXT_MUTED_COLOR} /><Text style={st.detailLabel}>{i18n.t('TRACKING_MILEAGE_LABEL')}</Text><Text style={st.detailValue}>{Math.round(selectedVehicle.totalDistance / 1000).toLocaleString()} km</Text></View>
          </>)}
        </View>

        {/* Address */}
        {!!selectedVehicle.address && (
          <View style={st.addressBar}><MaterialIcons name="place" size={16} color={PRIMARY} /><Text style={st.addressText}>{selectedVehicle.address}</Text></View>
        )}

        {/* Load Snapshot */}
        <Pressable style={[st.actionBtn, (!isLinked || loadingSnapshot) && st.actionBtnDisabled]} onPress={loadSnapshot} disabled={!isLinked || loadingSnapshot}>
          <MaterialIcons name="camera" size={16} color="#fff" />
          <Text style={st.actionBtnText}>{loadingSnapshot ? i18n.t('TRACKING_LOADING') : i18n.t('TRACKING_LOAD_SNAPSHOT')}</Text>
        </Pressable>

        {!isLinked && (
          <View style={st.warnBar}><MaterialIcons name="warning-amber" size={16} color={ORANGE} /><Text style={st.warnText}>{i18n.t('TRACKING_DEVICE_NOT_LINKED')}</Text></View>
        )}
      </ScrollView>
    )
  }

  // ── Route Tab ──
  const openMovementHistory = () => {
    if (!selectedVehicle) return
    router.push({
      pathname: '/movement-history',
      params: {
        carId: selectedVehicle.carId,
        carName: selectedVehicle.carName,
        licensePlate: selectedVehicle.licensePlate || '',
      },
    })
  }

  const renderRouteTab = () => (
    <ScrollView style={st.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={st.routeHeroCard}>
        <MaterialIcons name="route" size={40} color={PRIMARY} />
        <Text style={st.routeHeroTitle}>{i18n.t('TRACKING_MOVEMENT_HISTORY')}</Text>
        <Text style={st.routeHeroDesc}>
          {i18n.t('TRACKING_MOVEMENT_DESC')}
        </Text>
        <Pressable style={[st.actionBtn, { marginTop: 16 }, !isLinked && st.actionBtnDisabled]} onPress={openMovementHistory} disabled={!isLinked}>
          <MaterialIcons name="play-circle-outline" size={18} color="#fff" />
          <Text style={st.actionBtnText}>{i18n.t('TRACKING_OPEN_MOVEMENT')}</Text>
        </Pressable>
        {!isLinked && (
          <View style={st.warnBar}><MaterialIcons name="warning-amber" size={16} color={ORANGE} /><Text style={st.warnText}>{i18n.t('TRACKING_DEVICE_NOT_LINKED')}</Text></View>
        )}
      </View>
    </ScrollView>
  )

  // ── Zones Tab ──
  const renderZonesTab = () => (
    <ScrollView style={st.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={st.zoneActions}>
        <Pressable style={st.actionBtnOutline} onPress={loadZones} disabled={loadingZones}>
          <MaterialIcons name="refresh" size={16} color={PRIMARY} />
          <Text style={st.actionBtnOutlineText}>{loadingZones ? i18n.t('TRACKING_REFRESHING') : i18n.t('TRACKING_REFRESH')}</Text>
        </Pressable>
        <Pressable style={st.actionBtn} onPress={openGeoCreate}>
          <MaterialIcons name="add" size={16} color="#fff" />
          <Text style={st.actionBtnText}>{i18n.t('TRACKING_CREATE_GEOFENCE')}</Text>
        </Pressable>
      </View>

      <Text style={st.zoneCount}>
        {linkedGeofences.length} zone{linkedGeofences.length !== 1 ? 's' : ''} linked to vehicle
      </Text>

      {geofences.length > 0 ? (
        geofences.map((geo, index) => {
          const geoId = typeof geo.id === 'number' ? geo.id : null
          const linked = geoId !== null && linkedGeofenceIds.has(geoId)
          const shapeType = geo.area?.split('(')[0]?.trim()?.toLowerCase() || (geo.geojson ? 'geojson' : `zone ${index + 1}`)
          const isLinking = geoLinking === geoId

          return (
            <View key={geo.id || `${geo.name}-${index}`} style={st.zoneCard}>
              <View style={st.zoneLeft}>
                <View style={[st.zoneIcon, { backgroundColor: linked ? `${GREEN}15` : `${BORDER_COLOR}` }]}>
                  <MaterialIcons name="fence" size={18} color={linked ? GREEN : TEXT_MUTED_COLOR} />
                </View>
                <View style={st.zoneInfo}>
                  <Text style={st.zoneName} numberOfLines={1}>{geo.name || `Zone ${index + 1}`}</Text>
                  <Text style={st.zoneType}>{shapeType}</Text>
                </View>
              </View>
              <View style={st.zoneActions2}>
                <Pressable
                  style={[st.zoneActionBtn, isLinking && st.actionBtnDisabled]}
                  onPress={() => handleGeoToggleLink(geo)}
                  disabled={isLinking || !isLinked}
                >
                  <MaterialIcons name={linked ? 'link-off' : 'link'} size={18} color={linked ? RED : GREEN} />
                </Pressable>
                <Pressable style={st.zoneActionBtn} onPress={() => openGeoEdit(geo)}>
                  <MaterialIcons name="edit" size={18} color={PRIMARY} />
                </Pressable>
                <Pressable style={st.zoneActionBtn} onPress={() => handleGeoDelete(geo)}>
                  <MaterialIcons name="delete-outline" size={18} color={RED} />
                </Pressable>
              </View>
            </View>
          )
        })
      ) : (
        !loadingZones && <Text style={st.hintText}>No geofences found</Text>
      )}

      {!isLinked && (
        <View style={st.warnBar}><MaterialIcons name="warning-amber" size={16} color={ORANGE} /><Text style={st.warnText}>Device not linked - cannot link geofences</Text></View>
      )}
    </ScrollView>
  )

  // ── Events Tab ──
  const renderEventsTab = () => (
    <ScrollView style={st.tabScroll} showsVerticalScrollIndicator={false}>
      {renderDatePickers()}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.eventFilterRow}>
        {EVENT_TYPE_OPTIONS.map((type) => {
          const isActive = eventTypeFilter === type
          return (
            <Pressable key={type} style={[st.eventChip, isActive && st.eventChipActive]} onPress={() => setEventTypeFilter(type)}>
              <Text style={[st.eventChipText, isActive && st.eventChipTextActive]}>{EVENT_TYPE_LABELS[type] || type}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <Pressable style={[st.actionBtn, (loadingEvents || !isLinked) && st.actionBtnDisabled]} onPress={loadEvents} disabled={loadingEvents || !isLinked}>
        <MaterialIcons name="search" size={16} color="#fff" />
        <Text style={st.actionBtnText}>{loadingEvents ? 'Loading...' : 'Load Events'}</Text>
      </Pressable>

      {events.length > 0
        ? events.map((evt, index) => {
            const evtType = evt.type || 'unknown'
            const borderColor = getEventBorderColor(evtType)
            const iconColor = EVENT_TYPE_COLORS[evtType] || TEXT_MUTED_COLOR
            return (
              <View key={evt.id || `${evt.deviceId}-${evt.eventTime}-${index}`} style={[st.eventItem, { borderLeftColor: borderColor }]}>
                <View style={[st.eventDot, { backgroundColor: `${iconColor}20` }]}><MaterialIcons name="circle" size={8} color={iconColor} /></View>
                <View style={st.eventBody}>
                  <Text style={st.eventTitle}>{EVENT_TYPE_LABELS[evtType] || evtType}</Text>
                  <Text style={st.eventTime}>{formatTimestamp(evt.eventTime)}</Text>
                  {evt.geofenceName && <Text style={st.eventExtra}>{evt.geofenceName}</Text>}
                  {typeof evt.speed === 'number' && <Text style={st.eventExtra}>Speed: {Math.round(evt.speed)} km/h</Text>}
                </View>
              </View>
            )
          })
        : !loadingEvents && <Text style={st.hintText}>No events found. Select a date range and load events</Text>}
    </ScrollView>
  )

  // ── Device Tab ──
  const renderDeviceTab = () => (
    <ScrollView style={st.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={st.deviceCard}>
        <View style={st.deviceCardHeader}>
          <Text style={st.sectionTitle}>Link Device</Text>
          <View style={st.deviceStatusChip}>
            <View style={[st.deviceStatusDot, { backgroundColor: isLinked ? GREEN : RED }]} />
            <Text style={[st.deviceStatusLabel, { color: isLinked ? GREEN : RED }]}>{isLinked ? `${i18n.t('TRACKING')} ${i18n.t('ON')}` : `${i18n.t('TRACKING')} ${i18n.t('OFF')}`}</Text>
          </View>
        </View>

        <Text style={st.inputLabel}>{i18n.t('DEVICE_ID')}</Text>
        <TextInput style={st.textInput} value={deviceIdInput} onChangeText={setDeviceIdInput} placeholder="e.g. 142" placeholderTextColor={TEXT_MUTED_COLOR} keyboardType="numeric" />
        <Text style={st.inputLabel}>{i18n.t('DEVICE_NAME')}</Text>
        <TextInput style={st.textInput} value={deviceNameInput} onChangeText={setDeviceNameInput} placeholder="e.g. Teltonika FMC130" placeholderTextColor={TEXT_MUTED_COLOR} />
        <Text style={st.inputLabel}>{i18n.t('NOTES')}</Text>
        <TextInput style={st.textInput} value={notesInput} onChangeText={setNotesInput} placeholder="..." placeholderTextColor={TEXT_MUTED_COLOR} />

        <View style={st.deviceBtnRow}>
          <Pressable style={[st.linkBtn, deviceSaving && st.actionBtnDisabled]} onPress={handleLinkDevice} disabled={deviceSaving}>
            <MaterialIcons name="link" size={14} color="#fff" />
            <Text style={st.linkBtnText}>{deviceSaving ? i18n.t('TRACKING_LINKING') : i18n.t('TRACKING_LINK')}</Text>
          </Pressable>
          <Pressable style={[st.unlinkBtn, (deviceSaving || !isLinked) && st.actionBtnDisabled]} onPress={handleUnlinkDevice} disabled={deviceSaving || !isLinked}>
            <MaterialIcons name="link-off" size={14} color={RED} />
            <Text style={st.unlinkBtnText}>{i18n.t('TRACKING_UNLINK_DEVICE')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={st.deviceCard}>
        <Text style={st.sectionTitle}>{i18n.t('COMMANDS')}</Text>
        {loadingCommands ? (
          <Indicator />
        ) : commandTypes.length > 0 ? (
          <View style={st.cmdList}>
            {commandTypes.map((cmd, index) => (
              <Pressable key={`cmd-${index}`} style={[st.cmdItem, sendingCommand && st.actionBtnDisabled]} onPress={() => sendCommand(cmd.type || '')} disabled={sendingCommand || !isLinked}>
                <View style={st.cmdIcon}><MaterialIcons name="send" size={14} color={PRIMARY} /></View>
                <Text style={st.cmdText}>{cmd.type || i18n.t('TRACKING_UNKNOWN_COMMAND')}</Text>
                <MaterialIcons name="chevron-right" size={18} color={TEXT_MUTED_COLOR} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={st.hintText}>{i18n.t('NO_RESULTS')}</Text>
        )}
      </View>
    </ScrollView>
  )

  // ── Geofence Modal ──
  const renderGeoModal = () => (
    <Modal visible={geoModalVisible} animationType="slide" transparent>
      <View style={st.modalOverlay}>
        <View style={st.modalContent}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>{geoEditId ? i18n.t('TRACKING_EDIT_GEOFENCE') : i18n.t('TRACKING_CREATE_GEOFENCE')}</Text>
            <Pressable onPress={() => setGeoModalVisible(false)}><MaterialIcons name="close" size={24} color={TEXT_SECONDARY_COLOR} /></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={st.inputLabel}>{i18n.t('NAME')} *</Text>
            <TextInput style={st.textInput} value={geoName} onChangeText={setGeoName} placeholder={i18n.t('TRACKING_GEOFENCE_NAME')} placeholderTextColor={TEXT_MUTED_COLOR} />

            <Text style={st.inputLabel}>{i18n.t('DESCRIPTION')}</Text>
            <TextInput style={st.textInput} value={geoDescription} onChangeText={setGeoDescription} placeholder={i18n.t('TRACKING_OPTIONAL_DESC')} placeholderTextColor={TEXT_MUTED_COLOR} />

            <Text style={st.inputLabel}>{i18n.t('LATITUDE')} *</Text>
            <TextInput style={st.textInput} value={geoLatitude} onChangeText={setGeoLatitude} placeholder="e.g. 33.8938" placeholderTextColor={TEXT_MUTED_COLOR} keyboardType="numeric" />

            <Text style={st.inputLabel}>{i18n.t('LONGITUDE')} *</Text>
            <TextInput style={st.textInput} value={geoLongitude} onChangeText={setGeoLongitude} placeholder="e.g. 35.5018" placeholderTextColor={TEXT_MUTED_COLOR} keyboardType="numeric" />

            <Text style={st.inputLabel}>{i18n.t('DISTANCE')} (m)</Text>
            <TextInput style={st.textInput} value={geoRadius} onChangeText={setGeoRadius} placeholder="500" placeholderTextColor={TEXT_MUTED_COLOR} keyboardType="numeric" />

            <View style={st.modalBtnRow}>
              <Pressable style={st.modalCancelBtn} onPress={() => setGeoModalVisible(false)}>
                <Text style={st.modalCancelText}>{i18n.t('CANCEL')}</Text>
              </Pressable>
              <Pressable style={[st.actionBtn, { flex: 1 }, geoSaving && st.actionBtnDisabled]} onPress={handleGeoSave} disabled={geoSaving}>
                <Text style={st.actionBtnText}>{geoSaving ? i18n.t('TRACKING_SAVING') : i18n.t('TRACKING_SAVE')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  // ── Vehicle View ──
  const renderVehicleView = () => {
    if (!selectedVehicle) return null
    const dotColor = STATUS_COLORS[selectedVehicle.status] || '#64748b'
    const statusLabel = STATUS_LABELS[selectedVehicle.status] || selectedVehicle.status

    return (
      <View style={st.fullScreen}>
        {/* Full-screen map - direct child, no wrapper */}
        <TrackingMap
          markers={vehicleMarker}
          route={vehicleRoute}
          circles={geoCircles}
          selectedMarkerId={selectedCarId}
          onMapPress={handleVehicleMapPress}
          showMyLocation={showMyLoc}
          myLocationLat={myLat}
          myLocationLng={myLng}
          height={SCREEN_HEIGHT}
        />

        {/* Geo draw mode overlay */}
        {geoDrawMode && (
          <View style={st.geoDrawOverlay}>
            <View style={st.geoDrawBanner}>
              <MaterialIcons name="touch-app" size={20} color={PRIMARY} />
              <Text style={st.geoDrawText}>{i18n.t('TRACKING_TAP_MAP')}</Text>
            </View>
            {geoLatitude && geoLongitude ? (
              <View style={st.geoDrawInfo}>
                <Text style={st.geoDrawCoord}>{geoLatitude}, {geoLongitude}</Text>
                <View style={st.geoDrawRadiusRow}>
                  <Text style={st.geoDrawLabel}>Radius:</Text>
                  <Pressable style={st.geoRadiusBtn} onPress={() => setGeoRadius(String(Math.max(100, (parseFloat(geoRadius) || 500) - 100)))}>
                    <MaterialIcons name="remove" size={18} color={PRIMARY} />
                  </Pressable>
                  <Text style={st.geoRadiusValue}>{geoRadius}m</Text>
                  <Pressable style={st.geoRadiusBtn} onPress={() => setGeoRadius(String((parseFloat(geoRadius) || 500) + 100))}>
                    <MaterialIcons name="add" size={18} color={PRIMARY} />
                  </Pressable>
                </View>
              </View>
            ) : null}
            <View style={st.geoDrawActions}>
              <Pressable style={st.geoDrawCancelBtn} onPress={cancelGeoDraw}>
                <Text style={st.geoDrawCancelText}>{i18n.t('CANCEL')}</Text>
              </Pressable>
              <Pressable style={st.geoDrawConfirmBtn} onPress={confirmGeoDraw}>
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={st.geoDrawConfirmText}>{i18n.t('CONFIRM')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Floating vehicle info bar */}
        {!geoDrawMode && <View style={st.vehicleInfoBar}>
          <Pressable style={st.backBtn} onPress={backToFleet}>
            <MaterialIcons name="arrow-back" size={22} color={PRIMARY} />
          </Pressable>
          <View style={st.vehicleInfoContent}>
            <View style={st.vehicleInfoTop}>
              <Text style={st.vehicleInfoName} numberOfLines={1}>{selectedVehicle.carName}</Text>
              <View style={[st.vehicleInfoBadge, { backgroundColor: `${dotColor}15` }]}>
                <View style={[st.vehicleInfoBadgeDot, { backgroundColor: dotColor }]} />
                <Text style={[st.vehicleInfoBadgeText, { color: dotColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <View style={st.vehicleInfoBottom}>
              <Text style={st.vehicleInfoPlate}>{selectedVehicle.licensePlate || '---'}</Text>
              {selectedVehicle.speed > 0 && (<><Text style={st.vehicleInfoDot}>{'\u2022'}</Text><Text style={[st.vehicleInfoSpeed, { color: GREEN }]}>{Math.round(selectedVehicle.speed)} km/h</Text></>)}
              <Text style={st.vehicleInfoDot}>{'\u2022'}</Text>
              <Text style={st.vehicleInfoAge}>{formatRelativeAge(selectedVehicle.lastUpdate)}</Text>
            </View>
          </View>
        </View>}

        {/* Detail bottom sheet - hidden in draw mode */}
        {!geoDrawMode && (
          <Animated.View style={[st.vehicleSheet, { height: vehicleSheetAnim }]}>
            {sheetOpen && (
              <View style={st.vehicleSheetContent}>
                <View style={st.vehicleSheetHandle} />
                <Text style={st.vehicleSheetTitle}>{getToolbarTabs().find((t) => t.key === activeTab)?.label || ''}</Text>
                {activeTab === 'status' && renderStatusTab()}
                {activeTab === 'route' && renderRouteTab()}
                {activeTab === 'zones' && renderZonesTab()}
                {activeTab === 'events' && renderEventsTab()}
                {activeTab === 'device' && renderDeviceTab()}
              </View>
            )}
          </Animated.View>
        )}

        {/* Bottom toolbar - hidden in draw mode */}
        {!geoDrawMode && <View style={st.toolbar}>
          {getToolbarTabs().map((tab) => {
            const isActive = sheetOpen && activeTab === tab.key
            return (
              <Pressable key={tab.key} style={st.toolbarItem} onPress={() => toggleVehicleSheet(tab.key)}>
                <View style={[st.toolbarIconWrap, isActive && st.toolbarIconActive]}>
                  <MaterialIcons name={tab.icon} size={22} color={isActive ? PRIMARY : TEXT_MUTED_COLOR} />
                </View>
                <Text style={[st.toolbarLabel, isActive && st.toolbarLabelActive]}>{tab.label}</Text>
              </Pressable>
            )
          })}
        </View>}
      </View>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // MAIN
  // ════════════════════════════════════════════════════════════════

  if (!integrationEnabled && !loading) {
    return (
      <View style={st.screen}>
        <Header title={i18n.t('TRACKING')} loggedIn reload />
        <View style={st.disabledContent}>
          <MaterialIcons name="gps-off" size={56} color={TEXT_MUTED_COLOR} />
          <Text style={st.disabledTitle}>Fleet Tracking Disabled</Text>
          <Text style={st.disabledSubtitle}>Configure Traccar integration in settings to enable GPS tracking</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={st.fullScreen}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
      {loading ? (
        <View style={st.loadingScreen}><Indicator /></View>
      ) : view === 'fleet' ? (
        renderFleetView()
      ) : (
        renderVehicleView()
      )}
      {renderGeoModal()}
    </View>
  )
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  fullScreen: { flex: 1, backgroundColor: BG },
  loadingScreen: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  disabledContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  disabledTitle: { color: TEXT_PRIMARY_COLOR, fontSize: 18, fontWeight: '700', marginTop: 16 },
  disabledSubtitle: { color: TEXT_SECONDARY_COLOR, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // ── Fleet overlay ──
  fleetOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  healthBarTrack: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 2 },
  healthPct: { fontSize: 11, fontWeight: '800', color: TEXT_PRIMARY_COLOR, minWidth: 30, textAlign: 'right' },
  fleetStatusBar: { flexDirection: 'row', justifyContent: 'space-between' },
  fleetStatusItem: { alignItems: 'center', flex: 1, paddingVertical: 2 },
  fleetStatusValue: { fontSize: 16, fontWeight: '800' },
  fleetStatusLabel: { fontSize: 8, color: TEXT_MUTED_COLOR, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 },

  // ── Bottom sheet ──
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHandleArea: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
  sheetTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY_COLOR, marginTop: 4 },
  sheetHeader: { paddingHorizontal: 16 },

  // ── Search ──
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 12, paddingHorizontal: 12, height: 40, marginBottom: 8 },
  searchInput: { flex: 1, color: TEXT_PRIMARY_COLOR, fontSize: 14, marginStart: 8, padding: 0, textAlign: 'left' },

  // ── Filter chips ──
  filterChipsRow: { gap: 6, paddingBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: BG, gap: 4 },
  filterChipActive: { backgroundColor: PRIMARY },
  filterChipText: { fontSize: 11, color: TEXT_SECONDARY_COLOR, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  filterChipCount: { fontSize: 10, color: TEXT_MUTED_COLOR, fontWeight: '700' },
  filterChipCountActive: { color: 'rgba(255,255,255,0.8)' },

  // ── Vehicle list ──
  vehicleList: { paddingHorizontal: 16, paddingBottom: 20 },
  vehicleListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: SURFACE, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER_COLOR },
  vehicleListLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vehicleIconCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginEnd: 10 },
  vehicleListInfo: { flex: 1 },
  vehicleListName: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY_COLOR },
  vehicleListMeta: { fontSize: 11, color: TEXT_SECONDARY_COLOR, marginTop: 1 },
  microRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  microItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  microText: { fontSize: 9, fontWeight: '600', color: TEXT_MUTED_COLOR },
  vehicleListRight: { alignItems: 'flex-end', marginStart: 8 },
  vehicleStatusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  vehicleStatusDot: { width: 6, height: 6, borderRadius: 3 },
  vehicleStatusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  vehicleListAge: { fontSize: 10, color: TEXT_MUTED_COLOR, marginTop: 3 },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: TEXT_MUTED_COLOR, fontSize: 14, marginTop: 10 },

  // ── Vehicle info bar ──
  vehicleInfoBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 10,
    gap: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  vehicleInfoContent: { flex: 1 },
  vehicleInfoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleInfoName: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY_COLOR, flex: 1, marginEnd: 8 },
  vehicleInfoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 5 },
  vehicleInfoBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  vehicleInfoBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  vehicleInfoBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5 },
  vehicleInfoPlate: { fontSize: 11, color: TEXT_SECONDARY_COLOR, letterSpacing: 0.5 },
  vehicleInfoDot: { color: TEXT_MUTED_COLOR, fontSize: 8 },
  vehicleInfoSpeed: { fontSize: 11, fontWeight: '700' },
  vehicleInfoAge: { fontSize: 11, color: TEXT_SECONDARY_COLOR },

  // ── Vehicle sheet ──
  vehicleSheet: { position: 'absolute', bottom: TOOLBAR_HEIGHT, left: 0, right: 0, backgroundColor: SURFACE, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', elevation: 10 },
  vehicleSheetContent: { flex: 1, paddingTop: 8 },
  vehicleSheetHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 8 },
  vehicleSheetTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY_COLOR, paddingHorizontal: 16, marginBottom: 10 },

  // ── Toolbar ──
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TOOLBAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    elevation: 12,
  },
  toolbarItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  toolbarIconWrap: { width: 36, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  toolbarIconActive: { backgroundColor: PRIMARY_LIGHT },
  toolbarLabel: { fontSize: 9, color: TEXT_MUTED_COLOR, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  toolbarLabelActive: { color: PRIMARY },

  // ── Tab scroll ──
  tabScroll: { flex: 1, paddingHorizontal: 16 },

  // ── Connection bar (Softrasys-style) ──
  connectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 6 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connLabel: { fontSize: 12, fontWeight: '700' },
  connSpacer: { flex: 1 },
  connMode: { fontSize: 10, color: TEXT_SECONDARY_COLOR, fontWeight: '600' },
  connSat: { fontSize: 10, fontWeight: '700', marginStart: 8 },

  // ── Metrics grid ──
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metricBoxLg: { width: (SCREEN_WIDTH - 56) / 2, backgroundColor: SURFACE, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER_COLOR },
  metricValLg: { fontSize: 24, fontWeight: '900', color: TEXT_PRIMARY_COLOR, marginTop: 4 },
  metricUnitLg: { fontSize: 10, color: TEXT_MUTED_COLOR, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
  batteryTrack: { width: '100%', height: 3, backgroundColor: BORDER_COLOR, borderRadius: 2, marginTop: 6 },
  batteryFill: { height: '100%', borderRadius: 2 },

  // ── Details ──
  detailCard: { backgroundColor: BG, borderRadius: 14, padding: 14, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 12, color: TEXT_SECONDARY_COLOR, width: 90 },
  detailValue: { fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY_COLOR, flex: 1, textAlign: 'right' },
  detailDivider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 10 },

  // ── Address ──
  addressBar: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 12, gap: 8, marginBottom: 10 },
  addressText: { fontSize: 12, color: TEXT_PRIMARY_COLOR, flex: 1, lineHeight: 18 },

  // ── Buttons ──
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: PRIMARY, borderRadius: 12, paddingVertical: 10, marginBottom: 10, flex: 1 },
  actionBtnOutlineText: { color: PRIMARY, fontSize: 13, fontWeight: '700' },
  actionBtnDisabled: { opacity: 0.4 },

  // ── Warning ──
  warnBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3cd', borderRadius: 10, padding: 12, marginTop: 6, marginBottom: 12 },
  warnText: { fontSize: 12, color: '#856404', flex: 1 },

  // ── Date pickers ──
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 9, color: TEXT_MUTED_COLOR, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
  dateTimeRow: { flexDirection: 'row', gap: 6 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, gap: 6 },
  dateText: { fontSize: 12, color: TEXT_PRIMARY_COLOR },

  // ── Route stats ──

  // ── Trips ──
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY_COLOR, marginBottom: 10 },
  tripCard: { backgroundColor: BG, borderRadius: 12, padding: 12, marginBottom: 8 },
  tripPoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripDot: { width: 8, height: 8, borderRadius: 4 },
  tripLine: { width: 2, height: 14, backgroundColor: BORDER_COLOR, marginStart: 3, marginVertical: 2 },
  tripAddr: { fontSize: 12, color: TEXT_PRIMARY_COLOR, flex: 1 },
  tripFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER_COLOR },
  tripFooterText: { fontSize: 11, color: TEXT_SECONDARY_COLOR },
  tripFooterDot: { color: TEXT_MUTED_COLOR, fontSize: 8 },

  // ── Zones ──
  zoneActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  zoneCount: { fontSize: 11, color: TEXT_SECONDARY_COLOR, marginBottom: 10 },
  zoneCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, borderRadius: 12, padding: 12, marginBottom: 8 },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  zoneIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY_COLOR },
  zoneType: { fontSize: 10, color: TEXT_SECONDARY_COLOR, marginTop: 2 },
  zoneActions2: { flexDirection: 'row', gap: 4 },
  zoneActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  linkedPill: { backgroundColor: `${GREEN}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  linkedPillText: { fontSize: 9, fontWeight: '700', color: GREEN, letterSpacing: 0.4 },

  // ── Events ──
  eventFilterRow: { gap: 6, paddingBottom: 10 },
  eventChip: { height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  eventChipActive: { backgroundColor: PRIMARY },
  eventChipText: { fontSize: 10, color: TEXT_SECONDARY_COLOR, fontWeight: '600' },
  eventChipTextActive: { color: '#fff' },
  eventItem: { flexDirection: 'row', alignItems: 'flex-start', borderStartWidth: 3, paddingStart: 10, paddingVertical: 8, marginBottom: 2, gap: 8 },
  eventDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY_COLOR },
  eventTime: { fontSize: 10, color: TEXT_MUTED_COLOR, marginTop: 2 },
  eventExtra: { fontSize: 10, color: TEXT_SECONDARY_COLOR, marginTop: 1 },

  // ── Device ──
  deviceCard: { backgroundColor: BG, borderRadius: 14, padding: 16, marginBottom: 12 },
  deviceCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  deviceStatusChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deviceStatusDot: { width: 7, height: 7, borderRadius: 4 },
  deviceStatusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  inputLabel: { fontSize: 9, color: TEXT_MUTED_COLOR, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4, marginTop: 10 },
  textInput: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 13, color: TEXT_PRIMARY_COLOR },
  deviceBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 10 },
  linkBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  unlinkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: RED, borderRadius: 10, paddingVertical: 10 },
  unlinkBtnText: { color: RED, fontSize: 12, fontWeight: '700' },
  cmdList: { gap: 6 },
  cmdItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: BORDER_COLOR },
  cmdIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  cmdText: { fontSize: 13, color: TEXT_PRIMARY_COLOR, fontWeight: '500', flex: 1 },

  // ── Geofence Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: SCREEN_HEIGHT * 0.75 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY_COLOR },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY_COLOR },

  // ── Route hero card ──
  routeHeroCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  routeHeroTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY_COLOR, marginTop: 12 },
  routeHeroDesc: { fontSize: 13, color: TEXT_SECONDARY_COLOR, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // ── Hint ──
  hintText: { color: TEXT_MUTED_COLOR, fontSize: 13, textAlign: 'center', marginTop: 20, marginBottom: 16, lineHeight: 20 },

  // ── Geo draw mode ──
  geoDrawOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  geoDrawBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 12, marginBottom: 12 },
  geoDrawText: { fontSize: 13, color: PRIMARY, fontWeight: '600', flex: 1 },
  geoDrawInfo: { marginBottom: 12 },
  geoDrawCoord: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY_COLOR, textAlign: 'center', marginBottom: 8 },
  geoDrawRadiusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  geoDrawLabel: { fontSize: 13, color: TEXT_SECONDARY_COLOR, fontWeight: '600' },
  geoRadiusBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  geoRadiusValue: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY_COLOR, minWidth: 60, textAlign: 'center' },
  geoDrawActions: { flexDirection: 'row', gap: 10 },
  geoDrawCancelBtn: { flex: 1, borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  geoDrawCancelText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY_COLOR },
  geoDrawConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 12 },
  geoDrawConfirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
})

export default Tracking
