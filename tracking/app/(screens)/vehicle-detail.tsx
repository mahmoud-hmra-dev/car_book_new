import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { Text } from 'react-native-paper'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import TrackingMap, { type MapMarker } from '@/components/map/TrackingMap'
import { useFleet } from '@/context/FleetContext'
import { colors, spacing, typography } from '@/theme'
import { getStatusColor, formatSpeed, formatRelativeAge, formatCoordinate } from '@/utils/tracking'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

const VehicleDetailScreen = () => {
  const { carId } = useLocalSearchParams<{ carId: string }>()
  const router = useRouter()
  const { items } = useFleet()
  const vehicle = items.find((v) => v.carId === carId)
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [geofencesLoading, setGeofencesLoading] = useState(false)

  const loadGeofences = useCallback(async () => {
    if (!carId) return
    setGeofencesLoading(true)
    try {
      const data = await TraccarService.getGeofences(carId)
      setGeofences(data || [])
    } catch (err) {
      console.error('Failed to load geofences:', err)
    } finally {
      setGeofencesLoading(false)
    }
  }, [carId])

  useEffect(() => { loadGeofences() }, [loadGeofences])

  const handleUnlinkGeofence = (geofence: bookcarsTypes.TraccarGeofence) => {
    Alert.alert(i18n.t('UNLINK_GEOFENCE'), i18n.t('UNLINK_GEOFENCE_CONFIRM'), [
      { text: i18n.t('CANCEL'), style: 'cancel' },
      {
        text: i18n.t('CONFIRM'), style: 'destructive',
        onPress: async () => {
          try {
            await TraccarService.unlinkGeofence(carId!, geofence.id!)
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

  if (!vehicle) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: i18n.t('VEHICLE_DETAIL') }} />
        <Text style={styles.emptyText}>{i18n.t('NO_DATA')}</Text>
      </View>
    )
  }

  const statusColor = getStatusColor(vehicle.movementStatus || 'offline')

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: vehicle.carName || i18n.t('VEHICLE_DETAIL') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Mini Map */}
        {vehicle.position && (
          <TrackingMap
            markers={[{
              id: vehicle.carId,
              lat: vehicle.position.latitude,
              lng: vehicle.position.longitude,
              color: statusColor,
              label: vehicle.carName || 'Vehicle',
              status: vehicle.movementStatus || 'offline',
              speed: vehicle.speedKmh,
              ignition: vehicle.ignition,
              licensePlate: vehicle.licensePlate,
              selected: true,
            }]}
            height={220}
          />
        )}

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('CURRENT_POSITION')}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {vehicle.movementStatus || 'offline'}
              </Text>
            </View>
          </View>
          <InfoRow icon="speedometer" label={i18n.t('SPEED')} value={formatSpeed(vehicle.speedKmh)} />
          <InfoRow icon="map-marker" label={i18n.t('ADDRESS')} value={vehicle.address || '--'} />
          <InfoRow icon="crosshairs-gps" label={i18n.t('COORDINATES')} value={
            vehicle.position ? `${formatCoordinate(vehicle.position.latitude)}, ${formatCoordinate(vehicle.position.longitude)}` : '--'
          } />
          <InfoRow icon="engine" label={i18n.t('IGNITION')} value={vehicle.ignition ? i18n.t('ON') : i18n.t('OFF')} valueColor={vehicle.ignition ? colors.success : colors.danger} />
          <InfoRow icon="clock-outline" label={i18n.t('LAST_UPDATE')} value={formatRelativeAge(vehicle.lastPositionAt)} />
        </View>

        {/* Device Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('DEVICE_INFO')}</Text>
          <InfoRow icon="cellphone" label={i18n.t('DEVICE_NAME')} value={vehicle.deviceName || '--'} />
          <InfoRow icon="signal" label={i18n.t('DEVICE_STATUS')} value={vehicle.deviceStatus || '--'} />
          {vehicle.batteryLevel != null && (
            <InfoRow icon="battery" label={i18n.t('BATTERY')} value={`${vehicle.batteryLevel}%`} />
          )}
        </View>

        {/* Linked Geofences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('LINKED_GEOFENCES')}</Text>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.push('/(screens)/geofences')}
            >
              <MaterialCommunityIcons name="link-plus" size={16} color={colors.primary} />
              <Text style={styles.linkBtnText}>{i18n.t('LINK_GEOFENCE')}</Text>
            </TouchableOpacity>
          </View>
          {geofencesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: spacing.lg }} />
          ) : geofences.length === 0 ? (
            <Text style={styles.noGeofencesText}>{i18n.t('NO_LINKED_GEOFENCES')}</Text>
          ) : (
            geofences.map((gf) => (
              <View key={gf.id} style={styles.geofenceRow}>
                <MaterialCommunityIcons name={getZoneIcon(gf.area) as any} size={20} color={colors.primary} />
                <Text style={styles.geofenceName} numberOfLines={1}>{gf.name}</Text>
                <TouchableOpacity onPress={() => handleUnlinkGeofence(gf)} style={styles.unlinkBtn}>
                  <MaterialCommunityIcons name="link-off" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(screens)/route-history', params: { carId } })}>
            <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.primary} />
            <Text style={styles.actionLabel}>{i18n.t('ROUTE_HISTORY')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(screens)/vehicle-control', params: { carId } })}>
            <MaterialCommunityIcons name="remote" size={24} color={colors.warning} />
            <Text style={styles.actionLabel}>{i18n.t('SEND_COMMAND')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(screens)/reports', params: { carId } })}>
            <MaterialCommunityIcons name="chart-bar" size={24} color={colors.info} />
            <Text style={styles.actionLabel}>{i18n.t('REPORTS')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const InfoRow = ({ icon, label, value, valueColor }: { icon: string, label: string, value: string, valueColor?: string }) => (
  <View style={infoStyles.row}>
    <MaterialCommunityIcons name={icon as any} size={18} color={colors.textMuted} />
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]} numberOfLines={2}>{value}</Text>
  </View>
)

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  label: { color: colors.textSecondary, fontSize: typography.sizes.body, width: 100 },
  value: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body, textAlign: 'right' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: spacing.huge },
  mapContainer: { height: 200, borderRadius: 0, overflow: 'hidden' },
  miniMap: { flex: 1 },
  marker: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
  section: { padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: spacing.md },
  statusRow: { marginBottom: spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, gap: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, textTransform: 'capitalize' },
  actionsRow: { flexDirection: 'row', padding: spacing.xl, gap: spacing.md },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  actionLabel: { fontSize: typography.sizes.caption, color: colors.textSecondary, textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  linkBtnText: { fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  geofenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  geofenceName: { flex: 1, fontSize: typography.sizes.body, color: colors.textPrimary },
  unlinkBtn: { padding: spacing.xs },
  noGeofencesText: { color: colors.textMuted, fontSize: typography.sizes.body, paddingVertical: spacing.md },
})

export default VehicleDetailScreen
