import React, { useRef, useEffect, useCallback } from 'react'
import { StyleSheet, View, Pressable, Platform, StatusBar } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { GOOGLE_MAPS_API_KEY } from '@/config/env.config'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  color: string
  label?: string
  selected?: boolean
  // Rich vehicle data
  status?: string
  speed?: number
  batteryLevel?: number
  ignition?: boolean
  licensePlate?: string
  course?: number
  sat?: number
  lastUpdate?: string
  address?: string
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
  onMyLocationPress?: () => void
  height?: number
  showMyLocation?: boolean
  myLocationLat?: number
  myLocationLng?: number
}

const DEFAULT_CENTER = { lat: 33.8938, lng: 35.5018 }

const STATUS_LABELS: Record<string, string> = {
  moving: 'Moving',
  idle: 'Idle',
  stopped: 'Stopped',
  stale: 'Stale',
  noGps: 'No GPS',
  offline: 'Offline',
  unlinked: 'Unlinked',
}

const TrackingMap: React.FC<TrackingMapProps> = ({
  markers,
  route,
  circles,
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
  onMyLocationPress,
  height = 300,
  showMyLocation,
  myLocationLat,
  myLocationLng,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview')
  const webRef = useRef<any>(null)
  const readyRef = useRef(false)
  const pendingRef = useRef(false)

  const buildHtml = () => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}

.vehicle-tooltip{
  position:relative;
  background:#fff;
  border-radius:10px;
  box-shadow:0 2px 12px rgba(0,0,0,0.18);
  padding:0;
  min-width:180px;
  overflow:hidden;
  cursor:pointer;
}
.vt-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:6px 10px;color:#fff;font-size:11px;font-weight:700;
}
.vt-name{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.vt-status{font-size:9px;text-transform:uppercase;letter-spacing:0.5px;padding:2px 6px;border-radius:8px;background:rgba(255,255,255,0.25)}
.vt-body{padding:6px 10px 8px;display:grid;grid-template-columns:1fr 1fr;gap:3px 12px}
.vt-row{display:flex;align-items:center;gap:4px}
.vt-icon{font-size:12px;opacity:0.5}
.vt-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:0.3px}
.vt-val{font-size:11px;color:#333;font-weight:600}
.vt-plate{
  text-align:center;padding:4px;background:#f5f5f5;
  font-size:10px;color:#666;font-weight:600;letter-spacing:1px;
  border-top:1px solid #eee;
}

.car-marker{
  width:32px;height:32px;position:relative;
  filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  transition:transform 0.3s;
}
.car-marker.selected{transform:scale(1.3)}
.my-loc{
  width:16px;height:16px;border-radius:50%;
  background:#4285F4;border:3px solid #fff;
  box-shadow:0 0 0 2px rgba(66,133,244,0.3),0 2px 6px rgba(0,0,0,0.3);
}
.my-loc-pulse{
  position:absolute;width:40px;height:40px;border-radius:50%;
  background:rgba(66,133,244,0.12);
  top:50%;left:50%;transform:translate(-50%,-50%);
  animation:pulse 2s infinite;
}
@keyframes pulse{0%{transform:translate(-50%,-50%) scale(0.8);opacity:1}100%{transform:translate(-50%,-50%) scale(2);opacity:0}}
</style>
</head><body>
<div id="map"></div>
<script>
var map,gMarkers=[],gOverlays=[],gRoute=null,gCircles=[],gMyLoc=null,gMyLocCircle=null;

function carSvg(color,heading){
  var rot=heading||0;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" transform="rotate('+rot+')">'
    +'<path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="'+color+'" stroke="#fff" stroke-width="1.2"/>'
    +'</svg>';
}

function statusColor(s){
  var c={'moving':'#10b981','idle':'#f59e0b','stopped':'#3b82f6','stale':'#fb923c','noGps':'#a78bfa','offline':'#64748b','unlinked':'#334155'};
  return c[s]||'#64748b';
}

function statusLabel(s){
  var l={'moving':'Moving','idle':'Idle','stopped':'Stopped','stale':'Stale','noGps':'No GPS','offline':'Offline','unlinked':'Unlinked'};
  return l[s]||s||'Unknown';
}

function batteryIcon(b){
  if(b==null)return '';
  if(b>75)return '\\u{1F50B}';
  if(b>20)return '\\u{1FAAB}';
  return '\\u26A0\\uFE0F';
}

function buildTooltip(m){
  var sc=statusColor(m.status);
  var sl=statusLabel(m.status);
  var spd=m.speed!=null?Math.round(m.speed)+' km/h':'-';
  var bat=m.batteryLevel!=null?m.batteryLevel+'%':'-';
  var ign=m.ignition?'ON':'OFF';
  var ignColor=m.ignition?'#10b981':'#ef4444';
  var sat=m.sat!=null?m.sat:'-';
  var plate=m.licensePlate||'';
  var lastUp=m.lastUpdate||'';
  if(lastUp){try{var d=new Date(lastUp);lastUp=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(e){}}

  return '<div class="vehicle-tooltip">'
    +'<div class="vt-header" style="background:'+sc+'">'
    +'<span class="vt-name">'+((m.label||'').replace(/</g,'&lt;'))+'</span>'
    +'<span class="vt-status">'+sl+'</span>'
    +'</div>'
    +'<div class="vt-body">'
    +'<div class="vt-row"><span class="vt-icon">\\u{1F3CE}</span><div><div class="vt-label">Speed</div><div class="vt-val">'+spd+'</div></div></div>'
    +'<div class="vt-row"><span class="vt-icon">\\u{1F50B}</span><div><div class="vt-label">Battery</div><div class="vt-val">'+bat+'</div></div></div>'
    +'<div class="vt-row"><span class="vt-icon" style="color:'+ignColor+'">\\u26A1</span><div><div class="vt-label">Ignition</div><div class="vt-val" style="color:'+ignColor+'">'+ign+'</div></div></div>'
    +'<div class="vt-row"><span class="vt-icon">\\u{1F6F0}</span><div><div class="vt-label">Satellites</div><div class="vt-val">'+sat+'</div></div></div>'
    +(lastUp?'<div class="vt-row" style="grid-column:span 2"><span class="vt-icon">\\u{1F552}</span><div><div class="vt-label">Last Update</div><div class="vt-val">'+lastUp+'</div></div></div>':'')
    +'</div>'
    +(plate?'<div class="vt-plate">'+plate.replace(/</g,'&lt;')+'</div>':'')
    +'</div>';
}

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

  map.addListener('click',function(e){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapPress',lat:e.latLng.lat(),lng:e.latLng.lng()}));
  });

  window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
}

window.updateMarkers=function(data){
  gMarkers.forEach(function(m){m.setMap(null)});
  gOverlays.forEach(function(o){o.setMap(null)});
  gMarkers=[];
  gOverlays=[];
  var bounds=new google.maps.LatLngBounds();
  var hasBounds=false;

  data.forEach(function(m){
    var isSelected=m.selected;
    var sc=m.color||statusColor(m.status);
    var heading=m.course||0;

    // Car icon marker
    var marker=new google.maps.Marker({
      position:{lat:m.lat,lng:m.lng},
      map:map,
      icon:{
        url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(carSvg(sc,heading)),
        scaledSize:new google.maps.Size(isSelected?40:30,isSelected?40:30),
        anchor:new google.maps.Point(isSelected?20:15,isSelected?20:15)
      },
      zIndex:isSelected?100:10,
      optimized:false
    });

    // Always-visible label above car
    var labelOverlay=new google.maps.Marker({
      position:{lat:m.lat,lng:m.lng},
      map:map,
      icon:{
        url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
        ),
        scaledSize:new google.maps.Size(1,1),
        anchor:new google.maps.Point(0,0)
      },
      label:{
        text:(m.label||'').substring(0,18),
        color:'#333',
        fontSize:'10px',
        fontWeight:'700',
        className:'marker-label'
      },
      zIndex:isSelected?99:9,
      clickable:false
    });
    gOverlays.push(labelOverlay);

    // Rich tooltip on click
    var iw=new google.maps.InfoWindow({content:buildTooltip(m),maxWidth:220});
    marker.addListener('click',function(){
      iw.open(map,marker);
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'marker',id:m.id}));
    });
    if(isSelected){iw.open(map,marker)}

    gMarkers.push(marker);
    bounds.extend(marker.getPosition());
    hasBounds=true;
  });

  if(hasBounds){
    if(data.length===1){
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    } else {
      map.fitBounds(bounds,{top:60,right:50,bottom:120,left:50});
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
    map:map,
    icons:[{
      icon:{path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:3,strokeColor:color||'#6B3CE6'},
      offset:'100%'
    }]
  });
  var bounds=new google.maps.LatLngBounds();
  path.forEach(function(p){bounds.extend(p)});
  map.fitBounds(bounds,{top:60,right:50,bottom:120,left:50});
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

