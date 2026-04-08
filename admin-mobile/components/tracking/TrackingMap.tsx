import React, { useRef, useEffect, useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { GOOGLE_MAPS_API_KEY } from '@/config/env.config'

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

export interface MapCircle {
  id: string
  lat: number
  lng: number
  radius: number
  color: string
  fillColor?: string
  label?: string
}

interface TrackingMapProps {
  markers: MapMarker[]
  route?: MapRoute
  circles?: MapCircle[]
  selectedMarkerId?: string
  onMarkerPress?: (id: string) => void
  onMapPress?: (lat: number, lng: number) => void
  height?: number
}

const DEFAULT_CENTER = { lat: 33.8938, lng: 35.5018 }

const TrackingMap: React.FC<TrackingMapProps> = ({
  markers,
  route,
  circles,
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
  height = 300,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview')
  const webRef = useRef<any>(null)
  const readyRef = useRef(false)
  const pendingRef = useRef(false)

  const buildHtml = () => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden}</style>
</head><body>
<div id="map"></div>
<script>
var map,gMarkers=[],gRoute=null,gCircles=[],gInfoWindow=null;

function initMap(){
  map=new google.maps.Map(document.getElementById('map'),{
    center:{lat:${DEFAULT_CENTER.lat},lng:${DEFAULT_CENTER.lng}},
    zoom:6,
    disableDefaultUI:true,
    zoomControl:true,
    zoomControlOptions:{position:google.maps.ControlPosition.RIGHT_CENTER},
    mapTypeControl:false,
    streetViewControl:false,
    fullscreenControl:false,
    gestureHandling:'greedy',
    styles:[
      {featureType:'poi',stylers:[{visibility:'off'}]},
      {featureType:'transit',stylers:[{visibility:'off'}]}
    ]
  });
  gInfoWindow=new google.maps.InfoWindow();

  map.addListener('click',function(e){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapPress',lat:e.latLng.lat(),lng:e.latLng.lng()}));
  });

  window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
}

window.updateMarkers=function(data){
  gMarkers.forEach(function(m){m.setMap(null)});
  gMarkers=[];
  var bounds=new google.maps.LatLngBounds();
  var hasBounds=false;

  data.forEach(function(m){
    var isSelected=m.selected;
    var marker=new google.maps.Marker({
      position:{lat:m.lat,lng:m.lng},
      map:map,
      icon:{
        path:google.maps.SymbolPath.CIRCLE,
        scale:isSelected?12:8,
        fillColor:m.color,
        fillOpacity:isSelected?1:0.85,
        strokeColor:'#ffffff',
        strokeWeight:isSelected?3:2
      },
      zIndex:isSelected?100:10,
      title:m.label||''
    });

    marker.addListener('click',function(){
      if(m.label){
        gInfoWindow.setContent('<div style="font:bold 12px sans-serif;padding:2px 4px">'+m.label+'</div>');
        gInfoWindow.open(map,marker);
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'marker',id:m.id}));
    });

    gMarkers.push(marker);
    bounds.extend(marker.getPosition());
    hasBounds=true;
  });

  if(hasBounds){
    if(data.length===1){
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    } else {
      map.fitBounds(bounds,{top:50,right:50,bottom:50,left:50});
    }
  }
};

window.updateRoute=function(pts,color){
  if(gRoute){gRoute.setMap(null);gRoute=null}
  if(!pts||pts.length<2)return;
  var path=pts.map(function(p){return{lat:p[0],lng:p[1]}});
  gRoute=new google.maps.Polyline({
    path:path,
    strokeColor:color||'#6B3CE6',
    strokeOpacity:0.9,
    strokeWeight:4,
    map:map
  });
  var bounds=new google.maps.LatLngBounds();
  path.forEach(function(p){bounds.extend(p)});
  map.fitBounds(bounds,{top:50,right:50,bottom:50,left:50});
};

window.updateCircles=function(data){
  gCircles.forEach(function(c){c.setMap(null)});
  gCircles=[];
  data.forEach(function(c){
    var circle=new google.maps.Circle({
      center:{lat:c.lat,lng:c.lng},
      radius:c.radius,
      strokeColor:c.color||'#6B3CE6',
      strokeOpacity:0.8,
      strokeWeight:2,
      fillColor:c.fillColor||'rgba(107,60,230,0.15)',
      fillOpacity:0.2,
      map:map,
      clickable:false
    });
    gCircles.push(circle);
  });
};
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap" async defer></script>
</body></html>`

  const sendUpdate = useCallback(() => {
    if (!webRef.current || !readyRef.current) return

    const markersJson = JSON.stringify(markers.map((m) => ({
      ...m,
      selected: m.id === selectedMarkerId || m.selected,
    })))
    webRef.current.injectJavaScript(`window.updateMarkers(${markersJson});true;`)

    if (route && route.points.length > 1) {
      const pts = JSON.stringify(route.points)
      webRef.current.injectJavaScript(`window.updateRoute(${pts},'${route.color || '#6B3CE6'}');true;`)
    } else {
      webRef.current.injectJavaScript(`window.updateRoute(null);true;`)
    }

    if (circles && circles.length > 0) {
      const circlesJson = JSON.stringify(circles)
      webRef.current.injectJavaScript(`window.updateCircles(${circlesJson});true;`)
    } else {
      webRef.current.injectJavaScript(`window.updateCircles([]);true;`)
    }
  }, [markers, route, circles, selectedMarkerId])

  useEffect(() => {
    if (readyRef.current) sendUpdate()
    else pendingRef.current = true
  }, [sendUpdate])

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'ready') {
        readyRef.current = true
        if (pendingRef.current) {
          pendingRef.current = false
          sendUpdate()
        }
      } else if (data.type === 'marker' && data.id) {
        onMarkerPress?.(data.id)
      } else if (data.type === 'mapPress') {
        onMapPress?.(data.lat, data.lng)
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
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        mixedContentMode="always"
        androidLayerType="hardware"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
})

export default TrackingMap
