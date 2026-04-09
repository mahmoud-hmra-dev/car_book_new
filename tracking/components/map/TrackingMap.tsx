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
  status?: string
  speed?: number
  batteryLevel?: number
  ignition?: boolean
  licensePlate?: string
  course?: number
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
  height?: number | string
  playbackIndex?: number
  playbackData?: { speed: number, time?: string, ignition?: boolean, course?: number }
}

const DEFAULT_CENTER = { lat: 33.8938, lng: 35.5018 }

const TrackingMap: React.FC<TrackingMapProps> = ({
  markers,
  route,
  circles,
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
  height = 400,
  playbackIndex,
  playbackData,
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
html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;font-family:-apple-system,sans-serif}
.vt{background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.18);min-width:180px;overflow:hidden}
.vt-h{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;color:#fff;font-size:11px;font-weight:700}
.vt-n{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.vt-s{font-size:9px;text-transform:uppercase;letter-spacing:.5px;padding:2px 6px;border-radius:8px;background:rgba(255,255,255,.25)}
.vt-b{padding:6px 10px 8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}
.vt-r{display:flex;align-items:center;gap:5px}
.vt-i{font-size:13px;opacity:.5}
.vt-l{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.3px}
.vt-v{font-size:11px;color:#333;font-weight:600}
.vt-p{text-align:center;padding:4px;background:#f5f5f5;font-size:10px;color:#666;font-weight:600;letter-spacing:1px;border-top:1px solid #eee}
</style>
</head><body>
<div id="map"></div>
<script>
var map,gMarkers=[],gRoute=null,gCircles=[];

function sc(s){return{moving:'#00D68F',idle:'#FFD93D',stopped:'#FF6B6B',stale:'#FB923C',noGps:'#A78BFA',offline:'#6C757D',unlinked:'#334155'}[s]||'#6C757D'}
function sl(s){return{moving:'Moving',idle:'Idle',stopped:'Stopped',stale:'Stale',noGps:'No GPS',offline:'Offline',unlinked:'Unlinked'}[s]||s||'Unknown'}

function carSvg(c){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">'
    +'<g filter="url(#sh)">'
    +'<rect x="12" y="8" width="24" height="32" rx="8" fill="'+c+'" stroke="#fff" stroke-width="2"/>'
    +'<rect x="15" y="11" width="18" height="8" rx="3" fill="rgba(255,255,255,0.35)"/>'
    +'<rect x="15" y="29" width="18" height="5" rx="2" fill="rgba(255,255,255,0.25)"/>'
    +'<circle cx="17" cy="32" r="1.5" fill="rgba(255,255,255,0.6)"/>'
    +'<circle cx="31" cy="32" r="1.5" fill="rgba(255,255,255,0.6)"/>'
    +'<rect x="9" y="14" width="4" height="6" rx="1.5" fill="'+c+'" stroke="#fff" stroke-width="1.5"/>'
    +'<rect x="35" y="14" width="4" height="6" rx="1.5" fill="'+c+'" stroke="#fff" stroke-width="1.5"/>'
    +'<rect x="9" y="28" width="4" height="6" rx="1.5" fill="'+c+'" stroke="#fff" stroke-width="1.5"/>'
    +'<rect x="35" y="28" width="4" height="6" rx="1.5" fill="'+c+'" stroke="#fff" stroke-width="1.5"/>'
    +'</g>'
    +'<defs><filter id="sh" x="-2" y="-2" width="52" height="52"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.25"/></filter></defs>'
    +'</svg>';
}

function tooltip(m){
  var c=sc(m.status);var lb=sl(m.status);
  var spd=m.speed!=null?Math.round(m.speed)+' km/h':'-';
  var bat=m.batteryLevel!=null?m.batteryLevel+'%':'-';
  var ign=m.ignition?'ON':'OFF';var ignC=m.ignition?'#00D68F':'#FF6B6B';
  var plate=m.licensePlate||'';
  var lu=m.lastUpdate||'';
  if(lu){try{var d=new Date(lu);if(!isNaN(d))lu=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(e){}}
  return '<div class="vt">'
    +'<div class="vt-h" style="background:'+c+'"><span class="vt-n">'+(m.label||'').replace(/</g,'&lt;')+'</span><span class="vt-s">'+lb+'</span></div>'
    +'<div class="vt-b">'
    +'<div class="vt-r"><span class="vt-i">&#x1F3CE;</span><div><div class="vt-l">Speed</div><div class="vt-v">'+spd+'</div></div></div>'
    +'<div class="vt-r"><span class="vt-i">&#x1F50B;</span><div><div class="vt-l">Battery</div><div class="vt-v">'+bat+'</div></div></div>'
    +'<div class="vt-r"><span class="vt-i" style="color:'+ignC+'">&#x26A1;</span><div><div class="vt-l">Ignition</div><div class="vt-v" style="color:'+ignC+'">'+ign+'</div></div></div>'
    +(lu?'<div class="vt-r"><span class="vt-i">&#x1F552;</span><div><div class="vt-l">Updated</div><div class="vt-v">'+lu+'</div></div></div>':'')
    +'</div>'
    +(plate?'<div class="vt-p">'+plate.replace(/</g,'&lt;')+'</div>':'')
    +'</div>';
}

function initMap(){
  map=new google.maps.Map(document.getElementById('map'),{
    center:{lat:${DEFAULT_CENTER.lat},lng:${DEFAULT_CENTER.lng}},
    zoom:6,
    disableDefaultUI:true,
    zoomControl:true,
    zoomControlOptions:{position:google.maps.ControlPosition.RIGHT_CENTER},
    mapTypeControl:false,streetViewControl:false,fullscreenControl:false,
    gestureHandling:'greedy',
    styles:[{featureType:'poi',stylers:[{visibility:'off'}]},{featureType:'transit',stylers:[{visibility:'off'}]}]
  });
  map.addListener('click',function(e){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapPress',lat:e.latLng.lat(),lng:e.latLng.lng()}));
  });
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
}

window.updateMarkers=function(data){
  gMarkers.forEach(function(m){m.setMap(null)});gMarkers=[];
  var bounds=new google.maps.LatLngBounds();var has=false;
  data.forEach(function(m){
    var sel=m.selected;var col=m.color||sc(m.status);var sz=sel?44:34;
    var mk=new google.maps.Marker({
      position:{lat:m.lat,lng:m.lng},map:map,
      icon:{url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(carSvg(col)),scaledSize:new google.maps.Size(sz,sz),anchor:new google.maps.Point(sz/2,sz/2)},
      zIndex:sel?100:10,optimized:false
    });
    var iw=new google.maps.InfoWindow({content:tooltip(m),maxWidth:220});
    mk.addListener('click',function(){iw.open(map,mk);window.ReactNativeWebView.postMessage(JSON.stringify({type:'marker',id:m.id}))});
    if(sel)iw.open(map,mk);
    gMarkers.push(mk);bounds.extend(mk.getPosition());has=true;
  });
  if(has){if(data.length===1){map.setCenter(bounds.getCenter());map.setZoom(15)}else map.fitBounds(bounds,{top:60,right:50,bottom:80,left:50})}
};

window.updateRoute=function(pts,color){
  if(gRoute){gRoute.setMap(null);gRoute=null}
  if(!pts||pts.length<2)return;
  var path=pts.map(function(p){return{lat:p[0],lng:p[1]}});
  gRoute=new google.maps.Polyline({
    path:path,strokeColor:color||'#00D68F',strokeOpacity:0.85,strokeWeight:4,map:map,
    icons:[{icon:{path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:3,fillColor:color||'#00D68F',fillOpacity:1,strokeWeight:0},offset:'100%'}]
  });
  var b=new google.maps.LatLngBounds();path.forEach(function(p){b.extend(p)});
  map.fitBounds(b,{top:60,right:50,bottom:130,left:50});
};

window.updateCircles=function(data){
  gCircles.forEach(function(c){c.setMap(null)});gCircles=[];
  data.forEach(function(c){
    gCircles.push(new google.maps.Circle({
      center:{lat:c.lat,lng:c.lng},radius:c.radius,
      strokeColor:c.color||'#00D68F',strokeOpacity:.8,strokeWeight:2,
      fillColor:c.fillColor||'rgba(0,214,143,0.15)',fillOpacity:.2,
      map:map,clickable:false
    }));
  });
};

var playMarker=null,playLine=null,playPositions=[];

window.setRouteForPlayback=function(pts){
  playPositions=pts;
};

window.setPlaybackPosition=function(data){
  if(!playPositions||!playPositions.length)return;
  var i=Math.min(Math.max(0,data.index),playPositions.length-1);
  var pos={lat:playPositions[i][0],lng:playPositions[i][1]};

  var spd=data.speed!=null?Math.round(data.speed):0;
  var spdColor=spd>80?'#FF6B6B':spd>0?'#00D68F':'#6C757D';
  var ign=data.ignition?'ON':'OFF';
  var ignColor=data.ignition?'#00D68F':'#FF6B6B';
  var tm=data.time||'';
  if(tm){try{var d=new Date(tm);if(!isNaN(d))tm=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch(e){}}

  var tip='<div style="font-family:-apple-system,sans-serif;min-width:160px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.15)">'
    +'<div style="background:linear-gradient(135deg,#00D68F,#00B377);padding:6px 10px;display:flex;align-items:center;justify-content:space-between">'
    +'<span style="color:#fff;font-size:11px;font-weight:700">'+tm+'</span>'
    +'</div>'
    +'<div style="text-align:center;padding:8px 10px 4px">'
    +'<div style="font-size:28px;font-weight:900;color:'+spdColor+'">'+spd+'</div>'
    +'<div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.5px">km/h</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#f0f0f0;margin:0 8px 8px;border-radius:8px;overflow:hidden">'
    +'<div style="background:#fff;padding:6px;text-align:center"><div style="font-size:9px;color:#999">IGN</div><div style="font-size:13px;font-weight:700;color:'+ignColor+'">'+ign+'</div></div>'
    +'<div style="background:#fff;padding:6px;text-align:center"><div style="font-size:9px;color:#999">Point</div><div style="font-size:13px;font-weight:700;color:#333">'+(i+1)+'/'+playPositions.length+'</div></div>'
    +'</div></div>';

  if(!playMarker){
    playMarker=new google.maps.Marker({position:pos,map:map,
      icon:{url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(carSvg('#00D68F')),scaledSize:new google.maps.Size(40,40),anchor:new google.maps.Point(20,20)},
      zIndex:300,optimized:false});
    window._playIW=new google.maps.InfoWindow({maxWidth:200});
    window._playIW.setContent(tip);
    window._playIW.open(map,playMarker);
  } else {
    playMarker.setPosition(pos);
    if(window._playIW){window._playIW.setContent(tip);window._playIW.open(map,playMarker)}
  }

  if(playLine)playLine.setMap(null);
  var traveled=playPositions.slice(0,i+1).map(function(p){return{lat:p[0],lng:p[1]}});
  if(traveled.length>1){
    playLine=new google.maps.Polyline({path:traveled,strokeColor:'#FF6B6B',strokeOpacity:1,strokeWeight:5,map:map,zIndex:50});
  }
  map.panTo(pos);
};

window.clearPlayback=function(){
  if(window._playIW){window._playIW.close();window._playIW=null}
  if(playMarker){playMarker.setMap(null);playMarker=null}
  if(playLine){playLine.setMap(null);playLine=null}
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
      webRef.current.injectJavaScript(`window.updateRoute(${JSON.stringify(route.points)},'${route.color || '#00D68F'}');true;`)
      webRef.current.injectJavaScript(`window.setRouteForPlayback(${JSON.stringify(route.points)});true;`)
    } else {
      webRef.current.injectJavaScript(`window.updateRoute(null);true;`)
    }

    if (circles && circles.length > 0) {
      webRef.current.injectJavaScript(`window.updateCircles(${JSON.stringify(circles)});true;`)
    } else {
      webRef.current.injectJavaScript(`window.updateCircles([]);true;`)
    }
  }, [markers, route, circles, selectedMarkerId])

  useEffect(() => {
    if (readyRef.current) sendUpdate()
    else pendingRef.current = true
  }, [sendUpdate])

  useEffect(() => {
    if (!webRef.current || !readyRef.current) return
    if (playbackIndex != null && playbackIndex >= 0 && playbackData) {
      const data = JSON.stringify({ index: playbackIndex, ...playbackData })
      webRef.current.injectJavaScript(`window.setPlaybackPosition(${data});true;`)
    }
  }, [playbackIndex, playbackData])

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'ready') {
        readyRef.current = true
        if (pendingRef.current) { pendingRef.current = false; sendUpdate() }
      } else if (data.type === 'marker' && data.id) {
        onMarkerPress?.(data.id)
      } else if (data.type === 'mapPress') {
        onMapPress?.(data.lat, data.lng)
      }
    } catch { /* ignore */ }
  }

  return (
    <View style={[styles.container, typeof height === 'number' ? { height } : { flex: 1 }]}>
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
  container: { width: '100%', overflow: 'hidden' },
  map: { flex: 1 },
})

export default TrackingMap
