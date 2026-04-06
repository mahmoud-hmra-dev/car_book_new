import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Place,
  Email,
  AccessTime,
  DirectionsCar,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'
import Footer from '@/components/Footer'
import { strings } from '@/lang/contact-form'
import env from '@/config/env.config'

import '@/assets/css/contact.css'

const Contact = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()

  const onLoad = (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      {/* Hero Breadcrumb Banner */}
      <div className="contact-hero">
        <h1>{strings.CONTACT_HEADING}</h1>
        <div className="contact-hero-breadcrumb">
          <Link to="/">{strings.HOME}</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{strings.CONTACT_HEADING}</span>
        </div>
      </div>

      {/* Contact Form + Image Section */}
      <div className="contact-main">
        <div className="contact-main-inner">
          <ContactForm user={user} />
          <div className="contact-main-image">
            <div className="contact-main-image-placeholder">
              <DirectionsCar />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Cards */}
      <div className="contact-info-section">
        <div className="contact-info-inner">
          <div className="contact-info-card">
            <div className="contact-info-icon">
              <Place />
            </div>
            <div className="contact-info-text">
              <span className="contact-info-label">{strings.ADDRESS_TITLE}</span>
              <span className="contact-info-value">{strings.ADDRESS_VALUE}</span>
            </div>
          </div>

          <div className="contact-info-card">
            <div className="contact-info-icon">
              <Email />
            </div>
            <div className="contact-info-text">
              <span className="contact-info-label">{strings.EMAIL_TITLE}</span>
              <span className="contact-info-value">
                <a href={`mailto:${env.CONTACT_EMAIL || strings.EMAIL_VALUE}`}>
                  {env.CONTACT_EMAIL || strings.EMAIL_VALUE}
                </a>
              </span>
            </div>
          </div>

          <div className="contact-info-card">
            <div className="contact-info-icon">
              <AccessTime />
            </div>
            <div className="contact-info-text">
              <span className="contact-info-label">{strings.PHONE_TITLE}</span>
              <span className="contact-info-value">
                <a href={`tel:${strings.PHONE_VALUE}`}>
                  {strings.PHONE_VALUE}
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </Layout>
  )
}

export default Contact
