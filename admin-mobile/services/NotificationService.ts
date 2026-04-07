import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getNotificationCounter = async (userId: string): Promise<bookcarsTypes.NotificationCounter> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/notification-counter/${encodeURIComponent(userId)}`, { headers })
    .then((res) => res.data)
}

export const getNotifications = async (userId: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Notification>> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/notifications/${encodeURIComponent(userId)}/${page}/${size}`, { headers })
    .then((res) => res.data)
}

export const markAsRead = async (userId: string, ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/mark-notifications-as-read/${encodeURIComponent(userId)}`, { ids }, { headers })
    .then((res) => res.status)
}

export const markAsUnread = async (userId: string, ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`, { ids }, { headers })
    .then((res) => res.status)
}

export const deleteNotifications = async (userId: string, ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/delete-notifications/${encodeURIComponent(userId)}`, { ids }, { headers })
    .then((res) => res.status)
}
