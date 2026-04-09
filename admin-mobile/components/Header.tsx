import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Avatar, Badge } from 'react-native-paper'
import * as bookcarsHelper from ':bookcars-helper'

import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import { useGlobalContext, GlobalContextType } from '@/context/GlobalContext'
import * as NotificationService from '@/services/NotificationService'
import { useDrawer } from '@/context/DrawerContext'

interface HeaderProps {
  title?: string
  hideTitle?: boolean
  loggedIn?: boolean
  reload?: boolean
  _avatar?: string | null
}

const Header = ({
  title,
  hideTitle,
  loggedIn,
  reload,
  _avatar
}: HeaderProps) => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { toggle } = useDrawer()

  const { notificationCount, setNotificationCount } = useGlobalContext() as GlobalContextType
  const [avatar, setAvatar] = useState<string | null | undefined>(null)

  useEffect(() => {
    const init = async () => {
      const currentUser = await UserService.getCurrentUser()
      if (currentUser && currentUser._id) {
        const user = await UserService.getUser(currentUser._id)

        if (user.avatar) {
          setAvatar((user.avatar.startsWith('https://') || user.avatar.startsWith('http://'))
            ? user.avatar
            : bookcarsHelper.joinURL(env.CDN_USERS, user.avatar))
        } else {
          setAvatar('')
        }

        const notificationCounter = await NotificationService.getNotificationCounter(currentUser._id)
        setNotificationCount(notificationCounter.count)
      }
    }

    if (reload || params.d) {
      init()
    }
  }, [reload, params.d, setNotificationCount])

  useEffect(() => {
    setAvatar(_avatar)
  }, [_avatar])

  return (
    <View style={styles.container}>
      <Pressable hitSlop={15} style={styles.menu} onPress={toggle}>
        <MaterialIcons name="menu" size={24} color="#fff" />
      </Pressable>

      {!hideTitle && (
        <View>
          <Text style={styles.text}>{title}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {loggedIn && (
          <>
            <Pressable style={styles.notifications} onPress={() => router.push('/notifications')}>
              {notificationCount > 0 && (
                <Badge style={styles.badge} size={18}>
                  {notificationCount}
                </Badge>
              )}
              <MaterialIcons name="notifications" size={24} color="#fff" style={styles.badgeIcon} />
            </Pressable>

            <Pressable style={styles.avatar} onPress={() => router.push('/settings')}>
              {avatar
                ? <Avatar.Image size={24} source={{ uri: avatar }} />
                : <MaterialIcons name="account-circle" size={24} color="#fff" />
              }
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#6B3CE6',
    zIndex: 40,
    elevation: 40,
    height: 52,
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  menu: {
    padding: 5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifications: {
    paddingVertical: 5,
    paddingEnd: 10,
    paddingStart: 5,
  },
  avatar: {
    marginStart: 2,
    padding: 5,
  },
  badge: {
    backgroundColor: '#e98003',
    color: '#ffffff',
    position: 'absolute',
    top: -2,
    right: 2,
    zIndex: 2,
  },
  badgeIcon: {
    zIndex: 1,
  },
})

export default Header
