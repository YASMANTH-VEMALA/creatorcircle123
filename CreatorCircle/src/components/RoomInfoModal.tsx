import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Room, RoomMember, roomService } from '../services/roomService';
import { Profile } from '../types';
import { useNavigation } from '@react-navigation/native';

interface Props {
  visible: boolean;
  onClose: () => void;
  room: Room;
  members: (RoomMember & { profile?: Profile })[];
  currentUserId: string;
}

const RoomInfoModal: React.FC<Props> = ({ visible, onClose, room, members, currentUserId }) => {
  const isAdmin = !!room.admins?.includes(currentUserId);
  const navigation = useNavigation();

  const handleExit = async () => {
    try {
      await roomService.exitRoom(room.id, currentUserId);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to exit');
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Room', 'This will delete the room for everyone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await roomService.deleteRoom(room.id, currentUserId); onClose(); } catch (e: any) { Alert.alert('Error', e?.message || 'Delete failed'); }
      } },
    ]);
  };

  // New: change room password (join key) — only room host
  const handleChangePassword = () => {
    if (room.creatorId !== currentUserId) {
      Alert.alert('Only host', 'Only the room host can change the password');
      return;
    }
    let input = '';
    Alert.prompt(
      'Change Room Password',
      'Enter a new join key/password',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (text) => {
            const value = (text || '').trim();
            if (!value) { Alert.alert('Validation', 'Password cannot be empty'); return; }
            try { await roomService.updateJoinKey(room.id, currentUserId, value); Alert.alert('Updated', 'Password updated successfully'); }
            catch (e: any) { Alert.alert('Error', e?.message || 'Failed to update'); }
          },
        },
      ],
      'secure-text',
      input
    );
  };

  // New: remove specified member — only room host
  const confirmRemoveMember = (targetUid: string, targetName?: string) => {
    if (room.creatorId !== currentUserId) return;
    Alert.alert('Remove Member', `Remove ${targetName || 'this user'} from the room?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await roomService.removeMember(room.id, currentUserId, targetUid); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed to remove'); }
      } },
    ]);
  };

  const renderMember = ({ item }: { item: RoomMember & { profile?: Profile } }) => {
    const you = item.uid === currentUserId;
    const isMemberAdmin = room.admins?.includes(item.uid);
    return (
      <TouchableOpacity
        style={styles.memberRow}
        onPress={() => navigation.navigate('UserProfile' as never, { userId: item.uid, userName: item.profile?.name } as never)}
        onLongPress={() => {
          if (room.creatorId === currentUserId && item.uid !== currentUserId) {
            // Host long-press: remove member
            confirmRemoveMember(item.uid, item.profile?.name);
            return;
          }
          if (!isAdmin || you || isMemberAdmin) return;
          Alert.alert('Grant Admin', `Make ${item.profile?.name || 'this user'} an admin?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant', onPress: () => roomService.grantAdmin(room.id, currentUserId, item.uid).catch((e) => Alert.alert('Error', e?.message || 'Failed')) },
          ]);
        }}
      >
        {item.profile?.profilePhotoUrl ? (
          <Image source={{ uri: item.profile.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>{(item.profile?.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.nameRow}>
            {item.profile?.name || 'Unknown'} {you ? ' (You)' : ''}
          </Text>
          <Text style={styles.sub}>{item.profile?.college || ''}</Text>
        </View>
        {isMemberAdmin && <Ionicons name="shield-checkmark" size={18} color="#007AFF" />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{room.name}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#222" /></TouchableOpacity>
          </View>

          <View style={styles.glassAction}>
            <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.exitText}>Exit Group</Text>
            </TouchableOpacity>
            {room.creatorId === currentUserId && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleChangePassword}>
                <Ionicons name="key" size={18} color="#fff" />
                <Text style={styles.exitText}>Change Password</Text>
              </TouchableOpacity>
            )}
            {isAdmin && !room.isTemporary && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.exitText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.count}>{room.membersCount || members.length} members</Text>

          <FlatList
            data={members}
            keyExtractor={(m) => m.uid}
            renderItem={renderMember}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 16, padding: 16, backdropFilter: 'blur(10px)' as any },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#222' },
  glassAction: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 10, marginTop: 12, justifyContent: 'space-between' },
  exitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#c62828', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  exitText: { color: 'white', fontWeight: '700', marginLeft: 6 },
  count: { marginTop: 12, color: '#555', fontSize: 13 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  avatarFallback: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: 'white', fontWeight: '700' },
  nameRow: { fontSize: 15, fontWeight: '600', color: '#222' },
  sub: { fontSize: 12, color: '#777' },
});

export default RoomInfoModal; 