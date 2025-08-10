import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseUtils } from '../utils/firebaseUtils';
import { ImageUtils } from '../utils/imageUtils';
import { MigrationUtils } from '../utils/migrationUtils';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

const PlatformCompatibilityTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Platform Detection
    results.push({
      name: 'Platform Detection',
      status: 'success',
      message: `Platform: ${Platform.OS}, Version: ${Platform.Version}`,
      details: { platform: Platform.OS, version: Platform.Version }
    });

    // Test 2: Firebase Initialization
    try {
      const isInitialized = FirebaseUtils.isFirebaseInitialized();
      results.push({
        name: 'Firebase Initialization',
        status: isInitialized ? 'success' : 'error',
        message: isInitialized ? 'Firebase properly initialized' : 'Firebase not initialized',
        details: FirebaseUtils.getFirebaseConfigInfo()
      });
    } catch (error) {
      results.push({
        name: 'Firebase Initialization',
        status: 'error',
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 3: Firebase Connection
    try {
      const isConnected = await FirebaseUtils.testFirebaseConnection();
      results.push({
        name: 'Firebase Connection',
        status: isConnected ? 'success' : 'error',
        message: isConnected ? 'Firebase connection successful' : 'Firebase connection failed',
        details: { connected: isConnected }
      });
    } catch (error) {
      results.push({
        name: 'Firebase Connection',
        status: 'error',
        message: `Connection error: ${error}`,
        details: error
      });
    }

    // Test 4: Firebase Project Validation
    try {
      const validation = await FirebaseUtils.validateFirebaseProject();
      results.push({
        name: 'Firebase Project Validation',
        status: validation.isValid ? 'success' : 'error',
        message: validation.isValid 
          ? `Project valid, accessible collections: ${validation.collections.join(', ')}`
          : `Project validation failed: ${validation.errors.join(', ')}`,
        details: validation
      });
    } catch (error) {
      results.push({
        name: 'Firebase Project Validation',
        status: 'error',
        message: `Validation error: ${error}`,
        details: error
      });
    }

    // Test 5: Image Utils
    try {
      const testUrl = 'https://via.placeholder.com/100';
      const imageSource = ImageUtils.getImageSource(testUrl);
      results.push({
        name: 'Image Utils',
        status: 'success',
        message: `Image utils working, cache strategy: ${imageSource.cache}`,
        details: { imageSource, platform: Platform.OS }
      });
    } catch (error) {
      results.push({
        name: 'Image Utils',
        status: 'error',
        message: `Image utils error: ${error}`,
        details: error
      });
    }

    // Test 6: Local File Migration Check
    try {
      const postsCheck = await MigrationUtils.checkPostsForLocalFiles();
      const usersCheck = await MigrationUtils.checkUsersForLocalFiles();
      
      results.push({
        name: 'Local File Migration',
        status: (postsCheck.postsWithLocalFiles > 0 || usersCheck.usersWithLocalFiles > 0) ? 'error' : 'success',
        message: `Found ${postsCheck.postsWithLocalFiles} posts and ${usersCheck.usersWithLocalFiles} users with local files`,
        details: { postsCheck, usersCheck }
      });
      
      // Log migration stats
      MigrationUtils.logMigrationStats({
        totalPosts: postsCheck.totalPosts,
        postsWithLocalFiles: postsCheck.postsWithLocalFiles,
        totalUsers: usersCheck.totalUsers,
        usersWithLocalFiles: usersCheck.usersWithLocalFiles
      });
    } catch (error) {
      results.push({
        name: 'Local File Migration',
        status: 'error',
        message: `Migration check error: ${error}`,
        details: error
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
      case 'error':
        return <Ionicons name="close-circle" size={20} color="#F44336" />;
      case 'pending':
        return <Ionicons name="time" size={20} color="#FF9800" />;
      default:
        return <Ionicons name="help-circle" size={20} color="#9E9E9E" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'pending':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Platform Compatibility Test</Text>
        <Text style={styles.subtitle}>
          Testing Firebase and image loading on {Platform.OS}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.runButton, isRunning && styles.runButtonDisabled]}
        onPress={runTests}
        disabled={isRunning}
      >
        <Ionicons name="play" size={20} color="white" />
        <Text style={styles.runButtonText}>
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              {getStatusIcon(result.status)}
              <Text style={[styles.resultName, { color: getStatusColor(result.status) }]}>
                {result.name}
              </Text>
            </View>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.details && (
              <Text style={styles.resultDetails}>
                Details: {JSON.stringify(result.details, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  runButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  runButtonDisabled: {
    backgroundColor: '#ccc',
  },
  runButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultDetails: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});

export default PlatformCompatibilityTest; 