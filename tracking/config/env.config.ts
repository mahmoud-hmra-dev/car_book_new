import {
  BC_API_HOST,
  BC_DEFAULT_LANGUAGE,
  BC_GOOGLE_MAPS_API_KEY,
  BC_TRACKING_REFRESH_INTERVAL,
  BC_CDN_USERS,
  BC_CDN_CARS,
} from '@env'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
]

export const APP_TYPE: string = 'admin'
export const API_HOST: string = BC_API_HOST
export const DEFAULT_LANGUAGE: string = BC_DEFAULT_LANGUAGE || 'en'
export const GOOGLE_MAPS_API_KEY: string = String(BC_GOOGLE_MAPS_API_KEY || '')
export const TRACKING_REFRESH_INTERVAL: number = Number(BC_TRACKING_REFRESH_INTERVAL) || 30000
export const CDN_USERS: string = BC_CDN_USERS || ''
export const CDN_CARS: string = BC_CDN_CARS || ''
export const AXIOS_TIMEOUT: number = 10000
export const AXIOS_RETRIES: number = 3
export const AXIOS_RETRIES_INTERVAL: number = 500
