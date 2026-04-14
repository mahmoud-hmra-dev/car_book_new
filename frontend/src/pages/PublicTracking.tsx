import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Chip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Speed,
  LocationOn,
  DirectionsCar,
  AccessTime,
} from '@mui/icons-material'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axiosInstance from '@/services/axiosInstance'

// Fix Leaflet default marker icons in bundled apps
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface PublicPosition {
  carName?: string
  licensePlate?: string
  position: {
    latitude: number
    longitude: number
    address?: string
  } | null
  lastUpdate?: string
  speedKmh?: number
  movementStatus?: string
}

const STATUS_COLORS: Record<string, string> = {
  moving: '#22c55e',
  idle: '#f59e0b',
  stopped: '#6b7280',
  offline: '#ef4444',
  stale: '#f97316',
  noGps: '#8b5cf6',
  unlinked: '#94a3b8',
}

const MapRecentrer = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

const PublicTracking = () => {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPosition = useCallback(async () => {
    if (!token) {
return
}
    try {
      const res = await axiosInstance.get(`/api/tracking/public/${token}`)
      setData(res.data)
      setError(null)
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('This share link has expired or is invalid.')
        if (intervalRef.current) {
clearInterval(intervalRef.current)
}
      } else {
        setError('Unable to load vehicle location.')
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPosition()
    intervalRef.current = setInterval(fetchPosition, 30000)
    return () => {
      if (intervalRef.current) {
clearInterval(intervalRef.current)
}
    }
  }, [fetchPosition])

  const statusColor = data?.movementStatus
    ? (STATUS_COLORS[data.movementStatus] || STATUS_COLORS.offline)
    : STATUS_COLORS.offline

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8fafc', p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>{error}</Alert>
      </Box>
    )
  }

  const pos = data?.position

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f8fafc' }}>
      <Paper
        elevation={0}
        sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2, zIndex: 10 }}
      >
        <DirectionsCar sx={{ color: statusColor, fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            {data?.carName || 'Vehicle'}
          </Typography>
          {data?.licensePlate && (
            <Typography variant="caption" color="text.secondary">
              {data.licensePlate}
            </Typography>
          )}
        </Box>
        <Chip
          label={data?.movementStatus || 'Unknown'}
          size="small"
          sx={{ bgcolor: `${statusColor}22`, color: statusColor, fontWeight: 600, border: `1px solid ${statusColor}44` }}
        />
      </Paper>

      <Box sx={{ flex: 1, position: 'relative' }}>
        {pos ? (
          <MapContainer
            center={[pos.latitude, pos.longitude]}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecentrer lat={pos.latitude} lng={pos.longitude} />
            <Marker position={[pos.latitude, pos.longitude]}>
              <Popup>
                <strong>{data?.carName || 'Vehicle'}</strong>
                {data?.licensePlate && <><br />{data.licensePlate}</>}
                {data?.speedKmh != null && <><br />Speed: {Math.round(data.speedKmh)} km/h</>}
                {pos.address && <><br />{pos.address}</>}
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Alert severity="warning">No GPS position available yet</Alert>
          </Box>
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}
      >
        {data?.speedKmh != null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Speed sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              <strong>{Math.round(data.speedKmh)}</strong> km/h
            </Typography>
          </Box>
        )}
        {pos?.address && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
            <LocationOn sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {pos.address}
            </Typography>
          </Box>
        )}
        {data?.lastUpdate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {new Date(data.lastUpdate).toLocaleTimeString()}
            </Typography>
          </Box>
        )}
        <Typography variant="caption" color="text.disabled" sx={{ width: '100%', textAlign: 'center', mt: 0.25 }}>
          Live tracking · Updates every 30 seconds
        </Typography>
      </Paper>
    </Box>
  )
}

export default PublicTracking
