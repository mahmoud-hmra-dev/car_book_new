import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native'
import { router, usePathname } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import i18n from '@/lang/i18n'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as bookcarsTypes from ':bookcars-types'
import { useAuth } from '@/context/AuthContext'

interface CustomDrawerContentProps {
  closeDrawer: () => void
}

interface NavItem {
  path: string
  icon: keyof typeof MaterialIcons.glyphMap
  label: string
}

const CustomDrawerContent = ({ closeDrawer }: CustomDrawerContentProps) => {
  const { loggedIn, language: authLanguage } = useAuth()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const [openLanguageMenu, setOpenLanguageMenu] = useState(false)
  const [language, setLanguage] = useState(authLanguage)

  const navigateTo = (path: string) => {
    closeDrawer()
    if (pathname === path) return
    router.replace(path as any)
  }

  useEffect(() => {
    setLanguage(authLanguage)
  }, [authLanguage])

  const updateLanguage = async (_language: string) => {
    try {
      const setLang = async (__language: string) => {
        i18n.locale = __language
        await UserService.setLanguage(__language)
        setLanguage(__language)
        closeDrawer()
        const routeName = helper.getCurrentRouteName(pathname)
        helper.navigate({ name: routeName }, true)
      }

      const currentUser = await UserService.getCurrentUser()
      if (currentUser?._id) {
        const data: bookcarsTypes.UpdateLanguagePayload = {
          id: currentUser._id,
          language: _language,
        }
        const status = await UserService.updateLanguage(data)
        if (status === 200) {
          await setLang(_language)
        } else {
          helper.error()
        }
      } else {
        await setLang(_language)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleSignOut = async () => {
    await UserService.signout()
    closeDrawer()
  }

  const isActive = (path: string) => pathname === path

  const renderNavItem = (item: NavItem) => (
    <Pressable
      key={item.path}
      style={[styles.menuItem, isActive(item.path) && styles.activeMenuItem]}
      onPress={() => navigateTo(item.path)}
    >
      <MaterialIcons name={item.icon} size={22} color={isActive(item.path) ? '#6B3CE6' : 'rgba(0, 0, 0, 0.54)'} />
      <Text style={[styles.text, isActive(item.path) && styles.activeText]}>{item.label}</Text>
    </Pressable>
  )

  const dashboardItems: NavItem[] = [
    { path: '/', icon: 'dashboard', label: i18n.t('DASHBOARD') },
  ]

  const manageItems: NavItem[] = [
    { path: '/suppliers', icon: 'business', label: i18n.t('SUPPLIERS') },
    { path: '/countries', icon: 'public', label: i18n.t('COUNTRIES') },
    { path: '/locations', icon: 'location-on', label: i18n.t('LOCATIONS') },
    { path: '/cars', icon: 'directions-car', label: i18n.t('CARS') },
    { path: '/users', icon: 'people', label: i18n.t('USERS') },
    { path: '/tracking', icon: 'gps-fixed', label: i18n.t('TRACKING') },
  ]

  const accountItems: NavItem[] = [
    { path: '/bank-details', icon: 'account-balance', label: i18n.t('BANK_DETAILS') },
    { path: '/notifications', icon: 'notifications', label: i18n.t('NOTIFICATIONS') },
    { path: '/settings', icon: 'settings', label: i18n.t('SETTINGS') },
  ]

  return (
    <View style={[styles.drawerSurface, { marginTop: insets.top, marginBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.drawer}>
        <View style={styles.menuSection}>
          {/* App Title */}
          <View style={styles.brandSection}>
            <MaterialIcons name="admin-panel-settings" size={28} color="#6B3CE6" />
            <Text style={styles.brandText}>{i18n.t('BOOKCARS')}</Text>
          </View>

          {/* Dashboard */}
          {loggedIn && dashboardItems.map(renderNavItem)}

          {/* Manage Section */}
          {loggedIn && (
            <>
              <Text style={styles.sectionTitle}>{i18n.t('MANAGE')}</Text>
              {manageItems.map(renderNavItem)}
            </>
          )}

          {/* Account Section */}
          {loggedIn && (
            <>
              <Text style={styles.sectionTitle}>{i18n.t('ACCOUNT')}</Text>
              {accountItems.map(renderNavItem)}
            </>
          )}

          {/* About / ToS / Contact */}
          {renderNavItem({ path: '/about', icon: 'info', label: i18n.t('ABOUT') })}
          {renderNavItem({ path: '/tos', icon: 'description', label: i18n.t('TOS_MENU') })}
          {renderNavItem({ path: '/contact', icon: 'mail', label: i18n.t('CONTACT') })}

          {/* Sign In (when not logged in) */}
          {!loggedIn && renderNavItem({ path: '/sign-in', icon: 'login', label: i18n.t('SIGN_IN') })}

          {/* Sign Out */}
          {loggedIn && (
            <Pressable style={styles.signout} onPress={handleSignOut}>
              <MaterialIcons name="logout" size={22} color="rgba(0, 0, 0, 0.54)" />
              <Text style={styles.text}>{i18n.t('SIGN_OUT')}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.languageSection}>
          {openLanguageMenu && (
            <View style={styles.languageMenu}>
              {env.LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={lang.code === language ? styles.languageMenuSelectedItem : styles.languageMenuItem}
                  onPress={async () => {
                    if (lang.code !== language) {
                      await updateLanguage(lang.code)
                      setOpenLanguageMenu(false)
                    }
                  }}
                >
                  <Text style={lang.code === language ? styles.languageMenuSelectedText : styles.languageMenuText}>
                    {lang.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            style={styles.languageButton}
            onPress={() => setOpenLanguageMenu((prev) => !prev)}
          >
            <MaterialIcons name="language" size={22} color="rgba(0, 0, 0, 0.54)" />
            <Text style={styles.text}>{i18n.t('LANGUAGE')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  drawerSurface: {
    flex: 1,
    width: 280,
    backgroundColor: '#fff',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  drawer: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B3CE6',
    marginLeft: 12,
  },
  menuSection: {
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(0, 0, 0, 0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginBottom: 2,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: '#ede7f9',
  },
  signout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  text: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontWeight: '600',
    marginLeft: 16,
    fontSize: 14,
  },
  activeText: {
    color: '#6B3CE6',
  },
  languageSection: {
    paddingHorizontal: 15,
    marginTop: 30,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  languageMenu: {
    marginTop: 10,
    borderRadius: 7,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  languageMenuItem: {
    padding: 12,
    paddingLeft: 44,
  },
  languageMenuSelectedItem: {
    padding: 12,
    paddingLeft: 44,
    backgroundColor: '#ede7f9',
  },
  languageMenuText: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontWeight: '600',
  },
  languageMenuSelectedText: {
    color: '#6B3CE6',
    fontWeight: '600',
  },
})

export default CustomDrawerContent
