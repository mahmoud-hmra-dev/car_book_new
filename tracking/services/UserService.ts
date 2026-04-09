import { Platform } from 'react-native'
import { router } from 'expo-router'
import * as Localization from 'expo-localization'
import { decode as atob } from 'base-64'
import axiosInstance from './axiosInstance'
import * as env from '@/config/env.config'
import * as AsyncStorage from '@/utils/AsyncStorage'
import * as toastHelper from '@/utils/toastHelper'
import * as bookcarsTypes from ':bookcars-types'

const USER_KEY = 'bc-tracking-user'

export const authHeader = async () => {
  const user = await getCurrentUser()
  if (user && user.accessToken) {
    return { 'x-access-token': user.accessToken }
  }
  return {}
}

export const signin = async (data: bookcarsTypes.SignInPayload): Promise<{ status: number, data: bookcarsTypes.User }> => {
  console.log('====== [SIGN-IN] REQUEST ======')
  console.log('URL:', `${env.API_HOST}/api/sign-in/admin`)
  console.log('Method: POST')
  console.log('Payload:', JSON.stringify({ email: data.email, password: '***' }, null, 2))

  const payload = { ...data, mobile: true }

  return axiosInstance
    .post('/api/sign-in/admin', payload)
    .then(async (res) => {
      console.log('====== [SIGN-IN] RESPONSE ======')
      console.log('Status:', res.status)
      console.log('Data:', JSON.stringify({
        ...res.data,
        accessToken: res.data.accessToken ? `${res.data.accessToken.substring(0, 20)}...` : undefined,
      }, null, 2))

      if (res.data.accessToken) {
        await AsyncStorage.storeObject(USER_KEY, res.data)
      }
      return { status: res.status, data: res.data }
    })
    .catch((err) => {
      console.log('====== [SIGN-IN] ERROR ======')
      console.log('Status:', err?.response?.status || 'N/A')
      console.log('Message:', err?.message || 'Unknown error')
      console.log('Response Data:', JSON.stringify(err?.response?.data, null, 2))
      throw err
    })
}

export const signout = async (redirectSignin = true) => {
  await AsyncStorage.removeItem(USER_KEY)
  if (redirectSignin) {
    const now = new Date().getTime().toString()
    router.replace({ pathname: '/(auth)/sign-in', params: { d: now } })
  }
}

export const validateAccessToken = async (): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/validate-access-token', null, { headers, timeout: env.AXIOS_TIMEOUT })
    .then((res) => res.status)
    .catch((err) => {
      if (err.response?.status) return err.response.status
      return 500
    })
}

export const getCurrentUser = async () => {
  const user = await AsyncStorage.getObject<bookcarsTypes.User>(USER_KEY)
  if (user && user.accessToken) return user
  return null
}

export const getUser = async (id: string): Promise<bookcarsTypes.User> => {
  const headers = await authHeader()
  return axiosInstance
    .get(`/api/user/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.data)
}

export const getLanguage = async () => {
  const user = await AsyncStorage.getObject<bookcarsTypes.User>(USER_KEY)
  if (user && user.language) return user.language
  let lang = await AsyncStorage.getString('bc-tracking-language')
  if (lang && lang.length === 2) return lang
  lang = getDefaultLanguage()
  return lang
}

export const getDefaultLanguage = () => {
  // Always default to English for fleet tracking app
  return env.DEFAULT_LANGUAGE || 'en'
}

export const setLanguage = async (lang: string) => {
  await AsyncStorage.storeString('bc-tracking-language', lang)
}

export const updateLanguage = async (data: bookcarsTypes.UpdateLanguagePayload) => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/update-language', data, { headers })
    .then(async (res) => {
      if (res.status === 200) {
        const user = await AsyncStorage.getObject<bookcarsTypes.User>(USER_KEY)
        if (user) {
          user.language = data.language
          await AsyncStorage.storeObject(USER_KEY, user)
        }
      }
      return res.status
    })
}

export const loggedIn = async () => {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      const status = await validateAccessToken()
      if (status === 200 && currentUser._id) {
        const user = await getUser(currentUser._id)
        if (user) return true
      }
    }
    return false
  } catch {
    return false
  }
}

export const parseJwt = (token: string) => {
  try {
    if (!token || !token.includes('.')) return {}
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    const jsonPayload = decodeURIComponent(
      decoded.split('').map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('JWT Parse Error:', error)
    return {}
  }
}
