import React, { useEffect, useState } from 'react';
import { View, Text, Switch, Alert, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { locationService } from '../services/locationService';
import { UserService } from '../services/userService';

const STORAGE_KEY_TOGGLE = 'cc.location.sharingEnabled';

const LocationSettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY_TOGGLE);
      setEnabled(saved ? JSON.parse(saved) : false);
      setLoading(false);
    })();
  }, []);

  const promptOpenSettings = (message?: string) => {
    Alert.alert(
      'Permission Needed',
      message || 'Background location is required to share your live location continuously. Open Settings to allow “Always”?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  };

  const toggle = async (next: boolean) => {
    try {
      if (!user?.uid) {
        Alert.alert('Error', 'User not available');
        return;
      }
      setEnabled(next);
      await AsyncStorage.setItem(STORAGE_KEY_TOGGLE, JSON.stringify(next));

      if (next) {
        // Ensure permissions (foreground first)
        let fg = await locationService.checkLocationPermission();
        if (!fg) {
          const granted = await locationService.requestLocationPermission();
          fg = granted;
        }
        if (!fg) throw new Error('Location permission denied');

        const profile = await UserService.getUserProfile(user.uid);
        if (!profile) throw new Error('User profile not available');

        await locationService.enableSharing(
          user.uid,
          {
            displayName: profile.name || user.email || 'Unknown',
            college: profile.college || 'Unknown',
            skills: profile.skills || [],
            interests: profile.interests || [],
            verified: profile.isVerified || false,
            photoURL: profile.profilePhotoUrl || undefined,
          },
          () => {}
        );
      } else {
        await locationService.disableSharing(user.uid);
      }
    } catch (e: any) {
      console.warn('Toggle error:', e);
      setEnabled(!next);
      await AsyncStorage.setItem(STORAGE_KEY_TOGGLE, JSON.stringify(!next));
      if (Platform.OS === 'ios') {
        promptOpenSettings();
      } else {
        Alert.alert('Permission Needed', e?.message || 'Failed to update location sharing');
      }
    }
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Sharing</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Share my location</Text>
        <Switch value={enabled} onValueChange={toggle} />
      </View>
      <Text style={styles.hint}>
        When enabled, your live location updates while the app is open.
      </Text>
      <TouchableOpacity
        style={styles.help}
        onPress={() => promptOpenSettings('Open device settings to adjust location permissions (While Using vs Always).')}
      >
        <Text style={styles.helpText}>Having trouble? Open device settings.</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  label: { fontSize: 16, color: '#333' },
  hint: { marginTop: 8, color: '#666' },
  help: { marginTop: 16 },
  helpText: { color: '#007AFF', fontWeight: '600' },
});

export default LocationSettingsScreen; 