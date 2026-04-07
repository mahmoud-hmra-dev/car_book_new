import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Image, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as CarService from '@/services/CarService'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import Search from '@/components/Search'
import EmptyList from '@/components/EmptyList'
import Indicator from '@/components/Indicator'

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

  const fetchCars = useCallback(async (_page: number, reset = false) => {
    try {
      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) {
        return
      }

      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers: [],
      }

      const data = await CarService.getCars(payload, _page, env.CARS_PAGE_SIZE)
      const result = data && data.length > 0 ? data[0] : null

      if (result && result.resultData) {
        if (reset) {
          setCars(result.resultData)
        } else {
          setCars((prev) => [...prev, ...result.resultData])
        }
        setHasMore(result.resultData.length >= env.CARS_PAGE_SIZE)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
    setLoading(true)
    fetchCars(1, true)
  }, [params.d]) // eslint-disable-line react-hooks/exhaustive-deps

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
            if (!car._id) {
              return
            }
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

  const renderCar = ({ item }: { item: bookcarsTypes.Car }) => {
    const supplier = item.supplier as bookcarsTypes.User
    const imageUrl = item.image ? bookcarsHelper.joinURL(env.CDN_CARS, item.image) : null

    return (
      <Pressable
        style={styles.carCard}
        onPress={() => router.push({ pathname: '/update-car', params: { id: item._id } })}
      >
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.carImage} resizeMode="cover" />
        )}
        <View style={styles.carInfo}>
          <Text style={styles.carName} numberOfLines={1}>{item.name}</Text>
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
            <View style={styles.carActions}>
              <Pressable onPress={() => handleDelete(item)} style={styles.deleteButton}>
                <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
              </Pressable>
            </View>
          </View>
          {supplier && (
            <Text style={styles.supplierName}>{supplier.fullName}</Text>
          )}
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('CARS')} loggedIn reload />

      <View style={styles.toolbar}>
        <Search
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
        />
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create-car')}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>{i18n.t('CREATE_CAR')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <Indicator />
      ) : (
        <FlatList
          data={cars.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()))}
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
  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
  carName: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  carDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  carDetail: { color: '#666', fontSize: 13 },
  carDetailSep: { color: '#ccc', marginHorizontal: 6 },
  carFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carPrice: { color: '#6B3CE6', fontWeight: '700', fontSize: 15 },
  carActions: { flexDirection: 'row', gap: 8 },
  deleteButton: { padding: 4 },
  supplierName: { color: '#999', fontSize: 12, marginTop: 4 },
})

export default Cars
