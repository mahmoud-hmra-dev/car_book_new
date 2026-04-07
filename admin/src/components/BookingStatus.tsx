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
  void: 'text-[#6E7C86]',
  pending: 'text-[#EF6C00]',
  deposit: 'text-[#3CB371]',
  paid: 'text-[#77BC23]',
  paidinfull: 'text-[#77BC23]',
  reserved: 'text-[#1E88E5]',
  cancelled: 'text-[#E53935]',
}

const badgeStyleMap: Record<string, string> = {
  void: 'bg-[#D9D9D9] text-[#6E7C86]',
  pending: 'bg-[#FBDCC2] text-[#EF6C00]',
  deposit: 'bg-[#CDECDA] text-[#3CB371]',
  paid: 'bg-[#D1F9D1] text-[#77BC23]',
  paidinfull: 'bg-[#77BC23] text-white',
  reserved: 'bg-[#D9E7F4] text-[#1E88E5]',
  cancelled: 'bg-[#FBDFDE] text-[#E53935]',
}

const getIcon = (value: bookcarsTypes.BookingStatus) => {
  const color = iconColorMap[value?.toLowerCase()] || ''
  const iconCls = `max-w-[18px] max-h-[18px] mr-0.5 ${color}`

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
    <span className={`p-[3px] w-[108px] text-center inline-flex h-[22px] text-xs font-normal justify-center items-center rounded-[18px] ${badgeStyleMap[value?.toLowerCase()] || ''}`}>{helper.getBookingStatus(value)}</span>
  </div>
)

export default BookingStatus
