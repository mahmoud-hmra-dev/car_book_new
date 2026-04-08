import React, { useRef, useEffect, useCallback } from 'react'
import { StyleSheet, View, Text, Platform } from 'react-native'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  color: string
  label?: string
  selected?: boolean
}

export interface MapRoute {
  points: [number, number][]
  color?: string
}

interface TrackingMapProps {
  markers: MapMarker[]
  route?: MapRoute
  selectedMarkerId?: string
  onMarkerPress?: (id: string) => void
  height?: number
}

const DEFAULT_REGION = {
  latitude: 33.8938,
  longitude: 35.5018,
  latitudeDelta: 5,
  longitudeDelta: 5,
}

// Web implementation using WebView + Leaflet
const TrackingMapWeb: React.FC<TrackingMapProps> = ({
  markers,
  route,
  selectedMarkerId,
  onMarkerPress,
  height = 300,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview')
  const webRef = useRef<any>(null)
  const readyRef = useRef(false)
  const pendingRef = useRef<string | null>(null)

  const buildHtml = () => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false}).setView([${DEFAULT_REGION.latitude},${DEFAULT_REGION.longitude}],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var markers=[],routeLine=null;
window.updateMarkers=function(data){
  markers.forEach(function(m){map.removeLayer(m)});markers=[];
  var bounds=[];
  data.forEach(function(m){
    var r=m.selected?10:7,o=m.selected?1:0.8;
    var c=L.circleMarker([m.lat,m.lng],{radius:r,fillColor:m.color,color:'#fff',weight:m.selected?3:2,fillOpacity:o});
    if(m.label)c.bindTooltip(m.label);
    c.on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'marker',id:m.id}))});
    c.addTo(map);markers.push(c);bounds.push([m.lat,m.lng]);
  });
  if(bounds.length>0)map.fitBounds(bounds,{padding:[40,40],maxZoom:15});
};
window.updateRoute=function(pts,color){
  if(routeLine){map.removeLayer(routeLine);routeLine=null}
  if(pts&&pts.length>1){
    routeLine=L.polyline(pts,{color:color||'#3b82f6',weight:4,opacity:0.86}).addTo(map);
    map.fitBounds(routeLine.getBounds(),{padding:[40,40]});
  }
};
window.mapReady=true;
window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
</script></body></html>`

  const sendUpdate = useCallback(() => {
    if (!webRef.current || !readyRef.current) return
    const markersJson = JSON.stringify(markers.map((m) => ({
      ...m,
      selected: m.id === selectedMarkerId || m.selected,
    })))
    webRef.current.injectJavaScript(`window.updateMarkers(${markersJson});true;`)

    if (route && route.points.length > 1) {
      const pts = JSON.stringify(route.points)
      webRef.current.injectJavaScript(`window.updateRoute(${pts},'${route.color || '#3b82f6'}');true;`)
    } else {
      webRef.current.injectJavaScript(`window.updateRoute(null);true;`)
    }
  }, [markers, route, selectedMarkerId])

  useEffect(() => {
    if (readyRef.current) sendUpdate()
    else pendingRef.current = 'update'
  }, [sendUpdate])

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'ready') {
        readyRef.current = true
        if (pendingRef.current) {
          pendingRef.current = null
          sendUpdate()
        }
      } else if (data.type === 'marker' && data.id) {
        onMarkerPress?.(data.id)
      }
    } catch {
      // ignore
    }
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: buildHtml() }}
        onMessage={handleMessage}
        style={styles.map}
        javaScriptEnabled
        scrollEnabled={false}
      />
    </View>
  )
}

// Native implementation using react-native-maps
const TrackingMapNative: React.FC<TrackingMapProps> = ({
  markers,
  route,
  selectedMarkerId,
  onMarkerPress,
  height = 300,
}) => {
  let MapView: any
  let Marker: any
  let Polyline: any
  let PROVIDER_GOOGLE: any
  try {
    const maps = require('react-native-maps')
    MapView = maps.default
    Marker = maps.Marker
    Polyline = maps.Polyline
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE
  } catch {
    // react-native-maps not available, fall back to web version
    return (
      <TrackingMapWeb
        markers={markers}
        route={route}
        selectedMarkerId={selectedMarkerId}
        onMarkerPress={onMarkerPress}
        height={height}
      />
    )
  }

  const mapRef = useRef<any>(null)
  const hasFittedRef = useRef(false)

  const fitToMarkers = useCallback(() => {
    if (!mapRef.current) return
    const coords = markers
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map((m) => ({ latitude: m.lat, longitude: m.lng }))
    if (coords.length === 0) return
    if (coords.length === 1) {
      mapRef.current.animateToRegion({
        ...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02,
      }, 400)
    } else {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      })
    }
  }, [markers])

  useEffect(() => {
    if (markers.length > 0 && !hasFittedRef.current) {
      const t = setTimeout(() => { fitToMarkers(); hasFittedRef.current = true }, 300)
      return () => clearTimeout(t)
    }
    return undefined
  }, [markers, fitToMarkers])

  useEffect(() => {
    if (!route || route.points.length < 2 || !mapRef.current) return
    const coords = route.points
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
      .map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
    if (coords.length > 1) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      })
    }
  }, [route])

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {markers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId || marker.selected
          const size = isSelected ? 24 : 16
          return (
            <Marker
              key={marker.id}
              identifier={marker.id}
              coordinate={{ latitude: marker.lat, longitude: marker.lng }}
              title={marker.label}
              onPress={() => onMarkerPress?.(marker.id)}
              zIndex={isSelected ? 100 : 10}
              tracksViewChanges={false}
            >
              <View style={styles.markerOuter}>
                <View
                  style={[styles.markerDot, {
                    width: size, height: size, borderRadius: size / 2,
                    backgroundColor: marker.color,
                    borderWidth: isSelected ? 3 : 2,
                    borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                  }]}
                />
                {isSelected && marker.label && (
                  <View style={styles.calloutBubble}>
                    <Text style={styles.calloutText} numberOfLines={1}>{marker.label}</Text>
                  </View>
                )}
              </View>
            </Marker>
          )
        })}
        {route && route.points.length > 1 && (
          <Polyline
            coordinates={route.points
              .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
              .map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
            strokeColor={route.color || '#3b82f6'}
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  )
}

// Auto-select implementation based on platform
const TrackingMap: React.FC<TrackingMapProps> = (props) => {
  if (Platform.OS === 'web') {
    return <TrackingMapWeb {...props} />
  }
  return <TrackingMapNative {...props} />
}

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  markerOuter: { alignItems: 'center' },
  markerDot: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  calloutBubble: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    maxWidth: 140,
  },
  calloutText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
})

export default TrackingMap
