import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import TrackingMap, { type MapMarker } from '@/components/map/TrackingMap'
import { useFleet } from '@/context/FleetContext'
import { colors, spacing, typography } from '@/theme'
import { getStatusColor, formatSpeed } from '@/utils/tracking'
import i18n from '@/lang/i18n'

const MapScreen = () => {
  const router = useRouter()
  const { items, refreshFleet } = useFleet()
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  const statusCounts = {
    moving: items.filter((i) => i.movementStatus === 'moving').length,
    idle: items.filter((i) => i.movementStatus === 'idle').length,
    stopped: items.filter((i) => i.movementStatus === 'stopped').length,
    offline: items.filter((i) => i.movementStatus === 'offline').length,
  }

  const mapMarkers: MapMarker[] = items
    .filter((v) => v.position && v.position.latitude && v.position.longitude)
    .map((v) => ({
      id: v.carId,
      lat: v.position!.latitude,
      lng: v.position!.longitude,
      color: getStatusColor(v.movementStatus || 'offline'),
      label: v.carName || 'Unknown',
      status: v.movementStatus || 'offline',
      speed: v.speedKmh,
      batteryLevel: v.batteryLevel,
      ignition: v.ignition,
      licensePlate: v.licensePlate,
      lastUpdate: v.lastPositionAt as string,
      address: v.address,
    }))

  const selectedData = selectedVehicle ? items.find((i) => i.carId === selectedVehicle) : null

  return (
    <View style={styles.container}>
      <TrackingMap
        markers={mapMarkers}
        selectedMarkerId={selectedVehicle || undefined}
        onMarkerPress={(id) => setSelectedVehicle(id)}
        height="flex"
      />

      {/* Status Bar */}
      <View style={styles.statusBar}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <View key={status} style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={styles.statusText}>{count}</Text>
          </View>
        ))}
        <TouchableOpacity onPress={refreshFleet} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Selected Vehicle Info */}
      {selectedData && (
        <View style={styles.infoSheet}>
          <View style={styles.infoHeader}>
            <View style={[styles.infoStatus, { backgroundColor: getStatusColor(selectedData.movementStatus || 'offline') }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoName}>{selectedData.carName || 'Unknown'}</Text>
              <Text style={styles.infoPlate}>{selectedData.licensePlate || '--'}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedVehicle(null)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoDetails}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{i18n.t('SPEED')}</Text>
              <Text style={styles.infoValue}>{formatSpeed(selectedData.speedKmh)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{i18n.t('STATUS')}</Text>
              <Text style={[styles.infoValue, { color: getStatusColor(selectedData.movementStatus || 'offline') }]}>
                {selectedData.movementStatus || '--'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{i18n.t('IGNITION')}</Text>
              <Text style={styles.infoValue}>{selectedData.ignition ? i18n.t('ON') : i18n.t('OFF')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => { setSelectedVehicle(null); router.push({ pathname: '/(screens)/vehicle-detail', params: { carId: selectedData.carId } }) }}
          >
            <Text style={styles.detailBtnText}>{i18n.t('VEHICLE_DETAIL')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statusBar: {
    position: 'absolute', top: 50, left: spacing.lg, right: spacing.lg,
    flexDirection: 'row', backgroundColor: 'rgba(22,27,34,0.92)', borderRadius: 12,
    padding: spacing.md, gap: spacing.lg, justifyContent: 'center', alignItems: 'center',
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  refreshBtn: { marginLeft: spacing.sm },
  infoSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.xl, paddingBottom: spacing.xxxl,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  infoStatus: { width: 12, height: 12, borderRadius: 6 },
  infoName: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.textPrimary },
  infoPlate: { fontSize: typography.sizes.small, color: colors.textSecondary },
  infoDetails: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.xxs },
  infoValue: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryLight, borderRadius: 10, padding: spacing.md, gap: spacing.xs,
  },
  detailBtnText: { color: colors.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
})

export default MapScreen
