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
      return '#22c55e'
    case 'geofenceExit':
    case 'deviceOffline':
    case 'ignitionOff':
    case 'deviceStopped':
      return '#ef4444'
    case 'alarm':
    case 'overspeed':
      return '#f59e0b'
    case 'motion':
      return '#3b82f6'
    default:
      return '#94a3b8'
  }
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
  const battery = typeof selectedVehicle.batteryLevel === 'number' ? Math.round(selectedVehicle.batteryLevel) : null
  const batteryPercent = battery !== null ? Math.min(100, Math.max(0, battery)) : 0

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
    <div className="space-y-4">
      {/* 2x3 metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Speed */}
        <div className="bg-background rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 text-text-muted mb-1">
            <SpeedRoundedIcon style={{ fontSize: 14 }} />
            <span className="text-[10px] uppercase font-semibold tracking-wide">{strings.SPEED}</span>
          </div>
          <div className="text-xl font-bold text-text">
            {Math.round(selectedVehicle.speedKmh)}
            <span className="text-xs font-normal text-text-muted ml-0.5">km/h</span>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-background rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 text-text-muted mb-1">
            <BatteryChargingFullRoundedIcon style={{ fontSize: 14 }} />
            <span className="text-[10px] uppercase font-semibold tracking-wide">{strings.BATTERY}</span>
          </div>
          <div className="text-xl font-bold text-text">
            {battery !== null ? battery : '-'}
            <span className="text-xs font-normal text-text-muted ml-0.5">%</span>
          </div>
          {battery !== null && (
            <div className="w-full h-1.5 bg-border rounded-full mt-1.5">
              <div
                className={`h-full rounded-full ${battery > 50 ? 'bg-success' : battery > 20 ? 'bg-warning' : 'bg-danger'}`}
                style={{ width: `${batteryPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Ignition */}
        <div className="bg-background rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 text-text-muted mb-1">
            <LocalFireDepartmentRoundedIcon style={{ fontSize: 14 }} />
            <span className="text-[10px] uppercase font-semibold tracking-wide">{strings.IGNITION}</span>
          </div>
          <div className={`text-xl font-bold mt-1 ${selectedVehicle.ignition ? 'text-success' : 'text-danger'}`}>
            {selectedVehicle.ignition ? strings.ON : strings.OFF}
          </div>
        </div>

        {/* Device */}
        <div className="bg-background rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 text-text-muted mb-1">
            <MemoryRoundedIcon style={{ fontSize: 14 }} />
            <span className="text-[10px] uppercase font-semibold tracking-wide">{strings.DEVICE_NAME}</span>
          </div>
          <div className="text-sm font-bold text-text truncate mt-1">
            {selectedVehicle.deviceName || strings.NO_DATA}
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-background rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 text-text-muted mb-1">
            <GpsFixedRoundedIcon style={{ fontSize: 14 }} />
            <span className="text-[10px] uppercase font-semibold tracking-wide">{strings.CURRENT_POSITION}</span>
          </div>
          <div className="text-sm font-bold text-text truncate mt-1">{coordinates}</div>
        </div>

        {/* Last update */}
        <div className="bg-background rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 text-text-muted mb-1">
            <AccessTimeRoundedIcon style={{ fontSize: 14 }} />
            <span className="text-[10px] uppercase font-semibold tracking-wide">{strings.LAST_UPDATE}</span>
          </div>
          <div className="text-sm font-bold text-text truncate mt-1">
            {formatTimestamp(selectedVehicle.snapshot?.lastPositionAt || selectedVehicle.snapshot?.lastSyncedAt)}
          </div>
        </div>
      </div>

      {/* Address */}
      {selectedVehicle.address && (
        <div className="bg-primary/5 rounded-lg px-3 py-2 flex items-start gap-2">
          <FmdGoodRoundedIcon className="text-primary shrink-0 mt-0.5" style={{ fontSize: 16 }} />
          <span className="text-sm text-text">{selectedVehicle.address}</span>
        </div>
      )}

      {/* Load Snapshot */}
      <button
        type="button"
        onClick={onLoadSnapshot}
        disabled={snapshotLoading || !selectedVehicle.isLinked}
        className="w-full py-2.5 rounded-lg border-2 border-dashed border-border text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
      >
        {snapshotLoading ? `${strings.LOAD_SNAPSHOT}...` : strings.LOAD_SNAPSHOT}
      </button>

      {!selectedVehicle.isLinked && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          <WarningAmberRoundedIcon style={{ fontSize: 16 }} />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}
    </div>
  )

  // -----------------------------------------------------------------------
  // Tab: ROUTE
  // -----------------------------------------------------------------------
  const renderRouteTab = () => (
    <div className="space-y-4">
      {/* Date picker row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.FROM}</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.TO}</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onLoadRoute}
        disabled={routeLoading || !selectedVehicle.isLinked}
        className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {routeLoading ? `${strings.ROUTE_HISTORY}...` : strings.ROUTE_HISTORY}
      </button>

      {/* Route stats */}
      {routeHasData && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center bg-background rounded-lg py-2 border border-border">
              <div className="text-sm font-bold text-text">{formatDistanceKm(routeDistanceMeters)}</div>
              <div className="text-[9px] text-text-muted uppercase">{strings.ROUTE_DISTANCE}</div>
            </div>
            <div className="text-center bg-background rounded-lg py-2 border border-border">
              <div className="text-sm font-bold text-text">{formatDuration(routeDurationMs)}</div>
              <div className="text-[9px] text-text-muted uppercase">{strings.TIME}</div>
            </div>
            <div className="text-center bg-background rounded-lg py-2 border border-border">
              <div className="text-sm font-bold text-text">
                {typeof routeAverageSpeed === 'number' ? `${Math.round(routeAverageSpeed)}` : '-'}
                <span className="text-[9px] font-normal text-text-muted ml-0.5">km/h</span>
              </div>
              <div className="text-[9px] text-text-muted uppercase">{strings.AVG_SPEED}</div>
            </div>
            <div className="text-center bg-background rounded-lg py-2 border border-border">
              <div className="text-sm font-bold text-text">
                {typeof routeMaxSpeed === 'number' ? `${Math.round(routeMaxSpeed)}` : '-'}
                <span className="text-[9px] font-normal text-text-muted ml-0.5">km/h</span>
              </div>
              <div className="text-[9px] text-text-muted uppercase">{strings.MAX_SPEED}</div>
            </div>
          </div>

          {/* Playback controls */}
          <div className="bg-background rounded-xl p-3 border border-border space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onPlaybackRestart}
                title={strings.PLAYBACK_RESTART}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-white transition-colors"
              >
                <RestartAltRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                onClick={onPlaybackToggle}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-dark transition-colors"
              >
                {playbackActive ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
              </button>
              <select
                value={playbackSpeed}
                onChange={(e) => onPlaybackSpeedChange(Number.parseInt(e.target.value, 10))}
                className="h-8 px-2 rounded-lg border border-border text-xs bg-white"
              >
                {PLAYBACK_SPEED_OPTIONS.map((v) => (
                  <option key={v} value={v}>{`${v}x`}</option>
                ))}
              </select>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(routeFrames.length - 1, 0)}
              value={Math.min(playbackIndex, Math.max(routeFrames.length - 1, 0))}
              onChange={(e) => onPlaybackScrub(Number.parseInt(e.target.value, 10))}
              className="w-full accent-primary"
            />

            <div className="flex justify-between text-[10px] text-text-muted">
              <span>{currentTime}</span>
              <span>{`${playbackProgress}%`}</span>
            </div>

            {(snapLabel || playbackSpeedKmh > 0) && (
              <div className="flex items-center justify-between text-[10px] text-text-muted">
                {snapLabel && <span className="italic">{snapLabel}</span>}
                <span className="font-semibold">{`${Math.round(playbackSpeedKmh)} km/h`}</span>
              </div>
            )}
          </div>
        </>
      )}

      {!routeHasData && !routeLoading && (
        <div className="text-center text-sm text-text-muted py-6">{strings.MAP_EMPTY_HELP}</div>
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
      <div className="bg-background rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text">{editingGeofenceId ? strings.UPDATE_GEOFENCE : strings.CREATE_GEOFENCE}</h4>
          <button type="button" onClick={onCloseZoneStudio} className="text-xs text-primary font-medium hover:underline">{strings.CANCEL_EDIT}</button>
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.GEOFENCE_NAME}</label>
          <input
            type="text"
            value={zoneFormName}
            onChange={(e) => onZoneNameChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.DESCRIPTION}</label>
          <input
            type="text"
            value={zoneFormDescription}
            onChange={(e) => onZoneDescriptionChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm focus:border-primary outline-none"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.GEOFENCE_TYPE}</label>
            <select
              value={zoneFormType}
              onChange={(e) => onZoneTypeChange(e.target.value as GeofenceEditorType)}
              className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm bg-white focus:border-primary outline-none"
            >
              <option value="circle">{strings.GEOFENCE_TYPE_CIRCLE}</option>
              <option value="polygon">{strings.GEOFENCE_TYPE_POLYGON}</option>
              <option value="polyline">{strings.GEOFENCE_TYPE_POLYLINE}</option>
            </select>
          </div>

          {zoneFormType === 'circle' && (
            <div className="flex-1">
              <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.RADIUS_METERS}</label>
              <input
                type="number"
                min="1"
                value={zoneFormRadius}
                onChange={(e) => onZoneRadiusChange(e.target.value)}
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm focus:border-primary outline-none"
              />
            </div>
          )}

          {zoneFormType === 'polyline' && (
            <div className="flex-1">
              <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.POLYLINE_DISTANCE}</label>
              <input
                type="number"
                min="1"
                value={zoneFormPolylineDistance}
                onChange={(e) => onZonePolylineDistanceChange(e.target.value)}
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm focus:border-primary outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onStartZoneDrawing}
            className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            <FmdGoodRoundedIcon style={{ fontSize: 14 }} />
            {draftReady ? strings.GEOFENCE_READY : strings.DRAW_ON_MAP}
          </button>
          <button
            type="button"
            onClick={onClearZoneShape}
            className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-text-secondary hover:border-danger hover:text-danger transition-colors flex items-center justify-center gap-1"
          >
            <LinkOffRoundedIcon style={{ fontSize: 14 }} />
            {strings.CLEAR_SHAPE}
          </button>
        </div>

        <p className="text-[10px] text-text-muted italic">
          {draftReady ? strings.GEOFENCE_READY : strings.DRAW_ON_MAP_HELP}
        </p>

        <button
          type="button"
          onClick={onSaveZone}
          disabled={!draftReady}
          className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <AddRoundedIcon style={{ fontSize: 14 }} />
          {editingGeofenceId ? strings.UPDATE_GEOFENCE : strings.CREATE_GEOFENCE}
        </button>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Tab: ZONES
  // -----------------------------------------------------------------------
  const renderZonesTab = () => (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenCreateZone}
          className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1"
        >
          <AddRoundedIcon style={{ fontSize: 14 }} />
          {strings.CREATE_GEOFENCE}
        </button>
        <button
          type="button"
          onClick={onRefreshZones}
          disabled={zonesLoading}
          title={strings.REFRESH_FLEET}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
        >
          <RefreshRoundedIcon fontSize="small" />
        </button>
      </div>

      {renderZoneStudio()}

      <div className="text-xs text-text-muted px-1">
        {`${linkedGeofences.length} ${strings.LINKED_TO_SELECTED_CAR.toLowerCase()}`}
      </div>

      {allGeofences.length > 0 ? (
        <div className="space-y-2">
          {allGeofences.map((geofence, index) => {
            const geoId = typeof geofence.id === 'number' ? geofence.id : null
            const linked = geoId !== null && linkedGeofenceIds.has(geoId)
            const shapeType = geofence.area?.split('(')[0]?.trim()?.toLowerCase()
              || (geofence.geojson ? 'geojson' : `zone ${index + 1}`)

            return (
              <div key={geofence.id || `${geofence.name}-${index}`} className="flex items-center justify-between bg-background rounded-lg p-3 border border-border">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text truncate">{geofence.name || `Zone ${index + 1}`}</div>
                  <div className="text-xs text-text-muted mt-0.5">{shapeType}</div>
                  {linked && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-success/10 text-success">
                      {strings.LINKED_TO_SELECTED_CAR}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    disabled={!selectedVehicle.isLinked || geoId === null}
                    onClick={() => geoId !== null && onToggleGeofenceLink(geoId, linked)}
                    title={linked ? strings.UNLINK_FROM_CAR : strings.LINK_TO_CAR}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors disabled:opacity-50 ${linked ? 'text-success hover:text-success/80' : 'text-text-muted hover:text-primary'}`}
                  >
                    {linked ? <LinkRoundedIcon style={{ fontSize: 16 }} /> : <LinkOffRoundedIcon style={{ fontSize: 16 }} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenEditZone(geofence)}
                    title={strings.EDIT_GEOFENCE}
                    className="w-7 h-7 rounded text-text-muted hover:text-primary flex items-center justify-center transition-colors"
                  >
                    <EditRoundedIcon style={{ fontSize: 16 }} />
                  </button>
                  {geoId !== null && (
                    <button
                      type="button"
                      onClick={() => onDeleteZone(geoId)}
                      title={strings.DELETE_GEOFENCE_CONFIRM}
                      className="w-7 h-7 rounded text-text-muted hover:text-danger flex items-center justify-center transition-colors"
                    >
                      <DeleteRoundedIcon style={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-sm text-text-muted py-6">{strings.NO_GEOFENCES}</div>
      )}

      {!selectedVehicle.isLinked && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          <WarningAmberRoundedIcon style={{ fontSize: 16 }} />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}
    </div>
  )

  // -----------------------------------------------------------------------
  // Tab: EVENTS
  // -----------------------------------------------------------------------
  const renderEventsTab = () => (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg border border-border text-xs bg-white focus:border-primary outline-none"
        />
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg border border-border text-xs bg-white focus:border-primary outline-none"
        />
      </div>
      <select
        value={eventTypeFilter}
        onChange={(e) => onEventTypeChange(e.target.value as (typeof EVENT_TYPE_OPTIONS)[number])}
        className="w-full h-9 px-3 rounded-lg border border-border text-xs bg-white focus:border-primary outline-none"
      >
        {EVENT_TYPE_OPTIONS.map((v) => (
          <option key={v} value={v}>{getEventTypeLabel(v)}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onLoadEvents}
        disabled={eventsLoading || !selectedVehicle.isLinked}
        className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {eventsLoading ? `${strings.EVENT_CENTER}...` : strings.EVENT_CENTER}
      </button>

      {/* Timeline */}
      {events.length > 0 ? (
        <div className="space-y-0">
          {events.map((event, index) => (
            <div
              key={event.id || `${event.deviceId}-${event.eventTime}-${index}`}
              className="flex gap-3 py-2 border-l-2 pl-4 ml-2"
              style={{ borderLeftColor: getEventBorderColor(event.type) }}
            >
              <div className="text-[10px] text-text-muted w-12 shrink-0">{formatTimestamp(event.eventTime)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text">{getEventTypeLabel(event.type)}</div>
                <div className="text-[10px] text-text-muted truncate">
                  {event.geofenceName || event.address || event.deviceName || strings.NO_DATA}
                </div>
                {typeof event.speed === 'number' && (
                  <div className="text-[10px] text-text-muted">{`${strings.SPEED}: ${Math.round(event.speed)} km/h`}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-text-muted py-6">{strings.NO_DATA}</div>
      )}
    </div>
  )

  // -----------------------------------------------------------------------
  // Tab: DEVICE
  // -----------------------------------------------------------------------
  const renderDeviceTab = () => (
    <div className="space-y-4">
      {/* Device binding */}
      <div className="bg-background rounded-xl p-4 border border-border space-y-3">
        <h4 className="text-sm font-semibold text-text flex items-center gap-2">
          {strings.LINK_DEVICE}
          <span className={`w-2 h-2 rounded-full ${selectedVehicle.isLinked ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-[10px] font-normal text-text-muted">
            {selectedVehicle.isLinked ? strings.TRACKING_ENABLED : strings.TRACKING_DISABLED}
          </span>
        </h4>

        <div>
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.DEVICE_ID}</label>
          <input
            list="tracking-device-list"
            type="text"
            value={deviceId}
            placeholder="e.g. 142"
            onChange={(e) => onDeviceIdChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm focus:border-primary outline-none"
          />
          <datalist id="tracking-device-list">
            {devices.map((device) => (
              <option key={device.id} value={device.id}>{device.name}</option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.DEVICE_NAME}</label>
          <input
            type="text"
            value={deviceName}
            placeholder="e.g. Teltonika FMC130"
            onChange={(e) => onDeviceNameChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.NOTES}</label>
          <input
            type="text"
            value={notes}
            placeholder="..."
            onChange={(e) => onNotesChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm focus:border-primary outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLinkDevice}
            disabled={deviceSaving}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <LinkRoundedIcon style={{ fontSize: 14 }} />
            {deviceSaving ? `${strings.LINK_DEVICE}...` : strings.LINK_DEVICE}
          </button>
          <button
            type="button"
            onClick={onUnlinkDevice}
            disabled={deviceSaving || !selectedVehicle.isLinked}
            className="flex-1 py-2 rounded-lg border border-danger text-danger text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <LinkOffRoundedIcon style={{ fontSize: 14 }} />
            {strings.UNLINK_DEVICE}
          </button>
        </div>
      </div>

      {/* Command center */}
      <div className="bg-background rounded-xl p-4 border border-border space-y-3">
        <h4 className="text-sm font-semibold text-text">{strings.COMMAND_CENTER}</h4>

        <div>
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.COMMAND_TYPE}</label>
          <select
            value={selectedCommandType}
            onChange={(e) => onCommandTypeChange(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg border border-border text-sm bg-white focus:border-primary outline-none"
          >
            {commandTypes.length === 0
              ? <option value="">{strings.NO_DATA}</option>
              : commandTypes.map((ct) => (
                <option key={ct.type} value={ct.type}>{ct.type}</option>
              ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
          <input
            type="checkbox"
            checked={commandTextChannel}
            onChange={(e) => onCommandTextChannelChange(e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          <span>{strings.TEXT_CHANNEL}</span>
        </label>

        <div>
          <label className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{strings.COMMAND_ATTRIBUTES}</label>
          <textarea
            rows={6}
            value={commandAttributes}
            onChange={(e) => onCommandAttributesChange(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm bg-white focus:border-primary outline-none resize-y"
          />
        </div>

        <button
          type="button"
          onClick={onSendCommand}
          disabled={commandSending || !selectedCommandType || !selectedVehicle.isLinked}
          className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <SendRoundedIcon style={{ fontSize: 14 }} />
          {commandSending ? `${strings.SEND_COMMAND}...` : strings.SEND_COMMAND}
        </button>
      </div>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={onBack}
            title={strings.FLEET_MODE}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-background transition-colors"
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </button>
          <button
            type="button"
            onClick={onFocusVehicle}
            title={strings.MAP_OVERVIEW}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            <CenterFocusStrongRoundedIcon fontSize="small" />
            Center
          </button>
        </div>

        <div className="flex items-center gap-2.5 mb-2">
          <DirectionsCarFilledRoundedIcon style={{ color: getStatusColor(selectedVehicle.status), fontSize: 22 }} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text leading-tight truncate">{selectedVehicle.car.name}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {selectedVehicle.car.licensePlate || '---'}
              {selectedVehicle.supplierName && ` \u00B7 ${selectedVehicle.supplierName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: getStatusColor(selectedVehicle.status) }}
          >
            {getStatusLabel(selectedVehicle.status)}
          </span>
          {selectedVehicle.speedKmh > 0 && (
            <span className="text-sm font-semibold" style={{ color: getStatusColor(selectedVehicle.status) }}>
              {Math.round(selectedVehicle.speedKmh)} km/h
            </span>
          )}
          <span className="text-xs text-text-muted">{`\u00B7 ${selectedVehicle.lastSeenLabel}`}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TAB_CONFIG.map(({ key, label, Icon }) => (
          <button
            type="button"
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            <Icon style={{ fontSize: 18 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Body - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
