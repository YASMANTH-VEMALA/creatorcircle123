import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { roomService, Room } from '../services/roomService';

const RoomsListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [pendingPrivateRoom, setPendingPrivateRoom] = useState<Room | null>(null);
  const [joinKeyInput, setJoinKeyInput] = useState('');
  const [, forceTick] = useState(0);

  useEffect(() => {
    const unsub = roomService.subscribeToAllRooms(setRooms);
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => { unsub(); clearInterval(t); };
  }, []);

  const handleJoin = async () => {
    const id = roomIdInput.trim().toUpperCase();
    if (!id) return;
    try {
      const room = await roomService.getRoom(id);
      if (!room) {
        Alert.alert('Not found', 'No room with that ID');
        return;
      }
      if (room.isPrivate) {
        setPendingPrivateRoom(room);
      } else {
        await roomService.joinRoom(id, user!.uid);
        setRoomIdInput('');
        navigation.navigate('RoomChat' as never, { roomId: id, roomName: room.name } as never);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not join room');
    }
  };

  function remainingText(item: Room): string | null {
    if (!item.isTemporary || !(item as any).endsAt) return null;
    const endsAtMs = (item as any).endsAt?.toMillis?.() || (item as any).endsAt;
    if (!endsAtMs) return null;
    const diff = Math.max(0, endsAtMs - Date.now());
    const hh = Math.floor(diff / 3600000);
    const mm = Math.floor((diff % 3600000) / 60000);
    const ss = Math.floor((diff % 60000) / 1000);
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }

  const renderItem = ({ item }: { item: Room }) => (
    <TouchableOpacity style={styles.roomItem} onPress={() => navigation.navigate('RoomChat' as never, { roomId: item.id, roomName: item.name } as never)}>
      {item.logoUrl ? (
        <Image source={{ uri: item.logoUrl }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={styles.logoFallbackText}>{item.name?.charAt(0).toUpperCase() || 'R'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.roomName}>{item.name}</Text>
          {item.isTemporary && (
            <View style={styles.tempBadge}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.tempBadgeText}>{remainingText(item) || 'Expired'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.roomMeta}>{item.isPrivate ? 'Private' : 'Public'} • {item.membersCount || 0} members</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>        
        <Text style={styles.title}>Collaborative Rooms</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateRoom' as never)}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.joinRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter Room ID"
          autoCapitalize="characters"
          value={roomIdInput}
          onChangeText={setRoomIdInput}
        />
        <TouchableOpacity style={[styles.joinBtn, !roomIdInput.trim() && { backgroundColor: '#ccc' }]} disabled={!roomIdInput.trim()} onPress={handleJoin}>
          <Text style={styles.joinBtnText}>Join</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No rooms available.</Text>}
      />

      {pendingPrivateRoom && (
        <View style={styles.joinKeyBar}>
          <Text style={styles.joinKeyLabel}>Enter join key for {pendingPrivateRoom.name}</Text>
          <View style={styles.joinKeyRow}>
            <TextInput
              style={styles.joinKeyInput}
              placeholder="Join key"
              secureTextEntry
              value={joinKeyInput}
              onChangeText={setJoinKeyInput}
            />
            <TouchableOpacity
              style={[styles.joinBtn, !joinKeyInput.trim() && { backgroundColor: '#ccc' }]}
              disabled={!joinKeyInput.trim()}
              onPress={async () => {
                try {
                  await roomService.joinRoom(pendingPrivateRoom.id, user!.uid, joinKeyInput.trim());
                  setJoinKeyInput('');
                  setPendingPrivateRoom(null);
                  setRoomIdInput('');
                  navigation.navigate('RoomChat' as never, { roomId: pendingPrivateRoom.id, roomName: pendingPrivateRoom.name } as never);
                } catch (e: any) {
                  Alert.alert('Access denied', e?.message || 'Invalid join key');
                }
              }}
            >
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setPendingPrivateRoom(null); setJoinKeyInput(''); }}>
            <Text style={{ color: '#999', marginTop: 6 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: '700', color: '#222' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  createBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  joinRow: { flexDirection: 'row', padding: 16, backgroundColor: 'white', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginRight: 10, backgroundColor: '#fafafa' },
  joinBtn: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  joinBtnText: { color: 'white', fontWeight: '700' },
  roomItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  logo: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  logoFallback: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  logoFallbackText: { color: 'white', fontWeight: '700', fontSize: 18 },
  roomName: { fontSize: 16, fontWeight: '600', color: '#222' },
  roomMeta: { marginTop: 2, fontSize: 12, color: '#666' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  joinKeyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', padding: 12 },
  joinKeyLabel: { fontSize: 13, color: '#555', marginBottom: 6 },
  joinKeyRow: { flexDirection: 'row', alignItems: 'center' },
  joinKeyInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginRight: 10, backgroundColor: '#fafafa' },
  tempBadge: { marginLeft: 8, backgroundColor: '#ff6b6b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  tempBadgeText: { marginLeft: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
});

export default RoomsListScreen; 