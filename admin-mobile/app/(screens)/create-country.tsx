import React, { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

import i18n from '@/lang/i18n'
import * as CountryService from '@/services/CountryService'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'

const CreateCountry = () => {
  const router = useRouter()
  const { language } = useAuth()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    try {
      if (!name) {
        return
      }
      setSaving(true)
      const status = await CountryService.createCountry({
        names: [{ language, name }],
      })
      if (status === 200) {
        helper.toast(i18n.t('COUNTRY_CREATED'))
        router.back()
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('CREATE_COUNTRY')} loggedIn reload />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <TextInput label={i18n.t('NAME')} value={name} onChangeText={setName} />
          <Button label={i18n.t('CREATE')} onPress={handleCreate} disabled={saving} style={{ marginTop: 12 }} />
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

export default CreateCountry
