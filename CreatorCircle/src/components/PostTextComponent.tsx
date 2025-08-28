import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface PostTextComponentProps {
  content: string;
  maxLines?: number;
  maxCharacters?: number;
  style?: any;
  textStyle?: any;
  onHashtagPress?: (hashtag: string) => void;
  onMentionPress?: (mention: string) => void;
}

const PostTextComponent: React.FC<PostTextComponentProps> = ({
  content,
  maxLines = 3,
  maxCharacters = 120,
  style,
  textStyle,
  onHashtagPress,
  onMentionPress,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const HASHTAG_REGEX = /#[\w\u0590-\u05ff]+/g;
  const MENTION_REGEX = /@[\w\u0590-\u05ff]+/g;

  // Create rich text with proper inline formatting
  const richText = useMemo(() => {
    if (!content) return [];

    const segments: Array<{
      text: string;
      style: 'normal' | 'hashtag' | 'mention';
      key: string;
    }> = [];

    let lastIndex = 0;

    // Find all hashtags and mentions
    const hashtags = Array.from(content.matchAll(HASHTAG_REGEX));
    const mentions = Array.from(content.matchAll(MENTION_REGEX));

    const allMatches = [
      ...hashtags.map(match => ({ ...match, type: 'hashtag' as const })),
      ...mentions.map(match => ({ ...match, type: 'mention' as const }))
    ].sort((a, b) => a.index! - b.index!);

    allMatches.forEach((match, index) => {
      const matchIndex = match.index!;

      // Add text before the match
      if (matchIndex > lastIndex) {
        const textBefore = content.substring(lastIndex, matchIndex);
        if (textBefore.trim()) {
          segments.push({
            text: textBefore,
            style: 'normal',
            key: `text-${index}-before`,
          });
        }
      }

      // Add the hashtag or mention
      segments.push({
        text: match[0],
        style: match.type,
        key: `${match.type}-${index}`,
      });

      lastIndex = matchIndex + match[0].length;
    });

    // Add remaining text after the last match
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      if (remainingText.trim()) {
        segments.push({
          text: remainingText,
          style: 'normal',
          key: `text-${allMatches.length}-after`,
        });
      }
    }

    // If no hashtags or mentions found, return the entire content as normal text
    if (segments.length === 0) {
      return [{
        text: content,
        style: 'normal' as const,
        key: 'text-full',
      }];
    }

    return segments;
  }, [content]);

  const shouldTruncate = content.length > maxCharacters;
  const isTruncated = shouldTruncate && !isExpanded;

  const getDisplayContent = () => {
    if (!isTruncated) return richText;

    let charCount = 0;
    const truncatedSegments: typeof richText = [];

    for (const segment of richText) {
      if (charCount + segment.text.length > maxCharacters) {
        const remainingChars = maxCharacters - charCount;
        if (remainingChars > 3) {
          truncatedSegments.push({
            ...segment,
            text: segment.text.substring(0, remainingChars - 3) + '...',
            key: `truncated-${segment.key}`,
          });
        }
        break;
      }
      truncatedSegments.push(segment);
      charCount += segment.text.length;
    }

    return truncatedSegments;
  };

  const displayContent = getDisplayContent();

  const handleReadMore = () => {
    setIsExpanded(true);
  };

  const handleReadLess = () => {
    setIsExpanded(false);
  };

  const handleTextPress = (event: any) => {
    if (!onHashtagPress && !onMentionPress) return;

    // This is a simplified approach - in production you'd want to use onTextLayout
    // to get precise coordinates for each text segment
    console.log('Text tapped - implement precise segment detection');
  };

  return (
    <View style={[styles.container, style]}>
      {/* Use a single Text component with rich text for perfect alignment */}
      <Text
        style={[styles.contentText, textStyle]}
        numberOfLines={isTruncated ? maxLines : undefined}
        onPress={handleTextPress}
      >
        {displayContent.map((segment, index) => {
          // Use inline Text components with identical base styling for perfect alignment
          if (segment.style === 'hashtag') {
            return (
              <Text 
                key={segment.key} 
                style={[styles.baseText, styles.hashtagColor]}
              >
                {segment.text}
              </Text>
            );
          } else if (segment.style === 'mention') {
            return (
              <Text 
                key={segment.key} 
                style={[styles.baseText, styles.mentionColor]}
              >
                {segment.text}
              </Text>
            );
          } else {
            return (
              <Text key={segment.key} style={styles.baseText}>
                {segment.text}
              </Text>
            );
          }
        })}
      </Text>
      
      {shouldTruncate && (
        <TouchableOpacity
          onPress={isExpanded ? handleReadLess : handleReadMore}
          style={styles.readMoreContainer}
        >
          <Text style={styles.readMoreText}>
            {isExpanded ? 'Read less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    flexWrap: 'wrap',
    // Ensure consistent text rendering
    textAlign: 'left',
    includeFontPadding: false,
  },
  baseText: {
    // All text segments use identical base styling for perfect alignment
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 'normal',
    textAlignVertical: 'center',
    includeFontPadding: false,
    // Force consistent baseline
    textAlign: 'left',
  },
  hashtagColor: {
    color: '#22c55e',
  },
  mentionColor: {
    color: '#ef4444',
  },
  readMoreContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default PostTextComponent; 