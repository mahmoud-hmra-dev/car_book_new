import React from 'react'
import { strings } from '@/lang/tos'
import Layout from '@/components/Layout'

const ToS = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <h1 className="text-2xl font-bold text-text mb-5">{strings.TITLE}</h1>
          <div className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">
            <p>{strings.TOS}</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ToS
