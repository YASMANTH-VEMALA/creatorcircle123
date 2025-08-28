import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SpotlightLoadingState: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="videocam" size={80} color="#666" />
        </View>
        
        <Text style={styles.title}>Loading Spotlight</Text>
        <Text style={styles.subtitle}>Preparing amazing content for you...</Text>
        
        <ActivityIndicator size="large" color="#666" style={styles.spinner} />
        
        <View style={styles.loadingTexts}>
          <Text style={styles.loadingText}>• Loading videos</Text>
          <Text style={styles.loadingText}>• Preparing playback</Text>
          <Text style={styles.loadingText}>• Setting up interactions</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  spinner: {
    marginBottom: 32,
  },
  loadingTexts: {
    alignItems: 'flex-start',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
  },
});

export default SpotlightLoadingState; 