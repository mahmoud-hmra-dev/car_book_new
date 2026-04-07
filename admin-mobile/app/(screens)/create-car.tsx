import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as CarService from '@/services/CarService'
import * as SupplierService from '@/services/SupplierService'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Switch from '@/components/Switch'
import Header from '@/components/Header'
import Backdrop from '@/components/Backdrop'

const CreateCar = () => {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [name, setName] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [seats, setSeats] = useState('5')
  const [doors, setDoors] = useState('4')
  const [available, setAvailable] = useState(true)
  const [type, setType] = useState(bookcarsTypes.CarType.Diesel)
  const [gearbox, setGearbox] = useState(bookcarsTypes.GearboxType.Manual)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [tempImage, setTempImage] = useState('')

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

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        setImageUri(asset.uri)

        const fileName = helper.getFileName(asset.uri)
        const mimeType = helper.getMimeType(fileName)
        const image = await CarService.createCarImage({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        })
        setTempImage(image)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCreate = async () => {
    try {
      if (!name || !selectedSupplier || !price) {
        helper.error()
        return
      }

      setSaving(true)

      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) {
        helper.error()
        return
      }

      const car = await CarService.createCar({
        loggedUser: currentUser._id,
        name,
        supplier: selectedSupplier,
        licensePlate,
        minimumAge: 21,
        locations: [],
        hourlyPrice: null,
        discountedHourlyPrice: null,
        dailyPrice: parseFloat(price),
        discountedDailyPrice: null,
        biWeeklyPrice: null,
        discountedBiWeeklyPrice: null,
        weeklyPrice: null,
        discountedWeeklyPrice: null,
        monthlyPrice: null,
        discountedMonthlyPrice: null,
        isDateBasedPrice: false,
        dateBasedPrices: [],
        deposit: parseFloat(deposit) || 0,
        available,
        type,
        gearbox,
        aircon: true,
        seats: parseInt(seats, 10),
        doors: parseInt(doors, 10),
        fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
        mileage: -1,
        cancellation: 0,
        amendments: 0,
        theftProtection: 0,
        collisionDamageWaiver: 0,
        fullInsurance: 0,
        additionalDriver: 0,
        image: tempImage,
        range: bookcarsTypes.CarRange.Mini,
        multimedia: [],
        rating: 0,
      })

      if (car) {
        helper.toast(i18n.t('CAR_CREATED'))
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

  const carTypes = [
    { value: bookcarsTypes.CarType.Diesel, label: i18n.t('DIESEL') },
    { value: bookcarsTypes.CarType.Gasoline, label: i18n.t('GASOLINE') },
    { value: bookcarsTypes.CarType.Electric, label: i18n.t('ELECTRIC') },
    { value: bookcarsTypes.CarType.Hybrid, label: i18n.t('HYBRID') },
    { value: bookcarsTypes.CarType.PlugInHybrid, label: i18n.t('PLUG_IN_HYBRID') },
  ]

  const gearboxTypes = [
    { value: bookcarsTypes.GearboxType.Manual, label: i18n.t('GEARBOX_MANUAL') },
    { value: bookcarsTypes.GearboxType.Automatic, label: i18n.t('GEARBOX_AUTOMATIC') },
  ]

  return (
    <View style={styles.container}>
      <Header title={i18n.t('CREATE_CAR')} loggedIn reload />
      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {/* Image */}
          <Pressable style={styles.imagePicker} onPress={handlePickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="add-photo-alternate" size={40} color="#999" />
                <Text style={styles.imagePlaceholderText}>{i18n.t('ADD_IMAGE')}</Text>
              </View>
            )}
          </Pressable>

          <TextInput label={i18n.t('CAR_NAME')} value={name} onChangeText={setName} />
          <TextInput label={i18n.t('LICENSE_PLATE')} value={licensePlate} onChangeText={setLicensePlate} />

          {/* Supplier */}
          <Text style={styles.sectionTitle}>{i18n.t('SUPPLIER')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {suppliers.map((s) => (
              <Pressable
                key={s._id}
                style={[styles.chip, selectedSupplier === s._id && styles.chipActive]}
                onPress={() => setSelectedSupplier(s._id!)}
              >
                <Text style={[styles.chipText, selectedSupplier === s._id && styles.chipTextActive]}>
                  {s.fullName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput label={i18n.t('DAILY_PRICE')} value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextInput label={i18n.t('DEPOSIT')} value={deposit} onChangeText={setDeposit} keyboardType="numeric" />

          {/* Car Type */}
          <Text style={styles.sectionTitle}>{i18n.t('ENGINE')}</Text>
          <View style={styles.chipWrap}>
            {carTypes.map((ct) => (
              <Pressable
                key={ct.value}
                style={[styles.chip, type === ct.value && styles.chipActive]}
                onPress={() => setType(ct.value)}
              >
                <Text style={[styles.chipText, type === ct.value && styles.chipTextActive]}>{ct.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Gearbox */}
          <Text style={styles.sectionTitle}>{i18n.t('GEARBOX')}</Text>
          <View style={styles.chipWrap}>
            {gearboxTypes.map((gt) => (
              <Pressable
                key={gt.value}
                style={[styles.chip, gearbox === gt.value && styles.chipActive]}
                onPress={() => setGearbox(gt.value)}
              >
                <Text style={[styles.chipText, gearbox === gt.value && styles.chipTextActive]}>{gt.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput label={i18n.t('SEATS')} value={seats} onChangeText={setSeats} keyboardType="numeric" />
            </View>
            <View style={styles.halfInput}>
              <TextInput label={i18n.t('DOORS')} value={doors} onChangeText={setDoors} keyboardType="numeric" />
            </View>
          </View>

          <Switch label={i18n.t('AVAILABLE')} value={available} onValueChange={setAvailable} />

          <Button label={i18n.t('CREATE')} onPress={handleCreate} disabled={saving} style={{ marginTop: 16 }} />
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
  imagePicker: { marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 180, borderRadius: 12 },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  imagePlaceholderText: { color: '#999', fontSize: 14, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  chipScroll: { marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  chipActive: { borderColor: '#6B3CE6', backgroundColor: '#ede7f9' },
  chipText: { color: '#666', fontSize: 13 },
  chipTextActive: { color: '#6B3CE6', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
})

export default CreateCar
