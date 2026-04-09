import { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import { Text, Button, SegmentedButtons } from 'react-native-paper'
import { useLocalSearchParams, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { useFleet } from '@/context/FleetContext'
import * as TraccarService from '@/services/TraccarService'
import * as bookcarsTypes from ':bookcars-types'
import { colors, spacing, typography } from '@/theme'
import { formatSpeed, formatDistanceKm, formatDuration } from '@/utils/tracking'
import { formatDateTime } from '@/utils/date'
import { getDefaultDateRange } from '@/utils/date'
import i18n from '@/lang/i18n'

const ReportsScreen = () => {
  const { carId: paramCarId } = useLocalSearchParams<{ carId: string }>()
  const { items } = useFleet()
  const [selectedCarId, setSelectedCarId] = useState<string | undefined>(paramCarId)
  const activeCarId = selectedCarId || paramCarId
  const defaultRange = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(new Date(defaultRange.from))
  const [toDate, setToDate] = useState(new Date(defaultRange.to))
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [tab, setTab] = useState('summary')
  const [report, setReport] = useState<bookcarsTypes.TraccarVehicleReportBundle | null>(null)
  const [loading, setLoading] = useState(false)

  const loadReport = useCallback(async () => {
    if (!activeCarId) return
    setLoading(true)
    try {
      const data = await TraccarService.getReports(activeCarId, fromDate.toISOString(), toDate.toISOString())
      setReport(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [activeCarId, fromDate, toDate])

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('REPORTS') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Vehicle Selector (when no carId from params) */}
        {!paramCarId && (
          <View style={styles.vehiclePickerSection}>
            <Text style={styles.pickerLabel}>{i18n.t('SELECT_VEHICLE')}</Text>
            <FlatList
              horizontal
              data={items}
              keyExtractor={(item) => item.carId}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleChipRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.vehicleChip, activeCarId === item.carId && styles.vehicleChipActive]}
                  onPress={() => { setSelectedCarId(item.carId); setReport(null) }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="car" size={14} color={activeCarId === item.carId ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.vehicleChipText, activeCarId === item.carId && styles.vehicleChipTextActive]} numberOfLines={1}>
                    {item.carName || item.licensePlate || item.carId}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {!activeCarId ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="car-search" size={48} color={colors.textMuted} />
            <Text style={styles.empty}>{i18n.t('SELECT_VEHICLE')}</Text>
          </View>
        ) : (
          <>
        {/* Date Range */}
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
            <MaterialCommunityIcons name="calendar-start" size={16} color={colors.primary} />
            <Text style={styles.dateText}>{formatDateTime(fromDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
            <MaterialCommunityIcons name="calendar-end" size={16} color={colors.primary} />
            <Text style={styles.dateText}>{formatDateTime(toDate)}</Text>
          </TouchableOpacity>
        </View>
        <Button mode="contained" onPress={loadReport} loading={loading} disabled={loading} buttonColor={colors.primary} textColor={colors.textInverse} style={styles.generateBtn}>
          {i18n.t('GENERATE_REPORT')}
        </Button>

        {report && (
          <>
            <SegmentedButtons value={tab} onValueChange={setTab} buttons={[
              { value: 'summary', label: i18n.t('SUMMARY') },
              { value: 'trips', label: i18n.t('TRIPS') },
              { value: 'stops', label: i18n.t('STOPS') },
            ]} style={styles.segmented} theme={{ colors: { secondaryContainer: colors.primaryLight, onSecondaryContainer: colors.primary } }} />

            {tab === 'summary' && report.summary && (
              <View style={styles.summaryGrid}>
                <SummaryTile icon="road-variant" label={i18n.t('TOTAL_DISTANCE')} value={formatDistanceKm(report.summary.distance)} />
                <SummaryTile icon="speedometer-medium" label={i18n.t('AVG_SPEED')} value={formatSpeed(report.summary.averageSpeed)} />
                <SummaryTile icon="speedometer" label={i18n.t('MAX_SPEED')} value={formatSpeed(report.summary.maxSpeed)} />
                <SummaryTile icon="engine" label={i18n.t('ENGINE_HOURS')} value={formatDuration(report.summary.engineHours ? report.summary.engineHours / 1000 : 0)} />
              </View>
            )}

            {tab === 'trips' && (
              report.trips.length > 0 ? report.trips.map((trip, i) => (
                <View key={i} style={styles.tripCard}>
                  <View style={styles.tripRow}>
                    <MaterialCommunityIcons name="flag-variant" size={16} color={colors.success} />
                    <Text style={styles.tripAddr} numberOfLines={1}>{trip.startAddress || '--'}</Text>
                  </View>
                  <View style={styles.tripRow}>
                    <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.danger} />
                    <Text style={styles.tripAddr} numberOfLines={1}>{trip.endAddress || '--'}</Text>
                  </View>
                  <View style={styles.tripStats}>
                    <Text style={styles.tripStat}>{formatDistanceKm(trip.distance)}</Text>
                    <Text style={styles.tripStat}>{formatDuration(trip.duration ? trip.duration / 1000 : 0)}</Text>
                    <Text style={styles.tripStat}>{formatSpeed(trip.maxSpeed)}</Text>
                  </View>
                </View>
              )) : <Text style={styles.empty}>{i18n.t('NO_REPORTS')}</Text>
            )}

            {tab === 'stops' && (
              report.stops.length > 0 ? report.stops.map((stop, i) => (
                <View key={i} style={styles.stopCard}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={colors.stopped} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopAddr} numberOfLines={1}>{stop.address || '--'}</Text>
                    <Text style={styles.stopDuration}>{formatDuration(stop.duration ? stop.duration / 1000 : 0)}</Text>
                  </View>
                </View>
              )) : <Text style={styles.empty}>{i18n.t('NO_REPORTS')}</Text>
            )}
          </>
        )}
          </>
        )}
      </ScrollView>
      <DateTimePickerModal isVisible={showFromPicker} mode="datetime" date={fromDate} onConfirm={(d) => { setFromDate(d); setShowFromPicker(false) }} onCancel={() => setShowFromPicker(false)} />
      <DateTimePickerModal isVisible={showToPicker} mode="datetime" date={toDate} onConfirm={(d) => { setToDate(d); setShowToPicker(false) }} onCancel={() => setShowToPicker(false)} />
    </View>
  )
}

const SummaryTile = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
  <View style={summaryStyles.tile}>
    <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />
    <Text style={summaryStyles.value}>{value}</Text>
    <Text style={summaryStyles.label}>{label}</Text>
  </View>
)

const summaryStyles = StyleSheet.create({
  tile: { width: '47%', backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight, gap: spacing.xs },
  value: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.textPrimary },
  label: { fontSize: typography.sizes.caption, color: colors.textSecondary, textAlign: 'center' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.huge },
  dateRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  dateText: { color: colors.textPrimary, fontSize: typography.sizes.small },
  generateBtn: { borderRadius: 10, marginBottom: spacing.xl },
  segmented: { marginBottom: spacing.xl },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tripCard: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  tripAddr: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body },
  tripStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  tripStat: { color: colors.textSecondary, fontSize: typography.sizes.small },
  stopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  stopAddr: { color: colors.textPrimary, fontSize: typography.sizes.body },
  stopDuration: { color: colors.textSecondary, fontSize: typography.sizes.small, marginTop: spacing.xxs },
  empty: { color: colors.textMuted, fontSize: typography.sizes.body, textAlign: 'center', marginTop: spacing.xxxl },
  vehiclePickerSection: { marginBottom: spacing.lg },
  pickerLabel: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  vehicleChipRow: { gap: spacing.sm },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  vehicleChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  vehicleChipText: { color: colors.textSecondary, fontSize: typography.sizes.small, maxWidth: 120 },
  vehicleChipTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  emptyState: { alignItems: 'center', paddingTop: spacing.massive },
})

export default ReportsScreen