window.showMyLocation=function(lat,lng){
  if(gMyLoc){gMyLoc.setMap(null)}
  if(gMyLocCircle){gMyLocCircle.setMap(null)}
  gMyLoc=new google.maps.Marker({
    position:{lat:lat,lng:lng},
    map:map,
    icon:{
      url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">'
        +'<circle cx="20" cy="20" r="18" fill="rgba(66,133,244,0.12)"><animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/></circle>'
        +'<circle cx="20" cy="20" r="7" fill="#4285F4" stroke="#fff" stroke-width="2.5"/>'
        +'</svg>'
      ),
      scaledSize:new google.maps.Size(40,40),
      anchor:new google.maps.Point(20,20)
    },
    zIndex:200,
    clickable:false
  });
  gMyLocCircle=new google.maps.Circle({
    center:{lat:lat,lng:lng},
    radius:50,
    strokeColor:'#4285F4',
    strokeOpacity:0.2,
    strokeWeight:1,
    fillColor:'#4285F4',
    fillOpacity:0.08,
    map:map,
    clickable:false
  });
};

window.centerOnLocation=function(lat,lng){
  map.setCenter({lat:lat,lng:lng});
  map.setZoom(16);
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

    if (showMyLocation && myLocationLat != null && myLocationLng != null) {
      webRef.current.injectJavaScript(`window.showMyLocation(${myLocationLat},${myLocationLng});true;`)
    }
  }, [markers, route, circles, selectedMarkerId, showMyLocation, myLocationLat, myLocationLng])

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

  const handleMyLocation = () => {
    if (onMyLocationPress) {
      onMyLocationPress()
    }
    if (myLocationLat != null && myLocationLng != null && webRef.current && readyRef.current) {
      webRef.current.injectJavaScript(`window.centerOnLocation(${myLocationLat},${myLocationLng});true;`)
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
      {/* My Location button */}
      <Pressable style={styles.myLocBtn} onPress={handleMyLocation}>
        <MaterialIcons name="my-location" size={22} color="#666" />
      </Pressable>
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
  myLocBtn: {
    position: 'absolute',
    right: 10,
    bottom: Platform.OS === 'ios' ? 24 : 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
})

export default TrackingMap
