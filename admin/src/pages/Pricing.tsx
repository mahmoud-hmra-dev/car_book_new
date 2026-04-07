import React from 'react'
import { Paper } from '@mui/material'
import { strings } from '@/lang/pricing'
import Layout from '@/components/Layout'

const Pricing = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="flex flex-col flex-1 justify-center items-center">
        <h1>{strings.TITLE}</h1>

        <div className="flex flex-col md:flex-row justify-center items-center flex-wrap my-[30px] md:my-[100px]">
          <Paper className="w-[360px] md:w-[260px] min-h-[300px] md:mt-5 md:mr-[50px] p-5 my-[30px] md:my-0" elevation={10}>
            <h2 className="text-center capitalize text-[#121212]">{strings.FREE_PLAN}</h2>
            <p className="text-center text-2xl text-[#121212]">{strings.FREE_PLAN_PRICE}</p>
            <ul className="list-none p-0 [&_li]:py-1.5 [&_li]:text-center [&_li]:text-[#444]">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_2}</li>
            </ul>
          </Paper>

          <Paper className="w-[360px] md:w-[260px] min-h-[300px] md:mt-5 md:mr-[50px] p-5 my-[30px] md:my-0" elevation={10}>
            <h2 className="text-center capitalize text-[#121212]">{strings.BASIC_PLAN}</h2>
            <p className="text-center text-2xl text-[#121212]">{strings.BASIC_PLAN_PRICE}</p>
            <ul className="list-none p-0 [&_li]:py-1.5 [&_li]:text-center [&_li]:text-[#444]">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_3}</li>
              <li>{strings.FEATURE_4}</li>
            </ul>
          </Paper>

          <Paper className="w-[360px] md:w-[260px] min-h-[300px] md:mt-5 md:mr-[50px] p-5 my-[30px] md:my-0" elevation={10}>
            <h2 className="text-center capitalize text-[#121212]">{strings.PREMIUM_PLAN}</h2>
            <p className="text-center text-2xl text-[#121212]">{strings.CONTACT_US}</p>
            <ul className="list-none p-0 [&_li]:py-1.5 [&_li]:text-center [&_li]:text-[#444]">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_5}</li>
              <li>{strings.FEATURE_4}</li>
            </ul>
          </Paper>

        </div>
      </div>
    </Layout>
  )
}

export default Pricing
