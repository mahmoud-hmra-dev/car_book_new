import React from 'react'
import { useNavigate } from 'react-router-dom'
import { strings as commonStrings } from '@/lang/common'

interface ErrorProps {
  style?: React.CSSProperties
}

const Error = ({ style }: ErrorProps) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4" style={style || {}}>
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-danger text-4xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-text">{commonStrings.GENERIC_ERROR}</h2>
        <p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-10 px-6 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            {commonStrings.GO_TO_HOME}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Error
