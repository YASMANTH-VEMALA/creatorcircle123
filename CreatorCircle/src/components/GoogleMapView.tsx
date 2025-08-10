import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

interface GoogleMapViewProps {
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  nearbyUsers: Array<{
    uid: string;
    displayName: string;
    photoURL?: string;
    location: {
      latitude: number;
      longitude: number;
    };
    distance?: number;
    skills: string[];
    interests: string[];
  }>;
  onMarkerPress?: (user: any) => void;
  onMarkerLongPress?: (user: any) => void;
}

const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  currentLocation,
  nearbyUsers,
  onMarkerPress,
  onMarkerLongPress,
}) => {
  const webViewRef = useRef<WebView>(null);

  const generateMapHTML = () => {
    const apiKey = "AIzaSyALs6yCdsOCckgyw4fPSWgYCSjkjInuWKQ"; // Website API key
    const center = currentLocation || { latitude: 37.7749, longitude: -122.4194 };

    const markers = nearbyUsers.map((user, index) => ({
      position: user.location,
      title: user.displayName,
      info: `${user.displayName}<br>Distance: ${user.distance ? (user.distance * 1000).toFixed(0) + 'm' : 'Nearby'}<br>Skills: ${user.skills.join(', ')}<br>Interests: ${user.interests.join(', ')}`,
      uid: user.uid,
      photoURL: user.photoURL || ''
    }));

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
            .info-window { max-width: 200px; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            let pressTimer = null;

            function initMap() {
              const map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${center.latitude}, lng: ${center.longitude} },
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              });

              // Current user marker (blue)
              new google.maps.Marker({
                position: { lat: ${center.latitude}, lng: ${center.longitude} },
                map: map,
                title: 'Your Location',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                },
              });

              // Nearby users markers
              const markers = ${JSON.stringify(markers)};
              markers.forEach((markerData, index) => {
                const iconUrl = markerData.photoURL && markerData.photoURL.length > 0 ? markerData.photoURL : null;
                const marker = new google.maps.Marker({
                  position: { lat: markerData.position.latitude, lng: markerData.position.longitude },
                  map: map,
                  title: markerData.title,
                  icon: iconUrl ? {
                    url: iconUrl,
                    scaledSize: new google.maps.Size(44, 44),
                    anchor: new google.maps.Point(22, 22),
                  } : {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#FF6B6B',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  },
                });

                const infoWindow = new google.maps.InfoWindow({
                  content: '<div class="info-window">' + markerData.info + '</div>',
                });

                // Single tap/click just opens info window
                marker.addListener('click', () => {
                  infoWindow.open(map, marker);
                });

                // Long-press detection (2 seconds)
                const startPress = () => {
                  clearTimeout(pressTimer);
                  pressTimer = setTimeout(() => {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'marker_longpress',
                    uid: markerData.uid,
                    user: markerData,
                  }));
                  }, 2000);
                };
                const cancelPress = () => { clearTimeout(pressTimer); };

                marker.addListener('mousedown', startPress);
                marker.addListener('mouseup', cancelPress);
                marker.addListener('mouseout', cancelPress);
                marker.addListener('touchstart', startPress);
                marker.addListener('touchend', cancelPress);
              });
            }
          </script>
          <script async defer
            src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap">
          </script>
        </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker_longpress') {
        if (onMarkerLongPress) onMarkerLongPress(data.user);
        else if (onMarkerPress) onMarkerPress(data.user);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (!currentLocation) {
    return (
      <View style={styles.noLocationContainer}>
        {/* Intentionally kept minimal to avoid HTML elements inside RN */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default GoogleMapView; 