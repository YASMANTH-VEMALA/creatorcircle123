# Delete Account URL Setup Guide

This guide explains how to set up and use the delete account URL feature for CreatorCircle, which allows users to request account deletion through secure, time-limited links.

## 📋 Overview

The delete account URL feature provides:
- **Secure URLs** for account deletion requests
- **Time-limited links** (24-hour validity)
- **Email integration** for support workflows
- **Web interface** for processing requests
- **GDPR compliance** features

## 🔧 Setup Instructions

### 1. Host the Web Interface

Upload the `web-delete-account.html` file to your web server:

```bash
# Option 1: Simple hosting (GitHub Pages, Netlify, etc.)
# Upload web-delete-account.html as index.html to:
# https://yourdomain.com/delete-account/

# Option 2: Custom domain
# Host at: https://creatorcircle.app/delete-account
```

### 2. Update Configuration

In `src/utils/deleteAccountUrl.ts`, update the web URL:

```typescript
private static readonly WEB_DELETE_URL = 'https://yourdomain.com/delete-account';
```

### 3. Configure Deep Links (Optional)

Add to your `app.json`:

```json
{
  "expo": {
    "scheme": "creatorcircle",
    "web": {
      "linking": {
        "prefixes": ["https://creatorcircle.app", "creatorcircle://"]
      }
    }
  }
}
```

### 4. Set Up Email Support

Update the support email in:
- `deleteAccountUrl.ts` → `openEmailRequest()`
- `web-delete-account.html` → Contact links

## 🚀 Usage

### For Users

1. **Generate Delete URL**: Go to Settings → Data & Privacy → "Generate Delete Account URL"
2. **Email Request**: Use "Email Delete Request" to pre-fill support email
3. **Share Request**: Get shareable message with deletion link

### For Administrators

1. **Process Requests**: Visit the web interface when users share deletion URLs
2. **Verify Identity**: Check user information and request validity
3. **Execute Deletion**: Use the confirmation button to process requests

## 🔗 Generated URLs

### Example Delete Account URL
```
https://creatorcircle.app/delete-account?userId=abc123&email=user@example.com&timestamp=2024-01-20T10:30:00.000Z&source=app
```

### URL Parameters
- `userId`: User's unique identifier
- `email`: User's email address
- `timestamp`: Request generation time
- `source`: Request origin (app, web, email)

## 🛡️ Security Features

### Time-Limited Validity
- URLs expire after **24 hours**
- Prevents abuse and unauthorized access
- Clear expiration indicators

### Request Validation
- Validates user information
- Checks timestamp authenticity
- Prevents replay attacks

### User Confirmation
- Multiple confirmation steps
- Clear warnings about data loss
- Option to cancel requests

## 📧 Email Templates

### Support Email Template
```
Subject: Account Deletion Request - CreatorCircle

Dear CreatorCircle Support Team,

I would like to request the deletion of my account and all associated data.

Account Details:
- Email: user@example.com
- User ID: abc123
- Request Date: 2024-01-20

Delete Account URL: [Generated URL]

Thank you for your assistance.
```

### Confirmation Email Template
```
Subject: Account Deletion Confirmed - CreatorCircle

Dear [User Name],

Your account deletion request has been processed successfully.

The following data has been permanently deleted:
• User profile and account information
• All posts and content
• Chat messages and history
• [... full list ...]

If you have any questions, please contact support.

Best regards,
CreatorCircle Team
```

## 🔄 Integration with App

### Settings Screen Integration
```typescript
// Generate and copy URL
const handleGenerateDeleteUrl = () => {
  DeleteAccountUrlService.copyDeleteAccountUrl(user.uid, user.email);
};

// Open email client
const handleEmailDeleteRequest = () => {
  DeleteAccountUrlService.openEmailRequest(user.uid, user.email);
};

// Get shareable message
const handleShareDeleteRequest = () => {
  const message = DeleteAccountUrlService.generateShareableMessage(user.uid, user.email);
  // Show or share the message
};
```

### Deep Link Handling
```typescript
// In App.tsx or main navigation
import { DeleteAccountUrlService } from './src/utils/deleteAccountUrl';

const handleDeepLink = (url: string) => {
  const deleteRequest = DeleteAccountUrlService.parseDeleteAccountLink(url);
  
  if (deleteRequest && DeleteAccountUrlService.isRequestValid(deleteRequest.timestamp)) {
    // Show in-app deletion confirmation
    showDeleteConfirmation(deleteRequest);
  }
};
```

## 📱 User Experience Flow

1. **User Request**:
   - User goes to Settings → Data & Privacy
   - Selects preferred method (URL, Email, Share)
   - Receives deletion link/message

2. **Verification**:
   - User or support opens the deletion URL
   - System validates request parameters
   - Shows account information and warnings

3. **Confirmation**:
   - User confirms deletion intent
   - System processes the request
   - Account and data are permanently deleted

4. **Completion**:
   - User receives confirmation
   - Account is removed from the system
   - User is redirected to login screen

## 🔍 Troubleshooting

### Common Issues

**URL Expired Error**:
- Generate a new URL from the app
- URLs are only valid for 24 hours

**Invalid Parameters**:
- Check URL formatting
- Ensure all parameters are present

**Email Client Issues**:
- Use manual copy/paste if auto-open fails
- Contact support directly if needed

### Support Workflow

1. **Receive Request**: User contacts support or shares URL
2. **Validate**: Check request authenticity and user identity
3. **Process**: Use the web interface to confirm deletion
4. **Confirm**: Send completion email to user

## 📊 Analytics & Logging

### Track Deletion Requests
```typescript
// Log deletion request generation
console.log('Delete URL generated:', {
  userId,
  email,
  timestamp: new Date().toISOString(),
  source: 'app'
});

// Log deletion confirmation
console.log('Account deletion confirmed:', {
  userId,
  email,
  processedAt: new Date().toISOString()
});
```

### Monitor Usage
- Track URL generation frequency
- Monitor completion rates
- Analyze support ticket volume

## 🔒 Privacy Compliance

### GDPR Requirements
✅ Right to erasure (Article 17)
✅ Data portability (Article 20)
✅ Transparent processing (Article 12)
✅ Secure processing (Article 32)

### Data Protection
- Secure URL parameters
- Time-limited access
- Complete data removal
- Audit trail maintenance

## 🛠️ Customization

### Styling the Web Interface
Modify `web-delete-account.html`:
- Update colors and branding
- Add your logo and styling
- Customize warning messages

### Backend Integration
Add server-side processing:
- Validate requests server-side
- Integrate with user management systems
- Send confirmation emails
- Log audit trails

## 📞 Support

For technical support with the delete account URL feature:
- Email: support@creatorcircle.app
- Documentation: [Link to full docs]
- GitHub Issues: [Link to repository]

---

**Note**: This feature helps ensure GDPR compliance and provides users with a secure way to request account deletion. Always test thoroughly before deploying to production. 