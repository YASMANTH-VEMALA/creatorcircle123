import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import PostTextComponent from './PostTextComponent';

const PostTextDemo: React.FC = () => {
  const samplePosts = [
    {
      id: 1,
      title: 'Short Post',
      content: 'This is a short post with #reactnative and @developer mentions.',
    },
    {
      id: 2,
      title: 'Medium Post with Hashtags',
      content: 'Building amazing apps with #ReactNative! Shoutout to @expo for making development so smooth. The community is incredible and the tools are top-notch.',
    },
    {
      id: 3,
      title: 'Long Post with Multiple Mentions',
      content: 'Just finished an incredible coding session! 🚀 Working on a new #mobileapp using #ReactNative and #TypeScript. Big thanks to @john_doe for the amazing mentorship and @tech_community for all the support. The journey of learning mobile development has been absolutely fantastic. From understanding the basics of React Native to implementing complex features like real-time updates and push notifications, every step has been a learning experience. The community around React Native is incredibly supportive and helpful. Special shoutout to @react_native_team for building such an amazing framework and @expo_team for the incredible development tools. Can\'t wait to share more updates about this project! #coding #mobile #development #learning #community',
    },
    {
      id: 4,
      title: 'Post with Mixed Content',
      content: 'Check out this #awesome #project by @creative_dev! The UI is stunning and the functionality is top-notch. Really impressed with the attention to detail.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>Post Text Component Demo</Text>
        
        {samplePosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <PostTextComponent
              content={post.content}
              maxLines={3}
              maxCharacters={120}
              style={styles.postContent}
            />
          </View>
        ))}
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Features:</Text>
          <Text style={styles.infoText}>• #hashtags are highlighted in green</Text>
          <Text style={styles.infoText}>• @mentions are highlighted in red</Text>
          <Text style={styles.infoText}>• Long text is truncated with "Read more"</Text>
          <Text style={styles.infoText}>• Tap "Read more" to expand inline</Text>
          <Text style={styles.infoText}>• Tap "Read less" to collapse</Text>
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
    marginBottom: 20,
    color: '#333',
  },
  postCard: {
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
  infoCard: {
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

export default PostTextDemo; 