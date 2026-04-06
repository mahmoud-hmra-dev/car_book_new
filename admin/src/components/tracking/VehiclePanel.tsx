import React from 'react'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import FmdGoodRoundedIcon from '@mui/icons-material/FmdGoodRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import FenceRoundedIcon from '@mui/icons-material/FenceRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import BatteryChargingFullRoundedIcon from '@mui/icons-material/BatteryChargingFullRounded'
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded'
import GpsFixedRoundedIcon from '@mui/icons-material/GpsFixedRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/tracking'
import type {
  DraftGeofenceShape,
  FleetVehicle,
  GeofenceEditorType,
  RouteFrame,
  TrackingTab,
} from './types'
import {
  EVENT_TYPE_OPTIONS,
  PLAYBACK_SPEED_OPTIONS,
  formatCoordinate,
  formatDistanceKm,
  formatDuration,
  formatTimestamp,
  getStatusColor,
  hasDraftGeofenceGeometry,
} from './utils'

// ---------------------------------------------------------------------------
// Props (unchanged contract with TrackingWorkspace)
// ---------------------------------------------------------------------------

type VehiclePanelProps = {
  selectedVehicle: FleetVehicle
  activeTab: TrackingTab
  from: string
  to: string
  routeFrames: RouteFrame[]
  routeDistanceMeters?: number | null
  routeDurationMs?: number | null
  routeAverageSpeed?: number | null
  routeMaxSpeed?: number | null
  routeSnapMode: 'idle' | 'loading' | 'snapped' | 'raw'
  playbackActive: boolean
  playbackIndex: number
  playbackProgress: number
  playbackSpeed: number
  playbackSpeedKmh: number
  linkedGeofences: bookcarsTypes.TraccarGeofence[]
  allGeofences: bookcarsTypes.TraccarGeofence[]
  linkedGeofenceIds: Set<number>
  events: bookcarsTypes.TraccarEventCenterEntry[]
  eventTypeFilter: (typeof EVENT_TYPE_OPTIONS)[number]
  devices: bookcarsTypes.TraccarDevice[]
  deviceId: string
  deviceName: string
  notes: string
  commandTypes: bookcarsTypes.TraccarCommandType[]
  selectedCommandType: string
  commandTextChannel: boolean
  commandAttributes: string
  zonesLoading: boolean
  routeLoading: boolean
  eventsLoading: boolean
  snapshotLoading: boolean
  deviceSaving: boolean
  commandSending: boolean
  zoneStudioOpen: boolean
  editingGeofenceId: number | null
  zoneFormName: string
  zoneFormDescription: string
  zoneFormType: GeofenceEditorType
  zoneFormRadius: string
  zoneFormPolylineDistance: string
  zoneDraft: DraftGeofenceShape | null
  onBack: () => void
  onTabChange: (tab: TrackingTab) => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onFocusVehicle: () => void
  onLoadSnapshot: () => void
  onLoadRoute: () => void
  onPlaybackToggle: () => void
  onPlaybackRestart: () => void
  onPlaybackScrub: (value: number) => void
  onPlaybackSpeedChange: (value: number) => void
  onRefreshZones: () => void
  onOpenCreateZone: () => void
  onOpenEditZone: (geofence: bookcarsTypes.TraccarGeofence) => void
  onDeleteZone: (geofenceId: number) => void
  onToggleGeofenceLink: (geofenceId: number, linked: boolean) => void
  onCloseZoneStudio: () => void
  onZoneNameChange: (value: string) => void
  onZoneDescriptionChange: (value: string) => void
  onZoneTypeChange: (value: GeofenceEditorType) => void
  onZoneRadiusChange: (value: string) => void
  onZonePolylineDistanceChange: (value: string) => void
  onStartZoneDrawing: () => void
  onClearZoneShape: () => void
  onSaveZone: () => void
  onLoadEvents: () => void
  onEventTypeChange: (value: (typeof EVENT_TYPE_OPTIONS)[number]) => void
  onDeviceIdChange: (value: string) => void
  onDeviceNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onLinkDevice: () => void
  onUnlinkDevice: () => void
  onCommandTypeChange: (value: string) => void
  onCommandTextChannelChange: (value: boolean) => void
  onCommandAttributesChange: (value: string) => void
  onSendCommand: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TAB_CONFIG: { key: TrackingTab, label: string, Icon: React.ElementType }[] = [
  { key: 'status', label: 'Status', Icon: DashboardRoundedIcon },
  { key: 'route', label: 'Route', Icon: RouteRoundedIcon },
  { key: 'geofences', label: 'Zones', Icon: FenceRoundedIcon },
  { key: 'events', label: 'Events', Icon: TimelineRoundedIcon },
  { key: 'device', label: 'Device', Icon: DeviceHubRoundedIcon },
]

const getStatusLabel = (status: bookcarsTypes.TraccarFleetStatus) => {
  const map: Record<bookcarsTypes.TraccarFleetStatus, string> = {
    moving: strings.STATUS_MOVING,
    idle: strings.STATUS_IDLE,
    stopped: strings.STATUS_STOPPED,
    stale: strings.STATUS_STALE,
    noGps: strings.STATUS_NO_GPS,
    offline: strings.STATUS_OFFLINE,
    unlinked: strings.STATUS_UNLINKED,
  }
  return map[status] ?? strings.NO_DATA
}

const getEventTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    geofenceEnter: strings.EVENT_GEOFENCE_ENTER,
    geofenceExit: strings.EVENT_GEOFENCE_EXIT,
    deviceOnline: strings.EVENT_DEVICE_ONLINE,
    deviceOffline: strings.EVENT_DEVICE_OFFLINE,
    ignitionOn: strings.EVENT_IGNITION_ON,
    ignitionOff: strings.EVENT_IGNITION_OFF,
    overspeed: strings.EVENT_OVERSPEED,
    alarm: strings.EVENT_ALARM,
    motion: strings.EVENT_MOTION,
    deviceMoving: strings.EVENT_DEVICE_MOVING,
    deviceStopped: strings.EVENT_DEVICE_STOPPED,
    all: strings.ALL_EVENTS,
  }
  return (type && map[type]) || type || strings.NO_DATA
}

