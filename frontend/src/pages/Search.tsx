import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Tune as FiltersIcon,
  DirectionsCar as CarIcon,
  EditOutlined as EditIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/search'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'
import CarFilter from '@/components/CarFilter'
import CarSpecsFilter from '@/components/CarSpecsFilter'
import SupplierFilter from '@/components/SupplierFilter'
import CarType from '@/components/CarTypeFilter'
import GearboxFilter from '@/components/GearboxFilter'
import MileageFilter from '@/components/MileageFilter'
import FuelPolicyFilter from '@/components/FuelPolicyFilter'
import DepositFilter from '@/components/DepositFilter'
import CarList from '@/components/CarList'
import CarRatingFilter from '@/components/CarRatingFilter'
import CarRangeFilter from '@/components/CarRangeFilter'
import CarMultimediaFilter from '@/components/CarMultimediaFilter'
import CarSeatsFilter from '@/components/CarSeatsFilter'
import Map from '@/components/Map'
import ViewOnMapButton from '@/components/ViewOnMapButton'
import MapDialog from '@/components/MapDialog'

import '@/assets/css/search.css'

interface RangeTab {
  key: string
  label: string
  range: bookcarsTypes.CarRange | null
}

const Search = () => {
  const location = useLocation()

  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [allSuppliersIds, setAllSuppliersIds] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [supplierIds, setSupplierIds] = useState<string[]>()
  const [loading, setLoading] = useState(true)
  const [carSpecs, setCarSpecs] = useState<bookcarsTypes.CarSpecs>({})
  const [carType, setCarType] = useState(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [fuelPolicy, setFuelPolicy] = useState(bookcarsHelper.getAllFuelPolicies())
  const [deposit, setDeposit] = useState(-1)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [multimedia, setMultimedia] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [rating, setRating] = useState(-1)
  const [seats, setSeats] = useState(-1)
  const [openMapDialog, setOpenMapDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [totalRecords, setTotalRecords] = useState(0)

  const rangeTabs: RangeTab[] = useMemo(() => [
    { key: 'all', label: strings.ALL_VEHICLES, range: null },
    { key: 'mini', label: strings.TAB_SEDAN, range: bookcarsTypes.CarRange.Mini },
    { key: 'midi', label: strings.TAB_SUV, range: bookcarsTypes.CarRange.Midi },
    { key: 'maxi', label: strings.TAB_VAN, range: bookcarsTypes.CarRange.Maxi },
    { key: 'scooter', label: strings.TAB_SCOOTER, range: bookcarsTypes.CarRange.Scooter },
    { key: 'bus', label: strings.TAB_BUS, range: bookcarsTypes.CarRange.Bus },
    { key: 'truck', label: strings.TAB_TRUCK, range: bookcarsTypes.CarRange.Truck },
    { key: 'caravan', label: strings.TAB_CARAVAN, range: bookcarsTypes.CarRange.Caravan },
  ], [])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (rating > -1) {
      count += 1
    }
    if (seats > -1) {
      count += 1
    }
    if (deposit > -1) {
      count += 1
    }
    if (multimedia.length > 0) {
      count += 1
    }
    if (Object.keys(carSpecs).length > 0) {
      count += 1
    }
    if (carType.length < bookcarsHelper.getAllCarTypes().length) {
      count += 1
    }
    if (gearbox.length < 2) {
      count += 1
    }
    if (mileage.length < 2) {
      count += 1
    }
    if (fuelPolicy.length < bookcarsHelper.getAllFuelPolicies().length) {
      count += 1
    }
    if (ranges.length < bookcarsHelper.getAllRanges().length) {
      count += 1
    }
    return count
  }, [rating, seats, deposit, multimedia, carSpecs, carType, gearbox, mileage, fuelPolicy, ranges])

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const fetchedSuppliers = await SupplierService.getAllSuppliers()
        setAllSuppliers(fetchedSuppliers)
        setAllSuppliersIds(bookcarsHelper.flattenSuppliers(fetchedSuppliers))
      } catch (err) {
        helper.error(err, 'Failed to fetch suppliers')
      }
    }

    fetchSuppliers()
  }, [])

  useEffect(() => {
    const updateSuppliers = async () => {
      if (pickupLocation) {
        const payload: bookcarsTypes.GetCarsPayload = {
          pickupLocation: pickupLocation._id,
          carSpecs,
          carType,
          gearbox,
          mileage,
          fuelPolicy,
          deposit,
          ranges,
          multimedia,
          rating,
          seats,
          from,
          to,
        }
        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        setSuppliers(_suppliers)
      }
    }

    if (from && to) {
      updateSuppliers()
    }
  }, [pickupLocation, carSpecs, carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to])

  // Close mobile drawer on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960 && mobileDrawerOpen) {
        setMobileDrawerOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileDrawerOpen])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileDrawerOpen])

  const handleTabChange = useCallback((tab: RangeTab) => {
    setActiveTab(tab.key)
    if (tab.range === null) {
      setRanges(bookcarsHelper.getAllRanges())
    } else {
      setRanges([tab.range])
    }
  }, [])

  const handleCarFilterSubmit = async (filter: bookcarsTypes.CarFilter) => {
    if (suppliers.length < allSuppliers.length) {
      const _supplierIds = bookcarsHelper.clone(allSuppliersIds)
      setSupplierIds(_supplierIds)
    }

    setPickupLocation(filter.pickupLocation)
    setDropOffLocation(filter.dropOffLocation)
    setFrom(filter.from)
    setTo(filter.to)
  }

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSupplierIds(newSuppliers)
  }

  const handleRatingFilterChange = (value: number) => {
    setRating(value)
  }

  const handleRangeFilterChange = (value: bookcarsTypes.CarRange[]) => {
    setRanges(value)
    setActiveTab('all')
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

  const handleCarTypeFilterChange = (values: bookcarsTypes.CarType[]) => {
    setCarType(values)
  }

  const handleGearboxFilterChange = (values: bookcarsTypes.GearboxType[]) => {
    setGearbox(values)
  }

  const handleMileageFilterChange = (values: bookcarsTypes.Mileage[]) => {
    setMileage(values)
  }

  const handleFuelPolicyFilterChange = (values: bookcarsTypes.FuelPolicy[]) => {
    setFuelPolicy(values)
  }

  const handleDepositFilterChange = (value: number) => {
    setDeposit(value)
  }

  const handleCarListLoad = useCallback((data?: bookcarsTypes.Data<bookcarsTypes.Car>) => {
    if (data) {
      setTotalRecords(data.rowCount)
    }
  }, [])

  const onLoad = async (user?: bookcarsTypes.User) => {
    const { state } = location
    if (!state) {
      setNoMatch(true)
      return
    }

    const { pickupLocationId } = state
    const { dropOffLocationId } = state
    const { from: _from } = state
    const { to: _to } = state

    if (!pickupLocationId || !dropOffLocationId || !_from || !_to) {
      setLoading(false)
      setNoMatch(true)
      return
    }

    let _pickupLocation
    let _dropOffLocation
    try {
      _pickupLocation = await LocationService.getLocation(pickupLocationId)

      if (!_pickupLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      if (dropOffLocationId !== pickupLocationId) {
        _dropOffLocation = await LocationService.getLocation(dropOffLocationId)
      } else {
        _dropOffLocation = _pickupLocation
      }

      if (!_dropOffLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      const payload: bookcarsTypes.GetCarsPayload = {
        pickupLocation: _pickupLocation._id,
        carSpecs,
        carType,
        gearbox,
        mileage,
        fuelPolicy,
        deposit,
        ranges,
        multimedia,
        rating,
        seats,
        from: _from,
        to: _to,
      }
      const _suppliers = await SupplierService.getFrontendSuppliers(payload)
      const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)

      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setSuppliers(_suppliers)
      setSupplierIds(_supplierIds)

      const { ranges: _ranges } = state
      if (_ranges) {
        setRanges(_ranges)
      }

      setLoading(false)
      if (!user || (user && user.verified)) {
        setVisible(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const hasMap = pickupLocation
    && ((pickupLocation.latitude && pickupLocation.longitude)
      || (pickupLocation.parkingSpots && pickupLocation.parkingSpots.length > 0))

  const sidebarContent = (
    <>
      {/* Search/Date Section */}
      <div className="search-sidebar-card">
        <div className="search-sidebar-heading">
          <div className="search-sidebar-heading-left">
            <EditIcon />
            <h3>{strings.MODIFY_SEARCH}</h3>
          </div>
        </div>

        {!loading && pickupLocation && dropOffLocation && from && to && (
          <CarFilter
            className="filter"
            pickupLocation={pickupLocation}
            dropOffLocation={dropOffLocation}
            from={from}
            to={to}
            collapse
            onSubmit={handleCarFilterSubmit}
          />
        )}
      </div>

      {/* Map */}
      {!loading && hasMap && (
        <div className="search-sidebar-card">
          <Map
            position={[
              pickupLocation!.latitude || Number(pickupLocation!.parkingSpots![0].latitude),
              pickupLocation!.longitude || Number(pickupLocation!.parkingSpots![0].longitude),
            ]}
            initialZoom={10}
            locations={[pickupLocation!]}
            parkingSpots={pickupLocation!.parkingSpots}
            className="search-sidebar-map"
          >
            <ViewOnMapButton onClick={() => setOpenMapDialog(true)} />
          </Map>
        </div>
      )}

      {/* Filters Section */}
      <div className="search-sidebar-card">
        <div className="search-sidebar-heading">
          <div className="search-sidebar-heading-left">
            <FiltersIcon />
            <h3>{strings.FILTERS}</h3>
            {activeFilterCount > 0 && (
              <span className="search-filter-count-badge">{activeFilterCount}</span>
            )}
          </div>
        </div>

        {!loading && (
          <div className="search-sidebar-filters">
            {!env.HIDE_SUPPLIERS && <SupplierFilter className="filter" suppliers={suppliers} onChange={handleSupplierFilterChange} />}
            <CarRatingFilter className="filter" onChange={handleRatingFilterChange} />
            <CarRangeFilter className="filter" onChange={handleRangeFilterChange} />
            <CarMultimediaFilter className="filter" onChange={handleMultimediaFilterChange} />
            <CarSeatsFilter className="filter" onChange={handleSeatsFilterChange} />
            <CarSpecsFilter className="filter" onChange={handleCarSpecsFilterChange} />
            <CarType className="filter" onChange={handleCarTypeFilterChange} />
            <GearboxFilter className="filter" onChange={handleGearboxFilterChange} />
            <MileageFilter className="filter" onChange={handleMileageFilterChange} />
            <FuelPolicyFilter className="filter" onChange={handleFuelPolicyFilterChange} />
            <DepositFilter className="filter" onChange={handleDepositFilterChange} />
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {visible && supplierIds && pickupLocation && dropOffLocation && from && to && (
          <div className="search-redesign">
            {/* Page Header */}
            <div className="search-page-header">
              <div className="search-page-header-inner">
                <h1 className="search-page-title">
                  {strings.FIND_PERFECT_CAR}
                  {totalRecords > 0 && (
                    <span className="search-results-count">
                      {` - ${totalRecords} ${totalRecords === 1 ? strings.CAR_FOUND : strings.CARS_FOUND}`}
                    </span>
                  )}
                </h1>
              </div>
            </div>

            {/* Body: Sidebar + Main Content */}
            <div className="search-body">
              {/* Mobile Drawer Overlay */}
              <div
                className={`search-drawer-overlay${mobileDrawerOpen ? ' search-drawer-overlay-open' : ''}`}
                onClick={() => setMobileDrawerOpen(false)}
              />

              {/* Sidebar (desktop: static, mobile: slide-out drawer) */}
              <aside className={`search-sidebar${mobileDrawerOpen ? ' search-sidebar-open' : ''}`}>
                <div className="search-sidebar-close">
                  <button
                    type="button"
                    className="search-sidebar-close-btn"
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-label="Close filters"
                  >
                    <CloseIcon />
                  </button>
                </div>
                {sidebarContent}
              </aside>

              {/* Main Content */}
              <div className="search-main">
                {/* Results Header with Category Tabs */}
                <div className="search-results-header">
                  <div className="search-category-tabs">
                    {rangeTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`search-tab${activeTab === tab.key ? ' search-tab-active' : ''}`}
                        onClick={() => handleTabChange(tab)}
                      >
                        {tab.key !== 'all' && <CarIcon className="search-tab-icon" />}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Car Grid */}
                <div className="search-grid-area">
                  <CarList
                    carSpecs={carSpecs}
                    suppliers={supplierIds}
                    carType={carType}
                    gearbox={gearbox}
                    mileage={mileage}
                    fuelPolicy={fuelPolicy}
                    deposit={deposit}
                    pickupLocation={pickupLocation._id}
                    dropOffLocation={dropOffLocation._id}
                    loading={loading}
                    from={from}
                    to={to}
                    ranges={ranges}
                    multimedia={multimedia}
                    rating={rating}
                    seats={seats}
                    hideSupplier={env.HIDE_SUPPLIERS}
                    includeComingSoonCars
                    variant="grid"
                    onLoad={handleCarListLoad}
                  />
                </div>
              </div>
            </div>

            {/* Brand Logos */}
            <div className="search-brands-section">
              <div className="search-brands-row">
                <span className="search-brand-logo">Toyota</span>
                <span className="search-brand-logo">Ford</span>
                <span className="search-brand-logo">Mercedes-Benz</span>
                <span className="search-brand-logo">Jeep</span>
                <span className="search-brand-logo">VW</span>
                <span className="search-brand-logo">Audi</span>
              </div>
            </div>

            {/* Mobile Filters FAB */}
            <button
              type="button"
              className="search-mobile-filters-fab"
              onClick={() => setMobileDrawerOpen(true)}
            >
              <FiltersIcon />
              <span>{strings.FILTERS}</span>
              {activeFilterCount > 0 && (
                <span className="search-fab-badge">{activeFilterCount}</span>
              )}
            </button>
          </div>
        )}

        <MapDialog
          pickupLocation={pickupLocation}
          openMapDialog={openMapDialog}
          onClose={() => setOpenMapDialog(false)}
        />

        {noMatch && <NoMatch hideHeader />}
      </Layout>
    </>
  )
}

export default Search
