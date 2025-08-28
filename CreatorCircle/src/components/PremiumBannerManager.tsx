import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Banner } from '../types';
import { PremiumBannerService } from '../services/premiumBannerService';
import { PremiumService } from '../services/premiumService';

const { width } = Dimensions.get('window');

interface PremiumBannerManagerProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onBannersUpdated: () => void;
}

const PremiumBannerManager: React.FC<PremiumBannerManagerProps> = ({
  visible,
  onClose,
  userId,
  onBannersUpdated,
}) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [canAddBanner, setCanAddBanner] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);
  const [maxAllowed, setMaxAllowed] = useState(0);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerDescription, setNewBannerDescription] = useState('');

  useEffect(() => {
    if (visible) {
      loadBanners();
      checkBannerLimit();
    }
  }, [visible]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const result = await PremiumBannerService.getUserBanners(userId);
      setBanners(result.banners);
    } catch (error) {
      console.error('Error loading banners:', error);
      Alert.alert('Error', 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const checkBannerLimit = async () => {
    try {
      const result = await PremiumBannerService.canAddBanner(userId);
      setCanAddBanner(result.canAdd);
      setCurrentCount(result.currentCount);
      setMaxAllowed(result.maxAllowed);
    } catch (error) {
      console.error('Error checking banner limit:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 1], // Banner aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addBanner(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const addBanner = async (imageUri: string) => {
    try {
      setLoading(true);
      
      // Clean form data to prevent undefined values
      const cleanTitle = newBannerTitle.trim() || null;
      const cleanDescription = newBannerDescription.trim() || null;
      
      const result = await PremiumBannerService.addBanner(
        userId,
        imageUri,
        cleanTitle,
        cleanDescription
      );

      if (result.success) {
        Alert.alert('Success', result.message);
        setNewBannerTitle('');
        setNewBannerDescription('');
        setShowAddForm(false);
        await loadBanners();
        await checkBannerLimit();
        onBannersUpdated();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error adding banner:', error);
      Alert.alert('Error', 'Failed to add banner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateBanner = async (bannerId: string, updates: Partial<Banner>) => {
    try {
      setLoading(true);
      
      // Clean updates to prevent undefined values
      const cleanUpdates: Partial<Banner> = {};
      if (updates.title !== undefined) {
        cleanUpdates.title = updates.title?.trim() || null;
      }
      if (updates.description !== undefined) {
        cleanUpdates.description = updates.description?.trim() || null;
      }
      
      const result = await PremiumBannerService.updateBanner(userId, bannerId, cleanUpdates);

      if (result.success) {
        Alert.alert('Success', result.message);
        setEditingBanner(null);
        await loadBanners();
        onBannersUpdated();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error updating banner:', error);
      Alert.alert('Error', 'Failed to update banner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteBanner = async (bannerId: string) => {
    Alert.alert(
      'Delete Banner',
      'Are you sure you want to delete this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await PremiumBannerService.deleteBanner(userId, bannerId);

              if (result.success) {
                Alert.alert('Success', result.message);
                await loadBanners();
                await checkBannerLimit();
                onBannersUpdated();
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('Error deleting banner:', error);
              Alert.alert('Error', 'Failed to delete banner');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleBannerActive = async (bannerId: string) => {
    try {
      setLoading(true);
      const result = await PremiumBannerService.toggleBannerActive(userId, bannerId);

      if (result.success) {
        await loadBanners();
        onBannersUpdated();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error toggling banner status:', error);
      Alert.alert('Error', 'Failed to toggle banner status');
    } finally {
      setLoading(false);
    }
  };

  const reorderBanners = async (fromIndex: number, toIndex: number) => {
    try {
      const newBanners = [...banners];
      const [movedBanner] = newBanners.splice(fromIndex, 1);
      newBanners.splice(toIndex, 0, movedBanner);

      // Update order numbers
      newBanners.forEach((banner, index) => {
        banner.order = index;
      });

      const bannerIds = newBanners.map(b => b.id);
      const result = await PremiumBannerService.reorderBanners(userId, bannerIds);

      if (result.success) {
        setBanners(newBanners);
        onBannersUpdated();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error reordering banners:', error);
      Alert.alert('Error', 'Failed to reorder banners');
    }
  };

  const renderBannerItem = (banner: Banner, index: number) => (
    <View key={banner.id} style={styles.bannerItem}>
      <View style={styles.bannerPreview}>
        <Image source={{ uri: banner.imageUrl }} style={styles.bannerPreviewImage} />
        <View style={styles.bannerPreviewOverlay}>
          <Text style={styles.bannerPreviewTitle}>{banner.title || 'No Title'}</Text>
          <Text style={styles.bannerPreviewDescription} numberOfLines={2}>
            {banner.description || 'No Description'}
          </Text>
        </View>
      </View>

      <View style={styles.bannerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => toggleBannerActive(banner.id)}
        >
          <Ionicons
            name={banner.isActive ? 'eye' : 'eye-off'}
            size={16}
            color={banner.isActive ? '#4CAF50' : '#666'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => setEditingBanner(banner)}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteBanner(banner.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Reorder handles */}
      {banners.length > 1 && (
        <View style={styles.reorderHandles}>
          {index > 0 && (
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => reorderBanners(index, index - 1)}
            >
              <Ionicons name="arrow-up" size={16} color="#666" />
            </TouchableOpacity>
          )}
          {index < banners.length - 1 && (
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => reorderBanners(index, index + 1)}
            >
              <Ionicons name="arrow-down" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderEditForm = () => (
    <Modal visible={!!editingBanner} animationType="slide" transparent>
      <View style={styles.editModalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Banner</Text>
            <TouchableOpacity onPress={() => setEditingBanner(null)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {editingBanner && (
            <>
              <Image source={{ uri: editingBanner.imageUrl }} style={styles.editBannerImage} />
              
              <TextInput
                style={styles.editInput}
                placeholder="Banner Title"
                value={editingBanner.title || ''}
                onChangeText={(text) => setEditingBanner({ ...editingBanner, title: text })}
              />
              
              <TextInput
                style={styles.editInput}
                placeholder="Banner Description"
                value={editingBanner.description || ''}
                onChangeText={(text) => setEditingBanner({ ...editingBanner, description: text })}
                multiline
                numberOfLines={3}
              />

              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.cancelButton]}
                  onPress={() => setEditingBanner(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.editModalButton, styles.saveButton]}
                  onPress={() => updateBanner(editingBanner.id, {
                    title: editingBanner.title,
                    description: editingBanner.description,
                  })}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderAddForm = () => (
    <View style={styles.addFormContainer}>
      <Text style={styles.addFormTitle}>Add New Banner</Text>
      
      <TextInput
        style={styles.addInput}
        placeholder="Banner Title (optional)"
        value={newBannerTitle}
        onChangeText={setNewBannerTitle}
      />
      
      <TextInput
        style={styles.addInput}
        placeholder="Banner Description (optional)"
        value={newBannerDescription}
        onChangeText={setNewBannerDescription}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.addBannerButton, !canAddBanner && styles.disabledButton]}
        onPress={pickImage}
        disabled={!canAddBanner || loading}
      >
        <Ionicons name="image-outline" size={20} color="white" />
        <Text style={styles.addBannerButtonText}>Select Image</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelAddButton}
        onPress={() => setShowAddForm(false)}
      >
        <Text style={styles.cancelAddButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Banners</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Banner Limit Info */}
        <View style={styles.limitInfo}>
          <Text style={styles.limitText}>
            {currentCount} / {maxAllowed} banners used
          </Text>
          {!canAddBanner && (
            <Text style={styles.limitWarning}>
              {currentCount >= maxAllowed ? 'Maximum banners reached' : 'Premium subscription required'}
            </Text>
          )}
        </View>

        {/* Add Banner Button */}
        {canAddBanner && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Banner</Text>
          </TouchableOpacity>
        )}

        {/* Add Form */}
        {showAddForm && renderAddForm()}

        {/* Banners List */}
        <ScrollView style={styles.bannersList} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading banners...</Text>
            </View>
          ) : banners.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No banners yet</Text>
              <Text style={styles.emptySubtext}>
                Add up to {maxAllowed} banners to showcase your creativity
              </Text>
            </View>
          ) : (
            banners.map((banner, index) => renderBannerItem(banner, index))
          )}
        </ScrollView>

        {/* Edit Modal */}
        {renderEditForm()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  limitInfo: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  limitWarning: {
    fontSize: 14,
    color: '#FF3B30',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addFormContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  addFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  addBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  addBannerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelAddButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelAddButtonText: {
    color: '#666',
    fontSize: 16,
  },
  bannersList: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  bannerItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerPreview: {
    position: 'relative',
  },
  bannerPreviewImage: {
    width: '100%',
    height: 120,
  },
  bannerPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  bannerPreviewTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bannerPreviewDescription: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  bannerActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleButton: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  editButton: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  deleteButton: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff5f5',
  },
  reorderHandles: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 16,
  },
  reorderButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editBannerImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PremiumBannerManager; 