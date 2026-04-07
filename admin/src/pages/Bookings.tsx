import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings } from '@/lang/bookings'
import { strings as headerStrings } from '@/lang/header'
import * as helper from '@/utils/helper'
import BookingList from '@/components/BookingList'
import SupplierFilter from '@/components/SupplierFilter'
import StatusFilter from '@/components/StatusFilter'
import BookingFilter from '@/components/BookingFilter'
import * as SupplierService from '@/services/SupplierService'

const Bookings = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [leftPanel, setLeftPanel] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [statuses, setStatuses] = useState(helper.getBookingStatuses().map((status) => status.value))
  const [filter, setFilter] = useState<bookcarsTypes.Filter | null>()
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [offset, setOffset] = useState(0)
  const col1Ref = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user && user.verified && col1Ref.current) {
      setOffset(col1Ref.current.clientHeight)
    }
  }, [user])

  const handleSupplierFilterChange = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const handleStatusFilterChange = (_statuses: bookcarsTypes.BookingStatus[]) => {
    setStatuses(_statuses)
  }

  const handleBookingFilterSubmit = (_filter: bookcarsTypes.Filter | null) => {
    setFilter(_filter)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      const _admin = helper.admin(_user)
      setUser(_user)
      setAdmin(_admin)
      setLeftPanel(!_admin)
      setLoadingSuppliers(_admin)

      const _allSuppliers = await SupplierService.getAllSuppliers()
      const _suppliers = _admin ? bookcarsHelper.flattenSuppliers(_allSuppliers) : [_user._id ?? '']
      setAllSuppliers(_allSuppliers)
      setSuppliers(_suppliers)
      setLeftPanel(true)
      setLoadingSuppliers(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text">{headerStrings.DASHBOARD}</h1>
              <p className="text-sm text-text-muted mt-1">Manage all bookings and reservations</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 bg-primary text-white h-11 px-6 rounded-xl font-semibold text-sm hover:bg-primary-dark shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5"
              onClick={() => navigate('/create-booking')}
            >
              {strings.NEW_BOOKING}
            </button>
          </div>
          <div ref={col1Ref} className="bg-white rounded-2xl border border-border shadow-sm p-5">
            {leftPanel && (
              <>
                {admin
                  && (
                    <SupplierFilter
                      suppliers={allSuppliers}
                      onChange={handleSupplierFilterChange}
                      className="m-0 bg-transparent border-none"
                    />
                  )}
                <StatusFilter
                  onChange={handleStatusFilterChange}
                  className="m-0 bg-transparent border-none mt-3 pt-3 border-t border-t-border"
                />
                <BookingFilter
                  onSubmit={handleBookingFilterSubmit}
                  language={(user && user.language) || env.DEFAULT_LANGUAGE}
                  className="m-0 bg-transparent border-none mt-3 pt-3 border-t border-t-border"
                  collapse={!env.isMobile}
                />
              </>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-sm min-h-[300px]">
            <BookingList
              containerClassName="bookings"
              offset={offset}
              language={user.language}
              loggedUser={user}
              suppliers={suppliers}
              statuses={statuses}
              filter={filter}
              loading={loadingSuppliers}
              hideDates={env.isMobile}
              checkboxSelection={!env.isMobile}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Bookings
