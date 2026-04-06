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
    <div className="flex flex-col h-full">
      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-2 p-3 mx-3 mt-3 bg-primary/5 rounded-lg shrink-0 max-sm:mx-2">
        <div className="text-center">
          <div className="text-base font-bold text-primary max-sm:text-sm">{counts.total}</div>
          <div className="text-[10px] text-text-muted mt-1">Total</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-success max-sm:text-sm">{onlineCount}</div>
          <div className="text-[10px] text-text-muted mt-1">{strings.ONLINE_DEVICES}</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-info max-sm:text-sm">{counts.moving}</div>
          <div className="text-[10px] text-text-muted mt-1">{strings.STATUS_MOVING}</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-warning max-sm:text-sm">{alertCount}</div>
          <div className="text-[10px] text-text-muted mt-1">Alerts</div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pills.map((pill) => (
          <button
            type="button"
            key={pill.id}
            onClick={() => onFilterChange(pill.id)}
            className={`shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
              activeFilter === pill.id
                ? 'bg-primary text-white'
                : 'bg-transparent border border-border text-text-secondary hover:border-primary/40 hover:text-text'
            }`}
          >
            {pill.label}
            <span className={`text-[10px] font-medium ${activeFilter === pill.id ? 'opacity-100' : 'opacity-80'}`}>
              {getFilterCount(counts, pill.id)}
            </span>
          </button>
        ))}
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto">
        {vehicles.length === 0
          ? <div className="py-10 px-4 text-center text-text-muted text-sm">{strings.NO_DATA}</div>
          : vehicles.map((vehicle) => (
            <button
              type="button"
              key={vehicle.car._id}
              onClick={() => onSelectCar(vehicle.car._id)}
              className={`flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-primary/5 w-full text-left appearance-none bg-transparent border-l-3 ${
                selectedCarId === vehicle.car._id
                  ? 'bg-primary/5 border-l-primary'
                  : 'border-l-transparent'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getStatusColor(vehicle.status) }}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text truncate">{vehicle.car.name}</span>
                  <span
                    className="text-xs font-medium shrink-0"
                    style={{ color: vehicle.speedKmh > 0 ? '#10b981' : undefined }}
                  >
                    {Math.round(vehicle.speedKmh)}
                    {' '}
                    km/h
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-muted min-w-0 flex items-center gap-1 truncate">
                    <span className="tracking-wide">{vehicle.car.licensePlate || '---'}</span>
                    {vehicle.supplierName && (
                      <>
                        <span className="text-border text-[8px]">&bull;</span>
                        <span className="truncate">{vehicle.supplierName}</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-text-muted shrink-0 whitespace-nowrap">{vehicle.lastSeenLabel}</span>
                </div>
              </div>
            </button>
          ))}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-3 border-t border-border shrink-0">
        <button
          type="button"
          onClick={onExport}
          className="flex-1 h-8 text-xs font-medium rounded-lg border border-border flex items-center justify-center gap-1.5 text-text-secondary hover:border-primary hover:text-primary transition-colors"
        >
          <DownloadRoundedIcon sx={{ fontSize: 16 }} />
          <span>Export</span>
        </button>
        <button
          type="button"
          onClick={onOpenGeofenceManager}
          className="flex-1 h-8 text-xs font-medium rounded-lg border border-border flex items-center justify-center gap-1.5 text-text-secondary hover:border-primary hover:text-primary transition-colors"
        >
          <FmdGoodRoundedIcon sx={{ fontSize: 16 }} />
          <span>{strings.GEOFENCE_MANAGER}</span>
        </button>
      </div>
    </div>
  )
}

export default FleetPanel
