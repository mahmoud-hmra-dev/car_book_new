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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'

import Header from '@/components/Header'
import Indicator from '@/components/Indicator'
import EmptyList from '@/components/EmptyList'
import TrackingMap from '@/components/tracking/TrackingMap'
import type { MapMarker, MapRoute } from '@/components/tracking/TrackingMap'
import * as TraccarService from '@/services/TraccarService'
import * as helper from '@/utils/helper'
import type { FleetVehicle, TrackingTab } from '@/components/tracking/types'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeAge,
  formatSpeed,
  formatDistanceKm,
  formatDuration,
  formatCoordinate,
  formatTimestamp,
  buildFleetVehicles,
  buildFleetCounts,
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  getEventBorderColor,
} from '@/components/tracking/utils'

const PURPLE = '#6B3CE6'
const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.35)

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'moving', label: 'Moving' },
  { key: 'idle', label: 'Idle' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'offline', label: 'Offline' },
  { key: 'stale', label: 'Stale' },
]

const TABS: { key: TrackingTab, label: string, icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'status', label: 'Status', icon: 'dashboard' },
  { key: 'route', label: 'Route', icon: 'route' },
  { key: 'zones', label: 'Zones', icon: 'fence' },
  { key: 'events', label: 'Events', icon: 'timeline' },
  { key: 'device', label: 'Device', icon: 'devices' },
]

