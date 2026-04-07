import React from 'react'

interface InfoBoxProps {
  className?: string
  value: string
}

const InfoBox = ({ className, value }: InfoBoxProps) => (
  <div className={`bg-info/10 border border-info/20 rounded-xl p-4 flex items-start gap-3 text-sm text-info${className ? ` ${className}` : ''}`}>
    <svg className="shrink-0 w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
    <span>{value}</span>
  </div>
)

export default InfoBox
