import React from 'react'
import { Info as InfoIcon } from '@mui/icons-material'

interface InfoBoxProps {
  className?: string
  value: string
}

const InfoBox = ({ className, value }: InfoBoxProps) => (
  <div className={`bg-info/10 border border-info/20 rounded-xl p-4 flex items-start gap-3 text-sm text-info${className ? ` ${className}` : ''}`}>
    <InfoIcon className="shrink-0 !w-5 !h-5" />
    <span>{value}</span>
  </div>
  )

export default InfoBox
