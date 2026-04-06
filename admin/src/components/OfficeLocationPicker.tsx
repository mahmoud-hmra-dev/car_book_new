/**
 * OfficeLocationPicker
 *
 * An interactive Google Map that lets admin/supplier click to set their office coordinates.
 * Shows a draggable marker and a reverse-geocoded address.
 * Emits { lat, lng, address } via onChange.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import {
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import {
  MyLocation as MyLocationIcon,
  LocationOn as LocationOnIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import env from '@/config/env.config'

import '@/assets/css/office-location-picker.css'

/* ── types ───────────────────────────────────────────────── */
export interface OfficeLocationInfo {
  lat: number
  lng: number
  address: string
}

interface Props {
  /** Pre-selected coordinates (e.g. from DB) */
  initialLat?: number
  initialLng?: number
  /** Called whenever the marker moves or is cleared */
  onChange?: (info: OfficeLocationInfo | null) => void
}

/* ── helpers ─────────────────────────────────────────────── */
const BEIRUT = { lat: 33.8938, lng: 35.5018 }

/* ── Inner map content (needs useMap) ─────────────────────── */

interface InnerMapProps {
  initialLat?: number
  initialLng?: number
  onChange?: (info: OfficeLocationInfo | null) => void
}

const InnerMap: React.FC<InnerMapProps> = ({ initialLat, initialLng, onChange }) => {
  const map = useMap()
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  const [marker, setMarker] = useState<google.maps.LatLngLiteral | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  )
  const [address, setAddress] = useState<string>('')
  const [geoLoading, setGeoLoading] = useState(false)

  /* Build geocoder once map is ready */
  useEffect(() => {
    if (map && !geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder()
    }
  }, [map])

  const reverseGeocode = useCallback(
    (pos: google.maps.LatLngLiteral) => {
      if (!geocoderRef.current) {
        return
      }
      geocoderRef.current.geocode({ location: pos }, (results, status) => {
        const addr =
          status === 'OK' && results?.[0]
            ? results[0].formatted_address
            : `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
        setAddress(addr)
        onChange?.({ lat: pos.lat, lng: pos.lng, address: addr })
      })
    },
    [onChange],
  )

  /* Resolve initial coords to an address */
  useEffect(() => {
    if (initialLat && initialLng && geocoderRef.current) {
      reverseGeocode({ lat: initialLat, lng: initialLng })
    }
  }, [initialLat, initialLng, reverseGeocode])

  const placeMarker = useCallback(
    (pos: google.maps.LatLngLiteral) => {
      setMarker(pos)
      reverseGeocode(pos)
    },
    [reverseGeocode],
  )

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        map?.setCenter(p)
        map?.setZoom(15)
        placeMarker(p)
      },
      () => setGeoLoading(false),
      { timeout: 8000 },
    )
  }

  const handleClear = () => {
    setMarker(null)
    setAddress('')
    onChange?.(null)
  }

  return (
    <>
      <Map
        mapId={env.GOOGLE_MAPS_MAP_ID}
        defaultCenter={marker || BEIRUT}
        defaultZoom={marker ? 14 : 11}
        style={{ width: '100%', height: '320px' }}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        onClick={(e) => {
          if (e.detail.latLng) {
            placeMarker({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng })
          }
        }}
      >
        {marker && (
          <AdvancedMarker
            position={marker}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) {
                placeMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() })
              }
            }}
          />
        )}
      </Map>

      {/* Controls overlay */}
      <div className="olp-controls">
        <Tooltip title="Use my current location" placement="left">
          <Button className="olp-geo-btn" onClick={handleGeolocate} disabled={geoLoading} variant="contained" size="small">
            {geoLoading
              ? <CircularProgress size={16} sx={{ color: '#fff' }} />
              : <MyLocationIcon fontSize="small" />}
          </Button>
        </Tooltip>
        {marker && (
          <Tooltip title="Clear location" placement="left">
            <Button className="olp-clear-btn" onClick={handleClear} variant="contained" size="small">
              <CloseIcon fontSize="small" />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Coordinate + address display */}
      {marker ? (
        <div className="olp-coords">
          <div className="olp-coords-row">
            <span className="olp-coords-label">Latitude</span>
            <span className="olp-coords-value">{marker.lat.toFixed(6)}</span>
            <span className="olp-coords-sep" />
            <span className="olp-coords-label">Longitude</span>
            <span className="olp-coords-value">{marker.lng.toFixed(6)}</span>
          </div>
          {address && (
            <div className="olp-coords-address">
              <LocationOnIcon fontSize="small" sx={{ color: '#6B3CE6', mr: 0.5, flexShrink: 0 }} />
              {address}
            </div>
          )}
        </div>
      ) : (
        <div className="olp-coords-hint">
          No office location set. Click the map to place a pin.
        </div>
      )}
    </>
  )
}

/* ── component ───────────────────────────────────────────── */
const OfficeLocationPicker: React.FC<Props> = ({
  initialLat,
  initialLng,
  onChange,
}) => {
  if (!env.GOOGLE_MAPS_API_KEY) {
    return (
      <div className="olp-error">
        Unable to load map. Check your Google Maps API key.
      </div>
    )
  }

  return (
    <div className="olp-wrapper">
      {/* Header */}
      <div className="olp-header">
        <LocationOnIcon className="olp-header-icon" />
        <div>
          <div className="olp-header-title">Office Location on Map</div>
          <div className="olp-header-sub">Click the map or drag the pin to set your office coordinates.</div>
        </div>
      </div>

      {/* Map */}
      <div className="olp-map-container">
        <APIProvider apiKey={env.GOOGLE_MAPS_API_KEY} libraries={['places']}>
          <InnerMap
            initialLat={initialLat}
            initialLng={initialLng}
            onChange={onChange}
          />
        </APIProvider>
      </div>
    </div>
  )
}

export default OfficeLocationPicker
