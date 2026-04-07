import React, { useState, useEffect } from 'react'
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'

interface SeatsListProps {
  value?: string
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  onChange?: (value: string) => void
}

const SeatsList = ({
  value: seatsListValue,
  label,
  required,
  variant,
  onChange
}: SeatsListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(seatsListValue === undefined ? '' : seatsListValue)
  }, [seatsListValue])

  const handleChange = (e: SelectChangeEvent<string>) => {
    const _value = e.target.value
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
        <MenuItem value={0}>0</MenuItem>
        <MenuItem value={1}>1</MenuItem>
        <MenuItem value={2}>2</MenuItem>
        <MenuItem value={3}>3</MenuItem>
        <MenuItem value={4}>4</MenuItem>
        <MenuItem value={5}>5</MenuItem>
        <MenuItem value={6}>6</MenuItem>
        <MenuItem value={7}>7</MenuItem>
        <MenuItem value={8}>8</MenuItem>
        <MenuItem value={9}>9</MenuItem>
      </Select>
    </div>
  )
}

export default SeatsList
