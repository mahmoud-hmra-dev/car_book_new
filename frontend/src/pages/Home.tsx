import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Skeleton,
} from '@mui/material'
import {
  LocationOn,
  CalendarMonth,
  DirectionsCar,
  Speed,
  LocalGasStation,
  AccountTree,
  AcUnit,
  Phone,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/home'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
import * as LocationService from '@/services/LocationService'
import * as PaymentService from '@/services/PaymentService'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import SupplierCarrousel from '@/components/SupplierCarrousel'
import SearchForm from '@/components/SearchForm'
import Footer from '@/components/Footer'

import '@/assets/css/home.css'

const Home = () => {
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [featuredCars, setFeaturedCars] = useState<bookcarsTypes.Car[]>([])
  const [carsLoading, setCarsLoading] = useState(true)
  const [carPrices, setCarPrices] = useState<Record<string, number>>({})
  const [pickupLocationId, setPickupLocationId] = useState('')
  const [dropOffLocationId, setDropOffLocationId] = useState('')
  const [from, setFrom] = useState<Date>(new Date())
  const [to, setTo] = useState<Date>(new Date())

  const onLoad = async () => {
    try {
      // Fetch all suppliers (always, regardless of HIDE_SUPPLIERS)
      const allSuppliers = await SupplierService.getAllSuppliers()

      // Set suppliers for the carrousel (filter for ones with avatars)
      const suppliersWithAvatar = allSuppliers.filter(
        (supplier) => supplier.avatar && !/no-image/i.test(supplier.avatar),
      )
      bookcarsHelper.shuffle(suppliersWithAvatar)
      setSuppliers(suppliersWithAvatar)

      // Get supplier IDs for car search
      const supplierIds = bookcarsHelper.flattenSuppliers(allSuppliers)

      // Get a location for the car search
      const locationsResult = await LocationService.getLocations('', 1, 1)
      const locations = locationsResult && locationsResult.length > 0
        ? locationsResult[0].resultData
        : []

      if (locations.length === 0 || supplierIds.length === 0) {
        setCarsLoading(false)
        return
      }

      const locationId = locations[0]._id
      setPickupLocationId(locationId)
      setDropOffLocationId(locationId)

      // Set reasonable date range: today + 1 day to today + 8 days
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() + 1)
      fromDate.setHours(10, 0, 0, 0)

      const toDate = new Date()
      toDate.setDate(toDate.getDate() + 8)
      toDate.setHours(10, 0, 0, 0)

      setFrom(fromDate)
      setTo(toDate)

      // Build payload and fetch cars
      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers: supplierIds,
        pickupLocation: locationId,
        carType: bookcarsHelper.getAllCarTypes(),
        gearbox: [bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual],
        mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
        fuelPolicy: bookcarsHelper.getAllFuelPolicies(),
        deposit: -1,
        ranges: bookcarsHelper.getAllRanges(),
        multimedia: [],
        rating: -1,
        seats: -1,
        from: fromDate,
        to: toDate,
      }

      const data = await CarService.getCars(payload, 1, 6)
      const page = data && data.length > 0
        ? data[0]
        : { pageInfo: { totalRecords: 0 }, resultData: [] }

      if (page && page.resultData.length > 0) {
        const cars = page.resultData
        setFeaturedCars(cars)

        // Compute converted prices for each car
        const prices: Record<string, number> = {}
        await Promise.all(
          cars.map(async (car) => {
            try {
              const days = bookcarsHelper.days(fromDate, toDate)
              if (days > 0) {
                const totalPrice = await PaymentService.convertPrice(
                  bookcarsHelper.calculateTotalPrice(
                    car,
                    fromDate,
                    toDate,
                    car.supplier?.priceChangeRate || 0,
                  ),
                )
                prices[car._id] = totalPrice / days
              } else {
                const converted = await PaymentService.convertPrice(
                  car.discountedDailyPrice || car.dailyPrice,
                )
                prices[car._id] = converted
              }
            } catch {
              prices[car._id] = car.discountedDailyPrice || car.dailyPrice
            }
          }),
        )
        setCarPrices(prices)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setCarsLoading(false)
    }
  }

  const language = UserService.getLanguage()

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="home">

        {/* ===== HERO SECTION ===== */}
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-text">
              <h1 className="hero-heading">{strings.HERO_HEADING}</h1>
              <p className="hero-sub">{strings.HERO_SUBTEXT}</p>
              <Button
                variant="contained"
                className="btn-primary btn-lets-go"
                onClick={() => {
                  const searchEl = document.querySelector('.hero-search')
                  searchEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              >
                {strings.LETS_GO}
              </Button>
            </div>
            <div className="hero-image">
              <div className="hero-car-placeholder">
                <DirectionsCar className="hero-car-icon" />
              </div>
            </div>
          </div>
          <div className="hero-search">
            <SearchForm />
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="how-it-works">
          <h2 className="section-title">{strings.HOW_IT_WORKS}</h2>
          <div className="steps">
            <div className="step">
              <div className="step-icon">
                <LocationOn />
              </div>
              <h3>{strings.STEP_CHOOSE_LOCATION}</h3>
              <p>{strings.STEP_CHOOSE_LOCATION_DESC}</p>
            </div>
            <div className="step">
              <div className="step-icon">
                <CalendarMonth />
              </div>
              <h3>{strings.STEP_PICK_DATE}</h3>
              <p>{strings.STEP_PICK_DATE_DESC}</p>
            </div>
            <div className="step">
              <div className="step-icon">
                <DirectionsCar />
              </div>
              <h3>{strings.STEP_BOOK_CAR}</h3>
              <p>{strings.STEP_BOOK_CAR_DESC}</p>
            </div>
            <div className="step">
              <div className="step-icon">
                <Speed />
              </div>
              <h3>{strings.STEP_ENJOY_RIDE}</h3>
              <p>{strings.STEP_ENJOY_RIDE_DESC}</p>
            </div>
          </div>
        </section>

        {/* ===== FEATURED CARS ===== */}
        <section className="featured-cars">
          <h2 className="section-title">{strings.POPULAR_CARS}</h2>
          <div className="car-grid">
            {carsLoading
              ? [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="car-card">
                  <div className="car-card-image">
                    <Skeleton variant="rectangular" width="100%" height={180} />
                  </div>
                  <div className="car-card-body">
                    <div className="car-card-header">
                      <div>
                        <Skeleton variant="text" width={120} height={24} />
                        <Skeleton variant="text" width={80} height={18} />
                      </div>
                      <Skeleton variant="text" width={60} height={28} />
                    </div>
                    <div className="car-card-specs">
                      <Skeleton variant="text" width={60} height={18} />
                      <Skeleton variant="text" width={60} height={18} />
                      <Skeleton variant="text" width={60} height={18} />
                    </div>
                    <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: '12px' }} />
                  </div>
                </div>
              ))
              : featuredCars.length > 0
                ? featuredCars.map((car) => {
                  const gearboxLabel = car.gearbox === bookcarsTypes.GearboxType.Automatic
                    ? strings.AUTOMAT
                    : helper.getGearboxType(car.gearbox)
                  const fuelLabel = helper.getCarTypeShort(car.type)
                  const pricePerDay = carPrices[car._id] || 0

                  return (
                    <div key={car._id} className="car-card">
                      <div className="car-card-image">
                        <img
                          src={helper.carImageURL(car.image)}
                          alt={car.name}
                          loading="lazy"
                        />
                      </div>
                      <div className="car-card-body">
                        <div className="car-card-header">
                          <div>
                            <h3 className="car-card-name">{car.name}</h3>
                            <span className="car-card-type">
                              {helper.getCarRange(car.range as bookcarsTypes.CarRange)}
                            </span>
                          </div>
                          <div className="car-card-price">
                            <span className="car-card-price-amount">
                              {bookcarsHelper.formatPrice(pricePerDay, commonStrings.CURRENCY, language)}
                            </span>
                            <span className="car-card-price-unit">{strings.PER_DAY}</span>
                          </div>
                        </div>
                        <div className="car-card-specs">
                          <div className="car-card-spec">
                            <AccountTree className="car-card-spec-icon" />
                            <span>{gearboxLabel}</span>
                          </div>
                          <div className="car-card-spec">
                            <LocalGasStation className="car-card-spec-icon" />
                            <span>{fuelLabel}</span>
                          </div>
                          {car.aircon && (
                            <div className="car-card-spec">
                              <AcUnit className="car-card-spec-icon" />
                              <span>{strings.AIR_CONDITIONER}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="contained"
                          className="btn-primary btn-view-details"
                          onClick={() => navigate('/car-detail', {
                            state: {
                              carId: car._id,
                              pickupLocationId,
                              dropOffLocationId,
                              from: from.toISOString(),
                              to: to.toISOString(),
                            },
                          })}
                          fullWidth
                        >
                          {strings.VIEW_DETAILS}
                        </Button>
                      </div>
                    </div>
                  )
                })
                : (
                  <div className="no-cars-message">
                    <p>{strings.NO_CARS_AVAILABLE}</p>
                  </div>
                )}
          </div>
        </section>

        {/* ===== BRAND LOGOS ===== */}
        {suppliers.length > 0 && (
          <section className="brand-logos">
            <SupplierCarrousel suppliers={suppliers} />
          </section>
        )}

        {/* ===== CTA BANNER ===== */}
        <section className="cta-banner">
          <div className="cta-banner-inner">
            <div className="cta-banner-text">
              <h2>{strings.CTA_HEADING}</h2>
              <p>{strings.CTA_DESCRIPTION}</p>
              <div className="cta-banner-phone">
                <Phone />
                <span>{strings.CTA_PHONE}</span>
              </div>
              <Button
                variant="contained"
                className="btn-book-now"
                onClick={() => navigate('/search')}
              >
                {strings.BOOK_NOW}
              </Button>
            </div>
            <div className="cta-banner-image">
              <DirectionsCar className="cta-car-icon" />
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </Layout>
  )
}

export default Home
