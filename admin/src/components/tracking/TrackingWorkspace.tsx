import React from 'react'
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import SatelliteAltRoundedIcon from '@mui/icons-material/SatelliteAltRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/tracking'
import FleetPanel from './FleetPanel'
import TrackingMap from './TrackingMap'
import TrackingTopbar from './TrackingTopbar'
import { type FleetVehicle } from './types'
import { getStatusColor } from './utils'
import { useTrackingWorkspace } from './useTrackingWorkspace'
import VehiclePanel from './VehiclePanel'

const getStatusLabel = (status: FleetVehicle['status']) => {
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

const TrackingWorkspace = () => {
  const tracking = useTrackingWorkspace()

  const mapVehicles = tracking.selectedVehicle && !tracking.filteredVehicles.some((item) => item.car._id === tracking.selectedVehicle?.car._id)
    ? [tracking.selectedVehicle, ...tracking.filteredVehicles]
    : tracking.filteredVehicles
  const showVehiclePanel = tracking.sidebarView === 'vehicle' && !!tracking.selectedVehicle
  const showFocusCard = showVehiclePanel && !!tracking.selectedVehicle
  const mapEmptyTitle = !tracking.integrationEnabled
    ? strings.TRACKING_DISABLED
    : showVehiclePanel
      ? strings.NO_MAP_DATA
      : strings.FLEET_EMPTY
  const mapEmptyDescription = !tracking.integrationEnabled
    ? strings.INTEGRATION_DISABLED
    : showVehiclePanel
      ? strings.MAP_EMPTY_HELP
      : strings.MAP_HINT

  return (
    <Layout onLoad={tracking.onLoad} strict>
      <div className="tracking-screen">
        <TrackingTopbar
          vehicleCount={tracking.counts.total}
          searchValue={tracking.searchQuery}
          refreshing={tracking.refreshing}
          integrationEnabled={tracking.integrationEnabled}
          alertCount={tracking.counts.stale + tracking.counts.noGps}
          onSearchChange={tracking.setSearchQuery}
          onRefresh={() => {
            void tracking.refreshWorkspace({ withMetadata: true })
          }}
          onBack={() => {
            window.history.back()
          }}
        />

        <div id="workspace">
          <aside id="sidebar">
            {showVehiclePanel && tracking.selectedVehicle
              ? (
                <VehiclePanel
                  selectedVehicle={tracking.selectedVehicle}
                  activeTab={tracking.activeTab}
                  from={tracking.from}
                  to={tracking.to}
                  routeFrames={tracking.routeFrames}
                  routeDistanceMeters={tracking.routeDistanceMeters}
                  routeDurationMs={tracking.routeDurationMs}
                  routeAverageSpeed={tracking.routeAverageSpeed}
                  routeMaxSpeed={tracking.routeMaxSpeed}
                  routeSnapMode={tracking.routeSnap.mode}
                  playbackActive={tracking.playbackActive}
                  playbackIndex={tracking.boundedPlaybackIndex}
                  playbackProgress={tracking.playbackProgress}
                  playbackSpeed={tracking.playbackSpeed}
                  playbackSpeedKmh={tracking.playbackSpeedKmh}
                  linkedGeofences={tracking.linkedGeofences}
                  allGeofences={tracking.managedGeofences}
                  linkedGeofenceIds={tracking.linkedGeofenceIds}
                  events={tracking.events}
                  eventTypeFilter={tracking.eventTypeFilter}
                  devices={tracking.devices}
                  deviceId={tracking.deviceId}
                  deviceName={tracking.deviceName}
                  notes={tracking.notes}
                  commandTypes={tracking.commandTypes}
                  selectedCommandType={tracking.selectedCommandType}
                  commandTextChannel={tracking.commandTextChannel}
                  commandAttributes={tracking.commandAttributes}
                  zonesLoading={tracking.zonesLoading}
                  routeLoading={tracking.routeLoading}
                  eventsLoading={tracking.eventsLoading}
                  snapshotLoading={tracking.snapshotLoading}
                  deviceSaving={tracking.deviceSaving}
                  commandSending={tracking.commandSending}
                  zoneStudioOpen={tracking.zoneStudioOpen}
                  editingGeofenceId={tracking.editingGeofenceId}
                  zoneFormName={tracking.zoneFormName}
                  zoneFormDescription={tracking.zoneFormDescription}
                  zoneFormType={tracking.zoneFormType}
                  zoneFormRadius={tracking.zoneFormRadius}
                  zoneFormPolylineDistance={tracking.zoneFormPolylineDistance}
                  zoneDraft={tracking.zoneDraft}
                  onBack={tracking.backToFleet}
                  onTabChange={tracking.setActiveTab}
                  onFromChange={tracking.setFrom}
                  onToChange={tracking.setTo}
                  onFocusVehicle={() => tracking.focusMap('selected')}
                  onLoadSnapshot={() => {
                    void tracking.handleLoadSnapshot()
                  }}
                  onLoadRoute={() => {
                    void tracking.handleLoadRoute()
                  }}
                  onPlaybackToggle={() => tracking.setPlaybackActive((value) => !value)}
                  onPlaybackRestart={() => {
                    tracking.setPlaybackActive(false)
                    tracking.setPlaybackIndex(0)
                  }}
                  onPlaybackScrub={(value) => {
                    tracking.setPlaybackActive(false)
                    tracking.setPlaybackIndex(value)
                  }}
                  onPlaybackSpeedChange={tracking.setPlaybackSpeed}
                  onRefreshZones={() => {
                    void tracking.handleRefreshZones()
                  }}
                  onOpenCreateZone={tracking.handleOpenCreateZone}
                  onOpenEditZone={tracking.handleOpenEditZone}
                  onDeleteZone={(geofenceId) => {
                    void tracking.handleDeleteZone(geofenceId)
                  }}
                  onToggleGeofenceLink={(geofenceId, linked) => {
                    void tracking.handleToggleGeofenceLink(geofenceId, linked)
                  }}
                  onCloseZoneStudio={tracking.resetZoneStudio}
                  onZoneNameChange={tracking.setZoneFormName}
                  onZoneDescriptionChange={tracking.setZoneFormDescription}
                  onZoneTypeChange={tracking.handleZoneTypeChange}
                  onZoneRadiusChange={tracking.handleZoneRadiusChange}
                  onZonePolylineDistanceChange={tracking.setZoneFormPolylineDistance}
                  onStartZoneDrawing={tracking.handleStartZoneDrawing}
                  onClearZoneShape={() => tracking.setZoneDraft(null)}
                  onSaveZone={() => {
                    void tracking.handleSaveZone()
                  }}
                  onLoadEvents={() => {
                    void tracking.handleLoadEvents()
                  }}
                  onEventTypeChange={tracking.setEventTypeFilter}
                  onDeviceIdChange={tracking.setDeviceId}
                  onDeviceNameChange={tracking.setDeviceName}
                  onNotesChange={tracking.setNotes}
                  onLinkDevice={() => {
                    void tracking.handleLinkDevice()
                  }}
                  onUnlinkDevice={() => {
                    void tracking.handleUnlinkDevice()
                  }}
                  onCommandTypeChange={tracking.setSelectedCommandType}
                  onCommandTextChannelChange={tracking.setCommandTextChannel}
                  onCommandAttributesChange={tracking.setCommandAttributes}
                  onSendCommand={() => {
                    void tracking.handleSendCommand()
                  }}
                />
                )
              : (
                <FleetPanel
                  vehicles={tracking.filteredVehicles}
                  counts={tracking.counts}
                  selectedCarId={tracking.selectedCarId}
                  activeFilter={tracking.statusFilter}
                  onFilterChange={tracking.handleStatusFilter}
                  onSelectCar={tracking.openVehicle}
                  onExport={tracking.handleExport}
                  onOpenGeofenceManager={tracking.handleOpenGeofenceManager}
                />
                )}
          </aside>

          <div id="map-container">
            <TrackingMap
              vehicles={mapVehicles}
              selectedVehicle={tracking.selectedVehicle}
              routePathPoints={tracking.routePathPoints}
              playbackPoint={tracking.playbackPoint}
              playbackHeading={tracking.playbackHeading}
              geofenceShapes={tracking.visibleGeofenceShapes}
              draftGeofence={tracking.zoneDraft}
              drawingMode={tracking.zoneDrawingMode}
              mapType={tracking.mapType}
              clustersEnabled={tracking.clustersEnabled}
              focusMode={tracking.mapFocusMode}
              fitToken={tracking.mapFitToken}
              onMarkerClick={(carId) => tracking.openVehicle(carId)}
              onDraftGeofenceChange={tracking.setZoneDraft}
              onDraftGeofenceDrawn={(draft) => {
                tracking.setZoneDraft(draft)
                tracking.setZoneDrawingMode(null)
                tracking.focusMap('selected')
              }}
            />

            {/* Map Toolbar - top-right vertical stack */}
            <div className="map-toolbar">
              <button
                type="button"
                className={`map-btn${tracking.mapFocusMode === 'selected' ? ' active' : ''}`}
                title={showVehiclePanel ? 'Center selected vehicle' : 'Center fleet'}
                onClick={() => tracking.focusMap(showVehiclePanel ? 'selected' : 'fleet')}
              >
                <CenterFocusStrongRoundedIcon fontSize="small" />
              </button>

              <button
                type="button"
                className={`map-btn${tracking.mapType === 'hybrid' ? ' active' : ''}`}
                title="Toggle satellite"
                onClick={() => tracking.setMapType((value) => (value === 'roadmap' ? 'hybrid' : 'roadmap'))}
              >
                {tracking.mapType === 'hybrid' ? <MapRoundedIcon fontSize="small" /> : <SatelliteAltRoundedIcon fontSize="small" />}
              </button>

              <button
                type="button"
                className={`map-btn${tracking.clustersEnabled ? ' active' : ''}`}
                title="Toggle clusters"
                onClick={() => tracking.setClustersEnabled((value) => !value)}
              >
                <HubRoundedIcon fontSize="small" />
              </button>
            </div>

            {/* Legend - bottom-right, fleet view only */}
            {!showVehiclePanel && (
              <div className="map-legend">
                <div className="legend-items">
                  <div className="legend-item"><span className="legend-dot moving" />{strings.STATUS_MOVING}</div>
                  <div className="legend-item"><span className="legend-dot idle" />{strings.STATUS_IDLE}</div>
                  <div className="legend-item"><span className="legend-dot stopped" />{strings.STATUS_STOPPED}</div>
                  <div className="legend-item"><span className="legend-dot offline" />{strings.STATUS_OFFLINE}</div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!tracking.hasMapData && (
              <div className="map-empty">
                <div className="map-empty-icon">
                  <WarningAmberRoundedIcon fontSize="medium" />
                </div>
                <h3>{mapEmptyTitle}</h3>
                <p>{mapEmptyDescription}</p>
              </div>
            )}

            {/* Focus Card - bottom-left, when vehicle selected */}
            <div id="focus-card" className={showFocusCard ? '' : 'hidden'}>
              <div className="fc-name">{tracking.selectedVehicle?.car.name || '-'}</div>
              <div className="fc-plate">{tracking.selectedVehicle?.car.licensePlate || '---'}</div>
              <div className="fc-status-row">
                <span
                  className="fc-status-pill"
                  style={{
                    background: tracking.selectedVehicle ? `${getStatusColor(tracking.selectedVehicle.status)}18` : undefined,
                    color: tracking.selectedVehicle ? getStatusColor(tracking.selectedVehicle.status) : undefined,
                  }}
                >
                  {tracking.selectedVehicle ? getStatusLabel(tracking.selectedVehicle.status) : '-'}
                </span>
              </div>
              <div className="fc-row">
                <span className="fc-key">{strings.SPEED}</span>
                <span className="fc-val">
                  {tracking.selectedVehicle ? `${Math.round(tracking.selectedVehicle.speedKmh)} km/h` : '-'}
                </span>
              </div>
              <div className="fc-row">
                <span className="fc-key">{strings.LAST_SEEN}</span>
                <span className="fc-val">{tracking.selectedVehicle?.lastSeenLabel || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {tracking.initializing && <Backdrop text={commonStrings.PLEASE_WAIT} progress />}
      </div>
    </Layout>
  )
}

export default TrackingWorkspace
