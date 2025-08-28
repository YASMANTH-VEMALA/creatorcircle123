import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import PostTextComponent from './PostTextComponent';

const PostTextTest: React.FC = () => {
  const testPosts = [
    {
      id: '1',
      title: 'Test Post 1',
      content: 'This is a simple test post with #hashtag and @mention.',
    },
    {
      id: '2',
      title: 'Test Post 2',
      content: 'Working with #ReactNative and #CreatorCircle! Shoutout to @expo team.',
    },
    {
      id: '3',
      title: 'Test Post 3',
      content: 'Just finished our #mobile #app! Big thanks to @developer and @designer for the amazing work.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>PostTextComponent Test</Text>
        <Text style={styles.subtitle}>Testing hashtag and mention highlighting</Text>
        
        {testPosts.map((post) => (
          <View key={post.id} style={styles.testPost}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <PostTextComponent
              content={post.content}
              maxLines={3}
              maxCharacters={120}
              style={styles.postContent}
            />
          </View>
        ))}
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Expected Results:</Text>
          <Text style={styles.infoText}>• #hashtags should be GREEN</Text>
          <Text style={styles.infoText}>• @mentions should be RED</Text>
          <Text style={styles.infoText}>• Normal text should be BLACK</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  testPost: {
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
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  postContent: {
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#424242',
  },
});

export default PostTextTest; 