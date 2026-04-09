import { useState } from 'react'
import { View, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native'
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper'
import { Stack, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import TrackingMap, { type MapMarker, type MapCircle } from '@/components/map/TrackingMap'
import { colors, spacing, typography } from '@/theme'
import * as TraccarService from '@/services/TraccarService'
import * as mapUtils from '@/utils/map'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

type DrawMode = 'circle' | 'polygon' | 'rectangle'

const modeConfig: Record<DrawMode, { icon: string, hint: string }> = {
  circle: { icon: 'circle-outline', hint: 'TAP_TO_PLACE_CENTER' },
  polygon: { icon: 'vector-polygon', hint: 'TAP_TO_ADD_POINTS' },
  rectangle: { icon: 'rectangle-outline', hint: 'TAP_TO_ADD_CORNERS' },
}

const GeofenceEditorScreen = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<DrawMode>('circle')
  const [points, setPoints] = useState<mapUtils.LatLng[]>([])
  const [radius, setRadius] = useState(500)
  const [saving, setSaving] = useState(false)

  const handleMapPress = (lat: number, lng: number) => {
    const coord: mapUtils.LatLng = { latitude: lat, longitude: lng }
    if (mode === 'circle') {
      setPoints([coord])
    } else if (mode === 'rectangle') {
      setPoints((prev) => prev.length >= 2 ? [coord] : [...prev, coord])
    } else {
      setPoints((prev) => [...prev, coord])
    }
  }

  const handleClearPoints = () => {
    setPoints([])
  }

  const handleUndoPoint = () => {
    setPoints((prev) => prev.slice(0, -1))
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(i18n.t('ERROR'), i18n.t('GEOFENCE_NAME')); return }
    if (points.length === 0) { Alert.alert(i18n.t('ERROR'), i18n.t('TAP_TO_DRAW')); return }

    let area = ''
    if (mode === 'circle' && points.length >= 1) {
      area = mapUtils.buildCircleWKT(points[0], radius)
    } else if (mode === 'polygon' && points.length >= 3) {
      area = mapUtils.buildPolygonWKT(points)
    } else if (mode === 'rectangle' && points.length >= 2) {
      area = mapUtils.buildRectangleWKT(points[0], points[1])
    } else {
      Alert.alert(i18n.t('ERROR'), i18n.t('TAP_TO_DRAW')); return
    }

    setSaving(true)
    try {
      await TraccarService.createGeofence({ name: name.trim(), description: description.trim(), area })
      toastHelper.success()
      router.back()
    } catch { toastHelper.error() }
    finally { setSaving(false) }
  }

  // Build markers for tapped points
  const mapMarkers: MapMarker[] = points.map((p, i) => ({
    id: `point-${i}`,
    lat: p.latitude,
    lng: p.longitude,
    color: colors.primary,
    label: `Point ${i + 1}`,
    status: 'moving',
  }))

  // Build circles for circle mode
  const mapCircles: MapCircle[] = mode === 'circle' && points.length >= 1
    ? [{ id: 'zone', lat: points[0].latitude, lng: points[0].longitude, radius, color: colors.mapGeofenceStroke, fillColor: colors.mapGeofenceFill }]
    : []

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('CREATE_GEOFENCE') }} />

      {/* Instruction bar */}
      <View style={styles.instructionBar}>
        <MaterialCommunityIcons name={modeConfig[mode].icon as any} size={18} color={colors.primary} />
        <Text style={styles.instructionText}>{i18n.t(modeConfig[mode].hint)}</Text>
        {points.length > 0 && (
          <Text style={styles.pointCount}>{points.length} {i18n.t('POINTS_PLACED')}</Text>
        )}
      </View>

      <TrackingMap
        markers={mapMarkers}
        circles={mapCircles}
        onMapPress={handleMapPress}
        height="flex"
      />

      {/* Drawing toolbar */}
      {points.length > 0 && (
        <View style={styles.drawToolbar}>
          {mode === 'polygon' && points.length > 0 && (
            <TouchableOpacity style={styles.toolBtn} onPress={handleUndoPoint}>
              <MaterialCommunityIcons name="undo" size={20} color={colors.warning} />
              <Text style={styles.toolBtnText}>{i18n.t('UNDO_POINT')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.toolBtn} onPress={handleClearPoints}>
            <MaterialCommunityIcons name="eraser" size={20} color={colors.danger} />
            <Text style={styles.toolBtnText}>{i18n.t('CLEAR_POINTS')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panel} keyboardShouldPersistTaps="handled">
        {/* Shape selector with icons */}
        <SegmentedButtons
          value={mode}
          onValueChange={(v) => { setMode(v as DrawMode); setPoints([]) }}
          buttons={[
            { value: 'circle', label: i18n.t('CIRCLE'), icon: 'circle-outline' },
            { value: 'polygon', label: i18n.t('POLYGON'), icon: 'vector-polygon' },
            { value: 'rectangle', label: i18n.t('RECTANGLE'), icon: 'rectangle-outline' },
          ]}
          style={styles.segmented}
          theme={{ colors: { secondaryContainer: colors.primaryLight, onSecondaryContainer: colors.primary } }}
        />

        <TextInput label={i18n.t('GEOFENCE_NAME')} value={name} onChangeText={setName} mode="outlined" style={styles.input}
          theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary}
        />
        <TextInput label={i18n.t('GEOFENCE_DESCRIPTION')} value={description} onChangeText={setDescription} mode="outlined" style={styles.input}
          theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary}
        />

        {/* Radius for circle mode */}
        {mode === 'circle' && (
          <View style={styles.radiusContainer}>
            <Text style={styles.radiusLabel}>{i18n.t('RADIUS')}</Text>
            <View style={styles.radiusPresets}>
              {[200, 500, 1000, 2000, 5000].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusPresetBtn, radius === r && styles.radiusPresetActive]}
                  onPress={() => setRadius(r)}
                >
                  <Text style={[styles.radiusPresetText, radius === r && styles.radiusPresetTextActive]}>
                    {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              label={`${i18n.t('RADIUS')} (m)`}
              value={String(radius)}
              onChangeText={(t) => setRadius(Math.min(Math.max(Number(t) || 0, 100), 5000))}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              theme={{ colors: { primary: colors.primary } }}
              textColor={colors.textPrimary}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
          </View>
        )}

        <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} buttonColor={colors.primary} textColor={colors.textInverse} style={styles.saveBtn}>
          {i18n.t('SAVE_GEOFENCE')}
        </Button>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  instructionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  instructionText: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body },
  pointCount: { color: colors.primary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  drawToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  toolBtnText: { fontSize: typography.sizes.small, color: colors.textSecondary },
  panelScroll: { maxHeight: 340 },
  panel: { backgroundColor: colors.surface, padding: spacing.xl, paddingBottom: spacing.xxxl, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  segmented: { marginBottom: spacing.md },
  input: { backgroundColor: colors.background, marginBottom: spacing.sm },
  radiusContainer: { marginBottom: spacing.sm },
  radiusLabel: { color: colors.textSecondary, fontSize: typography.sizes.body, marginBottom: spacing.sm },
  radiusPresets: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  radiusPresetBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.background },
  radiusPresetActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radiusPresetText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
  radiusPresetTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
  saveBtn: { borderRadius: 10 },
})

export default GeofenceEditorScreen
