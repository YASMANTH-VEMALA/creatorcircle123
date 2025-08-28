import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PostCreationWithTags from './PostCreationWithTags';
import PostTextComponent from './PostTextComponent';

const TaggingDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'examples' | 'howto'>('create');

  const examplePosts = [
    {
      id: '1',
      title: 'Simple Tagging',
      content: 'Hey @johndoe, check out this #awesome project!',
    },
    {
      id: '2',
      title: 'Multiple Tags',
      content: 'Working with @janesmith and @mikejohnson on a new #ReactNative app. The #collaboration is amazing!',
    },
    {
      id: '3',
      title: 'Mixed Content',
      content: 'Just finished our #CreatorCircle app! Big thanks to @expo for the amazing tools and @react_native_team for the framework. #mobile #development #innovation',
    },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'create':
        return <PostCreationWithTags />;
      
      case 'examples':
        return (
          <ScrollView style={styles.examplesContainer}>
            <Text style={styles.sectionTitle}>Example Posts with Tagging</Text>
            
            {examplePosts.map((post) => (
              <View key={post.id} style={styles.examplePost}>
                <Text style={styles.examplePostTitle}>{post.title}</Text>
                <PostTextComponent
                  content={post.content}
                  maxLines={3}
                  maxCharacters={120}
                  style={styles.examplePostText}
                />
                <View style={styles.examplePostInfo}>
                  <Text style={styles.examplePostInfoText}>
                    • Hashtags are highlighted in green
                  </Text>
                  <Text style={styles.examplePostInfoText}>
                    • Mentions (@username) are highlighted in red
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        );
      
      case 'howto':
        return (
          <ScrollView style={styles.howtoContainer}>
            <Text style={styles.sectionTitle}>How to Tag People</Text>
            
            <View style={styles.howtoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Start Typing</Text>
                <Text style={styles.stepDescription}>
                  Begin writing your post. You can type normally or use the @ symbol to mention people.
                </Text>
              </View>
            </View>

            <View style={styles.howtoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Use the Tag Input</Text>
                <Text style={styles.stepDescription}>
                  Use the "Tag People" section to search and select users. This will automatically add @mentions to your post.
                </Text>
              </View>
            </View>

            <View style={styles.howtoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Add Hashtags</Text>
                <Text style={styles.stepDescription}>
                  Use # to create hashtags. For example: #ReactNative, #CreatorCircle, #innovation
                </Text>
              </View>
            </View>

            <View style={styles.howtoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Preview Your Post</Text>
                <Text style={styles.stepDescription}>
                  Tap "Preview" to see how your post will look with all the highlighting applied.
                </Text>
              </View>
            </View>

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Features</Text>
              
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Automatic hashtag detection (#word)</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Automatic mention detection (@username)</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>User search and selection</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Real-time preview</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Interactive hashtags and mentions</Text>
              </View>
            </View>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.activeTab]}
          onPress={() => setActiveTab('create')}
        >
          <Ionicons 
            name="create" 
            size={20} 
            color={activeTab === 'create' ? '#3b82f6' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
            Create Post
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'examples' && styles.activeTab]}
          onPress={() => setActiveTab('examples')}
        >
          <Ionicons 
            name="eye" 
            size={20} 
            color={activeTab === 'examples' ? '#3b82f6' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'examples' && styles.activeTabText]}>
            Examples
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'howto' && styles.activeTab]}
          onPress={() => setActiveTab('howto')}
        >
          <Ionicons 
            name="help-circle" 
            size={20} 
            color={activeTab === 'howto' ? '#3b82f6' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'howto' && styles.activeTabText]}>
            How To
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  examplesContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  examplePost: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  examplePostTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  examplePostText: {
    marginBottom: 12,
  },
  examplePostInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  examplePostInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  howtoContainer: {
    flex: 1,
    padding: 16,
  },
  howtoStep: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
});

export default TaggingDemo; 