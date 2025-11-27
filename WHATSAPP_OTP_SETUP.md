# WhatsApp OTP Integration Setup

This document explains how to set up and use the WhatsApp OTP system using the 1bot.in API.

## Overview

The application now supports OTP verification via WhatsApp using the 1bot.in API. Users receive OTP codes via WhatsApp messages for authentication.

## API Endpoints

### 1. Send OTP
**POST** `/api/auth/send-otp`

Sends a 6-digit OTP to the user's phone number via WhatsApp.

**Request Body:**
```json
{
  "phone": "9876543210"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully via WhatsApp",
  "requestId": "returned request id",
  "isNewUser": false,
  "expiresIn": 600
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Error message here"
}
```

### 2. Verify OTP
**POST** `/api/auth/verify-otp`

Verifies the OTP code and logs in/signs up the user.

**Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "name": "John Doe"  // Required only for new users
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "phone": "9876543210",
    // ... other user fields
  },
  "isNewUser": false
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid OTP. 4 attempt(s) remaining.",
  "remainingAttempts": 4
}
```

## Environment Variables

Add the following environment variables to your `.env` file in the `backend` folder:

```env
# WhatsApp API Configuration
WHATSAPP_API_KEY=c266a3f87bae4e209050834b27d669ba
WHATSAPP_COUNTRY_CODE=IN
```

### Environment Variables Explained

- **WHATSAPP_API_KEY**: Your 1bot.in API key (required)
- **WHATSAPP_COUNTRY_CODE**: Country code for WhatsApp (default: IN for India)

## OTP Features

### Security Features
- ✅ 6-digit OTP codes
- ✅ 10-minute expiration time
- ✅ Maximum 5 verification attempts per OTP
- ✅ OTP marked as used after successful verification
- ✅ Automatic cleanup of expired OTPs
- ✅ One active OTP per phone number (new OTP invalidates previous ones)

### OTP Flow
1. User requests OTP by providing phone number
2. System generates 6-digit OTP
3. OTP is saved to database with 10-minute expiration
4. OTP is sent via WhatsApp using 1bot.in API
5. User enters OTP code
6. System verifies OTP:
   - Checks if OTP exists and not used
   - Checks if OTP is not expired
   - Checks attempt count (max 5)
   - Validates OTP code
7. On success: User is logged in/signed up and receives JWT token

## Error Handling

### WhatsApp API Error Codes

| Status Code | Description | User Message |
|------------|-------------|--------------|
| 200 | Success | OTP sent successfully |
| 501 | Invalid API Key | Invalid WhatsApp API key. Please contact administrator. |
| 502 | Insufficient Balance | Insufficient WhatsApp API balance. Please contact administrator. |
| 504 | Message Blank | Message cannot be blank. |
| 505 | No Active WA Number | No active WhatsApp number found. Please contact administrator. |
| 506 | Max Numbers Exceeded | Maximum 5000 numbers allowed per request. |
| 507 | Invalid Number | Invalid phone number format. |

### Common Errors

**OTP Not Found:**
- User may have already used the OTP
- OTP may have expired
- Solution: Request a new OTP

**OTP Expired:**
- OTP is valid for 10 minutes only
- Solution: Request a new OTP

**Max Attempts Exceeded:**
- User has tried 5 times with wrong OTP
- Solution: Request a new OTP

**Invalid Phone Number:**
- Phone number must be exactly 10 digits
- Only digits allowed (no spaces, dashes, or special characters)
- Solution: Provide valid 10-digit phone number

## Phone Number Format

The system automatically cleans phone numbers:
- Removes `+91` prefix
- Removes spaces and dashes
- Removes leading zeros
- Trims to last 10 digits

**Examples:**
- `+919876543210` → `9876543210`
- `09876543210` → `9876543210`
- `98765 43210` → `9876543210`
- `98765-43210` → `9876543210`

## Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Add environment variables:**
   Create or update `.env` file in `backend` folder with WhatsApp API configuration.

3. **Restart server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Testing

### Test Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
```

### Test Verify OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "otp": "123456",
    "name": "Test User"
  }'
```

## Database Schema

The OTP model stores:
- `phone`: Phone number (indexed)
- `code`: 6-digit OTP code
- `expiresAt`: Expiration timestamp (auto-deletes after expiration)
- `isUsed`: Boolean flag (true after successful verification)
- `attempts`: Number of verification attempts (max 5)
- `createdAt`: Creation timestamp

## Notes

- OTPs are automatically deleted from database after expiration (MongoDB TTL index)
- Only one active OTP per phone number (new OTP invalidates previous ones)
- OTP verification is case-sensitive
- For new users, name is required during OTP verification
- Existing users don't need to provide name

## Support

For issues with:
- **WhatsApp API**: Contact 1bot.in support
- **OTP System**: Check server logs for detailed error messages
- **Integration**: Review this documentation and API responses

