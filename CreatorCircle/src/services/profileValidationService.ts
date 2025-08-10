import { Profile } from '../types';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
}

export class ProfileValidationService {
  static validateProfileCompletion(profile: Profile | null): ProfileCompletionStatus {
    if (!profile) {
      return {
        isComplete: false,
        missingFields: ['Profile not found'],
        completionPercentage: 0
      };
    }

    const missingFields: string[] = [];
    const requiredFields = [
      { field: 'name', value: profile.name, displayName: 'Name' },
      { field: 'college', value: profile.college, displayName: 'College' },
      { field: 'profilePhotoUrl', value: profile.profilePhotoUrl, displayName: 'Profile Picture' },
      { field: 'skills', value: profile.skills, displayName: 'Skills' },
      { field: 'interests', value: profile.interests, displayName: 'Interests' }
    ];

    // Check each required field
    requiredFields.forEach(({ field, value, displayName }) => {
      if (field === 'skills' || field === 'interests') {
        // For arrays, check if they exist and have at least one item
        if (!value || !Array.isArray(value) || value.length === 0) {
          missingFields.push(displayName);
        }
      } else {
        // For strings, check if they exist and are not empty
        if (!value || value.trim() === '') {
          missingFields.push(displayName);
        }
      }
    });

    const completionPercentage = Math.round(
      ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
    );

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      completionPercentage
    };
  }

  static getProfileCompletionMessage(status: ProfileCompletionStatus): string {
    if (status.isComplete) {
      return 'Your profile is complete!';
    }

    const missingFieldsText = status.missingFields.join(', ');
    return `Please complete your profile to access this feature. Missing: ${missingFieldsText}`;
  }

  static canPerformAction(profile: Profile | null, actionName: string): { allowed: boolean; message: string } {
    const status = this.validateProfileCompletion(profile);
    
    if (status.isComplete) {
      return { allowed: true, message: '' };
    }

    const actionMessages = {
      'send_collaboration_request': 'You need to complete your profile before sending collaboration requests.',
      'create_post': 'You need to complete your profile before creating posts.',
      'comment_on_post': 'You need to complete your profile before commenting on posts.',
      'default': 'You need to complete your profile to access this feature.'
    };

    const message = actionMessages[actionName as keyof typeof actionMessages] || actionMessages.default;
    const fullMessage = `${message}\n\nMissing: ${status.missingFields.join(', ')}`;

    return { allowed: false, message: fullMessage };
  }
} 