import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '@mui/material'
import {
  DirectionsCar,
  Place,
  Email,
  Phone,
  Facebook,
  Instagram,
  X,
  LinkedIn,
  YouTube,
} from '@mui/icons-material'
import { strings } from '@/lang/footer'
import env from '@/config/env.config'

import '@/assets/css/footer.css'

const Footer = () => {
  const navigate = useNavigate()

  return (
    <footer className="footer">
      {/* Top Row - Contact Info Bar */}
      <div className="footer-contact-bar">
        <div className="footer-container">
          <div className="footer-contact-row">
            <div className="footer-contact-item">
              <div className="footer-contact-icon footer-contact-icon-brand">
                <DirectionsCar />
              </div>
              <div className="footer-contact-text">
                <span className="footer-brand-name">{env.WEBSITE_NAME}</span>
              </div>
            </div>

            <div className="footer-contact-item">
              <div className="footer-contact-icon">
                <Place />
              </div>
              <div className="footer-contact-text">
                <span className="footer-contact-label">{strings.ADDRESS_LABEL}</span>
                <span className="footer-contact-value">{strings.ADDRESS_VALUE}</span>
              </div>
            </div>

            <div className="footer-contact-item">
              <div className="footer-contact-icon">
                <Email />
              </div>
              <div className="footer-contact-text">
                <span className="footer-contact-label">{strings.EMAIL_LABEL}</span>
                <a href={`mailto:${env.CONTACT_EMAIL}`} className="footer-contact-value">
                  {env.CONTACT_EMAIL || 'info@bookcars.com'}
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <div className="footer-contact-icon">
                <Phone />
              </div>
              <div className="footer-contact-text">
                <span className="footer-contact-label">{strings.PHONE_LABEL}</span>
                <a href={`tel:${strings.PHONE_VALUE}`} className="footer-contact-value">
                  {strings.PHONE_VALUE}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - 4-Column Grid */}
      <div className="footer-main">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Column 1 - Description + Social */}
            <div className="footer-col footer-col-description">
              <p className="footer-description">{strings.DESCRIPTION}</p>
              <div className="footer-social">
                <IconButton
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Facebook"
                  className="footer-social-icon"
                >
                  <Facebook />
                </IconButton>
                <IconButton
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="footer-social-icon"
                >
                  <Instagram />
                </IconButton>
                <IconButton
                  href="https://x.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="X"
                  className="footer-social-icon"
                >
                  <X />
                </IconButton>
                <IconButton
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="YouTube"
                  className="footer-social-icon"
                >
                  <YouTube />
                </IconButton>
                <IconButton
                  href="https://www.linkedin.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="LinkedIn"
                  className="footer-social-icon"
                >
                  <LinkedIn />
                </IconButton>
              </div>
            </div>

            {/* Column 2 - Useful Links */}
            <div className="footer-col">
              <div className="footer-col-title">{strings.USEFUL_LINKS}</div>
              <ul className="footer-links">
                <li onClick={() => navigate('/about')}>{strings.ABOUT}</li>
                <li onClick={() => navigate('/contact')}>{strings.CONTACT}</li>
                <li onClick={() => navigate('/gallery')}>{strings.GALLERY}</li>
                <li onClick={() => navigate('/blog')}>{strings.BLOG}</li>
                <li onClick={() => navigate('/faq')}>{strings.FAQ}</li>
              </ul>
            </div>

            {/* Column 3 - Vehicles */}
            <div className="footer-col">
              <div className="footer-col-title">{strings.VEHICLES}</div>
              <ul className="footer-links">
                <li>{strings.SEDAN}</li>
                <li>{strings.CABRIOLET}</li>
                <li>{strings.PICKUP}</li>
                <li>{strings.MINIVAN}</li>
                <li>{strings.SUV}</li>
              </ul>
            </div>

            {/* Column 4 - Download App */}
            <div className="footer-col">
              <div className="footer-col-title">{strings.DOWNLOAD_APP}</div>
              <div className="footer-app-badges">
                <a
                  href="https://apps.apple.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="footer-app-badge"
                  aria-label={strings.APP_STORE}
                >
                  <div className="footer-app-badge-placeholder">
                    <span>{strings.APP_STORE}</span>
                  </div>
                </a>
                <a
                  href="https://play.google.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="footer-app-badge"
                  aria-label={strings.GOOGLE_PLAY}
                >
                  <div className="footer-app-badge-placeholder">
                    <span>{strings.GOOGLE_PLAY}</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="footer-copyright">
        <div className="footer-container">
          <span>{strings.COPYRIGHT_PART1}{strings.COPYRIGHT_PART2}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
