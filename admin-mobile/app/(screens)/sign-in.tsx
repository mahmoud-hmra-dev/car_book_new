import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import validator from 'validator'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import { useAuth } from '@/context/AuthContext'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'

const SignIn = () => {
  const router = useRouter()
  const { refresh } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [stayConnected, setStayConnected] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    try {
      if (!email || !validator.isEmail(email)) {
        setEmailError(true)
        return
      }
      setEmailError(false)

      if (!password) {
        setPasswordError(true)
        return
      }
      setPasswordError(false)

      setLoading(true)
      setError('')

      const result = await UserService.signin({
        email,
        password,
        stayConnected,
        mobile: true,
      })

      if (result.status === 200) {
        if (result.data.blacklisted) {
          setError(i18n.t('IS_BLACKLISTED'))
          await UserService.signout(false)
        } else {
          await refresh()
          router.replace('/')
        }
      } else {
        setError(i18n.t('SIGN_IN_ERROR'))
      }
    } catch (err) {
      setError(i18n.t('SIGN_IN_ERROR'))
      helper.error(err, false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('SIGN_IN_TITLE')} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoIcon}>🔒</Text>
              </View>
              <Text style={styles.title}>{i18n.t('SIGN_IN_TITLE')}</Text>
            </View>

            <TextInput
              label={i18n.t('EMAIL')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={emailError}
              errorMessage={i18n.t('EMAIL_NOT_VALID')}
            />

            <TextInput
              label={i18n.t('PASSWORD')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={passwordError}
              errorMessage={i18n.t('REQUIRED')}
            />

            <Pressable
              style={styles.stayConnected}
              onPress={() => setStayConnected(!stayConnected)}
            >
              <View style={[styles.checkbox, stayConnected && styles.checkboxChecked]}>
                {stayConnected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.stayConnectedText}>{i18n.t('STAY_CONNECTED')}</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={loading ? i18n.t('LOADING') : i18n.t('SIGN_IN')}
              onPress={handleSignIn}
              disabled={loading}
              style={styles.signInButton}
            />

            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={styles.forgotPassword}>{i18n.t('FORGOT_PASSWORD')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ede7f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  stayConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#6B3CE6',
    borderColor: '#6B3CE6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stayConnectedText: {
    color: '#666',
    fontSize: 14,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  signInButton: {
    marginBottom: 16,
  },
  forgotPassword: {
    color: '#6B3CE6',
    fontSize: 14,
    textAlign: 'center',
  },
})

export default SignIn
