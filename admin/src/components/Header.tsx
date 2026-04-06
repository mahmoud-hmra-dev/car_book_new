import React, { useState, useEffect, useCallback, ReactNode } from 'react'
import { toast } from 'react-toastify'
import {
  Typography,
  IconButton,
  Badge,
  MenuItem,
  Menu,
  Button,
  Tooltip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Mail as MailIcon,
  Notifications as NotificationsIcon,
  More as MoreIcon,
  Language as LanguageIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  CorporateFare as SuppliersIcon,
  LocationOn as LocationsIcon,
  DirectionsCar as CarsIcon,
  People as UsersIcon,
  InfoTwoTone as AboutIcon,
  DescriptionTwoTone as TosIcon,
  ExitToApp as SignoutIcon,
  Flag as CountriesIcon,
  CalendarMonth as SchedulerIcon,
  AccountBalance as BankDetailsIcon,
  MonetizationOn as PricingIcon,
  SmartToy as AssistantIcon,
  MyLocation as TrackingIcon,
  MenuBook as ManualDocumentationIcon,
  IntegrationInstructions as TechnicalDocumentationIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings } from '@/lang/header'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'
import * as BankDetailsService from '@/services/BankDetailsService'
import Avatar from './Avatar'
import * as langHelper from '@/utils/langHelper'
import * as helper from '@/utils/helper'
import { useNotificationContext, NotificationContextType } from '@/context/NotificationContext'
import { useUserContext, UserContextType } from '@/context/UserContext'

import '@/assets/css/header.css'

interface HeaderProps {
  hidden?: boolean
  children?: ReactNode
}

interface NavItem {
  path: string
  label: string
  icon: React.ReactElement
  exact?: boolean
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const Header = ({
  hidden,
  children,
}: HeaderProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const { user } = useUserContext() as UserContextType
  const { notificationCount } = useNotificationContext() as NotificationContextType

  const [currentUser, setCurrentUser] = useState<bookcarsTypes.User>()
  const [lang, setLang] = useState(helper.getLanguage(env.DEFAULT_LANGUAGE))
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [langAnchorEl, setLangAnchorEl] = useState<HTMLElement | null>(null)
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState<HTMLElement | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [bankDetails, setBankDetails] = useState<bookcarsTypes.BankDetails | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('admin-sidebar-collapsed') === 'true')

