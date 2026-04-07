import React from 'react'
import { strings } from '@/lang/tos'
import Layout from '@/components/Layout'

const ToS = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="flex flex-col flex-1 items-center whitespace-pre-wrap px-5 md:px-[20%] pt-[30px] md:pt-[50px] text-[15px] text-[#121212] min-h-screen">
        <h1>{strings.TITLE}</h1>
        <p>{strings.TOS}</p>
      </div>
    </Layout>
  )
}

export default ToS
