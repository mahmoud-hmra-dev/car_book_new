import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  FlatList,
  Image,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialIcons } from '@expo/vector-icons'
import { format } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import { useAuth } from '@/context/AuthContext'
import * as BookingService from '@/services/BookingService'
import * as SupplierService from '@/services/SupplierService'
import * as LocationService from '@/services/LocationService'
import * as CarService from '@/services/CarService'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'
import Backdrop from '@/components/Backdrop'
import Switch from '@/components/Switch'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const CreateBooking = () => {
  const router = useRouter()
  const { language } = useAuth()

  // current user
  const [currentUser, setCurrentUser] = useState<bookcarsTypes.User | null>(null)
  const [isSupplier, setIsSupplier] = useState(false)

  // data lists
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [locations, setLocations] = useState<bookcarsTypes.Location[]>([])
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [drivers, setDrivers] = useState<bookcarsTypes.User[]>([])

  // selected values
  const [selectedSupplier, setSelectedSupplier] = useState<bookcarsTypes.User | null>(null)
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<bookcarsTypes.Location | null>(null)
  const [selectedDropOffLocation, setSelectedDropOffLocation] = useState<bookcarsTypes.Location | null>(null)
  const [selectedCar, setSelectedCar] = useState<bookcarsTypes.Car | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<bookcarsTypes.User | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<bookcarsTypes.BookingStatus>(bookcarsTypes.BookingStatus.Pending)

  // driver search
  const [driverKeyword, setDriverKeyword] = useState('')

  // dates
  const [fromDate, setFromDate] = useState(new Date())
  const [fromTime, setFromTime] = useState(new Date())
  const [toDate, setToDate] = useState(new Date(Date.now() + 86400000))
  const [toTime, setToTime] = useState(new Date())
  const [showFromDatePicker, setShowFromDatePicker] = useState(false)
  const [showFromTimePicker, setShowFromTimePicker] = useState(false)
  const [showToDatePicker, setShowToDatePicker] = useState(false)
  const [showToTimePicker, setShowToTimePicker] = useState(false)

  // add-ons
  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)
  const [theftProtection, setTheftProtection] = useState(false)
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false)
  const [fullInsurance, setFullInsurance] = useState(false)
  const [additionalDriver, setAdditionalDriver] = useState(false)

  // additional driver fields
  const [adFullName, setAdFullName] = useState('')
  const [adEmail, setAdEmail] = useState('')
  const [adPhone, setAdPhone] = useState('')
  const [adBirthDate, setAdBirthDate] = useState<Date | null>(null)
  const [showAdBirthDatePicker, setShowAdBirthDatePicker] = useState(false)

  // price
  const [price, setPrice] = useState(0)

  // modal visibility
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [showPickupPicker, setShowPickupPicker] = useState(false)
  const [showDropOffPicker, setShowDropOffPicker] = useState(false)
  const [showCarPicker, setShowCarPicker] = useState(false)
  const [showDriverPicker, setShowDriverPicker] = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)

  // location search
  const [pickupSearch, setPickupSearch] = useState('')
  const [dropOffSearch, setDropOffSearch] = useState('')

  // ui state
  const [saving, setSaving] = useState(false)

  const statuses = [
    bookcarsTypes.BookingStatus.Void,
    bookcarsTypes.BookingStatus.Pending,
    bookcarsTypes.BookingStatus.Deposit,
    bookcarsTypes.BookingStatus.Paid,
    bookcarsTypes.BookingStatus.PaidInFull,
    bookcarsTypes.BookingStatus.Reserved,
    bookcarsTypes.BookingStatus.Cancelled,
  ]

  useEffect(() => {
    const init = async () => {
      try {
        const _currentUser = await UserService.getCurrentUser()
        if (_currentUser?._id) {
          const _user = await UserService.getUser(_currentUser._id)
          setCurrentUser(_user)

          const _isSupplier = _user.type === bookcarsTypes.RecordType.Supplier
          setIsSupplier(_isSupplier)

          if (_isSupplier) {
            setSelectedSupplier(_user)
          }
        }

        const [_suppliers, _locationsResult] = await Promise.all([
          SupplierService.getAllSuppliers(),
          LocationService.getLocations(1, 1000, language),
        ])
        setSuppliers(_suppliers)
        const locResult = _locationsResult?.[0]
        if (locResult?.resultData) {
          setLocations(locResult.resultData)
        }
      } catch (err) {
        helper.error(err)
      }
    }

    init()
  }, [language])

  const loadCars = useCallback(async (supplierId: string, pickupLocationId?: string) => {
    try {
      if (pickupLocationId) {
        const _cars = await CarService.getBookingCars({ supplier: supplierId, pickupLocation: pickupLocationId }, 1, 100)
        setCars(_cars || [])
      } else {
        const result = await CarService.getCars({ suppliers: [supplierId] }, 1, 100)
        const carResult = result?.[0]
        if (carResult?.resultData) {
          setCars(carResult.resultData)
        } else {
          setCars([])
        }
      }
    } catch (err) {
      helper.error(err)
      setCars([])
    }
  }, [])

  const searchDrivers = useCallback(async (keyword: string) => {
    try {
      if (keyword.length < 2) {
        setDrivers([])
        return
      }
      const result = await UserService.getUsers(
        { user: keyword, types: [bookcarsTypes.UserType.User] },
        1,
        50,
      )
      const driverResult = result?.[0]
      if (driverResult?.resultData) {
        setDrivers(driverResult.resultData)
      } else {
        setDrivers([])
      }
    } catch (err) {
      helper.error(err)
      setDrivers([])
    }
  }, [])

  const calculatePrice = useCallback((
    car: bookcarsTypes.Car | null,
    from: Date,
    fromT: Date,
    to: Date,
    toT: Date,
    opts: bookcarsTypes.CarOptions,
  ) => {
    if (!car) {
      setPrice(0)
      return
    }
    try {
      const _from = helper.dateTime(from, fromT)
      const _to = helper.dateTime(to, toT)
      const supplierObj = car.supplier as bookcarsTypes.User
      const _price = bookcarsHelper.calculateTotalPrice(car, _from, _to, supplierObj?.priceChangeRate || 0, opts)
      setPrice(_price)
    } catch {
      setPrice(0)
    }
  }, [])

  const currentOptions = useCallback((): bookcarsTypes.CarOptions => ({
    cancellation,
    amendments,
    theftProtection,
    collisionDamageWaiver,
    fullInsurance,
    additionalDriver,
  }), [cancellation, amendments, theftProtection, collisionDamageWaiver, fullInsurance, additionalDriver])

  useEffect(() => {
    calculatePrice(selectedCar, fromDate, fromTime, toDate, toTime, currentOptions())
  }, [selectedCar, fromDate, fromTime, toDate, toTime, cancellation, amendments, theftProtection, collisionDamageWaiver, fullInsurance, additionalDriver, calculatePrice, currentOptions])

  const handleSupplierSelect = async (supplier: bookcarsTypes.User) => {
    setSelectedSupplier(supplier)
    setSelectedCar(null)
    setShowSupplierPicker(false)
    if (supplier._id) {
      await loadCars(supplier._id, selectedPickupLocation?._id)
    }
  }

  const handlePickupLocationSelect = async (loc: bookcarsTypes.Location) => {
    setSelectedPickupLocation(loc)
    setShowPickupPicker(false)
    if (selectedSupplier?._id && loc._id) {
      await loadCars(selectedSupplier._id, loc._id)
    }
  }

  const getOptionExtra = (car: bookcarsTypes.Car | null, option: string) => {
    if (!car) return ''
    const val = car[option as keyof bookcarsTypes.Car] as number
    if (val === -1) return ` (${i18n.t('OPTION_INCLUDED')})`
    if (val === -2) return ` (${i18n.t('OPTION_UNAVAILABLE')})`
    if (val > 0) return ` (${bookcarsHelper.formatNumber(val, language)}${i18n.t('DAILY')})`
    return ''
  }

  const handleCreate = async () => {
    try {
      if (!selectedSupplier?._id || !selectedDriver?._id || !selectedCar?._id || !selectedPickupLocation?._id || !selectedDropOffLocation?._id) {
        helper.error()
        return
      }

      setSaving(true)

      const _from = helper.dateTime(fromDate, fromTime)
      const _to = helper.dateTime(toDate, toTime)

      const additionalDriverSet = helper.carOptionAvailable(selectedCar, 'additionalDriver') && additionalDriver

      const booking: bookcarsTypes.Booking = {
        supplier: selectedSupplier._id,
        car: selectedCar._id,
        driver: selectedDriver._id,
        pickupLocation: selectedPickupLocation._id,
        dropOffLocation: selectedDropOffLocation._id,
        from: _from,
        to: _to,
        status: selectedStatus,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver: additionalDriverSet || false,
        price,
      }

      let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined
      if (additionalDriverSet) {
        _additionalDriver = {
          fullName: adFullName,
          email: adEmail,
          phone: adPhone,
          birthDate: adBirthDate || new Date(),
        }
      }

      const result = await BookingService.createBooking({
        booking,
        additionalDriver: _additionalDriver,
      })

      if (result) {
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

  const filteredPickupLocations = pickupSearch
    ? locations.filter((l) => l.name?.toLowerCase().includes(pickupSearch.toLowerCase()))
    : locations

  const filteredDropOffLocations = dropOffSearch
    ? locations.filter((l) => l.name?.toLowerCase().includes(dropOffSearch.toLowerCase()))
    : locations

  const fromDateTime = helper.dateTime(fromDate, fromTime)
  const toDateTime = helper.dateTime(toDate, toTime)
  const days = bookcarsHelper.days(fromDateTime, toDateTime)

  return (
    <View style={styles.container}>
      <Header title={i18n.t('CREATE_BOOKING')} loggedIn reload />

      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{i18n.t('BOOKING_DETAILS')}</Text>
          <View style={styles.divider} />

          {/* Supplier */}
          {!isSupplier && (
            <>
              <Text style={styles.sectionTitle}>{i18n.t('SUPPLIER')}</Text>
              <Pressable style={styles.pickerButton} onPress={() => setShowSupplierPicker(true)}>
                <Text style={selectedSupplier ? styles.pickerValue : styles.pickerPlaceholder}>
                  {selectedSupplier?.fullName || i18n.t('SELECT_SUPPLIER')}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </Pressable>

              <Modal visible={showSupplierPicker} transparent animationType="slide" onRequestClose={() => setShowSupplierPicker(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowSupplierPicker(false)}>
                  <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{i18n.t('SELECT_SUPPLIER')}</Text>
                      <Pressable onPress={() => setShowSupplierPicker(false)} style={styles.modalCloseButton}>
                        <MaterialIcons name="close" size={24} color="#666" />
                      </Pressable>
                    </View>
                    <FlatList
                      data={suppliers}
                      keyExtractor={(item) => item._id!}
                      renderItem={({ item }) => (
                        <Pressable
                          style={[styles.modalItem, selectedSupplier?._id === item._id && styles.modalItemActive]}
                          onPress={() => handleSupplierSelect(item)}
                        >
                          <Text style={[styles.modalItemText, selectedSupplier?._id === item._id && styles.modalItemTextActive]}>
                            {item.fullName}
                          </Text>
                        </Pressable>
                      )}
                      style={styles.modalList}
                      ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('NO_RESULTS')}</Text>}
                    />
                  </View>
                </Pressable>
              </Modal>
            </>
          )}

          {/* Driver */}
          <Text style={styles.sectionTitle}>{i18n.t('DRIVER')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowDriverPicker(true)}>
            <Text style={selectedDriver ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedDriver?.fullName || i18n.t('SELECT_DRIVER')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>

          <Modal visible={showDriverPicker} transparent animationType="slide" onRequestClose={() => setShowDriverPicker(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowDriverPicker(false)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{i18n.t('SELECT_DRIVER')}</Text>
                  <Pressable onPress={() => setShowDriverPicker(false)} style={styles.modalCloseButton}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                <View style={styles.modalSearchContainer}>
                  <TextInput
                    placeholder={i18n.t('SEARCH_PLACEHOLDER')}
                    value={driverKeyword}
                    onChangeText={(text) => {
                      setDriverKeyword(text)
                      searchDrivers(text)
                    }}
                    autoCapitalize="none"
                  />
                </View>
                <FlatList
                  data={drivers}
                  keyExtractor={(item) => item._id!}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.modalItem, selectedDriver?._id === item._id && styles.modalItemActive]}
                      onPress={() => {
                        setSelectedDriver(item)
                        setShowDriverPicker(false)
                      }}
                    >
                      <View>
                        <Text style={[styles.modalItemText, selectedDriver?._id === item._id && styles.modalItemTextActive]}>
                          {item.fullName}
                        </Text>
                        <Text style={styles.modalItemSubtext}>{item.email}</Text>
                      </View>
                    </Pressable>
                  )}
                  style={styles.modalList}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      {driverKeyword.length < 2 ? i18n.t('SEARCH_PLACEHOLDER') : i18n.t('NO_RESULTS')}
                    </Text>
                  }
                />
              </View>
            </Pressable>
          </Modal>

          {/* Pickup Location */}
          <Text style={styles.sectionTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowPickupPicker(true)}>
            <Text style={selectedPickupLocation ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedPickupLocation?.name || i18n.t('SELECT_LOCATION')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>

          <Modal visible={showPickupPicker} transparent animationType="slide" onRequestClose={() => setShowPickupPicker(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowPickupPicker(false)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
                  <Pressable onPress={() => setShowPickupPicker(false)} style={styles.modalCloseButton}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                <View style={styles.modalSearchContainer}>
                  <TextInput
                    placeholder={i18n.t('SEARCH_PLACEHOLDER')}
                    value={pickupSearch}
                    onChangeText={setPickupSearch}
                    autoCapitalize="none"
                  />
                </View>
                <FlatList
                  data={filteredPickupLocations}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.modalItem, selectedPickupLocation?._id === item._id && styles.modalItemActive]}
                      onPress={() => handlePickupLocationSelect(item)}
                    >
                      <Text style={[styles.modalItemText, selectedPickupLocation?._id === item._id && styles.modalItemTextActive]}>
                        {item.name}
                      </Text>
                    </Pressable>
                  )}
                  style={styles.modalList}
                  ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('NO_RESULTS')}</Text>}
                />
              </View>
            </Pressable>
          </Modal>

          {/* Drop-off Location */}
          <Text style={styles.sectionTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowDropOffPicker(true)}>
            <Text style={selectedDropOffLocation ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedDropOffLocation?.name || i18n.t('SELECT_LOCATION')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>

          <Modal visible={showDropOffPicker} transparent animationType="slide" onRequestClose={() => setShowDropOffPicker(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowDropOffPicker(false)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
                  <Pressable onPress={() => setShowDropOffPicker(false)} style={styles.modalCloseButton}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                <View style={styles.modalSearchContainer}>
                  <TextInput
                    placeholder={i18n.t('SEARCH_PLACEHOLDER')}
                    value={dropOffSearch}
                    onChangeText={setDropOffSearch}
                    autoCapitalize="none"
                  />
                </View>
                <FlatList
                  data={filteredDropOffLocations}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.modalItem, selectedDropOffLocation?._id === item._id && styles.modalItemActive]}
                      onPress={() => {
                        setSelectedDropOffLocation(item)
                        setShowDropOffPicker(false)
                      }}
                    >
                      <Text style={[styles.modalItemText, selectedDropOffLocation?._id === item._id && styles.modalItemTextActive]}>
                        {item.name}
                      </Text>
                    </Pressable>
                  )}
                  style={styles.modalList}
                  ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('NO_RESULTS')}</Text>}
                />
              </View>
            </Pressable>
          </Modal>

          {/* Car */}
          <Text style={styles.sectionTitle}>{i18n.t('CAR')}</Text>
          <Pressable
            style={[styles.pickerButton, !selectedSupplier && styles.pickerDisabled]}
            onPress={() => selectedSupplier && setShowCarPicker(true)}
            disabled={!selectedSupplier}
          >
            <Text style={selectedCar ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedCar?.name || i18n.t('SELECT_CAR')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>

          <Modal visible={showCarPicker} transparent animationType="slide" onRequestClose={() => setShowCarPicker(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowCarPicker(false)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{i18n.t('SELECT_CAR')}</Text>
                  <Pressable onPress={() => setShowCarPicker(false)} style={styles.modalCloseButton}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                <FlatList
                  data={cars}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.modalItem, selectedCar?._id === item._id && styles.modalItemActive]}
                      onPress={() => {
                        setSelectedCar(item)
                        setShowCarPicker(false)
                      }}
                    >
                      <View style={styles.carItem}>
                        {item.image && (
                          <Image
                            source={{ uri: `${env.CDN_CARS}/${item.image}` }}
                            style={styles.carImage}
                            resizeMode="contain"
                          />
                        )}
                        <View style={styles.carInfo}>
                          <Text style={[styles.modalItemText, selectedCar?._id === item._id && styles.modalItemTextActive]}>
                            {item.name}
                          </Text>
                          <Text style={styles.modalItemSubtext}>
                            {`${bookcarsHelper.formatNumber(item.dailyPrice, language)} ${i18n.t('DAILY')}`}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  )}
                  style={styles.modalList}
                  ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('NO_RESULTS')}</Text>}
                />
              </View>
            </Pressable>
          </Modal>

          {/* From Date / Time */}
          <Text style={styles.sectionTitle}>{i18n.t('FROM_DATE')}</Text>
          <View style={styles.dateTimeRow}>
            <Pressable style={[styles.dateButton, { flex: 1 }]} onPress={() => setShowFromDatePicker(true)}>
              <MaterialIcons name="event" size={18} color="#6B3CE6" />
              <Text style={styles.dateText}>{format(fromDate, 'MMM dd, yyyy')}</Text>
            </Pressable>
            <Pressable style={[styles.dateButton, { flex: 0.6 }]} onPress={() => setShowFromTimePicker(true)}>
              <MaterialIcons name="access-time" size={18} color="#6B3CE6" />
              <Text style={styles.dateText}>{format(fromTime, 'HH:mm')}</Text>
            </Pressable>
          </View>
          {showFromDatePicker && (
            <DateTimePicker
              value={fromDate}
              mode="date"
              onChange={(_, date) => {
                setShowFromDatePicker(Platform.OS === 'ios')
                if (date) setFromDate(date)
              }}
            />
          )}
          {showFromTimePicker && (
            <DateTimePicker
              value={fromTime}
              mode="time"
              onChange={(_, date) => {
                setShowFromTimePicker(Platform.OS === 'ios')
                if (date) setFromTime(date)
              }}
            />
          )}

          {/* To Date / Time */}
          <Text style={styles.sectionTitle}>{i18n.t('TO_DATE')}</Text>
          <View style={styles.dateTimeRow}>
            <Pressable style={[styles.dateButton, { flex: 1 }]} onPress={() => setShowToDatePicker(true)}>
              <MaterialIcons name="event" size={18} color="#6B3CE6" />
              <Text style={styles.dateText}>{format(toDate, 'MMM dd, yyyy')}</Text>
            </Pressable>
            <Pressable style={[styles.dateButton, { flex: 0.6 }]} onPress={() => setShowToTimePicker(true)}>
              <MaterialIcons name="access-time" size={18} color="#6B3CE6" />
              <Text style={styles.dateText}>{format(toTime, 'HH:mm')}</Text>
            </Pressable>
          </View>
          {showToDatePicker && (
            <DateTimePicker
              value={toDate}
              mode="date"
              minimumDate={fromDate}
              onChange={(_, date) => {
                setShowToDatePicker(Platform.OS === 'ios')
                if (date) setToDate(date)
              }}
            />
          )}
          {showToTimePicker && (
            <DateTimePicker
              value={toTime}
              mode="time"
              onChange={(_, date) => {
                setShowToTimePicker(Platform.OS === 'ios')
                if (date) setToTime(date)
              }}
            />
          )}

          {/* Status */}
          <Text style={styles.sectionTitle}>{i18n.t('STATUS')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowStatusPicker(true)}>
            <View style={styles.statusPickerValue}>
              <View style={[styles.statusDot, { backgroundColor: helper.getBookingStatusColor(selectedStatus) }]} />
              <Text style={styles.pickerValue}>{helper.getBookingStatus(selectedStatus)}</Text>
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>

          <Modal visible={showStatusPicker} transparent animationType="slide" onRequestClose={() => setShowStatusPicker(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowStatusPicker(false)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{i18n.t('SELECT_STATUS')}</Text>
                  <Pressable onPress={() => setShowStatusPicker(false)} style={styles.modalCloseButton}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                <FlatList
                  data={statuses}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.modalItem, selectedStatus === item && styles.modalItemActive]}
                      onPress={() => {
                        setSelectedStatus(item)
                        setShowStatusPicker(false)
                      }}
                    >
                      <View style={styles.statusPickerValue}>
                        <View style={[styles.statusDot, { backgroundColor: helper.getBookingStatusColor(item) }]} />
                        <Text style={[styles.modalItemText, selectedStatus === item && styles.modalItemTextActive]}>
                          {helper.getBookingStatus(item)}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  style={styles.modalList}
                />
              </View>
            </Pressable>
          </Modal>

          {/* Options Section */}
          <View style={styles.optionalHeader}>
            <MaterialIcons name="info-outline" size={16} color="#999" />
            <Text style={styles.optionalText}>{i18n.t('OPTIONAL')}</Text>
          </View>

          <View style={styles.optionsCard}>
            <Switch
              label={`${i18n.t('CANCELLATION')}${getOptionExtra(selectedCar, 'cancellation')}`}
              value={cancellation}
              onValueChange={setCancellation}
            />
            <Switch
              label={`${i18n.t('AMENDMENTS')}${getOptionExtra(selectedCar, 'amendments')}`}
              value={amendments}
              onValueChange={setAmendments}
            />
            <Switch
              label={`${i18n.t('THEFT_PROTECTION')}${getOptionExtra(selectedCar, 'theftProtection')}`}
              value={theftProtection}
              onValueChange={setTheftProtection}
            />
            <Switch
              label={`${i18n.t('COLLISION_DAMAGE_WAVER')}${getOptionExtra(selectedCar, 'collisionDamageWaiver')}`}
              value={collisionDamageWaiver}
              onValueChange={setCollisionDamageWaiver}
            />
            <Switch
              label={`${i18n.t('FULL_INSURANCE')}${getOptionExtra(selectedCar, 'fullInsurance')}`}
              value={fullInsurance}
              onValueChange={setFullInsurance}
            />
            <Switch
              label={`${i18n.t('ADDITIONAL_DRIVER')}${getOptionExtra(selectedCar, 'additionalDriver')}`}
              value={additionalDriver}
              onValueChange={setAdditionalDriver}
            />
          </View>

          {/* Additional Driver Fields */}
          {selectedCar && helper.carOptionAvailable(selectedCar, 'additionalDriver') && additionalDriver && (
            <View style={styles.additionalDriverSection}>
              <View style={styles.additionalDriverHeader}>
                <MaterialIcons name="person-add" size={16} color="#666" />
                <Text style={styles.additionalDriverTitle}>{i18n.t('ADDITIONAL_DRIVER')}</Text>
              </View>
              <TextInput
                label={i18n.t('FULL_NAME')}
                value={adFullName}
                onChangeText={setAdFullName}
                autoCapitalize="words"
              />
              <TextInput
                label={i18n.t('EMAIL')}
                value={adEmail}
                onChangeText={setAdEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                label={i18n.t('PHONE')}
                value={adPhone}
                onChangeText={setAdPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.sectionTitle}>{i18n.t('BIRTH_DATE')}</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowAdBirthDatePicker(true)}>
                <MaterialIcons name="event" size={18} color="#6B3CE6" />
                <Text style={styles.dateText}>
                  {adBirthDate ? format(adBirthDate, 'MMM dd, yyyy') : i18n.t('BIRTH_DATE')}
                </Text>
              </Pressable>
              {showAdBirthDatePicker && (
                <DateTimePicker
                  value={adBirthDate || new Date(2000, 0, 1)}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowAdBirthDatePicker(Platform.OS === 'ios')
                    if (date) setAdBirthDate(date)
                  }}
                />
              )}
            </View>
          )}

          {/* Price Summary */}
          {days > 0 && selectedCar && (
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>{i18n.t('TOTAL_PRICE')}</Text>
              <Text style={styles.priceValue}>
                {bookcarsHelper.formatNumber(price, language)}
              </Text>
              <Text style={styles.priceSubtext}>
                {`${days} ${i18n.t('DAYS')} - ${i18n.t('PRICE_PER_DAY')} ${bookcarsHelper.formatNumber(days > 0 ? price / days : 0, language)}`}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label={i18n.t('CREATE')}
              onPress={handleCreate}
              disabled={saving || !selectedSupplier || !selectedDriver || !selectedCar || !selectedPickupLocation || !selectedDropOffLocation}
            />
            <Button
              label={i18n.t('CANCEL')}
              variant="secondary"
              onPress={() => router.back()}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 40 },
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
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  pickerDisabled: {
    opacity: 0.5,
    backgroundColor: '#f9f9f9',
  },
  pickerValue: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: '#999',
    fontSize: 15,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  dateText: { color: '#333', fontSize: 15 },
  optionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 8,
  },
  optionalText: {
    fontSize: 13,
    color: '#999',
  },
  optionsCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  additionalDriverSection: {
    marginTop: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  additionalDriverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  additionalDriverTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  priceCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22C55E',
  },
  priceSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actions: {
    marginTop: 20,
  },
  statusPickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000050',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalList: {
    paddingHorizontal: 16,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 2,
  },
  modalItemActive: {
    backgroundColor: '#ede7f9',
  },
  modalItemText: {
    fontSize: 15,
    color: '#333',
  },
  modalItemTextActive: {
    color: '#6B3CE6',
    fontWeight: '600',
  },
  modalItemSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 30,
    fontSize: 14,
  },
  carItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carImage: {
    width: 80,
    height: 50,
    borderRadius: 6,
  },
  carInfo: {
    flex: 1,
  },
})

export default CreateBooking
