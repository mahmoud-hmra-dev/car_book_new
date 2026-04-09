import { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { Text, FAB } from 'react-native-paper'
import { Stack, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as TraccarService from '@/services/TraccarService'
import { useAuth } from '@/context/AuthContext'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

const GeofencesScreen = () => {
  const router = useRouter()
  const { loggedIn } = useAuth()
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [loading, setLoading] = useState(false)

  const loadGeofences = useCallback(async () => {
    if (!loggedIn) return
    setLoading(true)
    try {
      const data = await TraccarService.getAllGeofences()
      setGeofences(data || [])
    } catch (err) {
      console.error('Failed to load geofences:', err)
    } finally {
      setLoading(false)
    }
  }, [loggedIn])

  useEffect(() => { loadGeofences() }, [loadGeofences])

  const handleDelete = (geofence: bookcarsTypes.TraccarGeofence) => {
    Alert.alert(i18n.t('DELETE_GEOFENCE'), i18n.t('DELETE_GEOFENCE_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('DELETE'), style: 'destructive',
        onPress: async () => {
          try {
            await TraccarService.deleteGeofence(geofence.id!)
            setGeofences((prev) => prev.filter((g) => g.id !== geofence.id))
            toastHelper.success()
          } catch { toastHelper.error() }
        },
      },
    ])
  }

  const getZoneIcon = (area?: string): string => {
    if (area?.startsWith('CIRCLE')) return 'circle-outline'
    if (area?.startsWith('POLYGON')) return 'vector-polygon'
    if (area?.startsWith('RECTANGLE')) return 'rectangle-outline'
    return 'map-marker-radius'
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('GEOFENCES') }} />
      <FlatList
        data={geofences}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGeofences} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <MaterialCommunityIcons name={getZoneIcon(item.area) as any} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(screens)/geofence-editor', params: { geofenceId: String(item.id) } })} style={styles.iconBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
              <MaterialCommunityIcons name="delete-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="map-marker-radius" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{i18n.t('NO_GEOFENCES')}</Text>
          </View>
        ) : null}
      />
      <FAB icon="plus" style={styles.fab} color={colors.textInverse} onPress={() => router.push('/(screens)/geofence-editor')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.massive },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, gap: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  cardName: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  cardDesc: { fontSize: typography.sizes.small, color: colors.textSecondary, marginTop: spacing.xxs },
  iconBtn: { padding: spacing.xs },
  empty: { alignItems: 'center', paddingTop: spacing.massive },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
  fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xxl, backgroundColor: colors.primary },
})

export default GeofencesScreen
