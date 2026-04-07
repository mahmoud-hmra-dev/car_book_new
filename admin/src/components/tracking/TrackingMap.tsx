import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import env from '@/config/env.config'
import type {
  DraftGeofenceShape,
  FleetVehicle,
  GeofenceEditorType,
  LatLngTuple,
  ParsedGeofence,
  TrackingMapType,
} from './types'
import {
  DEFAULT_CENTER,
  extractGeoJsonPaths,
  fromGoogleLatLng,
  fromGooglePath,
  getStatusColor,
  toGoogleLatLng,
} from './utils'

type TrackingMapProps = {
  vehicles: FleetVehicle[]
  selectedVehicle: FleetVehicle | null
  routePathPoints: LatLngTuple[]
  playbackPoint: LatLngTuple | null
  playbackHeading: number | null
  geofenceShapes: ParsedGeofence[]
  draftGeofence: DraftGeofenceShape | null
  drawingMode: GeofenceEditorType | null
  mapType: TrackingMapType
  clustersEnabled: boolean
  focusMode: 'fleet' | 'selected'
  fitToken: number
  onMarkerClick: (carId: string) => void
  onDraftGeofenceChange: (draft: DraftGeofenceShape) => void
  onDraftGeofenceDrawn: (draft: DraftGeofenceShape) => void
}

/* ── SVG builders ───────────────────────────────────────────── */

const buildStatusMarkerSvg = (color: string, selected: boolean) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(8,17,31,0.42)"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <circle cx="28" cy="28" r="${selected ? 18 : 15}" fill="${color}" opacity="${selected ? 0.22 : 0.12}" />
      <circle cx="28" cy="28" r="${selected ? 11 : 9}" fill="${color}" stroke="${selected ? '#ffffff' : color}" stroke-width="${selected ? 3 : 1}" />
    </g>
  </svg>
`.trim()

const buildVehicleSvg = (bodyColor: string, accentColor: string, rotation: number) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(15,23,42,0.35)"/>
      </filter>
    </defs>
    <g transform="rotate(${rotation} 36 36)" filter="url(#shadow)">
      <path d="M36 7C24 7 17 15 17 25v21c0 6 5 11 11 11h16c6 0 11-5 11-11V25C55 15 48 7 36 7Z" fill="${bodyColor}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M27 17h18c4 0 7 3 7 7v8H20v-8c0-4 3-7 7-7Z" fill="${accentColor}" fill-opacity="0.95"/>
      <path d="M24 37h24v8c0 3-3 6-6 6H30c-3 0-6-3-6-6v-8Z" fill="#ffffff" fill-opacity="0.18"/>
      <circle cx="28" cy="47" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
      <circle cx="44" cy="47" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
      <path d="M36 6l7 10H29L36 6Z" fill="#ffffff" fill-opacity="0.9"/>
    </g>
  </svg>
`.trim()

/* ── MapShapes: imperatively renders circles, polygons, polylines, rectangles ── */

type MapShapesProps = {
  geofenceShapes: ParsedGeofence[]
  routePathPoints: LatLngTuple[]
}

