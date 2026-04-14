import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { Text, TextInput } from 'react-native-paper'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as TraccarService from '@/services/TraccarService'
import { colors, spacing, typography } from '@/theme'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

type Trigger = 'geofenceEnter' | 'geofenceExit' | 'both'

const TRIGGERS: { value: Trigger, labelKey: string }[] = [
  { value: 'geofenceEnter', labelKey: 'TRIGGER_ON_ENTER' },
  { value: 'geofenceExit', labelKey: 'TRIGGER_ON_EXIT' },
  { value: 'both', labelKey: 'TRIGGER_BOTH' },
]

const AutoCommandScreen = () => {
  const router = useRouter()
  const { carId, geofenceId, geofenceName } = useLocalSearchParams<{
    carId: string
    geofenceId: string
    geofenceName: string
  }>()

  const gfIdNum = Number(geofenceId)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [trigger, setTrigger] = useState<Trigger>('geofenceEnter')
  const [commandType, setCommandType] = useState('')

  const load = useCallback(async () => {
    if (!gfIdNum) return
    setLoading(true)
    try {
      const existing = await TraccarService.getAutoCommandByGeofence(gfIdNum)
      if (existing && existing._id) {
        setExistingId(String(existing._id))
        if (existing.triggerEvent) setTrigger(existing.triggerEvent)
        if (existing.commandType) setCommandType(existing.commandType)
      }
    } catch (err) {
      console.error('Failed to load auto-command:', err)
    } finally {
      setLoading(false)
    }
  }, [gfIdNum])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!carId || !gfIdNum) return
    if (!commandType.trim()) {
      toastHelper.error(undefined, i18n.t('COMMAND_TYPE'))
      return
    }
    setSaving(true)
    try {
      const result = await TraccarService.createAutoCommand({
        geofenceId: gfIdNum,
        carId,
        triggerEvent: trigger,
        commandType: commandType.trim(),
        enabled: true,
      })
      if (result && result._id) setExistingId(String(result._id))
      toastHelper.success(i18n.t('AUTO_COMMAND_SAVED'))
      router.back()
    } catch {
      toastHelper.error()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!existingId) return
    Alert.alert(i18n.t('DELETE'), i18n.t('AUTO_COMMAND_TITLE'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await TraccarService.deleteAutoCommand(existingId)
            toastHelper.success()
            router.back()
          } catch {
            toastHelper.error()
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('AUTO_COMMAND') }} />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxxl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="flash" size={28} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{i18n.t('AUTO_COMMAND_TITLE')}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{geofenceName || ''}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{i18n.t('AUTO_COMMAND_TITLE')}</Text>
            <View style={styles.triggerRow}>
              {TRIGGERS.map((t) => {
                const selected = trigger === t.value
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setTrigger(t.value)}
                    style={[styles.triggerBtn, selected && styles.triggerBtnSelected]}
                  >
                    <Text style={[styles.triggerText, selected && styles.triggerTextSelected]}>
                      {i18n.t(t.labelKey)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{i18n.t('COMMAND_TYPE')}</Text>
            <TextInput
              mode="outlined"
              value={commandType}
              onChangeText={setCommandType}
              placeholder="engineStop"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={20} color={colors.white} />
                <Text style={styles.saveBtnText}>{i18n.t('SAVE')}</Text>
              </>
            )}
          </TouchableOpacity>

          {existingId && (
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.btnDisabled]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
                  <Text style={styles.deleteBtnText}>{i18n.t('DELETE')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  subtitle: { fontSize: typography.sizes.small, color: colors.textSecondary, marginTop: spacing.xxs },
  section: { gap: spacing.md },
  sectionLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  triggerRow: { flexDirection: 'row', gap: spacing.sm },
  triggerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  triggerBtnSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  triggerText: { fontSize: typography.sizes.small, color: colors.textSecondary },
  triggerTextSelected: { color: colors.primary, fontWeight: typography.weights.semibold },
  input: { backgroundColor: colors.surface },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
  },
  saveBtnText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { color: colors.danger, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  btnDisabled: { opacity: 0.6 },
})

export default AutoCommandScreen
