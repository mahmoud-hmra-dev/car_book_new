import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings } from '@/lang/about'
import Layout from '@/components/Layout'

const About = () => {
  const navigate = useNavigate()

  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="flex flex-col flex-1 items-start whitespace-pre-wrap px-5 md:px-[20%] pt-[30px] md:pt-[50px] pb-[120px] text-[15px] text-[#1a1a1a] min-h-screen bg-white [&_h1]:text-4xl [&_h1]:text-[#1a1a1a] [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:text-[#1a1a1a] [&_p]:text-xl [&_p]:text-black [&_p]:mb-10">
        <h1>{strings.TITLE1}</h1>
        <h2>{strings.SUBTITLE1}</h2>
        <p>{strings.CONTENT1}</p>

        <h1>{strings.TITLE2}</h1>
        <h2>{strings.SUBTITLE2}</h2>
        <p>{strings.CONTENT2}</p>

        <Button
          variant="contained"
          className="btn-primary"
          aria-label="Find deal"
          onClick={() => navigate('/pricing')}
        >
          {strings.PRICING}
        </Button>
      </div>

    </Layout>
  )
}

export default About
