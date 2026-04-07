import { Platform } from 'react-native'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getCars = async (data: bookcarsTypes.GetCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/cars/${page}/${size}`, data, { headers })
    .then((res) => res.data)
}

export const getCar = async (id: string, language: string): Promise<bookcarsTypes.Car> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/car/${encodeURIComponent(id)}/${language}`, { headers })
    .then((res) => res.data)
}

export const createCar = async (data: bookcarsTypes.CreateCarPayload): Promise<bookcarsTypes.Car> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/create-car', data, { headers })
    .then((res) => res.data)
}

export const updateCar = async (data: bookcarsTypes.UpdateCarPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .put('/api/update-car', data, { headers })
    .then((res) => res.status)
}

export const deleteCar = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .delete(`/api/delete-car/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const checkCar = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/check-car/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const getBookingCars = async (data: bookcarsTypes.GetBookingCarsPayload, page: number, size: number): Promise<bookcarsTypes.Car[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/booking-cars/${page}/${size}`, data, { headers })
    .then((res) => res.data)
}

export const createCarImage = async (file: BlobInfo): Promise<string> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('image', { uri, name: file.name, type: file.type } as any)
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/create-car-image', formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
}

export const updateCarImage = async (id: string, file: BlobInfo): Promise<number> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('image', { uri, name: file.name, type: file.type } as any)
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/update-car-image/${encodeURIComponent(id)}`, formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.status)
}

export const deleteCarImage = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/delete-car-image/${encodeURIComponent(id)}`, null, { headers })
    .then((res) => res.status)
}

export const deleteTempCarImage = async (image: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/delete-temp-car-image/${encodeURIComponent(image)}`, null, { headers })
    .then((res) => res.status)
}

export const addCarImages = async (id: string, files: BlobInfo[]): Promise<number> => {
  const formData = new FormData()
  files.forEach((file) => {
    const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
    formData.append('images', { uri, name: file.name, type: file.type } as any)
  })
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/add-car-images/${encodeURIComponent(id)}`, formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.status)
}

export const deleteCarImageFromList = async (id: string, image: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/delete-car-image-from-list/${encodeURIComponent(id)}/${encodeURIComponent(image)}`, null, { headers })
    .then((res) => res.status)
}

export const validateLicensePlate = async (licensePlate: string, id?: string): Promise<number> => {
  const headers = await UserService.authHeader()
  const url = id
    ? `/api/validate-license-plate/${encodeURIComponent(id)}/${encodeURIComponent(licensePlate)}`
    : `/api/validate-license-plate/${encodeURIComponent(licensePlate)}`
  return axiosInstance.get(url, { headers }).then((res) => res.status)
}
