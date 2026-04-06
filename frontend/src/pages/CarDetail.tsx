import React, { useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, CircularProgress } from '@mui/material'
import {
  AccountTree as GearboxIcon,
  LocalGasStation as FuelIcon,
  AcUnit as AirconIcon,
  Person as SeatsIcon,
  Speed as DistanceIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as CarService from '@/services/CarService'
import * as UserService from '@/services/UserService'
import * as PaymentService from '@/services/PaymentService'
import { strings as commonStrings } from '@/lang/common'
import { strings as carStrings } from '@/lang/cars'
import { strings } from '@/lang/car-detail'
import Layout from '@/components/Layout'
import Car from '@/components/Car'
import NoMatch from './NoMatch'

import DoorsIcon from '@/assets/img/car-door.png'

import '@/assets/css/car-detail.css'

const CarDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [car, setCar] = useState<bookcarsTypes.Car>()
  const [otherCars, setOtherCars] = useState<bookcarsTypes.Car[]>([])
  const [pickupLocationId, setPickupLocationId] = useState<string>('')
  const [dropOffLocationId, setDropOffLocationId] = useState<string>('')
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [pricePerDay, setPricePerDay] = useState(0)
  const [language, setLanguage] = useState('')
  const [selectedImage, setSelectedImage] = useState('')

  const onLoad = useCallback(async () => {
    const { state } = location

    if (!state) {
      setNoMatch(true)
      return
    }

    const {
      carId,
      pickupLocationId: _pickupLocationId,
      dropOffLocationId: _dropOffLocationId,
      from: _from,
      to: _to,
    } = state

    if (!carId || !_pickupLocationId || !_dropOffLocationId || !_from || !_to) {
      setNoMatch(true)
      return
    }

    try {
      const lang = UserService.getLanguage()
      setLanguage(lang)
      setPickupLocationId(_pickupLocationId)
      setDropOffLocationId(_dropOffLocationId)
      setFrom(new Date(_from))
      setTo(new Date(_to))

      const _car = await CarService.getCar(carId)
      if (!_car) {
        setNoMatch(true)
        return
      }

      setCar(_car)
      setSelectedImage(helper.carImageURL(_car.image))

      // Calculate price per day
      const _from_date = new Date(_from)
      const _to_date = new Date(_to)
      const days = bookcarsHelper.days(_from_date, _to_date)
      if (days > 0) {
        const totalPrice = await PaymentService.convertPrice(
          bookcarsHelper.calculateTotalPrice(_car, _from_date, _to_date, _car.supplier?.priceChangeRate || 0)
        )
        setPricePerDay(totalPrice / days)
      }

      // Fetch other cars from same location
      const payload: bookcarsTypes.GetCarsPayload = {
        pickupLocation: _pickupLocationId,
        carType: bookcarsHelper.getAllCarTypes(),
        gearbox: [bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual],
        mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
        fuelPolicy: bookcarsHelper.getAllFuelPolicies(),
        deposit: -1,
        ranges: bookcarsHelper.getAllRanges(),
        multimedia: [],
        rating: -1,
        seats: -1,
        from: _from_date,
        to: _to_date,
        includeComingSoonCars: true,
      }

      const data = await CarService.getCars(payload, 1, 4)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecords: 0 }, resultData: [] }
      if (_data) {
        const filtered = _data.resultData.filter((c: bookcarsTypes.Car) => c._id !== carId).slice(0, 3)
        setOtherCars(filtered)
      }

      setLoading(false)
      setVisible(true)
    } catch (err) {
      helper.error(err)
      setNoMatch(true)
    }
  }, [location])

  const handleRentClick = () => {
    if (!car) {
      return
    }
    navigate('/checkout', {
      state: {
        carId: car._id,
        pickupLocationId,
        dropOffLocationId,
        from,
        to,
      },
    })
  }

  const handleBackToResults = () => {
    navigate(-1)
  }

  const handleViewAll = () => {
    navigate(-1)
  }

  const getGearboxLabel = (gearbox: bookcarsTypes.GearboxType) => {
    switch (gearbox) {
      case bookcarsTypes.GearboxType.Automatic:
        return carStrings.GEARBOX_AUTOMATIC
      case bookcarsTypes.GearboxType.Manual:
        return carStrings.GEARBOX_MANUAL
      default:
        return ''
    }
  }

  const getFuelLabel = (type: bookcarsTypes.CarType) => {
    switch (type) {
      case bookcarsTypes.CarType.Diesel:
        return carStrings.DIESEL
      case bookcarsTypes.CarType.Gasoline:
        return carStrings.GASOLINE
      case bookcarsTypes.CarType.Electric:
        return carStrings.ELECTRIC
      case bookcarsTypes.CarType.Hybrid:
        return carStrings.HYBRID
      case bookcarsTypes.CarType.PlugInHybrid:
        return carStrings.PLUG_IN_HYBRID
      default:
        return carStrings.UNKNOWN
    }
  }

  const getMileageLabel = (mileage: number) => {
    if (mileage === -1) {
      return carStrings.UNLIMITED
    }
    return `${bookcarsHelper.formatNumber(mileage, language)} ${carStrings.MILEAGE_UNIT}`
  }

  // Build equipment list from car options
  const getEquipmentItems = () => {
    if (!car) {
      return []
    }

    const items: { label: string; available: boolean }[] = []

    if (car.aircon) {
      items.push({ label: strings.AIR_CONDITIONING, available: true })
    }

    if (car.cancellation > -1) {
      items.push({ label: strings.CANCELLATION, available: car.cancellation >= 0 })
    }

    if (car.amendments > -1) {
      items.push({ label: strings.AMENDMENTS, available: car.amendments >= 0 })
    }

    if (car.theftProtection > -1) {
      items.push({ label: strings.THEFT_PROTECTION, available: car.theftProtection >= 0 })
    }

    if (car.collisionDamageWaiver > -1) {
      items.push({ label: strings.COLLISION_DAMAGE, available: car.collisionDamageWaiver >= 0 })
    }

    if (car.fullInsurance > -1) {
      items.push({ label: strings.FULL_INSURANCE, available: car.fullInsurance >= 0 })
    }

    if (car.additionalDriver > -1) {
      items.push({ label: strings.ADDITIONAL_DRIVER, available: car.additionalDriver >= 0 })
    }

    // Add common car features
    items.push({ label: strings.ABS, available: true })
    items.push({ label: strings.AIR_BAGS, available: true })
    items.push({ label: strings.CRUISE_CONTROL, available: true })

    return items
  }

  // Generate thumbnail images. Since the Car model only has one image,
  // we create a single-item gallery from it. If additional images are
  // added in the future, this can be extended.
  const getImages = () => {
    if (!car) {
      return []
    }
    const images = [helper.carImageURL(car.image)]
    return images
  }

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {loading && !noMatch && (
          <div className="car-detail-loading">
            <CircularProgress />
          </div>
        )}

        {visible && car && from && to && (
          <div className="car-detail-page">
            {/* Back button */}
            <div className="car-detail-back">
              <Button
                className="back-btn"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToResults}
              >
                {strings.BACK_TO_RESULTS}
              </Button>
            </div>

            {/* Top Section: Two Columns */}
            <div className="car-detail-top">
              {/* Left Column: Image Gallery */}
              <div className="car-detail-left">
                <h1 className="car-detail-name">{car.name}</h1>
                <div className="car-detail-price-row">
                  <span className="car-detail-price-value">
                    {bookcarsHelper.formatPrice(pricePerDay, commonStrings.CURRENCY, language)}
                  </span>
                  <span className="car-detail-price-unit">{strings.PER_DAY}</span>
                </div>

                <div className="car-detail-main-image">
                  <img src={selectedImage} alt={car.name} />
                </div>

                <div className="car-detail-thumbnails">
                  {getImages().map((img, index) => (
                    <div
                      key={index}
                      className={`car-detail-thumbnail${selectedImage === img ? ' active' : ''}`}
                      onClick={() => setSelectedImage(img)}
                    >
                      <img src={img} alt={`${car.name} ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Specs + Equipment */}
              <div className="car-detail-right">
                {/* Supplier Banner */}
                {car.supplier && !env.HIDE_SUPPLIERS && (
                  <div className="car-detail-supplier">
                    {car.supplier.avatar && (
                      <div className="car-detail-supplier-logo">
                        <img
                          src={bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar)}
                          alt={car.supplier.fullName}
                        />
                      </div>
                    )}
                    <span className="car-detail-supplier-name">{car.supplier.fullName}</span>
                  </div>
                )}

                {/* Technical Specification */}
                <h2 className="car-detail-specs-title">{strings.TECHNICAL_SPECS}</h2>
                <div className="car-detail-specs-grid">
                  {/* Gear Box */}
                  <div className="car-detail-spec-box">
                    <div className="car-detail-spec-icon">
                      <GearboxIcon />
                    </div>
                    <div className="car-detail-spec-label">{strings.GEAR_BOX}</div>
                    <div className="car-detail-spec-value">{getGearboxLabel(car.gearbox)}</div>
                  </div>

                  {/* Fuel */}
                  {car.type !== bookcarsTypes.CarType.Unknown && (
                    <div className="car-detail-spec-box">
                      <div className="car-detail-spec-icon">
                        <FuelIcon />
                      </div>
                      <div className="car-detail-spec-label">{strings.FUEL}</div>
                      <div className="car-detail-spec-value">{getFuelLabel(car.type)}</div>
                    </div>
                  )}

                  {/* Doors */}
                  {car.doors > 0 && (
                    <div className="car-detail-spec-box">
                      <div className="car-detail-spec-icon">
                        <img src={DoorsIcon} alt="" style={{ width: 24, height: 24 }} />
                      </div>
                      <div className="car-detail-spec-label">{strings.DOORS}</div>
                      <div className="car-detail-spec-value">{car.doors}</div>
                    </div>
                  )}

                  {/* Air Conditioner */}
                  <div className="car-detail-spec-box">
                    <div className="car-detail-spec-icon">
                      <AirconIcon />
                    </div>
                    <div className="car-detail-spec-label">{strings.AIR_CONDITIONER}</div>
                    <div className="car-detail-spec-value">{car.aircon ? strings.YES : strings.NO}</div>
                  </div>

                  {/* Seats */}
                  {car.seats > 0 && (
                    <div className="car-detail-spec-box">
                      <div className="car-detail-spec-icon">
                        <SeatsIcon />
                      </div>
                      <div className="car-detail-spec-label">{strings.SEATS}</div>
                      <div className="car-detail-spec-value">{car.seats}</div>
                    </div>
                  )}

                  {/* Distance / Mileage */}
                  <div className="car-detail-spec-box">
                    <div className="car-detail-spec-icon">
                      <DistanceIcon />
                    </div>
                    <div className="car-detail-spec-label">{strings.DISTANCE}</div>
                    <div className="car-detail-spec-value">{getMileageLabel(car.mileage)}</div>
                  </div>
                </div>

                {/* Status Badge */}
                {car.comingSoon && (
                  <div className="car-detail-status-badge">{strings.COMING_SOON}</div>
                )}
                {car.fullyBooked && !car.comingSoon && (
                  <div className="car-detail-status-badge">{strings.FULLY_BOOKED}</div>
                )}

                {/* Rent a car button */}
                <Button
                  variant="contained"
                  className="car-detail-rent-btn"
                  onClick={handleRentClick}
                  disabled={!car.available || !!car.comingSoon || !!car.fullyBooked}
                >
                  {strings.RENT_A_CAR}
                </Button>

                {/* Car Equipment */}
                <h2 className="car-detail-equipment-title">{strings.CAR_EQUIPMENT}</h2>
                <ul className="car-detail-equipment-list">
                  {getEquipmentItems().map((item, index) => (
                    <li key={index} className="car-detail-equipment-item">
                      <span className={`car-detail-equipment-icon ${item.available ? 'available' : 'unavailable'}`}>
                        {item.available ? <CheckIcon /> : <UncheckIcon />}
                      </span>
                      <span className="car-detail-equipment-text">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Other Cars Section */}
            {otherCars.length > 0 && (
              <div className="car-detail-other-section">
                <div className="car-detail-other-header">
                  <h2 className="car-detail-other-title">{strings.OTHER_CARS}</h2>
                  <span className="car-detail-view-all" onClick={handleViewAll}>
                    {strings.VIEW_ALL}
                    <ArrowForwardIcon style={{ fontSize: 18 }} />
                  </span>
                </div>
                <div className="car-detail-other-grid">
                  {otherCars.map((_car) => (
                    <Car
                      key={_car._id}
                      car={_car}
                      pickupLocation={pickupLocationId}
                      dropOffLocation={dropOffLocationId}
                      from={from}
                      to={to}
                      hideSupplier={env.HIDE_SUPPLIERS}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {noMatch && <NoMatch hideHeader />}
      </Layout>
    </>
  )
}

export default CarDetail
