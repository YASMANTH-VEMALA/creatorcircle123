# CreatorCircle

A React Native + TypeScript mobile app for connecting creators and facilitating collaborations.

## Features

- **Authentication**: Firebase Auth with email & password + Google Sign-in
- **User Profiles**: Complete profile management with photo upload
- **Creator Discovery**: Browse other creators' profiles
- **Collaboration Requests**: Send and manage collaboration requests
- **Cross-Platform**: Works on both Android and iOS using Expo

## Tech Stack

- React Native with TypeScript
- Expo SDK
- Firebase (Authentication & Firestore)
- React Navigation
- Expo Image Picker
- Google Sign-in

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd CreatorCircle
npm install
```

### 2. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password and Google Sign-in
3. Create a Firestore database
4. Update the Firebase configuration in `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 3. Google Sign-in Setup

#### For Android:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing Firebase project
3. Enable Google Sign-in API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Add your Android package name: `com.creatorcircle.app`
6. Download the `google-services.json` file and place it in the `android/app/` directory

#### For iOS:
1. In Google Cloud Console, create an iOS OAuth 2.0 Client ID
2. Add your iOS bundle identifier: `com.creatorcircle.app`
3. Download the `GoogleService-Info.plist` file

### 4. Firestore Security Rules

Set up the following Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiles collection
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Collaboration requests collection
    match /collaborationRequests/{requestId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS (requires macOS)
npm run ios

# Run on web
npm run web
```

## Project Structure

```
src/
├── config/
│   └── firebase.ts          # Firebase configuration
├── contexts/
│   └── AuthContext.tsx      # Authentication context
├── navigation/
│   └── AppNavigator.tsx     # Navigation setup
├── screens/
│   ├── LoginScreen.tsx      # Login screen with Google Sign-in
│   ├── SignupScreen.tsx     # Signup screen with Google Sign-up
│   ├── HomeScreen.tsx       # Main feed screen
│   ├── ProfileScreen.tsx    # User profile screen
│   └── CollaborationRequestsScreen.tsx # Collaboration requests
├── services/
│   └── userService.ts       # User database operations
└── types/
    └── index.ts             # TypeScript type definitions
```

## Features Overview

### Authentication
- Email/password signup and login
- Google Sign-in integration
- Secure authentication state management
- Automatic profile creation for new users
- Automatic navigation based on auth state

### User Profiles
- Complete profile creation and editing
- Profile photo upload using Expo Image Picker
- Automatic profile creation for Google Sign-in users
- Fields: Name, College, Passion, About Me

### Creator Discovery
- Browse all other creator profiles
- View profile photos, names, colleges, and passions
- Send collaboration requests to other creators

### Collaboration System
- Send collaboration requests to other creators
- View incoming collaboration requests
- Accept or decline requests
- Real-time updates using Firestore

### Database Management
- Automatic user profile creation on signup/signin
- Persistent user data storage
- Profile updates and management
- Collaboration request tracking

## Development

### Adding New Features

1. Create new screens in `src/screens/`
2. Add navigation routes in `src/navigation/AppNavigator.tsx`
3. Update types in `src/types/index.ts` if needed
4. Test on both Android and iOS

### Styling

The app uses React Native's StyleSheet for consistent styling across platforms. All styles are defined locally in each component.

### State Management

- Authentication state is managed through React Context
- Local component state for UI interactions
- Firestore for persistent data storage
- UserService for database operations

## Troubleshooting

### Common Issues

1. **Firebase configuration errors**: Ensure your Firebase config is correct and Firestore is enabled
2. **Google Sign-in errors**: Verify OAuth 2.0 client IDs are properly configured
3. **Image picker permissions**: The app will request photo library permissions when needed
4. **Navigation issues**: Ensure all navigation dependencies are properly installed

### Development Tips

- Use Expo Go for quick testing on physical devices
- Enable hot reloading for faster development
- Test on both Android and iOS regularly
- Check Firebase Console for authentication logs

## Deployment

### Building for Production

```bash
# Build for Android
expo build:android

# Build for iOS
expo build:ios
```

### App Store Deployment

1. Configure app.json with your app details
2. Build the production version
3. Submit to App Store Connect (iOS) or Google Play Console (Android)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on both platforms
5. Submit a pull request

## License

This project is licensed under the MIT License. 