import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
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
        <div className="bookings flex flex-col gap-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm px-6 py-5 flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-2xl font-bold text-text m-0 leading-tight">{headerStrings.DASHBOARD}</h1>
            <Button variant="contained" className="btn-primary !rounded-lg !normal-case !font-semibold !text-sm !px-5 !py-2 !shadow-none" size="small" onClick={() => navigate('/create-booking')}>
              {strings.NEW_BOOKING}
            </Button>
          </div>
          <div ref={col1Ref} className="col-1 bg-white rounded-xl shadow-sm px-6 py-5">
            {leftPanel && (
              <>
                {admin
                  && (
                    <SupplierFilter
                      suppliers={allSuppliers}
                      onChange={handleSupplierFilterChange}
                      className="cl-supplier-filter m-0 bg-transparent border-none [&_label.accordion]:bg-transparent"
                    />
                  )}
                <StatusFilter
                  onChange={handleStatusFilterChange}
                  className="cl-status-filter m-0 bg-transparent border-none [&_label.accordion]:bg-transparent mt-3 pt-3 border-t border-t-[var(--bc-gray-100)]"
                />
                <BookingFilter
                  onSubmit={handleBookingFilterSubmit}
                  language={(user && user.language) || env.DEFAULT_LANGUAGE}
                  className="cl-booking-filter m-0 bg-transparent border-none [&_label.accordion]:bg-transparent mt-3 pt-3 border-t border-t-[var(--bc-gray-100)] [&_.panel]:px-0 [&_.panel-collapse]:px-0"
                  collapse={!env.isMobile}
                />
              </>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm min-h-[300px]">
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
