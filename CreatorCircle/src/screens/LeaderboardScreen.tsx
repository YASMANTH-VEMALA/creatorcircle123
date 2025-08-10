import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Avatar } from '../components/ui/Avatar';

interface LeaderboardUser {
  uid: string;
  name: string;
  profilePhotoUrl?: string;
  college?: string;
  skills?: string[];
  interests?: string[];
  xp?: number;
  level?: number;
  isVerified?: boolean;
}

const medalColor = (rank: number) => {
  if (rank === 1) return '#D4AF37'; // gold
  if (rank === 2) return '#C0C0C0'; // silver
  if (rank === 3) return '#CD7F32'; // bronze
  return null;
};

const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [allUsersCount, setAllUsersCount] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Subscribe to all users, then sort by XP client-side to include users missing xp field
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: LeaderboardUser[] = [];
      snap.forEach((d) => {
        const data: any = d.data();
        list.push({
          uid: data.uid || d.id,
          name: data.name || 'Unknown',
          profilePhotoUrl: data.profilePhotoUrl,
          college: data.college,
          skills: data.skills || [],
          interests: data.interests || [],
          xp: typeof data.xp === 'number' ? data.xp : 0,
          level: typeof data.level === 'number' ? data.level : 1,
          isVerified: !!data.isVerified,
        });
      });

      // Sort by XP desc and take top 100
      const sorted = list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      const top100 = sorted.slice(0, 100);
      setTopUsers(top100);

      // Total users
      setAllUsersCount(list.length);

      // Current user details and rank
      if (user?.uid) {
        const meIndex = sorted.findIndex(u => u.uid === user.uid);
        setCurrentRank(meIndex >= 0 ? meIndex + 1 : null);
        setCurrentUser(sorted.find(u => u.uid === user.uid) || null);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  const filteredTop = useMemo(() => {
    if (!search.trim()) return topUsers;
    const s = search.toLowerCase();
    return topUsers.filter(u => (u.name || '').toLowerCase().includes(s) || (u.college || '').toLowerCase().includes(s));
  }, [topUsers, search]);

  const renderItem = ({ item, index }: { item: LeaderboardUser; index: number }) => {
    const rankNum = index + 1;
    const mColor = medalColor(rankNum);
    return (
      <TouchableOpacity style={[styles.row, currentUser?.uid === item.uid && styles.meRow]} onPress={() => navigation.navigate('UserProfile' as never, { userId: item.uid, userName: item.name } as never)}>
        <View style={styles.rankCell}>
          {mColor ? (
            <View style={styles.medalWrap}>
              <Ionicons name="trophy" size={18} color={mColor} />
              <Text style={[styles.rankNumberOnMedal, { color: mColor }]}>{rankNum}</Text>
            </View>
          ) : (
            <Text style={styles.rankText}>#{rankNum}</Text>
          )}
        </View>
        <Avatar size="small" source={item.profilePhotoUrl} fallback={item.name?.charAt(0).toUpperCase() || 'U'} verified={!!item.isVerified} />
        <View style={styles.userCell}>
          <Text numberOfLines={1} style={styles.nameText}>
            {item.name} {item.isVerified ? <Ionicons name="checkmark-circle" size={14} color="#007AFF" /> : null}
          </Text>
          <Text numberOfLines={1} style={styles.subText}>{item.college || ''}</Text>
          <Text numberOfLines={1} style={styles.subText}>{[...(item.skills||[]), ...(item.interests||[])].slice(0, 3).join(' • ')}</Text>
        </View>
        <View style={styles.xpCell}><Text style={styles.xpText}>{item.xp || 0} XP</Text></View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* My Rank Card */}
      <View style={styles.card}>
        <Text style={styles.rankLine}>Rank: {currentRank ? `#${currentRank}` : '--'} {allUsersCount ? `of ${allUsersCount}` : ''}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={styles.detailText}>XP: {currentUser?.xp ?? '--'}</Text>
          <Text style={styles.detailText}>Level: {currentUser?.level ?? '--'}</Text>
        </View>
        <View style={styles.progressBar}><View style={[styles.progressFill, { width: '50%' }]} /></View>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Profile' as never)}>
          <Text style={styles.buttonText}>View My Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or college" style={styles.searchInput} />
      </View>

      {/* Top 100 List */}
      <FlatList
        data={filteredTop}
        keyExtractor={(item) => item.uid}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  card: { backgroundColor: 'white', margin: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  rankLine: { fontSize: 16, fontWeight: '600', color: '#333' },
  detailText: { fontSize: 14, color: '#666' },
  progressBar: { height: 6, backgroundColor: '#eee', borderRadius: 3, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 3 },
  button: { marginTop: 10, backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  searchRow: { backgroundColor: 'white', marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { marginLeft: 6, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rankCell: { width: 64, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontWeight: '700', color: '#333' },
  userCell: { flex: 1, marginLeft: 10 },
  nameText: { fontSize: 14, fontWeight: '600', color: '#333' },
  subText: { fontSize: 12, color: '#777' },
  xpCell: { width: 90, alignItems: 'flex-end' },
  xpText: { fontWeight: '700', color: '#333' },
  meRow: { backgroundColor: '#f2f9ff' },
  medalWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankNumberOnMedal: { fontWeight: '700' },
});

export default LeaderboardScreen; 