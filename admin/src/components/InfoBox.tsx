import React from 'react'
import { Info as InfoIcon } from '@mui/icons-material'

interface InfoBoxProps {
  className?: string
  value: string
}

const InfoBox = ({ className, value }: InfoBoxProps) => (
  <div className={`bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 my-2.5 flex flex-row items-center gap-3${className ? ` ${className}` : ''}`}>
    <InfoIcon className="shrink-0 text-primary !w-5 !h-5" />
    <span className="text-text grow text-sm font-semibold">{value}</span>
  </div>
  )

export default InfoBox
