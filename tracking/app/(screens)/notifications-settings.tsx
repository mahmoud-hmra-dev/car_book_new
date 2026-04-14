import { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { Text, TextInput } from 'react-native-paper'
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
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramTesting, setTelegramTesting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setNotifications(await TraccarService.getNotifications() || []) }
    catch { console.error('Failed to load notifications') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleTestTelegram = async () => {
    if (!telegramChatId.trim()) return
    setTelegramTesting(true)
    try {
      await TraccarService.testTelegram(telegramChatId.trim())
      toastHelper.success(i18n.t('TELEGRAM_TEST_SENT'))
    } catch {
      toastHelper.error()
    } finally {
      setTelegramTesting(false)
    }
  }

  const TelegramSection = (
    <View style={styles.telegramSection}>
      <View style={styles.telegramHeader}>
        <MaterialCommunityIcons name="send-circle" size={22} color={colors.info} />
        <Text style={styles.telegramTitle}>{i18n.t('TELEGRAM_SECTION')}</Text>
      </View>
      <TextInput
        mode="outlined"
        value={telegramChatId}
        onChangeText={setTelegramChatId}
        placeholder={i18n.t('TELEGRAM_CHAT_ID_PLACEHOLDER')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        style={styles.telegramInput}
      />
      <TouchableOpacity
        style={[styles.telegramTestBtn, (!telegramChatId.trim() || telegramTesting) && styles.telegramBtnDisabled]}
        onPress={handleTestTelegram}
        disabled={!telegramChatId.trim() || telegramTesting}
      >
        {telegramTesting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <MaterialCommunityIcons name="send" size={18} color={colors.white} />
            <Text style={styles.telegramTestBtnText}>{i18n.t('TEST_TELEGRAM')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  )

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
        ListFooterComponent={TelegramSection}
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
  telegramSection: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
  },
  telegramHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  telegramTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  telegramInput: { backgroundColor: colors.surface },
  telegramTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  telegramTestBtnText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  telegramBtnDisabled: { opacity: 0.5 },
})

export default NotificationsSettingsScreen
