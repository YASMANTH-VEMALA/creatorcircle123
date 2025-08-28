import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Switch, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { roomService } from '../services/roomService';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ProfileImageService } from '../services/profileImageService';

const CreateRoomScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);
  const [duration, setDuration] = useState(60); // minutes
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 1440, label: '24 hours' },
  ];

  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLogoFile(result.assets[0].uri);
        setLogoUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoUrl(null);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    
    try {
      setUploadingLogo(true);
      const uploadedUrl = await ProfileImageService.uploadImage(logoFile, 'room-logos');
      return uploadedUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      Alert.alert('Error', 'Failed to upload logo. Room will be created without logo.');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Room name is required';
    }
    if (name.trim().length < 3) {
      return 'Room name must be at least 3 characters long';
    }
    if (name.trim().length > 50) {
      return 'Room name must be less than 50 characters';
    }
    if (description.trim().length > 200) {
      return 'Description must be less than 200 characters';
    }
    if (isTemporary && duration < 15) {
      return 'Temporary rooms must last at least 15 minutes';
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    try {
      setLoading(true);
      
      // Upload logo if selected
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        finalLogoUrl = await uploadLogo();
      }

      const roomId = await roomService.createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
        isTemporary,
        endsAt: isTemporary ? new Date(Date.now() + duration * 60000) : undefined,
        logoUrl: finalLogoUrl || undefined,
        creatorId: user!.uid,
      });

      Alert.alert(
        'Room Created!', 
        `Your room "${name.trim()}" has been created successfully. Room ID: ${roomId}`,
        [
          {
            text: 'Copy ID',
            onPress: () => {
              // You could implement clipboard functionality here
              console.log('Room ID:', roomId);
            }
          },
          {
            text: 'Go to Room',
            onPress: () => navigation.navigate('RoomChat' as never, { 
              roomId, 
              roomName: name.trim() 
            } as never)
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating room:', error);
      Alert.alert('Error', error?.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = name.trim().length >= 3 && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Create New Room</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.sectionTitle}>Room Logo (Optional)</Text>
            <View style={styles.logoContainer}>
              {logoUrl ? (
                <View style={styles.logoPreview}>
                  <ExpoImage 
                    source={{ uri: logoUrl }} 
                    style={styles.logoImage} 
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={200}
                  />
                  <TouchableOpacity 
                    style={styles.removeLogoButton}
                    onPress={removeLogo}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addLogoButton}
                  onPress={pickLogo}
                >
                  <Ionicons name="camera-outline" size={32} color="#007AFF" />
                  <Text style={styles.addLogoText}>Add Logo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room Name *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter room name"
                maxLength={50}
                autoFocus
              />
              <Text style={styles.characterCount}>
                {name.length}/50
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what this room is for..."
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {description.length}/200
              </Text>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Room Settings</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Private Room</Text>
                <Text style={styles.settingDescription}>
                  Only users with the join key can enter
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                thumbColor={isPrivate ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Temporary Room</Text>
                <Text style={styles.settingDescription}>
                  Room automatically expires after a set time
                </Text>
              </View>
              <Switch
                value={isTemporary}
                onValueChange={setIsTemporary}
                trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                thumbColor={isTemporary ? '#fff' : '#f4f3f4'}
              />
            </View>

            {isTemporary && (
              <View style={styles.durationSection}>
                <Text style={styles.durationLabel}>Duration</Text>
                <View style={styles.durationOptions}>
                  {durationOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.durationOption,
                        duration === option.value && styles.durationOptionActive
                      ]}
                      onPress={() => setDuration(option.value)}
                    >
                      <Text style={[
                        styles.durationOptionText,
                        duration === option.value && styles.durationOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Preview Section */}
          {(name.trim() || description.trim() || logoUrl) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={styles.previewCard}>
                {logoUrl && (
                  <ExpoImage 
                    source={{ uri: logoUrl }} 
                    style={styles.previewLogo} 
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                )}
                <View style={styles.previewContent}>
                  <Text style={styles.previewName}>
                    {name.trim() || 'Room Name'}
                  </Text>
                  <Text style={styles.previewDescription}>
                    {description.trim() || 'No description'}
                  </Text>
                  <View style={styles.previewBadges}>
                    {isPrivate && (
                      <View style={styles.previewBadge}>
                        <Ionicons name="lock-closed" size={12} color="#fff" />
                        <Text style={styles.previewBadgeText}>Private</Text>
                      </View>
                    )}
                    {isTemporary && (
                      <View style={styles.previewBadge}>
                        <Ionicons name="time-outline" size={12} color="#fff" />
                        <Text style={styles.previewBadgeText}>
                          {durationOptions.find(d => d.value === duration)?.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Create Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={!canCreate || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Room</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  placeholder: {
    width: 40,
  },
  logoSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPreview: {
    position: 'relative',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeLogoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addLogoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  addLogoText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  durationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  durationOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  durationOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  durationOptionTextActive: {
    color: '#fff',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previewLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  previewContent: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  previewBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  bottomBar: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreateRoomScreen; 