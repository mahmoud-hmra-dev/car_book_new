import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import validator from 'validator'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    try {
      if (!email || !validator.isEmail(email)) {
        setEmailError(true)
        return
      }
      setEmailError(false)
      setLoading(true)

      const status = await UserService.resend(email, true)
      if (status === 200) {
        setSent(true)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('FORGOT_PASSWORD')} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formContainer}>
          {sent ? (
            <Text style={styles.sentMessage}>{i18n.t('RESET_EMAIL_SENT')}</Text>
          ) : (
            <>
              <Text style={styles.description}>{i18n.t('RESET_PASSWORD')}</Text>

              <TextInput
                label={i18n.t('EMAIL')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailError}
              />

              <Button
                label={loading ? i18n.t('LOADING') : i18n.t('RESET')}
                onPress={handleReset}
                disabled={loading}
              />
            </>
          )}
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
    flexGrow: 1,
    justifyContent: 'center',
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
  description: {
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 22,
  },
  sentMessage: {
    color: '#22C55E',
    fontSize: 15,
    textAlign: 'center',
  },
})

export default ForgotPassword
