import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as CountryService from '@/services/CountryService'
import * as helper from '@/utils/helper'
import * as env from '@/config/env.config'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Backdrop from '@/components/Backdrop'
import Indicator from '@/components/Indicator'

const UpdateCountry = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [country, setCountry] = useState<bookcarsTypes.Country | null>(null)
  const [namesByLang, setNamesByLang] = useState<Record<string, string>>({})

  useEffect(() => {
    const init = async () => {
      try {
        if (id) {
          const _country = await CountryService.getCountry(id, language)
          setCountry(_country)

          const names: Record<string, string> = {}
          if (_country.values) {
            for (const v of _country.values) {
              names[v.language] = v.value || ''
            }
          }
          setNamesByLang(names)
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, language])

  const handleSave = async () => {
    try {
      if (!country?._id) {
        return
      }

      const names = env.LANGUAGES
        .map((lang) => ({ language: lang.code, name: namesByLang[lang.code] || '' }))
        .filter((n) => n.name.trim())

      if (names.length === 0) {
        return
      }

      setSaving(true)

      const status = await CountryService.updateCountry(country._id, { names })
      if (status === 200) {
        helper.toast(i18n.t('COUNTRY_UPDATED'))
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

  const handleNameChange = (code: string, value: string) => {
    setNamesByLang((prev) => ({ ...prev, [code]: value }))
  }

  if (loading) {
    return <Indicator />
  }

  if (!country) {
    return (
      <View style={styles.container}>
        <Header title={i18n.t('UPDATE_COUNTRY')} loggedIn reload />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#999' }}>{i18n.t('NO_RESULTS')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('UPDATE_COUNTRY')} loggedIn reload />
      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('NAMES')}</Text>

          {env.LANGUAGES.map((lang) => (
            <TextInput
              key={lang.code}
              label={`${i18n.t('NAME')} (${lang.label})`}
              value={namesByLang[lang.code] || ''}
              onChangeText={(text: string) => handleNameChange(lang.code, text)}
            />
          ))}

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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
})

export default UpdateCountry
