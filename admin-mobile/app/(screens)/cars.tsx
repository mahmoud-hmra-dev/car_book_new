import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Image, Alert, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as CarService from '@/services/CarService'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import Search from '@/components/Search'
import EmptyList from '@/components/EmptyList'
import Indicator from '@/components/Indicator'

interface FilterChipProps {
  label: string
  selected: boolean
  onPress: () => void
}

const FilterChip = ({ label, selected, onPress }: FilterChipProps) => (
  <Pressable
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </Pressable>
)

const Cars = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [supplierIds, setSupplierIds] = useState<string[]>([])

  // Filters
  const [carType, setCarType] = useState<string[]>([])
  const [gearbox, setGearbox] = useState<string[]>([])
  const [availability, setAvailability] = useState<string[]>([])
  const [fuelPolicy, setFuelPolicy] = useState<string[]>([])
  const [seats, setSeats] = useState<number>(-1)
  const [mileage, setMileage] = useState<string[]>([])

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

  const availabilityTypes = [
    { value: bookcarsTypes.Availablity.Available, label: i18n.t('AVAILABLE') },
    { value: bookcarsTypes.Availablity.Unavailable, label: i18n.t('NOT_AVAILABLE') },
  ]

  const fuelPolicies = [
    { value: bookcarsTypes.FuelPolicy.LikeForLike, label: i18n.t('FUEL_POLICY_LIKE_FOR_LIKE') },
    { value: bookcarsTypes.FuelPolicy.FreeTank, label: i18n.t('FUEL_POLICY_FREE_TANK') },
    { value: bookcarsTypes.FuelPolicy.FullToFull, label: i18n.t('FUEL_POLICY_FULL_TO_FULL') },
    { value: bookcarsTypes.FuelPolicy.FullToEmpty, label: i18n.t('FUEL_POLICY_FULL_TO_EMPTY') },
  ]

  const mileageTypes = [
    { value: bookcarsTypes.Mileage.Limited, label: i18n.t('LIMITED') },
    { value: bookcarsTypes.Mileage.Unlimited, label: i18n.t('UNLIMITED') },
  ]

  const seatOptions = [
    { value: -1, label: i18n.t('ALL') },
    { value: 2, label: '2' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
    { value: 6, label: '5+' },
  ]

  const toggleFilter = (arr: string[], value: string, setter: (val: string[]) => void) => {
    if (arr.includes(value)) {
      setter(arr.filter((v) => v !== value))
    } else {
      setter([...arr, value])
    }
  }

  const buildPayload = useCallback((): bookcarsTypes.GetCarsPayload => {
    const payload: bookcarsTypes.GetCarsPayload = {
      suppliers: supplierIds,
    }
    if (carType.length > 0) payload.carType = carType
    if (gearbox.length > 0) payload.gearbox = gearbox
    if (availability.length > 0) payload.availability = availability
    if (fuelPolicy.length > 0) payload.fuelPolicy = fuelPolicy
    if (mileage.length > 0) payload.mileage = mileage
    if (seats > 0) payload.seats = seats
    return payload
  }, [supplierIds, carType, gearbox, availability, fuelPolicy, mileage, seats])

  const fetchCars = useCallback(async (_page: number, reset = false, _supplierIds?: string[]) => {
    try {
      const ids = _supplierIds || supplierIds
      if (ids.length === 0) return

      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers: ids,
      }
      if (carType.length > 0) payload.carType = carType
      if (gearbox.length > 0) payload.gearbox = gearbox
      if (availability.length > 0) payload.availability = availability
      if (fuelPolicy.length > 0) payload.fuelPolicy = fuelPolicy
      if (mileage.length > 0) payload.mileage = mileage
      if (seats > 0) payload.seats = seats

      const data = await CarService.getCars(payload, _page, env.CARS_PAGE_SIZE)
      const result = data && data.length > 0 ? data[0] : null

      if (result && result.resultData) {
        if (reset) {
          setCars(result.resultData)
        } else {
          setCars((prev) => [...prev, ...result.resultData])
        }
        setHasMore(result.resultData.length >= env.CARS_PAGE_SIZE)
      } else if (reset) {
        setCars([])
        setHasMore(false)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supplierIds, carType, gearbox, availability, fuelPolicy, mileage, seats]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await UserService.getCurrentUser()
        if (!currentUser?._id) return

        const _user = await UserService.getUser(currentUser._id)
        const _isAdmin = _user.type === bookcarsTypes.RecordType.Admin
        setIsAdmin(_isAdmin)

        let ids: string[] = []
        if (_isAdmin) {
          const allSuppliers = await SupplierService.getAllSuppliers()
          ids = allSuppliers.map((s: bookcarsTypes.User) => s._id as string)
        } else {
          ids = [currentUser._id]
        }
        setSupplierIds(ids)
        await fetchCars(1, true, ids)
      } catch (err) {
        helper.error(err)
      }
    }

    setPage(1)
    setLoading(true)
    init()
  }, [params.d]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filters change
  useEffect(() => {
    if (supplierIds.length > 0) {
      setPage(1)
      setLoading(true)
      fetchCars(1, true)
    }
  }, [carType, gearbox, availability, fuelPolicy, mileage, seats]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchCars(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchCars(nextPage)
    }
  }

  const handleDelete = (car: bookcarsTypes.Car) => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_CAR_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!car._id) return
            const status = await CarService.deleteCar(car._id)
            if (status === 200) {
              setCars((prev) => prev.filter((c) => c._id !== car._id))
              helper.toast(i18n.t('CAR_DELETED'))
            }
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  const filteredCars = cars.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()))

  const renderCar = ({ item }: { item: bookcarsTypes.Car }) => {
    const supplier = item.supplier as bookcarsTypes.User
    const imageUrl = item.image ? bookcarsHelper.joinURL(env.CDN_CARS, item.image) : null

    return (
      <Pressable
        style={styles.carCard}
        onPress={() => router.push({ pathname: '/car', params: { id: item._id } })}
      >
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.carImage} resizeMode="cover" />
        )}
        <View style={styles.carInfo}>
          <View style={styles.carNameRow}>
            <Text style={styles.carName} numberOfLines={1}>{item.name}</Text>
            <View style={[
              styles.availBadge,
              { backgroundColor: item.available ? '#DCFCE7' : '#FEE2E2' },
            ]}>
              <View style={[
                styles.availDot,
                { backgroundColor: item.available ? '#22C55E' : '#EF4444' },
              ]} />
            </View>
          </View>
          <View style={styles.carDetails}>
            <Text style={styles.carDetail}>{helper.getCarTypeShort(item.type)}</Text>
            <Text style={styles.carDetailSep}>·</Text>
            <Text style={styles.carDetail}>{helper.getGearboxTypeShort(item.gearbox)}</Text>
            <Text style={styles.carDetailSep}>·</Text>
            <Text style={styles.carDetail}>{item.seats} {i18n.t('SEATS').toLowerCase()}</Text>
          </View>
          <View style={styles.carFooter}>
            <Text style={styles.carPrice}>
              {bookcarsHelper.formatNumber(item.dailyPrice, language)}{i18n.t('DAILY')}
            </Text>
            <Pressable onPress={() => handleDelete(item)} style={styles.deleteBtn}>
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
            </Pressable>
          </View>
          {supplier && (
            <Text style={styles.supplierName}>{supplier.fullName}</Text>
          )}
        </View>
      </Pressable>
    )
  }

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Car Type */}
      <Text style={styles.filterLabel}>{i18n.t('FILTER_CAR_TYPE')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {carTypes.map((ct) => (
          <FilterChip
            key={ct.value}
            label={ct.label}
            selected={carType.includes(ct.value)}
            onPress={() => toggleFilter(carType, ct.value, setCarType)}
          />
        ))}
      </ScrollView>

      {/* Gearbox */}
      <Text style={styles.filterLabel}>{i18n.t('FILTER_GEARBOX')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {gearboxTypes.map((gt) => (
          <FilterChip
            key={gt.value}
            label={gt.label}
            selected={gearbox.includes(gt.value)}
            onPress={() => toggleFilter(gearbox, gt.value, setGearbox)}
          />
        ))}
      </ScrollView>

      {/* Mileage */}
      <Text style={styles.filterLabel}>{i18n.t('FILTER_MILEAGE')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {mileageTypes.map((mt) => (
          <FilterChip
            key={mt.value}
            label={mt.label}
            selected={mileage.includes(mt.value)}
            onPress={() => toggleFilter(mileage, mt.value, setMileage)}
          />
        ))}
      </ScrollView>

      {/* Fuel Policy */}
      <Text style={styles.filterLabel}>{i18n.t('FILTER_FUEL_POLICY')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {fuelPolicies.map((fp) => (
          <FilterChip
            key={fp.value}
            label={fp.label}
            selected={fuelPolicy.includes(fp.value)}
            onPress={() => toggleFilter(fuelPolicy, fp.value, setFuelPolicy)}
          />
        ))}
      </ScrollView>

      {/* Seats */}
      <Text style={styles.filterLabel}>{i18n.t('FILTER_SEATS')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {seatOptions.map((so) => (
          <FilterChip
            key={so.value}
            label={so.label}
            selected={seats === so.value}
            onPress={() => setSeats(so.value)}
          />
        ))}
      </ScrollView>

      {/* Availability - admin only */}
      {isAdmin && (
        <>
          <Text style={styles.filterLabel}>{i18n.t('FILTER_AVAILABILITY')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {availabilityTypes.map((at) => (
              <FilterChip
                key={at.value}
                label={at.label}
                selected={availability.includes(at.value)}
                onPress={() => toggleFilter(availability, at.value, setAvailability)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <Header title={i18n.t('CARS')} loggedIn reload />

      <View style={styles.toolbar}>
        <Search
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
        />
        <View style={styles.toolbarRow}>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push('/create-car')}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>{i18n.t('CREATE_CAR')}</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialIcons
              name="tune"
              size={20}
              color={showFilters ? '#fff' : '#6B3CE6'}
            />
            <Text style={[styles.filterButtonText, showFilters && styles.filterButtonTextActive]}>
              {showFilters ? i18n.t('HIDE_FILTERS') : i18n.t('SHOW_FILTERS')}
            </Text>
          </Pressable>
        </View>
        {showFilters && renderFilters()}
      </View>

      {loading ? (
        <Indicator />
      ) : (
        <FlatList
          data={filteredCars}
          renderItem={renderCar}
          keyExtractor={(item) => item._id!}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_CAR_LIST')} icon="directions-car" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6B3CE6']} />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  toolbar: { padding: 16, paddingBottom: 0 },
  toolbarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B3CE6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B3CE6',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#6B3CE6',
  },
  filterButtonText: { color: '#6B3CE6', fontWeight: '600', fontSize: 14 },
  filterButtonTextActive: { color: '#fff' },
  filtersContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 6,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#6B3CE6',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  list: { padding: 16, paddingTop: 4 },
  carCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  carImage: { width: '100%', height: 160 },
  carInfo: { padding: 14 },
  carNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  carName: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1 },
  availBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  carDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  carDetail: { color: '#666', fontSize: 13 },
  carDetailSep: { color: '#ccc', marginHorizontal: 6 },
  carFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carPrice: { color: '#6B3CE6', fontWeight: '700', fontSize: 15 },
  deleteBtn: { padding: 4 },
  supplierName: { color: '#999', fontSize: 12, marginTop: 4 },
})

export default Cars
