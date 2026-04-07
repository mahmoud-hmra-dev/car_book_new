import { Platform } from 'react-native'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getLocations = async (page: number, size: number, language: string): Promise<bookcarsTypes.Result<bookcarsTypes.Location>> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/locations/${page}/${size}/${language}`, { headers })
    .then((res) => res.data)
}

export const getLocation = async (id: string, language: string): Promise<bookcarsTypes.Location> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/location/${encodeURIComponent(id)}/${language}`, { headers })
    .then((res) => res.data)
}

export const createLocation = async (data: bookcarsTypes.UpsertLocationPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/create-location', data, { headers })
    .then((res) => res.status)
}

export const updateLocation = async (id: string, data: bookcarsTypes.UpsertLocationPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .put(`/api/update-location/${encodeURIComponent(id)}`, data, { headers })
    .then((res) => res.status)
}

export const deleteLocation = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .delete(`/api/delete-location/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const checkLocation = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/check-location/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const validateLocation = async (data: bookcarsTypes.ValidateLocationPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/validate-location', data, { headers })
    .then((res) => res.status)
}

export const createLocationImage = async (file: BlobInfo): Promise<string> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('image', { uri, name: file.name, type: file.type } as any)
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/create-location-image', formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data)
}

export const updateLocationImage = async (id: string, file: BlobInfo): Promise<number> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('image', { uri, name: file.name, type: file.type } as any)
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/update-location-image/${encodeURIComponent(id)}`, formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.status)
}

export const deleteLocationImage = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/delete-location-image/${encodeURIComponent(id)}`, null, { headers })
    .then((res) => res.status)
}
