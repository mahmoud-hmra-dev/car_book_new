import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { format } from 'date-fns'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as BookingService from '@/services/BookingService'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import BookingStatus from '@/components/BookingStatus'
import Search from '@/components/Search'
import EmptyList from '@/components/EmptyList'
import Indicator from '@/components/Indicator'

const Dashboard = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { loggedIn, language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [bookings, setBookings] = useState<bookcarsTypes.Booking[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [user, setUser] = useState<bookcarsTypes.User | null>(null)

  const fetchBookings = useCallback(async (_page: number, reset = false) => {
    try {
      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) {
        return
      }

      let _user = user
      if (!_user) {
        _user = await UserService.getUser(currentUser._id)
        setUser(_user)
      }

      let supplierIds: string[] = []
      if (_user.type === bookcarsTypes.RecordType.Admin) {
        const allSuppliers = await SupplierService.getAllSuppliers()
        supplierIds = allSuppliers.map((s: bookcarsTypes.User) => s._id as string)
      } else {
        supplierIds = [currentUser._id]
      }

      const payload: bookcarsTypes.GetBookingsPayload = {
        user: currentUser._id,
        suppliers: supplierIds,
        statuses: [],
        filter: search ? { keyword: search } : undefined,
      }

      const data = await BookingService.getBookings(payload, _page, env.BOOKINGS_PAGE_SIZE, language)
      const result = data && data.length > 0 ? data[0] : null

      if (result && result.resultData) {
        if (reset) {
          setBookings(result.resultData)
        } else {
          setBookings((prev) => [...prev, ...result.resultData])
        }
        setHasMore(result.resultData.length >= env.BOOKINGS_PAGE_SIZE)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [language, search, user])

  useEffect(() => {
    if (loggedIn) {
      setPage(1)
      setLoading(true)
      fetchBookings(1, true)
    } else {
      setLoading(false)
    }
  }, [loggedIn, params.d]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchBookings(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchBookings(nextPage)
    }
  }

  const handleSearch = () => {
    setPage(1)
    setLoading(true)
    fetchBookings(1, true)
  }

  const renderBooking = ({ item }: { item: bookcarsTypes.Booking }) => {
    const car = item.car as bookcarsTypes.Car
    const driver = item.driver as bookcarsTypes.User
    const pickupLocation = item.pickupLocation as bookcarsTypes.Location
    const dropOffLocation = item.dropOffLocation as bookcarsTypes.Location

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => router.push({ pathname: '/update-booking', params: { id: item._id } })}
      >
        <View style={styles.bookingHeader}>
          <BookingStatus status={item.status} />
          <Text style={styles.bookingDate}>
            {item.from ? format(new Date(item.from), 'MMM dd, yyyy') : ''}
          </Text>
        </View>

        <View style={styles.bookingBody}>
          <View style={styles.bookingRow}>
            <MaterialIcons name="directions-car" size={16} color="#666" />
            <Text style={styles.bookingText}>{car?.name || '-'}</Text>
          </View>
          <View style={styles.bookingRow}>
            <MaterialIcons name="person" size={16} color="#666" />
            <Text style={styles.bookingText}>{driver?.fullName || '-'}</Text>
          </View>
          <View style={styles.bookingRow}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.bookingText} numberOfLines={1}>
              {pickupLocation?.name || '-'} → {dropOffLocation?.name || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <Text style={styles.bookingPrice}>
            {item.price ? `${bookcarsHelper.formatNumber(item.price, language)} ${i18n.t('DAILY').replace('/', '')}` : '-'}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#999" />
        </View>
      </Pressable>
    )
  }

  if (!loggedIn) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('DASHBOARD')} />
        <View style={styles.signInPrompt}>
          <Text style={styles.signInText}>{i18n.t('ADMIN_ONLY')}</Text>
          <Pressable onPress={() => router.push('/sign-in')}>
            <Text style={styles.signInLink}>{i18n.t('SIGN_IN')}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('DASHBOARD')} loggedIn reload />

      <View style={styles.toolbar}>
        <Search
          value={search}
          onChangeText={setSearch}
          onClear={() => { setSearch(''); handleSearch() }}
        />
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create-booking')}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>{i18n.t('CREATE_BOOKING')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <Indicator />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item._id!}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_BOOKING_LIST')} icon="event-busy" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6B3CE6']} />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  toolbar: {
    padding: 16,
    paddingBottom: 0,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B3CE6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingTop: 4,
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingDate: {
    color: '#999',
    fontSize: 12,
  },
  bookingBody: {
    gap: 6,
    marginBottom: 12,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingText: {
    color: '#333',
    fontSize: 14,
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  bookingPrice: {
    color: '#6B3CE6',
    fontWeight: '700',
    fontSize: 15,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signInText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
  },
  signInLink: {
    color: '#6B3CE6',
    fontWeight: '700',
    fontSize: 16,
  },
})

export default Dashboard
