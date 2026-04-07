import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getBookings = async (data: bookcarsTypes.GetBookingsPayload, page: number, size: number, language: string): Promise<bookcarsTypes.Result<bookcarsTypes.Booking>> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/bookings/${page}/${size}/${language}`, data, { headers })
    .then((res) => res.data)
}

export const getBooking = async (id: string, language: string): Promise<bookcarsTypes.Booking> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/booking/${encodeURIComponent(id)}/${language}`, { headers })
    .then((res) => res.data)
}

export const createBooking = async (data: bookcarsTypes.UpsertBookingPayload): Promise<bookcarsTypes.Booking> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/create-booking', data, { headers })
    .then((res) => res.data)
}

export const updateBooking = async (data: bookcarsTypes.UpsertBookingPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .put('/api/update-booking', data, { headers })
    .then((res) => res.status)
}

export const updateBookingStatus = async (data: bookcarsTypes.UpdateStatusPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/update-booking-status', data, { headers })
    .then((res) => res.status)
}

export const deleteBookings = async (ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/delete-bookings', ids, { headers })
    .then((res) => res.status)
}

export const hasBookings = async (driver: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/has-bookings/${encodeURIComponent(driver)}`, { headers })
    .then((res) => res.status)
}
