import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/no-match'
import Layout from '@/components/Layout'

interface NoMatchProps {
  hideHeader?: boolean
}

const NoMatch = ({ hideHeader }: NoMatchProps) => {
  const navigate = useNavigate()

  const noMatch = () => (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-danger text-4xl font-bold">404</span>
        </div>
        <h2 className="text-xl font-bold text-text">{strings.NO_MATCH}</h2>
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

  return hideHeader ? noMatch() : <Layout strict={false}>{noMatch()}</Layout>
}

export default NoMatch
