# WhatsApp Messaging Implementation

## Overview

WhatsApp messaging functionality has been implemented for sending reminders to users about:
1. **Profile Completion Reminders** - For users with incomplete profiles
2. **Payment Reminders** - For users with approved loans who haven't made payment

## Features Implemented

### 1. Profile Completion Reminders

**Location:** `backend/utils/profileCompletionCron.js`

**What it does:**
- Checks for users with incomplete profiles every hour
- Sends both **Email** and **WhatsApp** reminders
- Tracks sent reminders to avoid spam (24-hour cooldown)

**WhatsApp Message includes:**
- Personalized greeting with user's name
- List of required information to complete profile
- Benefits of completing profile
- Direct link to profile setup page

### 2. Payment Reminders

**Location:** `backend/utils/paymentReminderCron.js`

**What it does:**
- Checks for approved loans with pending payment every 6 hours
- Sends WhatsApp reminders to users
- Tracks sent reminders to avoid spam (24-hour cooldown)

**WhatsApp Message includes:**
- Personalized greeting with user's name
- Loan ID and approved amount
- Total payment required
- Step-by-step payment instructions
- Direct link to payment page

## WhatsApp Service Functions

### `sendProfileCompletionReminder(phone, userName)`
Sends profile completion reminder via WhatsApp.

**Parameters:**
- `phone`: User's phone number (10 digits)
- `userName`: User's name for personalization

**Returns:**
```javascript
{
  success: true/false,
  message: "Success message",
  requestId: "API request ID",
  error: "Error message if failed"
}
```

### `sendPaymentReminder(phone, userName, loan)`
Sends payment reminder via WhatsApp.

**Parameters:**
- `phone`: User's phone number (10 digits)
- `userName`: User's name for personalization
- `loan`: Loan object with `loanId`, `approvedAmount`, `totalPaymentAmount`

**Returns:**
```javascript
{
  success: true/false,
  message: "Success message",
  requestId: "API request ID",
  error: "Error message if failed"
}
```

## Rate Limiting & Error Handling

### Rate Limiting Protection
- **2-second delay** between each WhatsApp message
- **60-second wait** when rate limit is detected
- **Exponential backoff** for retries: 30s → 60s → 120s
- **Maximum 3 retries** for rate limit errors

### Error Handling
- Detects rate limit errors automatically
- Handles network errors gracefully
- Logs all errors for debugging
- Continues processing even if some messages fail

## Cron Job Schedules

### Profile Completion Reminder
- **Schedule:** Every hour (at minute 0)
- **Cron:** `0 * * * *`
- **Checks:** All users with incomplete profiles
- **Sends:** Email + WhatsApp (if phone available)

### Payment Reminder
- **Schedule:** Every 6 hours
- **Cron:** `0 */6 * * *` (00:00, 06:00, 12:00, 18:00)
- **Checks:** Approved loans with `paymentStatus: 'pending'`
- **Sends:** WhatsApp only

## Message Format

### Profile Completion Reminder
```
Hello [UserName],

📋 *Profile Completion Reminder*

Your GrowLoan profile is incomplete. To proceed with your loan application, please complete your profile by providing:

✅ Personal Details (Name, Email, Date of Birth)
✅ Address Information (Address, City, State, Pincode)
✅ Employment Details (Employment Type, Company Name)
✅ Identity Documents (Aadhar Number, PAN Number)
✅ Document Uploads (Aadhar Card, PAN Card, Selfie)

Complete your profile now: https://growwloan.online/profile-setup

*Why complete your profile?*
• Faster loan processing and approval
• Access to better loan offers
• Seamless application experience

If you have any questions, contact our support team.

Best regards,
GrowLoan Team
```

### Payment Reminder
```
Hello [UserName],

💳 *Payment Reminder - Loan [LoanID]*

Your loan has been approved! To complete the loan process, please make the payment.

*Loan Details:*
• Loan ID: [LoanID]
• Approved Amount: ₹[Amount]
• Total Payment Required: ₹[Amount]

*What You Need to Do:*
1. Visit: https://growwloan.online/home
2. Click on "Complete Payment Now" for your loan
3. Make the payment using the provided UPI ID or payment method
4. Submit payment receipt for verification

*Important:*
• Your loan application will remain on hold until payment is verified
• Keep the payment receipt/screenshot for your records
• Payment verification usually takes 1-2 business days

Complete payment now: https://growwloan.online/home

If you have any questions, contact our support team.

Best regards,
GrowLoan Team
```

## Configuration

### Environment Variables
Add to `backend/.env`:
```env
WHATSAPP_API_KEY=your_api_key_here
WHATSAPP_COUNTRY_CODE=IN
```

### Cron Job Settings

**Profile Completion:**
- Delay between messages: 2 seconds
- Rate limit wait: 60 seconds
- Retry backoff: 30s, 60s, 120s
- Max retries: 3

**Payment Reminder:**
- Delay between messages: 2 seconds
- Rate limit wait: 60 seconds
- Retry backoff: 30s, 60s, 120s
- Max retries: 3

## Tracking & Spam Prevention

### Profile Completion
- Tracks sent reminders per user (24-hour cooldown)
- Uses `userId` as key in `sentEmailTracker` Map
- Cleans up entries older than 7 days

### Payment Reminder
- Tracks sent reminders per loan (24-hour cooldown)
- Uses `loanId` as key in `sentReminderTracker` Map
- Cleans up entries older than 7 days

## Logging

All cron jobs log:
- Number of messages sent
- Number of messages skipped
- Rate limit encounters
- Errors and retries
- Processing progress

**Example logs:**
```
[Profile Cron] Profile completion reminder check completed. Emails: 5, WhatsApp: 8, Skipped: 2
[Payment Reminder Cron] Payment reminder check completed. WhatsApp: 3, Skipped: 1
[Payment Reminder Cron] ⚠️ Rate limit was encountered during this run. Some reminders may have been skipped.
```

## Testing

### Manual Testing

1. **Profile Completion:**
   - Create a user with incomplete profile
   - Wait for cron job to run (or trigger manually)
   - Check logs for WhatsApp message sent

2. **Payment Reminder:**
   - Create an approved loan with pending payment
   - Wait for cron job to run (or trigger manually)
   - Check logs for WhatsApp message sent

### Manual Trigger

You can manually trigger the cron jobs:

```javascript
// Profile Completion
const { checkAndSendProfileCompletionReminders } = require('./utils/profileCompletionCron');
checkAndSendProfileCompletionReminders();

// Payment Reminder
const { checkAndSendPaymentReminders } = require('./utils/paymentReminderCron');
checkAndSendPaymentReminders();
```

## Files Modified/Created

### Created Files
- `backend/utils/paymentReminderCron.js` - Payment reminder cron job

### Modified Files
- `backend/utils/whatsappService.js` - Added profile and payment reminder functions
- `backend/utils/profileCompletionCron.js` - Added WhatsApp messaging
- `backend/server.js` - Added payment reminder cron initialization

## Notes

- WhatsApp messages are sent in addition to emails (not instead of)
- If user doesn't have phone number, only email is sent
- Rate limiting is handled automatically with retries
- Messages are personalized with user's name
- All messages include direct links to relevant pages
- Messages are formatted for WhatsApp (with emojis and formatting)

## Future Enhancements

- Add template support for WhatsApp messages
- Add scheduling options (send at specific times)
- Add user preferences (opt-in/opt-out)
- Add message analytics and tracking
- Support for multiple languages

