import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Avatar } from 'react-native-paper'
import * as bookcarsHelper from ':bookcars-helper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import Header from '@/components/Header'
import Search from '@/components/Search'
import EmptyList from '@/components/EmptyList'
import Indicator from '@/components/Indicator'

const Users = () => {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [users, setUsers] = useState<bookcarsTypes.User[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async (_page: number, reset = false) => {
    try {
      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) {
        return
      }

      const data = await UserService.getUsers(
        { user: currentUser._id, types: [bookcarsTypes.UserType.User] },
        _page,
        env.PAGE_SIZE,
      )
      const result = data && data.length > 0 ? data[0] : null
      if (result && result.resultData) {
        if (reset) {
          setUsers(result.resultData)
        } else {
          setUsers((prev) => [...prev, ...result.resultData])
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
    fetchUsers(1, true)
  }, [params.d]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchUsers(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchUsers(nextPage)
    }
  }

  const getTypeBadgeLabel = (type?: string) => {
    switch (type) {
      case bookcarsTypes.UserType.Admin:
        return i18n.t('RECORD_TYPE_ADMIN')
      case bookcarsTypes.UserType.Supplier:
        return i18n.t('RECORD_TYPE_SUPPLIER')
      default:
        return i18n.t('RECORD_TYPE_USER')
    }
  }

  const renderUser = ({ item }: { item: bookcarsTypes.User }) => {
    const avatarUrl = item.avatar
      ? (item.avatar.startsWith('http') ? item.avatar : bookcarsHelper.joinURL(env.CDN_USERS, item.avatar))
      : null

    return (
      <Pressable
        style={styles.itemCard}
        onPress={() => router.push({ pathname: '/update-user', params: { id: item._id } })}
      >
        <View style={styles.itemRow}>
          {avatarUrl
            ? <Avatar.Image size={40} source={{ uri: avatarUrl }} />
            : <Avatar.Icon size={40} icon="account" style={{ backgroundColor: '#6B3CE6' }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.fullName}</Text>
            <Text style={styles.itemEmail}>{item.email}</Text>
          </View>
          <Text style={styles.typeBadge}>{getTypeBadgeLabel(item.type)}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('USERS')} loggedIn reload />
      <View style={styles.toolbar}>
        <Search value={search} onChangeText={setSearch} onClear={() => setSearch('')} />
      </View>
      {loading ? (
        <Indicator />
      ) : (
        <FlatList
          data={users.filter((u) => !search || u.fullName?.toLowerCase().includes(search.toLowerCase()))}
          renderItem={renderUser}
          keyExtractor={(item) => item._id!}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyList message={i18n.t('EMPTY_USER_LIST')} icon="people" />}
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
  itemName: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemEmail: { fontSize: 13, color: '#999', marginTop: 2 },
  typeBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B3CE6',
    backgroundColor: '#ede7f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
})

export default Users
