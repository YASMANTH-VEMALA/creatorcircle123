import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Local interface for media items (will be updated when new chat system is built)
interface ChatMedia {
  id: string;
  type: 'image' | 'video' | 'link' | 'document';
  url: string;
  thumbnail?: string;
  name?: string;
  senderName: string;
  timestamp: { seconds: number; nanoseconds: number };
}

const { width } = Dimensions.get('window');

interface MediaGalleryProps {
  visible: boolean;
  onClose: () => void;
  chatId: string;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  visible,
  onClose,
  chatId,
}) => {
  const [mediaItems, setMediaItems] = useState<ChatMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'images' | 'links' | 'docs'>('all');

  useEffect(() => {
    if (visible) {
      loadMediaItems();
    }
  }, [visible, chatId]);

  const loadMediaItems = async () => {
    setLoading(true);
    try {
      // TODO: Implement media loading when new chat system is built
      console.log('Media loading will be implemented with new chat system');
      setMediaItems([]); // Show empty state for now
    } catch (error) {
      console.error('Error loading media:', error);
      Alert.alert('Error', 'Failed to load media items');
    } finally {
      setLoading(false);
    }
  };

  const filterMediaByType = (items: ChatMedia[]) => {
    switch (selectedTab) {
      case 'images':
        return items.filter(item => item.type === 'image' || item.type === 'video');
      case 'links':
        return items.filter(item => item.type === 'link');
      case 'docs':
        return items.filter(item => item.type === 'document');
      default:
        return items;
    }
  };

  const filteredMedia = filterMediaByType(mediaItems);

  const renderTabButton = (tab: typeof selectedTab, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        selectedTab === tab && styles.activeTabButton,
      ]}
      onPress={() => setSelectedTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={selectedTab === tab ? '#007AFF' : '#666'}
      />
      <Text style={[
        styles.tabButtonText,
        selectedTab === tab && styles.activeTabButtonText,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderMediaItem = ({ item }: { item: ChatMedia }) => {
    const handlePress = () => {
      if (item.type === 'link') {
        // Open link (you might want to use WebBrowser.openBrowserAsync)
        Alert.alert('Link', item.url);
      } else if (item.type === 'document') {
        // Open document
        Alert.alert('Document', item.name || 'Document');
      }
      // For images/videos, you might want to open a full-screen viewer
    };

    return (
      <TouchableOpacity style={styles.mediaItem} onPress={handlePress}>
        <View style={styles.mediaContainer}>
          {item.type === 'image' || item.type === 'video' ? (
            <Image
              source={{ uri: item.thumbnail || item.url }}
              style={styles.mediaThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.fileIconContainer}>
              <Ionicons
                name={
                  item.type === 'link' ? 'link' :
                  item.type === 'document' ? 'document-text' : 'folder'
                }
                size={32}
                color="#666"
              />
            </View>
          )}
          
          {item.type === 'video' && (
            <View style={styles.videoOverlay}>
              <Ionicons name="play-circle" size={24} color="white" />
            </View>
          )}
        </View>
        
        <View style={styles.mediaInfo}>
          <Text style={styles.mediaName} numberOfLines={2}>
            {item.name || item.url}
          </Text>
          <Text style={styles.mediaSender}>
            {item.senderName}
          </Text>
          <Text style={styles.mediaDate}>
            {new Date(item.timestamp.seconds * 1000).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="images-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No media shared yet</Text>
      <Text style={styles.emptyStateSubtext}>
        {selectedTab === 'all' ? 'Start sharing photos, videos, links, and documents!' :
         selectedTab === 'images' ? 'No images or videos shared yet' :
         selectedTab === 'links' ? 'No links shared yet' :
         'No documents shared yet'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Media Gallery</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {renderTabButton('all', 'All', 'grid')}
            {renderTabButton('images', 'Media', 'images')}
            {renderTabButton('links', 'Links', 'link')}
            {renderTabButton('docs', 'Docs', 'document-text')}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading media...</Text>
              </View>
            ) : filteredMedia.length > 0 ? (
              <FlatList
                data={filteredMedia}
                renderItem={renderMediaItem}
                keyExtractor={(item) => item.id}
                numColumns={selectedTab === 'images' ? 3 : 1}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.mediaList}
              />
            ) : (
              renderEmptyState()
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  activeTabButton: {
    backgroundColor: '#E3F2FD',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  mediaList: {
    paddingVertical: 16,
  },
  mediaItem: {
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
    marginHorizontal: 4,
  },
  mediaContainer: {
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: 120,
  },
  fileIconContainer: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  videoOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  mediaInfo: {
    padding: 8,
  },
  mediaName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  mediaSender: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  mediaDate: {
    fontSize: 10,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default MediaGallery; 