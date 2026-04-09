import { useState, useMemo } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Text, Searchbar } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFleet } from '@/context/FleetContext'
import { colors, spacing, typography } from '@/theme'
import { getStatusColor, formatSpeed, formatRelativeAge, buildFleetCounts } from '@/utils/tracking'
import i18n from '@/lang/i18n'

const FILTERS = ['all', 'moving', 'idle', 'stopped', 'offline', 'stale'] as const

const VehiclesScreen = () => {
  const router = useRouter()
  const { items, loading, refreshFleet } = useFleet()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const counts = buildFleetCounts(items)

  const filtered = useMemo(() => {
    let result = items
    if (activeFilter !== 'all') {
      result = result.filter((v) => v.movementStatus === activeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (v) => v.carName?.toLowerCase().includes(q) || v.licensePlate?.toLowerCase().includes(q)
      )
    }
    return result
  }, [items, activeFilter, search])

  const getFilterCount = (filter: string) => {
    if (filter === 'all') return counts.total
    return counts[filter as keyof typeof counts] || 0
  }

  const renderVehicle = ({ item }: { item: typeof items[0] }) => (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={() => router.push({ pathname: '/(screens)/vehicle-detail', params: { carId: item.carId } })}
      activeOpacity={0.7}
    >
      <View style={[styles.vehicleStatusBar, { backgroundColor: getStatusColor(item.movementStatus || 'offline') }]} />
      <View style={styles.vehicleContent}>
        <View style={styles.vehicleHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{item.carName || 'Unknown'}</Text>
            <Text style={styles.vehiclePlate}>{item.licensePlate || '--'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.movementStatus || 'offline')}22` }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(item.movementStatus || 'offline') }]} />
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.movementStatus || 'offline') }]}>
              {item.movementStatus || 'offline'}
            </Text>
          </View>
        </View>
        <View style={styles.vehicleDetails}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="speedometer" size={14} color={colors.textMuted} />
            <Text style={styles.detailText}>{formatSpeed(item.speedKmh)}</Text>
          </View>
          {item.address ? (
            <View style={[styles.detailItem, { flex: 1 }]}>
              <MaterialCommunityIcons name="map-marker" size={14} color={colors.textMuted} />
              <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
            </View>
          ) : null}
        </View>
        {item.lastPositionAt ? (
          <Text style={styles.lastSeen}>{formatRelativeAge(item.lastPositionAt)}</Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('VEHICLES')}</Text>
      </View>

      <Searchbar
        placeholder={i18n.t('SEARCH_VEHICLES')}
        onChangeText={setSearch}
        value={search}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor={colors.textMuted}
        placeholderTextColor={colors.placeholder}
      />

      {/* Filter Chips */}
      <FlatList
        horizontal
        data={FILTERS as unknown as string[]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: filter }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            {filter !== 'all' && (
              <View style={[styles.filterDot, { backgroundColor: getStatusColor(filter) }]} />
            )}
            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
              {filter === 'all' ? i18n.t('ALL_VEHICLES') : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
            <Text style={[styles.filterCount, activeFilter === filter && styles.filterCountActive]}>
              {getFilterCount(filter)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Vehicle List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.carId}
        renderItem={renderVehicle}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshFleet} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="car-off" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{i18n.t('NO_DATA')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.textPrimary },
  searchBar: { marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: 12 },
  searchInput: { color: colors.textPrimary, fontSize: typography.sizes.body },
  filterRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.md },
  filterChip: {
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
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { color: colors.textSecondary, fontSize: typography.sizes.small },
  filterTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  filterCount: { color: colors.textMuted, fontSize: typography.sizes.caption },
  filterCountActive: { color: colors.primary },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, gap: spacing.md },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  vehicleStatusBar: { width: 4, alignSelf: 'stretch' },
  vehicleContent: { flex: 1, padding: spacing.lg },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  vehicleName: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  vehiclePlate: { fontSize: typography.sizes.small, color: colors.textSecondary, marginTop: spacing.xxs },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: 8, gap: spacing.xxs },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
  vehicleDetails: { flexDirection: 'row', gap: spacing.lg },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  detailText: { fontSize: typography.sizes.small, color: colors.textMuted },
  lastSeen: { fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.xs },
  emptyContainer: { alignItems: 'center', paddingTop: spacing.massive },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.body, marginTop: spacing.md },
})

export default VehiclesScreen
