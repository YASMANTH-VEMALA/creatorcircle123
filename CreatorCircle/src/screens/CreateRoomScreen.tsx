import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { roomService } from '../services/roomService';
import { useNavigation } from '@react-navigation/native';

const CreateRoomScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinKey, setJoinKey] = useState('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [endDateTime, setEndDateTime] = useState<Date>(new Date(Date.now() + 2 * 3600 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need media library permissions to select a logo');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setLogoUri(res.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    try {
      if (!user?.uid) return;
      if (!name.trim()) {
        Alert.alert('Validation', 'Room name is required');
        return;
      }
      if (isPrivate && !joinKey.trim()) {
        Alert.alert('Validation', 'Join key is required for private rooms');
        return;
      }
      let endsAtMs: number | undefined;
      if (isTemporary) {
        if (!endDateTime || endDateTime.getTime() <= Date.now()) {
          Alert.alert('Validation', 'Please select a future end date and time');
          return;
        }
        endsAtMs = endDateTime.getTime();
      }
      setSaving(true);
      const room = await roomService.createRoom({
        creatorId: user.uid,
        name,
        description,
        isPrivate,
        joinKeyPlain: isPrivate ? joinKey : undefined,
        isTemporary,
        endsAtMs,
        logoUri,
      });
      Alert.alert('Room created', `Room ID: ${room.id}`, [{ text: 'Copy', onPress: () => {} }, { text: 'OK' }]);
      navigation.navigate('RoomChat' as never, { roomId: room.id, roomName: room.name } as never);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to create room');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Room</Text>
      </View>

      <View style={styles.form}>
        <TouchableOpacity style={styles.logoPicker} onPress={pickImage}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="image-outline" size={28} color="#999" />
              <Text style={styles.logoText}>Add Room Logo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Room Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter room name" />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Describe the room" multiline />

        <View style={styles.row}>          
          <Text style={styles.labelInline}>Private Room</Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} />
        </View>
        {isPrivate && (
          <TextInput style={styles.input} value={joinKey} onChangeText={setJoinKey} placeholder="Set join key/password" secureTextEntry />
        )}

        <View style={styles.row}>          
          <Text style={styles.labelInline}>Temporary Room</Text>
          <Switch value={isTemporary} onValueChange={setIsTemporary} />
        </View>
        {isTemporary && (
          <View>
            <Text style={styles.help}>Select end date and time</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={[styles.timeBtn]} onPress={() => { setPickerMode('date'); setShowDatePicker(true); }}>
                <Ionicons name="calendar" size={16} color="#007AFF" />
                <Text style={styles.timeBtnText}>{endDateTime.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.timeBtn, { marginLeft: 8 }]} onPress={() => { setPickerMode('time'); setShowDatePicker(true); }}>
                <Ionicons name="time" size={16} color="#007AFF" />
                <Text style={styles.timeBtnText}>{endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={endDateTime}
                mode={pickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const d = new Date(endDateTime);
                    if (pickerMode === 'date') {
                      d.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                    } else {
                      d.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                    }
                    setEndDateTime(d);
                  }
                }}
              />
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.createBtn, saving && { opacity: 0.7 }]} onPress={handleCreate} disabled={saving}>
          <Text style={styles.createText}>{saving ? 'Creating...' : 'Create Room'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 54, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#222' },
  form: { padding: 16 },
  logoPicker: { alignSelf: 'center', marginBottom: 16 },
  logo: { width: 96, height: 96, borderRadius: 12 },
  logoPlaceholder: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  logoText: { marginTop: 6, color: '#999', fontSize: 12 },
  label: { marginTop: 8, fontSize: 14, color: '#555', marginBottom: 6 },
  labelInline: { fontSize: 14, color: '#555' },
  input: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  help: { color: '#777', fontSize: 12, marginBottom: 6 },
  timeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef4ff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#cfe0ff' },
  timeBtnText: { marginLeft: 6, color: '#007AFF', fontWeight: '600' },
  createBtn: { marginTop: 16, backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  createText: { color: 'white', fontWeight: '700' },
});

export default CreateRoomScreen; 