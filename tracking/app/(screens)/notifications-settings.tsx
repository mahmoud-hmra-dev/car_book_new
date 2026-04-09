import { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { Text } from 'react-native-paper'
import { Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '@/utils/tracking'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

const NotificationsSettingsScreen = () => {
  const [notifications, setNotifications] = useState<bookcarsTypes.TraccarNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setNotifications(await TraccarService.getNotifications() || []) }
    catch { console.error('Failed to load notifications') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (n: bookcarsTypes.TraccarNotification) => {
    Alert.alert(i18n.t('DELETE'), `Delete ${n.type} notification rule?`, [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      { text: i18n.t('DELETE'), style: 'destructive', onPress: async () => {
        try { await TraccarService.deleteNotification(n.id); setNotifications((p) => p.filter((x) => x.id !== n.id)); toastHelper.success() }
        catch { toastHelper.error() }
      } },
    ])
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('NOTIFICATION_SETTINGS') }} />
      <FlatList data={notifications} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => {
          const typeColor = EVENT_TYPE_COLORS[item.type] || colors.textSecondary
          return (
            <View style={styles.card}>
              <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.typeName}>{EVENT_TYPE_LABELS[item.type] || item.type}</Text>
                <Text style={styles.notificators}>{item.notificators || 'web'}</Text>
              </View>
              <View style={styles.badges}>
                {item.always && <Text style={styles.alwaysBadge}>{i18n.t('ALWAYS')}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-off" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{i18n.t('NO_ALERT_RULES')}</Text>
          </View>
        ) : null}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.massive },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  typeIndicator: { width: 4, height: 36, borderRadius: 2 },
  typeName: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  notificators: { fontSize: typography.sizes.small, color: colors.textSecondary, marginTop: spacing.xxs },
  badges: { flexDirection: 'row', gap: spacing.xs },
  alwaysBadge: { fontSize: typography.sizes.caption, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: 4 },
  empty: { alignItems: 'center', paddingTop: spacing.massive },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
})

export default NotificationsSettingsScreen
