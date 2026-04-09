import { AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import * as env from '@/config/env.config'

export const init = (axiosInstance: AxiosInstance) => {
  axiosRetry(axiosInstance, {
    retries: env.AXIOS_RETRIES,
    retryDelay: (retryCount) => {
      console.log(`retry attempt: ${retryCount}`)
      return retryCount * env.AXIOS_RETRIES_INTERVAL
    },
    retryCondition: (err) => {
      // Never retry auth errors (401, 403)
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        return false
      }
      // Only retry network errors or 5xx
      return !status || status >= 500
    },
  })
}
