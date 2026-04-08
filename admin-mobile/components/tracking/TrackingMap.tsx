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

export interface PlaybackPosition {
  lat: number
  lng: number
  speed: number
  sat?: number
  accuracy?: number
  time?: string
  address?: string
  course?: number
  batteryLevel?: number
  ignition?: boolean
  deviceStatus?: string
}

export interface PlaybackState {
  playing: boolean
  progress: number
  animSpeed: number
  position?: PlaybackPosition
}

interface TrackingMapProps {
  markers: MapMarker[]
  route?: MapRoute
  circles?: MapCircle[]
  selectedMarkerId?: string
  onMarkerPress?: (id: string) => void
  onMapPress?: (lat: number, lng: number) => void
  height?: number
  showMyLocation?: boolean
  myLocationLat?: number
  myLocationLng?: number
  playback?: PlaybackState
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
  showMyLocation,
  myLocationLat,
  myLocationLng,
  playback,
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
  background:#fff;border-radius:10px;
  box-shadow:0 2px 12px rgba(0,0,0,0.18);
  min-width:185px;overflow:hidden;
}
.vt-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:7px 10px;color:#fff;font-size:11px;font-weight:700;
}
.vt-name{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.vt-status{font-size:9px;text-transform:uppercase;letter-spacing:.5px;padding:2px 6px;border-radius:8px;background:rgba(255,255,255,.25)}
.vt-body{padding:6px 10px 8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}
.vt-row{display:flex;align-items:center;gap:5px}
.vt-icon{font-size:13px;opacity:.5}
.vt-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.3px}
.vt-val{font-size:11px;color:#333;font-weight:600}
.vt-plate{text-align:center;padding:4px;background:#f5f5f5;font-size:10px;color:#666;font-weight:600;letter-spacing:1px;border-top:1px solid #eee}

.my-loc-btn{
  position:absolute;right:10px;background:#fff;width:40px;height:40px;border-radius:2px;
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  box-shadow:0 1px 4px rgba(0,0,0,.3);z-index:5;
}
.my-loc-btn:hover{background:#f5f5f5}
.my-loc-btn svg{width:22px;height:22px}
</style>
</head><body>
<div id="map"></div>
<script>
var map,gMarkers=[],gLabels=[],gRoute=null,gCircles=[];
var gMyLoc=null,gMyLocCircle=null;
var playMarker=null,playLine=null,playTimer=null,playPositions=[];

function statusColor(s){
  return{moving:'#10b981',idle:'#f59e0b',stopped:'#3b82f6',stale:'#fb923c',noGps:'#a78bfa',offline:'#64748b',unlinked:'#334155'}[s]||'#64748b';
}
function statusLabel(s){
  return{moving:'Moving',idle:'Idle',stopped:'Stopped',stale:'Stale',noGps:'No GPS',offline:'Offline',unlinked:'Unlinked'}[s]||s||'Unknown';
}

function carSvg(color){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">'
    +'<g filter="url(#shadow)">'
    +'<rect x="12" y="8" width="24" height="32" rx="8" fill="'+color+'" stroke="#fff" stroke-width="2"/>'
    +'<rect x="15" y="11" width="18" height="8" rx="3" fill="rgba(255,255,255,0.35)"/>'
    +'<rect x="15" y="29" width="18" height="5" rx="2" fill="rgba(255,255,255,0.25)"/>'
    +'<circle cx="17" cy="32" r="1.5" fill="rgba(255,255,255,0.6)"/>'
    +'<circle cx="31" cy="32" r="1.5" fill="rgba(255,255,255,0.6)"/>'
    +'<rect x="9" y="14" width="4" height="6" rx="1.5" fill="'+color+'" stroke="#fff" stroke-width="1.5"/>'
    +'<rect x="35" y="14" width="4" height="6" rx="1.5" fill="'+color+'" stroke="#fff" stroke-width="1.5"/>'
    +'<rect x="9" y="28" width="4" height="6" rx="1.5" fill="'+color+'" stroke="#fff" stroke-width="1.5"/>'
    +'<rect x="35" y="28" width="4" height="6" rx="1.5" fill="'+color+'" stroke="#fff" stroke-width="1.5"/>'
    +'</g>'
    +'<defs><filter id="shadow" x="-2" y="-2" width="52" height="52"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.25"/></filter></defs>'
    +'</svg>';
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
  if(lastUp){try{var d=new Date(lastUp);if(!isNaN(d))lastUp=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(e){}}

  return '<div class="vehicle-tooltip">'
    +'<div class="vt-header" style="background:'+sc+'">'
    +'<span class="vt-name">'+(m.label||'').replace(/</g,'&lt;')+'</span>'
    +'<span class="vt-status">'+sl+'</span></div>'
    +'<div class="vt-body">'
    +'<div class="vt-row"><span class="vt-icon">&#x1F3CE;</span><div><div class="vt-label">Speed</div><div class="vt-val">'+spd+'</div></div></div>'
    +'<div class="vt-row"><span class="vt-icon">&#x1F50B;</span><div><div class="vt-label">Battery</div><div class="vt-val">'+bat+'</div></div></div>'
    +'<div class="vt-row"><span class="vt-icon" style="color:'+ignColor+'">&#x26A1;</span><div><div class="vt-label">Ignition</div><div class="vt-val" style="color:'+ignColor+'">'+ign+'</div></div></div>'
    +'<div class="vt-row"><span class="vt-icon">&#x1F6F0;</span><div><div class="vt-label">Satellites</div><div class="vt-val">'+sat+'</div></div></div>'
    +(lastUp?'<div class="vt-row" style="grid-column:span 2"><span class="vt-icon">&#x1F552;</span><div><div class="vt-label">Last Update</div><div class="vt-val">'+lastUp+'</div></div></div>':'')
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

  // My location custom button - placed below zoom controls
  var myLocDiv=document.createElement('div');
  myLocDiv.className='my-loc-btn';
  myLocDiv.style.marginRight='10px';
  myLocDiv.style.marginBottom='10px';
  myLocDiv.innerHTML='<svg viewBox="0 0 24 24" fill="#666"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>';
  myLocDiv.addEventListener('click',function(){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'myLocation'}));
  });
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(myLocDiv);

  map.addListener('click',function(e){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapPress',lat:e.latLng.lat(),lng:e.latLng.lng()}));
  });

  window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
}

window.updateMarkers=function(data){
  gMarkers.forEach(function(m){m.setMap(null)});
  gLabels.forEach(function(l){l.setMap(null)});
  gMarkers=[];gLabels=[];
  var bounds=new google.maps.LatLngBounds();
  var hasBounds=false;

  data.forEach(function(m){
    var isSelected=m.selected;
    var sc=m.color||statusColor(m.status);
    var heading=m.course||0;
    var sz=isSelected?44:34;

    var marker=new google.maps.Marker({
      position:{lat:m.lat,lng:m.lng},
      map:map,
      icon:{
        url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(carSvg(sc)),
        scaledSize:new google.maps.Size(sz,sz),
        anchor:new google.maps.Point(sz/2,sz/2)
      },
      zIndex:isSelected?100:10,
      optimized:false
    });

    var iw=new google.maps.InfoWindow({content:buildTooltip(m),maxWidth:220});
    marker.addListener('click',function(){
      iw.open(map,marker);
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'marker',id:m.id}));
    });
    if(isSelected)iw.open(map,marker);

    gMarkers.push(marker);
    bounds.extend(marker.getPosition());
    hasBounds=true;
  });

  if(hasBounds){
    if(data.length===1){map.setCenter(bounds.getCenter());map.setZoom(15)}
    else map.fitBounds(bounds,{top:60,right:50,bottom:130,left:50});
  }
};

