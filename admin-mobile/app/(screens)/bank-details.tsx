import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'

import i18n from '@/lang/i18n'
import * as BankDetailsService from '@/services/BankDetailsService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Switch from '@/components/Switch'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'

const BankDetails = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accountHolder, setAccountHolder] = useState('')
  const [bankName, setBankName] = useState('')
  const [iban, setIban] = useState('')
  const [swiftBic, setSwiftBic] = useState('')
  const [showBankDetailsPage, setShowBankDetailsPage] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const details = await BankDetailsService.getBankDetails()
        if (details) {
          setAccountHolder(details.accountHolder || '')
          setBankName(details.bankName || '')
          setIban(details.iban || '')
          setSwiftBic(details.swiftBic || '')
          setShowBankDetailsPage(details.showBankDetailsPage || false)
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
      setSaving(true)
      const status = await BankDetailsService.upsertBankDetails({
        accountHolder,
        bankName,
        iban,
        swiftBic,
        showBankDetailsPage,
      })

      if (status === 200) {
        helper.toast(i18n.t('BANK_DETAILS_UPDATED'))
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Indicator />

  return (
    <View style={styles.container}>
      <Header title={i18n.t('BANK_DETAILS')} loggedIn reload />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formContainer}>
          <TextInput
            label={i18n.t('ACCOUNT_HOLDER')}
            value={accountHolder}
            onChangeText={setAccountHolder}
          />
          <TextInput
            label={i18n.t('BANK_NAME')}
            value={bankName}
            onChangeText={setBankName}
          />
          <TextInput
            label={i18n.t('IBAN')}
            value={iban}
            onChangeText={setIban}
          />
          <TextInput
            label={i18n.t('SWIFT_BIC')}
            value={swiftBic}
            onChangeText={setSwiftBic}
          />

          <Switch
            label={i18n.t('SHOW_BANK_DETAILS_PAGE')}
            value={showBankDetailsPage}
            onValueChange={setShowBankDetailsPage}
          />

          <Button
            label={saving ? i18n.t('LOADING') : i18n.t('SAVE')}
            onPress={handleSave}
            disabled={saving}
            style={{ marginTop: 8 }}
          />
        </View>
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
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
})

export default BankDetails
