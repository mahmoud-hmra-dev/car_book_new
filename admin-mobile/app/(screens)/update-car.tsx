import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  FlatList,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as CarService from '@/services/CarService'
import * as SupplierService from '@/services/SupplierService'
import * as LocationService from '@/services/LocationService'
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

const PURPLE = '#6B3CE6'

const carTypes = [
  { value: bookcarsTypes.CarType.Diesel, label: 'DIESEL' },
  { value: bookcarsTypes.CarType.Gasoline, label: 'GASOLINE' },
  { value: bookcarsTypes.CarType.Electric, label: 'ELECTRIC' },
  { value: bookcarsTypes.CarType.Hybrid, label: 'HYBRID' },
  { value: bookcarsTypes.CarType.PlugInHybrid, label: 'PLUG_IN_HYBRID' },
]

const gearboxTypes = [
  { value: bookcarsTypes.GearboxType.Manual, label: 'GEARBOX_MANUAL' },
  { value: bookcarsTypes.GearboxType.Automatic, label: 'GEARBOX_AUTOMATIC' },
]

const seatsOptions = [
  { value: 2, label: '2' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '5+' },
]

const doorsOptions = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
]

const fuelPolicies = [
  { value: bookcarsTypes.FuelPolicy.LikeForLike, label: 'FUEL_POLICY_LIKE_FOR_LIKE' },
  { value: bookcarsTypes.FuelPolicy.FreeTank, label: 'FUEL_POLICY_FREE_TANK' },
  { value: bookcarsTypes.FuelPolicy.FullToFull, label: 'FUEL_POLICY_FULL_TO_FULL' },
  { value: bookcarsTypes.FuelPolicy.FullToEmpty, label: 'FUEL_POLICY_FULL_TO_EMPTY' },
]

const carRanges = [
  { value: bookcarsTypes.CarRange.Mini, label: 'CAR_RANGE_MINI' },
  { value: bookcarsTypes.CarRange.Midi, label: 'CAR_RANGE_MIDI' },
  { value: bookcarsTypes.CarRange.Maxi, label: 'CAR_RANGE_MAXI' },
  { value: bookcarsTypes.CarRange.Scooter, label: 'CAR_RANGE_SCOOTER' },
  { value: bookcarsTypes.CarRange.Bus, label: 'CAR_RANGE_BUS' },
  { value: bookcarsTypes.CarRange.Truck, label: 'CAR_RANGE_TRUCK' },
  { value: bookcarsTypes.CarRange.Caravan, label: 'CAR_RANGE_CARAVAN' },
]

const extraToString = (extra: number) => (extra === -1 ? '' : String(extra))

