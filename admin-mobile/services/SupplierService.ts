import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getSuppliers = async (page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.User>> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/suppliers/${page}/${size}`, { headers })
    .then((res) => res.data)
}

export const getSupplier = async (id: string): Promise<bookcarsTypes.User> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/supplier/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.data)
}

export const getAllSuppliers = async (): Promise<bookcarsTypes.User[]> =>
  axiosInstance
    .get('/api/all-suppliers')
    .then((res) => res.data)

export const getAdminSuppliers = async (body: bookcarsTypes.GetUsersBody): Promise<bookcarsTypes.User[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/admin-suppliers', body, { headers })
    .then((res) => res.data)
}

export const updateSupplier = async (data: bookcarsTypes.UpdateSupplierPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .put('/api/update-supplier', data, { headers })
    .then((res) => res.status)
}

export const deleteSupplier = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .delete(`/api/delete-supplier/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const validateSupplier = async (data: bookcarsTypes.ValidateSupplierPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/validate-supplier', data, { headers })
    .then((res) => res.status)
}
