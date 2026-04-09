import { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity } from 'react-native'
import { Text, FAB, TextInput, Button, Portal, Modal } from 'react-native-paper'
import { Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

const MaintenanceScreen = () => {
  const [records, setRecords] = useState<bookcarsTypes.TraccarMaintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<bookcarsTypes.TraccarMaintenance | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('totalDistance')
  const [formStart, setFormStart] = useState('0')
  const [formPeriod, setFormPeriod] = useState('10000')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRecords(await TraccarService.getMaintenance() || []) }
    catch { console.error('Failed to load maintenance') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const data = { name: formName.trim(), type: formType, start: Number(formStart), period: Number(formPeriod) }
      if (editing) { await TraccarService.updateMaintenance(editing.id, data) }
      else { await TraccarService.createMaintenance(data) }
      toastHelper.success(); setShowForm(false); setEditing(null); load()
    } catch { toastHelper.error() }
    finally { setSaving(false) }
  }

  const handleDelete = (record: bookcarsTypes.TraccarMaintenance) => {
    Alert.alert(i18n.t('DELETE_MAINTENANCE'), i18n.t('DELETE_MAINTENANCE_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      { text: i18n.t('DELETE'), style: 'destructive', onPress: async () => {
        try { await TraccarService.deleteMaintenance(record.id); setRecords((p) => p.filter((r) => r.id !== record.id)); toastHelper.success() }
        catch { toastHelper.error() }
      } },
    ])
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('MAINTENANCE') }} />
      <FlatList data={records} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <MaterialCommunityIcons name="wrench" size={24} color={colors.stale} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>{item.type} - Period: {item.period}</Text>
            </View>
            <TouchableOpacity onPress={() => { setEditing(item); setFormName(item.name); setFormType(item.type); setFormStart(String(item.start)); setFormPeriod(String(item.period)); setShowForm(true) }}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="wrench-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{i18n.t('NO_MAINTENANCE')}</Text>
          </View>
        ) : null}
      />
      <FAB icon="plus" style={styles.fab} color={colors.textInverse} onPress={() => { setEditing(null); setFormName(''); setFormType('totalDistance'); setFormStart('0'); setFormPeriod('10000'); setShowForm(true) }} />
      <Portal>
        <Modal visible={showForm} onDismiss={() => setShowForm(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{editing ? i18n.t('EDIT_MAINTENANCE') : i18n.t('ADD_MAINTENANCE')}</Text>
          <TextInput label={i18n.t('MAINTENANCE_NAME')} value={formName} onChangeText={setFormName} mode="outlined" style={styles.input} theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary} />
          <TextInput label={i18n.t('MAINTENANCE_START')} value={formStart} onChangeText={setFormStart} mode="outlined" keyboardType="numeric" style={styles.input} theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary} />
          <TextInput label={i18n.t('MAINTENANCE_PERIOD')} value={formPeriod} onChangeText={setFormPeriod} mode="outlined" keyboardType="numeric" style={styles.input} theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary} />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setShowForm(false)} textColor={colors.textSecondary}>{i18n.t('CANCEL')}</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} buttonColor={colors.primary} textColor={colors.textInverse}>{i18n.t('SAVE')}</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.massive },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  name: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  detail: { fontSize: typography.sizes.small, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: spacing.massive },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
  fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xxl, backgroundColor: colors.primary },
  modal: { backgroundColor: colors.surface, margin: spacing.xl, borderRadius: 16, padding: spacing.xl },
  modalTitle: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  input: { backgroundColor: colors.background, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
})

export default MaintenanceScreen
