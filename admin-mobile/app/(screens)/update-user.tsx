import React, { useEffect, useState } from 'react'
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
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import Switch from '@/components/Switch'
import Header from '@/components/Header'
import Indicator from '@/components/Indicator'
import Backdrop from '@/components/Backdrop'

const UpdateUser = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User | null>(null)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [avatarChanged, setAvatarChanged] = useState(false)
  const [type, setType] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [locationText, setLocationText] = useState('')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [blacklisted, setBlacklisted] = useState(false)

  // Supplier-specific fields
  const [payLater, setPayLater] = useState(false)
  const [licenseRequired, setLicenseRequired] = useState(false)
  const [supplierCarLimit, setSupplierCarLimit] = useState('')
  const [minimumRentalDays, setMinimumRentalDays] = useState('')
  const [priceChangeRate, setPriceChangeRate] = useState('')
  const [notifyAdminOnNewCar, setNotifyAdminOnNewCar] = useState(false)

  const [fullNameError, setFullNameError] = useState(false)
  const [fullNameErrorMsg, setFullNameErrorMsg] = useState('')

  const isSupplier = type === bookcarsTypes.RecordType.Supplier
  const isUser = type === bookcarsTypes.RecordType.User

  useEffect(() => {
    const init = async () => {
      try {
        if (!id) {
          setLoading(false)
          return
        }
        const u = await UserService.getUser(id)
        if (u) {
          setUser(u)
          setType(u.type || '')
          setFullName(u.fullName || '')
          setEmail(u.email || '')
          setPhone(u.phone || '')
          setLocationText(u.location || '')
          setBio(u.bio || '')
          setBlacklisted(!!u.blacklisted)
          setPayLater(!!u.payLater)
          setLicenseRequired(!!u.licenseRequired)
          setSupplierCarLimit(u.supplierCarLimit?.toString() || '')
          setMinimumRentalDays(u.minimumRentalDays?.toString() || '')
          setPriceChangeRate(u.priceChangeRate?.toString() || '')
          setNotifyAdminOnNewCar(!!u.notifyAdminOnNewCar)

          if (u.birthDate) {
            setBirthDate(new Date(u.birthDate))
          }

          if (u.avatar) {
            const uri = (u.avatar.startsWith('http://') || u.avatar.startsWith('https://'))
              ? u.avatar
              : bookcarsHelper.joinURL(env.CDN_USERS, u.avatar)
            setAvatarUri(uri)
          }
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

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
      setAvatarChanged(true)
    }
  }

  const removeImage = () => {
    setAvatarUri(null)
    setAvatarChanged(true)
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

  const getTypeLabel = (t: string) => {
    switch (t) {
      case bookcarsTypes.RecordType.Admin:
        return i18n.t('RECORD_TYPE_ADMIN')
      case bookcarsTypes.RecordType.Supplier:
        return i18n.t('RECORD_TYPE_SUPPLIER')
      case bookcarsTypes.RecordType.User:
        return i18n.t('RECORD_TYPE_USER')
      default:
        return t
    }
  }

  const validate = async (): Promise<boolean> => {
    let valid = true

    if (!fullName.trim()) {
      setFullNameError(true)
      setFullNameErrorMsg(i18n.t('REQUIRED'))
      valid = false
    } else if (isSupplier && user && user.fullName !== fullName.trim()) {
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

    if (isSupplier && !avatarUri) {
      Alert.alert(i18n.t('ERROR'), i18n.t('IMAGE_REQUIRED'))
      valid = false
    }

    return valid
  }

  const handleSave = async () => {
    const valid = await validate()
    if (!valid || !id) {
      return
    }

    setSaving(true)
    try {
      if (avatarChanged && avatarUri && id) {
        const fileName = avatarUri.split('/').pop() || 'avatar.jpg'
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg'
        await UserService.updateAvatar(id, {
          uri: avatarUri,
          name: fileName,
          type: fileType,
        })
      } else if (avatarChanged && !avatarUri && id) {
        await UserService.deleteAvatar(id)
      }

      const data: bookcarsTypes.UpdateUserPayload = {
        _id: id,
        fullName: fullName.trim(),
        phone,
        location: locationText,
        bio,
        type,
        blacklisted,
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

      const status = await UserService.updateUser(data)
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

  const handleDelete = () => {
    Alert.alert(
      i18n.t('CONFIRM_TITLE'),
      i18n.t('DELETE_USER_CONFIRM'),
      [
        { text: i18n.t('CANCEL'), style: 'cancel' },
        {
          text: i18n.t('DELETE'),
          style: 'destructive',
          onPress: async () => {
            if (!id) {
              return
            }
            setSaving(true)
            try {
              const status = await UserService.deleteUsers([id])
              if (status === 200) {
                helper.toast(i18n.t('USER_DELETED'))
                router.back()
              } else {
                helper.error()
              }
            } catch (err) {
              helper.error(err)
            } finally {
              setSaving(false)
            }
          },
        },
      ],
    )
  }

  if (loading) {
    return <Indicator />
  }

  return (
    <View style={styles.container}>
      <Header title={i18n.t('UPDATE_USER')} loggedIn reload />
      {saving && <Backdrop />}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type display (not editable) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('TYPE')}</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.typeDisplay}>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{getTypeLabel(type)}</Text>
            </View>
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
            label={i18n.t('EMAIL')}
            value={email}
            editable={false}
            style={{ backgroundColor: '#f5f5f5', color: '#999' }}
          />

          <Switch label={i18n.t('BLACKLISTED')} value={blacklisted} onValueChange={setBlacklisted} />

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
            label={i18n.t('DELETE')}
            variant="danger"
            onPress={handleDelete}
            style={styles.actionButton}
          />
          <Button
            label={i18n.t('SAVE')}
            onPress={handleSave}
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
  typeDisplay: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#6B3CE6',
  },
  typeChipText: {
    color: '#fff',
    fontSize: 14,
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

export default UpdateUser
