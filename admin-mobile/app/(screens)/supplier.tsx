import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Image, Alert, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { Avatar } from 'react-native-paper'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'
import EmptyList from '@/components/EmptyList'

const SupplierDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [supplier, setSupplier] = useState<bookcarsTypes.User | null>(null)
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [carsCount, setCarsCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCars = useCallback(async (supplierId: string, _page: number, reset = false) => {
    try {
      const data = await CarService.getCars({ suppliers: [supplierId] }, _page, env.CARS_PAGE_SIZE)
      const result = data && data.length > 0 ? data[0] : null
      if (result && result.resultData) {
        if (reset) {
          setCars(result.resultData)
        } else {
          setCars((prev) => [...prev, ...result.resultData])
        }
        setCarsCount(result.pageInfo?.totalRecords ?? result.resultData.length)
        setHasMore(result.resultData.length >= env.CARS_PAGE_SIZE)
      }
    } catch (err) {
      helper.error(err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        if (!id) return
        const _supplier = await SupplierService.getSupplier(id)
        setSupplier(_supplier)
        await fetchCars(id, 1, true)
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    if (!id) return
    setRefreshing(true)
    setPage(1)
    try {
      const _supplier = await SupplierService.getSupplier(id)
      setSupplier(_supplier)
      await fetchCars(id, 1, true)
    } catch (err) {
      helper.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLoadMore = () => {
    if (hasMore && !loading && id) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchCars(id, nextPage)
    }
  }

  const handleDelete = () => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_SUPPLIER_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!id) return
            const status = await SupplierService.deleteSupplier(id)
            if (status === 200) {
              helper.toast(i18n.t('SUPPLIER_DELETED'))
              router.back()
            }
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  const avatarUrl = supplier?.avatar
    ? (supplier.avatar.startsWith('http') ? supplier.avatar : bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar))
    : null

  const renderCarItem = ({ item }: { item: bookcarsTypes.Car }) => {
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
          <Text style={styles.carName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.carDetails}>
            <Text style={styles.carDetail}>{helper.getCarTypeShort(item.type)}</Text>
            <Text style={styles.carDetailSep}>·</Text>
            <Text style={styles.carDetail}>{helper.getGearboxTypeShort(item.gearbox)}</Text>
            <Text style={styles.carDetailSep}>·</Text>
            <Text style={styles.carDetail}>{item.seats} {i18n.t('SEATS').toLowerCase()}</Text>
          </View>
          <Text style={styles.carPrice}>
            {bookcarsHelper.formatNumber(item.dailyPrice, language)}{i18n.t('DAILY')}
          </Text>
        </View>
      </Pressable>
    )
  }

  const renderHeader = () => (
    <View>
      <View style={styles.card}>
        <View style={styles.profileRow}>
          {avatarUrl
            ? <Avatar.Image size={40} source={{ uri: avatarUrl }} />
            : <Avatar.Icon size={40} icon="domain" style={{ backgroundColor: '#6B3CE6' }} />}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{supplier?.fullName}</Text>
            <Text style={styles.profileEmail}>{supplier?.email}</Text>
          </View>
        </View>
        {!!supplier?.phone && (
          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={16} color="#999" />
            <Text style={styles.detailText}>{supplier.phone}</Text>
          </View>
        )}
        {!!supplier?.location && (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#999" />
            <Text style={styles.detailText}>{supplier.location}</Text>
          </View>
        )}
        {!!supplier?.bio && (
          <View style={styles.detailRow}>
            <MaterialIcons name="info-outline" size={16} color="#999" />
            <Text style={styles.detailText}>{supplier.bio}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/update-supplier', params: { id } })}
        >
          <MaterialIcons name="edit" size={18} color="#6B3CE6" />
          <Text style={styles.editButtonText}>{i18n.t('EDIT')}</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteButtonText}>{i18n.t('DELETE')}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{i18n.t('CARS')}</Text>
        <Text style={styles.sectionCount}>{carsCount}</Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('SUPPLIER')} loggedIn reload />
        <Indicator />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={supplier?.fullName || i18n.t('SUPPLIER')} loggedIn reload />
      <FlatList
        data={cars}
        renderItem={renderCarItem}
        keyExtractor={(item) => item._id!}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_CAR_LIST')} icon="directions-car" />}
        onEndReached={handleLoadMore}
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
  list: { padding: 16 },
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
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#333' },
  profileEmail: { fontSize: 13, color: '#999', marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  detailText: { fontSize: 14, color: '#666', flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B3CE6',
  },
  editButtonText: { color: '#6B3CE6', fontWeight: '600', fontSize: 14 },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteButtonText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
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
  carPrice: { color: '#6B3CE6', fontWeight: '700', fontSize: 15 },
})

export default SupplierDetail
