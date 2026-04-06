import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
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
import env from '@/config/env.config'
import { strings } from '@/lang/home'
import * as SupplierService from '@/services/SupplierService'
import Layout from '@/components/Layout'
import SupplierCarrousel from '@/components/SupplierCarrousel'
import SearchForm from '@/components/SearchForm'
import Footer from '@/components/Footer'

import '@/assets/css/home.css'

const Home = () => {
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])

  const onLoad = async () => {
    if (!env.HIDE_SUPPLIERS) {
      let _suppliers = await SupplierService.getAllSuppliers()
      _suppliers = _suppliers.filter((supplier) => supplier.avatar && !/no-image/i.test(supplier.avatar))
      bookcarsHelper.shuffle(_suppliers)
      setSuppliers(_suppliers)
    }
  }

  const brandLogos = ['Toyota', 'Ford', 'Mercedes-Benz', 'Jeep', 'Volkswagen', 'Audi']

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
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="car-card">
                <div className="car-card-image">
                  <DirectionsCar className="car-card-placeholder-icon" />
                </div>
                <div className="car-card-body">
                  <div className="car-card-header">
                    <div>
                      <h3 className="car-card-name">Mercedes</h3>
                      <span className="car-card-type">Sedan</span>
                    </div>
                    <div className="car-card-price">
                      <span className="car-card-price-amount">$25</span>
                      <span className="car-card-price-unit">{strings.PER_DAY}</span>
                    </div>
                  </div>
                  <div className="car-card-specs">
                    <div className="car-card-spec">
                      <AccountTree className="car-card-spec-icon" />
                      <span>{strings.AUTOMAT}</span>
                    </div>
                    <div className="car-card-spec">
                      <LocalGasStation className="car-card-spec-icon" />
                      <span>{strings.FUEL_PB95}</span>
                    </div>
                    <div className="car-card-spec">
                      <AcUnit className="car-card-spec-icon" />
                      <span>{strings.AIR_CONDITIONER}</span>
                    </div>
                  </div>
                  <Button
                    variant="contained"
                    className="btn-primary btn-view-details"
                    onClick={() => navigate('/search')}
                    fullWidth
                  >
                    {strings.VIEW_DETAILS}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== BRAND LOGOS ===== */}
        {suppliers.length > 3 ? (
          <section className="brand-logos">
            <SupplierCarrousel suppliers={suppliers} />
          </section>
        ) : (
          <section className="brand-logos">
            <div className="brand-logos-row">
              {brandLogos.map((brand) => (
                <div key={brand} className="brand-logo-item">
                  <span className="brand-logo-text">{brand}</span>
                </div>
              ))}
            </div>
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
