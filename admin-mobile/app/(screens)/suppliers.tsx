import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { Avatar } from 'react-native-paper'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as SupplierService from '@/services/SupplierService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import Header from '@/components/Header'
import Search from '@/components/Search'
import EmptyList from '@/components/EmptyList'
import Indicator from '@/components/Indicator'

const Suppliers = () => {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')

  const fetchSuppliers = useCallback(async (_page: number, reset = false) => {
    try {
      const data = await SupplierService.getSuppliers(_page, env.PAGE_SIZE)
      const result = data && data.length > 0 ? data[0] : null
      if (result && result.resultData) {
        if (reset) {
          setSuppliers(result.resultData)
        } else {
          setSuppliers((prev) => [...prev, ...result.resultData])
        }
        setHasMore(result.resultData.length >= env.PAGE_SIZE)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setLoading(true)
    fetchSuppliers(1, true)
  }, [params.d]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchSuppliers(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchSuppliers(nextPage)
    }
  }

  const handleDelete = (supplier: bookcarsTypes.User) => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_SUPPLIER_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!supplier._id) {
              return
            }
            const status = await SupplierService.deleteSupplier(supplier._id)
            if (status === 200) {
              setSuppliers((prev) => prev.filter((s) => s._id !== supplier._id))
              helper.toast(i18n.t('SUPPLIER_DELETED'))
            }
          } catch (err) {
            helper.error(err)
          }
        },
      },
    ])
  }

  const renderSupplier = ({ item }: { item: bookcarsTypes.User }) => {
    const avatarUrl = item.avatar
      ? (item.avatar.startsWith('http') ? item.avatar : bookcarsHelper.joinURL(env.CDN_USERS, item.avatar))
      : null

    return (
      <Pressable
        style={styles.itemCard}
        onPress={() => router.push({ pathname: '/update-supplier', params: { id: item._id } })}
      >
        <View style={styles.itemRow}>
          {avatarUrl
            ? <Avatar.Image size={40} source={{ uri: avatarUrl }} />
            : <Avatar.Icon size={40} icon="domain" style={{ backgroundColor: '#6B3CE6' }} />}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.fullName}</Text>
            <Text style={styles.itemEmail}>{item.email}</Text>
          </View>
          <Pressable onPress={() => handleDelete(item)} style={{ padding: 4 }}>
            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
          </Pressable>
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('SUPPLIERS')} loggedIn reload />
      <View style={styles.toolbar}>
        <Search value={search} onChangeText={setSearch} onClear={() => setSearch('')} />
      </View>
      {loading ? (
        <Indicator />
      ) : (
        <FlatList
          data={suppliers.filter((s) => !search || s.fullName?.toLowerCase().includes(search.toLowerCase()))}
          renderItem={renderSupplier}
          keyExtractor={(item) => item._id!}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_SUPPLIER_LIST')} icon="business" />}
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
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemEmail: { fontSize: 13, color: '#999', marginTop: 2 },
})

export default Suppliers
