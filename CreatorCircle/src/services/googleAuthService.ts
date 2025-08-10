import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// OAuth Client ID for Google Sign-in
const GOOGLE_CLIENT_ID = '775288481200-14u6gn5nhjiaa605hc2h820ecqrt02b1.apps.googleusercontent.com';

export class GoogleAuthService {
  static async signInWithGoogle() {
    try {
      console.log('Starting Google Sign-in...');
      
      // Create the redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'creatorcircle',
        path: 'auth',
      });

      console.log('Redirect URI:', redirectUri);
      
      // Open the Google sign-in in a web browser
      const result = await WebBrowser.openAuthSessionAsync(
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=id_token&` +
        `scope=openid%20profile%20email&` +
        `nonce=${Math.random().toString(36).substring(2, 15)}`,
        redirectUri
      );

      console.log('Web browser result:', result);

      if (result.type === 'success' && result.url) {
        // Extract the ID token from the URL
        const url = new URL(result.url);
        const fragment = url.hash.substring(1); // Remove the # symbol
        const params = new URLSearchParams(fragment);
        const idToken = params.get('id_token');
        
        if (idToken) {
          console.log('Got ID token, signing in to Firebase...');
          
          // Create credential and sign in to Firebase
          const credential = GoogleAuthProvider.credential(idToken);
          const authResult = await signInWithCredential(auth, credential);
          
          console.log('Firebase auth successful:', authResult.user.email);
          return authResult.user;
        } else {
          throw new Error('No ID token received from Google');
        }
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled by user');
      } else {
        throw new Error('Google sign-in failed');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }
}
