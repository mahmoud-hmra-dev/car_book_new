import React from 'react'
import { useNavigate } from 'react-router-dom'
import { strings } from '@/lang/about'
import Layout from '@/components/Layout'

const About = () => {
  const navigate = useNavigate()

  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <div className="whitespace-pre-wrap text-text [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-text [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-text [&_h2]:mb-2 [&_p]:text-base [&_p]:text-text-secondary [&_p]:mb-8 [&_p]:leading-relaxed">
            <h1>{strings.TITLE1}</h1>
            <h2>{strings.SUBTITLE1}</h2>
            <p>{strings.CONTENT1}</p>

            <h1>{strings.TITLE2}</h1>
            <h2>{strings.SUBTITLE2}</h2>
            <p>{strings.CONTENT2}</p>
          </div>

          <div className="flex justify-end mt-6 pt-5 border-t border-border">
            <button
              type="button"
              aria-label="Find deal"
              onClick={() => navigate('/pricing')}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              {strings.PRICING}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default About
