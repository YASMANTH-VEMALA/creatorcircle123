import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { QuickMigration } from '../utils/quickMigration';
import { DefaultImageSetup } from '../utils/setupDefaultImages';
import { DebugPosts } from '../utils/debugPosts';
import { AutoMigration } from '../utils/autoMigration';
import { RealtimeMigrationService } from '../services/realtimeMigrationService';
import { PremiumService } from '../services/premiumService';
import PremiumSubscriptionModal from '../components/PremiumSubscriptionModal';
import { UserService } from '../services/userService';
import AvatarDemo from '../components/ui/AvatarDemo';
import { Avatar } from '../components/ui/Avatar';
import NotificationIndicator from '../components/NotificationIndicator';

const MoreScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        if (user?.uid) {
          const hasActiveSubscription = await PremiumService.hasActiveSubscription(user.uid);
          // Don't auto-open modal, let user choose when to view premium options
        }
      } catch (error) {
        console.error('Error checking premium status:', error);
      }
    };
    checkPremiumStatus();
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleMessages = () => {
    navigation.navigate('ChatList' as never);
  };

  const handleCollaborationRequests = () => {
    navigation.navigate('CollaborationRequests' as never);
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications' as never);
  };

  const handlePlatformTest = () => {
    navigation.navigate('PlatformTest' as never);
  };

  const handleQuickMigration = () => {
    Alert.alert(
      'Quick Migration',
      'This will clean up local file paths in your data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Run Migration', 
          onPress: async () => {
            try {
              // First check migration status
              const status = await QuickMigration.getMigrationStatus();
              console.log('Migration status:', status);
              
              if (status.usersWithLocalFiles > 0 || status.postsWithLocalFiles > 0) {
                Alert.alert(
                  'Migration Status',
                  `Found ${status.usersWithLocalFiles} users and ${status.postsWithLocalFiles} posts with local file paths. Proceed with cleanup?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clean Data',
                      onPress: async () => {
                        try {
                          await QuickMigration.runQuickMigration();
                          Alert.alert('Success', 'Migration completed successfully! Please restart the app to see changes.');
                        } catch (error) {
                          console.error('Migration error:', error);
                          Alert.alert('Error', 'Migration failed. Check console for details.');
                        }
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('No Migration Needed', 'All data is already clean!');
              }
            } catch (error) {
              console.error('Error checking migration status:', error);
              Alert.alert('Error', 'Failed to check migration status.');
            }
          }
        }
      ]
    );
  };

  const handleSetupDefaultImages = () => {
    Alert.alert(
      'Setup Default Images',
      'This will upload default images to Firebase Storage. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Setup Images', 
          onPress: async () => {
            try {
              await DefaultImageSetup.uploadDefaultImages();
              Alert.alert('Success', 'Default images uploaded successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to upload default images. Check console for details.');
            }
          }
        }
      ]
    );
  };

  const handleCheckMigrationStatus = () => {
    QuickMigration.getMigrationStatus().then(status => {
      Alert.alert(
        'Migration Status',
        `Users: ${status.usersWithLocalFiles}/${status.totalUsers} have local files\nPosts: ${status.postsWithLocalFiles}/${status.totalPosts} have local files`,
        [{ text: 'OK' }]
      );
    }).catch(error => {
      console.error('Error getting migration status:', error);
      Alert.alert('Error', 'Failed to get migration status.');
    });
  };

  const handleDebugPosts = () => {
    DebugPosts.debugPosts();
    Alert.alert('Debug', 'Check console for post debugging information.');
  };

  const handleDebugUsers = () => {
    DebugPosts.debugUsers();
    Alert.alert('Debug', 'Check console for user debugging information.');
  };

  const handleGetDataSummary = () => {
    DebugPosts.getDataSummary().then(summary => {
      Alert.alert(
        'Data Summary',
        `Posts: ${summary.postsWithLocalAvatars}/${summary.totalPosts} have local avatars\n` +
        `Posts: ${summary.postsWithEmptyAvatars}/${summary.totalPosts} have empty avatars\n` +
        `Users: ${summary.usersWithLocalPhotos}/${summary.totalUsers} have local photos\n` +
        `Users: ${summary.usersWithEmptyPhotos}/${summary.totalUsers} have empty photos`,
        [{ text: 'OK' }]
      );
    }).catch(error => {
      console.error('Error getting data summary:', error);
      Alert.alert('Error', 'Failed to get data summary.');
    });
  };

  const handleAutoMigration = () => {
    Alert.alert(
      'Automatic Migration',
      'This will convert ALL local file paths to Firebase Storage URLs. This may take some time. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Migration', 
          onPress: async () => {
            try {
              // First check what needs to be migrated
              const status = await AutoMigration.checkMigrationNeeded();
              console.log('Auto migration status:', status);
              
              if (status.usersWithLocalFiles > 0 || status.postsWithLocalFiles > 0) {
                Alert.alert(
                  'Migration Required',
                  `Found ${status.usersWithLocalFiles} users and ${status.postsWithLocalFiles} posts with local files.\n\nThis will convert them to Firebase Storage URLs. Continue?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Convert to Firebase',
                      onPress: async () => {
                        try {
                          Alert.alert('Migration in Progress', 'Converting local files to Firebase Storage URLs. Please wait...');
                          await AutoMigration.autoMigrateLocalFiles();
                          Alert.alert('Success', 'All local files have been converted to Firebase Storage URLs!');
                        } catch (error) {
                          console.error('Auto migration error:', error);
                          Alert.alert('Error', 'Migration failed. Check console for details.');
                        }
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('No Migration Needed', 'All files are already Firebase Storage URLs!');
              }
            } catch (error) {
              console.error('Error checking auto migration status:', error);
              Alert.alert('Error', 'Failed to check migration status.');
            }
          }
        }
      ]
    );
  };

  const handleCheckAutoMigrationStatus = () => {
    AutoMigration.checkMigrationNeeded().then(status => {
      Alert.alert(
        'Auto Migration Status',
        `Users: ${status.usersWithLocalFiles}/${status.totalUsers} have local files\nPosts: ${status.postsWithLocalFiles}/${status.totalPosts} have local files\n\nThese will be converted to Firebase Storage URLs.`,
        [{ text: 'OK' }]
      );
    }).catch(error => {
      console.error('Error getting auto migration status:', error);
      Alert.alert('Error', 'Failed to get auto migration status.');
    });
  };

  const handleStartRealtimeMonitoring = () => {
    Alert.alert(
      'Start Real-time Monitoring',
      'This will automatically convert any local file paths to Firebase Storage URLs in real-time. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Monitoring',
          onPress: () => {
            try {
              RealtimeMigrationService.startMonitoring();
              Alert.alert('Success', 'Real-time monitoring started! Any local files will be automatically converted to Firebase Storage URLs.');
            } catch (error) {
              console.error('Error starting real-time monitoring:', error);
              Alert.alert('Error', 'Failed to start real-time monitoring.');
            }
          }
        }
      ]
    );
  };

  const handleStopRealtimeMonitoring = () => {
    Alert.alert(
      'Stop Real-time Monitoring',
      'This will stop the automatic conversion of local files. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Monitoring',
          onPress: () => {
            try {
              RealtimeMigrationService.stopMonitoring();
              Alert.alert('Success', 'Real-time monitoring stopped!');
            } catch (error) {
              console.error('Error stopping real-time monitoring:', error);
              Alert.alert('Error', 'Failed to stop real-time monitoring.');
            }
          }
        }
      ]
    );
  };

  const handleCheckMonitoringStatus = () => {
    const isMonitoring = RealtimeMigrationService.getMonitoringStatus();
    Alert.alert(
      'Monitoring Status',
      `Real-time monitoring is currently ${isMonitoring ? 'ACTIVE' : 'INACTIVE'}.\n\nWhen active, any local file paths will be automatically converted to Firebase Storage URLs.`,
      [{ text: 'OK' }]
    );
  };

  const handleOpenPremiumModal = () => {
    setIsPremiumModalVisible(true);
  };

  const handleClosePremiumModal = () => {
    setIsPremiumModalVisible(false);
  };

  const handleTestPremium = async () => {
    if (!user?.uid) return;
    
    try {
      console.log('🧪 Testing premium subscription system...');
      
      // Test 1: Check current subscription
      const subscription = await PremiumService.getUserSubscription(user.uid);
      console.log('📋 Current subscription:', subscription);
      
      // Test 2: Check verified badge
      const badge = await PremiumService.getUserVerifiedBadge(user.uid);
      console.log('🏆 Current verified badge:', badge);
      
      // Test 3: Check user profile
      const userProfile = await UserService.getUserProfile(user.uid);
      console.log('👤 User profile verified badge:', userProfile?.verifiedBadge);
      
      Alert.alert(
        'Premium Test Results',
        `Subscription: ${subscription ? 'Active' : 'None'}\nBadge: ${badge}\nProfile Badge: ${userProfile?.verifiedBadge || 'none'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Premium test error:', error);
      Alert.alert('Error', 'Failed to test premium system');
    }
  };

  const handleAvatarDemo = () => {
    navigation.navigate('AvatarDemo' as never);
  };

  const handleSuggestedPeople = () => {
    navigation.navigate('SuggestedPeople' as never);
  };

  const handleNearbyCreators = () => {
    navigation.navigate('NearbyCreators' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Avatar
              size="medium"
              fallback={user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userStatus}>Creator</Text>
            </View>
          </View>
        </View>

        <View style={styles.optionsSection}>
          <TouchableOpacity style={styles.option} onPress={handleMessages}>
            <Ionicons name="chatbubbles-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Messages</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handleNotifications}>
            <View style={styles.optionLeft}>
              <Ionicons name="notifications-outline" size={24} color="#007AFF" />
              <Text style={styles.optionText}>Notifications</Text>
            </View>
            <View style={styles.optionRight}>
              <NotificationIndicator size="small" showCount={false} />
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handleCollaborationRequests}>
            <Ionicons name="people-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Collaboration Requests</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handleSuggestedPeople}>
            <Ionicons name="people-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Suggested People</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handleNearbyCreators}>
            <Ionicons name="location-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Nearby Creators</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={() => navigation.navigate('Leaderboard' as never)}>
            <Ionicons name="trophy-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Leaderboard</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => navigation.navigate('RoomsList' as never)}>
            <Ionicons name="people" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Collaborative Rooms</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option}>
            <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handlePlatformTest}>
            <Ionicons name="bug-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Platform Test</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handleQuickMigration}>
            <Ionicons name="refresh-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Quick Migration</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handleSetupDefaultImages}>
            <Ionicons name="image-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Setup Default Images</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleCheckMigrationStatus}>
            <Ionicons name="bug-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Check Migration Status</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleDebugPosts}>
            <Ionicons name="bug-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Debug Posts</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleDebugUsers}>
            <Ionicons name="bug-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Debug Users</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleGetDataSummary}>
            <Ionicons name="bug-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Get Data Summary</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleAutoMigration}>
            <Ionicons name="refresh-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Automatic Migration</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleCheckAutoMigrationStatus}>
            <Ionicons name="bug-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Check Auto Migration Status</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleStartRealtimeMonitoring}>
            <Ionicons name="sync-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Start Real-time Monitoring</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleStopRealtimeMonitoring}>
            <Ionicons name="sync-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Stop Real-time Monitoring</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleCheckMonitoringStatus}>
            <Ionicons name="bug-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Check Monitoring Status</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleOpenPremiumModal}>
            <Ionicons name="star-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Premium Subscription</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleTestPremium}>
            <Ionicons name="flask-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Test Premium System</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={handleAvatarDemo}>
            <Ionicons name="person-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Avatar Demo</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <PremiumSubscriptionModal
        visible={isPremiumModalVisible}
        onClose={handleClosePremiumModal}
        onSubscriptionPurchased={() => {
          // Refresh the screen or update premium status
          console.log('Subscription purchased successfully!');
          // You can add a refresh mechanism here if needed
          // For now, the user will need to restart the app to see changes
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userSection: {
    backgroundColor: 'white',
    marginTop: 8,
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#666',
  },
  optionsSection: {
    backgroundColor: 'white',
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
});

export default MoreScreen; 