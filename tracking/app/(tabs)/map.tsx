import { useEffect, useRef, useState, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFleet } from '@/context/FleetContext'
import { colors, spacing, typography } from '@/theme'
import { getStatusColor, formatSpeed } from '@/utils/tracking'
import i18n from '@/lang/i18n'

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
]

const MapScreen = () => {
  const mapRef = useRef<MapView>(null)
  const { items, refreshFleet } = useFleet()
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  const vehiclesWithPosition = items.filter(
    (item) => item.position && item.position.latitude && item.position.longitude
  )

  const statusCounts = {
    moving: items.filter((i) => i.movementStatus === 'moving').length,
    idle: items.filter((i) => i.movementStatus === 'idle').length,
    stopped: items.filter((i) => i.movementStatus === 'stopped').length,
    offline: items.filter((i) => i.movementStatus === 'offline').length,
  }

  const fitAll = useCallback(() => {
    if (vehiclesWithPosition.length === 0 || !mapRef.current) return
    const coords = vehiclesWithPosition.map((v) => ({
      latitude: v.position!.latitude,
      longitude: v.position!.longitude,
    }))
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 40, bottom: 120, left: 40 },
      animated: true,
    })
  }, [vehiclesWithPosition])

  useEffect(() => {
    if (vehiclesWithPosition.length > 0) {
      setTimeout(fitAll, 500)
    }
  }, [vehiclesWithPosition.length])

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: 33.8938,
          longitude: 35.5018,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        {vehiclesWithPosition.map((vehicle) => (
          <Marker
            key={vehicle.carId}
            coordinate={{
              latitude: vehicle.position!.latitude,
              longitude: vehicle.position!.longitude,
            }}
            onPress={() => setSelectedVehicle(vehicle.carId)}
          >
            <View style={[styles.marker, { backgroundColor: getStatusColor(vehicle.movementStatus || 'offline') }]}>
              <MaterialCommunityIcons
                name={vehicle.movementStatus === 'moving' ? 'navigation' : 'car'}
                size={16}
                color={colors.white}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <View key={status} style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={styles.statusText}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={fitAll}>
          <MaterialCommunityIcons name="fit-to-screen-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={refreshFleet}>
          <MaterialCommunityIcons name="refresh" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Selected Vehicle Info */}
      {selectedVehicle && (() => {
        const v = items.find((i) => i.carId === selectedVehicle)
        if (!v) return null
        return (
          <View style={styles.infoSheet}>
            <View style={styles.infoHeader}>
              <View style={[styles.infoStatus, { backgroundColor: getStatusColor(v.movementStatus || 'offline') }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoName}>{v.carName || 'Unknown'}</Text>
                <Text style={styles.infoPlate}>{v.licensePlate || '--'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedVehicle(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.infoDetails}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{i18n.t('SPEED')}</Text>
                <Text style={styles.infoValue}>{formatSpeed(v.speedKmh)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{i18n.t('STATUS')}</Text>
                <Text style={[styles.infoValue, { color: getStatusColor(v.movementStatus || 'offline') }]}>
                  {v.movementStatus || '--'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{i18n.t('IGNITION')}</Text>
                <Text style={styles.infoValue}>{v.ignition ? i18n.t('ON') : i18n.t('OFF')}</Text>
              </View>
            </View>
          </View>
        )
      })()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  statusBar: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    backgroundColor: `${colors.surface}EE`,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  controls: {
    position: 'absolute',
    right: spacing.lg,
    top: 120,
    gap: spacing.sm,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.surface}EE`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  infoStatus: { width: 12, height: 12, borderRadius: 6 },
  infoName: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.textPrimary },
  infoPlate: { fontSize: typography.sizes.small, color: colors.textSecondary },
  infoDetails: { flexDirection: 'row', justifyContent: 'space-around' },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.xxs },
  infoValue: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary },
})

export default MapScreen