const MapShapes = ({ geofenceShapes, routePathPoints }: MapShapesProps) => {
  const map = useMap()
  const shapesRef = useRef<google.maps.MVCObject[]>([])

  useEffect(() => {
    if (!map) {
      return undefined
    }

    // Clear previous shapes
    shapesRef.current.forEach((s) => (s as any).setMap(null))
    shapesRef.current = []

    // Render geofence shapes
    geofenceShapes.forEach((geofence) => {
      if (geofence.shape === 'circle' && geofence.center && geofence.radius) {
        const circle = new google.maps.Circle({
          map,
          center: toGoogleLatLng(geofence.center),
          radius: geofence.radius,
          strokeColor: '#22d3ee',
          fillColor: '#22d3ee',
          fillOpacity: 0.1,
          strokeWeight: 2,
          clickable: false,
        })
        shapesRef.current.push(circle)
      }

      if (geofence.shape === 'rectangle' && geofence.bounds) {
        const north = Math.max(geofence.bounds[0][0], geofence.bounds[1][0])
        const south = Math.min(geofence.bounds[0][0], geofence.bounds[1][0])
        const east = Math.max(geofence.bounds[0][1], geofence.bounds[1][1])
        const west = Math.min(geofence.bounds[0][1], geofence.bounds[1][1])

        const rectangle = new google.maps.Rectangle({
          map,
          bounds: { north, south, east, west },
          strokeColor: '#22d3ee',
          fillColor: '#22d3ee',
          fillOpacity: 0.1,
          strokeWeight: 2,
          clickable: false,
        })
        shapesRef.current.push(rectangle)
      }

      if (geofence.shape === 'polygon' && geofence.points) {
        const polygon = new google.maps.Polygon({
          map,
          paths: geofence.points.map(toGoogleLatLng),
          strokeColor: '#22d3ee',
          fillColor: '#22d3ee',
          fillOpacity: 0.1,
          strokeWeight: 2,
          clickable: false,
        })
        shapesRef.current.push(polygon)
      }

      if (geofence.shape === 'polyline' && geofence.points) {
        const polyline = new google.maps.Polyline({
          map,
          path: geofence.points.map(toGoogleLatLng),
          strokeColor: '#22d3ee',
          strokeWeight: 4,
          strokeOpacity: 0.92,
          clickable: false,
        })
        shapesRef.current.push(polyline)
      }

      if (geofence.shape === 'geojson' && geofence.geojson) {
        extractGeoJsonPaths(geofence.geojson).forEach((ring) => {
          const polygon = new google.maps.Polygon({
            map,
            paths: ring.map(toGoogleLatLng),
            strokeColor: '#22d3ee',
            fillColor: '#22d3ee',
            fillOpacity: 0.1,
            strokeWeight: 2,
            clickable: false,
          })
          shapesRef.current.push(polygon)
        })
      }
    })

    // Route polyline
    if (routePathPoints.length > 1) {
      const polyline = new google.maps.Polyline({
        map,
        path: routePathPoints.map(toGoogleLatLng),
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.86,
        clickable: false,
      })
      shapesRef.current.push(polyline)
    }

    return () => {
      shapesRef.current.forEach((s) => (s as any).setMap(null))
      shapesRef.current = []
    }
  }, [map, geofenceShapes, routePathPoints])

  return null
}

/* ── DraftGeofenceOverlay: editable draft shapes ── */

type DraftGeofenceOverlayProps = {
  draftGeofence: DraftGeofenceShape | null
  onDraftGeofenceChange: (draft: DraftGeofenceShape) => void
}

