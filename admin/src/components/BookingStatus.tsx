import React from 'react'
import {
  CheckCircle as CheckIcon,
  RemoveCircle as VoidIcon,
  PauseCircle as PendingIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'

interface BookingStatusProps {
  value: bookcarsTypes.BookingStatus
  showIcon?: boolean,
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
}

const iconColorMap: Record<string, string> = {
  void: 'text-text-muted',
  pending: 'text-warning',
  deposit: 'text-success',
  paid: 'text-success',
  paidinfull: 'text-success',
  reserved: 'text-info',
  cancelled: 'text-danger',
}

const badgeStyleMap: Record<string, string> = {
  void: 'bg-border/60 text-text-secondary',
  pending: 'bg-warning/15 text-warning',
  deposit: 'bg-success/15 text-success',
  paid: 'bg-success/15 text-success',
  paidinfull: 'bg-success text-white',
  reserved: 'bg-info/15 text-info',
  cancelled: 'bg-danger/15 text-danger',
}

const getIcon = (value: bookcarsTypes.BookingStatus) => {
  const color = iconColorMap[value?.toLowerCase()] || ''
  const iconCls = `!w-4 !h-4 mr-1 ${color}`

  if ([
    bookcarsTypes.BookingStatus.Deposit,
    bookcarsTypes.BookingStatus.Reserved,
    bookcarsTypes.BookingStatus.Paid,
    bookcarsTypes.BookingStatus.PaidInFull,
  ].includes(value)) {
    return <CheckIcon className={iconCls} />
  }

  if (value === bookcarsTypes.BookingStatus.Void) {
    return <VoidIcon className={iconCls} />
  }

  if (value === bookcarsTypes.BookingStatus.Pending) {
    return <PendingIcon className={iconCls} />
  }

  return <CancelledIcon className={iconCls} />
}

const BookingStatus = ({
  showIcon,
  onClick,
  value
}: BookingStatusProps) => (
  <div
    className="inline-flex flex-row items-center"
    onClick={(e) => {
      if (onClick) {
        onClick(e)
      }
    }}
    role="presentation"
  >
    {showIcon && getIcon(value)}
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeStyleMap[value?.toLowerCase()] || ''}`}>{helper.getBookingStatus(value)}</span>
  </div>
)

export default BookingStatus
