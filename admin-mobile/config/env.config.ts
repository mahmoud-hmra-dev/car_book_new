import {
  BC_API_HOST,
  BC_DEFAULT_LANGUAGE,
  BC_PAGE_SIZE,
  BC_CARS_PAGE_SIZE,
  BC_BOOKINGS_PAGE_SIZE,
  BC_CDN_USERS,
  BC_CDN_CARS,
  BC_CDN_LOCATIONS,
  BC_CDN_TEMP_LOCATIONS,
  BC_CDN_CONTRACTS,
  BC_CDN_TEMP_CONTRACTS,
  BC_CDN_LICENSES,
  BC_CDN_TEMP_LICENSES,
  BC_SUPPLIER_IMAGE_WIDTH,
  BC_SUPPLIER_IMAGE_HEIGHT,
  BC_CAR_IMAGE_WIDTH,
  BC_CAR_IMAGE_HEIGHT,
  BC_MINIMUM_AGE,
  BC_DEPOSIT_FILTER_VALUE_1,
  BC_DEPOSIT_FILTER_VALUE_2,
  BC_DEPOSIT_FILTER_VALUE_3,
  BC_WEBSITE_NAME,
  BC_GOOGLE_WEB_CLIENT_ID,
} from '@env'

export const LANGUAGES = [
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espa\u00f1ol' },
]

export const APP_TYPE: string = 'admin'

export const WEBSITE_NAME: string = String(BC_WEBSITE_NAME || 'BookCars')
export const API_HOST: string = BC_API_HOST
export const AXIOS_TIMEOUT: number = 5000
export const AXIOS_RETRIES: number = 3
export const AXIOS_RETRIES_INTERVAL: number = 500
export const DEFAULT_LANGUAGE: string = BC_DEFAULT_LANGUAGE || 'en'
export const PAGE_SIZE: number = Number.parseInt(BC_PAGE_SIZE, 10) || 20
export const CARS_PAGE_SIZE: number = Number.parseInt(BC_CARS_PAGE_SIZE, 10) || 15
export const BOOKINGS_PAGE_SIZE: number = Number.parseInt(BC_BOOKINGS_PAGE_SIZE, 10) || 15
export const CDN_USERS: string = BC_CDN_USERS
export const CDN_CARS: string = BC_CDN_CARS
export const CDN_LOCATIONS: string = BC_CDN_LOCATIONS
export const CDN_TEMP_LOCATIONS: string = BC_CDN_TEMP_LOCATIONS
export const CDN_CONTRACTS: string = BC_CDN_CONTRACTS
export const CDN_TEMP_CONTRACTS: string = BC_CDN_TEMP_CONTRACTS
export const CDN_LICENSES: string = BC_CDN_LICENSES
export const CDN_TEMP_LICENSES: string = BC_CDN_TEMP_LICENSES
export const PAGE_OFFSET: number = 200
export const SUPPLIER_IMAGE_WIDTH: number = Number.parseInt(BC_SUPPLIER_IMAGE_WIDTH, 10) || 60
export const SUPPLIER_IMAGE_HEIGHT: number = Number.parseInt(BC_SUPPLIER_IMAGE_HEIGHT, 10) || 30
export const CAR_IMAGE_WIDTH: number = Number.parseInt(BC_CAR_IMAGE_WIDTH, 10) || 300
export const CAR_IMAGE_HEIGHT: number = Number.parseInt(BC_CAR_IMAGE_HEIGHT, 10) || 200
export const MINIMUM_AGE: number = Number.parseInt(BC_MINIMUM_AGE, 10) || 21
export const DEPOSIT_FILTER_VALUE_1: number = Number(BC_DEPOSIT_FILTER_VALUE_1)
export const DEPOSIT_FILTER_VALUE_2: number = Number(BC_DEPOSIT_FILTER_VALUE_2)
export const DEPOSIT_FILTER_VALUE_3: number = Number(BC_DEPOSIT_FILTER_VALUE_3)
export const GOOGLE_WEB_CLIENT_ID: string = String(BC_GOOGLE_WEB_CLIENT_ID)
