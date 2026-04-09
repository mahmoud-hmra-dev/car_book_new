import { useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper'
import { Stack, useRouter } from 'expo-router'
import MapView, { Marker, Circle, Polygon, PROVIDER_GOOGLE } from 'react-native-maps'
import { colors, spacing, typography } from '@/theme'
import * as TraccarService from '@/services/TraccarService'
import * as mapUtils from '@/utils/map'
import * as toastHelper from '@/utils/toastHelper'
import i18n from '@/lang/i18n'

type DrawMode = 'circle' | 'polygon' | 'rectangle'

const GeofenceEditorScreen = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<DrawMode>('circle')
  const [points, setPoints] = useState<mapUtils.LatLng[]>([])
  const [radius, setRadius] = useState(500)
  const [saving, setSaving] = useState(false)

  const handleMapPress = (e: any) => {
    const coord = e.nativeEvent.coordinate as mapUtils.LatLng
    if (mode === 'circle') {
      setPoints([coord])
    } else if (mode === 'rectangle') {
      setPoints((prev) => prev.length >= 2 ? [coord] : [...prev, coord])
    } else {
      setPoints((prev) => [...prev, coord])
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(i18n.t('ERROR'), 'Please enter a zone name'); return }
    if (points.length === 0) { Alert.alert(i18n.t('ERROR'), 'Please draw a zone on the map'); return }

    let area = ''
    if (mode === 'circle' && points.length >= 1) {
      area = mapUtils.buildCircleWKT(points[0], radius)
    } else if (mode === 'polygon' && points.length >= 3) {
      area = mapUtils.buildPolygonWKT(points)
    } else if (mode === 'rectangle' && points.length >= 2) {
      area = mapUtils.buildRectangleWKT(points[0], points[1])
    } else {
      Alert.alert(i18n.t('ERROR'), 'Incomplete zone drawing'); return
    }

    setSaving(true)
    try {
      await TraccarService.createGeofence({ name: name.trim(), description: description.trim(), area })
      toastHelper.success()
      router.back()
    } catch { toastHelper.error() }
    finally { setSaving(false) }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: i18n.t('CREATE_GEOFENCE') }} />
      <MapView style={styles.map} provider={PROVIDER_GOOGLE} onPress={handleMapPress}
        initialRegion={{ latitude: 33.8938, longitude: 35.5018, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
      >
        {points.map((p, i) => <Marker key={i} coordinate={p} pinColor={colors.primary} />)}
        {mode === 'circle' && points.length >= 1 && (
          <Circle center={points[0]} radius={radius} fillColor={colors.mapGeofenceFill} strokeColor={colors.mapGeofenceStroke} strokeWidth={2} />
        )}
        {mode === 'polygon' && points.length >= 3 && (
          <Polygon coordinates={points} fillColor={colors.mapGeofenceFill} strokeColor={colors.mapGeofenceStroke} strokeWidth={2} />
        )}
        {mode === 'rectangle' && points.length >= 2 && (
          <Polygon
            coordinates={[
              points[0],
              { latitude: points[0].latitude, longitude: points[1].longitude },
              points[1],
              { latitude: points[1].latitude, longitude: points[0].longitude },
            ]}
            fillColor={colors.mapGeofenceFill} strokeColor={colors.mapGeofenceStroke} strokeWidth={2}
          />
        )}
      </MapView>

      <View style={styles.panel}>
        <SegmentedButtons
          value={mode}
          onValueChange={(v) => { setMode(v as DrawMode); setPoints([]) }}
          buttons={[
            { value: 'circle', label: i18n.t('CIRCLE') },
            { value: 'polygon', label: i18n.t('POLYGON') },
            { value: 'rectangle', label: i18n.t('RECTANGLE') },
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
        {mode === 'circle' && (
          <TextInput label={`${i18n.t('RADIUS')} (m)`} value={String(radius)} onChangeText={(t) => setRadius(Number(t) || 0)} mode="outlined" keyboardType="numeric" style={styles.input}
            theme={{ colors: { primary: colors.primary } }} textColor={colors.textPrimary} outlineColor={colors.border} activeOutlineColor={colors.primary}
          />
        )}
        <Text style={styles.hint}>{i18n.t('TAP_TO_DRAW')}</Text>
        <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} buttonColor={colors.primary} textColor={colors.textInverse} style={styles.saveBtn}>
          {i18n.t('SAVE_GEOFENCE')}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  panel: { backgroundColor: colors.surface, padding: spacing.xl, paddingBottom: spacing.xxxl, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  segmented: { marginBottom: spacing.md },
  input: { backgroundColor: colors.background, marginBottom: spacing.sm },
  hint: { color: colors.textMuted, fontSize: typography.sizes.caption, textAlign: 'center', marginBottom: spacing.md },
  saveBtn: { borderRadius: 10 },
})

export default GeofenceEditorScreen
