import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getBankDetails = async (): Promise<bookcarsTypes.BankDetails | null> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get('/api/bank-details', { headers })
    .then((res) => res.data)
    .catch(() => null)
}

export const upsertBankDetails = async (data: bookcarsTypes.UpsertBankDetailsPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/upsert-bank-details', data, { headers })
    .then((res) => res.status)
}