const getEventBorderColor = (type?: string) => {
  switch (type) {
    case 'geofenceEnter':
    case 'deviceOnline':
    case 'ignitionOn':
    case 'deviceMoving':
      return 'var(--tracking-green)'
    case 'geofenceExit':
    case 'deviceOffline':
    case 'ignitionOff':
    case 'deviceStopped':
      return 'var(--tracking-red)'
    case 'alarm':
    case 'overspeed':
      return 'var(--tracking-amber)'
    case 'motion':
      return 'var(--tracking-blue)'
    default:
      return 'var(--tracking-text3)'
  }
}

const getBatteryColorClass = (level: number) => {
  if (level > 50) {
    return 'vp-battery-green'
  }
  if (level >= 20) {
    return 'vp-battery-yellow'
  }
  return 'vp-battery-red'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VehiclePanel = ({
  selectedVehicle,
  activeTab,
  from,
  to,
  routeFrames,
  routeDistanceMeters,
  routeDurationMs,
  routeAverageSpeed,
  routeMaxSpeed,
  routeSnapMode,
  playbackActive,
  playbackIndex,
  playbackProgress,
  playbackSpeed,
  playbackSpeedKmh,
  linkedGeofences,
  allGeofences,
  linkedGeofenceIds,
  events,
  eventTypeFilter,
  devices,
  deviceId,
  deviceName,
  notes,
  commandTypes,
  selectedCommandType,
  commandTextChannel,
  commandAttributes,
  zonesLoading,
  routeLoading,
  eventsLoading,
  snapshotLoading,
  deviceSaving,
  commandSending,
  zoneStudioOpen,
  editingGeofenceId,
  zoneFormName,
  zoneFormDescription,
  zoneFormType,
  zoneFormRadius,
  zoneFormPolylineDistance,
  zoneDraft,
  onBack,
  onTabChange,
  onFromChange,
  onToChange,
  onFocusVehicle,
  onLoadSnapshot,
  onLoadRoute,
  onPlaybackToggle,
  onPlaybackRestart,
  onPlaybackScrub,
  onPlaybackSpeedChange,
  onRefreshZones,
  onOpenCreateZone,
  onOpenEditZone,
  onDeleteZone,
  onToggleGeofenceLink,
  onCloseZoneStudio,
  onZoneNameChange,
  onZoneDescriptionChange,
  onZoneTypeChange,
  onZoneRadiusChange,
  onZonePolylineDistanceChange,
  onStartZoneDrawing,
  onClearZoneShape,
  onSaveZone,
  onLoadEvents,
  onEventTypeChange,
  onDeviceIdChange,
  onDeviceNameChange,
  onNotesChange,
  onLinkDevice,
  onUnlinkDevice,
  onCommandTypeChange,
  onCommandTextChannelChange,
  onCommandAttributesChange,
  onSendCommand,
}: VehiclePanelProps) => {
  const routeHasData = routeFrames.length > 0
  const draftReady = hasDraftGeofenceGeometry(zoneDraft)

  const coordinates = selectedVehicle.position
    ? `${formatCoordinate(selectedVehicle.position.latitude)}, ${formatCoordinate(selectedVehicle.position.longitude)}`
    : '-'

  const currentFrame = routeHasData
    ? routeFrames[Math.min(playbackIndex, routeFrames.length - 1)]
    : null
  const currentTime = currentFrame
    ? new Date(currentFrame.timestampMs).toLocaleTimeString()
    : '--:--'

  const snapLabel = (() => {
    switch (routeSnapMode) {
      case 'loading': return strings.ROUTE_SNAP_LOADING
      case 'snapped': return strings.ROUTE_SNAP_READY
      case 'raw': return strings.ROUTE_SNAP_FALLBACK
      default: return null
    }
  })()

  // -----------------------------------------------------------------------
  // Tab: STATUS
  // -----------------------------------------------------------------------
  const renderStatusTab = () => (
    <div className="vp-tab-content">
      <div className="vp-metrics-grid">
        {/* Speed */}
        <div className="vp-metric-card">
          <SpeedRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-label">{strings.SPEED}</div>
          <div className="vp-metric-value">
            {Math.round(selectedVehicle.speedKmh)}
            <span className="vp-metric-unit"> km/h</span>
          </div>
        </div>

        {/* Battery */}
        <div className="vp-metric-card">
          <BatteryChargingFullRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-label">{strings.BATTERY}</div>
          <div className="vp-metric-value">
            {typeof selectedVehicle.batteryLevel === 'number' ? Math.round(selectedVehicle.batteryLevel) : '-'}
            <span className="vp-metric-unit"> %</span>
          </div>
          {typeof selectedVehicle.batteryLevel === 'number' && (
            <div className="vp-battery-bar">
              <div
                className={`vp-battery-fill ${getBatteryColorClass(selectedVehicle.batteryLevel)}`}
                style={{ width: `${Math.min(100, Math.max(0, selectedVehicle.batteryLevel))}%` }}
              />
            </div>
          )}
        </div>

        {/* Ignition */}
        <div className="vp-metric-card">
          <LocalFireDepartmentRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-label">{strings.IGNITION}</div>
          <div className={`vp-metric-value ${selectedVehicle.ignition ? 'vp-ignition-on' : 'vp-ignition-off'}`}>
            {selectedVehicle.ignition ? strings.ON : strings.OFF}
          </div>
        </div>

        {/* Device */}
        <div className="vp-metric-card">
          <MemoryRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-label">{strings.DEVICE_NAME}</div>
          <div className="vp-metric-value vp-metric-value--compact">
            {selectedVehicle.deviceName || strings.NO_DATA}
          </div>
        </div>

        {/* Coordinates */}
        <div className="vp-metric-card">
          <GpsFixedRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-label">{strings.CURRENT_POSITION}</div>
          <div className="vp-metric-value vp-metric-value--compact">{coordinates}</div>
        </div>

        {/* Last update */}
        <div className="vp-metric-card">
          <AccessTimeRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-label">{strings.LAST_UPDATE}</div>
          <div className="vp-metric-value vp-metric-value--compact">
            {formatTimestamp(selectedVehicle.snapshot?.lastPositionAt || selectedVehicle.snapshot?.lastSyncedAt)}
          </div>
        </div>
      </div>

      {/* Address */}
      {selectedVehicle.address && (
        <div className="vp-address-card">
          <FmdGoodRoundedIcon className="vp-address-icon" />
          <span className="vp-address-text">{selectedVehicle.address}</span>
        </div>
      )}

      {/* Load Snapshot */}
      <button
        type="button"
        className="vp-action-btn vp-action-btn--primary"
        onClick={onLoadSnapshot}
        disabled={snapshotLoading || !selectedVehicle.isLinked}
      >
        <RouteRoundedIcon fontSize="small" />
        <span>{snapshotLoading ? `${strings.LOAD_SNAPSHOT}...` : strings.LOAD_SNAPSHOT}</span>
      </button>

      {!selectedVehicle.isLinked && (
        <div className="vp-warning">
          <WarningAmberRoundedIcon fontSize="small" />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}
    </div>
  )

  // -----------------------------------------------------------------------
  // Tab: ROUTE
  // -----------------------------------------------------------------------
  const renderRouteTab = () => (
    <div className="vp-tab-content">
      {/* Date picker row */}
      <div className="vp-date-row">
        <div className="vp-field">
          <label className="vp-field-label">{strings.FROM}</label>
          <input
            className="vp-input"
            type="datetime-local"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <div className="vp-field">
          <label className="vp-field-label">{strings.TO}</label>
          <input
            className="vp-input"
            type="datetime-local"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="vp-action-btn vp-action-btn--primary"
        onClick={onLoadRoute}
        disabled={routeLoading || !selectedVehicle.isLinked}
      >
        <RouteRoundedIcon fontSize="small" />
        <span>{routeLoading ? `${strings.ROUTE_HISTORY}...` : strings.ROUTE_HISTORY}</span>
      </button>

      {/* Route stats */}
      {routeHasData && (
        <>
          <div className="vp-route-stats">
            <div className="vp-route-stat">
              <div className="vp-route-stat-value">{formatDistanceKm(routeDistanceMeters)}</div>
              <div className="vp-route-stat-label">{strings.ROUTE_DISTANCE}</div>
            </div>
            <div className="vp-route-stat">
              <div className="vp-route-stat-value">{formatDuration(routeDurationMs)}</div>
              <div className="vp-route-stat-label">{strings.TIME}</div>
            </div>
            <div className="vp-route-stat">
              <div className="vp-route-stat-value">
                {typeof routeAverageSpeed === 'number' ? `${Math.round(routeAverageSpeed)}` : '-'}
                <span className="vp-route-stat-unit"> km/h</span>
              </div>
              <div className="vp-route-stat-label">{strings.AVG_SPEED}</div>
            </div>
            <div className="vp-route-stat">
              <div className="vp-route-stat-value">
                {typeof routeMaxSpeed === 'number' ? `${Math.round(routeMaxSpeed)}` : '-'}
                <span className="vp-route-stat-unit"> km/h</span>
              </div>
              <div className="vp-route-stat-label">{strings.MAX_SPEED}</div>
            </div>
          </div>

          {/* Playback controls */}
          <div className="vp-playback">
            <div className="vp-playback-controls">
              <button type="button" className="vp-playback-btn" onClick={onPlaybackRestart} title={strings.PLAYBACK_RESTART}>
                <RestartAltRoundedIcon fontSize="small" />
              </button>
              <button type="button" className="vp-playback-btn vp-playback-btn--main" onClick={onPlaybackToggle}>
                {playbackActive ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
              </button>
              <select
                className="vp-select vp-speed-select"
                value={playbackSpeed}
                onChange={(e) => onPlaybackSpeedChange(Number.parseInt(e.target.value, 10))}
              >
                {PLAYBACK_SPEED_OPTIONS.map((v) => (
                  <option key={v} value={v}>{`${v}x`}</option>
                ))}
              </select>
            </div>

            <div className="vp-playback-slider">
              <input
                className="vp-range"
                type="range"
                min={0}
                max={Math.max(routeFrames.length - 1, 0)}
                value={Math.min(playbackIndex, Math.max(routeFrames.length - 1, 0))}
                onChange={(e) => onPlaybackScrub(Number.parseInt(e.target.value, 10))}
              />
              <div className="vp-playback-times">
                <span>{currentTime}</span>
                <span>
                  {`${playbackProgress}%`}
                </span>
              </div>
            </div>

            <div className="vp-playback-meta">
              {snapLabel && <span className="vp-snap-badge">{snapLabel}</span>}
              <span className="vp-playback-speed-label">
                {`${Math.round(playbackSpeedKmh)} km/h`}
              </span>
            </div>
          </div>
        </>
      )}

      {!routeHasData && !routeLoading && (
        <div className="vp-empty">{strings.MAP_EMPTY_HELP}</div>
      )}
    </div>
  )

  // -----------------------------------------------------------------------
  // Zone Studio (inline create/edit form)
  // -----------------------------------------------------------------------
  const renderZoneStudio = () => {
    if (!zoneStudioOpen) {
      return null
    }

    return (
      <div className="vp-zone-studio">
        <div className="vp-zone-studio-head">
          <strong>{editingGeofenceId ? strings.UPDATE_GEOFENCE : strings.CREATE_GEOFENCE}</strong>
          <button type="button" className="vp-link-btn" onClick={onCloseZoneStudio}>{strings.CANCEL_EDIT}</button>
        </div>

        <div className="vp-field">
          <label className="vp-field-label">{strings.GEOFENCE_NAME}</label>
          <input className="vp-input" type="text" value={zoneFormName} onChange={(e) => onZoneNameChange(e.target.value)} />
        </div>

        <div className="vp-field">
          <label className="vp-field-label">{strings.DESCRIPTION}</label>
          <input className="vp-input" type="text" value={zoneFormDescription} onChange={(e) => onZoneDescriptionChange(e.target.value)} />
        </div>

        <div className="vp-zone-type-row">
          <div className="vp-field vp-field--flex">
            <label className="vp-field-label">{strings.GEOFENCE_TYPE}</label>
            <select className="vp-select" value={zoneFormType} onChange={(e) => onZoneTypeChange(e.target.value as GeofenceEditorType)}>
              <option value="circle">{strings.GEOFENCE_TYPE_CIRCLE}</option>
              <option value="polygon">{strings.GEOFENCE_TYPE_POLYGON}</option>
              <option value="polyline">{strings.GEOFENCE_TYPE_POLYLINE}</option>
            </select>
          </div>

          {zoneFormType === 'circle' && (
            <div className="vp-field vp-field--flex">
              <label className="vp-field-label">{strings.RADIUS_METERS}</label>
              <input className="vp-input" type="number" min="1" value={zoneFormRadius} onChange={(e) => onZoneRadiusChange(e.target.value)} />
            </div>
          )}

          {zoneFormType === 'polyline' && (
            <div className="vp-field vp-field--flex">
              <label className="vp-field-label">{strings.POLYLINE_DISTANCE}</label>
              <input className="vp-input" type="number" min="1" value={zoneFormPolylineDistance} onChange={(e) => onZonePolylineDistanceChange(e.target.value)} />
            </div>
          )}
        </div>

        <div className="vp-zone-draw-row">
          <button type="button" className="vp-action-btn" onClick={onStartZoneDrawing}>
            <FmdGoodRoundedIcon fontSize="small" />
            <span>{draftReady ? strings.GEOFENCE_READY : strings.DRAW_ON_MAP}</span>
          </button>
          <button type="button" className="vp-action-btn" onClick={onClearZoneShape}>
            <LinkOffRoundedIcon fontSize="small" />
            <span>{strings.CLEAR_SHAPE}</span>
          </button>
        </div>

        <div className="vp-note">
          {draftReady ? strings.GEOFENCE_READY : strings.DRAW_ON_MAP_HELP}
        </div>

        <button type="button" className="vp-action-btn vp-action-btn--primary" onClick={onSaveZone} disabled={!draftReady}>
          <AddRoundedIcon fontSize="small" />
          <span>{editingGeofenceId ? strings.UPDATE_GEOFENCE : strings.CREATE_GEOFENCE}</span>
        </button>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Tab: ZONES
  // -----------------------------------------------------------------------
  const renderZonesTab = () => (
    <div className="vp-tab-content">
      <div className="vp-zones-actions">
        <button type="button" className="vp-action-btn vp-action-btn--primary" onClick={onOpenCreateZone}>
          <AddRoundedIcon fontSize="small" />
          <span>{strings.CREATE_GEOFENCE}</span>
        </button>
        <button type="button" className="vp-icon-btn" onClick={onRefreshZones} disabled={zonesLoading} title={strings.REFRESH_FLEET}>
          <RefreshRoundedIcon fontSize="small" />
        </button>
      </div>

      {renderZoneStudio()}

      <div className="vp-zone-count">
        {`${linkedGeofences.length} ${strings.LINKED_TO_SELECTED_CAR.toLowerCase()}`}
      </div>

      {allGeofences.length > 0 ? (
        <div className="vp-zone-list">
          {allGeofences.map((geofence, index) => {
            const geoId = typeof geofence.id === 'number' ? geofence.id : null
            const linked = geoId !== null && linkedGeofenceIds.has(geoId)
            const shapeType = geofence.area?.split('(')[0]?.trim()?.toLowerCase()
              || (geofence.geojson ? 'geojson' : `zone ${index + 1}`)

            return (
              <div key={geofence.id || `${geofence.name}-${index}`} className="vp-zone-card">
                <div className="vp-zone-info">
                  <div className="vp-zone-name">{geofence.name || `Zone ${index + 1}`}</div>
                  <div className="vp-zone-type">{shapeType}</div>
                  {linked && <span className="vp-zone-linked-badge">{strings.LINKED_TO_SELECTED_CAR}</span>}
                </div>
                <div className="vp-zone-btns">
                  <button
                    type="button"
                    className={`vp-zone-toggle ${linked ? 'vp-zone-toggle--linked' : ''}`}
                    disabled={!selectedVehicle.isLinked || geoId === null}
                    onClick={() => geoId !== null && onToggleGeofenceLink(geoId, linked)}
                    title={linked ? strings.UNLINK_FROM_CAR : strings.LINK_TO_CAR}
                  >
                    {linked ? <LinkRoundedIcon style={{ fontSize: 16 }} /> : <LinkOffRoundedIcon style={{ fontSize: 16 }} />}
                  </button>
                  <button type="button" className="vp-zone-btn" onClick={() => onOpenEditZone(geofence)} title={strings.EDIT_GEOFENCE}>
                    <EditRoundedIcon style={{ fontSize: 16 }} />
                  </button>
                  {geoId !== null && (
                    <button type="button" className="vp-zone-btn vp-zone-btn--danger" onClick={() => onDeleteZone(geoId)} title={strings.DELETE_GEOFENCE_CONFIRM}>
                      <DeleteRoundedIcon style={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="vp-empty">{strings.NO_GEOFENCES}</div>
      )}

      {!selectedVehicle.isLinked && (
        <div className="vp-warning">
          <WarningAmberRoundedIcon fontSize="small" />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}
    </div>
  )

  // -----------------------------------------------------------------------
  // Tab: EVENTS
  // -----------------------------------------------------------------------
  const renderEventsTab = () => (
    <div className="vp-tab-content">
      <div className="vp-events-filters">
        <div className="vp-date-row">
          <input className="vp-input" type="datetime-local" value={from} onChange={(e) => onFromChange(e.target.value)} />
          <input className="vp-input" type="datetime-local" value={to} onChange={(e) => onToChange(e.target.value)} />
        </div>
        <select className="vp-select" value={eventTypeFilter} onChange={(e) => onEventTypeChange(e.target.value as (typeof EVENT_TYPE_OPTIONS)[number])}>
          {EVENT_TYPE_OPTIONS.map((v) => (
            <option key={v} value={v}>{getEventTypeLabel(v)}</option>
          ))}
        </select>
        <button
          type="button"
          className="vp-action-btn vp-action-btn--primary"
          onClick={onLoadEvents}
          disabled={eventsLoading || !selectedVehicle.isLinked}
        >
          <RefreshRoundedIcon fontSize="small" />
          <span>{eventsLoading ? `${strings.EVENT_CENTER}...` : strings.EVENT_CENTER}</span>
        </button>
      </div>

      {events.length > 0 ? (
        <div className="vp-event-timeline">
          {events.map((event, index) => (
            <div
              key={event.id || `${event.deviceId}-${event.eventTime}-${index}`}
              className="vp-event-item"
              style={{ borderLeftColor: getEventBorderColor(event.type) }}
            >
              <div className="vp-event-time">{formatTimestamp(event.eventTime)}</div>
              <div className="vp-event-type">{getEventTypeLabel(event.type)}</div>
              <div className="vp-event-detail">
                {event.geofenceName || event.address || event.deviceName || strings.NO_DATA}
              </div>
              {typeof event.speed === 'number' && (
                <div className="vp-event-speed">{`${strings.SPEED}: ${Math.round(event.speed)} km/h`}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="vp-empty">{strings.NO_DATA}</div>
      )}
    </div>
  )

  // -----------------------------------------------------------------------
  // Tab: DEVICE
  // -----------------------------------------------------------------------
  const renderDeviceTab = () => (
    <div className="vp-tab-content">
      {/* Binding section */}
      <div className="vp-device-section">
        <div className="vp-device-section-title">
          <span>{strings.LINK_DEVICE}</span>
          <span className={`vp-device-dot ${selectedVehicle.isLinked ? 'vp-device-dot--linked' : ''}`} />
          <span className="vp-device-dot-label">{selectedVehicle.isLinked ? strings.TRACKING_ENABLED : strings.TRACKING_DISABLED}</span>
        </div>

        <div className="vp-field">
          <label className="vp-field-label">{strings.DEVICE_ID}</label>
          <input
            className="vp-input"
            list="tracking-device-list"
            type="text"
            value={deviceId}
            placeholder="e.g. 142"
            onChange={(e) => onDeviceIdChange(e.target.value)}
          />
          <datalist id="tracking-device-list">
            {devices.map((device) => (
              <option key={device.id} value={device.id}>{device.name}</option>
            ))}
          </datalist>
        </div>

        <div className="vp-field">
          <label className="vp-field-label">{strings.DEVICE_NAME}</label>
          <input className="vp-input" type="text" value={deviceName} placeholder="e.g. Teltonika FMC130" onChange={(e) => onDeviceNameChange(e.target.value)} />
        </div>

        <div className="vp-field">
          <label className="vp-field-label">{strings.NOTES}</label>
          <input className="vp-input" type="text" value={notes} placeholder="..." onChange={(e) => onNotesChange(e.target.value)} />
        </div>

        <div className="vp-device-btn-row">
          <button type="button" className="vp-action-btn vp-action-btn--primary" onClick={onLinkDevice} disabled={deviceSaving}>
            <LinkRoundedIcon fontSize="small" />
            <span>{deviceSaving ? `${strings.LINK_DEVICE}...` : strings.LINK_DEVICE}</span>
          </button>
          <button type="button" className="vp-action-btn vp-action-btn--danger" onClick={onUnlinkDevice} disabled={deviceSaving || !selectedVehicle.isLinked}>
            <LinkOffRoundedIcon fontSize="small" />
            <span>{strings.UNLINK_DEVICE}</span>
          </button>
        </div>
      </div>

      {/* Commands section */}
      <div className="vp-device-section">
        <div className="vp-device-section-title">
          <span>{strings.COMMAND_CENTER}</span>
        </div>

        <div className="vp-field">
          <label className="vp-field-label">{strings.COMMAND_TYPE}</label>
          <select className="vp-select" value={selectedCommandType} onChange={(e) => onCommandTypeChange(e.target.value)}>
            {commandTypes.length === 0
              ? <option value="">{strings.NO_DATA}</option>
              : commandTypes.map((ct) => (
                <option key={ct.type} value={ct.type}>{ct.type}</option>
              ))}
          </select>
        </div>

        <label className="vp-checkbox-row">
          <input type="checkbox" checked={commandTextChannel} onChange={(e) => onCommandTextChannelChange(e.target.checked)} />
          <span>{strings.TEXT_CHANNEL}</span>
        </label>

        <div className="vp-field">
          <label className="vp-field-label">{strings.COMMAND_ATTRIBUTES}</label>
          <textarea className="vp-textarea" rows={6} value={commandAttributes} onChange={(e) => onCommandAttributesChange(e.target.value)} />
        </div>

        <button
          type="button"
          className="vp-action-btn"
          onClick={onSendCommand}
          disabled={commandSending || !selectedCommandType || !selectedVehicle.isLinked}
        >
          <SendRoundedIcon fontSize="small" />
          <span>{commandSending ? `${strings.SEND_COMMAND}...` : strings.SEND_COMMAND}</span>
        </button>
      </div>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="vp">
      {/* Header */}
      <div className="vp-header">
        <div className="vp-header-actions">
          <button type="button" className="vp-icon-btn" onClick={onBack} title={strings.FLEET_MODE}>
            <ArrowBackRoundedIcon fontSize="small" />
          </button>
          <button type="button" className="vp-icon-btn" onClick={onFocusVehicle} title={strings.MAP_OVERVIEW}>
            <CenterFocusStrongRoundedIcon fontSize="small" />
          </button>
        </div>

        <div className="vp-header-identity">
          <DirectionsCarFilledRoundedIcon className="vp-header-car-icon" style={{ color: getStatusColor(selectedVehicle.status) }} />
          <div>
            <div className="vp-header-car-name">{selectedVehicle.car.name}</div>
            <div className="vp-header-sub">
              {selectedVehicle.car.licensePlate || '---'}
              {selectedVehicle.supplierName && ` \u00B7 ${selectedVehicle.supplierName}`}
            </div>
          </div>
        </div>

        <div className="vp-header-status-row">
          <span className="vp-status-pill" style={{ background: getStatusColor(selectedVehicle.status) }}>
            {getStatusLabel(selectedVehicle.status)}
          </span>
          {selectedVehicle.speedKmh > 0 && (
            <span className="vp-header-speed">{`${Math.round(selectedVehicle.speedKmh)} km/h`}</span>
          )}
          <span className="vp-header-seen">{`\u00B7 ${selectedVehicle.lastSeenLabel}`}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="vp-tabs">
        {TAB_CONFIG.map(({ key, label, Icon }) => (
          <button
            type="button"
            key={key}
            className={`vp-tab ${activeTab === key ? 'vp-tab--active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            <Icon className="vp-tab-icon" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="vp-body">
        {activeTab === 'status' && renderStatusTab()}
        {activeTab === 'route' && renderRouteTab()}
        {activeTab === 'geofences' && renderZonesTab()}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'device' && renderDeviceTab()}
      </div>
    </div>
  )
}

export default VehiclePanel
