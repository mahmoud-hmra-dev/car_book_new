import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as LocationService from '@/services/LocationService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import Search from '@/components/Search'
import EmptyList from '@/components/EmptyList'
import Indicator from '@/components/Indicator'

const Locations = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [locations, setLocations] = useState<bookcarsTypes.Location[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')

  const fetchLocations = useCallback(async (_page: number, reset = false) => {
    try {
      const data = await LocationService.getLocations(_page, env.PAGE_SIZE, language)
      const result = data && data.length > 0 ? data[0] : null
      if (result && result.resultData) {
        if (reset) {
          setLocations(result.resultData)
        } else {
          setLocations((prev) => [...prev, ...result.resultData])
        }
        setHasMore(result.resultData.length >= env.PAGE_SIZE)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [language])

  useEffect(() => {
    setPage(1)
    setLoading(true)
    fetchLocations(1, true)
  }, [params.d]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchLocations(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchLocations(nextPage)
    }
  }

  const handleDelete = (location: bookcarsTypes.Location) => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_LOCATION_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!location._id) {
              return
            }
            const status = await LocationService.deleteLocation(location._id)
            if (status === 200) {
              setLocations((prev) => prev.filter((l) => l._id !== location._id))
              helper.toast(i18n.t('LOCATION_DELETED'))
            }
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  const renderLocation = ({ item }: { item: bookcarsTypes.Location }) => (
    <Pressable
      style={styles.itemCard}
      onPress={() => router.push({ pathname: '/update-location', params: { id: item._id } })}
    >
      <View style={styles.itemRow}>
        <MaterialIcons name="location-on" size={24} color="#6B3CE6" />
        <Text style={styles.itemName}>{item.name}</Text>
        <Pressable onPress={() => handleDelete(item)} style={{ padding: 4 }}>
          <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
        </Pressable>
      </View>
    </Pressable>
  )

  return (
    <View style={styles.container}>
      <Header title={i18n.t('LOCATIONS')} loggedIn reload />
      <View style={styles.toolbar}>
        <Search value={search} onChangeText={setSearch} onClear={() => setSearch('')} />
        <Pressable style={styles.createButton} onPress={() => router.push('/create-location')}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>{i18n.t('CREATE_LOCATION')}</Text>
        </Pressable>
      </View>
      {loading ? (
        <Indicator />
      ) : (
        <FlatList
          data={locations.filter((l) => !search || l.name?.toLowerCase().includes(search.toLowerCase()))}
          renderItem={renderLocation}
          keyExtractor={(item) => item._id!}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_LOCATION_LIST')} icon="location-off" />}
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
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
})

export default Locations
