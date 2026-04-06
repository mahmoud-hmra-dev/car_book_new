import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import {
  PlayArrow,
  Check,
  ExpandMore,
  DirectionsCar,
  CarRental,
  SupportAgent,
  Explore,
  PhoneIphone,
  Apple,
  Shop,
} from '@mui/icons-material'
import { strings } from '@/lang/about'
import Layout from '@/components/Layout'
import Footer from '@/components/Footer'

import '@/assets/css/about.css'

const About = () => {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const onLoad = () => { }

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index))
  }

  const faqs = [
    { question: strings.FAQ1_QUESTION, answer: strings.FAQ1_ANSWER },
    { question: strings.FAQ2_QUESTION, answer: strings.FAQ2_ANSWER },
    { question: strings.FAQ3_QUESTION, answer: strings.FAQ3_ANSWER },
    { question: strings.FAQ4_QUESTION, answer: strings.FAQ4_ANSWER },
    { question: strings.FAQ5_QUESTION, answer: strings.FAQ5_ANSWER },
  ]

  const testimonials = [
    { text: strings.TESTIMONIAL1_TEXT, name: strings.TESTIMONIAL1_NAME },
    { text: strings.TESTIMONIAL2_TEXT, name: strings.TESTIMONIAL2_NAME },
    { text: strings.TESTIMONIAL3_TEXT, name: strings.TESTIMONIAL3_NAME },
  ]

  return (
    <Layout onLoad={onLoad} strict={false}>

      {/* 1. HERO BREADCRUMB BANNER */}
      <section className="about-hero">
        <h1>{strings.HERO_TITLE}</h1>
        <div className="about-hero-breadcrumb">
          <Link to="/">{strings.BREADCRUMB_HOME}</Link>
          <span className="separator">/</span>
          <span className="current">{strings.BREADCRUMB_ABOUT}</span>
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section className="about-features">
        <div className="about-container">
          <div className="about-features-inner">
            <div className="about-features-heading">
              <h2>{strings.FEATURES_HEADING}</h2>
            </div>
            <div className="about-features-grid">
              <div className="about-feature-card">
                <div className="about-feature-icon">
                  <CarRental />
                </div>
                <h3>{strings.FEATURE_VARIETY_TITLE}</h3>
                <p>{strings.FEATURE_VARIETY_DESC}</p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-icon">
                  <SupportAgent />
                </div>
                <h3>{strings.FEATURE_SUPPORT_TITLE}</h3>
                <p>{strings.FEATURE_SUPPORT_DESC}</p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-icon">
                  <Explore />
                </div>
                <h3>{strings.FEATURE_FREEDOM_TITLE}</h3>
                <p>{strings.FEATURE_FREEDOM_DESC}</p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-icon">
                  <PhoneIphone />
                </div>
                <h3>{strings.FEATURE_FLEXIBILITY_TITLE}</h3>
                <p>{strings.FEATURE_FLEXIBILITY_DESC}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VIDEO/IMAGE SECTION */}
      <section className="about-video">
        <div className="about-container">
          <div className="about-video-wrapper" role="img" aria-label={strings.VIDEO_ALT}>
            <button className="about-video-play" type="button" aria-label={strings.VIDEO_ALT}>
              <PlayArrow />
            </button>
          </div>
        </div>
      </section>

      {/* 4. STATS COUNTER SECTION */}
      <section className="about-stats">
        <div className="about-container">
          <div className="about-stats-inner">
            <div className="about-stat-item">
              <div className="about-stat-value">{strings.STAT_CUSTOMERS_VALUE}</div>
              <div className="about-stat-label">{strings.STAT_CUSTOMERS_LABEL}</div>
            </div>
            <div className="about-stat-item">
              <div className="about-stat-value">{strings.STAT_CARS_VALUE}</div>
              <div className="about-stat-label">{strings.STAT_CARS_LABEL}</div>
            </div>
            <div className="about-stat-item">
              <div className="about-stat-value">{strings.STAT_EXPERIENCE_VALUE}</div>
              <div className="about-stat-label">{strings.STAT_EXPERIENCE_LABEL}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. UNLOCK MEMORIES SECTION */}
      <section className="about-unlock">
        <div className="about-container">
          <div className="about-unlock-inner">
            <div className="about-unlock-content">
              <h2>{strings.UNLOCK_HEADING}</h2>
              <p>{strings.UNLOCK_DESC}</p>
              <div className="about-unlock-checklist">
                <div className="about-unlock-item">
                  <div className="about-unlock-check">
                    <Check />
                  </div>
                  <div className="about-unlock-item-text">
                    <h4>{strings.UNLOCK_ITEM1_TITLE}</h4>
                    <p>{strings.UNLOCK_ITEM1_DESC}</p>
                  </div>
                </div>
                <div className="about-unlock-item">
                  <div className="about-unlock-check">
                    <Check />
                  </div>
                  <div className="about-unlock-item-text">
                    <h4>{strings.UNLOCK_ITEM2_TITLE}</h4>
                    <p>{strings.UNLOCK_ITEM2_DESC}</p>
                  </div>
                </div>
                <div className="about-unlock-item">
                  <div className="about-unlock-check">
                    <Check />
                  </div>
                  <div className="about-unlock-item-text">
                    <h4>{strings.UNLOCK_ITEM3_TITLE}</h4>
                    <p>{strings.UNLOCK_ITEM3_DESC}</p>
                  </div>
                </div>
                <div className="about-unlock-item">
                  <div className="about-unlock-check">
                    <Check />
                  </div>
                  <div className="about-unlock-item-text">
                    <h4>{strings.UNLOCK_ITEM4_TITLE}</h4>
                    <p>{strings.UNLOCK_ITEM4_DESC}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="about-unlock-image" role="img" aria-label={strings.UNLOCK_HEADING} />
          </div>
        </div>
      </section>

      {/* 6. DOWNLOAD APP SECTION */}
      <section className="about-download">
        <div className="about-container">
          <div className="about-download-inner">
            <div className="about-download-phone">
              <div className="about-download-phone-mockup" />
            </div>
            <div className="about-download-content">
              <div className="about-download-label">{strings.DOWNLOAD_LABEL}</div>
              <h2>{strings.DOWNLOAD_HEADING}</h2>
              <p>{strings.DOWNLOAD_DESC}</p>
              <div className="about-download-buttons">
                <div className="about-download-badge" role="button" tabIndex={0}>
                  <Apple />
                  <div className="about-download-badge-text">
                    <small>Download on the</small>
                    <strong>{strings.APP_STORE}</strong>
                  </div>
                </div>
                <div className="about-download-badge" role="button" tabIndex={0}>
                  <Shop />
                  <div className="about-download-badge-text">
                    <small>GET IT ON</small>
                    <strong>{strings.GOOGLE_PLAY}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS SECTION */}
      <section className="about-testimonials">
        <div className="about-container">
          <h2>{strings.TESTIMONIALS_HEADING}</h2>
          <div className="about-testimonials-grid">
            {testimonials.map((t, i) => (
              <div className="about-testimonial-card" key={i}>
                <div className="about-testimonial-quote">&ldquo;</div>
                <p>{t.text}</p>
                <div className="about-testimonial-author">
                  <div className="about-testimonial-avatar">
                    {t.name.charAt(0)}
                  </div>
                  <span>{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section className="about-faq">
        <div className="about-container">
          <h2>{strings.FAQ_HEADING}</h2>
          <div className="about-faq-list">
            {faqs.map((faq, index) => (
              <div className="about-faq-item" key={index}>
                <button
                  className="about-faq-question"
                  type="button"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  {faq.question}
                  <ExpandMore />
                </button>
                <div
                  id={`faq-answer-${index}`}
                  className={`about-faq-answer${openFaq === index ? ' open' : ''}`}
                  role="region"
                >
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CTA BANNER */}
      <section className="about-cta">
        <div className="about-container">
          <div className="about-cta-inner">
            <div className="about-cta-text">
              <h3>{strings.CTA_HEADING}</h3>
              <span>{strings.CTA_PHONE}</span>
            </div>
            <div className="about-cta-car">
              <DirectionsCar />
            </div>
            <div className="about-cta-actions">
              <Button
                variant="contained"
                className="about-cta-book-btn"
                onClick={() => navigate('/')}
              >
                {strings.CTA_BOOK_NOW}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </Layout>
  )
}

export default About
