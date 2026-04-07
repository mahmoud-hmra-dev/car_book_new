import React from 'react'
import { useNavigate } from 'react-router-dom'
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
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-primary hover:text-primary-dark hover:underline text-sm bg-transparent border-none cursor-pointer p-0"
          >
            {commonStrings.GO_TO_HOME}
          </button>
        </p>
      )}
    </div>
  )
}

export default Error
