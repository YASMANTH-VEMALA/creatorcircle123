# Google OAuth Setup Guide for CreatorCircle

## Current Issue
The app shows "Access blocked: Error 400 invalid_request" when trying to log in with Google due to incorrect OAuth 2.0 configuration.

## What We've Fixed

### 1. Updated App Configuration
- ✅ Fixed `app.json` with proper Google Sign-In plugin configuration
- ✅ Added correct OAuth redirect URIs
- ✅ Updated client ID references

### 2. Updated Google Auth Service
- ✅ Changed from `response_type=id_token` to `response_type=code` (proper OAuth 2.0 flow)
- ✅ Added platform-specific handling (web vs mobile)
- ✅ Improved error handling and user feedback

### 3. Created Backend Server
- ✅ Created `google-oauth-backend.js` for token exchange
- ✅ Added proper OAuth 2.0 code exchange endpoint
- ✅ Included user info retrieval

## Next Steps to Complete the Fix

### Step 1: Set Up Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select your project** (or create one if needed)
3. **Enable Google+ API** and **Google OAuth2 API**

### Step 2: Configure OAuth Consent Screen

1. **Go to APIs & Services > OAuth consent screen**
2. **Fill in required fields:**
   - App name: `CreatorCircle`
   - User support email: `your-email@domain.com`
   - Developer contact information: `your-email@domain.com`
3. **Add scopes:**
   - `openid`
   - `email`
   - `profile`
4. **Add test users** (if in testing mode)

### Step 3: Configure OAuth Credentials

1. **Go to APIs & Services > Credentials**
2. **Find your OAuth 2.0 Client ID** or create a new one
3. **Add these Authorized redirect URIs:**
   ```
   creatorcircle://auth/callback
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```
4. **Copy your Client Secret** (you'll need this for the backend)

### Step 4: Set Up Backend Server

1. **Install backend dependencies:**
   ```bash
   cd creatorcircle123/CreatorCircle
   npm install --prefix . express axios cors dotenv
   ```

2. **Create `.env` file:**
   ```bash
   # Create .env file in the CreatorCircle directory
   echo "GOOGLE_CLIENT_SECRET=your_actual_client_secret_here" > .env
   echo "PORT=3000" >> .env
   ```

3. **Start the backend server:**
   ```bash
   node google-oauth-backend.js
   ```

### Step 5: Update Google Auth Service

1. **Update the backend URL** in `src/services/googleAuthService.ts`:
   ```typescript
   private static async exchangeCodeForTokens(code: string, redirectUri: string) {
     try {
       const response = await fetch('http://localhost:3000/auth/google/token', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ code, redirect_uri: redirectUri }),
       });
       
       const tokens = await response.json();
       
       if (tokens.success && tokens.id_token) {
         return { id_token: tokens.id_token };
       } else {
         throw new Error(tokens.error || 'Token exchange failed');
       }
     } catch (error) {
       console.error('Token exchange error:', error);
       throw error;
     }
   }
   ```

### Step 6: Test the Implementation

1. **Start your backend server** (should show "Google OAuth backend running on port 3000")
2. **Start your React Native app** (`npm start`)
3. **Try Google Sign-In** - it should now work properly

## Important Notes

### Security
- **Never commit your `.env` file** to version control
- **Keep your Client Secret secure** - only use it on your backend server
- **Use HTTPS in production** for all OAuth endpoints

### Production Deployment
- **Update backend URL** from `localhost:3000` to your production domain
- **Use environment variables** for all sensitive configuration
- **Set up proper CORS** for your production domain

### Troubleshooting

#### Common Issues:
1. **"redirect_uri_mismatch"** - Check that redirect URIs in Google Console match exactly
2. **"invalid_client"** - Verify your Client ID and Client Secret
3. **"access_denied"** - Check OAuth consent screen configuration

#### Debug Steps:
1. Check browser console for OAuth URL being generated
2. Verify redirect URI matches exactly in Google Console
3. Check backend server logs for token exchange errors
4. Ensure all required Google APIs are enabled

## Files Modified

- ✅ `app.json` - Added proper OAuth configuration
- ✅ `src/services/googleAuthService.ts` - Fixed OAuth flow
- ✅ `google-oauth-backend.js` - Created backend server
- ✅ `backend-package.json` - Backend dependencies

## Support

If you encounter issues:
1. Check Google Cloud Console configuration
2. Verify redirect URIs match exactly
3. Check backend server logs
4. Ensure all required APIs are enabled

The app should now work properly with Google Sign-In once you complete these setup steps! 