const DraftGeofenceOverlay = ({ draftGeofence, onDraftGeofenceChange }: DraftGeofenceOverlayProps) => {
  const map = useMap()
  const draftCircleRef = useRef<google.maps.Circle | null>(null)
  const draftPolygonRef = useRef<google.maps.Polygon | null>(null)
  const draftPolylineRef = useRef<google.maps.Polyline | null>(null)
  const listenersRef = useRef<google.maps.MapsEventListener[]>([])

  const clearListeners = useCallback(() => {
    listenersRef.current.forEach((l) => l.remove())
    listenersRef.current = []
  }, [])

  useEffect(() => {
    if (!map) {
      return undefined
    }

    // Remove previous overlays
    draftCircleRef.current?.setMap(null)
    draftPolygonRef.current?.setMap(null)
    draftPolylineRef.current?.setMap(null)
    clearListeners()
    draftCircleRef.current = null
    draftPolygonRef.current = null
    draftPolylineRef.current = null

    if (!draftGeofence) {
      return undefined
    }

    const draftOptions = {
      strokeColor: '#f97316',
      fillColor: '#fb923c',
      fillOpacity: 0.16,
      strokeWeight: 3,
      zIndex: 90,
      editable: true,
      draggable: true,
    }

    if (draftGeofence.type === 'circle') {
      const circle = new google.maps.Circle({
        map,
        center: toGoogleLatLng(draftGeofence.center),
        radius: draftGeofence.radius,
        ...draftOptions,
      })
      draftCircleRef.current = circle

      const syncCircle = () => {
        const center = circle.getCenter()
        const radius = circle.getRadius()
        if (center && typeof radius === 'number' && Number.isFinite(radius)) {
          onDraftGeofenceChange({ type: 'circle', center: fromGoogleLatLng(center), radius })
        }
      }

      listenersRef.current.push(
        google.maps.event.addListener(circle, 'center_changed', syncCircle),
        google.maps.event.addListener(circle, 'radius_changed', syncCircle),
        google.maps.event.addListener(circle, 'dragend', syncCircle),
        google.maps.event.addListener(circle, 'mouseup', syncCircle),
      )
    }

    if (draftGeofence.type === 'polygon') {
      const polygon = new google.maps.Polygon({
        map,
        paths: draftGeofence.points.map(toGoogleLatLng),
        ...draftOptions,
      })
      draftPolygonRef.current = polygon

      const syncPolygon = () => {
        onDraftGeofenceChange({ type: 'polygon', points: fromGooglePath(polygon.getPath()) })
      }

      const path = polygon.getPath()
      listenersRef.current.push(
        google.maps.event.addListener(path, 'insert_at', syncPolygon),
        google.maps.event.addListener(path, 'remove_at', syncPolygon),
        google.maps.event.addListener(path, 'set_at', syncPolygon),
        google.maps.event.addListener(polygon, 'dragend', syncPolygon),
        google.maps.event.addListener(polygon, 'mouseup', syncPolygon),
      )
    }

    if (draftGeofence.type === 'polyline') {
      const polyline = new google.maps.Polyline({
        map,
        path: draftGeofence.points.map(toGoogleLatLng),
        strokeColor: '#f97316',
        strokeWeight: 4,
        strokeOpacity: 0.95,
        zIndex: 90,
        editable: true,
        draggable: true,
      })
      draftPolylineRef.current = polyline

      const syncPolyline = () => {
        onDraftGeofenceChange({ type: 'polyline', points: fromGooglePath(polyline.getPath()) })
      }

      const path = polyline.getPath()
      listenersRef.current.push(
        google.maps.event.addListener(path, 'insert_at', syncPolyline),
        google.maps.event.addListener(path, 'remove_at', syncPolyline),
        google.maps.event.addListener(path, 'set_at', syncPolyline),
        google.maps.event.addListener(polyline, 'dragend', syncPolyline),
        google.maps.event.addListener(polyline, 'mouseup', syncPolyline),
      )
    }

    return () => {
      draftCircleRef.current?.setMap(null)
      draftPolygonRef.current?.setMap(null)
      draftPolylineRef.current?.setMap(null)
      clearListeners()
      draftCircleRef.current = null
      draftPolygonRef.current = null
      draftPolylineRef.current = null
    }
  }, [map, draftGeofence, onDraftGeofenceChange, clearListeners])

  return null
}

/* ── DrawingManagerOverlay: imperative drawing manager ── */

type DrawingManagerOverlayProps = {
  drawingMode: GeofenceEditorType | null
  onDraftGeofenceDrawn: (draft: DraftGeofenceShape) => void
}

