import React from 'react'
import { CircularProgress } from '@mui/material'


interface ProgressProps {
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
}

const Progress = ({ color }: ProgressProps) => (
  <div className="w-full flex flex-col items-center py-2.5">
    <CircularProgress color={color || 'inherit'} size={24} />
  </div>
)

export default Progress
