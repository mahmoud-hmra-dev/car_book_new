import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import i18n from '@/lang/i18n'
import * as SupplierService from '@/services/SupplierService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'

const UpdateSupplier = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        if (id) {
          const supplier = await SupplierService.getSupplier(id)
          setFullName(supplier.fullName || '')
          setPhone(supplier.phone || '')
          setBio(supplier.bio || '')
          setLocation(supplier.location || '')
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
      const status = await SupplierService.updateSupplier({
        _id: id,
        fullName,
        phone,
        bio,
        location,
        payLater: false,
        licenseRequired: true,
      })
      if (status === 200) {
        helper.toast(i18n.t('SUPPLIER_UPDATED'))
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
      <Header title={i18n.t('UPDATE_SUPPLIER')} loggedIn reload />
      <ScrollView contentContainerStyle={styles.content}>
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
  content: { padding: 16 },
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

export default UpdateSupplier
