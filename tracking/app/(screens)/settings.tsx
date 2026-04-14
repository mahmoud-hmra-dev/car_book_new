import { View, StyleSheet, ScrollView, TouchableOpacity, I18nManager, Alert } from 'react-native'
import { Text, RadioButton } from 'react-native-paper'
import { Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorageLib from '@react-native-async-storage/async-storage'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import * as UserService from '@/services/UserService'
import { colors, spacing, typography } from '@/theme'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

const SettingsScreen = () => {
  const { signOut } = useAuth()
  const { mapType, refreshInterval, language, unitSystem, updateSetting } = useSettings()

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === language) return
    await updateSetting('language', langCode)
    await UserService.setLanguage(langCode)
    i18n.locale = langCode

    const isRTL = langCode === 'ar'
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL)
      I18nManager.forceRTL(isRTL)
      Alert.alert(
        langCode === 'ar' ? 'تغيير اللغة' : 'Language Changed',
        langCode === 'ar' ? 'يجب إعادة تشغيل التطبيق لتطبيق التغييرات' : 'The app needs to restart to apply changes.',
        [
          {
            text: langCode === 'ar' ? 'إعادة التشغيل' : 'Restart',
            onPress: () => {
              // Force reload by clearing state - user must manually restart
            },
          },
        ]
      )
    } else {
      // Same direction, just update locale - force re-render
      toastHelper.success(langCode === 'ar' ? 'تم تغيير اللغة' : 'Language changed')
    }
  }

  const handleClearCache = async () => {
    try {
      await AsyncStorageLib.clear()
      toastHelper.success(i18n.t('CACHE_CLEARED'))
    } catch { toastHelper.error() }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('SETTINGS') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Map Type */}
        <Text style={styles.sectionTitle}>{i18n.t('MAP_TYPE')}</Text>
        <View style={styles.section}>
          {(['standard', 'satellite', 'hybrid'] as const).map((type) => (
            <TouchableOpacity key={type} style={styles.radioRow} onPress={() => updateSetting('mapType', type)}>
              <RadioButton value={type} status={mapType === type ? 'checked' : 'unchecked'} onPress={() => updateSetting('mapType', type)} color={colors.primary} />
              <Text style={styles.radioLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Refresh Interval */}
        <Text style={styles.sectionTitle}>{i18n.t('REFRESH_INTERVAL')}</Text>
        <View style={styles.section}>
          {[15000, 30000, 60000, 120000].map((ms) => (
            <TouchableOpacity key={ms} style={styles.radioRow} onPress={() => updateSetting('refreshInterval', ms)}>
              <RadioButton value={String(ms)} status={refreshInterval === ms ? 'checked' : 'unchecked'} onPress={() => updateSetting('refreshInterval', ms)} color={colors.primary} />
              <Text style={styles.radioLabel}>{ms / 1000}s</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Language */}
        <Text style={styles.sectionTitle}>{i18n.t('LANGUAGE')}</Text>
        <View style={styles.section}>
          {[{ code: 'en', label: 'English' }, { code: 'ar', label: 'العربية' }].map((lang) => (
            <TouchableOpacity key={lang.code} style={styles.radioRow} onPress={() => handleLanguageChange(lang.code)}>
              <RadioButton value={lang.code} status={language === lang.code ? 'checked' : 'unchecked'} onPress={() => handleLanguageChange(lang.code)} color={colors.primary} />
              <Text style={styles.radioLabel}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Unit System */}
        <Text style={styles.sectionTitle}>{i18n.t('UNIT_SYSTEM')}</Text>
        <View style={styles.section}>
          {([
            { value: 'metric', label: `${i18n.t('METRIC')} (km/h)` },
            { value: 'imperial', label: `${i18n.t('IMPERIAL')} (mph)` },
          ] as const).map((item) => (
            <TouchableOpacity key={item.value} style={styles.radioRow} onPress={() => updateSetting('unitSystem', item.value)}>
              <RadioButton value={item.value} status={unitSystem === item.value ? 'checked' : 'unchecked'} onPress={() => updateSetting('unitSystem', item.value)} color={colors.primary} />
              <Text style={styles.radioLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={[styles.section, { marginTop: spacing.xl }]}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <MaterialCommunityIcons name="cached" size={22} color={colors.textSecondary} />
            <Text style={styles.actionLabel}>{i18n.t('CLEAR_CACHE')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={signOut}>
            <MaterialCommunityIcons name="logout" size={22} color={colors.danger} />
            <Text style={[styles.actionLabel, { color: colors.danger }]}>{i18n.t('SIGN_OUT')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>{i18n.t('VERSION')} 1.0.0</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.huge },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.lg },
  section: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  radioRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  radioLabel: { color: colors.textPrimary, fontSize: typography.sizes.body, marginLeft: spacing.sm },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  actionLabel: { color: colors.textPrimary, fontSize: typography.sizes.body },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: typography.sizes.caption, marginTop: spacing.xxl },
})

export default SettingsScreen
