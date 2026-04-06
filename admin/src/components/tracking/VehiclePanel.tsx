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
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import GpsFixedRoundedIcon from '@mui/icons-material/GpsFixedRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
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

const getStatusLabel = (status: bookcarsTypes.TraccarFleetStatus) => {
  switch (status) {
    case 'moving':
      return strings.STATUS_MOVING
    case 'idle':
      return strings.STATUS_IDLE
    case 'stopped':
      return strings.STATUS_STOPPED
    case 'stale':
      return strings.STATUS_STALE
    case 'noGps':
      return strings.STATUS_NO_GPS
    case 'offline':
      return strings.STATUS_OFFLINE
    case 'unlinked':
      return strings.STATUS_UNLINKED
    default:
      return strings.NO_DATA
  }
}

const getEventTypeLabel = (type?: string) => {
  switch (type) {
    case 'geofenceEnter':
      return strings.EVENT_GEOFENCE_ENTER
    case 'geofenceExit':
      return strings.EVENT_GEOFENCE_EXIT
    case 'deviceOnline':
      return strings.EVENT_DEVICE_ONLINE
    case 'deviceOffline':
      return strings.EVENT_DEVICE_OFFLINE
    case 'ignitionOn':
      return strings.EVENT_IGNITION_ON
    case 'ignitionOff':
      return strings.EVENT_IGNITION_OFF
    case 'overspeed':
      return strings.EVENT_OVERSPEED
    case 'alarm':
      return strings.EVENT_ALARM
    case 'motion':
      return strings.EVENT_MOTION
    case 'deviceMoving':
      return strings.EVENT_DEVICE_MOVING
    case 'deviceStopped':
      return strings.EVENT_DEVICE_STOPPED
    case 'all':
      return strings.ALL_EVENTS
    default:
      return type || strings.NO_DATA
  }
}

const getEventDotColor = (type?: string) => {
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

const getBearingLabel = (degrees: number) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % 8
  return `${directions[index]} ${Math.round(degrees)}`
}

const getBatteryColorClass = (level: number) => {
  if (level > 50) {
    return 'battery-green'
  }
  if (level >= 20) {
    return 'battery-yellow'
  }
  return 'battery-red'
}