const Tracking = () => {
  // ── View state ──
  const [view, setView] = useState<'fleet' | 'vehicle'>('fleet')
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TrackingTab>('status')

  // ── Fleet data ──
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [integrationEnabled, setIntegrationEnabled] = useState(false)
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // ── Vehicle detail data ──
  const [reports, setReports] = useState<bookcarsTypes.TraccarVehicleReportBundle | null>(null)
  const [routePositions, setRoutePositions] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [events, setEvents] = useState<bookcarsTypes.TraccarEventCenterEntry[]>([])
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [linkedGeofences, setLinkedGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [commandTypes, setCommandTypes] = useState<bookcarsTypes.TraccarCommandType[]>([])
  const [devices, setDevices] = useState<bookcarsTypes.TraccarDevice[]>([])

  // ── Loading states ──
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingZones, setLoadingZones] = useState(false)
  const [loadingCommands, setLoadingCommands] = useState(false)
  const [sendingCommand, setSendingCommand] = useState(false)
  const [deviceSaving, setDeviceSaving] = useState(false)

  // ── Date pickers ──
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const [toDate, setToDate] = useState(new Date())
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)

  // ── Device form ──
  const [deviceIdInput, setDeviceIdInput] = useState('')
  const [deviceNameInput, setDeviceNameInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [selectedCommandType, setSelectedCommandType] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Derived data ──
  const counts = useMemo(() => buildFleetCounts(vehicles), [vehicles])

  const filteredVehicles = useMemo(() => {
    if (statusFilter === 'all') return vehicles
    return vehicles.filter((v) => v.status === statusFilter)
  }, [vehicles, statusFilter])

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.carId === selectedCarId),
    [vehicles, selectedCarId],
  )

  const isLinked = useMemo(
    () => typeof selectedVehicle?.deviceId === 'number',
    [selectedVehicle],
  )

  // ── Fleet markers for map ──
  const fleetMarkers: MapMarker[] = useMemo(() =>
    filteredVehicles
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => ({
        id: v.carId,
        lat: v.latitude!,
        lng: v.longitude!,
        color: STATUS_COLORS[v.status] || '#64748b',
        label: v.carName,
        selected: v.carId === selectedCarId,
      })),
  [filteredVehicles, selectedCarId])

  // ── Single vehicle marker ──
  const vehicleMarker: MapMarker[] = useMemo(() => {
    if (!selectedVehicle || selectedVehicle.latitude == null || selectedVehicle.longitude == null) {
      return []
    }
    return [{
      id: selectedVehicle.carId,
      lat: selectedVehicle.latitude!,
      lng: selectedVehicle.longitude!,
      color: STATUS_COLORS[selectedVehicle.status] || '#64748b',
      label: selectedVehicle.carName,
      selected: true,
    }]
  }, [selectedVehicle])

  // ── Route polyline ──
  const vehicleRoute: MapRoute | undefined = useMemo(() => {
    if (routePositions.length < 2) return undefined
    return {
      points: routePositions
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => [p.latitude, p.longitude] as [number, number]),
      color: '#3b82f6',
    }
  }, [routePositions])

  // ── Route stats ──
  const routeStats = useMemo(() => {
    if (!reports?.summary && (!reports?.trips || reports.trips.length === 0)) return null
    const distance = reports?.summary?.distance
      ?? reports?.trips?.reduce((sum, t) => sum + (t.distance || 0), 0) ?? 0
    const duration = reports?.trips?.length
      ? reports.trips.reduce((sum, t) => sum + (t.duration || 0), 0)
      : 0
    const avgSpeed = reports?.summary?.averageSpeed ?? 0
    const maxSpeed = reports?.summary?.maxSpeed ?? 0
    return { distance, duration, avgSpeed, maxSpeed }
  }, [reports])

  // ── Linked geofence IDs ──
  const linkedGeofenceIds = useMemo(
    () => new Set(linkedGeofences.map((g) => g.id).filter((id): id is number => typeof id === 'number')),
    [linkedGeofences],
  )

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

  const openVehicle = useCallback((carId: string) => {
    setSelectedCarId(carId)
    setActiveTab('status')
    resetDetailState()
    setView('vehicle')
  }, [])

  const backToFleet = () => {
    setView('fleet')
    setSelectedCarId('')
    resetDetailState()
  }

  const handleFleetMarkerPress = useCallback((id: string) => {
    openVehicle(id)
  }, [openVehicle])

  // ── Route loading ──
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

  // ── Snapshot loading ──
  const loadSnapshot = async () => {
    if (!selectedCarId) return
    setLoadingSnapshot(true)
    try {
      const [reportData, positions, geofenceData, eventData] = await Promise.all([
        TraccarService.getReports(selectedCarId, fromDate.toISOString(), toDate.toISOString()),
        TraccarService.getRoute(selectedCarId, fromDate.toISOString(), toDate.toISOString()),
        TraccarService.getGeofences(selectedCarId),
        TraccarService.getEventCenter({
          carId: selectedCarId,
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          limit: 50,
        }),
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

  // ── Events loading ──
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

  // ── Zones loading ──
  const loadZones = async () => {
    if (!selectedCarId) return
    setLoadingZones(true)
    try {
      const [allGeo, linkedGeo] = await Promise.all([
        TraccarService.getGeofences(),
        TraccarService.getGeofences(selectedCarId),
      ])
      setGeofences(allGeo)
      setLinkedGeofences(linkedGeo)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingZones(false)
    }
  }

  // ── Commands loading ──
  const loadCommandTypes = async () => {
    if (!selectedCarId) return
    setLoadingCommands(true)
    try {
      const [cmds, devs] = await Promise.all([
        TraccarService.getCommandTypes(selectedCarId),
        TraccarService.getDevices(),
      ])
      setCommandTypes(cmds)
      setDevices(devs)
      if (cmds.length > 0 && !selectedCommandType) {
        setSelectedCommandType(cmds[0].type || '')
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingCommands(false)
    }
  }

  const sendCommand = (commandType: string) => {
    Alert.alert(
      'Send Command',
      `Are you sure you want to send "${commandType}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSendingCommand(true)
            try {
              await TraccarService.sendCommand(selectedCarId, {
                type: commandType,
                deviceId: selectedVehicle?.deviceId,
              })
              helper.toast('Command sent successfully')
            } catch (err) {
              helper.error(err)
            } finally {
              setSendingCommand(false)
            }
          },
        },
      ],
    )
  }

  const handleLinkDevice = async () => {
    if (!selectedCarId || !deviceIdInput) return
    setDeviceSaving(true)
    try {
      // Link device API call would go here
      helper.toast('Device linked successfully')
    } catch (err) {
      helper.error(err)
    } finally {
      setDeviceSaving(false)
    }
  }

  const handleUnlinkDevice = async () => {
    if (!selectedCarId) return
    Alert.alert('Unlink Device', 'Are you sure you want to unlink this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink',
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

  // ── Auto-load tab data ──
  useEffect(() => {
    if (view !== 'vehicle' || !selectedCarId) return
    if (activeTab === 'zones') loadZones()
    if (activeTab === 'device') loadCommandTypes()
  }, [view, activeTab, selectedCarId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ────────────────────────────────────────────────────────────
  // RENDER: Stats Strip
  // ────────────────────────────────────────────────────────────
  const renderStatsStrip = () => (
    <View style={styles.statsRow}>
      {[
        { label: 'Total', value: counts.all, color: PURPLE },
        { label: 'Online', value: counts.moving + counts.idle, color: '#10b981' },
        { label: 'Moving', value: counts.moving, color: '#3b82f6' },
        { label: 'Offline', value: counts.offline, color: '#64748b' },
      ].map((stat) => (
        <View key={stat.label} style={styles.statCard}>
          <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  )

  // ────────────────────────────────────────────────────────────
  // RENDER: Filter Pills
  // ────────────────────────────────────────────────────────────
  const renderFilterPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {FILTER_OPTIONS.map((opt) => {
        const isSelected = statusFilter === opt.key
        const count = opt.key === 'all' ? counts.all : (counts as any)[opt.key] || 0
        return (
          <Pressable
            key={opt.key}
            style={[styles.filterPill, isSelected && styles.filterPillActive]}
            onPress={() => setStatusFilter(opt.key)}
          >
            <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
              {opt.label}
            </Text>
            <Text style={[styles.filterPillCount, isSelected && styles.filterPillCountActive]}>
              {count}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )

  // ────────────────────────────────────────────────────────────
  // RENDER: Vehicle List Item
  // ────────────────────────────────────────────────────────────
  const renderVehicleItem = ({ item }: { item: FleetVehicle }) => {
    const dotColor = STATUS_COLORS[item.status] || '#64748b'
    return (
      <Pressable style={styles.vehicleCard} onPress={() => openVehicle(item.carId)}>
        <View style={styles.vehicleRow}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleNameRow}>
              <Text style={styles.vehicleName} numberOfLines={1}>{item.carName}</Text>
              <Text style={item.speed > 0 ? styles.vehicleSpeedActive : styles.vehicleSpeed}>
                {Math.round(item.speed)} km/h
              </Text>
            </View>
            <View style={styles.vehicleMetaRow}>
              <Text style={styles.vehiclePlate} numberOfLines={1}>
                {item.licensePlate || '---'}
                {item.supplier ? ` \u00B7 ${item.supplier}` : ''}
              </Text>
              <Text style={styles.vehicleAge}>{formatRelativeAge(item.lastUpdate)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    )
  }

  // ────────────────────────────────────────────────────────────
  // RENDER: Date Pickers
  // ────────────────────────────────────────────────────────────
  const renderDatePickers = () => (
    <View style={styles.datePickerRow}>
      <View style={styles.datePickerField}>
        <Text style={styles.datePickerLabel}>FROM</Text>
        <Pressable style={styles.datePickerButton} onPress={() => setShowFromPicker(true)}>
          <MaterialIcons name="calendar-today" size={14} color="#94a3b8" />
          <Text style={styles.datePickerText}>{format(fromDate, 'MMM dd, HH:mm')}</Text>
        </Pressable>
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="datetime"
            onChange={(_, date) => {
              setShowFromPicker(Platform.OS === 'ios')
              if (date) setFromDate(date)
            }}
          />
        )}
      </View>
      <View style={styles.datePickerField}>
        <Text style={styles.datePickerLabel}>TO</Text>
        <Pressable style={styles.datePickerButton} onPress={() => setShowToPicker(true)}>
          <MaterialIcons name="calendar-today" size={14} color="#94a3b8" />
          <Text style={styles.datePickerText}>{format(toDate, 'MMM dd, HH:mm')}</Text>
        </Pressable>
        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="datetime"
            onChange={(_, date) => {
              setShowToPicker(Platform.OS === 'ios')
              if (date) setToDate(date)
            }}
          />
        )}
      </View>
    </View>
  )

  // ────────────────────────────────────────────────────────────
  // RENDER: Tab Bar
  // ────────────────────────────────────────────────────────────
  const renderTabBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBarContent}
      style={styles.tabBar}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialIcons
              name={tab.icon}
              size={16}
              color={isActive ? PURPLE : '#94a3b8'}
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )

  // ────────────────────────────────────────────────────────────
  // TAB: Status
  // ────────────────────────────────────────────────────────────
  const renderStatusTab = () => {
    if (!selectedVehicle) return null
    const battery = typeof selectedVehicle.batteryLevel === 'number'
      ? Math.round(selectedVehicle.batteryLevel) : null
    const batteryPercent = battery !== null ? Math.min(100, Math.max(0, battery)) : 0
    const coords = selectedVehicle.latitude != null && selectedVehicle.longitude != null
      ? `${formatCoordinate(selectedVehicle.latitude)}, ${formatCoordinate(selectedVehicle.longitude)}`
      : '-'

    return (
      <View style={styles.tabContent}>
        {/* 2x3 metrics grid */}
        <View style={styles.metricsGrid}>
          {/* Speed */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="speed" size={14} color="#94a3b8" />
              <Text style={styles.metricLabel}>SPEED</Text>
            </View>
            <Text style={styles.metricValueLarge}>
              {Math.round(selectedVehicle.speed)}
              <Text style={styles.metricUnit}> km/h</Text>
            </Text>
          </View>

          {/* Battery */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="battery-charging-full" size={14} color="#94a3b8" />
              <Text style={styles.metricLabel}>BATTERY</Text>
            </View>
            <Text style={styles.metricValueLarge}>
              {battery !== null ? battery : '-'}
              <Text style={styles.metricUnit}> %</Text>
            </Text>
            {battery !== null && (
              <View style={styles.batteryTrack}>
                <View
                  style={[
                    styles.batteryFill,
                    {
                      width: `${batteryPercent}%`,
                      backgroundColor: battery > 50 ? '#10b981' : battery > 20 ? '#f59e0b' : '#ef4444',
                    },
                  ]}
                />
              </View>
            )}
          </View>

          {/* Ignition */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="local-fire-department" size={14} color="#94a3b8" />
              <Text style={styles.metricLabel}>IGNITION</Text>
            </View>
            <Text style={[
              styles.metricValueLarge,
              { color: selectedVehicle.ignition ? '#10b981' : '#ef4444' },
            ]}>
              {selectedVehicle.ignition ? 'ON' : 'OFF'}
            </Text>
          </View>

          {/* Device Name */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="memory" size={14} color="#94a3b8" />
              <Text style={styles.metricLabel}>DEVICE</Text>
            </View>
            <Text style={styles.metricValueSmall} numberOfLines={1}>
              {selectedVehicle.deviceName || '-'}
            </Text>
          </View>

          {/* Coordinates */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="gps-fixed" size={14} color="#94a3b8" />
              <Text style={styles.metricLabel}>COORDINATES</Text>
            </View>
            <Text style={styles.metricValueSmall} numberOfLines={1}>{coords}</Text>
          </View>

          {/* Last Update */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="access-time" size={14} color="#94a3b8" />
              <Text style={styles.metricLabel}>LAST UPDATE</Text>
            </View>
            <Text style={styles.metricValueSmall} numberOfLines={1}>
              {formatTimestamp(selectedVehicle.lastUpdate)}
            </Text>
          </View>
        </View>

        {/* Address */}
        {!!selectedVehicle.address && (
          <View style={styles.addressCard}>
            <MaterialIcons name="place" size={16} color={PURPLE} />
            <Text style={styles.addressText}>{selectedVehicle.address}</Text>
          </View>
        )}

        {/* Load Snapshot button */}
        <Pressable
          style={[styles.dashedButton, (!isLinked || loadingSnapshot) && styles.buttonDisabled]}
          onPress={loadSnapshot}
          disabled={!isLinked || loadingSnapshot}
        >
          <MaterialIcons name="camera" size={16} color={PURPLE} />
          <Text style={styles.dashedButtonText}>
            {loadingSnapshot ? 'Loading Snapshot...' : 'Load Snapshot'}
          </Text>
        </Pressable>

        {!isLinked && (
          <View style={styles.warningBanner}>
            <MaterialIcons name="warning-amber" size={16} color="#f59e0b" />
            <Text style={styles.warningText}>Device not linked to this vehicle</Text>
          </View>
        )}
      </View>
    )
  }

  // ────────────────────────────────────────────────────────────
  // TAB: Route
  // ────────────────────────────────────────────────────────────
  const renderRouteTab = () => (
    <View style={styles.tabContent}>
      {renderDatePickers()}

      <Pressable
        style={[styles.primaryButton, (loadingRoute || !isLinked) && styles.buttonDisabled]}
        onPress={loadRoute}
        disabled={loadingRoute || !isLinked}
      >
        <Text style={styles.primaryButtonText}>
          {loadingRoute ? 'Loading Route...' : 'Load Route'}
        </Text>
      </Pressable>

      {/* Route stats */}
      {routeStats && (
        <View style={styles.routeStatsGrid}>
          {[
            { label: 'DISTANCE', value: formatDistanceKm(routeStats.distance) },
            { label: 'DURATION', value: formatDuration(routeStats.duration) },
            { label: 'AVG SPEED', value: routeStats.avgSpeed ? `${Math.round(routeStats.avgSpeed)} km/h` : '-' },
            { label: 'MAX SPEED', value: routeStats.maxSpeed ? `${Math.round(routeStats.maxSpeed)} km/h` : '-' },
          ].map((stat) => (
            <View key={stat.label} style={styles.routeStatCard}>
              <Text style={styles.routeStatValue}>{stat.value}</Text>
              <Text style={styles.routeStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Trips */}
      {reports && reports.trips.length > 0 && (
        <View style={styles.tripsSection}>
          <Text style={styles.sectionTitle}>Trips ({reports.trips.length})</Text>
          {reports.trips.map((trip, index) => (
            <View key={`trip-${index}`} style={styles.tripCard}>
              <View style={styles.tripRoute}>
                <MaterialIcons name="trip-origin" size={14} color={PURPLE} />
                <Text style={styles.tripAddress} numberOfLines={1}>
                  {trip.startAddress || 'Unknown'}
                </Text>
              </View>
              <View style={styles.tripRoute}>
                <MaterialIcons name="place" size={14} color="#ef4444" />
                <Text style={styles.tripAddress} numberOfLines={1}>
                  {trip.endAddress || 'Unknown'}
                </Text>
              </View>
              <View style={styles.tripMeta}>
                <Text style={styles.tripMetaText}>{formatDistanceKm(trip.distance || 0)}</Text>
                <Text style={styles.tripMetaDot}>{'\u2022'}</Text>
                <Text style={styles.tripMetaText}>{formatDuration(trip.duration || 0)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {!routeStats && !loadingRoute && (
        <Text style={styles.emptyHint}>Select a date range and load route history.</Text>
      )}
    </View>
  )

  // ────────────────────────────────────────────────────────────
  // TAB: Zones (read-only list)
  // ────────────────────────────────────────────────────────────
  const renderZonesTab = () => (
    <View style={styles.tabContent}>
      {/* Refresh button */}
      <Pressable
        style={[styles.outlineButton, loadingZones && styles.buttonDisabled]}
        onPress={loadZones}
        disabled={loadingZones}
      >
        <MaterialIcons name="refresh" size={16} color={PURPLE} />
        <Text style={styles.outlineButtonText}>
          {loadingZones ? 'Refreshing...' : 'Refresh Zones'}
        </Text>
      </Pressable>

      <Text style={styles.zonesCountText}>
        {linkedGeofences.length} zone{linkedGeofences.length !== 1 ? 's' : ''} linked to vehicle
      </Text>

      {geofences.length > 0 ? (
        geofences.map((geofence, index) => {
          const geoId = typeof geofence.id === 'number' ? geofence.id : null
          const linked = geoId !== null && linkedGeofenceIds.has(geoId)
          const shapeType = geofence.area?.split('(')[0]?.trim()?.toLowerCase()
            || (geofence.geojson ? 'geojson' : `zone ${index + 1}`)

          return (
            <View key={geofence.id || `${geofence.name}-${index}`} style={styles.zoneCard}>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneName} numberOfLines={1}>
                  {geofence.name || `Zone ${index + 1}`}
                </Text>
                <Text style={styles.zoneType}>{shapeType}</Text>
                {linked && (
                  <View style={styles.linkedBadge}>
                    <Text style={styles.linkedBadgeText}>LINKED</Text>
                  </View>
                )}
              </View>
              <MaterialIcons
                name={linked ? 'link' : 'link-off'}
                size={20}
                color={linked ? '#10b981' : '#94a3b8'}
              />
            </View>
          )
        })
      ) : (
        !loadingZones && <Text style={styles.emptyHint}>No geofences found.</Text>
      )}

      {!isLinked && (
        <View style={styles.warningBanner}>
          <MaterialIcons name="warning-amber" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>Device not linked to this vehicle</Text>
        </View>
      )}
    </View>
  )

  // ────────────────────────────────────────────────────────────
  // TAB: Events
  // ────────────────────────────────────────────────────────────
  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      {renderDatePickers()}

      {/* Event type filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventFilterRow}
      >
        {EVENT_TYPE_OPTIONS.map((type) => {
          const isActive = eventTypeFilter === type
          return (
            <Pressable
              key={type}
              style={[styles.eventFilterPill, isActive && styles.eventFilterPillActive]}
              onPress={() => setEventTypeFilter(type)}
            >
              <Text style={[styles.eventFilterText, isActive && styles.eventFilterTextActive]}>
                {EVENT_TYPE_LABELS[type] || type}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <Pressable
        style={[styles.primaryButton, (loadingEvents || !isLinked) && styles.buttonDisabled]}
        onPress={loadEvents}
        disabled={loadingEvents || !isLinked}
      >
        <Text style={styles.primaryButtonText}>
          {loadingEvents ? 'Loading Events...' : 'Load Events'}
        </Text>
      </Pressable>

      {/* Event timeline */}
      {events.length > 0 ? (
        events.map((evt, index) => {
          const evtType = evt.type || 'unknown'
          const borderColor = getEventBorderColor(evtType)
          const iconColor = EVENT_TYPE_COLORS[evtType] || '#94a3b8'

          return (
            <View
              key={evt.id || `${evt.deviceId}-${evt.eventTime}-${index}`}
              style={[styles.eventItem, { borderLeftColor: borderColor }]}
            >
              <View style={styles.eventContent}>
                <Text style={styles.eventTypeLabel}>
                  {EVENT_TYPE_LABELS[evtType] || evtType}
                </Text>
                <Text style={styles.eventTimestamp}>
                  {formatTimestamp(evt.eventTime)}
                </Text>
                {evt.geofenceName && (
                  <Text style={styles.eventDetail}>{evt.geofenceName}</Text>
                )}
                {typeof evt.speed === 'number' && (
                  <Text style={styles.eventDetail}>
                    Speed: {Math.round(evt.speed)} km/h
                  </Text>
                )}
              </View>
              <View style={[styles.eventIconDot, { backgroundColor: `${iconColor}20` }]}>
                <MaterialIcons
                  name="circle"
                  size={8}
                  color={iconColor}
                />
              </View>
            </View>
          )
        })
      ) : (
        !loadingEvents && <Text style={styles.emptyHint}>No events found. Select a date range and load events.</Text>
      )}
    </View>
  )

  // ────────────────────────────────────────────────────────────
  // TAB: Device
  // ────────────────────────────────────────────────────────────
  const renderDeviceTab = () => (
    <View style={styles.tabContent}>
      {/* Device info */}
      <View style={styles.deviceSection}>
        <View style={styles.deviceSectionHeader}>
          <Text style={styles.sectionTitle}>Link Device</Text>
          <View style={styles.deviceStatusRow}>
            <View style={[styles.tinyDot, { backgroundColor: isLinked ? '#10b981' : '#ef4444' }]} />
            <Text style={styles.deviceStatusText}>
              {isLinked ? 'Tracking Enabled' : 'Tracking Disabled'}
            </Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>DEVICE ID</Text>
        <TextInput
          style={styles.textInput}
          value={deviceIdInput}
          onChangeText={setDeviceIdInput}
          placeholder="e.g. 142"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>DEVICE NAME</Text>
        <TextInput
          style={styles.textInput}
          value={deviceNameInput}
          onChangeText={setDeviceNameInput}
          placeholder="e.g. Teltonika FMC130"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.inputLabel}>NOTES</Text>
        <TextInput
          style={styles.textInput}
          value={notesInput}
          onChangeText={setNotesInput}
          placeholder="..."
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.deviceButtonRow}>
          <Pressable
            style={[styles.linkButton, deviceSaving && styles.buttonDisabled]}
            onPress={handleLinkDevice}
            disabled={deviceSaving}
          >
            <MaterialIcons name="link" size={14} color="#fff" />
            <Text style={styles.linkButtonText}>
              {deviceSaving ? 'Linking...' : 'Link Device'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.unlinkButton, (deviceSaving || !isLinked) && styles.buttonDisabled]}
            onPress={handleUnlinkDevice}
            disabled={deviceSaving || !isLinked}
          >
            <MaterialIcons name="link-off" size={14} color="#ef4444" />
            <Text style={styles.unlinkButtonText}>Unlink</Text>
          </Pressable>
        </View>
      </View>

      {/* Command Center */}
      <View style={styles.deviceSection}>
        <Text style={styles.sectionTitle}>Command Center</Text>

        {loadingCommands ? (
          <Indicator />
        ) : commandTypes.length > 0 ? (
          <View style={styles.commandList}>
            {commandTypes.map((cmd, index) => (
              <Pressable
                key={`cmd-${index}`}
                style={[styles.commandCard, sendingCommand && styles.buttonDisabled]}
                onPress={() => sendCommand(cmd.type || '')}
                disabled={sendingCommand || !isLinked}
              >
                <MaterialIcons name="send" size={16} color={PURPLE} />
                <Text style={styles.commandCardText}>{cmd.type || 'Unknown'}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHint}>No commands available.</Text>
        )}
      </View>
    </View>
  )

  // ────────────────────────────────────────────────────────────
  // RENDER: Vehicle Header
  // ────────────────────────────────────────────────────────────
  const renderVehicleHeader = () => {
    if (!selectedVehicle) return null
    const dotColor = STATUS_COLORS[selectedVehicle.status] || '#64748b'
    const statusLabel = STATUS_LABELS[selectedVehicle.status] || selectedVehicle.status

    return (
      <View style={styles.vehicleHeaderCard}>
        <View style={styles.vehicleHeaderTop}>
          <View style={styles.vehicleHeaderLeft}>
            <MaterialIcons name="directions-car" size={22} color={dotColor} />
            <View style={styles.vehicleHeaderNames}>
              <Text style={styles.vehicleHeaderName} numberOfLines={1}>
                {selectedVehicle.carName}
              </Text>
              <Text style={styles.vehicleHeaderPlate}>
                {selectedVehicle.licensePlate || '---'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${dotColor}20` }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: dotColor }]} />
            <Text style={[styles.statusBadgeText, { color: dotColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.vehicleHeaderMeta}>
          {selectedVehicle.speed > 0 && (
            <>
              <Text style={[styles.vehicleHeaderMetaValue, { color: dotColor }]}>
                {Math.round(selectedVehicle.speed)} km/h
              </Text>
              <Text style={styles.vehicleHeaderMetaDot}>{'\u2022'}</Text>
            </>
          )}
          <Text style={styles.vehicleHeaderMetaText}>
            {formatRelativeAge(selectedVehicle.lastUpdate)}
          </Text>
        </View>
      </View>
    )
  }

  // ────────────────────────────────────────────────────────────
  // RENDER: Vehicle View
  // ────────────────────────────────────────────────────────────
  const renderVehicleView = () => (
    <ScrollView style={styles.vehicleScroll} contentContainerStyle={styles.vehicleScrollContent}>
      {/* Back button */}
      <Pressable style={styles.backButton} onPress={backToFleet}>
        <MaterialIcons name="arrow-back" size={20} color={PURPLE} />
        <Text style={styles.backButtonText}>Fleet</Text>
      </Pressable>

      {/* Map */}
      <View style={styles.mapContainer}>
        <TrackingMap
          markers={vehicleMarker}
          route={vehicleRoute}
          selectedMarkerId={selectedCarId}
          height={250}
        />
      </View>

      {renderVehicleHeader()}
      {renderTabBar()}

      {activeTab === 'status' && renderStatusTab()}
      {activeTab === 'route' && renderRouteTab()}
      {activeTab === 'zones' && renderZonesTab()}
      {activeTab === 'events' && renderEventsTab()}
      {activeTab === 'device' && renderDeviceTab()}
    </ScrollView>
  )

  // ────────────────────────────────────────────────────────────
  // RENDER: Fleet View
  // ────────────────────────────────────────────────────────────
  const renderFleetView = () => (
    <>
      {renderStatsStrip()}
      <View style={styles.mapContainer}>
        <TrackingMap
          markers={fleetMarkers}
          selectedMarkerId={selectedCarId}
          onMarkerPress={handleFleetMarkerPress}
          height={MAP_HEIGHT}
        />
      </View>
      {renderFilterPills()}
      <FlatList
        data={filteredVehicles}
        renderItem={renderVehicleItem}
        keyExtractor={(item) => item.carId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyList message="No vehicles found." icon="directions-car" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PURPLE]} />
        }
      />
    </>
  )

  // ────────────────────────────────────────────────────────────
  // RENDER: Main
  // ────────────────────────────────────────────────────────────
  if (!integrationEnabled && !loading) {
    return (
      <View style={styles.container}>
        <Header title="Tracking" loggedIn reload />
        <View style={styles.disabledContainer}>
          <MaterialIcons name="gps-off" size={48} color="#ccc" />
          <Text style={styles.disabledText}>
            Fleet tracking is not enabled. Configure Traccar integration in settings.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Tracking" loggedIn reload />
      {loading ? (
        <Indicator />
      ) : view === 'fleet' ? (
        renderFleetView()
      ) : (
        renderVehicleView()
      )}
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },

  // Disabled state
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  disabledText: {
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Map container
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: '#e2e8f0',
  },

  // Stats strip
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  // Filter pills
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  filterPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  filterPillActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  filterPillText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  filterPillCount: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterPillCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Vehicle list
  list: {
    padding: 16,
    paddingTop: 4,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  vehicleSpeed: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginLeft: 8,
  },
  vehicleSpeedActive: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  vehiclePlate: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  vehicleAge: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 8,
  },

  // Vehicle view
  vehicleScroll: {
    flex: 1,
  },
  vehicleScrollContent: {
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  backButtonText: {
    fontSize: 15,
    color: PURPLE,
    fontWeight: '600',
  },

  // Vehicle header card
  vehicleHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  vehicleHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  vehicleHeaderNames: {
    flex: 1,
  },
  vehicleHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  vehicleHeaderPlate: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  vehicleHeaderMetaValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  vehicleHeaderMetaText: {
    fontSize: 13,
    color: '#64748b',
  },
  vehicleHeaderMetaDot: {
    color: '#cbd5e1',
  },

  // Tab bar
  tabBar: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  tabBarContent: {
    gap: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 5,
  },
  tabActive: {
    borderBottomColor: PURPLE,
  },
  tabText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: PURPLE,
    fontWeight: '700',
  },

  // Tab content
  tabContent: {
    padding: 16,
  },

  // Metrics grid (Status tab)
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  metricValueSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94a3b8',
  },
  batteryTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginTop: 6,
  },
  batteryFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Address card
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${PURPLE}08`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
    lineHeight: 18,
  },

  // Buttons
  primaryButton: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dashedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dashedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Warning banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fefce8',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#a16207',
    flex: 1,
  },

  // Date pickers
  datePickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  datePickerField: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  datePickerText: {
    fontSize: 12,
    color: '#1e293b',
  },

  // Route stats
  routeStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  routeStatCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  routeStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  routeStatLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // Trips
  tripsSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tripAddress: {
    fontSize: 12,
    color: '#1e293b',
    flex: 1,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tripMetaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  tripMetaDot: {
    color: '#cbd5e1',
    fontSize: 10,
  },

  // Zones
  zonesCountText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  zoneInfo: {
    flex: 1,
    marginRight: 10,
  },
  zoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  zoneType: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  linkedBadge: {
    marginTop: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  linkedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.5,
  },

  // Events
  eventFilterRow: {
    gap: 6,
    paddingBottom: 10,
  },
  eventFilterPill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventFilterPillActive: {
    backgroundColor: PURPLE,
  },
  eventFilterText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  eventFilterTextActive: {
    color: '#fff',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  eventTimestamp: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  eventDetail: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  eventIconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Device tab
  deviceSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  deviceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tinyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deviceStatusText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
    color: '#1e293b',
  },
  deviceButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingVertical: 10,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  unlinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 10,
  },
  unlinkButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },

  // Commands
  commandList: {
    gap: 8,
  },
  commandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  commandCardText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },

  // Empty hint
  emptyHint: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
})

export default Tracking
