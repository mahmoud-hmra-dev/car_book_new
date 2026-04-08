import { Platform } from 'react-native'
import * as Device from 'expo-device'
import type * as NotificationsType from 'expo-notifications'

let Notifications: typeof NotificationsType | null = null
try {
  Notifications = require('expo-notifications') as typeof NotificationsType
} catch {
  // expo-notifications not available in Expo Go (SDK 53+)
}
import Constants from 'expo-constants'
import { router } from 'expo-router'
import mime from 'mime'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as toastHelper from '@/utils/toastHelper'

export const android = () => Platform.OS === 'android'
export const ios = () => Platform.OS === 'ios'

export const toast = (message: string) => {
  toastHelper.toast(message)
}

export const error = (err?: unknown, __toast__ = true) => {
  toastHelper.error(err, __toast__)
}

export const getFileName = (path: string) => path.replace(/^.*[\\/]/, '')

export const getMimeType = (fileName: string) => mime.getType(fileName)

export const registerPushToken = async (userId: string) => {
  const registerForPushNotificationsAsync = async () => {
    let token

    if (!Notifications) {
      console.warn('expo-notifications is not available (Expo Go SDK 53+)')
      return undefined
    }

    try {
      if (android()) {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })
      }

      if (Device.isDevice) {
        const settings = await Notifications.getPermissionsAsync()
        let granted = ('granted' in settings && settings.granted) || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED

        if (!granted) {
          const status = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
            android: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            }
          })
          granted = ('granted' in status && status.granted) || status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
        }
        if (!granted) {
          alert('Failed to get push token for push notification!')
          return ''
        }
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data
      } else {
        alert('Must use physical device for Push Notifications')
      }
    } catch (err) {
      error(err, false)
    }

    return token
  }

  try {
    await UserService.deletePushToken(userId)
    const token = await registerForPushNotificationsAsync()

    if (token) {
      const status = await UserService.createPushToken(userId, token)
      if (status !== 200) {
        error()
      }
    } else {
      error()
    }
  } catch (err) {
    error(err, false)
  }
}

export const dateTime = (date: Date, time: Date) => {
  const _dateTime = new Date(date)
  _dateTime.setHours(time.getHours())
  _dateTime.setMinutes(time.getMinutes())
  _dateTime.setSeconds(time.getSeconds())
  _dateTime.setMilliseconds(time.getMilliseconds())
  return _dateTime
}

export const getCarTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.CarType.Diesel:
      return i18n.t('DIESEL_SHORT')
    case bookcarsTypes.CarType.Gasoline:
      return i18n.t('GASOLINE_SHORT')
    case bookcarsTypes.CarType.Electric:
      return i18n.t('ELECTRIC_SHORT')
    case bookcarsTypes.CarType.Hybrid:
      return i18n.t('HYBRID_SHORT')
    case bookcarsTypes.CarType.PlugInHybrid:
      return i18n.t('PLUG_IN_HYBRID_SHORT')
    default:
      return ''
  }
}

export const getGearboxTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.GearboxType.Manual:
      return i18n.t('GEARBOX_MANUAL_SHORT')
    case bookcarsTypes.GearboxType.Automatic:
      return i18n.t('GEARBOX_AUTOMATIC_SHORT')
    default:
      return ''
  }
}

export const getMileage = (mileage: number, language: string) => {
  if (mileage === -1) {
    return i18n.t('UNLIMITED')
  }
  return `${bookcarsHelper.formatNumber(mileage, language)} ${i18n.t('MILEAGE_UNIT')}`
}

export const getFuelPolicy = (type: string) => {
  switch (type) {
    case bookcarsTypes.FuelPolicy.LikeForLike:
      return i18n.t('FUEL_POLICY_LIKE_FOR_LIKE')
    case bookcarsTypes.FuelPolicy.FreeTank:
      return i18n.t('FUEL_POLICY_FREE_TANK')
    case bookcarsTypes.FuelPolicy.FullToFull:
      return i18n.t('FUEL_POLICY_FULL_TO_FULL')
    case bookcarsTypes.FuelPolicy.FullToEmpty:
      return i18n.t('FUEL_POLICY_FULL_TO_EMPTY')
    default:
      return ''
  }
}

