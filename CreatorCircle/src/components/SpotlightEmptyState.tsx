import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SpotlightEmptyStateProps {
  onRefresh: () => void;
}

const SpotlightEmptyState: React.FC<SpotlightEmptyStateProps> = ({ onRefresh }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="videocam-outline" size={80} color="#666" />
        </View>
        
        <Text style={styles.title}>No Spotlight Posts Yet</Text>
        <Text style={styles.subtitle}>
          Be the first to share amazing video content with the CreatorCircle community!
        </Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={24} color="#666" />
            <Text style={styles.featureText}>Record short videos</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={24} color="#666" />
            <Text style={styles.featureText}>Get likes and comments</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="share" size={24} color="#666" />
            <Text style={styles.featureText}>Share with friends</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.createButton} onPress={() => {
          // Navigate to create spotlight post
          console.log('Navigate to create spotlight post');
        }}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.createButtonText}>Create Your First Reel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#666" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
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
  featuresContainer: {
    marginBottom: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#999999',
  },
  createButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 16,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default SpotlightEmptyState; 