const DrawingManagerOverlay = ({ drawingMode, onDraftGeofenceDrawn }: DrawingManagerOverlayProps) => {
  const map = useMap()

  useEffect(() => {
    if (!map || !drawingMode) {
      return undefined
    }

    const overlayTypeMap: Record<GeofenceEditorType, google.maps.drawing.OverlayType> = {
      circle: google.maps.drawing.OverlayType.CIRCLE,
      polygon: google.maps.drawing.OverlayType.POLYGON,
      polyline: google.maps.drawing.OverlayType.POLYLINE,
    }

    const sharedOptions = {
      clickable: false,
      editable: false,
    }

    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: overlayTypeMap[drawingMode],
      drawingControl: false,
      circleOptions: {
        ...sharedOptions,
        fillColor: '#fb923c',
        fillOpacity: 0.16,
        strokeColor: '#f97316',
        strokeWeight: 3,
      },
      polygonOptions: {
        ...sharedOptions,
        fillColor: '#fb923c',
        fillOpacity: 0.16,
        strokeColor: '#f97316',
        strokeWeight: 3,
      },
      polylineOptions: {
        ...sharedOptions,
        strokeColor: '#f97316',
        strokeWeight: 4,
        strokeOpacity: 0.95,
      },
    })

    manager.setMap(map)

    const listeners: google.maps.MapsEventListener[] = []

    listeners.push(
      google.maps.event.addListener(manager, 'circlecomplete', (circle: google.maps.Circle) => {
        const center = circle.getCenter()
        const radius = circle.getRadius()
        circle.setMap(null)
        if (center && Number.isFinite(radius)) {
          onDraftGeofenceDrawn({ type: 'circle', center: fromGoogleLatLng(center), radius })
        }
      }),
    )

    listeners.push(
      google.maps.event.addListener(manager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        const points = fromGooglePath(polygon.getPath())
        polygon.setMap(null)
        if (points.length >= 3) {
          onDraftGeofenceDrawn({ type: 'polygon', points })
        }
      }),
    )

    listeners.push(
      google.maps.event.addListener(manager, 'polylinecomplete', (polyline: google.maps.Polyline) => {
        const points = fromGooglePath(polyline.getPath())
        polyline.setMap(null)
        if (points.length >= 2) {
          onDraftGeofenceDrawn({ type: 'polyline', points })
        }
      }),
    )

    return () => {
      listeners.forEach((l) => l.remove())
      manager.setMap(null)
    }
  }, [map, drawingMode, onDraftGeofenceDrawn])

  return null
}

/* ── FitBoundsController: manages map bounds ── */

type FitBoundsControllerProps = {
  vehicles: FleetVehicle[]
  selectedVehicle: FleetVehicle | null
  selectedPoint: LatLngTuple | null
  routePathPoints: LatLngTuple[]
  geofenceShapes: ParsedGeofence[]
  draftGeofence: DraftGeofenceShape | null
  focusMode: 'fleet' | 'selected'
  fitToken: number
  visibleVehicles: FleetVehicle[]
}

const FitBoundsController = ({
  selectedVehicle,
  selectedPoint,
  routePathPoints,
  geofenceShapes,
  draftGeofence,
  focusMode,
  fitToken,
  visibleVehicles,
}: FitBoundsControllerProps) => {
  const map = useMap()

  useEffect(() => {
    if (!map) {
      return
    }

    const bounds = new google.maps.LatLngBounds()
    let hasBounds = false
    let pointCount = 0

    const extend = (point: LatLngTuple) => {
      bounds.extend(toGoogleLatLng(point))
      hasBounds = true
      pointCount += 1
    }

    if (focusMode === 'selected' && selectedVehicle) {
      if (selectedPoint) {
        extend(selectedPoint)
      }

      routePathPoints.forEach(extend)

      geofenceShapes.forEach((shape) => {
        if (shape.center) {
          extend(shape.center)
        }
        shape.points?.forEach(extend)
        if (shape.bounds) {
          extend(shape.bounds[0])
          extend(shape.bounds[1])
        }
        if (shape.geojson) {
          extractGeoJsonPaths(shape.geojson).forEach((ring) => ring.forEach(extend))
        }
      })

      if (draftGeofence?.type === 'circle') {
        extend(draftGeofence.center)
      } else {
        draftGeofence?.points.forEach(extend)
      }
    } else {
      visibleVehicles.forEach((vehicle) => vehicle.point && extend(vehicle.point))
    }

    if (!hasBounds) {
      map.setCenter(toGoogleLatLng(DEFAULT_CENTER))
      map.setZoom(10)
      return
    }

    if (pointCount <= 1 && selectedPoint) {
      map.panTo(toGoogleLatLng(selectedPoint))
      map.setZoom(14)
      return
    }

    map.fitBounds(bounds, 80)
  }, [draftGeofence, fitToken, focusMode, geofenceShapes, map, routePathPoints, selectedPoint, selectedVehicle, visibleVehicles])

  return null
}

