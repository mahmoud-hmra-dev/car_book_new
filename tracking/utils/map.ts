export type LatLng = {
  latitude: number
  longitude: number
}

export type ParsedCircle = {
  type: 'circle'
  center: LatLng
  radius: number
}

export type ParsedPolygon = {
  type: 'polygon'
  coordinates: LatLng[]
}

export type ParsedRectangle = {
  type: 'rectangle'
  northEast: LatLng
  southWest: LatLng
}

export type ParsedGeofence = ParsedCircle | ParsedPolygon | ParsedRectangle

export const parseGeofenceArea = (area?: string): ParsedGeofence | null => {
  if (!area) return null

  try {
    if (area.startsWith('CIRCLE')) {
      return parseCircle(area)
    }
    if (area.startsWith('POLYGON')) {
      return parsePolygon(area)
    }
    if (area.startsWith('RECTANGLE')) {
      return parseRectangle(area)
    }
  } catch (err) {
    console.error('Failed to parse geofence area:', err)
  }
  return null
}

const parseCircle = (area: string): ParsedCircle | null => {
  // Format: CIRCLE (lat lng, radius)
  const match = area.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
  if (!match) return null
  return {
    type: 'circle',
    center: { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) },
    radius: parseFloat(match[3]),
  }
}

const parsePolygon = (area: string): ParsedPolygon | null => {
  // Format: POLYGON ((lat1 lng1, lat2 lng2, ...))
  const match = area.match(/POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/)
  if (!match) return null
  const coords = match[1].split(',').map((pair) => {
    const [lat, lng] = pair.trim().split(/\s+/).map(Number)
    return { latitude: lat, longitude: lng }
  })
  return { type: 'polygon', coordinates: coords }
}

const parseRectangle = (area: string): ParsedRectangle | null => {
  // Format: RECTANGLE (lat1 lng1, lat2 lng2)
  const match = area.match(/RECTANGLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s+([-\d.]+)\s*\)/)
  if (!match) return null
  return {
    type: 'rectangle',
    southWest: { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) },
    northEast: { latitude: parseFloat(match[3]), longitude: parseFloat(match[4]) },
  }
}

export const buildCircleWKT = (center: LatLng, radius: number): string =>
  `CIRCLE (${center.latitude} ${center.longitude}, ${radius})`

export const buildPolygonWKT = (coords: LatLng[]): string => {
  const pairs = coords.map((c) => `${c.latitude} ${c.longitude}`).join(', ')
  return `POLYGON ((${pairs}))`
}

export const buildRectangleWKT = (sw: LatLng, ne: LatLng): string =>
  `RECTANGLE (${sw.latitude} ${sw.longitude}, ${ne.latitude} ${ne.longitude})`
