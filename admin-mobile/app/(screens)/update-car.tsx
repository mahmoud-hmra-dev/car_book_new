import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as CarService from '@/services/CarService'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Switch from '@/components/Switch'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'
import Backdrop from '@/components/Backdrop'

const UpdateCar = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [car, setCar] = useState<bookcarsTypes.Car | null>(null)
  const [name, setName] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [seats, setSeats] = useState('')
  const [doors, setDoors] = useState('')
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        if (id) {
          const _car = await CarService.getCar(id, language)
          setCar(_car)
          setName(_car.name || '')
          setLicensePlate(_car.licensePlate || '')
          setPrice(String(_car.dailyPrice || ''))
          setDeposit(String(_car.deposit || ''))
          setSeats(String(_car.seats || ''))
          setDoors(String(_car.doors || ''))
          setAvailable(_car.available !== false)
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, language])

  const handleSave = async () => {
    try {
      if (!car?._id || !name) {
        return
      }
      setSaving(true)

      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) {
        helper.error()
        return
      }

      const supplier = car.supplier as bookcarsTypes.User

      const status = await CarService.updateCar({
        _id: car._id,
        loggedUser: currentUser._id,
        name,
        supplier: supplier?._id || '',
        licensePlate,
        minimumAge: car.minimumAge || 21,
        locations: (car.locations || []).map((l: any) => l._id || l),
        hourlyPrice: car.hourlyPrice ?? null,
        discountedHourlyPrice: car.discountedHourlyPrice ?? null,
        dailyPrice: parseFloat(price) || 0,
        discountedDailyPrice: car.discountedDailyPrice ?? null,
        biWeeklyPrice: car.biWeeklyPrice ?? null,
        discountedBiWeeklyPrice: car.discountedBiWeeklyPrice ?? null,
        weeklyPrice: car.weeklyPrice ?? null,
        discountedWeeklyPrice: car.discountedWeeklyPrice ?? null,
        monthlyPrice: car.monthlyPrice ?? null,
        discountedMonthlyPrice: car.discountedMonthlyPrice ?? null,
        isDateBasedPrice: car.isDateBasedPrice || false,
        dateBasedPrices: car.dateBasedPrices || [],
        deposit: parseFloat(deposit) || 0,
        available,
        type: car.type,
        gearbox: car.gearbox,
        aircon: car.aircon !== false,
        seats: parseInt(seats, 10) || 5,
        doors: parseInt(doors, 10) || 4,
        fuelPolicy: car.fuelPolicy,
        mileage: car.mileage ?? -1,
        cancellation: car.cancellation || 0,
        amendments: car.amendments || 0,
        theftProtection: car.theftProtection || 0,
        collisionDamageWaiver: car.collisionDamageWaiver || 0,
        fullInsurance: car.fullInsurance || 0,
        additionalDriver: car.additionalDriver || 0,
        range: car.range || bookcarsTypes.CarRange.Mini,
        multimedia: car.multimedia || [],
        rating: car.rating || 0,
      })

      if (status === 200) {
        helper.toast(i18n.t('CAR_UPDATED'))
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_CAR_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!car?._id) {
              return
            }
            const status = await CarService.deleteCar(car._id)
            if (status === 200) {
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

  if (loading) {
    return <Indicator />
  }

  if (!car) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('UPDATE_CAR')} loggedIn reload />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#999' }}>{i18n.t('NO_RESULTS')}</Text>
        </View>
      </View>
    )
  }

  const imageUrl = car.image ? bookcarsHelper.joinURL(env.CDN_CARS, car.image) : null

  return (
    <View style={styles.container}>
      <Header title={i18n.t('UPDATE_CAR')} loggedIn reload />
      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.carImage} resizeMode="cover" />
          )}

          <TextInput label={i18n.t('CAR_NAME')} value={name} onChangeText={setName} />
          <TextInput label={i18n.t('LICENSE_PLATE')} value={licensePlate} onChangeText={setLicensePlate} />
          <TextInput label={i18n.t('DAILY_PRICE')} value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextInput label={i18n.t('DEPOSIT')} value={deposit} onChangeText={setDeposit} keyboardType="numeric" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextInput label={i18n.t('SEATS')} value={seats} onChangeText={setSeats} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput label={i18n.t('DOORS')} value={doors} onChangeText={setDoors} keyboardType="numeric" />
            </View>
          </View>

          <Switch label={i18n.t('AVAILABLE')} value={available} onValueChange={setAvailable} />

          <Button label={saving ? i18n.t('LOADING') : i18n.t('SAVE')} onPress={handleSave} disabled={saving} style={{ marginTop: 12 }} />
          <Button label={i18n.t('DELETE_CAR')} variant="danger" onPress={handleDelete} style={{ marginTop: 8 }} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  carImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
})

export default UpdateCar
