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
  <header className="h-13 bg-white border-b border-border flex items-center px-5 shrink-0 gap-4 max-md:h-12 max-md:px-3 max-md:gap-2">
    {/* Left: title + count */}
    <div className="flex items-center gap-2 shrink-0">
      <h1 className="text-base font-semibold text-text max-md:text-sm">{strings.TRACKING_WORKSPACE}</h1>
      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
        {totalCount}
        {' '}
        {totalCount === 1 ? 'vehicle' : 'vehicles'}
      </span>
    </div>

    {/* Center: search */}
    <div className="flex-1 flex justify-center max-md:hidden">
      <div className="relative w-72">
        <SearchRoundedIcon
          fontSize="small"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          className="w-full h-9 pl-9 pr-4 rounded-full bg-background border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder={strings.SEARCH_CARS}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>

    {/* Right: status + refresh */}
    <div className="flex items-center gap-3 shrink-0">
      <div className="flex items-center gap-1.5 text-xs">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            integrationEnabled
              ? 'bg-success animate-pulse'
              : 'bg-danger'
          }`}
        />
        <span className="text-text-secondary max-sm:hidden">
          {integrationEnabled ? strings.SYSTEM_ONLINE : strings.SYSTEM_OFFLINE}
        </span>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        title={refreshing ? 'Refreshing...' : strings.REFRESH_FLEET}
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshRoundedIcon fontSize="small" className={refreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  </header>
)

export default TrackingTopbar
