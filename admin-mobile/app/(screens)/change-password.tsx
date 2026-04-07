import React, { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Header from '@/components/Header'

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPasswordError, setCurrentPasswordError] = useState(false)
  const [newPasswordError, setNewPasswordError] = useState(false)
  const [confirmPasswordError, setConfirmPasswordError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChangePassword = async () => {
    try {
      if (!currentPassword) {
        setCurrentPasswordError(true)
        return
      }
      setCurrentPasswordError(false)

      if (!newPassword || newPassword.length < 6) {
        setNewPasswordError(true)
        return
      }
      setNewPasswordError(false)

      if (newPassword !== confirmPassword) {
        setConfirmPasswordError(true)
        return
      }
      setConfirmPasswordError(false)

      setLoading(true)

      const currentUser = await UserService.getCurrentUser()
      if (!currentUser?._id) return

      const checkStatus = await UserService.checkPassword(currentUser._id, currentPassword)
      if (checkStatus !== 200) {
        setPasswordError(true)
        setLoading(false)
        return
      }
      setPasswordError(false)

      const status = await UserService.changePassword({
        _id: currentUser._id,
        password: currentPassword,
        newPassword,
        strict: true,
      })

      if (status === 200) {
        helper.toast(i18n.t('PASSWORD_UPDATE'))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
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
      <Header title={i18n.t('CHANGE_PASSWORD_TITLE')} loggedIn reload />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formContainer}>
          <TextInput
            label={i18n.t('CURRENT_PASSWORD')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            error={currentPasswordError || passwordError}
            errorMessage={passwordError ? i18n.t('PASSWORD_ERROR') : i18n.t('REQUIRED')}
          />

          <TextInput
            label={i18n.t('NEW_PASSWORD')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            error={newPasswordError}
            errorMessage={i18n.t('PASSWORD_LENGTH_ERROR')}
          />

          <TextInput
            label={i18n.t('CONFIRM_PASSWORD')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={confirmPasswordError}
            errorMessage={i18n.t('PASSWORDS_DONT_MATCH')}
          />

          <Button
            label={loading ? i18n.t('LOADING') : i18n.t('SAVE')}
            onPress={handleChangePassword}
            disabled={loading}
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

export default ChangePassword
