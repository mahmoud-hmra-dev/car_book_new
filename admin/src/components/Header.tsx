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
      className="z-[1401]!"
    >
      <MenuItem onClick={handleSettingsClick}>
        <SettingsIcon className="mr-5 rtl:mr-0 rtl:ml-5" />
        <Typography>{strings.SETTINGS}</Typography>
      </MenuItem>
      <MenuItem onClick={handleSignout}>
        <SignoutIcon className="mr-5 rtl:mr-0 rtl:ml-5" />
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
      className="z-[1401]!"
    >
      <MenuItem onClick={handleSettingsClick}>
        <SettingsIcon className="mr-5 rtl:mr-0 rtl:ml-5" />
        <p>{strings.SETTINGS}</p>
      </MenuItem>
      <MenuItem onClick={handleLangMenuOpen}>
        <LanguageIcon className="mr-5 rtl:mr-0 rtl:ml-5" />
        <p>{strings.LANGUAGE}</p>
      </MenuItem>
      <MenuItem onClick={handleSignout}>
        <SignoutIcon className="mr-5 rtl:mr-0 rtl:ml-5" />
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
      className="z-[1401]!"
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
        className={`hidden max-[960px]:block max-[960px]:fixed max-[960px]:inset-0 max-[960px]:bg-black/40 max-[960px]:z-[1299] ${sidebarOpen ? 'max-[960px]:!block' : 'max-[960px]:!hidden'}`}
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
        <aside
          className={[
            // Base sidebar styles
            'shrink-0 bg-white border-r border-border flex flex-col h-screen sticky top-0 overflow-x-hidden overflow-y-auto z-[200] transition-[width] duration-200 ease-in-out',
            // Scrollbar styling
            '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded',
            // Desktop width (collapsed vs expanded)
            sidebarCollapsed ? 'w-[60px]' : 'w-[260px]',
            // Mobile: override to fixed drawer
            'max-[960px]:fixed max-[960px]:top-0 max-[960px]:left-0 max-[960px]:bottom-0 max-[960px]:!w-[280px] max-[960px]:z-[1300] max-[960px]:shadow-none',
            'max-[960px]:-translate-x-full max-[960px]:transition-transform max-[960px]:duration-[250ms] max-[960px]:ease-[cubic-bezier(0.4,0,0.2,1)]',
            // RTL mobile
            'rtl:max-[960px]:left-auto rtl:max-[960px]:right-0 rtl:max-[960px]:translate-x-full rtl:max-[960px]:-translate-x-0',
            // Mobile sidebar-open state
            sidebarOpen ? 'max-[960px]:translate-x-0 max-[960px]:shadow-[4px_0_24px_rgb(0_0_0/12%)] rtl:max-[960px]:translate-x-0 rtl:max-[960px]:shadow-[-4px_0_24px_rgb(0_0_0/12%)]' : '',
          ].join(' ')}
        >
          {/* Toggle button (hidden on mobile) */}
          <div className="relative shrink-0 max-[960px]:hidden">
            <button
              type="button"
              className="absolute -right-3.5 top-3 w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center cursor-pointer z-10 shadow-[0_2px_4px_rgb(0_0_0/10%)] transition-[transform] duration-200 ease-in-out p-0 text-text-secondary hover:bg-slate-50 hover:text-text rtl:right-auto rtl:-left-3.5"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </button>
          </div>

          {/* Brand */}
          <div
            className={[
              'flex items-center gap-2.5 border-b border-border shrink-0',
              sidebarCollapsed ? 'justify-center py-4 px-0 max-[960px]:justify-start max-[960px]:px-6' : 'px-6 py-4',
            ].join(' ')}
          >
            <CarsIcon className="text-primary !text-[28px]" />
            <span
              className={[
                'text-lg font-bold text-[#0F1419] whitespace-nowrap',
                sidebarCollapsed ? 'hidden max-[960px]:inline' : '',
              ].join(' ')}
            >
              {env.WEBSITE_NAME || 'BookCars'}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-2 overflow-y-auto">
            {navGroups.map((group, gi) => (
              <div key={`group-${gi}`}>
                {group.label && (
                  <div
                    className={[
                      'uppercase text-[11px] font-semibold text-text-muted tracking-[0.5px] leading-none',
                      sidebarCollapsed ? 'hidden max-[960px]:block max-[960px]:px-6 max-[960px]:pt-6 max-[960px]:pb-2' : 'px-6 pt-6 pb-2',
                    ].join(' ')}
                  >
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => (
                  <Tooltip
                    key={item.path}
                    title={sidebarCollapsed ? item.label : ''}
                    placement="right"
                    arrow
                  >
                    <div
                      className={[
                        'flex items-center gap-3 h-10 cursor-pointer text-[#334155] text-sm font-medium transition-[background-color,color,border-color] duration-150 ease-in-out no-underline whitespace-nowrap select-none',
                        // Default (not collapsed) layout
                        sidebarCollapsed
                          ? 'justify-center px-3 mx-1 my-0.5 rounded-lg border-l-3 border-l-transparent max-[960px]:justify-start max-[960px]:px-4 max-[960px]:pl-6 max-[960px]:mr-2 max-[960px]:ml-0 max-[960px]:rounded-none max-[960px]:rounded-r-lg rtl:max-[960px]:mr-0 rtl:max-[960px]:ml-2 rtl:max-[960px]:rounded-none rtl:max-[960px]:rounded-l-lg rtl:max-[960px]:pl-4 rtl:max-[960px]:pr-6'
                          : 'pl-6 pr-4 mr-2 ml-0 rounded-r-lg border-l-3 border-l-transparent rtl:border-l-0 rtl:border-r-3 rtl:border-r-transparent rtl:rounded-r-none rtl:rounded-l-lg rtl:ml-2 rtl:mr-0 rtl:pr-6 rtl:pl-4',
                        // Hover
                        'hover:bg-primary/6',
                        // Active state
                        isActive(item.path, item.exact)
                          ? [
                            'bg-primary/8 text-primary',
                            sidebarCollapsed
                              ? 'max-[960px]:border-l-primary rtl:max-[960px]:border-r-primary'
                              : 'border-l-primary rtl:border-l-transparent rtl:border-r-primary',
                          ].join(' ')
                          : '',
                      ].join(' ')}
                      onClick={() => handleNavClick(item.path)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleNavClick(item.path)
                        }
                      }}
                    >
                      <span className="!text-[20px] shrink-0 text-inherit">{item.icon}</span>
                      <span
                        className={[
                          'overflow-hidden text-ellipsis',
                          sidebarCollapsed ? 'hidden max-[960px]:inline' : '',
                        ].join(' ')}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer links */}
          <div className="border-t border-border py-2 shrink-0">
            {[
              { path: '/about', label: strings.ABOUT, icon: <AboutIcon /> },
              { path: '/tos', label: strings.TOS, icon: <TosIcon /> },
              { path: '/contact', label: strings.CONTACT, icon: <MailIcon /> },
            ].map((item) => (
              <Tooltip key={item.path} title={sidebarCollapsed ? item.label : ''} placement="right" arrow>
                <div
                  className={[
                    'flex items-center gap-3 h-9 cursor-pointer text-text-secondary text-[13px] font-medium transition-[background-color,color,border-color] duration-150 ease-in-out no-underline whitespace-nowrap select-none',
                    'hover:bg-primary/6 hover:text-text',
                    sidebarCollapsed
                      ? 'justify-center px-3 mx-1 my-0.5 rounded-lg border-l-3 border-l-transparent max-[960px]:justify-start max-[960px]:px-4 max-[960px]:pl-6 max-[960px]:mr-2 max-[960px]:ml-0 max-[960px]:rounded-none max-[960px]:rounded-r-lg rtl:max-[960px]:mr-0 rtl:max-[960px]:ml-2 rtl:max-[960px]:rounded-none rtl:max-[960px]:rounded-l-lg rtl:max-[960px]:pl-4 rtl:max-[960px]:pr-6'
                      : 'pl-6 pr-4 mr-2 ml-0 rounded-r-lg border-l-3 border-l-transparent rtl:border-l-0 rtl:border-r-3 rtl:border-r-transparent rtl:rounded-r-none rtl:rounded-l-lg rtl:ml-2 rtl:mr-0 rtl:pr-6 rtl:pl-4',
                    isActive(item.path)
                      ? [
                        'bg-primary/8 text-primary',
                        sidebarCollapsed
                          ? 'max-[960px]:border-l-primary rtl:max-[960px]:border-r-primary'
                          : 'border-l-primary rtl:border-l-transparent rtl:border-r-primary',
                      ].join(' ')
                      : '',
                  ].join(' ')}
                  onClick={() => handleNavClick(item.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNavClick(item.path)
                    }
                  }}
                >
                  <span className="!text-[20px] shrink-0 text-inherit">{item.icon}</span>
                  <span
                    className={[
                      'overflow-hidden text-ellipsis',
                      sidebarCollapsed ? 'hidden max-[960px]:inline' : '',
                    ].join(' ')}
                  >
                    {item.label}
                  </span>
                </div>
              </Tooltip>
            ))}
          </div>
        </aside>
      )}

      {/* Content column: topbar + page content */}
      <div className="admin-content-column">
        <header className="h-14 bg-white border-b border-border flex items-center px-6 sticky top-0 z-[100] shrink-0">
          <div className="flex items-center gap-2">
            {isLoaded && isSignedIn && (
              <IconButton
                className="!hidden max-[960px]:!inline-flex"
                edge="start"
                color="default"
                aria-label="open sidebar"
                onClick={handleSidebarOpen}
              >
                <MenuIcon />
              </IconButton>
            )}
            <span className="hidden max-[960px]:block text-base font-bold text-primary whitespace-nowrap">{env.WEBSITE_NAME || 'BookCars'}</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
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
