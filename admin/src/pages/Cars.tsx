import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CircularProgress } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import { strings } from '@/lang/cars'
import { strings as headerStrings } from '@/lang/header'
import { strings as commonStrings } from '@/lang/common'
import * as SupplierService from '@/services/SupplierService'
import Layout from '@/components/Layout'
import Search from '@/components/Search'
import SupplierFilter from '@/components/SupplierFilter'
import CarSpecsFilter from '@/components/CarSpecsFilter'
import CarTypeFilter from '@/components/CarTypeFilter'
import GearboxFilter from '@/components/GearboxFilter'
import MileageFilter from '@/components/MileageFilter'
import FuelPolicyFilter from '@/components/FuelPolicyFilter'
import DepositFilter from '@/components/DepositFilter'
import AvailabilityFilter from '@/components/AvailabilityFilter'
import CarList from '@/components/CarList'

import CarRangeFilter from '@/components/CarRangeFilter'
import CarMultimediaFilter from '@/components/CarMultimediaFilter'
import CarRatingFilter from '@/components/CarRatingFilter'
import CarSeatsFilter from '@/components/CarSeatsFilter'

const Cars = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [carSpecs, setCarSpecs] = useState<bookcarsTypes.CarSpecs>({})
  const [carType, setCarType] = useState<string[]>(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState<string[]>([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState<string[]>([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [availability, setAvailability] = useState<string[]>([bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable])
  const [fuelPolicy, setFuelPolicy] = useState(bookcarsHelper.getAllFuelPolicies())
  const [deposit, setDeposit] = useState(-1)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)

  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [multimedia, setMultimedia] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [rating, setRating] = useState(-1)
  const [seats, setSeats] = useState(-1)

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const handleCarListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Car> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleCarDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSuppliers(newSuppliers)
  }

  const handleRatingFilterChange = (value: number) => {
    setRating(value)
  }

  const handleRangeFilterChange = (value: bookcarsTypes.CarRange[]) => {
    setRanges(value)
  }

  const handleMultimediaFilterChange = (value: bookcarsTypes.CarMultimedia[]) => {
    setMultimedia(value)
  }

  const handleSeatsFilterChange = (value: number) => {
    setSeats(value)
  }

  const handleCarSpecsFilterChange = (value: bookcarsTypes.CarSpecs) => {
    setCarSpecs(value)
  }

  const handleCarTypeFilterChange = (values: string[]) => {
    setCarType(values)
  }

  const handleGearboxFilterChange = (values: string[]) => {
    setGearbox(values)
  }

  const handleMileageFilterChange = (values: string[]) => {
    setMileage(values)
  }

  const handleFuelPolicyFilterChange = (values: bookcarsTypes.FuelPolicy[]) => {
    setFuelPolicy(values)
  }

  const handleDepositFilterChange = (value: number) => {
    setDeposit(value)
  }

  const handleAvailabilityFilterChange = (values: string[]) => {
    setAvailability(values)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setLanguage(_user?.language as string)
    const _isAdmin = helper.admin(_user)
    setAdmin(_isAdmin)

    if (_isAdmin) {
      const _allSuppliers = await SupplierService.getAllSuppliers()
      const _suppliers = bookcarsHelper.flattenSuppliers(_allSuppliers)
      setAllSuppliers(_allSuppliers)
      setSuppliers(_suppliers)
    } else {
      const supplierId = (_user && _user._id) as string
      setSuppliers([supplierId])
    }

    setLoadingSuppliers(false)
    setLoading(false)
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="cars flex flex-col gap-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm px-6 py-5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text m-0 leading-tight">
                {headerStrings.CARS}
                {rowCount > 0 && (
                  <span className="text-sm font-normal text-text-secondary ml-3">
                    {`(${bookcarsHelper.formatNumber(rowCount, language)} ${rowCount > 1 ? commonStrings.CARS : commonStrings.CAR})`}
                  </span>
                )}
              </h1>
            </div>
            <Button type="submit" variant="contained" className="btn-primary !rounded-lg !normal-case !font-semibold !text-sm !px-5 !py-2 !shadow-none" size="small" onClick={() => navigate('/create-car')}>
              {strings.NEW_CAR}
            </Button>
          </div>
          <div className="col-1 bg-white rounded-xl shadow-sm px-6 py-5 w-full">
            <div className="flex flex-wrap gap-3 items-start w-full">
              <Search onSubmit={handleSearch} className="search w-full max-w-[400px] flex justify-start max-md:max-w-full" />

              {admin && (
                loadingSuppliers ? (
                  <div className="w-full h-[30px] flex flex-col items-center justify-center my-2.5">
                    <CircularProgress className="text-primary" size="1.3rem" />
                  </div>
                )
                  : <SupplierFilter suppliers={allSuppliers} onChange={handleSupplierFilterChange} className="filter" />
              )}

              {rowCount > -1 && (
                <>
                  <CarRatingFilter className="filter" onChange={handleRatingFilterChange} />
                  <CarRangeFilter className="filter" onChange={handleRangeFilterChange} />
                  <CarMultimediaFilter className="filter" onChange={handleMultimediaFilterChange} />
                  <CarSeatsFilter className="filter" onChange={handleSeatsFilterChange} />
                  <CarSpecsFilter className="filter" onChange={handleCarSpecsFilterChange} />
                  <CarTypeFilter className="car-filter" onChange={handleCarTypeFilterChange} />
                  <GearboxFilter className="car-filter" onChange={handleGearboxFilterChange} />
                  <MileageFilter className="car-filter" onChange={handleMileageFilterChange} />
                  <FuelPolicyFilter className="filter" onChange={handleFuelPolicyFilterChange} />
                  <DepositFilter className="car-filter" onChange={handleDepositFilterChange} />
                  {admin && <AvailabilityFilter className="car-filter" onChange={handleAvailabilityFilterChange} />}
                </>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 min-h-[300px] flex flex-col items-center flex-1">
            <CarList
              user={user}
              suppliers={suppliers}
              carSpecs={carSpecs}
              carType={carType}
              gearbox={gearbox}
              mileage={mileage}
              fuelPolicy={fuelPolicy}
              deposit={deposit}
              availability={availability}
              range={ranges}
              multimedia={multimedia}
              rating={rating}
              seats={seats}
              keyword={keyword}
              loading={loading}
              language={language}
              onLoad={handleCarListLoad}
              onDelete={handleCarDelete}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Cars
