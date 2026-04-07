import React from 'react'
import { Info as InfoIcon } from '@mui/icons-material'

interface InfoBoxProps {
  className?: string
  value: string
}

const InfoBox = ({ className, value }: InfoBoxProps) => (
  <div className={`bg-[#fafafa] my-2.5 border border-[#dadada] rounded-[5px] h-10 flex flex-row items-center justify-center${className ? ` ${className}` : ''}`}>
    <InfoIcon className="shrink-0 ml-2.5" />
    <span className="text-black/60 grow text-[17px] font-bold flex flex-row items-center justify-center -ml-2.5">{value}</span>
  </div>
  )

export default InfoBox
