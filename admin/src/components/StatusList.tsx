import React, { useState, useEffect, CSSProperties } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'


interface StatusListProps {
  value?: string
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  disabled?: boolean
  style?: CSSProperties
  onChange?: (value: bookcarsTypes.BookingStatus) => void
}

const StatusList = ({
  value: statusListValue,
  label,
  required,
  variant,
  disabled,
  style,
  onChange
}: StatusListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (statusListValue && statusListValue !== value) {
      setValue(statusListValue)
    }
  }, [statusListValue, value])

  const handleChange = (e: SelectChangeEvent<string>) => {
    setValue(e.target.value)

    if (onChange) {
      onChange(e.target.value as bookcarsTypes.BookingStatus)
    }
  }

  const statusStyles: Record<string, string> = {
    void: 'bg-border/60 !text-text-secondary',
    pending: 'bg-warning/15 !text-warning',
    deposit: 'bg-success/15 !text-success',
    paid: 'bg-success/15 !text-success',
    paidinfull: 'bg-success !text-white',
    reserved: 'bg-info/15 !text-info',
    cancelled: 'bg-danger/15 !text-danger',
  }

  const getStatusClass = (s: string) => statusStyles[s.toLowerCase()] || ''

  return (
    <div style={style || {}}>
      {disabled ? (
        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${getStatusClass(value)}`}>
          {helper.getBookingStatus(value as bookcarsTypes.BookingStatus)}
        </span>
      ) : (
        <>
          <InputLabel className={required ? 'required' : ''}>{label}</InputLabel>
          <Select
            label={label}
            value={value}
            onChange={handleChange}
            variant={variant || 'standard'}
            required={required}
            fullWidth
            renderValue={(_value) => (
              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusClass(_value)}`}>
                {helper.getBookingStatus(_value as bookcarsTypes.BookingStatus)}
              </span>
            )}
          >
            <MenuItem value={bookcarsTypes.BookingStatus.Void} className={`!p-2 !text-center !font-semibold !m-px !flex !justify-center !items-center !rounded-md hover:!opacity-90 ${getStatusClass('void')}`}>
              {commonStrings.BOOKING_STATUS_VOID}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Pending} className={`!p-2 !text-center !font-semibold !m-px !flex !justify-center !items-center !rounded-md hover:!opacity-90 ${getStatusClass('pending')}`}>
              {commonStrings.BOOKING_STATUS_PENDING}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Deposit} className={`!p-2 !text-center !font-semibold !m-px !flex !justify-center !items-center !rounded-md hover:!opacity-90 ${getStatusClass('deposit')}`}>
              {commonStrings.BOOKING_STATUS_DEPOSIT}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Paid} className={`!p-2 !text-center !font-semibold !m-px !flex !justify-center !items-center !rounded-md hover:!opacity-90 ${getStatusClass('paid')}`}>
              {commonStrings.BOOKING_STATUS_PAID}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.PaidInFull} className={`!p-2 !text-center !font-semibold !m-px !flex !justify-center !items-center !rounded-md hover:!opacity-90 ${getStatusClass('paidinfull')}`}>
              {commonStrings.BOOKING_STATUS_PAID_IN_FULL}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Reserved} className={`!p-2 !text-center !font-semibold !m-px !flex !justify-center !items-center !rounded-md hover:!opacity-90 ${getStatusClass('reserved')}`}>
              {commonStrings.BOOKING_STATUS_RESERVED}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Cancelled} className={`!p-2 !text-center !font-semibold !m-px !flex !justify-center !items-center !rounded-md hover:!opacity-90 ${getStatusClass('cancelled')}`}>
              {commonStrings.BOOKING_STATUS_CANCELLED}
            </MenuItem>
          </Select>
        </>
      )}
    </div>
  )
}

export default StatusList
