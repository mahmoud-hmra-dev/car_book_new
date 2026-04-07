import React from 'react'
import { strings } from '@/lang/pricing'
import Layout from '@/components/Layout'

const Pricing = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-text mb-8 text-center">{strings.TITLE}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-border p-6 text-center hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-semibold text-text mb-2">{strings.FREE_PLAN}</h2>
            <p className="text-3xl font-bold text-primary mb-4">{strings.FREE_PLAN_PRICE}</p>
            <ul className="list-none p-0 space-y-2 text-sm text-text-secondary">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_2}</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border-2 border-primary p-6 text-center shadow-lg relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">Popular</div>
            <h2 className="text-lg font-semibold text-text mb-2">{strings.BASIC_PLAN}</h2>
            <p className="text-3xl font-bold text-primary mb-4">{strings.BASIC_PLAN_PRICE}</p>
            <ul className="list-none p-0 space-y-2 text-sm text-text-secondary">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_3}</li>
              <li>{strings.FEATURE_4}</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-border p-6 text-center hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-semibold text-text mb-2">{strings.PREMIUM_PLAN}</h2>
            <p className="text-3xl font-bold text-primary mb-4">{strings.CONTACT_US}</p>
            <ul className="list-none p-0 space-y-2 text-sm text-text-secondary">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_5}</li>
              <li>{strings.FEATURE_4}</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Pricing
