import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

export class DeleteAccountUrlService {
  private static readonly DELETE_ACCOUNT_SCHEME = 'creatorcircle://delete-account';
  // Use a working domain or fallback to prevent 404 errors during app review
  private static readonly WEB_DELETE_URL = 'https://creatorcircle-account-deletion.netlify.app';
  
  /**
   * Generate a delete account URL for the current user
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   * @returns The delete account URL
   */
  static generateDeleteAccountUrl(userId: string, email: string): string {
    const params = new URLSearchParams({
      userId,
      email,
      timestamp: new Date().toISOString(),
      source: 'app'
    });
    
    return `${this.WEB_DELETE_URL}?${params.toString()}`;
  }

  /**
   * Generate a local deletion request (fallback when web URL is not accessible)
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   * @returns Local deletion request data
   */
  static generateLocalDeletionRequest(userId: string, email: string): {
    type: 'local_request';
    userId: string;
    email: string;
    timestamp: string;
    instructions: string;
  } {
    return {
      type: 'local_request',
      userId,
      email,
      timestamp: new Date().toISOString(),
      instructions: `Please contact support@creatorcircle.app with the following information to request account deletion:\n\nUser ID: ${userId}\nEmail: ${email}\nTimestamp: ${new Date().toLocaleString()}\n\nThis is a local deletion request generated from the CreatorCircle app.`
    };
  }

  /**
   * Generate a deep link for in-app account deletion
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   * @returns The deep link URL
   */
  static generateDeepLink(userId: string, email: string): string {
    const params = new URLSearchParams({
      userId,
      email,
      timestamp: new Date().toISOString(),
    });
    
    return `${this.DELETE_ACCOUNT_SCHEME}?${params.toString()}`;
  }

  /**
   * Copy delete account URL to clipboard
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   */
  static async copyDeleteAccountUrl(userId: string, email: string): Promise<void> {
    try {
      const url = this.generateDeleteAccountUrl(userId, email);
      
      // For React Native, we'll need to use a clipboard library
      // For now, we'll show the URL in an alert for easy copying
      Alert.alert(
        'Delete Account URL',
        `Copy this URL to request account deletion:\n\n${url}\n\nNote: If this URL doesn't work, use the Email Delete Request option instead.`,
        [
          {
            text: 'Copy URL',
            onPress: () => {
              // In a real implementation, you'd use @react-native-clipboard/clipboard
              console.log('URL copied to clipboard:', url);
            }
          },
          { text: 'Close' }
        ]
      );
    } catch (error) {
      console.error('Error copying delete account URL:', error);
      Alert.alert('Error', 'Failed to generate delete account URL');
    }
  }

  /**
   * Handle incoming deep links for account deletion
   * @param url - The incoming deep link URL
   * @returns Parsed deletion request data or null if invalid
   */
  static parseDeleteAccountLink(url: string): {
    userId: string;
    email: string;
    timestamp: string;
  } | null {
    try {
      const parsedUrl = Linking.parse(url);
      
      if (parsedUrl.scheme !== 'creatorcircle' || parsedUrl.hostname !== 'delete-account') {
        return null;
      }
      
      const { userId, email, timestamp } = parsedUrl.queryParams as any;
      
      if (!userId || !email || !timestamp) {
        return null;
      }
      
      return { userId, email, timestamp };
    } catch (error) {
      console.error('Error parsing delete account link:', error);
      return null;
    }
  }

  /**
   * Validate if a delete account request is still valid (within 24 hours)
   * @param timestamp - The request timestamp
   * @returns Whether the request is still valid
   */
  static isRequestValid(timestamp: string): boolean {
    try {
      const requestTime = new Date(timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - requestTime.getTime()) / (1000 * 60 * 60);
      
      return hoursDiff <= 24; // Valid for 24 hours
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate email template for delete account request
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   * @returns Email template object
   */
  static generateEmailTemplate(userId: string, email: string): {
    subject: string;
    body: string;
    url: string;
  } {
    const deleteUrl = this.generateDeleteAccountUrl(userId, email);
    
    return {
      subject: 'Account Deletion Request - CreatorCircle',
      body: `Dear CreatorCircle Support Team,

I would like to request the deletion of my account and all associated data.

Account Details:
- Email: ${email}
- User ID: ${userId}
- Request Date: ${new Date().toLocaleDateString()}

Please process this request in accordance with your privacy policy and applicable data protection laws.

Delete Account URL: ${deleteUrl}

Thank you for your assistance.

Best regards,
${email}`,
      url: deleteUrl
    };
  }

  /**
   * Open email client with pre-filled delete account request
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   */
  static async openEmailRequest(userId: string, email: string): Promise<void> {
    try {
      const template = this.generateEmailTemplate(userId, email);
      const supportEmail = 'support@creatorcircle.app';
      
      const emailUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
      
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        // Fallback: show the email content for manual copying
        Alert.alert(
          'Email Client Not Available',
          `Please send an email to ${supportEmail} with the following content:\n\nSubject: ${template.subject}\n\n${template.body}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening email request:', error);
      Alert.alert('Error', 'Failed to open email client');
    }
  }

  /**
   * Generate a shareable delete account message
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   * @returns Shareable message with URL
   */
  static generateShareableMessage(userId: string, email: string): string {
    const url = this.generateDeleteAccountUrl(userId, email);
    
    return `I would like to request deletion of my CreatorCircle account (${email}). 

You can process this request using the following URL:
${url}

This request was generated on ${new Date().toLocaleDateString()} and is valid for 24 hours.`;
  }
} 