import { Platform } from 'react-native'
import { router } from 'expo-router'
import * as Localization from 'expo-localization'
import { decode as atob } from 'base-64'
import axiosInstance from './axiosInstance'
import * as env from '@/config/env.config'
import * as AsyncStorage from '@/utils/AsyncStorage'
import * as toastHelper from '@/utils/toastHelper'
import * as bookcarsTypes from ':bookcars-types'

const USER_KEY = 'bc-admin-user'

export const authHeader = async () => {
  const user = await getCurrentUser()
  if (user && user.accessToken) {
    return { 'x-access-token': user.accessToken }
  }
  return {}
}

export const signin = async (data: bookcarsTypes.SignInPayload): Promise<{ status: number, data: bookcarsTypes.User }> =>
  axiosInstance
    .post('/api/sign-in/admin', data)
    .then(async (res) => {
      if (res.data.accessToken) {
        await AsyncStorage.storeObject(USER_KEY, res.data)
      }
      return { status: res.status, data: res.data }
    })

export const socialSignin = (data: bookcarsTypes.SignInPayload): Promise<{ status: number, data: bookcarsTypes.User }> =>
  axiosInstance
    .post('/api/social-sign-in', data, { withCredentials: true })
    .then(async (res) => {
      await AsyncStorage.storeObject(USER_KEY, res.data)
      return { status: res.status, data: res.data }
    })

export const signout = async (redirectHome = true, redirectSignin = false) => {
  await AsyncStorage.removeItem(USER_KEY)
  const now = new Date().getTime().toString()
  if (redirectHome) {
    router.push({ pathname: '/', params: { d: now } })
  } else if (redirectSignin) {
    router.push({ pathname: '/sign-in', params: { d: now } })
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

export const updateUser = async (data: bookcarsTypes.UpdateUserPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/update-user', data, { headers })
    .then((res) => res.status)
}

export const getLanguage = async () => {
  const user = await AsyncStorage.getObject<bookcarsTypes.User>(USER_KEY)
  if (user && user.language) return user.language
  let lang = await AsyncStorage.getString('bc-admin-language')
  if (lang && lang.length === 2) return lang
  lang = getDefaultLanguage()
  return lang
}

export const getDefaultLanguage = () => {
  const locales = Localization.getLocales()
  const languageCode = locales?.[0]?.languageCode?.toLowerCase() || ''
  const supportedLanguages = ['en', 'fr', 'es']
  return supportedLanguages.includes(languageCode) ? languageCode : env.DEFAULT_LANGUAGE
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
        } else {
          toastHelper.error()
        }
      }
      return res.status
    })
}

export const setLanguage = async (lang: string) => {
  await AsyncStorage.storeString('bc-admin-language', lang)
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

export const checkPassword = async (id: string, pass: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .get(`/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`, { headers })
    .then((res) => res.status)
}

export const changePassword = async (data: bookcarsTypes.ChangePasswordPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/change-password/ ', data, { headers })
    .then((res) => res.status)
}

export const updateAvatar = async (userId: string, file: BlobInfo): Promise<number> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('image', { uri, name: file.name, type: file.type } as any)
  const headers = await authHeader()
  return axiosInstance
    .post(`/api/update-avatar/${encodeURIComponent(userId)}`, formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.status)
}

export const deleteAvatar = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(`/api/delete-avatar/${encodeURIComponent(userId)}`, null, { headers })
    .then((res) => res.status)
}

export const updateEmailNotifications = async (data: bookcarsTypes.UpdateEmailNotificationsPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/update-email-notifications', data, { headers })
    .then(async (res) => {
      if (res.status === 200) {
        const user = await getCurrentUser()
        if (user) {
          user.enableEmailNotifications = data.enableEmailNotifications
          await AsyncStorage.storeObject(USER_KEY, user)
        }
      }
      return res.status
    })
}

export const getPushToken = async (userId: string): Promise<{ status: number, data: string }> => {
  const headers = await authHeader()
  return axiosInstance
    .get(`/api/push-token/${encodeURIComponent(userId)}`, { headers })
    .then((res) => ({ status: res.status, data: res.data }))
}

export const createPushToken = async (userId: string, token: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(`/api/create-push-token/${encodeURIComponent(userId)}/${encodeURIComponent(token)}`, null, { headers })
    .then((res) => res.status)
}

export const deletePushToken = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(`/api/delete-push-token/${encodeURIComponent(userId)}`, null, { headers })
    .then((res) => res.status)
}

export const hasPassword = async (id: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .get(`/api/has-password/${encodeURIComponent(id)}`, { headers })
    .then((res) => res.status)
}

export const signup = (data: bookcarsTypes.SignUpPayload): Promise<number> =>
  axiosInstance.post('/api/sign-up', data).then((res) => res.status)

export const checkToken = (userId: string, email: string, token: string): Promise<number> =>
  axiosInstance
    .get(`/api/check-token/${env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`)
    .then((res) => res.status)

export const deleteTokens = (userId: string): Promise<number> =>
  axiosInstance.delete(`/api/delete-tokens/${encodeURIComponent(userId)}`).then((res) => res.status)

export const resend = (email: string, reset = false): Promise<number> =>
  axiosInstance.post(`/api/resend/${env.APP_TYPE}/${encodeURIComponent(email)}/${reset}`).then((res) => res.status)

export const activate = async (data: bookcarsTypes.ActivatePayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance.post('/api/activate/ ', data, { headers }).then((res) => res.status)
}

export const validateEmail = (data: bookcarsTypes.ValidateEmailPayload): Promise<number> =>
  axiosInstance.post('/api/validate-email', data).then((res) => res.status)

export const confirmEmail = (email: string, token: string): Promise<number> =>
  axiosInstance.post(`/api/confirm-email/${encodeURIComponent(email)}/${encodeURIComponent(token)}`).then((res) => res.status)

export const resendLink = async (data: bookcarsTypes.ResendLinkPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance.post('/api/resend-link', data, { headers }).then((res) => res.status)
}

export const createLicense = (file: BlobInfo): Promise<string> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('file', { uri, name: file.name, type: file.type } as any)
  return axiosInstance.post('/api/create-license', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data)
}

export const updateLicense = async (userId: string, file: BlobInfo): Promise<bookcarsTypes.Response<string>> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('file', { uri, name: file.name, type: file.type } as any)
  const headers = await authHeader()
  return axiosInstance.post(`/api/update-license/${userId}`, formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }).then((res) => ({ status: res.status, data: res.data }))
}

export const deleteLicense = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance.post(`/api/delete-license/${userId}`, null, { headers }).then((res) => res.status)
}

export const deleteTempLicense = (file: string): Promise<number> =>
  axiosInstance.post(`/api/delete-temp-license/${encodeURIComponent(file)}`, null).then((res) => res.status)

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

// Admin-specific methods
export const getUsers = async (data: bookcarsTypes.GetUsersBody, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.User>> => {
  const headers = await authHeader()
  return axiosInstance
    .post(`/api/users/${page}/${size}`, data, { headers })
    .then((res) => res.data)
}

export const deleteUsers = async (ids: string[]): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/delete-users', ids, { headers })
    .then((res) => res.status)
}

export const createUser = async (data: bookcarsTypes.CreateUserPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/create-user', data, { headers })
    .then((res) => res.status)
}
