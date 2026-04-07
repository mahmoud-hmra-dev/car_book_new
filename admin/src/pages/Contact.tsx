import React, { useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'

const Contact = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()

  const onLoad = (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <ContactForm user={user} className="" />
        </div>
      </div>
    </Layout>
  )
}

export default Contact
