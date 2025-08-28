import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SpotlightDemo: React.FC = () => {
  const navigation = useNavigation();

  const features = [
    {
      title: '⚡ Spotlight Feed',
      description: 'Instagram Reels-style vertical scrolling video feed',
      icon: 'flash',
      color: '#FF6B35',
    },
    {
      title: '📱 Full-Screen Videos',
      description: '9:16 aspect ratio videos with auto-play/pause',
      icon: 'phone-portrait',
      color: '#34C759',
    },
    {
      title: '❤️ Like & Comment',
      description: 'Real-time interactions with Firestore integration',
      icon: 'heart',
      color: '#FF3B30',
    },
    {
      title: '👥 User Tagging',
      description: 'Tag people with @mentions and #hashtags',
      icon: 'people',
      color: '#FF9500',
    },
    {
      title: '📤 Create Reels',
      description: 'Upload videos from gallery or record with camera',
      icon: 'add-circle',
      color: '#AF52DE',
    },
    {
      title: '🔄 Real-time Updates',
      description: 'Live data synchronization with Firebase',
      icon: 'sync',
      color: '#5856D6',
    },
  ];

  const handleNavigateToSpotlight = () => {
    navigation.navigate('Spotlight' as never);
  };

  const handleCreateSpotlight = () => {
    navigation.navigate('CreateSpotlight' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Spotlight Feature Demo</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="flash" size={80} color="#FF6B35" />
          </View>
          <Text style={styles.heroTitle}>Welcome to Spotlight!</Text>
          <Text style={styles.heroSubtitle}>
            Experience Instagram Reels-style video content in CreatorCircle
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNavigateToSpotlight}>
            <Ionicons name="play" size={24} color="white" />
            <Text style={styles.primaryButtonText}>Browse Spotlight</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCreateSpotlight}>
            <Ionicons name="add" size={24} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Create Your First Reel</Text>
          </TouchableOpacity>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>✨ What's New</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <Ionicons name={feature.icon as any} size={32} color="white" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How to Use */}
        <View style={styles.howToSection}>
          <Text style={styles.sectionTitle}>🚀 How to Use</Text>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Browse Videos</Text>
                <Text style={styles.stepDescription}>
                  Swipe up/down to navigate between reels in the Spotlight feed
                </Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Interact</Text>
                <Text style={styles.stepDescription}>
                  Like, comment, and share videos with the action buttons
                </Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Create Content</Text>
                <Text style={styles.stepDescription}>
                  Upload videos and add captions with hashtags and mentions
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Technical Info */}
        <View style={styles.techSection}>
          <Text style={styles.sectionTitle}>⚙️ Technical Features</Text>
          <View style={styles.techList}>
            <View style={styles.techItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.techText}>Firebase Firestore integration</Text>
            </View>
            <View style={styles.techItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.techText}>Real-time data synchronization</Text>
            </View>
            <View style={styles.techItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.techText}>Optimized video playback</Text>
            </View>
            <View style={styles.techItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.techText}>Responsive UI with dark theme</Text>
            </View>
            <View style={styles.techItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.techText}>User tagging and hashtag system</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  heroIcon: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  featuresSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  howToSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  stepContainer: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  techSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
    marginBottom: 20,
  },
  techList: {
    gap: 12,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  techText: {
    fontSize: 14,
    color: '#333',
  },
});

export default SpotlightDemo; 