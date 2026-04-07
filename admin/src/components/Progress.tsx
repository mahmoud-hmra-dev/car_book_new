import React from 'react'
import { CircularProgress } from '@mui/material'


interface ProgressProps {
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
}

const Progress = ({ color }: ProgressProps) => (
  <div className="flex items-center justify-center py-8">
    <CircularProgress color={color || 'inherit'} size={28} />
  </div>
)

export default Progress
