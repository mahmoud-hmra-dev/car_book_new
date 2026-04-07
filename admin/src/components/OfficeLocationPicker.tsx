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
      <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
        <Tooltip title="Use my current location" placement="left">
          <Button className="!bg-primary hover:!bg-[#5229BF] !min-w-0 !w-9 !h-9 !rounded-full !p-0 !shadow-[0_2px_8px_rgba(0,0,0,0.22)]" onClick={handleGeolocate} disabled={geoLoading} variant="contained" size="small">
            {geoLoading
              ? <CircularProgress size={16} sx={{ color: '#fff' }} />
              : <MyLocationIcon fontSize="small" />}
          </Button>
        </Tooltip>
        {marker && (
          <Tooltip title="Clear location" placement="left">
            <Button className="!bg-danger hover:!bg-[#c62828] !min-w-0 !w-9 !h-9 !rounded-full !p-0 !shadow-[0_2px_8px_rgba(0,0,0,0.22)]" onClick={handleClear} variant="contained" size="small">
              <CloseIcon fontSize="small" />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Coordinate + address display */}
      {marker ? (
        <div className="px-4 py-3 bg-[#F0EBF9] border-t border-primary/12">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Latitude</span>
            <span className="text-[13px] font-bold text-[#1B6B4A] font-mono">{marker.lat.toFixed(6)}</span>
            <span className="w-px h-3.5 bg-black/15 mx-1" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Longitude</span>
            <span className="text-[13px] font-bold text-[#1B6B4A] font-mono">{marker.lng.toFixed(6)}</span>
          </div>
          {address && (
            <div className="flex items-start text-xs text-[#475569] mt-1.5 leading-relaxed">
              <LocationOnIcon fontSize="small" sx={{ color: '#6B3CE6', mr: 0.5, flexShrink: 0 }} />
              {address}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-text-muted bg-[#fafafa] border-t border-black/[0.06] text-center">
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
      <div className="p-5 text-center text-danger text-[13px] bg-[#fff5f5] border border-[#fecaca] rounded-xl">
        Unable to load map. Check your Google Maps API key.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-primary/18 overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] mt-2 mb-1">
      {/* Header */}
      <div className="flex items-start gap-2.5 px-[18px] pt-3.5 pb-3 bg-gradient-to-br from-primary to-[#8B6AEF] text-white">
        <LocationOnIcon className="!text-2xl opacity-90 mt-0.5" />
        <div>
          <div className="text-sm font-bold tracking-tight">Office Location on Map</div>
          <div className="text-[11px] opacity-80 mt-0.5">Click the map or drag the pin to set your office coordinates.</div>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
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
