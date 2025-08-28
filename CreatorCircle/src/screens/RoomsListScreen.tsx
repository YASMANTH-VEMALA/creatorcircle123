import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Alert, 
  Image, 
  RefreshControl,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { roomService, Room } from '../services/roomService';
import { Image as ExpoImage } from 'expo-image';

const RoomsListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [pendingPrivateRoom, setPendingPrivateRoom] = useState<Room | null>(null);
  const [joinKeyInput, setJoinKeyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      // Subscribe to all rooms and my rooms
      const unsubAll = roomService.subscribeToAllRooms((allRooms) => {
        setRooms(allRooms);
        setLoading(false);
      });
      
      const unsubMy = roomService.subscribeToMyRooms(user!.uid, (myRoomsList) => {
        setMyRooms(myRoomsList);
      });

      return () => {
        unsubAll();
        unsubMy();
      };
    } catch (error) {
      console.error('Error loading rooms:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRooms();
    } catch (error) {
      console.error('Error refreshing rooms:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoin = async () => {
    const id = roomIdInput.trim().toUpperCase();
    if (!id) return;
    
    try {
      const room = await roomService.getRoom(id);
      if (!room) {
        Alert.alert('Room Not Found', 'No room exists with that ID. Please check the room ID and try again.');
        return;
      }

      // Check if room is expired
      if (roomService.isRoomExpired(room)) {
        Alert.alert('Room Expired', 'This temporary room has expired and is no longer available.');
        return;
      }

      if (room.isPrivate) {
        setPendingPrivateRoom(room);
      } else {
        await roomService.joinRoom(id, user!.uid);
        setRoomIdInput('');
        navigation.navigate('RoomChat' as never, { roomId: id, roomName: room.name } as never);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not join room. Please try again.');
    }
  };

  const handleJoinPrivateRoom = async () => {
    if (!pendingPrivateRoom || !joinKeyInput.trim()) return;
    
    try {
      await roomService.joinRoom(pendingPrivateRoom.id, user!.uid, joinKeyInput.trim());
      setJoinKeyInput('');
      setPendingPrivateRoom(null);
      setRoomIdInput('');
      navigation.navigate('RoomChat' as never, { 
        roomId: pendingPrivateRoom.id, 
        roomName: pendingPrivateRoom.name 
      } as never);
    } catch (e: any) {
      Alert.alert('Access Denied', e?.message || 'Invalid join key. Please try again.');
    }
  };

  const remainingText = (item: Room): string | null => {
    if (!item.isTemporary || !item.endsAt) return null;
    
    try {
      const endsAtMs = item.endsAt?.toMillis?.() || item.endsAt;
      if (!endsAtMs) return null;
      
      const diff = Math.max(0, (typeof endsAtMs === 'number' ? endsAtMs : new Date(endsAtMs).getTime()) - Date.now());
      if (diff <= 0) return 'Expired';
      
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    } catch (error) {
      return 'Unknown';
    }
  };

  const renderRoomItem = ({ item }: { item: Room }) => {
    const isExpired = roomService.isRoomExpired(item);
    const remaining = remainingText(item);
    const isMyRoom = item.members.includes(user!.uid);

    return (
      <TouchableOpacity 
        style={[styles.roomItem, isExpired && styles.expiredRoom]} 
        onPress={() => {
          if (isExpired) {
            Alert.alert('Room Expired', 'This room has expired and is no longer accessible.');
            return;
          }
          navigation.navigate('RoomChat' as never, { 
            roomId: item.id, 
            roomName: item.name 
          } as never);
        }}
        disabled={isExpired}
      >
        {item.logoUrl ? (
          <ExpoImage 
            source={{ uri: item.logoUrl }} 
            style={styles.logo} 
            contentFit="cover"
            cachePolicy="disk"
            transition={150}
          />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoFallbackText}>
              {item.name?.charAt(0).toUpperCase() || 'R'}
            </Text>
          </View>
        )}
        
        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text style={[styles.roomName, isExpired && styles.expiredText]}>
              {item.name}
            </Text>
            {isMyRoom && (
              <View style={styles.myRoomBadge}>
                <Ionicons name="person" size={12} color="#fff" />
                <Text style={styles.myRoomBadgeText}>My Room</Text>
              </View>
            )}
            {item.isTemporary && (
              <View style={[styles.tempBadge, isExpired && styles.expiredBadge]}>
                <Ionicons name="time-outline" size={12} color="#fff" />
                <Text style={styles.tempBadgeText}>
                  {remaining || 'Expired'}
                </Text>
              </View>
            )}
            {item.isPrivate && (
              <View style={styles.privateBadge}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
                <Text style={styles.privateBadgeText}>Private</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.roomMeta, isExpired && styles.expiredText]}>
            {item.membersCount || 0} members
            {item.description && ` • ${item.description}`}
          </Text>
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isExpired ? "#ccc" : "#999"} 
        />
      </TouchableOpacity>
    );
  };

  const currentRooms = activeTab === 'all' ? rooms : myRooms;
  const filteredRooms = currentRooms.filter(room => !roomService.isRoomExpired(room));

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>        
        <Text style={styles.title}>Collaborative Rooms</Text>
        <TouchableOpacity 
          style={styles.createBtn} 
          onPress={() => navigation.navigate('CreateRoom' as never)}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Rooms ({rooms.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my' && styles.activeTab]} 
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Rooms ({myRooms.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Join Room Section */}
      <View style={styles.joinRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter Room ID"
          autoCapitalize="characters"
          value={roomIdInput}
          onChangeText={setRoomIdInput}
          maxLength={10}
        />
        <TouchableOpacity 
          style={[styles.joinBtn, !roomIdInput.trim() && styles.joinBtnDisabled]} 
          disabled={!roomIdInput.trim()} 
          onPress={handleJoin}
        >
          <Text style={styles.joinBtnText}>Join</Text>
        </TouchableOpacity>
      </View>

      {/* Rooms List */}
      <FlatList
        data={filteredRooms}
        keyExtractor={(r) => r.id}
        renderItem={renderRoomItem}
        contentContainerStyle={styles.roomsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'all' ? 'No Rooms Available' : 'You haven\'t joined any rooms yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all' 
                ? 'Be the first to create a collaborative room!' 
                : 'Join existing rooms or create your own to get started.'
              }
            </Text>
            {activeTab === 'my' && (
              <TouchableOpacity 
                style={styles.createFirstBtn}
                onPress={() => navigation.navigate('CreateRoom' as never)}
              >
                <Text style={styles.createFirstBtnText}>Create Your First Room</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Private Room Join Key Modal */}
      {pendingPrivateRoom && (
        <View style={styles.joinKeyBar}>
          <Text style={styles.joinKeyLabel}>
            Enter join key for "{pendingPrivateRoom.name}"
          </Text>
          <View style={styles.joinKeyRow}>
            <TextInput
              style={styles.joinKeyInput}
              placeholder="Join key"
              secureTextEntry
              value={joinKeyInput}
              onChangeText={setJoinKeyInput}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.joinBtn, !joinKeyInput.trim() && styles.joinBtnDisabled]}
              disabled={!joinKeyInput.trim()}
              onPress={handleJoinPrivateRoom}
            >
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.cancelBtn}
            onPress={() => { 
              setPendingPrivateRoom(null); 
              setJoinKeyInput(''); 
            }}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
  joinBtnDisabled: { backgroundColor: '#ccc' },
  roomItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  expiredRoom: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  logo: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  logoFallback: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  logoFallbackText: { color: 'white', fontWeight: '700', fontSize: 18 },
  roomInfo: { flex: 1, marginLeft: 12 },
  roomHeader: { flexDirection: 'row', alignItems: 'center' },
  roomName: { fontSize: 16, fontWeight: '600', color: '#222' },
  expiredText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  myRoomBadge: { marginLeft: 8, backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  myRoomBadgeText: { marginLeft: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
  tempBadge: { marginLeft: 8, backgroundColor: '#ff6b6b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  expiredBadge: {
    backgroundColor: '#ff6b6b',
  },
  tempBadgeText: { marginLeft: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
  privateBadge: { marginLeft: 8, backgroundColor: '#FF9800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  privateBadgeText: { marginLeft: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
  roomMeta: { marginTop: 2, fontSize: 12, color: '#666' },
  roomsList: { paddingBottom: 100 }, // Add padding for the join key bar
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  createFirstBtn: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createFirstBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  joinKeyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', padding: 12 },
  joinKeyLabel: { fontSize: 13, color: '#555', marginBottom: 6 },
  joinKeyRow: { flexDirection: 'row', alignItems: 'center' },
  joinKeyInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginRight: 10, backgroundColor: '#fafafa' },
  cancelBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#eee',
    borderRadius: 12,
  },
  cancelBtnText: {
    color: '#333',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
});

export default RoomsListScreen; 