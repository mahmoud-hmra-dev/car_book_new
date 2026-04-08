import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [selectedTypes, setSelectedTypes] = useState<bookcarsTypes.UserType[]>([])

  const allTypeOptions: { value: bookcarsTypes.UserType | 'ALL'; label: string }[] = [
    { value: 'ALL', label: i18n.t('ALL') },
    { value: bookcarsTypes.UserType.Admin, label: i18n.t('RECORD_TYPE_ADMIN') },
    { value: bookcarsTypes.UserType.Supplier, label: i18n.t('RECORD_TYPE_SUPPLIER') },
    { value: bookcarsTypes.UserType.User, label: i18n.t('RECORD_TYPE_USER') },
  ]

  const fetchUsers = useCallback(async (_page: number, reset = false, userId?: string, types?: bookcarsTypes.UserType[]) => {
    try {
      const uid = userId || currentUserId
      const t = types || selectedTypes
      if (!uid) return

      const data = await UserService.getUsers(
        { user: uid, types: t },
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
      } else if (reset) {
        setUsers([])
        setHasMore(false)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentUserId, selectedTypes])

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await UserService.getCurrentUser()
        if (!currentUser?._id) return

        const _user = await UserService.getUser(currentUser._id)
        const _isAdmin = _user.type === bookcarsTypes.RecordType.Admin
        setIsAdmin(_isAdmin)
        setCurrentUserId(currentUser._id)

        const _types = _isAdmin
          ? [bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User]
          : [bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User]

        setSelectedTypes(_types)
        await fetchUsers(1, true, currentUser._id, _types)
      } catch (err) {
        helper.error(err)
      }
    }

    setPage(1)
    setLoading(true)
    init()
  }, [params.d]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUserId && selectedTypes.length > 0) {
      setPage(1)
      setLoading(true)
      fetchUsers(1, true)
    }
  }, [selectedTypes]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleTypeSelect = (value: bookcarsTypes.UserType | 'ALL') => {
    if (value === 'ALL') {
      const allTypes = isAdmin
        ? [bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User]
        : [bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User]
      setSelectedTypes(allTypes)
    } else {
      setSelectedTypes([value])
    }
  }

  const isAllSelected = () => {
    if (isAdmin) {
      return selectedTypes.length === 3
    }
    return selectedTypes.length === 2
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

  const getTypeBadgeColor = (type?: string) => {
    switch (type) {
      case bookcarsTypes.UserType.Admin:
        return '#EF4444'
      case bookcarsTypes.UserType.Supplier:
        return '#e98003'
      default:
        return '#6B3CE6'
    }
  }

  const renderUser = ({ item }: { item: bookcarsTypes.User }) => {
    const avatarUrl = item.avatar
      ? (item.avatar.startsWith('http') ? item.avatar : bookcarsHelper.joinURL(env.CDN_USERS, item.avatar))
      : null

    return (
      <Pressable
        style={styles.itemCard}
        onPress={() => router.push({ pathname: '/user', params: { id: item._id } })}
      >
        <View style={styles.itemRow}>
          {avatarUrl
            ? <Avatar.Image size={40} source={{ uri: avatarUrl }} />
            : <Avatar.Icon size={40} icon="account" style={{ backgroundColor: '#6B3CE6' }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.fullName}</Text>
            <Text style={styles.itemEmail}>{item.email}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(item.type) + '1A' }]}>
            <Text style={[styles.typeBadgeText, { color: getTypeBadgeColor(item.type) }]}>
              {getTypeBadgeLabel(item.type)}
            </Text>
          </View>
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('USERS')} loggedIn reload />
      <View style={styles.toolbar}>
        <Search value={search} onChangeText={setSearch} onClear={() => setSearch('')} />
        <View style={styles.toolbarRow}>
          <Pressable style={styles.createButton} onPress={() => router.push('/create-user')}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>{i18n.t('CREATE_USER')}</Text>
          </Pressable>
        </View>
        {isAdmin && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {allTypeOptions.map((opt) => {
              const selected = opt.value === 'ALL'
                ? isAllSelected()
                : (selectedTypes.length === 1 && selectedTypes.includes(opt.value as bookcarsTypes.UserType))
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => handleTypeSelect(opt.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        )}
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
  chipScroll: {
    marginBottom: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
})

export default Users
