import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { PremiumService } from '../services/premiumService';
import PremiumSubscriptionModal from '../components/PremiumSubscriptionModal';
import { UserService } from '../services/userService';
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
          await PremiumService.hasActiveSubscription(user.uid);
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

  const handleOpenPremiumModal = () => {
    setIsPremiumModalVisible(true);
  };

  const handleClosePremiumModal = () => {
    setIsPremiumModalVisible(false);
  };

  const handleSuggestedPeople = () => {
    navigation.navigate('SuggestedPeople' as never);
  };

  const handleNearbyCreators = () => {
    navigation.navigate('NearbyCreators' as never);
  };

  // Reusable option item to keep icon + label left-aligned and chevron on the right
  const OptionItem: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    rightElement?: React.ReactNode;
    iconColor?: string;
    labelColor?: string;
  }> = ({ icon, label, onPress, rightElement, iconColor = '#007AFF', labelColor = '#333' }) => (
    <TouchableOpacity style={styles.option} onPress={onPress}>
      <View style={styles.optionLeft}>
        <Ionicons name={icon} size={24} color={iconColor} />
        <Text style={[styles.optionText, { color: labelColor }]}>{label}</Text>
      </View>
      <View style={styles.optionRight}>
        {rightElement}
        <Ionicons style={styles.optionChevron} name="chevron-forward" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
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

        {/* General Section */}
        <Text style={styles.sectionHeader}>General</Text>
        <View style={styles.optionsSection}>
          <OptionItem icon="log-out-outline" label="Logout" onPress={handleLogout} iconColor="#FF3B30" labelColor="#FF3B30" />
          <OptionItem icon="chatbubbles-outline" label="Messages" onPress={handleMessages} />
          <OptionItem
            icon="notifications-outline"
            label="Notifications"
            onPress={handleNotifications}
            rightElement={<NotificationIndicator size="small" showCount={false} />}
          />
          <OptionItem icon="settings-outline" label="Location Settings" onPress={() => navigation.navigate('LocationSettings' as never)} />
          <OptionItem icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
          <OptionItem icon="information-circle-outline" label="About" onPress={() => {}} />
            </View>

        {/* Community Section */}
        <Text style={styles.sectionHeader}>Community</Text>
        <View style={styles.optionsSection}>
          <OptionItem icon="people-outline" label="Collaboration Requests" onPress={handleCollaborationRequests} />
          <OptionItem icon="person-add-outline" label="Suggested People" onPress={handleSuggestedPeople} />
          <OptionItem icon="location-outline" label="Nearby Creators" onPress={handleNearbyCreators} />
          <OptionItem icon="trophy-outline" label="Leaderboard" onPress={() => navigation.navigate('Leaderboard' as never)} />
          <OptionItem icon="people-outline" label="Collaborative Rooms" onPress={() => navigation.navigate('RoomsList' as never)} />
        </View>

        {/* Premium Section */}
        <Text style={styles.sectionHeader}>Premium</Text>
        <View style={styles.optionsSection}>
          <OptionItem icon="star-outline" label="Premium Subscription" onPress={handleOpenPremiumModal} />
        </View>
      </ScrollView>

      <PremiumSubscriptionModal
        visible={isPremiumModalVisible}
        onClose={handleClosePremiumModal}
        onSubscriptionPurchased={() => {
          console.log('Subscription purchased successfully!');
        }}
      />
    </SafeAreaView>
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
    borderRadius: 12,
    overflow: 'hidden',
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
  optionChevron: {
    marginLeft: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
});

export default MoreScreen; 