export const getBookingStatuses = (): bookcarsTypes.StatusFilterItem[] => [
  { value: bookcarsTypes.BookingStatus.Void, label: i18n.t('BOOKING_STATUS_VOID') },
  { value: bookcarsTypes.BookingStatus.Pending, label: i18n.t('BOOKING_STATUS_PENDING') },
  { value: bookcarsTypes.BookingStatus.Deposit, label: i18n.t('BOOKING_STATUS_DEPOSIT') },
  { value: bookcarsTypes.BookingStatus.Paid, label: i18n.t('BOOKING_STATUS_PAID') },
  { value: bookcarsTypes.BookingStatus.PaidInFull, label: i18n.t('BOOKING_STATUS_PAID_IN_FULL') },
  { value: bookcarsTypes.BookingStatus.Reserved, label: i18n.t('BOOKING_STATUS_RESERVED') },
  { value: bookcarsTypes.BookingStatus.Cancelled, label: i18n.t('BOOKING_STATUS_CANCELLED') },
]

export const getBookingStatus = (status: bookcarsTypes.BookingStatus) => {
  switch (status) {
    case bookcarsTypes.BookingStatus.Void:
      return i18n.t('BOOKING_STATUS_VOID')
    case bookcarsTypes.BookingStatus.Pending:
      return i18n.t('BOOKING_STATUS_PENDING')
    case bookcarsTypes.BookingStatus.Deposit:
      return i18n.t('BOOKING_STATUS_DEPOSIT')
    case bookcarsTypes.BookingStatus.Paid:
      return i18n.t('BOOKING_STATUS_PAID')
    case bookcarsTypes.BookingStatus.PaidInFull:
      return i18n.t('BOOKING_STATUS_PAID_IN_FULL')
    case bookcarsTypes.BookingStatus.Reserved:
      return i18n.t('BOOKING_STATUS_RESERVED')
    case bookcarsTypes.BookingStatus.Cancelled:
      return i18n.t('BOOKING_STATUS_CANCELLED')
    default:
      return ''
  }
}

export const getBirthDateError = (minimumAge: number) =>
  `${i18n.t('BIRTH_DATE_NOT_VALID_PART1')} ${minimumAge} ${i18n.t('BIRTH_DATE_NOT_VALID_PART2')} `

export const getCurrentRouteName = (pathname: string): string => {
  if (!pathname || pathname === '/') {
    return 'Home'
  }
  const segments = pathname.split('/').filter(Boolean)
  const baseSegment = segments[0]
  const formattedName = baseSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
  return formattedName
}

export const navigate = (route: { name: string; params?: any }, reload?: boolean) => {
  const name = route.name || ''
  const isHome = name.toLowerCase() === 'home' || name.toLowerCase() === 'index'
  let pathname = '/'
  if (!isHome) {
    const kebabName = name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
    pathname = `/${kebabName}`
  }
  const params = reload
    ? { ...route.params, d: Date.now().toString() }
    : route.params
  if (reload) {
    router.replace({ pathname: pathname as any, params })
  } else {
    router.push({ pathname: pathname as any, params })
  }
}

export const getCarRange = (range: bookcarsTypes.CarRange) => {
  switch (range) {
    case bookcarsTypes.CarRange.Mini:
      return i18n.t('CAR_RANGE_MINI')
    case bookcarsTypes.CarRange.Midi:
      return i18n.t('CAR_RANGE_MIDI')
    case bookcarsTypes.CarRange.Maxi:
      return i18n.t('CAR_RANGE_MAXI')
    case bookcarsTypes.CarRange.Scooter:
      return i18n.t('CAR_RANGE_SCOOTER')
    case bookcarsTypes.CarRange.Bus:
      return i18n.t('CAR_RANGE_BUS')
    case bookcarsTypes.CarRange.Truck:
      return i18n.t('CAR_RANGE_TRUCK')
    case bookcarsTypes.CarRange.Caravan:
      return i18n.t('CAR_RANGE_CARAVAN')
    default:
      return ''
  }
}

export const carOptionAvailable = (car: bookcarsTypes.Car | undefined | null, option: string) =>
  car && option in car && (car[option as keyof bookcarsTypes.Car] as number) > -1

export const getBookingStatusColor = (status: bookcarsTypes.BookingStatus) => {
  switch (status) {
    case bookcarsTypes.BookingStatus.Void:
      return '#999'
    case bookcarsTypes.BookingStatus.Pending:
      return '#e98003'
    case bookcarsTypes.BookingStatus.Deposit:
      return '#22bbbe'
    case bookcarsTypes.BookingStatus.Paid:
      return '#77bc23'
    case bookcarsTypes.BookingStatus.PaidInFull:
      return '#22C55E'
    case bookcarsTypes.BookingStatus.Reserved:
      return '#188ace'
    case bookcarsTypes.BookingStatus.Cancelled:
      return '#bc2143'
    default:
      return '#999'
  }
}
