import { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Text, ActivityIndicator } from 'react-native-paper'
import { useLocalSearchParams, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as TraccarService from '@/services/TraccarService'
import { useFleet } from '@/context/FleetContext'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

const COMMAND_ICONS: Record<string, { icon: string, color: string }> = {
  engineStop: { icon: 'engine-off', color: colors.danger },
  engineResume: { icon: 'engine', color: colors.success },
  positionSingle: { icon: 'crosshairs-gps', color: colors.info },
  positionPeriodic: { icon: 'map-marker-path', color: colors.info },
  deviceIdentification: { icon: 'cellphone-information', color: colors.info },
  alarmArm: { icon: 'shield-lock', color: colors.warning },
  alarmDisarm: { icon: 'shield-off', color: colors.warning },
  requestPhoto: { icon: 'camera', color: colors.info },
}

const VehicleControlScreen = () => {
  const { carId } = useLocalSearchParams<{ carId: string }>()
  const { items } = useFleet()
  const vehicle = items.find((v) => v.carId === carId)
  const [commandTypes, setCommandTypes] = useState<bookcarsTypes.TraccarCommandType[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!carId) return
      try {
        const types = await TraccarService.getCommandTypes(carId)
        setCommandTypes(types || [])
      } catch (err) {
        console.error('Failed to load command types:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [carId])

  const handleSendCommand = (type: string) => {
    const cmdLabel = type.replace(/([A-Z])/g, ' $1').trim()
    Alert.alert(
      i18n.t('CONFIRM_COMMAND'),
      `${i18n.t('CONFIRM_COMMAND_MSG')}\n\nCommand: ${cmdLabel}\nVehicle: ${vehicle?.carName || 'Unknown'}`,
      [
        { text: i18n.t('CANCEL'), style: 'cancel' },
        {
          text: i18n.t('CONFIRM'),
          style: 'destructive',
          onPress: async () => {
            setSending(type)
            try {
              await TraccarService.sendCommand(carId!, { type, deviceId: vehicle?.deviceId })
              toastHelper.success(i18n.t('COMMAND_SENT'))
            } catch {
              toastHelper.error(undefined, i18n.t('COMMAND_FAILED'))
            } finally {
              setSending(null)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('VEHICLE_CONTROL') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
          <Text style={styles.warningText}>{i18n.t('WARNING_REMOTE_CONTROL')}</Text>
        </View>

        {/* Vehicle Info */}
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle?.carName || 'Unknown'}</Text>
          <Text style={styles.vehiclePlate}>{vehicle?.licensePlate || '--'}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxxl }} />
        ) : (
          <View style={styles.commandGrid}>
            {commandTypes.map((cmd) => {
              const config = COMMAND_ICONS[cmd.type || ''] || { icon: 'console', color: colors.textSecondary }
              const isSending = sending === cmd.type
              return (
                <TouchableOpacity
                  key={cmd.type}
                  style={[styles.commandBtn, isSending && styles.commandBtnDisabled]}
                  onPress={() => handleSendCommand(cmd.type || '')}
                  disabled={isSending}
                  activeOpacity={0.7}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color={config.color} />
                  ) : (
                    <MaterialCommunityIcons name={config.icon as any} size={32} color={config.color} />
                  )}
                  <Text style={styles.commandLabel}>
                    {(cmd.type || '').replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                </TouchableOpacity>
              )
            })}
            {commandTypes.length === 0 && (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="console-line" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>{i18n.t('NO_DATA')}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.huge },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  warningText: { flex: 1, color: colors.warning, fontSize: typography.sizes.small },
  vehicleInfo: { marginBottom: spacing.xl },
  vehicleName: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.textPrimary },
  vehiclePlate: { fontSize: typography.sizes.body, color: colors.textSecondary, marginTop: spacing.xxs },
  commandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  commandBtn: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
  },
  commandBtnDisabled: { opacity: 0.5 },
  commandLabel: { fontSize: typography.sizes.small, color: colors.textSecondary, textAlign: 'center', textTransform: 'capitalize' },
  emptyContainer: { width: '100%', alignItems: 'center', paddingTop: spacing.xxxl },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
})

export default VehicleControlScreen
