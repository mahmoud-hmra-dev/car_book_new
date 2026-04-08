import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Platform,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'
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

const userTypes = [
  { value: bookcarsTypes.RecordType.Admin, label: i18n.t('RECORD_TYPE_ADMIN') },
  { value: bookcarsTypes.RecordType.Supplier, label: i18n.t('RECORD_TYPE_SUPPLIER') },
  { value: bookcarsTypes.RecordType.User, label: i18n.t('RECORD_TYPE_USER') },
]

const CreateUser = () => {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [type, setType] = useState<string>(bookcarsTypes.RecordType.User)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [locationText, setLocationText] = useState('')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Supplier-specific fields
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

  const isSupplier = type === bookcarsTypes.RecordType.Supplier
  const isUser = type === bookcarsTypes.RecordType.User

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

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
    if (selectedDate) {
      setBirthDate(selectedDate)
      if (Platform.OS === 'ios') {
        setShowDatePicker(false)
      }
    }
  }

  const formatDate = (date: Date) => date.toLocaleDateString()

  const validate = async (): Promise<boolean> => {
    let valid = true

    if (!fullName.trim()) {
      setFullNameError(true)
      setFullNameErrorMsg(i18n.t('REQUIRED'))
      valid = false
    } else if (isSupplier) {
      const status = await SupplierService.validateSupplier({ fullName: fullName.trim() })
      if (status !== 200) {
        setFullNameError(true)
        setFullNameErrorMsg(i18n.t('INVALID_SUPPLIER_NAME'))
        valid = false
      } else {
        setFullNameError(false)
        setFullNameErrorMsg('')
      }
    } else {
      setFullNameError(false)
      setFullNameErrorMsg('')
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

    if (isSupplier && !avatarUri) {
      Alert.alert(i18n.t('ERROR'), i18n.t('IMAGE_REQUIRED'))
      valid = false
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
        type,
        avatar,
        birthDate: isUser && birthDate ? birthDate : undefined,
      }

      if (isSupplier) {
        data.payLater = payLater
        data.licenseRequired = licenseRequired
        data.supplierCarLimit = supplierCarLimit ? Number(supplierCarLimit) : undefined
        data.minimumRentalDays = minimumRentalDays ? Number(minimumRentalDays) : undefined
        data.priceChangeRate = priceChangeRate ? Number(priceChangeRate) : undefined
        data.notifyAdminOnNewCar = notifyAdminOnNewCar
      }

      const status = await UserService.createUser(data)
      if (status === 200) {
        helper.toast(i18n.t('USER_CREATED'))
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
      <Header title={i18n.t('CREATE_USER')} loggedIn reload />
      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type selector */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('TYPE')}</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.chipWrap}>
            {userTypes.map((ut) => (
              <Pressable
                key={ut.value}
                style={[styles.chip, type === ut.value && styles.chipActive]}
                onPress={() => setType(ut.value)}
              >
                <Text style={[styles.chipText, type === ut.value && styles.chipTextActive]}>{ut.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

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

          {isSupplier && (
            <Text style={styles.hint}>
              <MaterialIcons name="info-outline" size={13} color="#999" />
              {' '}{i18n.t('RECOMMENDED_IMAGE_SIZE')}
            </Text>
          )}

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

          {/* Birth date - only for User type */}
          {isUser && (
            <View style={styles.dateSection}>
              <Text style={styles.fieldLabel}>{i18n.t('BIRTH_DATE')}</Text>
              <Pressable style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.dateText, !birthDate && styles.datePlaceholder]}>
                  {birthDate ? formatDate(birthDate) : i18n.t('BIRTH_DATE')}
                </Text>
                <MaterialIcons name="calendar-today" size={18} color="#999" />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
          )}
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

        {/* Supplier Settings - only for Supplier type */}
        {isSupplier && (
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
        )}

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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipActive: {
    borderColor: '#6B3CE6',
    backgroundColor: '#6B3CE6',
  },
  chipText: {
    color: '#666',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  dateSection: {
    marginBottom: 16,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
  },
  dateText: {
    fontSize: 15,
    color: '#333',
  },
  datePlaceholder: {
    color: '#999',
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

export default CreateUser
