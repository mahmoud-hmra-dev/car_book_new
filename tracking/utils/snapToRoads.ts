import { GOOGLE_MAPS_API_KEY } from '@/config/env.config'

type LatLng = { latitude: number, longitude: number }

/**
 * Snap GPS points to roads using Google Roads API
 * Processes in batches of 100 points (API limit)
 * Filters out points that jump too far (>5km between consecutive points)
 */
export const snapToRoads = async (points: LatLng[]): Promise<LatLng[]> => {
  if (!GOOGLE_MAPS_API_KEY || points.length < 2) return points

  try {
    // First filter out wild GPS jumps (points >5km apart from neighbors)
    const filtered = filterGPSJumps(points, 5000)
    if (filtered.length < 2) return points

    // Process in batches of 100 (Google Roads API limit)
    const BATCH_SIZE = 100
    const allSnapped: LatLng[] = []

    for (let i = 0; i < filtered.length; i += BATCH_SIZE - 1) {
      const batch = filtered.slice(i, i + BATCH_SIZE)
      const path = batch.map((p) => `${p.latitude},${p.longitude}`).join('|')

      const url = `https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=true&key=${GOOGLE_MAPS_API_KEY}`
      const response = await fetch(url)

      if (!response.ok) {
        console.warn('Snap to roads failed:', response.status)
        return points // Fallback to original points
      }

      const data = await response.json()
      if (data.snappedPoints) {
        const snapped = data.snappedPoints.map((sp: any) => ({
          latitude: sp.location.latitude,
          longitude: sp.location.longitude,
        }))
        // Avoid duplicating overlap points
        if (allSnapped.length > 0 && snapped.length > 0) {
          allSnapped.push(...snapped.slice(1))
        } else {
          allSnapped.push(...snapped)
        }
      }
    }

    return allSnapped.length > 0 ? allSnapped : points
  } catch (err) {
    console.warn('Snap to roads error:', err)
    return points // Fallback to original
  }
}

/**
 * Filter out GPS points that jump too far from their neighbors
 * This removes "teleportation" artifacts where GPS loses signal
 */
const filterGPSJumps = (points: LatLng[], maxDistanceMeters: number): LatLng[] => {
  if (points.length < 2) return points

  const result: LatLng[] = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const dist = haversineDistance(result[result.length - 1], points[i])
    if (dist <= maxDistanceMeters) {
      result.push(points[i])
    }
    // Skip points that are too far (GPS jump)
  }

  return result
}

/**
 * Calculate distance between two points in meters
 */
const haversineDistance = (a: LatLng, b: LatLng): number => {
  const R = 6371000
  const dLat = (b.latitude - a.latitude) * Math.PI / 180
  const dLon = (b.longitude - a.longitude) * Math.PI / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const h = sinLat * sinLat + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * sinLon * sinLon
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
