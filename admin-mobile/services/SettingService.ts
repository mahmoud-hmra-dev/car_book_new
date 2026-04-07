import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getSettings = async (): Promise<bookcarsTypes.Setting | null> =>
  axiosInstance
    .get('/api/settings')
    .then((res) => res.data)
    .catch(() => null)

export const updateSettings = async (data: bookcarsTypes.UpdateSettingsPayload): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .put('/api/update-settings', data, { headers })
    .then((res) => res.status)
}
