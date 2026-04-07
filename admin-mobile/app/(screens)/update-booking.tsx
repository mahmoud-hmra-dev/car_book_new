import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { format } from 'date-fns'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as BookingService from '@/services/BookingService'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import BookingStatus from '@/components/BookingStatus'
import Button from '@/components/Button'
import Indicator from '@/components/Indicator'

const UpdateBooking = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<bookcarsTypes.Booking | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        if (id) {
          const _booking = await BookingService.getBooking(id, language)
          setBooking(_booking)
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [id, language])

  const handleStatusChange = async (status: bookcarsTypes.BookingStatus) => {
    try {
      if (!booking?._id) {
        return
      }
      const result = await BookingService.updateBookingStatus({
        ids: [booking._id],
        status,
      })

      if (result === 200) {
        setBooking({ ...booking, status })
        helper.toast(i18n.t('BOOKING_STATUS_UPDATED'))
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleDelete = () => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_BOOKING_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!booking?._id) {
              return
            }
            const status = await BookingService.deleteBookings([booking._id])
            if (status === 200) {
              helper.toast(i18n.t('BOOKING_DELETED'))
              router.back()
            } else {
              helper.error()
            }
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  if (loading) {
    return <Indicator />
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('UPDATE_BOOKING')} loggedIn reload />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{i18n.t('NO_RESULTS')}</Text>
        </View>
      </View>
    )
  }

  const car = booking.car as bookcarsTypes.Car
  const driver = booking.driver as bookcarsTypes.User
  const supplier = booking.supplier as bookcarsTypes.User
  const pickupLocation = booking.pickupLocation as bookcarsTypes.Location
  const dropOffLocation = booking.dropOffLocation as bookcarsTypes.Location

  const statuses = [
    bookcarsTypes.BookingStatus.Void,
    bookcarsTypes.BookingStatus.Pending,
    bookcarsTypes.BookingStatus.Deposit,
    bookcarsTypes.BookingStatus.Paid,
    bookcarsTypes.BookingStatus.PaidInFull,
    bookcarsTypes.BookingStatus.Reserved,
    bookcarsTypes.BookingStatus.Cancelled,
  ]

  return (
    <View style={styles.container}>
      <Header title={i18n.t('UPDATE_BOOKING')} loggedIn reload />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{i18n.t('STATUS')}</Text>
            <BookingStatus status={booking.status} />
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('INFO')}</Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="directions-car" size={18} color="#6B3CE6" />
            <Text style={styles.detailLabel}>{i18n.t('CAR')}</Text>
            <Text style={styles.detailValue}>{car?.name || '-'}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={18} color="#6B3CE6" />
            <Text style={styles.detailLabel}>{i18n.t('DRIVER')}</Text>
            <Text style={styles.detailValue}>{driver?.fullName || '-'}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="business" size={18} color="#6B3CE6" />
            <Text style={styles.detailLabel}>{i18n.t('SUPPLIER')}</Text>
            <Text style={styles.detailValue}>{supplier?.fullName || '-'}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="flight-takeoff" size={18} color="#6B3CE6" />
            <Text style={styles.detailLabel}>{i18n.t('FROM')}</Text>
            <Text style={styles.detailValue}>
              {booking.from ? format(new Date(booking.from), 'MMM dd, yyyy HH:mm') : '-'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="flight-land" size={18} color="#6B3CE6" />
            <Text style={styles.detailLabel}>{i18n.t('TO')}</Text>
            <Text style={styles.detailValue}>
              {booking.to ? format(new Date(booking.to), 'MMM dd, yyyy HH:mm') : '-'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={18} color="#6B3CE6" />
            <Text style={styles.detailLabel}>{i18n.t('PICKUP_LOCATION')}</Text>
            <Text style={styles.detailValue}>{pickupLocation?.name || '-'}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={18} color="#EF4444" />
            <Text style={styles.detailLabel}>{i18n.t('DROP_OFF_LOCATION')}</Text>
            <Text style={styles.detailValue}>{dropOffLocation?.name || '-'}</Text>
          </View>

          {booking.price !== undefined && (
            <View style={[styles.detailRow, styles.priceRow]}>
              <MaterialIcons name="payments" size={18} color="#22C55E" />
              <Text style={styles.detailLabel}>{i18n.t('TOTAL_PRICE')}</Text>
              <Text style={styles.priceValue}>
                {bookcarsHelper.formatNumber(booking.price, language)}
              </Text>
            </View>
          )}
        </View>

        {/* Change Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('BOOKING_STATUS')}</Text>
          <View style={styles.statusGrid}>
            {statuses.map((s) => (
              <Pressable
                key={s}
                style={[styles.statusButton, booking.status === s && styles.statusButtonActive]}
                onPress={() => handleStatusChange(s)}
              >
                <View style={[styles.statusDot, { backgroundColor: helper.getBookingStatusColor(s) }]} />
                <Text style={[styles.statusButtonText, booking.status === s && styles.statusButtonTextActive]}>
                  {helper.getBookingStatus(s)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Delete */}
        <Button
          label={i18n.t('DELETE_BOOKING')}
          variant="danger"
          onPress={handleDelete}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#999', fontSize: 15 },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 8,
  },
  detailLabel: { color: '#666', fontSize: 13, width: 100 },
  detailValue: { color: '#333', fontSize: 14, flex: 1, fontWeight: '500' },
  priceRow: { borderBottomWidth: 0, marginTop: 4 },
  priceValue: { color: '#22C55E', fontSize: 16, fontWeight: '700', flex: 1 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  statusButtonActive: { borderColor: '#6B3CE6', backgroundColor: '#ede7f9' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusButtonText: { color: '#666', fontSize: 13 },
  statusButtonTextActive: { color: '#6B3CE6', fontWeight: '600' },
})

export default UpdateBooking
