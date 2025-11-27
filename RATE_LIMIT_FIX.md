# Email Rate Limit Fix

## Problem

The payment failure cron job was sending too many emails too quickly, causing Hostinger SMTP server to rate limit the requests with error:
```
451 4.7.1 Ratelimit "hostinger_out_ratelimit" exceeded
```

This resulted in most emails failing to send when processing multiple failed loans.

## Solution

Implemented the following fixes:

### 1. **Delay Between Emails**
- Added 2-second delay between each email send
- Prevents overwhelming the SMTP server

### 2. **Rate Limit Detection**
- Detects rate limit errors from email service
- Automatically waits 60 seconds when rate limit is hit
- Resumes processing after wait period

### 3. **Retry Logic with Exponential Backoff**
- Retries failed emails up to 3 times
- Exponential backoff: 30s, 60s, 120s
- Only retries on rate limit errors, not other errors

### 4. **Better Error Handling**
- Email service now returns `isRateLimit` flag
- Cron job properly identifies rate limit errors
- Graceful handling of rate limit scenarios

## Changes Made

### `backend/utils/paymentFailureCron.js`
- Added delay function for waiting between emails
- Added rate limit detection helper function
- Implemented retry logic with exponential backoff
- Added 2-second delay between emails
- Added 60-second wait when rate limit is detected
- Improved error handling and logging

### `backend/utils/emailService.js`
- Enhanced error handling to detect rate limit errors
- Returns `isRateLimit` flag in error response
- Includes response code and response in error object

## How It Works

1. **Normal Flow:**
   - Process each loan sequentially
   - Wait 2 seconds between each email
   - Track sent emails to avoid duplicates

2. **Rate Limit Detection:**
   - If rate limit error detected, wait 60 seconds
   - Retry with exponential backoff (30s, 60s, 120s)
   - Continue processing remaining emails after wait

3. **Error Handling:**
   - Non-rate-limit errors: Log and skip (no retry)
   - Rate limit errors: Retry with backoff
   - After max retries: Skip and continue

## Configuration

The delays are currently hardcoded but can be adjusted:

- **Email delay**: 2 seconds (line ~45)
- **Rate limit wait**: 60 seconds (line ~40)
- **Retry backoff**: 30s, 60s, 120s (line ~80)
- **Max retries**: 3 attempts (line ~70)

## Testing

To test the fix:

1. Ensure you have multiple loans with `payment_failed` status
2. Run the cron job manually or wait for scheduled run
3. Monitor logs for:
   - Delays between emails
   - Rate limit detection
   - Retry attempts
   - Success/failure counts

## Expected Behavior

- **Before**: All emails sent immediately → Rate limit → Most fail
- **After**: Emails sent with delays → Rate limit detected → Wait → Retry → Continue

## Monitoring

Watch for these log messages:
- `[Cron] Rate limit detected. Waiting 60 seconds...`
- `[Cron] ⚠️ Rate limit error. Waiting X seconds before retry...`
- `[Cron] ⚠️ Rate limit was encountered during this run.`

## Notes

- The 2-second delay means processing 30 emails/minute max
- If rate limit is hit, the system waits 60 seconds before continuing
- Retries use exponential backoff to avoid hammering the server
- Only rate limit errors trigger retries; other errors are logged and skipped

