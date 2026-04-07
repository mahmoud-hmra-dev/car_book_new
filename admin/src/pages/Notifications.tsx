import React, { useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import NotificationList from '@/components/NotificationList'

const Notifications = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Notifications</h1>
            <p className="text-sm text-text-muted mt-1">Stay up to date with your latest activity</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <NotificationList user={user} />
        </div>
      </div>
    </Layout>
  )
}

export default Notifications
