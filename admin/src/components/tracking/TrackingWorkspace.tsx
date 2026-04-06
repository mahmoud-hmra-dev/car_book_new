import React, { useState } from 'react'
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
      <div className="-m-6 flex flex-col h-[calc(100vh-56px)] bg-background overflow-hidden">
        {/* Header */}
        <TrackingTopbar
          totalCount={tracking.counts.total}
          searchValue={tracking.searchQuery}
          refreshing={tracking.refreshing}
          integrationEnabled={tracking.integrationEnabled}
          onSearchChange={tracking.setSearchQuery}
          onRefresh={() => {
            void tracking.refreshWorkspace({ withMetadata: true })
          }}
        />

        {/* Body: sidebar + map */}
        <div className="flex flex-1 overflow-hidden max-md:flex-col-reverse max-md:relative">
          {/* Sidebar */}
          <aside
            className={`w-[340px] shrink-0 bg-surface border-r border-border flex flex-col overflow-hidden max-md:w-full max-md:max-h-[70vh] max-md:border-r-0 max-md:border-t max-md:border-border max-md:rounded-t-2xl max-md:shadow-[0_-4px_20px_rgba(0,0,0,0.1)] max-md:z-30 ${
              sidebarCollapsed ? 'max-md:max-h-12 max-md:overflow-hidden' : ''
            }`}
          >
            {/* Mobile toggle handle */}
            <button
              type="button"
              className="hidden max-md:flex items-center justify-center w-full h-12 border-0 bg-transparent text-text-muted cursor-pointer shrink-0"
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              <span className="w-10 h-1 rounded-sm bg-border" />
            </button>

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

          {/* Map area */}
          <div className="flex-1 relative overflow-hidden bg-slate-200">
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

            {/* Map Toolbar - top right */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 max-md:top-3 max-md:right-3">
              <button
                type="button"
                title={showVehiclePanel ? 'Center selected vehicle' : 'Center fleet'}
                onClick={() => tracking.focusMap(showVehiclePanel ? 'selected' : 'fleet')}
                className={`w-10 h-10 rounded-lg border shadow-sm flex items-center justify-center transition-all cursor-pointer p-0 ${
                  tracking.mapFocusMode === 'selected'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                <CenterFocusStrongRoundedIcon fontSize="small" />
              </button>

              <button
                type="button"
                title="Toggle satellite"
                onClick={() => tracking.setMapType((value) => (value === 'roadmap' ? 'hybrid' : 'roadmap'))}
                className={`w-10 h-10 rounded-lg border shadow-sm flex items-center justify-center transition-all cursor-pointer p-0 ${
                  tracking.mapType === 'hybrid'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                {tracking.mapType === 'hybrid'
                  ? <MapRoundedIcon fontSize="small" />
                  : <SatelliteAltRoundedIcon fontSize="small" />}
              </button>

              <button
                type="button"
                title="Toggle clusters"
                onClick={() => tracking.setClustersEnabled((value) => !value)}
                className={`w-10 h-10 rounded-lg border shadow-sm flex items-center justify-center transition-all cursor-pointer p-0 ${
                  tracking.clustersEnabled
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                <HubRoundedIcon fontSize="small" />
              </button>
            </div>

            {/* Legend - bottom right, fleet view only */}
            {!showVehiclePanel && (
              <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 flex gap-3 text-xs shadow-sm z-10 max-md:bottom-3 max-md:right-3 max-sm:flex-col max-sm:gap-1">
                <span className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.35)]" />
                  {strings.STATUS_MOVING}
                </span>
                <span className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  {strings.STATUS_IDLE}
                </span>
                <span className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-info" />
                  {strings.STATUS_STOPPED}
                </span>
                <span className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-text-muted" />
                  {strings.STATUS_OFFLINE}
                </span>
              </div>
            )}

            {/* Empty State */}
            {!tracking.hasMapData && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 p-10 bg-[radial-gradient(circle_at_center,rgba(241,245,249,0.55),rgba(226,232,240,0.72))] z-[15]">
                <div className="flex items-center justify-center w-13 h-13 border border-border rounded-[14px] bg-white">
                  <WarningAmberRoundedIcon fontSize="medium" />
                </div>
                <h3 className="text-base font-semibold text-text">{mapEmptyTitle}</h3>
                <p className="text-xs text-text-secondary max-w-xs">{mapEmptyDescription}</p>
              </div>
            )}

            {/* Focus Card - bottom left */}
            <div
              className={`absolute bottom-4 left-4 bg-white rounded-xl p-4 min-w-[240px] shadow-lg z-10 transition-all duration-200 max-md:bottom-3 max-md:left-3 max-md:min-w-0 max-md:max-w-[calc(100%-24px)] max-sm:[&_.fc-row]:items-start ${
                showFocusCard
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-1.5 pointer-events-none'
              }`}
            >
              <div className="text-[15px] font-semibold text-text truncate mb-0.5">
                {tracking.selectedVehicle?.car.name || '-'}
              </div>
              <div className="text-[11px] text-text-muted tracking-wider mb-2">
                {tracking.selectedVehicle?.car.licensePlate || '---'}
              </div>
              <div className="mb-2">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: tracking.selectedVehicle ? `${getStatusColor(tracking.selectedVehicle.status)}18` : undefined,
                    color: tracking.selectedVehicle ? getStatusColor(tracking.selectedVehicle.status) : undefined,
                  }}
                >
                  {tracking.selectedVehicle ? getStatusLabel(tracking.selectedVehicle.status) : '-'}
                </span>
              </div>
              <div className="fc-row flex items-center justify-between py-0.5 text-xs">
                <span className="text-text-secondary">{strings.SPEED}</span>
                <span className="text-text font-medium">
                  {tracking.selectedVehicle ? `${Math.round(tracking.selectedVehicle.speedKmh)} km/h` : '-'}
                </span>
              </div>
              <div className="fc-row flex items-center justify-between py-0.5 text-xs">
                <span className="text-text-secondary">{strings.LAST_SEEN}</span>
                <span className="text-text font-medium">{tracking.selectedVehicle?.lastSeenLabel || '-'}</span>
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
