# Post Text Component - React Native

A comprehensive React Native component for displaying post text with hashtag/mention highlighting and read more functionality.

## 🚀 Features

- ✅ **Hashtag Detection**: Automatically detects and highlights `#hashtags` in green
- ✅ **Mention Detection**: Automatically detects and highlights `@mentions` in red
- ✅ **Text Truncation**: Shows only first 3 lines (or 120 characters) by default
- ✅ **Read More/Less**: Expandable text with inline expansion
- ✅ **Interactive Elements**: Tappable hashtags and mentions
- ✅ **Performance Optimized**: Uses `useMemo` for efficient text processing
- ✅ **Customizable**: Configurable max lines, characters, and styling
- ✅ **TypeScript Support**: Full TypeScript interfaces and type safety

## 📦 Components

### 1. PostTextComponent
The main component for displaying post text with highlighting.

### 2. PostTextDemo
A demo component showcasing various use cases.

### 3. PostCardExample
A complete post card example showing real-world integration.

## 🔧 Installation

Copy the component files to your project:

```bash
src/components/
├── PostTextComponent.tsx    # Main component
├── PostTextDemo.tsx         # Demo component
├── PostCardExample.tsx      # Usage example
└── README.md                # This file
```

## 📱 Basic Usage

```tsx
import PostTextComponent from './components/PostTextComponent';

const MyPost = () => {
  return (
    <PostTextComponent
      content="Check out this #awesome #project by @developer! It's really amazing."
      maxLines={3}
      maxCharacters={120}
    />
  );
};
```

## ⚙️ Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | Required | The post text content |
| `maxLines` | `number` | `3` | Maximum lines to show when truncated |
| `maxCharacters` | `number` | `120` | Maximum characters to show when truncated |
| `style` | `ViewStyle` | `undefined` | Container style |
| `textStyle` | `TextStyle` | `undefined` | Text style |
| `onHashtagPress` | `(hashtag: string) => void` | `undefined` | Callback when hashtag is tapped |
| `onMentionPress` | `(mention: string) => void` | `undefined` | Callback when mention is tapped |

## 🎨 Styling

### Default Colors
- **Hashtags**: `#22c55e` (green)
- **Mentions**: `#ef4444` (red)
- **Normal Text**: `#000000` (black)
- **Read More**: `#3b82f6` (blue)

### Custom Styling
```tsx
<PostTextComponent
  content="Your content here"
  style={{ backgroundColor: '#f0f0f0', padding: 16 }}
  textStyle={{ fontSize: 18, fontFamily: 'Arial' }}
/>
```

## 🔍 Advanced Usage

### With Interactive Callbacks
```tsx
const handleHashtagPress = (hashtag: string) => {
  // Navigate to hashtag page
  navigation.navigate('HashtagSearch', { hashtag });
};

const handleMentionPress = (mention: string) => {
  // Navigate to user profile
  navigation.navigate('UserProfile', { username: mention.substring(1) });
};

<PostTextComponent
  content="Check out #ReactNative by @expo"
  onHashtagPress={handleHashtagPress}
  onMentionPress={handleMentionPress}
/>
```

### Custom Truncation
```tsx
<PostTextComponent
  content="Very long content..."
  maxLines={5}
  maxCharacters={200}
/>
```

## 🧪 Testing

### Demo Component
```tsx
import PostTextDemo from './components/PostTextDemo';

// In your app
<PostTextDemo />
```

### Sample Data
```tsx
const sampleContent = [
  "Short post with #hashtag and @mention",
  "Medium post with #ReactNative #TypeScript and @developer @expo mentions",
  "Very long post that will be truncated and show read more functionality..."
];
```

## 🔧 Integration with Existing Apps

### Replace Existing Post Text
```tsx
// Before
<Text>{post.content}</Text>

// After
<PostTextComponent
  content={post.content}
  maxLines={3}
  maxCharacters={120}
/>
```

### In Post Cards
```tsx
import PostCardExample from './components/PostCardExample';

const post = {
  id: '1',
  author: { name: 'John Doe', avatar: '...', username: 'johndoe' },
  content: 'Check out #ReactNative by @expo!',
  timestamp: '2 hours ago',
  likes: 42,
  comments: 12,
  shares: 5
};

<PostCardExample post={post} />
```

## 🚀 Performance Features

- **Memoized Text Processing**: Text is processed only when content changes
- **Efficient Regex**: Uses optimized regex patterns for hashtag/mention detection
- **Smart Truncation**: Calculates truncation only when needed
- **Minimal Re-renders**: Component only re-renders when necessary

## 🐛 Troubleshooting

### Common Issues

1. **Hashtags not highlighting**: Ensure content starts with `#` and contains valid characters
2. **Mentions not highlighting**: Ensure content starts with `@` and contains valid characters
3. **Text not truncating**: Check `maxCharacters` and `maxLines` props
4. **Performance issues**: Ensure content isn't changing unnecessarily

### Debug Mode
```tsx
// Add console.log to see processed text
<PostTextComponent
  content={post.content}
  onHashtagPress={(hashtag) => console.log('Hashtag:', hashtag)}
  onMentionPress={(mention) => console.log('Mention:', mention)}
/>
```

## 📚 Examples

### Social Media Post
```tsx
<PostTextComponent
  content="Just launched our new #ReactNative app! 🚀 Big thanks to @expo for the amazing tools. #mobile #development"
  maxLines={4}
  maxCharacters={150}
/>
```

### Blog Post Preview
```tsx
<PostTextComponent
  content="Learn how to build amazing mobile apps with #ReactNative and #TypeScript. This comprehensive guide covers everything from setup to deployment. Written by @expert_dev"
  maxLines={3}
  maxCharacters={100}
/>
```

### Product Description
```tsx
<PostTextComponent
  content="Introducing #CreatorCircle - the ultimate platform for creators to connect and collaborate. Built with @expo and #ReactNative. #innovation #collaboration"
  maxLines={2}
  maxCharacters={80}
/>
```

## 🤝 Contributing

Feel free to enhance this component with:
- Additional text formatting options
- More interactive elements
- Custom highlight patterns
- Animation support
- Accessibility improvements

## 📄 License

This component is part of the CreatorCircle project and follows the same license terms. 