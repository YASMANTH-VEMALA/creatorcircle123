import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, GeoPoint, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserLocation {
  uid: string;
  displayName: string;
  college: string;
  skills: string[];
  interests: string[];
  verified: boolean;
  photoURL?: string;
  location: GeoPoint;
  lastUpdated: Timestamp;
  isLocationShared: boolean;
  distance?: number;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

const BACKGROUND_LOCATION_TASK = 'creatorcircle-background-location';
const STORAGE_KEYS = {
  sharingEnabled: 'cc.location.sharingEnabled',
  backgroundContext: 'cc.location.backgroundContext',
};

// Define background task only once (guard for fast refresh)
if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async (body: TaskManager.TaskManagerTaskBody) => {
  try {
    const { data, error } = (body || {}) as any;
    if (error) {
        console.warn('Background location task warning:', error);
      return;
    }
    const { locations } = (data || {}) as any;
    if (!locations || !Array.isArray(locations) || locations.length === 0) return;
    const latest = locations[locations.length - 1];
    const ctxJson = await AsyncStorage.getItem(STORAGE_KEYS.backgroundContext);
    if (!ctxJson) return;
    const ctx = JSON.parse(ctxJson);
    const update: LocationUpdate = {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
      accuracy: latest.coords.accuracy,
      timestamp: latest.timestamp,
    };
    await locationService.updateUserLocation(ctx.userId, ctx.userData, update);
  } catch (e) {
      console.warn('Background task handler failed:', e);
  }
});
}

class LocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private firestoreListener: (() => void) | null = null;
  private isTracking = false;

  async setSharingEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.sharingEnabled, JSON.stringify(!!enabled));
  }

  async getSharingEnabled(): Promise<boolean> {
    const v = await AsyncStorage.getItem(STORAGE_KEYS.sharingEnabled);
    return v ? JSON.parse(v) : false;
  }

  private async saveBackgroundContext(userId: string, userData: any): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.backgroundContext,
      JSON.stringify({ userId, userData })
    );
  }

  private async clearBackgroundContext(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.backgroundContext);
  }

  /**
   * Request location permissions
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /** Request background permission for continuous updates */
  async requestBackgroundPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /** Check background */
  async checkBackgroundPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking background permission:', error);
      return false;
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          Alert.alert('Location Permission', 'Location permission is required to show nearby creators.');
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      });

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start real-time location tracking in foreground
   */
  async startLocationTracking(
    userId: string,
    userData: {
      displayName: string;
      college: string;
      skills: string[];
      interests: string[];
      verified: boolean;
      photoURL?: string;
    },
    onLocationUpdate?: (location: LocationUpdate) => void
  ): Promise<void> {
    try {
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      // Stop any existing tracking
      await this.stopLocationTracking();

      this.isTracking = true;

      // Start watching position with high accuracy
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        async (location) => {
          const locationUpdate: LocationUpdate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };

          await this.updateUserLocation(userId, userData, locationUpdate);

          if (onLocationUpdate) {
            onLocationUpdate(locationUpdate);
          }
        }
      );

      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  /** Start background updates with persistent context */
  async startBackgroundUpdates(
    userId: string,
    userData: {
      displayName: string;
      college: string;
      skills: string[];
      interests: string[];
      verified: boolean;
      photoURL?: string;
    }
  ): Promise<void> {
    const fg = await this.checkLocationPermission();
    if (!fg) {
      const granted = await this.requestLocationPermission();
      if (!granted) throw new Error('Location permission denied');
    }
    const bg = await this.checkBackgroundPermission();
    if (!bg) {
      const grantedBg = await this.requestBackgroundPermission();
      if (!grantedBg) throw new Error('Background location permission denied');
    }

    await this.saveBackgroundContext(userId, userData);

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 20000, // 20s minimal interval
        distanceInterval: 15, // meters
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: true,
        foregroundService: Platform.select({
          android: {
            notificationTitle: 'CreatorCircle is sharing your location',
            notificationBody: 'Your live location is visible to nearby creators',
            notificationColor: '#007AFF',
          },
          ios: undefined,
        }),
      } as any);
    }
  }

  /** Stop background updates and clear context */
  async stopBackgroundUpdates(): Promise<void> {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await this.clearBackgroundContext();
  }

  /**
   * Stop location tracking
   */
  async stopLocationTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        await this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      if (this.firestoreListener) {
        this.firestoreListener();
        this.firestoreListener = null;
      }

      this.isTracking = false;
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  /** Enable sharing: persist flag, start background updates */
  async enableSharing(
    userId: string,
    userData: {
      displayName: string;
      college: string;
      skills: string[];
      interests: string[];
      verified: boolean;
      photoURL?: string;
    },
    onLocationUpdate?: (location: LocationUpdate) => void
  ): Promise<void> {
    await this.setSharingEnabled(true);
    // Foreground-only tracking (no background updates)
    await this.startLocationTracking(userId, userData, onLocationUpdate);
  }

  /** Disable sharing: persist flag, stop background, remove location */
  async disableSharing(userId: string): Promise<void> {
    await this.setSharingEnabled(false);
    await this.stopLocationTracking();
    await this.stopBackgroundUpdates();
    await this.removeUserLocation(userId);
  }

  /**
   * Update user location in Firestore
   */
  async updateUserLocation(
    userId: string,
    userData: {
      displayName: string;
      college: string;
      skills: string[];
      interests: string[];
      verified: boolean;
      photoURL?: string;
    },
    location: LocationUpdate
  ): Promise<void> {
    try {
      const locationRef = doc(db, 'userLocations', userId);

      const payload: any = {
        uid: userId,
        displayName: userData.displayName || 'Unknown',
        college: userData.college || 'Unknown',
        skills: userData.skills || [],
        interests: userData.interests || [],
        verified: !!userData.verified,
        location: new GeoPoint(location.latitude, location.longitude),
        lastUpdated: Timestamp.fromMillis(location.timestamp ?? Date.now()),
        isLocationShared: true,
      };

      if (typeof userData.photoURL === 'string' && userData.photoURL.length > 0) {
        payload.photoURL = userData.photoURL;
      }

      await setDoc(locationRef, payload);

      // console.log('Location updated in Firestore');
    } catch (error) {
      console.error('Error updating location in Firestore:', error);
    }
  }

  /**
   * Remove user location from Firestore
   */
  async removeUserLocation(userId: string): Promise<void> {
    try {
      const locationRef = doc(db, 'userLocations', userId);
      await deleteDoc(locationRef);
      console.log('Location removed from Firestore');
    } catch (error) {
      console.error('Error removing location from Firestore:', error);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Listen to nearby users in real-time
   */
  listenToNearbyUsers(
    currentUserId: string,
    currentLocation: { latitude: number; longitude: number },
    onUsersUpdate: (users: UserLocation[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'userLocations'),
        where('isLocationShared', '==', true)
      );

      this.firestoreListener = onSnapshot(q, (snapshot) => {
        const nearbyUsers: UserLocation[] = [];

        snapshot.forEach((doc) => {
          const userData = doc.data() as UserLocation;

          if (userData.uid === currentUserId) {
            return;
          }

          const distance = this.calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            (userData.location as any).latitude ?? (userData.location as any)._lat ?? (userData as any).location?.lat ?? 0,
            (userData.location as any).longitude ?? (userData.location as any)._long ?? (userData as any).location?.lng ?? 0,
          );

          if (distance <= 1) {
            nearbyUsers.push({
              ...userData,
              distance,
            } as any);
          }
        });

        nearbyUsers.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        onUsersUpdate(nearbyUsers);
      });

      return () => {
        if (this.firestoreListener) {
          this.firestoreListener();
          this.firestoreListener = null;
        }
      };
    } catch (error) {
      console.error('Error listening to nearby users:', error);
      return () => {};
    }
  }

  /**
   * Check if location tracking is active
   */
  isLocationTrackingActive(): boolean {
    return this.isTracking;
  }
}

export const locationService = new LocationService(); 