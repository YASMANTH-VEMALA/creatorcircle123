import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SimpleMapProps {
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  nearbyUsers: any[];
  onMarkerPress?: (user: any) => void;
}

const SimpleMap: React.FC<SimpleMapProps> = ({ 
  currentLocation, 
  nearbyUsers, 
  onMarkerPress 
}) => {
  if (!currentLocation) {
    return (
      <View style={styles.noLocationContainer}>
        <Ionicons name="location-outline" size={64} color="#ccc" />
        <Text style={styles.noLocationText}>Location not available</Text>
        <Text style={styles.noLocationSubtext}>
          Please enable location access to see nearby creators
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      {/* Map Background */}
      <View style={styles.mapBackground}>
        <View style={styles.mapContent}>
          <Ionicons name="map-outline" size={48} color="#007AFF" />
          <Text style={styles.mapTitle}>Interactive Map</Text>
          <Text style={styles.mapSubtitle}>
            Your location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
          
          {/* Current User Marker */}
          <View style={styles.currentUserMarker}>
            <Ionicons name="location" size={24} color="#007AFF" />
            <Text style={styles.markerText}>You</Text>
          </View>

          {/* Nearby Users */}
          {nearbyUsers.length > 0 && (
            <View style={styles.nearbyUsersContainer}>
              <Text style={styles.nearbyTitle}>
                {nearbyUsers.length} nearby creator{nearbyUsers.length !== 1 ? 's' : ''} found
              </Text>
              {nearbyUsers.slice(0, 3).map((user, index) => (
                <View key={user.uid} style={styles.userMarker}>
                  <Ionicons name="person-circle" size={20} color="#FF6B6B" />
                  <Text style={styles.userMarkerText}>{user.displayName}</Text>
                  <Text style={styles.userDistance}>
                    {user.distance ? `${(user.distance * 1000).toFixed(0)}m` : 'Nearby'}
                  </Text>
                </View>
              ))}
              {nearbyUsers.length > 3 && (
                <Text style={styles.moreUsers}>+{nearbyUsers.length - 3} more</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContent: {
    alignItems: 'center',
    padding: 20,
  },
  mapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  currentUserMarker: {
    alignItems: 'center',
    marginBottom: 24,
  },
  markerText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  nearbyUsersContainer: {
    alignItems: 'center',
  },
  nearbyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  userMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMarkerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
    marginRight: 8,
  },
  userDistance: {
    fontSize: 12,
    color: '#666',
  },
  moreUsers: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 8,
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noLocationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default SimpleMap; 