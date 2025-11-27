const cron = require('node-cron');
const User = require('../models/User');
const { sendProfileCompletionReminderEmail } = require('./emailService');
const { sendProfileCompletionReminder } = require('./whatsappService');

// Track which users we've already sent emails to (to avoid spam)
// Format: userId_timestamp (we'll send again after 24 hours)
const sentEmailTracker = new Map(); // userId -> lastSentTimestamp

// Function to check profile completion and send reminder emails
const checkAndSendProfileCompletionReminders = async () => {
  try {
    console.log('[Profile Cron] Checking for users with incomplete profiles...');
    
    // Find all users - we'll check profile completion manually to include documents
    const allUsers = await User.find({}).select('name email phone dateOfBirth address city state pincode employmentType companyName aadharNumber panNumber aadharCardUrl panCardUrl selfieUrl isProfileComplete createdAt updatedAt');
    
    // Filter users with incomplete profiles
    // Profile is complete only if all required fields AND documents are present
    const incompleteUsers = allUsers.filter(user => {
      // Check basic fields
      const hasBasicInfo = !!(
        user.name &&
        user.phone &&
        user.email &&
        user.dateOfBirth &&
        user.address &&
        user.city &&
        user.state &&
        user.pincode &&
        user.employmentType &&
        (user.employmentType !== 'unemployed' ? user.companyName : true) &&
        user.aadharNumber &&
        user.panNumber
      );
      
      // Check documents
      const hasDocuments = !!(
        user.aadharCardUrl &&
        user.panCardUrl &&
        user.selfieUrl
      );
      
      // Profile is incomplete if either basic info or documents are missing
      return !(hasBasicInfo && hasDocuments);
    });

    if (incompleteUsers.length === 0) {
      console.log('[Profile Cron] No users with incomplete profiles found.');
      return;
    }

    console.log(`[Profile Cron] Found ${incompleteUsers.length} user(s) with incomplete profiles.`);

    let emailsSent = 0;
    let whatsappSent = 0;
    let emailsSkipped = 0;
    let rateLimitHit = false;

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Helper function to delay execution
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper function to check if error is rate limit
    const isRateLimitError = (error) => {
      return error?.message?.includes('Ratelimit') || 
             error?.response?.includes('Ratelimit') ||
             error?.statusCode === 502 || // Insufficient balance
             (error?.statusCode === 451 && error?.error?.includes('Ratelimit'));
    };

    for (let i = 0; i < incompleteUsers.length; i++) {
      const user = incompleteUsers[i];
      
      try {
        // If rate limit was hit, wait longer before continuing
        if (rateLimitHit) {
          console.log(`[Profile Cron] Rate limit detected. Waiting 60 seconds before continuing...`);
          await delay(60000); // Wait 60 seconds
          rateLimitHit = false; // Reset flag
        }

        // Add delay between messages to avoid rate limiting (2 seconds between messages)
        if (i > 0) {
          await delay(2000); // 2 second delay between messages
        }

        // Re-check if profile is actually incomplete (in case isProfileComplete flag is outdated)
        // Check if profile is complete using comprehensive check including all fields and documents
        const hasBasicInfo = !!(
          user.name &&
          user.phone &&
          user.email &&
          user.dateOfBirth &&
          user.address &&
          user.city &&
          user.state &&
          user.pincode &&
          user.employmentType &&
          (user.employmentType !== 'unemployed' ? user.companyName : true) &&
          user.aadharNumber &&
          user.panNumber
        );
        
        const hasDocuments = !!(
          user.aadharCardUrl &&
          user.panCardUrl &&
          user.selfieUrl
        );
        
        const isActuallyComplete = hasBasicInfo && hasDocuments;

        // Skip if profile is actually complete
        if (isActuallyComplete) {
          console.log(`[Profile Cron] User ${user.email || user.phone} profile is complete, skipping...`);
          emailsSkipped++;
          continue;
        }

        // Check if we've sent reminder in last 24 hours
        const lastSent = sentEmailTracker.get(user._id.toString());
        if (lastSent && (now - lastSent < twentyFourHours)) {
          const hoursSinceLastEmail = Math.floor((now - lastSent) / (60 * 60 * 1000));
          console.log(`[Profile Cron] Reminder already sent to ${user.email || user.phone} ${hoursSinceLastEmail} hours ago, skipping...`);
          emailsSkipped++;
          continue;
        }

        // Send email (if email exists)
        let emailResult = null;
        if (user.email && user.email.trim() !== '') {
          try {
            emailResult = await sendProfileCompletionReminderEmail(user);
            if (emailResult.success) {
              emailsSent++;
              console.log(`[Profile Cron] ✅ Email sent to ${user.email} (${user.name})`);
            } else {
              console.error(`[Profile Cron] ❌ Failed to send email to ${user.email}:`, emailResult.error || emailResult.message);
            }
          } catch (emailError) {
            console.error(`[Profile Cron] ❌ Email error for ${user.email}:`, emailError.message);
          }
        }

        // Send WhatsApp message (if phone exists)
        let whatsappResult = null;
        if (user.phone && user.phone.trim() !== '') {
          try {
            // Retry logic for WhatsApp
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
              whatsappResult = await sendProfileCompletionReminder(user.phone, user.name);
              
              // Check if it's a rate limit error
              if (!whatsappResult.success && isRateLimitError(whatsappResult)) {
                rateLimitHit = true;
                const waitTime = Math.pow(2, retryCount) * 30; // Exponential backoff: 30s, 60s, 120s
                console.log(`[Profile Cron] ⚠️ WhatsApp rate limit. Waiting ${waitTime} seconds before retry ${retryCount + 1}/${maxRetries}...`);
                await delay(waitTime * 1000);
                retryCount++;
                continue;
              }
              
              // If success or non-rate-limit error, break the retry loop
              break;
            }
            
            if (whatsappResult && whatsappResult.success) {
              whatsappSent++;
              console.log(`[Profile Cron] ✅ WhatsApp sent to ${user.phone} (${user.name})`);
            } else {
              const errorMsg = whatsappResult?.error || 'Unknown error';
              console.error(`[Profile Cron] ❌ Failed to send WhatsApp to ${user.phone}:`, errorMsg);
              
              // If rate limit error, mark it so we wait before next message
              if (isRateLimitError(whatsappResult) || errorMsg.includes('Ratelimit')) {
                rateLimitHit = true;
              }
            }
          } catch (whatsappError) {
            console.error(`[Profile Cron] ❌ WhatsApp error for ${user.phone}:`, whatsappError.message);
            
            // Check if it's a rate limit error
            if (isRateLimitError(whatsappError)) {
              rateLimitHit = true;
            }
          }
        }

        // Mark as sent if either email or WhatsApp was sent successfully
        if ((emailResult && emailResult.success) || (whatsappResult && whatsappResult.success)) {
          sentEmailTracker.set(user._id.toString(), now);
        } else {
          emailsSkipped++;
        }
      } catch (error) {
        console.error(`[Profile Cron] ❌ Error processing user ${user._id}:`, error);
        emailsSkipped++;
      }
    }

    console.log(`[Profile Cron] Profile completion reminder check completed. Emails: ${emailsSent}, WhatsApp: ${whatsappSent}, Skipped: ${emailsSkipped}`);
    
    if (rateLimitHit) {
      console.log(`[Profile Cron] ⚠️ Rate limit was encountered during this run. Some messages may have been skipped.`);
    }
    
    // Clean up old entries from tracker (keep only entries from last 7 days)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    for (const [userId, timestamp] of sentEmailTracker.entries()) {
      if (timestamp < sevenDaysAgo) {
        sentEmailTracker.delete(userId);
      }
    }
  } catch (error) {
    console.error('[Profile Cron] Error in profile completion reminder cron job:', error);
  }
};

// Schedule cron job to run every hour
// Format: minute hour day month weekday
// '0 * * * *' = every hour at minute 0 (00:00, 01:00, 02:00, etc.)
const startProfileCompletionCron = () => {
  console.log('[Profile Cron] Starting profile completion reminder cron job...');
  console.log('[Profile Cron] Schedule: Every hour (at minute 0 of each hour)');
  
  // Schedule to run every hour
  cron.schedule('0 * * * *', () => {
    console.log('[Profile Cron] Running hourly profile completion reminder check...');
    checkAndSendProfileCompletionReminders();
  });
};

module.exports = {
  startProfileCompletionCron,
  checkAndSendProfileCompletionReminders
};