const TAB_CONFIG: { key: TrackingTab, label: string, Icon: React.ElementType }[] = [
  { key: 'status', label: 'Status', Icon: DashboardRoundedIcon },
  { key: 'route', label: 'Route', Icon: RouteRoundedIcon },
  { key: 'geofences', label: 'Zones', Icon: FenceRoundedIcon },
  { key: 'events', label: 'Events', Icon: TimelineRoundedIcon },
  { key: 'device', label: 'Device', Icon: DeviceHubRoundedIcon },
]

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
  const [telemetryOpen, setTelemetryOpen] = React.useState(false)
  const routeHasData = routeFrames.length > 0
  const canManageTracking = selectedVehicle.isLinked
  const draftReady = hasDraftGeofenceGeometry(zoneDraft)
  const coordinates = selectedVehicle.position
    ? `${formatCoordinate(selectedVehicle.position.latitude)}, ${formatCoordinate(selectedVehicle.position.longitude)}`
    : '-'

  const bearing = selectedVehicle.position?.course
  const bearingLabel = typeof bearing === 'number' && Number.isFinite(bearing)
    ? getBearingLabel(bearing)
    : '-'

  const handleCopyAddress = () => {
    if (selectedVehicle.address) {
      navigator.clipboard.writeText(selectedVehicle.address)
    }
  }

  const currentFrame = routeHasData ? routeFrames[Math.min(playbackIndex, routeFrames.length - 1)] : null
  const currentTime = currentFrame ? new Date(currentFrame.timestampMs).toLocaleTimeString() : '--:--'

  const snapStatusLabel = () => {
    switch (routeSnapMode) {
      case 'loading': return strings.ROUTE_SNAP_LOADING
      case 'snapped': return strings.ROUTE_SNAP_READY
      case 'raw': return strings.ROUTE_SNAP_FALLBACK
      default: return null
    }
  }

  /* ─── TAB: STATUS ─── */
  const renderStatusTab = () => (
    <div className="vp-tab-content">
      <div className="vp-metrics-grid">
        <div className="vp-metric-card">
          <SpeedRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-value">
            {Math.round(selectedVehicle.speedKmh)}
            <span className="vp-metric-unit">km/h</span>
          </div>
          <div className="vp-metric-label">{strings.SPEED}</div>
        </div>

        <div className="vp-metric-card">
          <BatteryChargingFullRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-value">
            {typeof selectedVehicle.batteryLevel === 'number' ? Math.round(selectedVehicle.batteryLevel) : '-'}
            <span className="vp-metric-unit">%</span>
          </div>
          {typeof selectedVehicle.batteryLevel === 'number' && (
            <div className="vp-battery-bar">
              <div
                className={`vp-battery-fill ${getBatteryColorClass(selectedVehicle.batteryLevel)}`}
                style={{ width: `${Math.min(100, Math.max(0, selectedVehicle.batteryLevel))}%` }}
              />
            </div>
          )}
          <div className="vp-metric-label">{strings.BATTERY}</div>
        </div>

        <div className="vp-metric-card">
          <LocalFireDepartmentRoundedIcon className="vp-metric-icon" />
          <div className={`vp-metric-value vp-metric-value--status ${selectedVehicle.ignition ? 'on' : 'off'}`}>
            {selectedVehicle.ignition ? strings.ON : strings.OFF}
          </div>
          <div className="vp-metric-label">{strings.IGNITION}</div>
        </div>

        <div className="vp-metric-card">
          <ExploreRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-value vp-metric-value--compact">{bearingLabel}&deg;</div>
          <div className="vp-metric-label">Heading</div>
        </div>

        <div className="vp-metric-card">
          <GpsFixedRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-value vp-metric-value--compact">{coordinates !== '-' ? `${formatCoordinate(selectedVehicle.position?.latitude)?.slice(0, 5)},${formatCoordinate(selectedVehicle.position?.longitude)?.slice(0, 5)}` : '-'}</div>
          <div className="vp-metric-label">Coords</div>
        </div>

        <div className="vp-metric-card">
          <MemoryRoundedIcon className="vp-metric-icon" />
          <div className="vp-metric-value vp-metric-value--compact">{selectedVehicle.deviceName || strings.NO_DATA}</div>
          <div className="vp-metric-label">Device</div>
        </div>
      </div>

      {selectedVehicle.address && (
        <div className="vp-address-card">
          <FmdGoodRoundedIcon className="vp-address-icon" />
          <span className="vp-address-text">{selectedVehicle.address}</span>
          <button type="button" className="vp-address-copy" onClick={handleCopyAddress} title="Copy address">
            <ContentCopyRoundedIcon style={{ fontSize: 14 }} />
          </button>
        </div>
      )}

      <button
        type="button"
        className="vp-collapsible-header"
        onClick={() => setTelemetryOpen((previous) => !previous)}
      >
        <span>Telemetry Details</span>
        {telemetryOpen ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
      </button>
      {telemetryOpen && (
        <div className="vp-telemetry-card">
          <div className="vp-telemetry-section">
            <div className="vp-telemetry-heading">Car</div>
            <div className="detail-row"><span className="detail-key">{strings.SELECTED_VEHICLE}</span><span className="detail-val">{selectedVehicle.car.name}</span></div>
            <div className="detail-row"><span className="detail-key">Plate</span><span className="detail-val">{selectedVehicle.car.licensePlate || '---'}</span></div>
            <div className="detail-row"><span className="detail-key">Supplier</span><span className="detail-val">{selectedVehicle.supplierName || '-'}</span></div>
          </div>
          <div className="vp-telemetry-section">
            <div className="vp-telemetry-heading">Device</div>
            <div className="detail-row"><span className="detail-key">ID</span><span className="detail-val">{selectedVehicle.car.tracking?.deviceId ?? strings.NO_DATA}</span></div>
            <div className="detail-row"><span className="detail-key">Name</span><span className="detail-val">{selectedVehicle.deviceName || strings.NO_DATA}</span></div>
            <div className="detail-row"><span className="detail-key">{strings.DEVICE_STATUS}</span><span className="detail-val">{selectedVehicle.deviceStatus || strings.NO_DATA}</span></div>
          </div>
          <div className="vp-telemetry-section">
            <div className="vp-telemetry-heading">Position</div>
            <div className="detail-row"><span className="detail-key">Lat, Lng</span><span className="detail-val">{coordinates}</span></div>
            <div className="detail-row"><span className="detail-key">Altitude</span><span className="detail-val">{typeof selectedVehicle.position?.altitude === 'number' ? `${Math.round(selectedVehicle.position.altitude)}m` : '-'}</span></div>
            <div className="detail-row"><span className="detail-key">Last update</span><span className="detail-val">{formatTimestamp(selectedVehicle.snapshot?.lastPositionAt || selectedVehicle.snapshot?.lastSyncedAt)}</span></div>
          </div>
        </div>
      )}

      {!selectedVehicle.isLinked && (
        <div className="inline-warning">
          <WarningAmberRoundedIcon fontSize="small" />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}

      <button type="button" className="action-btn vp-load-status-btn" onClick={onLoadSnapshot} disabled={snapshotLoading || !selectedVehicle.isLinked}>
        <RouteRoundedIcon fontSize="small" />
        <span>{snapshotLoading ? 'Loading snapshot...' : strings.LOAD_SNAPSHOT}</span>
      </button>
    </div>
  )

  /* ─── TAB: ROUTE ─── */
  const renderRouteTab = () => (
    <div className="vp-tab-content">
      <div className="vp-route-date-row">
        <div className="form-group">
          <label className="form-label">{strings.FROM}</label>
          <input className="form-input" type="datetime-local" value={from} onChange={(event) => onFromChange(event.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{strings.TO}</label>
          <input className="form-input" type="datetime-local" value={to} onChange={(event) => onToChange(event.target.value)} />
        </div>
      </div>

      <button type="button" className="action-btn primary" onClick={onLoadRoute} disabled={routeLoading || !selectedVehicle.isLinked}>
        <RouteRoundedIcon fontSize="small" />
        <span>{routeLoading ? 'Loading route...' : routeFrames.length > 0 ? 'Reload Route' : 'Load Route'}</span>
      </button>

      {routeHasData ? (
        <>
          <div className="vp-route-stats">
            <div className="vp-route-stat-card">
              <div className="vp-route-stat-value">{formatDistanceKm(routeDistanceMeters)}</div>
              <div className="vp-route-stat-label">{strings.ROUTE_DISTANCE}</div>
            </div>
            <div className="vp-route-stat-card">
              <div className="vp-route-stat-value">{formatDuration(routeDurationMs)}</div>
              <div className="vp-route-stat-label">Duration</div>
            </div>
            <div className="vp-route-stat-card">
              <div className="vp-route-stat-value">
                {typeof routeAverageSpeed === 'number' ? Math.round(routeAverageSpeed) : '-'}
                <span>km/h</span>
              </div>
              <div className="vp-route-stat-label">{strings.AVG_SPEED}</div>
            </div>
            <div className="vp-route-stat-card">
              <div className="vp-route-stat-value">
                {typeof routeMaxSpeed === 'number' ? Math.round(routeMaxSpeed) : '-'}
                <span>km/h</span>
              </div>
              <div className="vp-route-stat-label">{strings.MAX_SPEED}</div>
            </div>
          </div>

          <div className="vp-playback-card">
            <div className="vp-playback-controls-row">
              <button type="button" className="vp-playback-btn" onClick={onPlaybackRestart}>
                <RestartAltRoundedIcon fontSize="small" />
              </button>
              <button type="button" className="vp-playback-btn vp-playback-btn--main" onClick={onPlaybackToggle}>
                {playbackActive ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
              </button>
              <select className="vp-speed-select" value={playbackSpeed} onChange={(event) => onPlaybackSpeedChange(Number.parseInt(event.target.value, 10))}>
                {PLAYBACK_SPEED_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                    x
                  </option>
                ))}
              </select>
            </div>

            <div className="vp-playback-slider-row">
              <input
                className="vp-playback-range"
                type="range"
                min={0}
                max={Math.max(routeFrames.length - 1, 0)}
                value={Math.min(playbackIndex, Math.max(routeFrames.length - 1, 0))}
                onChange={(event) => onPlaybackScrub(Number.parseInt(event.target.value, 10))}
              />
              <span className="vp-playback-time">{currentTime}</span>
            </div>

            <div className="vp-playback-meta">
              {snapStatusLabel() && <span className="vp-snap-badge">{snapStatusLabel()}</span>}
              <span className="vp-playback-speed-label">
                {Math.round(playbackSpeedKmh)}
                {' '}
                km/h
              </span>
              <span className="vp-playback-progress">
                {playbackProgress}
                %
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state compact">
          <p>Load a Traccar route to start playback.</p>
        </div>
      )}
    </div>
  )

  /* ─── ZONE STUDIO (inline form) ─── */
  const renderZoneStudio = () => {
    if (!zoneStudioOpen) {
      return null
    }

    return (
      <div className="vp-zone-studio">
        <div className="vp-zone-studio-head">
          <strong>{editingGeofenceId ? 'Edit Zone' : 'Create New Zone'}</strong>
          <button type="button" className="ghost-link" onClick={onCloseZoneStudio}>{strings.CANCEL_EDIT}</button>
        </div>

        <div className="form-group">
          <label className="form-label">{strings.GEOFENCE_NAME}</label>
          <input className="form-input" type="text" value={zoneFormName} onChange={(event) => onZoneNameChange(event.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{strings.DESCRIPTION}</label>
          <input className="form-input" type="text" value={zoneFormDescription} onChange={(event) => onZoneDescriptionChange(event.target.value)} />
        </div>

        <div className="vp-zone-type-row">
          <div className="form-group" style={{ flex: '1 1 0' }}>
            <label className="form-label">{strings.GEOFENCE_TYPE}</label>
            <select className="form-select" value={zoneFormType} onChange={(event) => onZoneTypeChange(event.target.value as GeofenceEditorType)}>
              <option value="circle">{strings.GEOFENCE_TYPE_CIRCLE}</option>
              <option value="polygon">{strings.GEOFENCE_TYPE_POLYGON}</option>
              <option value="polyline">{strings.GEOFENCE_TYPE_POLYLINE}</option>
            </select>
          </div>

          {zoneFormType === 'circle' && (
            <div className="form-group" style={{ flex: '1 1 0' }}>
              <label className="form-label">{strings.RADIUS_METERS}</label>
              <input className="form-input" type="number" min="1" value={zoneFormRadius} onChange={(event) => onZoneRadiusChange(event.target.value)} />
            </div>
          )}

          {zoneFormType === 'polyline' && (
            <div className="form-group" style={{ flex: '1 1 0' }}>
              <label className="form-label">{strings.POLYLINE_DISTANCE}</label>
              <input className="form-input" type="number" min="1" value={zoneFormPolylineDistance} onChange={(event) => onZonePolylineDistanceChange(event.target.value)} />
            </div>
          )}
        </div>

        <div className="vp-zone-draw-row">
          <button type="button" className="action-btn" onClick={onStartZoneDrawing}>
            <FmdGoodRoundedIcon fontSize="small" />
            <span>{draftReady ? 'Redraw on map' : strings.DRAW_ON_MAP}</span>
          </button>
          <button type="button" className="action-btn" onClick={onClearZoneShape}>
            <LinkOffRoundedIcon fontSize="small" />
            <span>{strings.CLEAR_SHAPE}</span>
          </button>
        </div>

        <div className="inline-note">
          {draftReady ? 'Shape is ready on the map and can be saved.' : strings.DRAW_ON_MAP_HELP}
        </div>

        <button type="button" className="action-btn primary" onClick={onSaveZone} disabled={!draftReady}>
          <AddRoundedIcon fontSize="small" />
          <span>{editingGeofenceId ? strings.UPDATE_GEOFENCE : strings.CREATE_GEOFENCE}</span>
        </button>
      </div>
    )
  }

  /* ─── TAB: ZONES ─── */
  const renderGeofencesTab = () => (
    <div className="vp-tab-content">
      <div className="vp-zones-actions">
        <button type="button" className="action-btn primary" onClick={onOpenCreateZone}>
          <AddRoundedIcon fontSize="small" />
          <span>Create Zone</span>
        </button>
        <button type="button" className="vp-icon-btn" onClick={onRefreshZones} disabled={zonesLoading} title="Refresh Zones">
          <RefreshRoundedIcon fontSize="small" />
        </button>
      </div>

      {renderZoneStudio()}

      <div className="vp-zone-count">
        {linkedGeofences.length}
        {' '}
        linked zones for this vehicle.
      </div>

      {allGeofences.length > 0 ? (
        <div className="vp-zone-list">
          {allGeofences.map((geofence, index) => {
            const geofenceId = typeof geofence.id === 'number' ? geofence.id : null
            const linked = geofenceId !== null && linkedGeofenceIds.has(geofenceId)
            const parsedType = geofence.area?.split('(')[0]?.trim()?.toLowerCase()
              || (geofence.geojson ? 'geojson' : `zone ${index + 1}`)

            return (
              <div key={geofence.id || `${geofence.name}-${index}`} className="vp-zone-card">
                <div className="vp-zone-info">
                  <div className="vp-zone-name">{geofence.name || `Zone ${index + 1}`}</div>
                  <div className="vp-zone-type-label">{parsedType}</div>
                  {linked && <span className="vp-zone-linked-badge">Linked</span>}
                </div>
                <div className="vp-zone-actions">
                  <button
                    type="button"
                    className={`vp-zone-link-btn ${linked ? 'linked' : ''}`}
                    disabled={!selectedVehicle.isLinked || geofenceId === null}
                    onClick={() => geofenceId !== null && onToggleGeofenceLink(geofenceId, linked)}
                    title={linked ? 'Unlink' : 'Link'}
                  >
                    {linked ? <LinkRoundedIcon style={{ fontSize: 16 }} /> : <LinkOffRoundedIcon style={{ fontSize: 16 }} />}
                  </button>
                  <button type="button" className="vp-zone-action-btn" onClick={() => onOpenEditZone(geofence)} title={strings.EDIT_GEOFENCE}>
                    <EditRoundedIcon style={{ fontSize: 16 }} />
                  </button>
                  {geofenceId !== null && (
                    <button type="button" className="vp-zone-action-btn vp-zone-action-btn--danger" onClick={() => onDeleteZone(geofenceId)} title="Delete">
                      <DeleteRoundedIcon style={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>{strings.NO_GEOFENCES}</p>
        </div>
      )}

      {!canManageTracking && (
        <div className="inline-warning">
          <WarningAmberRoundedIcon fontSize="small" />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}
    </div>
  )

  /* ─── TAB: EVENTS ─── */
  const renderEventsTab = () => (
    <div className="vp-tab-content">
      <div className="vp-events-filters">
        <div className="vp-events-date-row">
          <input className="form-input" type="datetime-local" value={from} onChange={(event) => onFromChange(event.target.value)} />
          <input className="form-input" type="datetime-local" value={to} onChange={(event) => onToChange(event.target.value)} />
        </div>
        <select className="form-select" value={eventTypeFilter} onChange={(event) => onEventTypeChange(event.target.value as (typeof EVENT_TYPE_OPTIONS)[number])}>
          {EVENT_TYPE_OPTIONS.map((value) => (
            <option key={value} value={value}>{getEventTypeLabel(value)}</option>
          ))}
        </select>
        <button type="button" className="action-btn primary" onClick={onLoadEvents} disabled={eventsLoading || !selectedVehicle.isLinked}>
          <RefreshRoundedIcon fontSize="small" />
          <span>{eventsLoading ? 'Loading events...' : 'Load Events'}</span>
        </button>
      </div>

      {events.length > 0 ? (
        <div className="vp-event-timeline">
          {events.map((event, index) => (
            <div key={event.id || `${event.deviceId}-${event.eventTime}-${index}`} className="vp-event-row">
              <div className="vp-event-rail">
                <div className="vp-event-dot" style={{ background: getEventDotColor(event.type) }} />
                {index < events.length - 1 && <div className="vp-event-line" />}
              </div>
              <div className="vp-event-body">
                <div className="vp-event-header">
                  <span className="vp-event-time">{formatTimestamp(event.eventTime)}</span>
                  <span className="vp-event-type-label">{getEventTypeLabel(event.type)}</span>
                </div>
                <div className="vp-event-detail">
                  <span>{event.geofenceName || event.address || event.deviceName || strings.NO_DATA}</span>
                  {typeof event.speed === 'number' && (
                    <span>
                      {`${strings.SPEED}: ${Math.round(event.speed)} km/h`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>No events loaded for this vehicle yet.</p>
        </div>
      )}
    </div>
  )

  /* ─── TAB: DEVICE ─── */
  const renderDeviceTab = () => (
    <div className="vp-tab-content">
      <div className="vp-device-section">
        <div className="vp-device-section-title">
          <span>Device Connection</span>
          <span className={`vp-device-status-dot ${selectedVehicle.isLinked ? 'linked' : 'unlinked'}`} />
          <span className="vp-device-status-label">{selectedVehicle.isLinked ? 'Linked' : 'Unlinked'}</span>
        </div>

        <div className="form-group">
          <label className="form-label">{strings.DEVICE_ID}</label>
          <input
            className="form-input"
            list="tracking-device-list"
            type="text"
            value={deviceId}
            placeholder="e.g. 142"
            onChange={(event) => onDeviceIdChange(event.target.value)}
          />
          <datalist id="tracking-device-list">
            {devices.map((device) => (
              <option key={device.id} value={device.id}>{device.name}</option>
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label className="form-label">{strings.DEVICE_NAME}</label>
          <input className="form-input" type="text" value={deviceName} placeholder="e.g. Teltonika FMC130" onChange={(event) => onDeviceNameChange(event.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{strings.NOTES}</label>
          <input className="form-input" type="text" value={notes} placeholder="Optional notes..." onChange={(event) => onNotesChange(event.target.value)} />
        </div>

        <div className="vp-device-btn-row">
          <button type="button" className="action-btn primary" onClick={onLinkDevice} disabled={deviceSaving}>
            <LinkRoundedIcon fontSize="small" />
            <span>{deviceSaving ? 'Saving...' : strings.LINK_DEVICE}</span>
          </button>
          <button type="button" className="action-btn danger" onClick={onUnlinkDevice} disabled={deviceSaving || !selectedVehicle.isLinked}>
            <LinkOffRoundedIcon fontSize="small" />
            <span>{strings.UNLINK_DEVICE}</span>
          </button>
        </div>
      </div>

      <div className="vp-device-section">
        <div className="vp-device-section-title">
          <span>{strings.COMMAND_CENTER}</span>
        </div>

        <div className="form-group">
          <label className="form-label">{strings.COMMAND_TYPE}</label>
          <select className="form-select" value={selectedCommandType} onChange={(event) => onCommandTypeChange(event.target.value)}>
            {commandTypes.length === 0
              ? <option value="">No command types</option>
              : commandTypes.map((commandType) => (
                <option key={commandType.type} value={commandType.type}>{commandType.type}</option>
              ))}
          </select>
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={commandTextChannel} onChange={(event) => onCommandTextChannelChange(event.target.checked)} />
          <span>{strings.TEXT_CHANNEL}</span>
        </label>

        <div className="form-group">
          <label className="form-label">{strings.COMMAND_ATTRIBUTES}</label>
          <textarea className="form-textarea" rows={6} value={commandAttributes} onChange={(event) => onCommandAttributesChange(event.target.value)} />
        </div>

        <button type="button" className="action-btn" onClick={onSendCommand} disabled={commandSending || !selectedCommandType || !selectedVehicle.isLinked}>
          <SendRoundedIcon fontSize="small" />
          <span>{commandSending ? 'Sending...' : strings.SEND_COMMAND}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="sb-view active" id="car-view">
      {/* ─── HEADER ─── */}
      <div className="vp-header">
        <div className="vp-header-top">
          <button type="button" className="vp-back-btn" onClick={onBack}>
            <ArrowBackRoundedIcon fontSize="small" />
          </button>
          <button type="button" className="vp-focus-btn" onClick={onFocusVehicle} title="Focus on map">
            <CenterFocusStrongRoundedIcon fontSize="small" />
            <span>Focus</span>
          </button>
        </div>

        <div className="vp-header-identity">
          <DirectionsCarFilledRoundedIcon className="vp-header-car-icon" style={{ color: getStatusColor(selectedVehicle.status) }} />
          <div className="vp-header-car-name">{selectedVehicle.car.name}</div>
        </div>
        <div className="vp-header-sub">
          {selectedVehicle.car.licensePlate || '---'}
          {selectedVehicle.supplierName && (
            <>
              {' \u2022 '}
              {selectedVehicle.supplierName}
            </>
          )}
        </div>
        <div className="vp-header-status-row">
          <div className={`status-badge ${selectedVehicle.status}`}>{getStatusLabel(selectedVehicle.status)}</div>
          {selectedVehicle.status === 'moving' && (
            <span className="vp-header-speed">
              {Math.round(selectedVehicle.speedKmh)}
              {' '}
              km/h
            </span>
          )}
        </div>
        <div className="vp-header-seen">
          {strings.LAST_SEEN}
          :
          {' '}
          {selectedVehicle.lastSeenLabel}
        </div>
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div className="vp-tabs" id="cv-tabs">
        {TAB_CONFIG.map(({ key, label, Icon }) => (
          <button
            type="button"
            key={key}
            className={`vp-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            <Icon className="vp-tab-icon" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB BODY ─── */}
      <div className="cv-body">
        {activeTab === 'status' && renderStatusTab()}
        {activeTab === 'route' && renderRouteTab()}
        {activeTab === 'geofences' && renderGeofencesTab()}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'device' && renderDeviceTab()}
      </div>
    </div>
  )
}

export default VehiclePanel
