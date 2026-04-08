import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Modal,
  FlatList,
  Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as BookingService from '@/services/BookingService'
import * as CarService from '@/services/CarService'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import Button from '@/components/Button'
import Indicator from '@/components/Indicator'
import Backdrop from '@/components/Backdrop'
import Switch from '@/components/Switch'
import TextInput from '@/components/TextInput'

const UpdateBooking = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [booking, setBooking] = useState<bookcarsTypes.Booking | null>(null)

  // data lists
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [locations, setLocations] = useState<bookcarsTypes.Location[]>([])
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [drivers, setDrivers] = useState<bookcarsTypes.User[]>([])

  // editable fields
  const [selectedSupplier, setSelectedSupplier] = useState<bookcarsTypes.User | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<bookcarsTypes.User | null>(null)
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<bookcarsTypes.Location | null>(null)
  const [selectedDropOffLocation, setSelectedDropOffLocation] = useState<bookcarsTypes.Location | null>(null)
  const [selectedCar, setSelectedCar] = useState<bookcarsTypes.Car | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<bookcarsTypes.BookingStatus>(bookcarsTypes.BookingStatus.Pending)

  // driver search
  const [driverKeyword, setDriverKeyword] = useState('')

  // dates
  const [fromDate, setFromDate] = useState(new Date())
  const [fromTime, setFromTime] = useState(new Date())
  const [toDate, setToDate] = useState(new Date())
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

  // price
  const [price, setPrice] = useState(0)

  // modal visibility
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [showDriverPicker, setShowDriverPicker] = useState(false)
  const [showPickupPicker, setShowPickupPicker] = useState(false)
  const [showDropOffPicker, setShowDropOffPicker] = useState(false)
  const [showCarPicker, setShowCarPicker] = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)

  const statuses = [
    bookcarsTypes.BookingStatus.Void,
    bookcarsTypes.BookingStatus.Pending,
    bookcarsTypes.BookingStatus.Deposit,
    bookcarsTypes.BookingStatus.Paid,
    bookcarsTypes.BookingStatus.PaidInFull,
    bookcarsTypes.BookingStatus.Reserved,
    bookcarsTypes.BookingStatus.Cancelled,
  ]

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

  // recalculate price when relevant fields change
  useEffect(() => {
    if (selectedCar && !loading) {
      calculatePrice(selectedCar, fromDate, fromTime, toDate, toTime, currentOptions())
    }
  }, [selectedCar, fromDate, fromTime, toDate, toTime, cancellation, amendments, theftProtection, collisionDamageWaiver, fullInsurance, additionalDriver, loading, calculatePrice, currentOptions])

  useEffect(() => {
    const init = async () => {
      try {
        if (!id) {
          setLoading(false)
          return
        }

        const [_booking, _suppliers, _locationsResult] = await Promise.all([
          BookingService.getBooking(id, language),
          SupplierService.getAllSuppliers(),
          LocationService.getLocations(1, 1000, language),
        ])

        if (!_booking) {
          setLoading(false)
          return
        }

        setBooking(_booking)
        setSuppliers(_suppliers)
        const locResult = _locationsResult?.[0]
        if (locResult?.resultData) {
          setLocations(locResult.resultData)
        }

        // populate form fields from booking
        const supplierObj = _booking.supplier as bookcarsTypes.User
        const driverObj = _booking.driver as bookcarsTypes.User
        const pickupObj = _booking.pickupLocation as bookcarsTypes.Location
        const dropOffObj = _booking.dropOffLocation as bookcarsTypes.Location
        const carObj = _booking.car as bookcarsTypes.Car

        setSelectedSupplier(supplierObj || null)
        setSelectedDriver(driverObj || null)
        setSelectedPickupLocation(pickupObj || null)
        setSelectedDropOffLocation(dropOffObj || null)
        setSelectedCar(carObj || null)
        setSelectedStatus(_booking.status)

        // dates
        const _from = new Date(_booking.from)
        const _to = new Date(_booking.to)
        setFromDate(_from)
        setFromTime(_from)
        setToDate(_to)
        setToTime(_to)

        // add-ons
        setCancellation(_booking.cancellation || false)
        setAmendments(_booking.amendments || false)
        setTheftProtection(_booking.theftProtection || false)
        setCollisionDamageWaiver(_booking.collisionDamageWaiver || false)
        setFullInsurance(_booking.fullInsurance || false)
        setAdditionalDriver(_booking.additionalDriver || false)

        // price
        setPrice(_booking.price || 0)

        // load cars for the supplier
        if (supplierObj?._id) {
          await loadCars(supplierObj._id, pickupObj?._id)
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [id, language, loadCars])

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

  const handleSave = async () => {
    try {
      if (!booking?._id || !selectedSupplier?._id || !selectedDriver?._id || !selectedCar?._id || !selectedPickupLocation?._id || !selectedDropOffLocation?._id) {
        helper.error()
        return
      }

      setSaving(true)

      const _from = helper.dateTime(fromDate, fromTime)
      const _to = helper.dateTime(toDate, toTime)

      const updatedBooking: bookcarsTypes.Booking = {
        _id: booking._id,
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
        additionalDriver,
        price,
      }

      const status = await BookingService.updateBooking({ booking: updatedBooking })

      if (status === 200) {
        helper.toast(i18n.t('BOOKING_UPDATED'))
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

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: any[],
    renderItem: (item: any) => React.ReactElement,
    keyExtractor: (item: any) => string,
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </Pressable>
          </View>
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => renderItem(item)}
            style={styles.modalList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{i18n.t('NO_RESULTS')}</Text>
            }
          />
        </View>
      </View>
    </Modal>
  )

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

  const fromDateTime = helper.dateTime(fromDate, fromTime)
  const toDateTime = helper.dateTime(toDate, toTime)
  const days = bookcarsHelper.days(fromDateTime, toDateTime)

  return (
    <View style={styles.container}>
      <Header title={i18n.t('UPDATE_BOOKING')} loggedIn reload />

      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Supplier */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('SUPPLIER')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowSupplierPicker(true)}>
            <Text style={selectedSupplier ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedSupplier?.fullName || i18n.t('SELECT_SUPPLIER')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>
        </View>

        {renderPickerModal(
          showSupplierPicker,
          () => setShowSupplierPicker(false),
          i18n.t('SELECT_SUPPLIER'),
          suppliers,
          (item: bookcarsTypes.User) => (
            <Pressable
              style={[styles.modalItem, selectedSupplier?._id === item._id && styles.modalItemActive]}
              onPress={() => handleSupplierSelect(item)}
            >
              <Text style={[styles.modalItemText, selectedSupplier?._id === item._id && styles.modalItemTextActive]}>
                {item.fullName}
              </Text>
            </Pressable>
          ),
          (item: bookcarsTypes.User) => item._id!,
        )}

        {/* Driver */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('DRIVER')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowDriverPicker(true)}>
            <Text style={selectedDriver ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedDriver ? `${selectedDriver.fullName}` : i18n.t('SELECT_DRIVER')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>
        </View>

        <Modal visible={showDriverPicker} transparent animationType="slide" onRequestClose={() => setShowDriverPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{i18n.t('SELECT_DRIVER')}</Text>
                <Pressable onPress={() => setShowDriverPicker(false)} style={styles.modalCloseButton}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </Pressable>
              </View>
              <TextInput
                placeholder={i18n.t('SEARCH_PLACEHOLDER')}
                value={driverKeyword}
                onChangeText={(text) => {
                  setDriverKeyword(text)
                  searchDrivers(text)
                }}
                autoCapitalize="none"
              />
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
          </View>
        </Modal>

        {/* Locations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowPickupPicker(true)}>
            <View style={styles.pickerRow}>
              <MaterialIcons name="location-on" size={18} color="#6B3CE6" />
              <Text style={selectedPickupLocation ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedPickupLocation?.name || i18n.t('SELECT_LOCATION')}
              </Text>
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>

          <Text style={[styles.cardTitle, { marginTop: 16 }]}>{i18n.t('DROP_OFF_LOCATION')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowDropOffPicker(true)}>
            <View style={styles.pickerRow}>
              <MaterialIcons name="location-on" size={18} color="#EF4444" />
              <Text style={selectedDropOffLocation ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedDropOffLocation?.name || i18n.t('SELECT_LOCATION')}
              </Text>
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>
        </View>

        {renderPickerModal(
          showPickupPicker,
          () => setShowPickupPicker(false),
          i18n.t('PICKUP_LOCATION'),
          locations,
          (item: bookcarsTypes.Location) => (
            <Pressable
              style={[styles.modalItem, selectedPickupLocation?._id === item._id && styles.modalItemActive]}
              onPress={() => handlePickupLocationSelect(item)}
            >
              <Text style={[styles.modalItemText, selectedPickupLocation?._id === item._id && styles.modalItemTextActive]}>
                {item.name}
              </Text>
            </Pressable>
          ),
          (item: bookcarsTypes.Location) => item._id,
        )}

        {renderPickerModal(
          showDropOffPicker,
          () => setShowDropOffPicker(false),
          i18n.t('DROP_OFF_LOCATION'),
          locations,
          (item: bookcarsTypes.Location) => (
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
          ),
          (item: bookcarsTypes.Location) => item._id,
        )}

        {/* Car */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('CAR')}</Text>
          <Pressable
            style={[styles.pickerButton, !selectedSupplier && styles.pickerDisabled]}
            onPress={() => selectedSupplier && setShowCarPicker(true)}
            disabled={!selectedSupplier}
          >
            <View style={styles.pickerRow}>
              <MaterialIcons name="directions-car" size={18} color="#6B3CE6" />
              <Text style={selectedCar ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedCar?.name || i18n.t('SELECT_CAR')}
              </Text>
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>
        </View>

        {renderPickerModal(
          showCarPicker,
          () => setShowCarPicker(false),
          i18n.t('SELECT_CAR'),
          cars,
          (item: bookcarsTypes.Car) => (
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
          ),
          (item: bookcarsTypes.Car) => item._id,
        )}

        {/* Dates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('FROM_DATE')}</Text>
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

          <Text style={[styles.cardTitle, { marginTop: 16 }]}>{i18n.t('TO_DATE')}</Text>
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
        </View>

        {/* Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('STATUS')}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowStatusPicker(true)}>
            <View style={styles.statusPickerValue}>
              <View style={[styles.statusDot, { backgroundColor: helper.getBookingStatusColor(selectedStatus) }]} />
              <Text style={styles.pickerValue}>{helper.getBookingStatus(selectedStatus)}</Text>
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>
        </View>

        {renderPickerModal(
          showStatusPicker,
          () => setShowStatusPicker(false),
          i18n.t('SELECT_STATUS'),
          statuses,
          (item: bookcarsTypes.BookingStatus) => (
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
          ),
          (item: bookcarsTypes.BookingStatus) => item,
        )}

        {/* Add-on Options */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('OPTIONS')}</Text>
          <Switch
            label={i18n.t('CANCELLATION')}
            value={cancellation}
            onValueChange={setCancellation}
          />
          <Switch
            label={i18n.t('AMENDMENTS')}
            value={amendments}
            onValueChange={setAmendments}
          />
          <Switch
            label={i18n.t('THEFT_PROTECTION')}
            value={theftProtection}
            onValueChange={setTheftProtection}
          />
          <Switch
            label={i18n.t('COLLISION_DAMAGE_WAVER')}
            value={collisionDamageWaiver}
            onValueChange={setCollisionDamageWaiver}
          />
          <Switch
            label={i18n.t('FULL_INSURANCE')}
            value={fullInsurance}
            onValueChange={setFullInsurance}
          />
          <Switch
            label={i18n.t('ADDITIONAL_DRIVER')}
            value={additionalDriver}
            onValueChange={setAdditionalDriver}
          />
        </View>

        {/* Price */}
        {days > 0 && selectedCar && (
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <MaterialIcons name="payments" size={20} color="#22C55E" />
              <Text style={styles.priceLabel}>{i18n.t('TOTAL_PRICE')}</Text>
            </View>
            <Text style={styles.priceAmount}>
              {bookcarsHelper.formatNumber(price, language)}
            </Text>
            <Text style={styles.priceSubtext}>
              {`${days} ${i18n.t('DAYS')} - ${i18n.t('PRICE_PER_DAY')} ${bookcarsHelper.formatNumber(days > 0 ? price / days : 0, language)}`}
            </Text>
          </View>
        )}

        {/* Actions */}
        <Button
          label={i18n.t('SAVE')}
          onPress={handleSave}
          disabled={saving || !selectedSupplier || !selectedDriver || !selectedCar || !selectedPickupLocation || !selectedDropOffLocation}
          style={{ marginTop: 8 }}
        />
        <Button
          label={i18n.t('DELETE_BOOKING')}
          variant="danger"
          onPress={handleDelete}
          style={{ marginTop: 10 }}
        />
        <Button
          label={i18n.t('CANCEL')}
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 10, marginBottom: 20 }}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#999', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
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
  priceCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#22C55E',
  },
  priceSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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

export default UpdateBooking
