import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Room, RoomMember } from '../services/roomService';
import { UserService } from '../services/userService';
import { Profile } from '../types';

interface RoomInfoModalProps {
  visible: boolean;
  onClose: () => void;
  room: Room;
  members: RoomMember[];
  currentUserId: string;
}

const RoomInfoModal: React.FC<RoomInfoModalProps> = ({
  visible,
  onClose,
  room,
  members,
  currentUserId
}) => {
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (visible && members.length > 0) {
      loadMemberProfiles();
    }
  }, [visible, members]);

  const loadMemberProfiles = async () => {
    try {
      setLoading(true);
      const profiles = await Promise.all(
        members.map(member => UserService.getUserProfile(member.uid))
      );
      setMemberProfiles(profiles.filter(Boolean) as Profile[]);
    } catch (error) {
      console.error('Error loading member profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      // This would typically call a service to invite the user
      // For now, we'll just show a success message
      Alert.alert(
        'Invitation Sent',
        `Invitation sent to ${inviteEmail}`,
        [{ text: 'OK' }]
      );
      setInviteEmail('');
      setShowInviteSection(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (memberId === currentUserId) {
      Alert.alert('Cannot Remove Self', 'You cannot remove yourself from the room.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would typically call a service to remove the member
              Alert.alert('Success', `${memberName} has been removed from the room.`);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to remove member. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handlePromoteToAdmin = (memberId: string, memberName: string) => {
    Alert.alert(
      'Promote to Admin',
      `Are you sure you want to promote ${memberName} to admin?`,
      [
      { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              // This would typically call a service to promote the member
              Alert.alert('Success', `${memberName} has been promoted to admin.`);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to promote member. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDemoteFromAdmin = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Admin Status',
      `Are you sure you want to remove admin status from ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would typically call a service to demote the admin
              Alert.alert('Success', `${memberName} is no longer an admin.`);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to remove admin status. Please try again.');
            }
          }
        }
      ]
    );
  };

  const isCurrentUserAdmin = room.admins.includes(currentUserId);
  const isCurrentUserCreator = room.creatorId === currentUserId;
  const canManageMembers = isCurrentUserAdmin || isCurrentUserCreator;

  const formatDate = (timestamp: any) => {
    try {
      const date = new Date(timestamp?.toMillis?.() || timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getRoomStatus = () => {
    if (room.isTemporary && room.endsAt) {
      try {
        const endsAtMs = room.endsAt?.toMillis?.() || room.endsAt;
        if (endsAtMs && endsAtMs < Date.now()) {
          return { status: 'Expired', color: '#FF6B6B' };
        }
        return { status: 'Temporary', color: '#FF9800' };
      } catch (error) {
        return { status: 'Temporary', color: '#FF9800' };
      }
    }
    return { status: 'Permanent', color: '#4CAF50' };
  };

  const roomStatus = getRoomStatus();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Room Information</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Room Overview */}
          <View style={styles.section}>
            <View style={styles.roomOverview}>
              {room.logoUrl ? (
                <ExpoImage 
                  source={{ uri: room.logoUrl }} 
                  style={styles.roomLogo} 
                  contentFit="cover"
                  cachePolicy="disk"
                />
              ) : (
                <View style={[styles.roomLogo, styles.roomLogoFallback]}>
                  <Text style={styles.roomLogoFallbackText}>
                    {room.name?.charAt(0).toUpperCase() || 'R'}
                  </Text>
                </View>
              )}
              
              <View style={styles.roomDetails}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomDescription}>
                  {room.description || 'No description'}
                </Text>
                
                <View style={styles.roomBadges}>
                  <View style={[styles.roomBadge, { backgroundColor: roomStatus.color }]}>
                    <Text style={styles.roomBadgeText}>{roomStatus.status}</Text>
                  </View>
                  {room.isPrivate && (
                    <View style={[styles.roomBadge, { backgroundColor: '#FF9800' }]}>
                      <Ionicons name="lock-closed" size={12} color="#fff" />
                      <Text style={styles.roomBadgeText}>Private</Text>
                    </View>
                  )}
                  <View style={[styles.roomBadge, { backgroundColor: '#007AFF' }]}>
                    <Ionicons name="people" size={12} color="#fff" />
                    <Text style={styles.roomBadgeText}>{room.membersCount || members.length}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Room Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Room Details</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {formatDate(room.createdAt)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValue}>
                {formatDate(room.updatedAt)}
              </Text>
            </View>
            
          {room.isTemporary && room.endsAt && (
              <View style={styles.detailRow}>
                <Ionicons name="hourglass-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Expires</Text>
                <Text style={styles.detailValue}>
                  {formatDate(room.endsAt)}
            </Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Creator</Text>
              <Text style={styles.detailValue}>
                {memberProfiles.find(p => p.uid === room.creatorId)?.name || 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Members ({members.length})</Text>
              {canManageMembers && (
            <TouchableOpacity
                  style={styles.inviteButton}
                  onPress={() => setShowInviteSection(!showInviteSection)}
            >
                  <Ionicons name="person-add" size={20} color="#007AFF" />
                  <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
              )}
          </View>

            {/* Invite Section */}
            {showInviteSection && (
              <View style={styles.inviteSection}>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={styles.inviteSendButton}
                    onPress={handleInviteUser}
                    disabled={!inviteEmail.trim() || inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={styles.inviteSendButtonText}>Send Invite</Text>
                      </>
                    )}
            </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.inviteCancelButton}
                    onPress={() => {
                      setShowInviteSection(false);
                      setInviteEmail('');
                    }}
                  >
                    <Text style={styles.inviteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Members List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading members...</Text>
              </View>
            ) : (
              <View style={styles.membersList}>
                {members.map((member) => {
                  const profile = memberProfiles.find(p => p.uid === member.uid);
                  const isAdmin = room.admins.includes(member.uid);
                  const isCurrentUser = member.uid === currentUserId;
                  const canManageThisMember = canManageMembers && !isCurrentUser;

                  return (
                    <View key={member.uid} style={styles.memberItem}>
                      <ExpoImage
                        source={{ 
                          uri: profile?.profilePhotoUrl || 'https://via.placeholder.com/40'
                        }}
                        style={styles.memberAvatar}
                        contentFit="cover"
                        cachePolicy="disk"
                      />
                      
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={[styles.memberName, isCurrentUser && styles.currentUserText]}>
                            {profile?.name || 'Unknown User'}
                            {isCurrentUser && ' (You)'}
                          </Text>
                          {isAdmin && (
                            <View style={styles.adminBadge}>
                              <Ionicons name="shield-checkmark" size={12} color="#fff" />
                              <Text style={styles.adminBadgeText}>Admin</Text>
                            </View>
                          )}
                        </View>
                        
                        <Text style={styles.memberRole}>
                          {isAdmin ? 'Administrator' : 'Member'}
                        </Text>
                        
                        <Text style={styles.memberJoined}>
                          Joined {formatDate(member.joinedAt)}
                        </Text>
                      </View>

                      {/* Member Actions */}
                      {canManageThisMember && (
                        <View style={styles.memberActions}>
                          {isAdmin ? (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleDemoteFromAdmin(member.uid, profile?.name || 'Unknown')}
                            >
                              <Ionicons name="shield-outline" size={16} color="#FF9800" />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handlePromoteToAdmin(member.uid, profile?.name || 'Unknown')}
                            >
                              <Ionicons name="shield" size={16} color="#007AFF" />
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleRemoveMember(member.uid, profile?.name || 'Unknown')}
                          >
                            <Ionicons name="person-remove" size={16} color="#FF6B6B" />
              </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  roomOverview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  roomLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  roomLogoFallback: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomLogoFallbackText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 32,
  },
  roomDetails: {
    flex: 1,
  },
  roomName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  roomDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  roomBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  roomBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    gap: 4,
  },
  inviteButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  inviteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  inviteSendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
  },
  inviteCancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  currentUserText: {
    color: '#007AFF',
  },
  adminBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberJoined: {
    fontSize: 12,
    color: '#999',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
});

export default RoomInfoModal; 