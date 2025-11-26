const cron = require('node-cron');
const User = require('../models/User');
const { sendProfileCompletionReminderEmail } = require('./emailService');

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
    let emailsSkipped = 0;

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    for (const user of incompleteUsers) {
      try {
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
          console.log(`[Profile Cron] User ${user.email} profile is complete, skipping...`);
          emailsSkipped++;
          continue;
        }

        // Skip if user doesn't have email
        if (!user.email || user.email.trim() === '') {
          console.log(`[Profile Cron] Skipping user ${user.name} - no email address`);
          emailsSkipped++;
          continue;
        }

        // Check if we've sent email in last 24 hours
        const lastSent = sentEmailTracker.get(user._id.toString());
        if (lastSent && (now - lastSent < twentyFourHours)) {
          const hoursSinceLastEmail = Math.floor((now - lastSent) / (60 * 60 * 1000));
          console.log(`[Profile Cron] Email already sent to ${user.email} ${hoursSinceLastEmail} hours ago, skipping...`);
          emailsSkipped++;
          continue;
        }

        // Send email
        const result = await sendProfileCompletionReminderEmail(user);
        
        if (result.success) {
          sentEmailTracker.set(user._id.toString(), now);
          emailsSent++;
          console.log(`[Profile Cron] Profile completion reminder sent to ${user.email} (${user.name})`);
        } else {
          console.error(`[Profile Cron] Failed to send email to ${user.email}:`, result.error || result.message);
          emailsSkipped++;
        }
      } catch (error) {
        console.error(`[Profile Cron] Error processing user ${user._id}:`, error);
        emailsSkipped++;
      }
    }

    console.log(`[Profile Cron] Profile completion reminder check completed. Sent: ${emailsSent}, Skipped: ${emailsSkipped}`);
    
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

