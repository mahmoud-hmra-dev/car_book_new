import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  RefreshControl,
  FlatList,
  Linking,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { Avatar } from 'react-native-paper'
import { format } from 'date-fns'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as CarService from '@/services/CarService'
import * as BookingService from '@/services/BookingService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'
import EmptyList from '@/components/EmptyList'

const getAddonLabel = (value: number, language: string) => {
  if (value === -1) return i18n.t('INCLUDED')
  if (value === -2) return i18n.t('UNAVAILABLE')
  if (value > 0) return bookcarsHelper.formatNumber(value, language)
  return null
}

const getAddonIcon = (value: number): keyof typeof MaterialIcons.glyphMap =>
  (value > -1 ? 'check-circle' : 'cancel')

const getAddonColor = (value: number) => {
  if (value > -1) return '#22C55E'
  return '#EF4444'
}

const CarDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [car, setCar] = useState<bookcarsTypes.Car | null>(null)
  const [tracking, setTracking] = useState<bookcarsTypes.CarTrackingSnapshot | undefined>()
  const [bookings, setBookings] = useState<bookcarsTypes.Booking[]>([])
  const [bookingsPage, setBookingsPage] = useState(1)
  const [bookingsHasMore, setBookingsHasMore] = useState(true)

  const fetchBookings = useCallback(async (carId: string, _page: number, reset = false) => {
    try {
      const data = await BookingService.getBookings(
        { car: carId, suppliers: [], statuses: [] },
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
        setBookingsHasMore(result.resultData.length >= env.BOOKINGS_PAGE_SIZE)
      }
    } catch (err) {
      helper.error(err)
    }
  }, [language])

  const fetchCar = async () => {
    try {
      if (!id) return
      const _car = await CarService.getCar(id, language)
      setCar(_car)

      if (_car?.tracking?.enabled) {
        try {
          const _tracking = await CarService.getTracking(_car._id)
          setTracking(_tracking)
        } catch {
          setTracking(undefined)
        }
      }

      await fetchBookings(id, 1, true)
      setBookingsPage(1)
    } catch (err) {
      helper.error(err)
    }
  }

  useEffect(() => {
    const init = async () => {
      await fetchCar()
      setLoading(false)
    }

    init()
  }, [id, language]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchCar()
    setRefreshing(false)
  }

  const handleLoadMoreBookings = () => {
    if (bookingsHasMore && !loading && id) {
      const nextPage = bookingsPage + 1
      setBookingsPage(nextPage)
      fetchBookings(id, nextPage)
    }
  }

  const handleDelete = async () => {
    try {
      if (!id) return
      const status = await CarService.checkCar(id)

      if (status === 200) {
        Alert.alert(i18n.t('INFO'), i18n.t('CANNOT_DELETE_CAR'))
      } else if (status === 204) {
        Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_CAR_CONFIRM'), [
          { text: i18n.t('CANCEL'), style: 'cancel' },
          {
            text: i18n.t('DELETE'),
            style: 'destructive',
            onPress: async () => {
              try {
                const deleteStatus = await CarService.deleteCar(id)
                if (deleteStatus === 200) {
                  helper.toast(i18n.t('CAR_DELETED'))
                  router.back()
                }
              } catch (err) {
                helper.error(err)
              }
            },
          },
        ])
      }
    } catch (err) {
      helper.error(err)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('CAR')} loggedIn reload />
        <Indicator />
      </View>
    )
  }

  if (!car) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('CAR')} loggedIn reload />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{i18n.t('NO_RESULTS')}</Text>
        </View>
      </View>
    )
  }

  const imageUrl = car.image ? bookcarsHelper.joinURL(env.CDN_CARS, car.image) : null
  const supplier = car.supplier as bookcarsTypes.User
  const supplierAvatarUrl = supplier?.avatar
    ? (supplier.avatar.startsWith('http') ? supplier.avatar : bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar))
    : null

  const specs: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }[] = [
    { icon: 'local-gas-station', label: i18n.t('ENGINE'), value: helper.getCarTypeShort(car.type) },
    { icon: 'settings', label: i18n.t('GEARBOX'), value: helper.getGearboxTypeShort(car.gearbox) },
    { icon: 'event-seat', label: i18n.t('SEATS'), value: String(car.seats) },
    { icon: 'sensor-door', label: i18n.t('DOORS'), value: String(car.doors) },
    { icon: 'ac-unit', label: i18n.t('AIRCON'), value: car.aircon ? i18n.t('AVAILABLE') : i18n.t('NOT_AVAILABLE') },
    { icon: 'speed', label: i18n.t('MILEAGE'), value: helper.getMileage(car.mileage, language) },
    { icon: 'local-gas-station', label: i18n.t('FUEL_POLICY'), value: helper.getFuelPolicy(car.fuelPolicy) },
    { icon: 'directions-car', label: i18n.t('CAR_RANGE'), value: helper.getCarRange(car.range as bookcarsTypes.CarRange) },
  ]

  if (car.rating !== undefined && car.rating > 0) {
    specs.push({ icon: 'star', label: i18n.t('RATING'), value: `${car.rating}/5` })
  }

  const addons: { label: string; value: number }[] = [
    { label: i18n.t('CANCELLATION'), value: car.cancellation },
    { label: i18n.t('AMENDMENTS'), value: car.amendments },
    { label: i18n.t('THEFT_PROTECTION'), value: car.theftProtection },
    { label: i18n.t('COLLISION_DAMAGE_WAVER'), value: car.collisionDamageWaiver },
    { label: i18n.t('FULL_INSURANCE'), value: car.fullInsurance },
    { label: i18n.t('ADDITIONAL_DRIVER'), value: car.additionalDriver },
  ]

  const renderBookingItem = ({ item }: { item: bookcarsTypes.Booking }) => {
    const bookingCar = item.car as bookcarsTypes.Car
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
        {bookingCar && (
          <Text style={styles.bookingCarName} numberOfLines={1}>{bookingCar.name}</Text>
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
      {/* Hero Image */}
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
      )}

      {/* Basic Info Card */}
      <View style={styles.card}>
        <Text style={styles.carName}>{car.name}</Text>

        {car.licensePlate ? (
          <Text style={styles.licensePlate}>{car.licensePlate}</Text>
        ) : null}

        {supplier && (
          <View style={styles.supplierRow}>
            {supplierAvatarUrl
              ? <Avatar.Image size={24} source={{ uri: supplierAvatarUrl }} />
              : <Avatar.Icon size={24} icon="domain" style={{ backgroundColor: '#6B3CE6' }} />}
            <Text style={styles.supplierName}>{supplier.fullName}</Text>
          </View>
        )}

        {/* Availability Badge */}
        <View style={[styles.availabilityBadge, { backgroundColor: car.available ? '#DCFCE7' : '#FEE2E2' }]}>
          <View style={[styles.availabilityDot, { backgroundColor: car.available ? '#22C55E' : '#EF4444' }]} />
          <Text style={[styles.availabilityText, { color: car.available ? '#22C55E' : '#EF4444' }]}>
            {car.available ? i18n.t('AVAILABLE') : i18n.t('NOT_AVAILABLE')}
          </Text>
        </View>
      </View>

      {/* Pricing Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i18n.t('PRICING')}</Text>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>{i18n.t('DAILY_PRICE')}</Text>
          <Text style={styles.pricingValue}>
            {bookcarsHelper.formatNumber(car.dailyPrice, language)}{i18n.t('DAILY')}
          </Text>
        </View>
        {car.discountedDailyPrice != null && car.discountedDailyPrice > 0 && (
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>{i18n.t('DISCOUNTED_PRICE_LABEL')}</Text>
            <Text style={[styles.pricingValue, { color: '#22C55E' }]}>
              {bookcarsHelper.formatNumber(car.discountedDailyPrice as number, language)}{i18n.t('DAILY')}
            </Text>
          </View>
        )}
        {car.deposit > 0 && (
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>{i18n.t('DEPOSIT_LABEL')}</Text>
            <Text style={styles.pricingValue}>
              {bookcarsHelper.formatNumber(car.deposit, language)}
            </Text>
          </View>
        )}
      </View>

      {/* Specs Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i18n.t('CAR_SPECS')}</Text>
        <View style={styles.specsGrid}>
          {specs.map((spec) => (
            <View key={spec.label} style={styles.specItem}>
              <MaterialIcons name={spec.icon} size={20} color="#6B3CE6" />
              <Text style={styles.specLabel}>{spec.label}</Text>
              <Text style={styles.specValue}>{spec.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Add-ons Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i18n.t('ADDONS')}</Text>
        {addons.map((addon) => {
          const addonLabel = getAddonLabel(addon.value, language)
          return (
            <View key={addon.label} style={styles.addonRow}>
              <View style={styles.addonLeft}>
                <MaterialIcons
                  name={getAddonIcon(addon.value)}
                  size={18}
                  color={getAddonColor(addon.value)}
                />
                <Text style={styles.addonLabel}>{addon.label}</Text>
              </View>
              <Text style={[styles.addonValue, { color: getAddonColor(addon.value) }]}>
                {addonLabel || '-'}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Locations Card */}
      {car.locations && car.locations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('LOCATIONS_LABEL')}</Text>
          {car.locations.map((location: bookcarsTypes.Location) => (
            <View key={location._id} style={styles.locationRow}>
              <MaterialIcons name="location-on" size={16} color="#999" />
              <Text style={styles.locationText}>{location.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tracking Card */}
      {car.tracking?.enabled && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('SAFE_TRACKING')}</Text>

          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>{i18n.t('DEVICE_ID')}</Text>
            <Text style={styles.trackingValue}>{car.tracking.deviceId || '\u2014'}</Text>
          </View>
          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>{i18n.t('DEVICE_NAME')}</Text>
            <Text style={styles.trackingValue}>
              {tracking?.tracking?.deviceName || car.tracking.deviceName || '\u2014'}
            </Text>
          </View>
          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>{i18n.t('STATUS')}</Text>
            <Text style={styles.trackingValue}>
              {tracking?.tracking?.status || car.tracking.status || '\u2014'}
            </Text>
          </View>
          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>{i18n.t('CURRENT_POSITION')}</Text>
            <Text style={styles.trackingValue}>
              {tracking?.currentPosition
                ? `${tracking.currentPosition.latitude}, ${tracking.currentPosition.longitude}`
                : i18n.t('NO_LIVE_POSITION')}
            </Text>
          </View>
          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>{i18n.t('LATEST_SAFE_ALERT')}</Text>
            <Text style={styles.trackingValue}>
              {tracking?.geofenceExitEvents?.[0]?.type
                || car.tracking.lastEventType
                || i18n.t('NO_ZONE_EXIT_ALERT')}
            </Text>
          </View>
          {car.tracking.notes ? (
            <View style={styles.trackingRow}>
              <Text style={styles.trackingLabel}>{i18n.t('NOTES')}</Text>
              <Text style={styles.trackingValue}>{car.tracking.notes}</Text>
            </View>
          ) : null}
          {tracking?.traccarUrl ? (
            <Pressable onPress={() => Linking.openURL(tracking.traccarUrl!)}>
              <Text style={styles.traccarLink}>{i18n.t('OPEN_TRACCAR')}</Text>
            </Pressable>
          ) : null}
          {tracking?.warning ? (
            <Text style={styles.trackingWarning}>{tracking.warning}</Text>
          ) : null}
          {tracking?.positions && tracking.positions.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.trackingSubtitle}>{i18n.t('RECENT_MOVEMENT')}</Text>
              {tracking.positions.slice(0, 5).map((position, index) => (
                <Text key={`${position.id || index}`} style={styles.trackingHistory}>
                  {`${position.fixTime || position.deviceTime || 'Unknown'} \u2014 ${position.latitude}, ${position.longitude}`}
                </Text>
              ))}
            </View>
          )}
          {tracking?.geofences && tracking.geofences.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.trackingSubtitle}>{i18n.t('GEOFENCES_LABEL')}</Text>
              {tracking.geofences.slice(0, 5).map((geofence, index) => (
                <Text key={`${geofence.id || index}`} style={styles.trackingHistory}>
                  {geofence.name || geofence.description || `Geofence ${index + 1}`}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/update-car', params: { id } })}
        >
          <MaterialIcons name="edit" size={18} color="#fff" />
          <Text style={styles.editButtonText}>{i18n.t('EDIT')}</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <MaterialIcons name="delete-outline" size={18} color="#fff" />
          <Text style={styles.deleteButtonText}>{i18n.t('DELETE')}</Text>
        </Pressable>
      </View>

      {/* Bookings Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{i18n.t('BOOKINGS')}</Text>
        {bookings.length > 0 && (
          <Text style={styles.sectionCount}>{bookings.length}</Text>
        )}
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <Header title={car.name} loggedIn reload />
      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item._id!}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_BOOKING_LIST')} icon="event-busy" />}
        onEndReached={handleLoadMoreBookings}
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
  scrollContent: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 15 },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
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
  carName: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 4 },
  licensePlate: { fontSize: 14, color: '#666', marginBottom: 8 },
  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  supplierName: { fontSize: 14, color: '#999' },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 4,
  },
  availabilityDot: { width: 8, height: 8, borderRadius: 4 },
  availabilityText: { fontSize: 13, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pricingLabel: { fontSize: 14, color: '#666' },
  pricingValue: { fontSize: 16, fontWeight: '700', color: '#6B3CE6' },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specItem: {
    width: '50%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    marginBottom: 16,
  },
  specLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  specValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addonLabel: { fontSize: 14, color: '#666' },
  addonValue: { fontSize: 14, fontWeight: '600' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  locationText: { fontSize: 14, color: '#333' },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  trackingLabel: { fontSize: 13, fontWeight: '600', color: '#666', flex: 1 },
  trackingValue: { fontSize: 13, color: '#333', flex: 1.5, textAlign: 'right' },
  trackingSubtitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  trackingHistory: { fontSize: 12, color: '#999', marginLeft: 8, marginBottom: 2 },
  trackingWarning: { fontSize: 13, color: '#e98003', marginTop: 4 },
  traccarLink: { fontSize: 14, color: '#6B3CE6', marginTop: 8 },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6B3CE6',
  },
  editButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  deleteButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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

export default CarDetail
