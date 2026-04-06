import React from 'react'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import FmdGoodRoundedIcon from '@mui/icons-material/FmdGoodRounded'
import { strings } from '@/lang/tracking'
import * as bookcarsTypes from ':bookcars-types'
import type { FleetCounts, FleetVehicle } from './types'
import { getStatusColor } from './utils'

type FleetPanelProps = {
  vehicles: FleetVehicle[]
  counts: FleetCounts
  selectedCarId: string
  activeFilter: 'all' | bookcarsTypes.TraccarFleetStatus
  onFilterChange: (status: 'all' | bookcarsTypes.TraccarFleetStatus) => void
  onSelectCar: (carId: string) => void
  onExport: () => void
  onOpenGeofenceManager: () => void
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

const getFilterCount = (
  counts: FleetCounts,
  filterId: 'all' | bookcarsTypes.TraccarFleetStatus,
): number => {
  switch (filterId) {
    case 'all':
      return counts.total
    case 'moving':
      return counts.moving
    case 'idle':
      return counts.idle
    case 'stopped':
      return counts.stopped
    case 'stale':
      return counts.stale
    case 'noGps':
      return counts.noGps
    case 'offline':
      return counts.offline
    case 'unlinked':
      return counts.unlinked
    default:
      return 0
  }
}

const FleetPanel = ({
  vehicles,
  counts,
  selectedCarId,
  activeFilter,
  onFilterChange,
  onSelectCar,
  onExport,
  onOpenGeofenceManager,
}: FleetPanelProps) => {
  const activeCars = counts.moving + counts.idle
  const alertCars = counts.stale + counts.noGps

  const chips: Array<{ id: 'all' | bookcarsTypes.TraccarFleetStatus, label: string }> = [
    { id: 'all', label: strings.ALL_STATUSES },
    { id: 'moving', label: strings.STATUS_MOVING },
    { id: 'idle', label: strings.STATUS_IDLE },
    { id: 'stopped', label: strings.STATUS_STOPPED },
    { id: 'offline', label: strings.STATUS_OFFLINE },
    { id: 'stale', label: strings.STATUS_STALE },
    { id: 'noGps', label: strings.STATUS_NO_GPS },
    { id: 'unlinked', label: strings.STATUS_UNLINKED },
  ]

  return (
    <div className="sb-view" id="fleet-view">
      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-val kpi-purple">{counts.total}</div>
          <div className="kpi-card-label">vehicles</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-val kpi-green">{activeCars}</div>
          <div className="kpi-card-label">{strings.ONLINE_DEVICES.toLowerCase()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-val kpi-blue">{counts.moving}</div>
          <div className="kpi-card-label">{strings.STATUS_MOVING.toLowerCase()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-val kpi-amber">{alertCars}</div>
          <div className="kpi-card-label">alerts</div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="sb-filters">
        <div className="filter-chips" id="filter-chips">
          {chips.map((chip) => (
            <button
              type="button"
              key={chip.id}
              className={`chip${activeFilter === chip.id ? ' active' : ''}`}
              onClick={() => onFilterChange(chip.id)}
            >
              {chip.label}
              <span className="chip-count">{getFilterCount(counts, chip.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle List */}
      <div id="fleet-list">
        {vehicles.length === 0
          ? (
            <div className="empty-state">
              <p>{strings.NO_DATA}</p>
            </div>
            )
          : vehicles.map((vehicle) => (
            <button
              type="button"
              key={vehicle.car._id}
              className={`car-card-v2${selectedCarId === vehicle.car._id ? ' selected' : ''}`}
              onClick={() => onSelectCar(vehicle.car._id)}
            >
              <span
                className="cc-status-dot"
                style={{ background: getStatusColor(vehicle.status) }}
              />
              <div className="cc-body">
                <div className="cc-top-row">
                  <span className="cc-name">{vehicle.car.name}</span>
                  <span
                    className="cc-speed"
                    style={{ color: vehicle.speedKmh > 0 ? getStatusColor(vehicle.status) : undefined }}
                  >
                    {Math.round(vehicle.speedKmh)}
                    {' '}
                    km/h
                  </span>
                </div>
                <div className="cc-mid-row">
                  <span className="cc-plate">{vehicle.car.licensePlate || '---'}</span>
                  {vehicle.supplierName && (
                    <>
                      <span className="cc-sep">&bull;</span>
                      <span className="cc-supplier">{vehicle.supplierName}</span>
                    </>
                  )}
                </div>
                <div className="cc-bottom-row">
                  <span className="cc-badge" style={{ color: getStatusColor(vehicle.status) }}>
                    {getStatusLabel(vehicle.status)}
                  </span>
                  <span className="cc-seen">
                    {strings.LAST_SEEN}
                    :
                    {' '}
                    {vehicle.lastSeenLabel}
                  </span>
                </div>
              </div>
            </button>
          ))}
      </div>

      {/* Footer */}
      <div className="sb-footer">
        <button type="button" className="sb-footer-btn" onClick={onExport}>
          <DownloadRoundedIcon fontSize="small" />
          <span>Export CSV</span>
        </button>
        <button type="button" className="sb-footer-btn" onClick={onOpenGeofenceManager}>
          <FmdGoodRoundedIcon fontSize="small" />
          <span>{strings.GEOFENCE_MANAGER}</span>
        </button>
      </div>
    </div>
  )
}

export default FleetPanel
