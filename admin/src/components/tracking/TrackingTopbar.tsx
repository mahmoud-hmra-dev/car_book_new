import React from 'react'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import { strings } from '@/lang/tracking'

type TrackingTopbarProps = {
  vehicleCount: number
  searchValue: string
  refreshing: boolean
  integrationEnabled: boolean
  alertCount?: number
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onBack: () => void
}

const TrackingTopbar = ({
  vehicleCount,
  searchValue,
  refreshing,
  integrationEnabled,
  alertCount = 0,
  onSearchChange,
  onRefresh,
  onBack,
}: TrackingTopbarProps) => (
  <header id="topbar">
    <div className="tb-left">
      <button type="button" className="tb-back-btn" onClick={onBack} title="Back to dashboard">
        <ArrowBackRoundedIcon fontSize="small" />
      </button>
      <div className="tb-title-group">
        <strong className="tb-title">{strings.TRACKING_WORKSPACE}</strong>
        <span className="tb-subtitle">
          (
          {vehicleCount}
          {' '}
          {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
          )
        </span>
      </div>
    </div>

    <div className="tb-center">
      <div className="tb-search-pill">
        <SearchRoundedIcon fontSize="small" />
        <input
          id="global-search"
          type="text"
          placeholder={strings.SEARCH_CARS}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </div>

    <div className="tb-right">
      <div className={`tb-integration-dot ${integrationEnabled ? 'online' : 'offline'}`}>
        <span className="tb-int-dot" />
        <span>{integrationEnabled ? strings.SYSTEM_ONLINE : strings.SYSTEM_OFFLINE}</span>
      </div>

      {alertCount > 0 && (
        <button type="button" className="tb-icon-btn" title="Alerts">
          <NotificationsNoneRoundedIcon fontSize="small" />
          <span className="tb-alert-badge">{alertCount}</span>
        </button>
      )}

      <button
        type="button"
        className={`tb-icon-btn${refreshing ? ' spinning' : ''}`}
        onClick={onRefresh}
        disabled={refreshing}
        title={refreshing ? 'Refreshing...' : strings.REFRESH_FLEET}
      >
        <RefreshRoundedIcon fontSize="small" />
      </button>
    </div>
  </header>
)

export default TrackingTopbar
