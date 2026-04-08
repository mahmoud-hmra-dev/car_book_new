import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { Avatar } from 'react-native-paper'
import { format } from 'date-fns'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as BookingService from '@/services/BookingService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'
import EmptyList from '@/components/EmptyList'

const UserDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<bookcarsTypes.User | null>(null)
  const [bookings, setBookings] = useState<bookcarsTypes.Booking[]>([])
  const [bookingsCount, setBookingsCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBookings = useCallback(async (userId: string, _page: number, reset = false) => {
    try {
      const data = await BookingService.getBookings(
        { user: userId, suppliers: [], statuses: [] },
        _page,
        env.BOOKINGS_PAGE_SIZE,
        language,
      )
      const result = data && data.length > 0 ? data[0] : null
      if (result && result.resultData) {
        if (reset) {
          setBookings(result.resultData)
        } else {
          setBookings((prev) => [...prev, ...result.resultData])
        }
        setBookingsCount(result.pageInfo?.totalRecords ?? result.resultData.length)
        setHasMore(result.resultData.length >= env.BOOKINGS_PAGE_SIZE)
      }
    } catch (err) {
      helper.error(err)
    }
  }, [language])

  useEffect(() => {
    const init = async () => {
      try {
        if (!id) return
        const _user = await UserService.getUser(id)
        setUser(_user)
        await fetchBookings(id, 1, true)
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    if (!id) return
    setRefreshing(true)
    setPage(1)
    try {
      const _user = await UserService.getUser(id)
      setUser(_user)
      await fetchBookings(id, 1, true)
    } catch (err) {
      helper.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLoadMore = () => {
    if (hasMore && !loading && id) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchBookings(id, nextPage)
    }
  }

  const handleDelete = () => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_USER_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!id) return
            const status = await UserService.deleteUsers([id])
            if (status === 200) {
              helper.toast(i18n.t('USER_DELETED'))
              router.back()
            }
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  const getTypeBadgeLabel = (type?: string) => {
    switch (type) {
      case bookcarsTypes.UserType.Admin:
        return i18n.t('RECORD_TYPE_ADMIN')
      case bookcarsTypes.UserType.Supplier:
        return i18n.t('RECORD_TYPE_SUPPLIER')
      default:
        return i18n.t('RECORD_TYPE_USER')
    }
  }

  const avatarUrl = user?.avatar
    ? (user.avatar.startsWith('http') ? user.avatar : bookcarsHelper.joinURL(env.CDN_USERS, user.avatar))
    : null

  const renderBookingItem = ({ item }: { item: bookcarsTypes.Booking }) => {
    const car = item.car as bookcarsTypes.Car
    const statusColor = helper.getBookingStatusColor(item.status)

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => router.push({ pathname: '/update-booking', params: { id: item._id } })}
      >
        <View style={styles.bookingHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{helper.getBookingStatus(item.status)}</Text>
          </View>
          {item.price !== undefined && (
            <Text style={styles.bookingPrice}>
              {bookcarsHelper.formatNumber(item.price, language)}
            </Text>
          )}
        </View>
        {car && (
          <Text style={styles.bookingCarName} numberOfLines={1}>{car.name}</Text>
        )}
        <View style={styles.bookingDates}>
          <MaterialIcons name="event" size={14} color="#999" />
          <Text style={styles.bookingDateText}>
            {format(new Date(item.from), 'MMM dd, yyyy')} - {format(new Date(item.to), 'MMM dd, yyyy')}
          </Text>
        </View>
      </Pressable>
    )
  }

  const renderHeader = () => (
    <View>
      <View style={styles.card}>
        <View style={styles.profileRow}>
          {avatarUrl
            ? <Avatar.Image size={40} source={{ uri: avatarUrl }} />
            : <Avatar.Icon size={40} icon="account" style={{ backgroundColor: '#6B3CE6' }} />}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <Text style={styles.typeBadge}>{getTypeBadgeLabel(user?.type)}</Text>
        </View>
        {!!user?.phone && (
          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={16} color="#999" />
            <Text style={styles.detailText}>{user.phone}</Text>
          </View>
        )}
        {!!user?.location && (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#999" />
            <Text style={styles.detailText}>{user.location}</Text>
          </View>
        )}
        {!!user?.birthDate && (
          <View style={styles.detailRow}>
            <MaterialIcons name="cake" size={16} color="#999" />
            <Text style={styles.detailText}>{format(new Date(user.birthDate), 'MMM dd, yyyy')}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/update-user', params: { id } })}
        >
          <MaterialIcons name="edit" size={18} color="#6B3CE6" />
          <Text style={styles.editButtonText}>{i18n.t('EDIT')}</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteBtnText}>{i18n.t('DELETE')}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{i18n.t('BOOKINGS')}</Text>
        <Text style={styles.sectionCount}>{bookingsCount}</Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('USER')} loggedIn reload />
        <Indicator />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={user?.fullName || i18n.t('USER')} loggedIn reload />
      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item._id!}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_BOOKING_LIST')} icon="event-busy" />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6B3CE6']} />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#333' },
  profileEmail: { fontSize: 13, color: '#999', marginTop: 2 },
  typeBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B3CE6',
    backgroundColor: '#ede7f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  detailText: { fontSize: 14, color: '#666', flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B3CE6',
  },
  editButtonText: { color: '#6B3CE6', fontWeight: '600', fontSize: 14 },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B3CE6',
    backgroundColor: '#ede7f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bookingPrice: {
    color: '#6B3CE6',
    fontWeight: '700',
    fontSize: 15,
  },
  bookingCarName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  bookingDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingDateText: {
    fontSize: 13,
    color: '#999',
  },
})

export default UserDetail
