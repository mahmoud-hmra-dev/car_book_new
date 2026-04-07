import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/bookings'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'
import VehicleScheduler from '@/components/VehicleScheduler'
import SupplierFilter from '@/components/SupplierFilter'
import StatusFilter from '@/components/StatusFilter'
import VehicleSchedulerFilter from '@/components/VehicleSchedulerFilter'

import Layout from '@/components/Layout'


const Scheduler = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [leftPanel, setLeftPanel] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [statuses, setStatuses] = useState(helper.getBookingStatuses().map((status) => status.value))
  const [filter, setFilter] = useState<bookcarsTypes.Filter | null>()

  const handleSupplierFilterChange = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const handleStatusFilterChange = (_statuses: bookcarsTypes.BookingStatus[]) => {
    setStatuses(_statuses)
  }

  const handleVehicleSchedulerFilterSubmit = (_filter: bookcarsTypes.Filter | null) => {
    setFilter(_filter)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      const _admin = helper.admin(_user)
      setUser(_user)
      setAdmin(_admin)
      setLeftPanel(!_admin)

      const _allSuppliers = await SupplierService.getAllSuppliers()
      const _suppliers = _admin ? bookcarsHelper.flattenSuppliers(_allSuppliers) : [_user._id ?? '']
      setAllSuppliers(_allSuppliers)
      setSuppliers(_suppliers)
      setLeftPanel(true)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && suppliers && (
        <div className="absolute bottom-0 right-0 left-0 top-14 max-md:top-14 max-md:overflow-y-auto md:top-16">
          <div className="max-md:flex max-md:flex-col max-md:items-center md:absolute md:top-0 md:bottom-0 md:left-0 md:w-[320px] md:pt-3 md:pl-3 md:bg-[#fefefe] md:overflow-auto">
            {leftPanel && (
              <>
                <Button
                  variant="contained"
                  className="btn-primary cl-new-booking max-md:w-[calc(100%-20px)] max-md:max-w-[480px] max-md:mx-2.5 max-md:mt-[15px] max-md:mb-[5px] md:w-[290px] md:ml-[5px]"
                  size="small"
                  onClick={() => navigate('/create-booking')}
                >
                  {strings.NEW_BOOKING}
                </Button>
                {admin
                  && (
                    <SupplierFilter
                      suppliers={allSuppliers}
                      onChange={handleSupplierFilterChange}
                      className="cl-supplier-filter max-md:mx-2.5 max-md:my-[5px] max-md:bg-white max-md:max-w-[480px] max-md:w-[calc(100%-20px)] md:mx-0 md:my-2.5 md:mr-2.5 md:bg-[#fafafa] [&_label.accordion]:max-md:bg-white [&_label.accordion]:md:bg-[#fafafa]"
                    />
                  )}
                <StatusFilter
                  onChange={handleStatusFilterChange}
                  className="cl-status-filter max-md:mx-2.5 max-md:my-[5px] max-md:bg-white max-md:max-w-[480px] max-md:w-[calc(100%-20px)] md:mx-0 md:my-2.5 md:mr-2.5 md:mb-2.5 md:bg-[#fafafa] [&_label.accordion]:max-md:bg-white [&_label.accordion]:md:bg-[#fafafa]"
                />
                <VehicleSchedulerFilter
                  onSubmit={handleVehicleSchedulerFilterSubmit}
                  className="cl-scheduler-filter max-md:mx-2.5 max-md:my-[5px] max-md:bg-white max-md:max-w-[480px] max-md:w-[calc(100%-20px)] md:mx-0 md:my-2.5 md:mr-2.5 md:mb-2.5 md:bg-[#fafafa] [&_label.accordion]:max-md:bg-white [&_label.accordion]:md:bg-[#fafafa] [&_.panel]:px-[15px] [&_.panel-collapse]:px-[15px]"
                  collapse={!env.isMobile}
                />
              </>
            )}
          </div>
          <div className="max-md:flex md:absolute md:top-0 md:right-0 md:bottom-0 md:left-[320px]">
            <VehicleScheduler
              suppliers={suppliers}
              statuses={statuses}
              filter={filter!}
              language={user.language!}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Scheduler
