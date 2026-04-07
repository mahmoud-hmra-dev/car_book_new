import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'

const UpdateUser = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        if (id) {
          const user = await UserService.getUser(id)
          setFullName(user.fullName || '')
          setPhone(user.phone || '')
          setBio(user.bio || '')
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  const handleSave = async () => {
    try {
      if (!id) {
        return
      }
      setSaving(true)
      const status = await UserService.updateUser({
        _id: id,
        fullName,
        phone,
        bio,
        location: '',
      })
      if (status === 200) {
        helper.toast(i18n.t('USER_UPDATED'))
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Indicator />
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('UPDATE_USER')} loggedIn reload />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <TextInput label={i18n.t('FULL_NAME')} value={fullName} onChangeText={setFullName} />
          <TextInput label={i18n.t('PHONE')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput
            label={i18n.t('BIO')}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />
          <Button
            label={saving ? i18n.t('LOADING') : i18n.t('SAVE')}
            onPress={handleSave}
            disabled={saving}
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
})

export default UpdateUser
