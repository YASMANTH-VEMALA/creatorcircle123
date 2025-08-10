import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { roomService, Room, RoomMessage, RoomMember } from '../services/roomService';
import RoomInfoModal from '../components/RoomInfoModal';
import { UserService } from '../services/userService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';

interface Params { roomId: string; roomName?: string; }

const RoomChatScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { roomId } = route.params as Params;

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<(RoomMember & { profile?: any })[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [infoVisible, setInfoVisible] = useState(false);

  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsubRoom = roomService.listenToRoom(roomId, setRoom);
    const unsubMembers = roomService.listenToMembers(roomId, async (mems) => {
      // hydrate with profiles
      const enriched = await Promise.all(mems.map(async (m) => ({ ...m, profile: await UserService.getUserProfile(m.uid) })));
      setMembers(enriched);
    });
    const unsubMsgs = roomService.listenToMessages(roomId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => { unsubRoom(); unsubMembers(); unsubMsgs(); };
  }, [roomId]);

  const handleSend = async () => {
    if (!user?.uid || !input.trim()) return;
    try {
      const text = input.trim();
      setInput('');
      await roomService.sendMessage(roomId, user.uid, text);
    } catch (e) {
      setInput((prev) => prev || input);
      Alert.alert('Error', 'Failed to send');
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color="#007AFF" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.titleWrap} onPress={() => setInfoVisible(true)}>
        {room?.logoUrl ? (
          <ExpoImage source={{ uri: room.logoUrl }} style={styles.logo} contentFit="cover" cachePolicy="disk" transition={150} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoFallbackText}>{room?.name?.charAt(0).toUpperCase() || 'R'}</Text>
          </View>
        )}
        <View style={{ marginLeft: 10 }}>
          <Text numberOfLines={1} style={styles.title}>{room?.name || 'Room'}</Text>
          <Text style={styles.subtitle}>{room?.membersCount || members.length} members</Text>
        </View>
      </TouchableOpacity>
      <View style={{ width: 32 }} />
    </View>
  );

  const renderMessage = ({ item }: { item: RoomMessage }) => {
    const isMine = item.senderId === user?.uid;
    return (
      <View style={[styles.msgRow, isMine ? styles.me : styles.other]}>
        <View style={[styles.bubble, isMine ? styles.meBubble : styles.otherBubble]}>
          <Text style={[styles.msgText, isMine ? styles.meText : styles.otherText]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>        
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 8, color: '#666' }}>Loading room...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {header}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 12 }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !input.trim() && { backgroundColor: '#ccc' }]} disabled={!input.trim()} onPress={handleSend}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {room && (
        <RoomInfoModal
          visible={infoVisible}
          onClose={() => setInfoVisible(false)}
          room={room}
          members={members}
          currentUserId={user?.uid || ''}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 6, marginRight: 6 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  logoFallback: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  logoFallbackText: { color: 'white', fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: '#222', maxWidth: 200 },
  subtitle: { fontSize: 12, color: '#777' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgRow: { marginVertical: 6, paddingHorizontal: 10 },
  me: { alignItems: 'flex-end' },
  other: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  meBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 6 },
  otherBubble: { backgroundColor: 'white', borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15 },
  meText: { color: '#fff' },
  otherText: { color: '#222' },
  inputRow: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f0f3f6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120 },
  sendBtn: { marginLeft: 10, backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
});

export default RoomChatScreen; 