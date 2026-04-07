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
    void: 'bg-[#D9D9D9] !text-[#6E7C86]',
    pending: 'bg-[#FBDCC2] !text-[#EF6C00]',
    deposit: 'bg-[#CDECDA] !text-[#3CB371]',
    paid: 'bg-[#D1F9D1] !text-[#77BC23]',
    paidinfull: 'bg-[#77BC23] !text-white',
    reserved: 'bg-[#D9E7F4] !text-[#1E88E5]',
    cancelled: 'bg-[#FBDFDE] !text-[#E53935]',
  }

  const getStatusClass = (s: string) => statusStyles[s.toLowerCase()] || ''

  return (
    <div style={style || {}}>
      {disabled ? (
        <span className={`inline-block text-center font-extralight p-0.5 opacity-93 ${getStatusClass(value)}`} style={{ marginTop: 5 }}>
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
              <span className={`inline-block text-center font-extralight p-0.5 opacity-93 ${getStatusClass(_value)}`}>
                {helper.getBookingStatus(_value as bookcarsTypes.BookingStatus)}
              </span>
            )}
          >
            <MenuItem value={bookcarsTypes.BookingStatus.Void} className={`!p-2 !text-center !font-extralight !text-white !m-px !flex !justify-center !items-center hover:!opacity-93 ${getStatusClass('void')}`}>
              {commonStrings.BOOKING_STATUS_VOID}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Pending} className={`!p-2 !text-center !font-extralight !text-white !m-px !flex !justify-center !items-center hover:!opacity-93 ${getStatusClass('pending')}`}>
              {commonStrings.BOOKING_STATUS_PENDING}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Deposit} className={`!p-2 !text-center !font-extralight !text-white !m-px !flex !justify-center !items-center hover:!opacity-93 ${getStatusClass('deposit')}`}>
              {commonStrings.BOOKING_STATUS_DEPOSIT}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Paid} className={`!p-2 !text-center !font-extralight !text-white !m-px !flex !justify-center !items-center hover:!opacity-93 ${getStatusClass('paid')}`}>
              {commonStrings.BOOKING_STATUS_PAID}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.PaidInFull} className={`!p-2 !text-center !font-extralight !text-white !m-px !flex !justify-center !items-center hover:!opacity-93 ${getStatusClass('paidinfull')}`}>
              {commonStrings.BOOKING_STATUS_PAID_IN_FULL}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Reserved} className={`!p-2 !text-center !font-extralight !text-white !m-px !flex !justify-center !items-center hover:!opacity-93 ${getStatusClass('reserved')}`}>
              {commonStrings.BOOKING_STATUS_RESERVED}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Cancelled} className={`!p-2 !text-center !font-extralight !text-white !m-px !flex !justify-center !items-center hover:!opacity-93 ${getStatusClass('cancelled')}`}>
              {commonStrings.BOOKING_STATUS_CANCELLED}
            </MenuItem>
          </Select>
        </>
      )}
    </div>
  )
}

export default StatusList
