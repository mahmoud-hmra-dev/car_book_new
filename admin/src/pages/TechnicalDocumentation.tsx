import React from 'react'
import Layout from '@/components/Layout'
import { strings } from '@/lang/technical-documentation'

const TechnicalDocumentation = () => (
  <Layout strict admin>
    <div className="max-w-[980px] p-5 [&_h1]:mb-3 [&_h2]:mt-6 [&_h2]:mb-2.5 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-5 [&_ul]:ml-[22px] [&_ul]:leading-[1.7] [&_ol]:mb-5 [&_ol]:ml-[22px] [&_ol]:leading-[1.7] rtl:[&_ul]:ml-0 rtl:[&_ul]:mr-[22px] rtl:[&_ol]:ml-0 rtl:[&_ol]:mr-[22px]">
      <h1>{strings.TITLE}</h1>
      <p>{strings.INTRO}</p>

      <section className="border border-border rounded-lg p-4 mb-4 bg-white">
        <h2>{strings.ARCHITECTURE_TITLE}</h2>
        <ul>
          <li>{strings.ARCHITECTURE_ITEM1}</li>
          <li>{strings.ARCHITECTURE_ITEM2}</li>
          <li>{strings.ARCHITECTURE_ITEM3}</li>
          <li>{strings.ARCHITECTURE_ITEM4}</li>
        </ul>
      </section>

      <section className="border border-border rounded-lg p-4 mb-4 bg-white">
        <h2>{strings.MODULES_TITLE}</h2>
        <ul>
          <li>{strings.MODULES_ITEM1}</li>
          <li>{strings.MODULES_ITEM2}</li>
          <li>{strings.MODULES_ITEM3}</li>
          <li>{strings.MODULES_ITEM4}</li>
        </ul>
      </section>

      <section className="border border-border rounded-lg p-4 mb-4 bg-white">
        <h2>{strings.DATA_TITLE}</h2>
        <ul>
          <li>{strings.DATA_ITEM1}</li>
          <li>{strings.DATA_ITEM2}</li>
          <li>{strings.DATA_ITEM3}</li>
        </ul>
      </section>

      <section className="border border-border rounded-lg p-4 mb-4 bg-white">
        <h2>{strings.SECURITY_TITLE}</h2>
        <ul>
          <li>{strings.SECURITY_ITEM1}</li>
          <li>{strings.SECURITY_ITEM2}</li>
          <li>{strings.SECURITY_ITEM3}</li>
          <li>{strings.SECURITY_ITEM4}</li>
        </ul>
      </section>

      <section className="border border-border rounded-lg p-4 mb-4 bg-white">
        <h2>{strings.OPERATIONS_TITLE}</h2>
        <ol>
          <li>{strings.OPERATIONS_ITEM1}</li>
          <li>{strings.OPERATIONS_ITEM2}</li>
          <li>{strings.OPERATIONS_ITEM3}</li>
          <li>{strings.OPERATIONS_ITEM4}</li>
        </ol>
      </section>

      <section className="border border-border rounded-lg p-4 mb-4 bg-white">
        <h2>{strings.TROUBLESHOOTING_TITLE}</h2>
        <ul>
          <li>{strings.TROUBLESHOOTING_ITEM1}</li>
          <li>{strings.TROUBLESHOOTING_ITEM2}</li>
          <li>{strings.TROUBLESHOOTING_ITEM3}</li>
        </ul>
      </section>
    </div>
  </Layout>
)

export default TechnicalDocumentation
