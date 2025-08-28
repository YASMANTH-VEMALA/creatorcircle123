import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import PostTextComponent from './PostTextComponent';

const AlignmentTestFixed: React.FC = () => {
  const testCases = [
    {
      id: '1',
      title: 'Your Exact Post',
      content: "That's the tea @reason and the #humans so we need tie skrbr",
    },
    {
      id: '2',
      title: 'Simple Test',
      content: 'Hello @user and #tag',
    },
    {
      id: '3',
      title: 'Mixed Content',
      content: 'Working with @janesmith on #ReactNative and #CreatorCircle!',
    },
    {
      id: '4',
      title: 'Multiple Mentions',
      content: 'Thanks @expo and @react_native_team for the amazing tools!',
    },
    {
      id: '5',
      title: 'Multiple Hashtags',
      content: 'Building #mobile #apps with #ReactNative and #TypeScript!',
    },
    {
      id: '6',
      title: 'Edge Cases',
      content: '#123 @user123 #test123 @test_user #mixed@content',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>Fixed Text Alignment Test</Text>
        <Text style={styles.subtitle}>
          Testing that hashtags and mentions now stay on the same baseline
        </Text>
        
        {testCases.map((testCase) => (
          <View key={testCase.id} style={styles.testCase}>
            <Text style={styles.testTitle}>{testCase.title}</Text>
            <View style={styles.textContainer}>
              <PostTextComponent
                content={testCase.content}
                maxLines={5}
                maxCharacters={200}
                style={styles.postText}
              />
            </View>
            <View style={styles.expectedResult}>
              <Text style={styles.expectedTitle}>Expected Result:</Text>
              <Text style={styles.expectedText}>
                ✅ All text should be on the same baseline
              </Text>
              <Text style={styles.expectedText}>
                ✅ #hashtags should be green and aligned
              </Text>
              <Text style={styles.expectedText}>
                ✅ @mentions should be red and aligned
              </Text>
              <Text style={styles.expectedText}>
                ✅ No text should appear above or below the line
              </Text>
            </View>
          </View>
        ))}
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What Was Fixed:</Text>
          <Text style={styles.infoText}>✅ Removed font weight differences</Text>
          <Text style={styles.infoText}>✅ Used identical base styling for all text</Text>
          <Text style={styles.infoText}>✅ Consistent fontSize and lineHeight</Text>
          <Text style={styles.infoText}>✅ Single Text component with inline styling</Text>
          <Text style={styles.infoText}>✅ Forced consistent baseline alignment</Text>
        </View>

        <View style={styles.importantNote}>
          <Text style={styles.importantTitle}>Important:</Text>
          <Text style={styles.importantText}>
            The text "That's the tea @reason and the #humans so we need tie skrbr" 
            should now display with all text perfectly aligned on the same baseline.
          </Text>
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
  testCase: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  textContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  postText: {
    marginBottom: 0,
  },
  expectedResult: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  expectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#1976d2',
  },
  expectedText: {
    fontSize: 12,
    color: '#424242',
    marginBottom: 2,
  },
  infoBox: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2e7d32',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#424242',
  },
  importantNote: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  importantTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#e65100',
  },
  importantText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
});

export default AlignmentTestFixed; 