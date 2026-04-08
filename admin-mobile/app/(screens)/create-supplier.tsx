import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Switch from '@/components/Switch'
import Header from '@/components/Header'
import Backdrop from '@/components/Backdrop'

const CreateSupplier = () => {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [locationText, setLocationText] = useState('')
  const [bio, setBio] = useState('')
  const [payLater, setPayLater] = useState(false)
  const [licenseRequired, setLicenseRequired] = useState(false)
  const [supplierCarLimit, setSupplierCarLimit] = useState('')
  const [minimumRentalDays, setMinimumRentalDays] = useState('')
  const [priceChangeRate, setPriceChangeRate] = useState('')
  const [notifyAdminOnNewCar, setNotifyAdminOnNewCar] = useState(false)

  const [fullNameError, setFullNameError] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [fullNameErrorMsg, setFullNameErrorMsg] = useState('')
  const [emailErrorMsg, setEmailErrorMsg] = useState('')

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(i18n.t('ERROR'), i18n.t('CAMERA_PERMISSION'))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const removeImage = () => {
    setAvatarUri(null)
  }

  const validate = async (): Promise<boolean> => {
    let valid = true

    if (!fullName.trim()) {
      setFullNameError(true)
      setFullNameErrorMsg(i18n.t('REQUIRED'))
      valid = false
    } else {
      const status = await SupplierService.validateSupplier({ fullName: fullName.trim() })
      if (status !== 200) {
        setFullNameError(true)
        setFullNameErrorMsg(i18n.t('INVALID_SUPPLIER_NAME'))
        valid = false
      } else {
        setFullNameError(false)
        setFullNameErrorMsg('')
      }
    }

    if (!email.trim()) {
      setEmailError(true)
      setEmailErrorMsg(i18n.t('REQUIRED'))
      valid = false
    } else {
      const status = await UserService.validateEmail({ email: email.trim() })
      if (status !== 200) {
        setEmailError(true)
        setEmailErrorMsg(i18n.t('EMAIL_ALREADY_REGISTERED'))
        valid = false
      } else {
        setEmailError(false)
        setEmailErrorMsg('')
      }
    }

    return valid
  }

  const handleCreate = async () => {
    const valid = await validate()
    if (!valid) {
      return
    }

    setSaving(true)
    try {
      let avatar: string | undefined
      if (avatarUri) {
        const fileName = avatarUri.split('/').pop() || 'avatar.jpg'
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg'
        const status = await UserService.updateAvatar('temp', {
          uri: avatarUri,
          name: fileName,
          type: fileType,
        })
        if (status === 200) {
          avatar = fileName
        }
      }

      const data: bookcarsTypes.CreateUserPayload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone,
        location: locationText,
        bio,
        type: bookcarsTypes.RecordType.Supplier,
        avatar,
        payLater,
        licenseRequired,
        supplierCarLimit: supplierCarLimit ? Number(supplierCarLimit) : undefined,
        minimumRentalDays: minimumRentalDays ? Number(minimumRentalDays) : undefined,
        priceChangeRate: priceChangeRate ? Number(priceChangeRate) : undefined,
        notifyAdminOnNewCar,
      }
      const status = await UserService.createUser(data)
      if (status === 200) {
        helper.toast(i18n.t('SUPPLIER_CREATED'))
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
      <Header title={i18n.t('CREATE_SUPPLIER')} loggedIn reload />
      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Avatar & Identity */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('AVATAR_AND_IDENTITY')}</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Pressable onPress={pickImage}>
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              </Pressable>
            ) : (
              <Pressable style={styles.avatarPlaceholder} onPress={pickImage}>
                <MaterialIcons name="add-a-photo" size={32} color="#999" />
              </Pressable>
            )}
            <View style={styles.avatarActions}>
              <Pressable style={styles.avatarButton} onPress={pickImage}>
                <MaterialIcons name="photo-library" size={18} color="#6B3CE6" />
                <Text style={styles.avatarButtonText}>
                  {avatarUri ? i18n.t('CHANGE_AVATAR') : i18n.t('SELECT_AVATAR')}
                </Text>
              </Pressable>
              {avatarUri && (
                <Pressable style={styles.avatarButton} onPress={removeImage}>
                  <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                  <Text style={[styles.avatarButtonText, { color: '#EF4444' }]}>{i18n.t('REMOVE_AVATAR')}</Text>
                </Pressable>
              )}
            </View>
          </View>

          <Text style={styles.hint}>
            <MaterialIcons name="info-outline" size={13} color="#999" />
            {' '}{i18n.t('RECOMMENDED_IMAGE_SIZE')}
          </Text>

          <TextInput
            label={`${i18n.t('FULL_NAME')} *`}
            value={fullName}
            onChangeText={(v) => {
              setFullName(v)
              if (fullNameError) {
                setFullNameError(false)
                setFullNameErrorMsg('')
              }
            }}
            error={fullNameError}
            errorMessage={fullNameErrorMsg}
          />
          <TextInput
            label={`${i18n.t('EMAIL')} *`}
            value={email}
            onChangeText={(v) => {
              setEmail(v)
              if (emailError) {
                setEmailError(false)
                setEmailErrorMsg('')
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            errorMessage={emailErrorMsg}
          />
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('SUPPLIER_SETTINGS')}</Text>
          <View style={styles.sectionDivider} />

          <Switch label={i18n.t('PAY_LATER')} value={payLater} onValueChange={setPayLater} />
          <Switch label={i18n.t('LICENSE_REQUIRED')} value={licenseRequired} onValueChange={setLicenseRequired} />
          <Switch label={i18n.t('NOTIFY_ADMIN_ON_NEW_CAR')} value={notifyAdminOnNewCar} onValueChange={setNotifyAdminOnNewCar} />

          <Text style={styles.hint}>
            <MaterialIcons name="info-outline" size={13} color="#999" />
            {' '}{i18n.t('OPTIONAL')}
          </Text>

          <TextInput
            label={i18n.t('SUPPLIER_CAR_LIMIT')}
            value={supplierCarLimit}
            onChangeText={setSupplierCarLimit}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('MIN_RENTAL_DAYS')}
            value={minimumRentalDays}
            onChangeText={setMinimumRentalDays}
            keyboardType="numeric"
          />
          <TextInput
            label={i18n.t('PRICE_CHANGE_RATE')}
            value={priceChangeRate}
            onChangeText={setPriceChangeRate}
            keyboardType="numeric"
          />
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('CONTACT_INFORMATION')}</Text>
          <View style={styles.sectionDivider} />

          <TextInput label={i18n.t('PHONE')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput label={i18n.t('LOCATION')} value={locationText} onChangeText={setLocationText} />
          <TextInput
            label={i18n.t('BIO')}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <Button
            label={i18n.t('CANCEL')}
            variant="secondary"
            onPress={() => router.back()}
            style={styles.actionButton}
          />
          <Button
            label={i18n.t('CREATE')}
            onPress={handleCreate}
            disabled={saving}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  sectionDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  avatarButtonText: {
    fontSize: 14,
    color: '#6B3CE6',
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
  },
})

export default CreateSupplier
