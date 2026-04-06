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
  const onlineCount = counts.moving + counts.idle
  const alertCount = counts.stale + counts.noGps

  const pills: Array<{ id: 'all' | bookcarsTypes.TraccarFleetStatus, label: string }> = [
    { id: 'all', label: strings.ALL_STATUSES },
    { id: 'moving', label: strings.STATUS_MOVING },
    { id: 'idle', label: strings.STATUS_IDLE },
    { id: 'stopped', label: strings.STATUS_STOPPED },
    { id: 'offline', label: strings.STATUS_OFFLINE },
    { id: 'stale', label: strings.STATUS_STALE },
  ]

  return (
    <>
      {/* Stats Strip */}
      <div className="fp-stats-strip">
        <div className="fp-stat">
          <span className="fp-stat-num purple">{counts.total}</span>
          <span className="fp-stat-label">Total</span>
        </div>
        <div className="fp-stat">
          <span className="fp-stat-num green">{onlineCount}</span>
          <span className="fp-stat-label">{strings.ONLINE_DEVICES}</span>
        </div>
        <div className="fp-stat">
          <span className="fp-stat-num blue">{counts.moving}</span>
          <span className="fp-stat-label">{strings.STATUS_MOVING}</span>
        </div>
        <div className="fp-stat">
          <span className="fp-stat-num amber">{alertCount}</span>
          <span className="fp-stat-label">Alerts</span>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="fp-filters">
        {pills.map((pill) => (
          <button
            type="button"
            key={pill.id}
            className={`fp-pill${activeFilter === pill.id ? ' active' : ''}`}
            onClick={() => onFilterChange(pill.id)}
          >
            {pill.label}
            <span className="fp-pill-count">{getFilterCount(counts, pill.id)}</span>
          </button>
        ))}
      </div>

      {/* Vehicle List */}
      <div className="fp-vehicle-list">
        {vehicles.length === 0
          ? <div className="fp-empty">{strings.NO_DATA}</div>
          : vehicles.map((vehicle) => (
            <button
              type="button"
              key={vehicle.car._id}
              className={`vehicle-card${selectedCarId === vehicle.car._id ? ' selected' : ''}`}
              onClick={() => onSelectCar(vehicle.car._id)}
            >
              <span
                className="vc-dot"
                style={{ background: getStatusColor(vehicle.status) }}
              />
              <div className="vc-body">
                <div className="vc-row-top">
                  <span className="vc-name">{vehicle.car.name}</span>
                  <span
                    className="vc-speed"
                    style={{ color: vehicle.speedKmh > 0 ? '#10b981' : undefined }}
                  >
                    {Math.round(vehicle.speedKmh)}
                    {' '}
                    km/h
                  </span>
                </div>
                <div className="vc-row-bottom">
                  <span className="vc-meta">
                    <span className="vc-plate">{vehicle.car.licensePlate || '---'}</span>
                    {vehicle.supplierName && (
                      <>
                        <span className="vc-sep">&bull;</span>
                        <span className="vc-supplier">{vehicle.supplierName}</span>
                      </>
                    )}
                  </span>
                  <span className="vc-seen">{vehicle.lastSeenLabel}</span>
                </div>
              </div>
            </button>
          ))}
      </div>

      {/* Footer */}
      <div className="fp-footer">
        <button type="button" className="fp-footer-btn" onClick={onExport}>
          <DownloadRoundedIcon sx={{ fontSize: 16 }} />
          <span>Export</span>
        </button>
        <button type="button" className="fp-footer-btn" onClick={onOpenGeofenceManager}>
          <FmdGoodRoundedIcon sx={{ fontSize: 16 }} />
          <span>{strings.GEOFENCE_MANAGER}</span>
        </button>
      </div>
    </>
  )
}

export default FleetPanel
