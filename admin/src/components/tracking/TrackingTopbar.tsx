import React from 'react'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { strings } from '@/lang/tracking'

type TrackingTopbarProps = {
  totalCount: number
  searchValue: string
  refreshing: boolean
  integrationEnabled: boolean
  onSearchChange: (value: string) => void
  onRefresh: () => void
}

const TrackingTopbar = ({
  totalCount,
  searchValue,
  refreshing,
  integrationEnabled,
  onSearchChange,
  onRefresh,
}: TrackingTopbarProps) => (
  <header className="tracking-header">
    <div className="th-left">
      <span className="th-title">{strings.TRACKING_WORKSPACE}</span>
      <span className="th-badge">
        (
        {totalCount}
        {' '}
        {totalCount === 1 ? 'vehicle' : 'vehicles'}
        )
      </span>
    </div>

    <div className="th-center">
      <div className="th-search">
        <SearchRoundedIcon fontSize="small" />
        <input
          type="text"
          placeholder={strings.SEARCH_CARS}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>

    <div className="th-right">
      <div className={`th-status ${integrationEnabled ? 'online' : 'offline'}`}>
        <span className="th-status-dot" />
        <span>{integrationEnabled ? strings.SYSTEM_ONLINE : strings.SYSTEM_OFFLINE}</span>
      </div>

      <button
        type="button"
        className={`th-refresh-btn${refreshing ? ' spinning' : ''}`}
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