window.updateRoute=function(pts,color){
  if(gRoute){gRoute.setMap(null);gRoute=null}
  if(!pts||pts.length<2)return;
  playPositions=pts;
  var path=pts.map(function(p){return{lat:p[0],lng:p[1]}});
  gRoute=new google.maps.Polyline({
    path:path,
    strokeColor:color||'#6B3CE6',
    strokeOpacity:0.85,
    strokeWeight:4,
    map:map,
    icons:[{icon:{path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:3,fillColor:color||'#6B3CE6',fillOpacity:1,strokeWeight:0},offset:'100%'}]
  });
  var bounds=new google.maps.LatLngBounds();
  path.forEach(function(p){bounds.extend(p)});
  map.fitBounds(bounds,{top:60,right:50,bottom:130,left:50});
};

window.updateCircles=function(data){
  gCircles.forEach(function(c){c.setMap(null)});gCircles=[];
  data.forEach(function(c){
    var circle=new google.maps.Circle({
      center:{lat:c.lat,lng:c.lng},radius:c.radius,
      strokeColor:c.color||'#6B3CE6',strokeOpacity:.8,strokeWeight:2,
      fillColor:c.fillColor||'rgba(107,60,230,0.15)',fillOpacity:.2,
      map:map,clickable:false
    });
    gCircles.push(circle);
  });
};

