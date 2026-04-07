import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'

interface ErrorProps {
  message: string
  style?: React.CSSProperties
  homeLink?: boolean
}

const Error = ({ message, style, homeLink }: ErrorProps) => {
  const navigate = useNavigate()

  return (
    <div style={style || {}}>
      <div className="flex items-center gap-2 text-danger text-sm py-2">
        <span>{message}</span>
      </div>
      {homeLink && (
        <p>
          <Button variant="text" onClick={() => navigate('/')} className="text-primary hover:underline text-sm normal-case">{commonStrings.GO_TO_HOME}</Button>
        </p>
      )}
    </div>
  )
}

export default Error
