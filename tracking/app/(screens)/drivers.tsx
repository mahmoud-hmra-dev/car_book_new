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

const DriversScreen = () => {
  const [drivers, setDrivers] = useState<bookcarsTypes.TraccarDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<bookcarsTypes.TraccarDriver | null>(null)
  const [formName, setFormName] = useState('')
  const [formUniqueId, setFormUniqueId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDrivers(await TraccarService.getDrivers() || []) }
    catch { console.error('Failed to load drivers') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      if (editingDriver) {
        await TraccarService.updateDriver(editingDriver.id, { name: formName.trim(), uniqueId: formUniqueId.trim() })
      } else {
        await TraccarService.createDriver({ name: formName.trim(), uniqueId: formUniqueId.trim() })
      }
      toastHelper.success()
      setShowForm(false); setEditingDriver(null); setFormName(''); setFormUniqueId('')
      load()
    } catch { toastHelper.error() }
    finally { setSaving(false) }
  }

  const handleDelete = (driver: bookcarsTypes.TraccarDriver) => {
    Alert.alert(i18n.t('DELETE_DRIVER'), i18n.t('DELETE_DRIVER_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      { text: i18n.t('DELETE'), style: 'destructive', onPress: async () => {
        try { await TraccarService.deleteDriver(driver.id); setDrivers((p) => p.filter((d) => d.id !== driver.id)); toastHelper.success() }
        catch { toastHelper.error() }
      } },
    ])
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('DRIVERS') }} />
      <FlatList data={drivers} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.uid}>ID: {item.uniqueId}</Text>
            </View>
            <TouchableOpacity onPress={() => { setEditingDriver(item); setFormName(item.name); setFormUniqueId(item.uniqueId); setShowForm(true) }}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-off" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{i18n.t('NO_DRIVERS')}</Text>
          </View>
        ) : null}
      />
      <FAB icon="plus" style={styles.fab} color={colors.textInverse} onPress={() => { setEditingDriver(null); setFormName(''); setFormUniqueId(''); setShowForm(true) }} />
      <Portal>
        <Modal visible={showForm} onDismiss={() => setShowForm(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{editingDriver ? i18n.t('EDIT_DRIVER') : i18n.t('ADD_DRIVER')}</Text>
          <TextInput label={i18n.t('DRIVER_NAME')} value={formName} onChangeText={setFormName} mode="outlined" style={styles.input} theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary} />
          <TextInput label={i18n.t('UNIQUE_ID')} value={formUniqueId} onChangeText={setFormUniqueId} mode="outlined" style={styles.input} theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary} />
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
  uid: { fontSize: typography.sizes.small, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: spacing.massive },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
  fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xxl, backgroundColor: colors.primary },
  modal: { backgroundColor: colors.surface, margin: spacing.xl, borderRadius: 16, padding: spacing.xl },
  modalTitle: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  input: { backgroundColor: colors.background, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
})

export default DriversScreen