/* ── TrackingMap: main component ── */

const TrackingMap = ({
  vehicles,
  selectedVehicle,
  routePathPoints,
  playbackPoint,
  playbackHeading,
  geofenceShapes,
  draftGeofence,
  drawingMode,
  mapType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clustersEnabled,
  focusMode,
  fitToken,
  onMarkerClick,
  onDraftGeofenceChange,
  onDraftGeofenceDrawn,
}: TrackingMapProps) => {
  const selectedPoint = playbackPoint || selectedVehicle?.point || null
  const visibleVehicles = useMemo(() => vehicles.filter((item) => item.point), [vehicles])

  if (!env.GOOGLE_MAPS_API_KEY) {
    return <div className="tracking-google-map-fallback">Google Maps API key is missing.</div>
  }

  return (
    <APIProvider apiKey={env.GOOGLE_MAPS_API_KEY} libraries={['drawing']}>
      <Map
        mapId={env.GOOGLE_MAPS_MAP_ID}
        defaultCenter={{ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }}
        defaultZoom={10}
        disableDefaultUI
        clickableIcons={false}
        gestureHandling="greedy"
        mapTypeId={mapType}
        style={{ width: '100%', height: '100%' }}
      >
        <FitBoundsController
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          selectedPoint={selectedPoint}
          routePathPoints={routePathPoints}
          geofenceShapes={geofenceShapes}
          draftGeofence={draftGeofence}
          focusMode={focusMode}
          fitToken={fitToken}
          visibleVehicles={visibleVehicles}
        />

        <MapShapes
          geofenceShapes={geofenceShapes}
          routePathPoints={routePathPoints}
        />

        <DraftGeofenceOverlay
          draftGeofence={draftGeofence}
          onDraftGeofenceChange={onDraftGeofenceChange}
        />

        <DrawingManagerOverlay
          drawingMode={drawingMode}
          onDraftGeofenceDrawn={onDraftGeofenceDrawn}
        />

        {/* Vehicle markers */}
        {visibleVehicles.map((vehicle) => {
          const isSelected = vehicle.car._id === selectedVehicle?.car._id
          const point = isSelected && selectedPoint ? selectedPoint : vehicle.point
          if (!point) {
            return null
          }

          const color = getStatusColor(vehicle.status)
          const isSelectedWithVehicleIcon = isSelected && selectedPoint
          const markerSize = isSelectedWithVehicleIcon ? 44 : isSelected ? 38 : 30

          return (
            <AdvancedMarker
              key={vehicle.car._id}
              position={{ lat: point[0], lng: point[1] }}
              title={vehicle.car.name}
              zIndex={isSelected ? 100 : vehicle.status === 'moving' ? 80 : 40}
              onClick={() => onMarkerClick(vehicle.car._id)}
            >
              <div
                style={{
                  width: markerSize,
                  height: markerSize,
                  cursor: 'pointer',
                }}
                dangerouslySetInnerHTML={{
                  __html: isSelectedWithVehicleIcon
                    ? buildVehicleSvg('#0f172a', '#60a5fa', playbackHeading || 0)
                    : buildStatusMarkerSvg(color, isSelected),
                }}
              />
            </AdvancedMarker>
          )
        })}
      </Map>
    </APIProvider>
  )
}

export default TrackingMap
