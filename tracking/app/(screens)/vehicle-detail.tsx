import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFleet } from '@/context/FleetContext'
import { colors, spacing, typography } from '@/theme'
import { getStatusColor, formatSpeed, formatRelativeAge, formatCoordinate } from '@/utils/tracking'
import i18n from '@/lang/i18n'

const VehicleDetailScreen = () => {
  const { carId } = useLocalSearchParams<{ carId: string }>()
  const router = useRouter()
  const { items } = useFleet()
  const vehicle = items.find((v) => v.carId === carId)

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
          <View style={styles.mapContainer}>
            <MapView
              style={styles.miniMap}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: vehicle.position.latitude,
                longitude: vehicle.position.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: vehicle.position.latitude, longitude: vehicle.position.longitude }}>
                <View style={[styles.marker, { backgroundColor: statusColor }]}>
                  <MaterialCommunityIcons name="car" size={16} color={colors.white} />
                </View>
              </Marker>
            </MapView>
          </View>
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

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(screens)/route-history', params: { carId } })}>
            <MaterialCommunityIcons name="route" size={24} color={colors.primary} />
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
})

export default VehicleDetailScreen
