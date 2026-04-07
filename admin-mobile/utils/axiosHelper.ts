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
      if (err?.request?._response) {
        console.log(err?.request?._response)
      }
      return true
    },
  })
}
