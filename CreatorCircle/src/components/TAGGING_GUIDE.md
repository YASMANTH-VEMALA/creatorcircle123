# 🏷️ User Tagging System Guide

## 🎯 **How to Tag People in CreatorCircle**

### **📱 What You Can Do:**

1. **Tag Users**: Mention other users with @username
2. **Add Hashtags**: Create topics with #hashtag
3. **Search Users**: Find people to tag using the search input
4. **Preview Posts**: See how your post will look before posting
5. **Interactive Elements**: Tap on hashtags and mentions

---

## 🔍 **How Tagging Works**

### **1. Automatic Detection**
- **@mentions**: Automatically detected and highlighted in **RED** (`#ef4444`)
- **#hashtags**: Automatically detected and highlighted in **GREEN** (`#22c55e`)
- **Normal text**: Displayed in default black color

### **2. User Search & Selection**
- Type in the "Tag People" section to search users
- See user suggestions with avatars and names
- Click to add users to your post
- Maximum 5 people can be tagged per post

### **3. Real-time Preview**
- Switch between "Edit" and "Preview" modes
- See exactly how your post will appear
- All highlighting applied in real-time

---

## 🚀 **Step-by-Step Tagging Process**

### **Step 1: Start Writing**
```
1. Open the post creation screen
2. Begin typing your post content
3. You can type normally or use @ and # symbols
```

### **Step 2: Tag People**
```
1. Use the "Tag People" section below
2. Type to search for users
3. Click on user suggestions to add them
4. Selected users appear as tags above the input
```

### **Step 3: Add Hashtags**
```
1. Type # followed by your topic
2. Examples: #ReactNative, #CreatorCircle, #innovation
3. Hashtags are automatically highlighted in green
```

### **Step 4: Preview & Post**
```
1. Tap "Preview" to see final result
2. Check how hashtags and mentions look
3. Tap "Post Now" to publish
```

---

## 💡 **Tagging Examples**

### **Example 1: Simple Mention**
```
Content: "Hey @johndoe, check out this project!"
Result: @johndoe appears in RED, rest in black
```

### **Example 2: Multiple Tags**
```
Content: "Working with @janesmith on #ReactNative #app"
Result: 
- @janesmith in RED
- #ReactNative in GREEN  
- #app in GREEN
- Rest in black
```

### **Example 3: Mixed Content**
```
Content: "Just finished #CreatorCircle app! Thanks @expo team"
Result:
- #CreatorCircle in GREEN
- @expo in RED
- Rest in black
```

---

## 🎨 **Visual Styling**

### **Colors Used:**
- **Hashtags (#word)**: Green (`#22c55e`)
- **Mentions (@username)**: Red (`#ef4444`)
- **Normal Text**: Black (`#000000`)
- **Read More**: Blue (`#3b82f6`)

### **Interactive Elements:**
- **Hashtags**: Tappable (can navigate to hashtag page)
- **Mentions**: Tappable (can navigate to user profile)
- **Read More/Less**: Expandable text

---

## 🔧 **Technical Features**

### **Smart Detection:**
- Uses regex patterns for accurate hashtag/mention detection
- Handles edge cases and special characters
- Preserves text formatting and spacing

### **Performance:**
- Memoized text processing for efficiency
- Minimal re-renders
- Optimized for large posts

### **Accessibility:**
- Proper touch targets
- Clear visual indicators
- Screen reader friendly

---

## 📱 **Where to Use Tagging**

### **1. Post Creation**
- Main post creation screen
- Status updates
- Announcements

### **2. Comments**
- Reply to posts
- Mention specific users
- Add context with hashtags

### **3. Messages**
- Direct messages
- Group chats
- Notifications

---

## 🚫 **Limitations & Rules**

### **Tag Limits:**
- **Maximum users**: 5 people per post
- **Hashtags**: Unlimited
- **Post length**: 500 characters

### **User Search:**
- Only shows available users
- Excludes already tagged users
- Real-time filtering

### **Validation:**
- Username must exist in system
- No duplicate tags
- Proper format required

---

## 🎯 **Best Practices**

### **Tagging Users:**
- Only tag relevant people
- Don't spam with unnecessary mentions
- Use @ for direct communication

### **Using Hashtags:**
- Keep hashtags relevant
- Don't overuse (2-3 per post is ideal)
- Use specific, meaningful tags

### **Content Quality:**
- Write clear, engaging content
- Use tags to enhance, not replace content
- Maintain professional tone

---

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **User not found**: Check spelling, user may not exist
2. **Tag not highlighting**: Ensure proper @ or # format
3. **Preview not working**: Check post content length
4. **Performance issues**: Large posts may take time to process

### **Solutions:**
- Verify username spelling
- Check internet connection
- Refresh the app
- Clear app cache if needed

---

## 🚀 **Future Enhancements**

### **Planned Features:**
- **Smart suggestions**: AI-powered user recommendations
- **Trending hashtags**: Popular topic suggestions
- **Tag analytics**: Track engagement on tags
- **Custom themes**: Personalize tag colors
- **Advanced search**: Filter by location, interests, etc.

---

## 📚 **Integration Guide**

### **For Developers:**
```tsx
// Import the components
import PostTextComponent from './PostTextComponent';
import UserTagInput from './UserTagInput';

// Use in your post creation
<PostTextComponent
  content={postContent}
  onHashtagPress={handleHashtagPress}
  onMentionPress={handleMentionPress}
/>

<UserTagInput
  onTagsChange={handleTagsChange}
  maxTags={5}
/>
```

### **For Users:**
- Start with simple mentions
- Experiment with hashtags
- Use preview feature before posting
- Engage with tagged content

---

## 🎉 **Get Started!**

1. **Open CreatorCircle app**
2. **Navigate to post creation**
3. **Try tagging a few people**
4. **Add some hashtags**
5. **Preview your post**
6. **Share with the community!**

The tagging system makes your posts more engaging and helps connect with other creators! 🚀 