  const isMenuOpen = Boolean(anchorEl)
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl)
  const isLangMenuOpen = Boolean(langAnchorEl)

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null)
  }

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget)
  }

  const refreshPage = () => {
    navigate(0)
  }

  const handleLangMenuClose = async (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(null)

    const { code } = event.currentTarget.dataset
    if (code) {
      setLang(helper.getLanguage(code))
      const currentLang = UserService.getLanguage()
      if (isSignedIn && user) {
        const data: bookcarsTypes.UpdateLanguagePayload = {
          id: user._id as string,
          language: code,
        }
        const status = await UserService.updateLanguage(data)
        if (status === 200) {
          UserService.setLanguage(code)
          if (code && code !== currentLang) {
            refreshPage()
          }
        } else {
          toast(commonStrings.CHANGE_LANGUAGE_ERROR, { type: 'error' })
        }
      } else {
        UserService.setLanguage(code)
        if (code && code !== currentLang) {
          refreshPage()
        }
      }
    }
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    handleMobileMenuClose()
  }

  const handleSettingsClick = () => {
    handleMenuClose()
    navigate('/settings')
  }

  const handleSignout = async () => {
    handleMenuClose()
    await UserService.signout()
  }

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMoreAnchorEl(event.currentTarget)
  }

  const handleNotificationsClick = () => {
    navigate('/notifications')
  }

  const handleSidebarOpen = () => {
    setSidebarOpen(true)
  }

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('admin-sidebar-collapsed', String(next))
      return next
    })
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    handleSidebarClose()
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  useEffect(() => {
    const language = langHelper.getLanguage()
    setLang(helper.getLanguage(language))
    langHelper.setLanguage(strings, language)
  }, [])

  useEffect(() => {
    if (user) {
      setCurrentUser(user)
      setIsSignedIn(true)
    } else {
      setCurrentUser(undefined)
      setIsSignedIn(false)
    }
  }, [user])

  useEffect(() => {
    const init = async () => {
      if (!hidden) {
        if (currentUser) {
          const _bankDetails = await BankDetailsService.getBankDetails()
          setBankDetails(_bankDetails)

          setIsSignedIn(true)
          setIsLoaded(true)
        }
      }
    }

    init()
  }, [hidden, currentUser])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    handleSidebarClose()
  }, [location.pathname, handleSidebarClose])

  // Build navigation groups
  const buildNavGroups = (): NavGroup[] => {
    const groups: NavGroup[] = [
      {
        items: [
          { path: '/', label: strings.DASHBOARD, icon: <DashboardIcon />, exact: true },
          { path: '/scheduler', label: strings.SCHEDULER, icon: <SchedulerIcon /> },
        ],
      },
      {
        label: 'MANAGE',
        items: [
          { path: '/suppliers', label: strings.COMPANIES, icon: <SuppliersIcon /> },
          { path: '/countries', label: strings.COUNTRIES, icon: <CountriesIcon /> },
          { path: '/locations', label: strings.LOCATIONS, icon: <LocationsIcon /> },
          { path: '/cars', label: strings.CARS, icon: <CarsIcon /> },
          { path: '/users', label: strings.USERS, icon: <UsersIcon /> },
        ],
      },
      {
        label: 'TOOLS',
        items: [
          { path: '/tracking', label: strings.TRACKING, icon: <TrackingIcon /> },
          { path: '/pricing', label: strings.PRICING, icon: <PricingIcon /> },
          { path: '/assistant', label: strings.ASSISTANT, icon: <AssistantIcon /> },
        ],
      },
      {
        label: 'DOCS',
        items: [
          { path: '/manual-documentation', label: strings.MANUAL_DOCUMENTATION, icon: <ManualDocumentationIcon /> },
          ...(currentUser?.type === bookcarsTypes.UserType.Admin
            ? [{ path: '/technical-documentation', label: strings.TECHNICAL_DOCUMENTATION, icon: <TechnicalDocumentationIcon /> }]
            : []),
        ],
      },
    ]

    // ACCOUNT group
    const accountItems: NavItem[] = []
    if (bankDetails?.showBankDetailsPage) {
      accountItems.push({ path: '/bank-details', label: strings.BANK_DETAILS, icon: <BankDetailsIcon /> })
    }
    accountItems.push({ path: '/settings', label: strings.SETTINGS, icon: <SettingsIcon /> })

    groups.push({
      label: 'ACCOUNT',
      items: accountItems,
    })

    return groups
  }

  const navGroups = buildNavGroups()

  const menuId = 'primary-account-menu'
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={menuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMenuOpen}
      onClose={handleMenuClose}
      className="menu"
    >
      <MenuItem onClick={handleSettingsClick}>
        <SettingsIcon className="header-action" />
        <Typography>{strings.SETTINGS}</Typography>
      </MenuItem>
      <MenuItem onClick={handleSignout}>
        <SignoutIcon className="header-action" />
        <Typography>{strings.SIGN_OUT}</Typography>
      </MenuItem>
    </Menu>
  )

  const mobileMenuId = 'mobile-menu'
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
      className="menu"
    >
      <MenuItem onClick={handleSettingsClick}>
        <SettingsIcon className="header-action" />
        <p>{strings.SETTINGS}</p>
      </MenuItem>
      <MenuItem onClick={handleLangMenuOpen}>
        <LanguageIcon className="header-action" />
        <p>{strings.LANGUAGE}</p>
      </MenuItem>
      <MenuItem onClick={handleSignout}>
        <SignoutIcon className="header-action" />
        <p>{strings.SIGN_OUT}</p>
      </MenuItem>
    </Menu>
  )

  const languageMenuId = 'language-menu'
  const renderLanguageMenu = (
    <Menu
      anchorEl={langAnchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={languageMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isLangMenuOpen}
      onClose={handleLangMenuClose}
      className="menu"
    >
      {
        env._LANGUAGES.map((language) => (
          <MenuItem onClick={handleLangMenuClose} data-code={language.code} key={language.code}>
            {language.label}
          </MenuItem>
        ))
      }
    </Menu>
  )

  if (hidden) {
    return null
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-drawer-backdrop${sidebarOpen ? ' backdrop-visible' : ''}`}
        onClick={handleSidebarClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleSidebarClose()
          }
        }}
        role="button"
        tabIndex={-1}
      />

      {/* Sidebar (only when signed in) */}
      {isLoaded && isSignedIn && (
        <aside className={`admin-sidebar${sidebarOpen ? ' sidebar-open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
          {/* Toggle button */}
          <div className="sidebar-toggle-wrapper">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </button>
          </div>

          {/* Brand */}
          <div className="sidebar-brand">
            <CarsIcon className="sidebar-brand-icon" />
            <span className="sidebar-brand-text">{env.WEBSITE_NAME || 'BookCars'}</span>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            {navGroups.map((group, gi) => (
              <div key={`group-${gi}`}>
                {group.label && (
                  <div className="sidebar-group-label">{group.label}</div>
                )}
                {group.items.map((item) => (
                  <Tooltip
                    key={item.path}
                    title={sidebarCollapsed ? item.label : ''}
                    placement="right"
                    arrow
                  >
                    <div
                      className={`sidebar-nav-item${isActive(item.path, item.exact) ? ' active' : ''}`}
                      onClick={() => handleNavClick(item.path)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleNavClick(item.path)
                        }
                      }}
                    >
                      <span className="sidebar-nav-icon">{item.icon}</span>
                      <span className="sidebar-nav-label">{item.label}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer links */}
          <div className="sidebar-footer">
            <Tooltip title={sidebarCollapsed ? strings.ABOUT : ''} placement="right" arrow>
              <div
                className={`sidebar-nav-item${isActive('/about') ? ' active' : ''}`}
                onClick={() => handleNavClick('/about')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleNavClick('/about')
                  }
                }}
              >
                <span className="sidebar-nav-icon"><AboutIcon /></span>
                <span className="sidebar-nav-label">{strings.ABOUT}</span>
              </div>
            </Tooltip>
            <Tooltip title={sidebarCollapsed ? strings.TOS : ''} placement="right" arrow>
              <div
                className={`sidebar-nav-item${isActive('/tos') ? ' active' : ''}`}
                onClick={() => handleNavClick('/tos')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleNavClick('/tos')
                  }
                }}
              >
                <span className="sidebar-nav-icon"><TosIcon /></span>
                <span className="sidebar-nav-label">{strings.TOS}</span>
              </div>
            </Tooltip>
            <Tooltip title={sidebarCollapsed ? strings.CONTACT : ''} placement="right" arrow>
              <div
                className={`sidebar-nav-item${isActive('/contact') ? ' active' : ''}`}
                onClick={() => handleNavClick('/contact')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleNavClick('/contact')
                  }
                }}
              >
                <span className="sidebar-nav-icon"><MailIcon /></span>
                <span className="sidebar-nav-label">{strings.CONTACT}</span>
              </div>
            </Tooltip>
          </div>
        </aside>
      )}

      {/* Content column: topbar + page content */}
      <div className="admin-content-column">
        <header className="admin-topbar">
          <div className="topbar-left">
            {isLoaded && isSignedIn && (
              <IconButton
                className="topbar-hamburger"
                edge="start"
                color="default"
                aria-label="open sidebar"
                onClick={handleSidebarOpen}
              >
                <MenuIcon />
              </IconButton>
            )}
            <span className="topbar-brand-mobile">{env.WEBSITE_NAME || 'BookCars'}</span>
          </div>

          <div className="topbar-spacer" />

          <div className="topbar-actions">
            {isSignedIn && (
              <IconButton aria-label="notifications" color="default" onClick={handleNotificationsClick}>
                <Badge badgeContent={notificationCount > 0 ? notificationCount : null} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            )}
            {isLoaded && (
              <Button
                variant="text"
                startIcon={<LanguageIcon />}
                onClick={handleLangMenuOpen}
                sx={{ color: '#334155', textTransform: 'none', fontWeight: 500, fontSize: '13px', minWidth: 'auto' }}
              >
                {lang?.label}
              </Button>
            )}
            {isSignedIn && user && (
              <IconButton
                edge="end"
                aria-label="account"
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleAccountMenuOpen}
                color="default"
              >
                <Avatar record={user} type={user.type} size="small" readonly />
              </IconButton>
            )}
            {isSignedIn && (
              <IconButton
                className="topbar-mobile-more"
                aria-label="show more"
                aria-controls={mobileMenuId}
                aria-haspopup="true"
                onClick={handleMobileMenuOpen}
                color="default"
                sx={{ display: { xs: 'inline-flex', md: 'none' } }}
              >
                <MoreIcon />
              </IconButton>
            )}
          </div>
        </header>

        {/* Page content passed as children */}
        {children}
      </div>

      {renderMobileMenu}
      {renderMenu}
      {renderLanguageMenu}
    </>
  )
}

export default Header
