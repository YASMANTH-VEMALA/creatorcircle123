# Suggested People Feature

## Overview
The Suggested People feature helps users discover and connect with other creators who share similar skills and interests. It provides intelligent matching based on user profiles and allows for easy following/unfollowing.

## Features

### 📊 Matching Logic
- **User Filtering**: Excludes current user and already followed users
- **College Filter**: Default filter to show users from the same college
- **Skill Matching**: Finds users with shared skills
- **Interest Matching**: Finds users with shared interests
- **Match Scoring**: Sorts users by number of shared skills + interests
- **Optional College Filter**: Users can remove college filter to search across all colleges

### 🔍 Search & Filters
- **Search Bar**: Search by name, skill, or interest
- **Skill Filters**: Filter by specific skills
- **Interest Filters**: Filter by specific interests
- **College Filter Toggle**: Switch between same college and all colleges
- **Clear Filters**: Reset all filters at once

### 🖼️ UI Components
- **SuggestedPeopleCard**: Individual user card with:
  - CreatorCircle banner (universal, not user's own)
  - Profile picture with fallback
  - Full name
  - College name
  - Skills & interests (limited to 3 with "+N more")
  - Verified badge (if user is verified)
  - Follow/Following button

### 📱 Responsive Layout
- **Mobile**: 2 cards per row
- **Desktop/Laptop**: 4 cards per row
- **Responsive Grid**: Automatically adjusts based on screen width

## Technical Implementation

### Services
- **SuggestedPeopleService**: Handles user matching logic and data fetching
- **FollowService**: Manages follow/unfollow functionality
- **UserService**: Provides user profile data

### Components
- **SuggestedPeopleScreen**: Main screen with search and filters
- **SuggestedPeopleCard**: Individual user card component

### Data Structure
```typescript
interface SuggestedUser extends Profile {
  sharedSkills: string[];
  sharedInterests: string[];
  matchScore: number;
}
```

### Navigation
- Added to More screen menu
- Accessible via "Suggested People" option
- Integrated into app navigation stack

## Usage

1. **Access**: Go to More → Suggested People
2. **Search**: Use search bar to find specific people
3. **Filter**: Toggle filters to narrow down results
4. **Follow**: Tap follow button to connect with users
5. **Refresh**: Pull to refresh for new suggestions

## Matching Algorithm

1. **Fetch Users**: Get all users except current user
2. **Apply Filters**: Filter by college, skills, interests
3. **Calculate Matches**: Find shared skills and interests
4. **Score Users**: Calculate match score based on shared items
5. **Sort Results**: Order by match score (highest first)
6. **Limit Results**: Return top 20 matches

## Future Enhancements

- **Advanced Matching**: Weight skills vs interests differently
- **Location Filtering**: Filter by geographic location
- **Activity Level**: Consider user activity in suggestions
- **Collaboration History**: Factor in past collaborations
- **Mutual Connections**: Show users with mutual followers
- **Recommendation Engine**: ML-based suggestions 