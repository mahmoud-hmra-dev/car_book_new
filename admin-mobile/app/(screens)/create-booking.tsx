import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as BookingService from '@/services/BookingService'
import * as SupplierService from '@/services/SupplierService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'
import Backdrop from '@/components/Backdrop'

const CreateBooking = () => {
  const router = useRouter()

  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [driverEmail, setDriverEmail] = useState('')
  const [fromDate, setFromDate] = useState(new Date())
  const [toDate, setToDate] = useState(new Date(Date.now() + 86400000))
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const _suppliers = await SupplierService.getAllSuppliers()
        setSuppliers(_suppliers)
        if (_suppliers.length > 0 && _suppliers[0]._id) {
          setSelectedSupplier(_suppliers[0]._id)
        }
      } catch (err) {
        helper.error(err)
      }
    }

    init()
  }, [])

  const handleCreate = async () => {
    try {
      if (!selectedSupplier || !driverEmail) {
        helper.error()
        return
      }

      setSaving(true)

      const booking = await BookingService.createBooking({
        booking: {
          supplier: selectedSupplier,
          car: '',
          driver: '',
          pickupLocation: '',
          dropOffLocation: '',
          from: fromDate,
          to: toDate,
          status: bookcarsTypes.BookingStatus.Pending,
          price: 0,
        },
      })

      if (booking) {
        helper.toast(i18n.t('BOOKING_CREATED'))
        router.back()
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('CREATE_BOOKING')} loggedIn reload />

      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>{i18n.t('SUPPLIER')}</Text>
          {suppliers.map((s) => (
            <Pressable
              key={s._id}
              style={[styles.selectItem, selectedSupplier === s._id && styles.selectItemActive]}
              onPress={() => setSelectedSupplier(s._id!)}
            >
              <Text style={[styles.selectItemText, selectedSupplier === s._id && styles.selectItemTextActive]}>
                {s.fullName}
              </Text>
            </Pressable>
          ))}

          <TextInput
            label={`${i18n.t('DRIVER')} (${i18n.t('EMAIL')})`}
            value={driverEmail}
            onChangeText={setDriverEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>{i18n.t('FROM_DATE')}</Text>
          <Pressable style={styles.dateButton} onPress={() => setShowFromPicker(true)}>
            <Text style={styles.dateText}>{fromDate.toLocaleDateString()}</Text>
          </Pressable>
          {showFromPicker && (
            <DateTimePicker
              value={fromDate}
              mode="date"
              onChange={(_, date) => {
                setShowFromPicker(Platform.OS === 'ios')
                if (date) {
                  setFromDate(date)
                }
              }}
            />
          )}

          <Text style={styles.sectionTitle}>{i18n.t('TO_DATE')}</Text>
          <Pressable style={styles.dateButton} onPress={() => setShowToPicker(true)}>
            <Text style={styles.dateText}>{toDate.toLocaleDateString()}</Text>
          </Pressable>
          {showToPicker && (
            <DateTimePicker
              value={toDate}
              mode="date"
              onChange={(_, date) => {
                setShowToPicker(Platform.OS === 'ios')
                if (date) {
                  setToDate(date)
                }
              }}
            />
          )}

          <Button
            label={i18n.t('CREATE')}
            onPress={handleCreate}
            disabled={saving}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  selectItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 6,
  },
  selectItemActive: { borderColor: '#6B3CE6', backgroundColor: '#ede7f9' },
  selectItemText: { color: '#666', fontSize: 14 },
  selectItemTextActive: { color: '#6B3CE6', fontWeight: '600' },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  dateText: { color: '#333', fontSize: 15 },
})

export default CreateBooking
