import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Avatar } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Switch from '@/components/Switch'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'

const Settings = () => {
  const router = useRouter()
  const { loggedIn, refresh } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await UserService.getCurrentUser()
        if (currentUser?._id) {
          const _user = await UserService.getUser(currentUser._id)
          setUser(_user)
          setFullName(_user.fullName || '')
          setPhone(_user.phone || '')
          setBio(_user.bio || '')
          setEnableEmailNotifications(_user.enableEmailNotifications || false)

          if (_user.avatar) {
            setAvatar((_user.avatar.startsWith('http') ? _user.avatar : bookcarsHelper.joinURL(env.CDN_USERS, _user.avatar)))
          }
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const handleSave = async () => {
    try {
      if (!user?._id) return
      setSaving(true)

      const status = await UserService.updateUser({
        _id: user._id,
        fullName,
        phone,
        bio,
        location: user.location || '',
      })

      if (status === 200) {
        helper.toast(i18n.t('SETTINGS_UPDATED'))
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleEmailNotifications = async (value: boolean) => {
    try {
      if (!user?._id) return
      setEnableEmailNotifications(value)

      const status = await UserService.updateEmailNotifications({
        _id: user._id,
        enableEmailNotifications: value,
      })

      if (status !== 200) {
        setEnableEmailNotifications(!value)
        helper.error()
      }
    } catch (err) {
      setEnableEmailNotifications(!value)
      helper.error(err)
    }
  }

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0] && user?._id) {
        const asset = result.assets[0]
        const fileName = helper.getFileName(asset.uri)
        const mimeType = helper.getMimeType(fileName)

        const status = await UserService.updateAvatar(user._id, {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        })

        if (status === 200) {
          setAvatar(asset.uri)
        } else {
          helper.error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleDeleteAvatar = () => {
    Alert.alert(i18n.t('CONFIRM_TITLE'), i18n.t('DELETE_AVATAR'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (!user?._id) return
            const status = await UserService.deleteAvatar(user._id)
            if (status === 200) {
              setAvatar(null)
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

  if (loading) return <Indicator />

  if (!loggedIn) {
    router.replace('/sign-in')
    return null
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('SETTINGS')} loggedIn reload _avatar={avatar} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar}>
            {avatar ? (
              <Avatar.Image size={80} source={{ uri: avatar }} />
            ) : (
              <Avatar.Icon size={80} icon="account" style={{ backgroundColor: '#6B3CE6' }} />
            )}
          </Pressable>
          <View style={styles.avatarActions}>
            <Pressable style={styles.avatarButton} onPress={handlePickAvatar}>
              <MaterialIcons name="photo-camera" size={20} color="#6B3CE6" />
              <Text style={styles.avatarButtonText}>{i18n.t('UPLOAD_IMAGE')}</Text>
            </Pressable>
            {avatar && (
              <Pressable style={styles.avatarButton} onPress={handleDeleteAvatar}>
                <MaterialIcons name="delete" size={20} color="#EF4444" />
                <Text style={[styles.avatarButtonText, { color: '#EF4444' }]}>{i18n.t('DELETE_IMAGE')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Profile Form */}
        <View style={styles.formContainer}>
          <TextInput
            label={i18n.t('FULL_NAME')}
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            label={i18n.t('PHONE')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            label={i18n.t('BIO')}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />

          <Switch
            label={i18n.t('ENABLE_EMAIL_NOTIFICATIONS')}
            value={enableEmailNotifications}
            onValueChange={handleEmailNotifications}
          />

          <Button
            label={saving ? i18n.t('LOADING') : i18n.t('SAVE')}
            onPress={handleSave}
            disabled={saving}
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Change Password Link */}
        <Pressable style={styles.changePasswordLink} onPress={() => router.push('/change-password')}>
          <MaterialIcons name="lock" size={20} color="#6B3CE6" />
          <Text style={styles.changePasswordText}>{i18n.t('CHANGE_PASSWORD')}</Text>
          <MaterialIcons name="chevron-right" size={20} color="#999" />
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 20,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarButtonText: {
    color: '#6B3CE6',
    fontWeight: '600',
    fontSize: 13,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 16,
  },
  changePasswordLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  changePasswordText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
})

export default Settings
