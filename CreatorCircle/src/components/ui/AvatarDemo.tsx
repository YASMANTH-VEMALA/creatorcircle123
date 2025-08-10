import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Avatar } from './Avatar';

const AvatarDemo: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Avatar Component Demo</Text>
      
      {/* Small Avatars (40px) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Small Avatars (40px)</Text>
        <View style={styles.avatarRow}>
          <Avatar 
            size="small" 
            source="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" 
            fallback="JD"
          />
          <Avatar 
            size="small" 
            source="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face" 
            fallback="SK"
            verified={true}
          />
          <Avatar 
            size="small" 
            fallback="U"
          />
        </View>
      </View>

      {/* Medium Avatars (50px) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medium Avatars (50px)</Text>
        <View style={styles.avatarRow}>
          <Avatar 
            size="medium" 
            source="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" 
            fallback="AM"
          />
          <Avatar 
            size="medium" 
            source="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" 
            fallback="RJ"
            verified={true}
          />
          <Avatar 
            size="medium" 
            fallback="U"
          />
        </View>
      </View>

      {/* Large Avatars (70px) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Large Avatars (70px)</Text>
        <View style={styles.avatarRow}>
          <Avatar 
            size="large" 
            source="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face" 
            fallback="MJ"
          />
          <Avatar 
            size="large" 
            source="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face" 
            fallback="LK"
            verified={true}
          />
          <Avatar 
            size="large" 
            fallback="U"
          />
        </View>
      </View>

      {/* XLarge Avatars (120px) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>XLarge Avatars (120px)</Text>
        <View style={styles.avatarRow}>
          <Avatar 
            size="xlarge" 
            source="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face" 
            fallback="DP"
          />
          <Avatar 
            size="xlarge" 
            source="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face" 
            fallback="NP"
            verified={true}
          />
          <Avatar 
            size="xlarge" 
            fallback="U"
          />
        </View>
      </View>

      {/* Usage Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage Examples</Text>
        
        <View style={styles.example}>
          <Text style={styles.exampleTitle}>Profile Header</Text>
          <View style={styles.profileHeader}>
            <Avatar 
              size="large" 
              source="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" 
              fallback="JD"
              verified={true}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>John Doe</Text>
              <Text style={styles.profileSubtitle}>Verified Creator</Text>
            </View>
          </View>
        </View>

        <View style={styles.example}>
          <Text style={styles.exampleTitle}>Post Author</Text>
          <View style={styles.postAuthor}>
            <Avatar 
              size="medium" 
              source="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face" 
              fallback="SK"
              verified={true}
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>Sarah Kim</Text>
              <Text style={styles.authorTime}>2 hours ago</Text>
            </View>
          </View>
        </View>

        <View style={styles.example}>
          <Text style={styles.exampleTitle}>Chat List</Text>
          <View style={styles.chatItem}>
            <Avatar 
              size="medium" 
              source="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" 
              fallback="AM"
            />
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>Alex Morgan</Text>
              <Text style={styles.chatMessage}>Hey, how's it going?</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  example: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  authorTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default AvatarDemo; 