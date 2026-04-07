import React, { useState, useEffect } from 'react'
import {
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'

interface CarRangeListProps {
  value?: string
  required?: boolean
  label?: string
  variant?: 'filled' | 'standard' | 'outlined'
  onChange?: (value: string) => void
}

const CarRangeList = ({
  value: carRangeValue,
  required,
  label,
  variant,
  onChange
}: CarRangeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(carRangeValue || '')
  }, [carRangeValue])

  const handleChange = (e: SelectChangeEvent<string>) => {
    const _value = e.target.value || ''
    setValue(_value)

    if (onChange) {
      onChange(_value)
    }
  }

  return (
    <div>
      <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${required ? 'text-text after:content-["*"] after:text-danger after:ml-0.5' : 'text-text-muted'}`}>
        {label}
      </label>
      <Select label={label} value={value} onChange={handleChange} variant={variant || 'standard'} required={required} fullWidth>
        <MenuItem value={bookcarsTypes.CarRange.Mini}>{helper.getCarRange(bookcarsTypes.CarRange.Mini)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Midi}>{helper.getCarRange(bookcarsTypes.CarRange.Midi)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Maxi}>{helper.getCarRange(bookcarsTypes.CarRange.Maxi)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Scooter}>{helper.getCarRange(bookcarsTypes.CarRange.Scooter)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Bus}>{helper.getCarRange(bookcarsTypes.CarRange.Bus)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Truck}>{helper.getCarRange(bookcarsTypes.CarRange.Truck)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Caravan}>{helper.getCarRange(bookcarsTypes.CarRange.Caravan)}</MenuItem>
      </Select>
    </div>
  )
}

export default CarRangeList
