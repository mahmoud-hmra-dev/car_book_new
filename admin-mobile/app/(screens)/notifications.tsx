import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { format } from 'date-fns'

import i18n from '@/lang/i18n'
import * as NotificationService from '@/services/NotificationService'
import * as UserService from '@/services/UserService'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'
import { useGlobalContext, GlobalContextType } from '@/context/GlobalContext'
import Header from '@/components/Header'
import EmptyList from '@/components/EmptyList'
import Indicator from '@/components/Indicator'

const Notifications = () => {
  const { setNotificationCount } = useGlobalContext() as GlobalContextType

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<bookcarsTypes.Notification[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchNotifications = useCallback(async (_page: number, reset = false) => {
    try {
      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) {
        return
      }

      const data = await NotificationService.getNotifications(currentUser._id, _page, 20)
      const result = data && data.length > 0 ? data[0] : null

      if (result && result.resultData) {
        if (reset) {
          setNotifications(result.resultData)
        } else {
          setNotifications((prev) => [...prev, ...result.resultData])
        }
        setHasMore(result.resultData.length >= 20)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(1, true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchNotifications(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchNotifications(nextPage)
    }
  }

  const handleMarkRead = async (notification: bookcarsTypes.Notification) => {
    try {
      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id || !notification._id) {
        return
      }

      if (notification.isRead) {
        await NotificationService.markAsUnread(currentUser._id, [notification._id])
      } else {
        await NotificationService.markAsRead(currentUser._id, [notification._id])
      }

      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: !n.isRead } : n))
      )

      const counter = await NotificationService.getNotificationCounter(currentUser._id)
      setNotificationCount(counter.count)
    } catch (err) {
      helper.error(err)
    }
  }

  const handleDelete = (notification: bookcarsTypes.Notification) => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_NOTIFICATION'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            const currentUser = await UserService.getCurrentUser()
            if (!currentUser?._id || !notification._id) {
              return
            }

            const status = await NotificationService.deleteNotifications(currentUser._id, [notification._id])
            if (status === 200) {
              setNotifications((prev) => prev.filter((n) => n._id !== notification._id))
              const counter = await NotificationService.getNotificationCounter(currentUser._id)
              setNotificationCount(counter.count)
            }
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  const renderNotification = ({ item }: { item: bookcarsTypes.Notification }) => (
    <View style={[styles.notificationCard, !item.isRead && styles.unread]}>
      <View style={styles.notificationContent}>
        {!item.isRead && <View style={styles.unreadDot} />}
        <View style={styles.notificationText}>
          <Text style={[styles.message, !item.isRead && styles.unreadText]}>{item.message}</Text>
          <Text style={styles.date}>
            {item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm') : ''}
          </Text>
        </View>
      </View>
      <View style={styles.notificationActions}>
        <Pressable onPress={() => handleMarkRead(item)} style={styles.actionButton}>
          <MaterialIcons
            name={item.isRead ? 'mark-email-unread' : 'mark-email-read'}
            size={20}
            color="#6B3CE6"
          />
        </Pressable>
        <Pressable onPress={() => handleDelete(item)} style={styles.actionButton}>
          <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <Header title={i18n.t('NOTIFICATIONS')} loggedIn reload />

      {loading ? (
        <Indicator />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id!}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_NOTIFICATION_LIST')} icon="notifications-none" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6B3CE6']} />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16 },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: '#6B3CE6' },
  notificationContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6B3CE6', marginTop: 6, marginRight: 8 },
  notificationText: { flex: 1 },
  message: { color: '#666', fontSize: 14, lineHeight: 20 },
  unreadText: { color: '#333', fontWeight: '600' },
  date: { color: '#999', fontSize: 12, marginTop: 4 },
  notificationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  actionButton: { padding: 4 },
})

export default Notifications
