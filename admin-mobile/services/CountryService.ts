import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getCountries = async (page: number, size: number, language: string): Promise<bookcarsTypes.Result<bookcarsTypes.Country>> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/countries/${page}/${size}/${language}`, { headers })
    .then((res) => res.data)
}

export const getCountry = async (id: string, language: string): Promise<bookcarsTypes.Country> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/country/${encodeURIComponent(id)}/${language}`, { headers })
    .then((res) => res.data)
}

export const createCountry = async (data: bookcarsTypes.UpsertCountryPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/create-country', data, { headers })
    .then((res) => res.status)
}

export const updateCountry = async (id: string, data: bookcarsTypes.UpsertCountryPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .put(`/api/update-country/${encodeURIComponent(id)}`, data, { headers })
    .then((res) => res.status)
}

export const deleteCountry = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .delete(`/api/delete-country/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const checkCountry = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/check-country/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const validateCountry = async (data: bookcarsTypes.ValidateCountryPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/validate-country', data, { headers })
    .then((res) => res.status)
}