window.showMyLocation=function(lat,lng){
  if(gMyLoc)gMyLoc.setMap(null);
  if(gMyLocCircle)gMyLocCircle.setMap(null);
  gMyLoc=new google.maps.Marker({
    position:{lat:lat,lng:lng},map:map,
    icon:{
      url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">'
        +'<circle cx="20" cy="20" r="18" fill="rgba(66,133,244,0.12)"><animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/></circle>'
        +'<circle cx="20" cy="20" r="7" fill="#4285F4" stroke="#fff" stroke-width="2.5"/></svg>'
      ),
      scaledSize:new google.maps.Size(40,40),anchor:new google.maps.Point(20,20)
    },zIndex:200,clickable:false
  });
  gMyLocCircle=new google.maps.Circle({
    center:{lat:lat,lng:lng},radius:60,
    strokeColor:'#4285F4',strokeOpacity:.2,strokeWeight:1,
    fillColor:'#4285F4',fillOpacity:.08,map:map,clickable:false
  });
  map.setCenter({lat:lat,lng:lng});
  map.setZoom(16);
};

// ── Route playback ──
var playInfoWindow=null;

function playbackTooltip(d){
  var spd=d.speed!=null?Math.round(d.speed):0;
  var spdColor=spd>80?'#ef4444':spd>0?'#10b981':'#64748b';
  var sat=d.sat!=null?d.sat:'-';
  var satColor=sat!=='-'?(sat>=8?'#10b981':sat>=4?'#f59e0b':'#ef4444'):'#999';
  var acc=d.accuracy!=null?Math.round(d.accuracy)+'m':'-';
  var accColor=d.accuracy!=null?(d.accuracy<10?'#10b981':d.accuracy<30?'#f59e0b':'#ef4444'):'#999';
  var ign=d.ignition?'ON':'OFF';
  var ignColor=d.ignition?'#10b981':'#ef4444';
  var bat=d.batteryLevel!=null?d.batteryLevel+'%':'-';
  var tm='';
  if(d.time){try{var dt=new Date(d.time);if(!isNaN(dt))tm=dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch(e){}}
  var status=d.deviceStatus||'';

  return '<div style="font-family:-apple-system,sans-serif;min-width:170px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.15)">'
    // Header
    +'<div style="background:linear-gradient(135deg,#6B3CE6,#8B5CF6);padding:6px 10px;display:flex;align-items:center;justify-content:space-between">'
    +'<span style="color:#fff;font-size:11px;font-weight:700">'+tm+'</span>'
    +(status?'<span style="color:rgba(255,255,255,.8);font-size:9px;text-transform:uppercase;letter-spacing:.5px;background:rgba(255,255,255,.2);padding:2px 6px;border-radius:6px">'+status+'</span>':'')
    +'</div>'
    // Speed big
    +'<div style="text-align:center;padding:8px 10px 4px">'
    +'<div style="font-size:28px;font-weight:900;color:'+spdColor+'">'+spd+'</div>'
    +'<div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.5px">km/h</div>'
    +'</div>'
    // Grid
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#f0f0f0;margin:0 8px 8px;border-radius:8px;overflow:hidden">'
    +'<div style="background:#fff;padding:6px 8px;text-align:center"><div style="font-size:9px;color:#999">SAT</div><div style="font-size:13px;font-weight:700;color:'+satColor+'">&#x1F6F0; '+sat+'</div></div>'
    +'<div style="background:#fff;padding:6px 8px;text-align:center"><div style="font-size:9px;color:#999">GPS</div><div style="font-size:13px;font-weight:700;color:'+accColor+'">'+acc+'</div></div>'
    +'<div style="background:#fff;padding:6px 8px;text-align:center"><div style="font-size:9px;color:#999">IGN</div><div style="font-size:13px;font-weight:700;color:'+ignColor+'">&#x26A1; '+ign+'</div></div>'
    +'<div style="background:#fff;padding:6px 8px;text-align:center"><div style="font-size:9px;color:#999">BAT</div><div style="font-size:13px;font-weight:700;color:#333">&#x1F50B; '+bat+'</div></div>'
    +'</div>'
    +'</div>';
}

window.setPlaybackPosition=function(data){
  if(!playPositions||!playPositions.length)return;
  var i=Math.min(Math.max(0,data.index),playPositions.length-1);
  var pos={lat:playPositions[i][0],lng:playPositions[i][1]};

  // Car marker with rotation
  var heading=data.course||0;
  var carIcon='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(carSvg('#6B3CE6'));

  if(!playMarker){
    playMarker=new google.maps.Marker({
      position:pos,map:map,
      icon:{url:carIcon,scaledSize:new google.maps.Size(40,40),anchor:new google.maps.Point(20,20)},
      zIndex:300,optimized:false
    });
    playInfoWindow=new google.maps.InfoWindow({maxWidth:200});
    playInfoWindow.open(map,playMarker);
  } else {
    playMarker.setPosition(pos);
    playMarker.setIcon({url:carIcon,scaledSize:new google.maps.Size(40,40),anchor:new google.maps.Point(20,20)});
  }

  // Update tooltip with live data
  if(playInfoWindow){
    playInfoWindow.setContent(playbackTooltip(data));
    playInfoWindow.open(map,playMarker);
  }

  // Traveled path (red)
  if(playLine)playLine.setMap(null);
  var traveled=playPositions.slice(0,i+1).map(function(p){return{lat:p[0],lng:p[1]}});
  if(traveled.length>1){
    playLine=new google.maps.Polyline({
      path:traveled,strokeColor:'#ef4444',strokeOpacity:1,strokeWeight:5,map:map,zIndex:50
    });
  }
  map.panTo(pos);
};

window.clearPlayback=function(){
  if(playInfoWindow){playInfoWindow.close();playInfoWindow=null}
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
      const pts = JSON.stringify(route.points)
      webRef.current.injectJavaScript(`window.updateRoute(${pts},'${route.color || '#6B3CE6'}');true;`)
    } else {
      webRef.current.injectJavaScript(`window.updateRoute(null);true;`)
    }

    if (circles && circles.length > 0) {
      webRef.current.injectJavaScript(`window.updateCircles(${JSON.stringify(circles)});true;`)
    } else {
      webRef.current.injectJavaScript(`window.updateCircles([]);true;`)
    }

    if (showMyLocation && myLocationLat != null && myLocationLng != null) {
      webRef.current.injectJavaScript(`window.showMyLocation(${myLocationLat},${myLocationLng});true;`)
    }
  }, [markers, route, circles, selectedMarkerId, showMyLocation, myLocationLat, myLocationLng])

  // Handle playback position - send full data including speed, sat, etc.
  useEffect(() => {
    if (!webRef.current || !readyRef.current || !playback) return
    if (playback.progress >= 0) {
      const data = JSON.stringify({
        index: Math.floor(playback.progress),
        speed: playback.position?.speed ?? 0,
        sat: playback.position?.sat,
        accuracy: playback.position?.accuracy,
        time: playback.position?.time,
        course: playback.position?.course,
        batteryLevel: playback.position?.batteryLevel,
        ignition: playback.position?.ignition,
        deviceStatus: playback.position?.deviceStatus,
      })
      webRef.current.injectJavaScript(`window.setPlaybackPosition(${data});true;`)
    }
  }, [playback?.progress, playback?.position]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!webRef.current || !readyRef.current) return
    if (!playback || playback.progress < 0) {
      webRef.current.injectJavaScript(`window.clearPlayback();true;`)
    }
  }, [playback]) // eslint-disable-line react-hooks/exhaustive-deps

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
      } else if (data.type === 'myLocation') {
        // Request from map button - relay to RN for GPS
        if (showMyLocation && myLocationLat != null && myLocationLng != null) {
          webRef.current?.injectJavaScript(`window.showMyLocation(${myLocationLat},${myLocationLng});true;`)
        } else {
          // Ask RN to fetch location
          onMapPress?.(-999, -999) // sentinel for my-location request
        }
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
  container: { width: '100%', overflow: 'hidden' },
  map: { flex: 1 },
})

export default TrackingMap
