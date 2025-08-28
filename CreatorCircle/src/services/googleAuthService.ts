import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// OAuth Client ID for Google Sign-in
const GOOGLE_CLIENT_ID = '775288481200-14u6gn5nhjiaa605hc2h820ecqrt02b1.apps.googleusercontent.com';

export class GoogleAuthService {
  static async signInWithGoogle() {
    try {
      console.log('Starting Google Sign-in...');
      
      // Check if we're on a supported platform
      if (Platform.OS === 'web') {
        // Web implementation
        return await this.signInWithGoogleWeb();
      } else {
        // Mobile implementation - use Firebase Auth with Google provider
        return await this.signInWithGoogleMobile();
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  private static async signInWithGoogleWeb() {
    try {
      // For web, we can use the OAuth flow
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'creatorcircle',
        path: 'auth/callback',
      });

      console.log('Web redirect URI:', redirectUri);
      
      // Build the OAuth URL
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'openid email profile');
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'select_account');

      console.log('Web OAuth URL:', oauthUrl.toString());
      
      // Open the Google sign-in in a web browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl.toString(),
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          // Exchange code for tokens (this should be done on your backend)
          const tokens = await this.exchangeCodeForTokens(code, redirectUri);
          
          if (tokens.id_token) {
            const credential = GoogleAuthProvider.credential(tokens.id_token);
            const authResult = await signInWithCredential(auth, credential);
            return authResult.user;
          }
        }
      }
      
      throw new Error('Web Google sign-in failed');
    } catch (error) {
      console.error('Web Google sign-in error:', error);
      throw error;
    }
  }

  private static async signInWithGoogleMobile() {
    try {
      // For mobile, use a fixed redirect URI that matches what's in Google Console
      console.log('Using OAuth flow for mobile...');
      
      const redirectUri = 'https://auth.expo.io/@yasmanthvemala007/creatorcircle';

      console.log('Mobile redirect URI:', redirectUri);
      
      // Build the OAuth URL with correct parameters
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'openid email profile');
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'select_account');

      console.log('Mobile OAuth URL:', oauthUrl.toString());
      
      // Open the Google sign-in in a web browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl.toString(),
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          console.log('Got authorization code, exchanging for tokens...');
          
          // Exchange code for tokens via backend
          const tokens = await this.exchangeCodeForTokens(code, redirectUri);
          
          if (tokens.id_token) {
            console.log('Got ID token, signing in to Firebase...');
            
            // Create credential and sign in to Firebase
            const credential = GoogleAuthProvider.credential(tokens.id_token);
            const authResult = await signInWithCredential(auth, credential);
            
            console.log('Firebase auth successful:', authResult.user.email);
            return authResult.user;
          }
        }
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled by user');
      }
      
      throw new Error('Mobile Google sign-in failed');
    } catch (error) {
      console.error('Mobile Google sign-in error:', error);
      throw error;
    }
  }

  private static async exchangeCodeForTokens(code: string, redirectUri: string) {
    try {
      console.log('Exchanging authorization code for tokens via backend...');
      
      // Make request to our backend server for token exchange
      const response = await fetch('http://localhost:3000/auth/google/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });
      
      const tokens = await response.json();
      
      if (tokens.success && tokens.id_token) {
        console.log('Token exchange successful');
        return { id_token: tokens.id_token };
      } else {
        console.error('Token exchange failed:', tokens.error);
        throw new Error(tokens.error || 'Token exchange failed');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }
}
