# Firebase Storage Security Rules Configuration

## Issue
Getting `storage/unknown` error when trying to upload files to Firebase Storage. This is typically caused by restrictive Storage Security Rules.

## Solution
You need to configure Firebase Storage Security Rules to allow authenticated users to upload files.

## Steps to Fix

### 1. Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `demoproject-13b80`
3. Go to **Storage** in the left sidebar
4. Click on the **Rules** tab

### 2. Current Rules (Likely Too Restrictive)
Your current rules probably look like this:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false; // This blocks everything!
    }
  }
}
```

### 3. Update Storage Rules
Replace your current rules with these rules that allow authenticated users to upload:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to posts folder
    match /posts/{userId}/{postId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload profile images
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow test uploads for connectivity testing
    match /test/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow public read access to all files (for viewing posts)
    match /{allPaths=**} {
      allow read: if true;
    }
  }
}
```

### 4. What These Rules Do

- **`/posts/{userId}/{postId}/`**: Users can upload files to their own post folders
- **`/profiles/{userId}/`**: Users can upload profile images to their own profile folder
- **`/test/`**: Allows connectivity testing for authenticated users
- **Public Read**: Anyone can view uploaded files (needed for displaying posts)
- **Security**: Users can only upload to their own folders (userId must match their auth.uid)

### 5. Apply the Rules
1. Copy the rules above
2. Paste them in the Firebase Console Storage Rules editor
3. Click **Publish** to apply the changes

### 6. Alternative: Temporary Development Rules (Less Secure)
If you want to quickly test during development, you can use these more permissive rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Warning**: Only use these temporary rules during development. They allow any authenticated user to access all files.

### 7. Test the Fix
After updating the rules:
1. Try creating a post with images/videos
2. The storage connectivity test should now pass
3. Files should upload successfully

## Security Best Practices

1. **User Isolation**: Users can only access their own files
2. **Authentication Required**: All uploads require user authentication
3. **Public Read**: Posts can be viewed by everyone (needed for social media app)
4. **Path Structure**: Organized by user and post for better security and organization

## File Structure in Storage
```
bucket/
├── posts/
│   └── {userId}/
│       └── {postId}/
│           ├── images/
│           │   └── image_0_timestamp.jpg
│           └── videos/
│               └── video_0_timestamp.mp4
├── profiles/
│   └── {userId}/
│       ├── profile.jpg
│       └── banner.jpg
└── test/
    └── connectivity_timestamp.txt
``` 