const UpdateCar = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [car, setCar] = useState<bookcarsTypes.Car | null>(null)

  // Suppliers
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<bookcarsTypes.User | null>(null)
  const [supplierModalVisible, setSupplierModalVisible] = useState(false)

  // Locations
  const [allLocations, setAllLocations] = useState<bookcarsTypes.Location[]>([])
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [locationModalVisible, setLocationModalVisible] = useState(false)

  // Image
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageChanged, setImageChanged] = useState(false)

  // Basic info
  const [name, setName] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [minimumAge, setMinimumAge] = useState(String(env.MINIMUM_AGE))

  // Pricing
  const [dailyPrice, setDailyPrice] = useState('')
  const [discountedDailyPrice, setDiscountedDailyPrice] = useState('')
  const [deposit, setDeposit] = useState('')

  // Specifications
  const [type, setType] = useState<string>(bookcarsTypes.CarType.Diesel)
  const [gearbox, setGearbox] = useState<string>(bookcarsTypes.GearboxType.Manual)
  const [seats, setSeats] = useState(5)
  const [doors, setDoors] = useState(4)
  const [fuelPolicy, setFuelPolicy] = useState<string>(bookcarsTypes.FuelPolicy.FreeTank)
  const [range, setRange] = useState<string>(bookcarsTypes.CarRange.Mini)
  const [aircon, setAircon] = useState(true)
  const [mileage, setMileage] = useState('')
  const [rating, setRating] = useState('')

  // Add-ons
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')

  // Availability
  const [available, setAvailable] = useState(true)
  const [fullyBooked, setFullyBooked] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const [_suppliers, locResult] = await Promise.all([
          SupplierService.getAllSuppliers(),
          LocationService.getLocations(1, 1000, language),
        ])
        setSuppliers(_suppliers)
        const locData = locResult?.[0]
        if (locData?.resultData) {
          setAllLocations(locData.resultData)
        }

        if (id) {
          const _car = await CarService.getCar(id, language)
          if (!_car) {
            setLoading(false)
            return
          }
          setCar(_car)

          // Populate basic info
          setName(_car.name || '')
          setLicensePlate(_car.licensePlate || '')
          setMinimumAge(String(_car.minimumAge || env.MINIMUM_AGE))

          // Image
          if (_car.image) {
            setImageUri(bookcarsHelper.joinURL(env.CDN_CARS, _car.image))
          }

          // Supplier
          const sup = _car.supplier as bookcarsTypes.User
          if (sup && sup._id) {
            const found = _suppliers.find((s) => s._id === sup._id)
            setSelectedSupplier(found || sup)
          }

          // Locations
          if (_car.locations && _car.locations.length > 0) {
            const locIds = _car.locations.map((l: any) => l._id || l)
            setSelectedLocationIds(locIds)
          }

          // Pricing
          setDailyPrice(String(_car.dailyPrice || ''))
          setDiscountedDailyPrice(_car.discountedDailyPrice ? String(_car.discountedDailyPrice) : '')
          setDeposit(String(_car.deposit || ''))

          // Specifications
          setType(_car.type || bookcarsTypes.CarType.Diesel)
          setGearbox(_car.gearbox || bookcarsTypes.GearboxType.Manual)
          setSeats(_car.seats || 5)
          setDoors(_car.doors || 4)
          setFuelPolicy(_car.fuelPolicy || bookcarsTypes.FuelPolicy.FreeTank)
          setRange(_car.range || bookcarsTypes.CarRange.Mini)
          setAircon(_car.aircon !== false)
          setMileage(_car.mileage !== undefined ? extraToString(_car.mileage) : '')
          setRating(_car.rating ? String(_car.rating) : '')

          // Add-ons
          setCancellation(extraToString(_car.cancellation ?? -1))
          setAmendments(extraToString(_car.amendments ?? -1))
          setTheftProtection(extraToString(_car.theftProtection ?? -1))
          setCollisionDamageWaiver(extraToString(_car.collisionDamageWaiver ?? -1))
          setFullInsurance(extraToString(_car.fullInsurance ?? -1))
          setAdditionalDriver(extraToString(_car.additionalDriver ?? -1))

          // Availability
          setAvailable(_car.available !== false)
          setFullyBooked(_car.fullyBooked || false)
          setComingSoon(_car.comingSoon || false)
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, language])

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
        setImageChanged(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const extraToNumber = (val: string) => (val === '' ? -1 : Number(val))

  const handleSave = async () => {
    try {
      if (!car?._id || !name.trim()) {
        Alert.alert(i18n.t('ERROR'), i18n.t('REQUIRED'))
        return
      }
      if (!selectedSupplier?._id) {
        Alert.alert(i18n.t('ERROR'), i18n.t('SELECT_SUPPLIER'))
        return
      }

      setSaving(true)

      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) {
        helper.error()
        return
      }

      // Upload new image if changed
      if (imageChanged && imageUri) {
        const fileName = helper.getFileName(imageUri)
        const mimeType = helper.getMimeType(fileName)
        await CarService.updateCarImage(car._id, {
          uri: imageUri,
          name: fileName,
          type: mimeType,
        })
      }

      const status = await CarService.updateCar({
        _id: car._id,
        loggedUser: currentUser._id,
        name: name.trim(),
        supplier: selectedSupplier._id,
        licensePlate: licensePlate.trim(),
        minimumAge: parseInt(minimumAge, 10) || env.MINIMUM_AGE,
        locations: selectedLocationIds,
        dailyPrice: parseFloat(dailyPrice) || 0,
        discountedDailyPrice: discountedDailyPrice ? parseFloat(discountedDailyPrice) : null,
        hourlyPrice: car.hourlyPrice ?? null,
        discountedHourlyPrice: car.discountedHourlyPrice ?? null,
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
        fullyBooked,
        comingSoon,
        type,
        gearbox,
        aircon,
        seats,
        doors,
        fuelPolicy,
        mileage: mileage === '' ? -1 : parseInt(mileage, 10),
        cancellation: extraToNumber(cancellation),
        amendments: extraToNumber(amendments),
        theftProtection: extraToNumber(theftProtection),
        collisionDamageWaiver: extraToNumber(collisionDamageWaiver),
        fullInsurance: extraToNumber(fullInsurance),
        additionalDriver: extraToNumber(additionalDriver),
        range,
        multimedia: car.multimedia || [],
        rating: rating ? parseFloat(rating) : undefined,
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

  const toggleLocation = useCallback((locId: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(locId) ? prev.filter((locIdItem) => locIdItem !== locId) : [...prev, locId]
    )
  }, [])

  const renderSectionTitle = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  )

  const renderChipRow = <T extends string | number>(
    options: { value: T; label: string }[],
    selected: T,
    onSelect: (val: T) => void,
    useI18n = true,
  ) => (
    <View style={styles.chipWrap}>
      {options.map((opt) => (
        <Pressable
          key={String(opt.value)}
          style={[styles.chip, selected === opt.value && styles.chipActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, selected === opt.value && styles.chipTextActive]}>
            {useI18n ? i18n.t(opt.label) : opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )

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

  const selectedLocationNames = allLocations
    .filter((l) => selectedLocationIds.includes(l._id))
    .map((l) => l.name || l._id)

  return (
    <View style={styles.container}>
      <Header title={i18n.t('UPDATE_CAR')} loggedIn reload />
      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Section: Image */}
        <View style={styles.card}>
          {renderSectionTitle(i18n.t('SECTION_IMAGE'))}
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
          {imageUri && (
            <Text style={styles.changeImageHint}>{i18n.t('CHANGE_IMAGE')}</Text>
          )}
        </View>

        {/* Section: Basic Info */}
        <View style={styles.card}>
          {renderSectionTitle(i18n.t('BASIC_INFO'))}

          <TextInput label={i18n.t('CAR_NAME')} value={name} onChangeText={setName} />
          <TextInput label={i18n.t('LICENSE_PLATE')} value={licensePlate} onChangeText={setLicensePlate} />

          {/* Supplier Picker */}
          <Text style={styles.fieldLabel}>{i18n.t('SUPPLIER')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setSupplierModalVisible(true)}>
            <Text style={styles.pickerButtonText}>
              {selectedSupplier?.fullName || i18n.t('SELECT_SUPPLIER')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>

          <TextInput
            label={i18n.t('MINIMUM_AGE')}
            value={minimumAge}
            onChangeText={setMinimumAge}
            keyboardType="numeric"
          />

          {/* Locations Multi-Select */}
          <Text style={styles.fieldLabel}>{i18n.t('LOCATIONS')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setLocationModalVisible(true)}>
            <Text style={styles.pickerButtonText} numberOfLines={1}>
              {selectedLocationNames.length > 0
                ? `${selectedLocationNames.length} ${i18n.t('LOCATIONS_SELECTED')}`
                : i18n.t('NO_LOCATIONS_SELECTED')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>
          {selectedLocationNames.length > 0 && (
            <View style={styles.selectedTagsRow}>
              {selectedLocationNames.map((locName, idx) => (
                <View key={`loc-tag-${selectedLocationIds[idx]}`} style={styles.tag}>
                  <Text style={styles.tagText}>{locName}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section: Pricing */}
        <View style={styles.card}>
          {renderSectionTitle(i18n.t('PRICING'))}

          <TextInput
            label={i18n.t('DAILY_PRICE')}
            value={dailyPrice}
            onChangeText={setDailyPrice}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('DISCOUNTED_PRICE')}
            value={discountedDailyPrice}
            onChangeText={setDiscountedDailyPrice}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('DEPOSIT')}
            value={deposit}
            onChangeText={setDeposit}
            keyboardType="numeric"
          />
        </View>

        {/* Section: Specifications */}
        <View style={styles.card}>
          {renderSectionTitle(i18n.t('SPECIFICATIONS'))}

          <Text style={styles.fieldLabel}>{i18n.t('CAR_TYPE')}</Text>
          {renderChipRow(carTypes, type, setType)}

          <Text style={styles.fieldLabel}>{i18n.t('GEARBOX')}</Text>
          {renderChipRow(gearboxTypes, gearbox, setGearbox)}

          <Text style={styles.fieldLabel}>{i18n.t('SEATS')}</Text>
          {renderChipRow(seatsOptions, seats, setSeats, false)}

          <Text style={styles.fieldLabel}>{i18n.t('DOORS')}</Text>
          {renderChipRow(doorsOptions, doors, setDoors, false)}

          <Text style={styles.fieldLabel}>{i18n.t('FUEL_POLICY')}</Text>
          {renderChipRow(fuelPolicies, fuelPolicy, setFuelPolicy)}

          <Text style={styles.fieldLabel}>{i18n.t('CAR_RANGE')}</Text>
          {renderChipRow(carRanges, range, setRange)}

          <Switch label={i18n.t('AIRCON')} value={aircon} onValueChange={setAircon} />

          <TextInput
            label={i18n.t('MILEAGE_LABEL')}
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
            placeholder="-1 = unlimited"
          />

          <TextInput
            label={i18n.t('RATING')}
            value={rating}
            onChangeText={setRating}
            keyboardType="numeric"
            placeholder="1-5"
          />
        </View>

        {/* Section: Add-ons */}
        <View style={styles.card}>
          {renderSectionTitle(i18n.t('ADDONS'))}
          <Text style={styles.addonHint}>{i18n.t('ADDON_TOOLTIP')}</Text>

          <TextInput
            label={i18n.t('CANCELLATION')}
            value={cancellation}
            onChangeText={setCancellation}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('AMENDMENTS')}
            value={amendments}
            onChangeText={setAmendments}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('THEFT_PROTECTION')}
            value={theftProtection}
            onChangeText={setTheftProtection}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('COLLISION_DAMAGE_WAVER')}
            value={collisionDamageWaiver}
            onChangeText={setCollisionDamageWaiver}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('FULL_INSURANCE')}
            value={fullInsurance}
            onChangeText={setFullInsurance}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('ADDITIONAL_DRIVER')}
            value={additionalDriver}
            onChangeText={setAdditionalDriver}
            keyboardType="numeric"
          />
        </View>

        {/* Section: Availability */}
        <View style={styles.card}>
          {renderSectionTitle(i18n.t('AVAILABILITY'))}

          <Switch label={i18n.t('AVAILABLE')} value={available} onValueChange={setAvailable} />
          <Switch label={i18n.t('FULLY_BOOKED')} value={fullyBooked} onValueChange={setFullyBooked} />
          <Switch label={i18n.t('COMING_SOON')} value={comingSoon} onValueChange={setComingSoon} />
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Button
            label={saving ? i18n.t('LOADING') : i18n.t('SAVE')}
            onPress={handleSave}
            disabled={saving}
          />
          <Button
            label={i18n.t('DELETE_CAR')}
            variant="danger"
            onPress={handleDelete}
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>

      {/* Supplier Modal */}
      <Modal visible={supplierModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('SELECT_SUPPLIER')}</Text>
              <Pressable onPress={() => setSupplierModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            <FlatList
              data={suppliers}
              keyExtractor={(item) => item._id || ''}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalItem,
                    selectedSupplier?._id === item._id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedSupplier(item)
                    setSupplierModalVisible(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedSupplier?._id === item._id && styles.modalItemTextActive,
                    ]}
                  >
                    {item.fullName}
                  </Text>
                  {selectedSupplier?._id === item._id && (
                    <MaterialIcons name="check" size={20} color={PURPLE} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Location Modal */}
      <Modal visible={locationModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('SELECT_LOCATIONS')}</Text>
              <Pressable onPress={() => setLocationModalVisible(false)}>
                <Text style={styles.modalDoneText}>{i18n.t('DONE')}</Text>
              </Pressable>
            </View>
            <FlatList
              data={allLocations}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const checked = selectedLocationIds.includes(item._id)
                return (
                  <Pressable
                    style={[styles.modalItem, checked && styles.modalItemActive]}
                    onPress={() => toggleLocation(item._id)}
                  >
                    <MaterialIcons
                      name={checked ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={checked ? PURPLE : '#999'}
                    />
                    <Text
                      style={[styles.modalItemText, { marginLeft: 10 }, checked && styles.modalItemTextActive]}
                    >
                      {item.name || item._id}
                    </Text>
                  </Pressable>
                )
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  imagePicker: { marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
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
  changeImageHint: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipActive: { borderColor: PURPLE, backgroundColor: '#ede7f9' },
  chipText: { color: '#666', fontSize: 13 },
  chipTextActive: { color: PURPLE, fontWeight: '600' },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  pickerButtonText: { fontSize: 15, color: '#333', flex: 1 },
  selectedTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, marginTop: -8 },
  tag: {
    backgroundColor: '#ede7f9',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: { color: PURPLE, fontSize: 12, fontWeight: '500' },
  addonHint: { fontSize: 12, color: '#999', marginBottom: 12, fontStyle: 'italic' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  modalDoneText: { fontSize: 16, fontWeight: '600', color: PURPLE },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalItemActive: { backgroundColor: '#f8f5ff' },
  modalItemText: { fontSize: 15, color: '#333', flex: 1 },
  modalItemTextActive: { color: PURPLE, fontWeight: '600' },
})

export default UpdateCar
