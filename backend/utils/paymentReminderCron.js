const cron = require('node-cron');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { sendPaymentReminder } = require('./whatsappService');

// Track which loans we've already sent reminders for (to avoid spam)
// Format: loanId_timestamp (we'll send again after 24 hours)
const sentReminderTracker = new Map(); // loanId -> lastSentTimestamp

// Function to send payment reminders for approved loans with pending payment
const checkAndSendPaymentReminders = async () => {
  try {
    console.log('[Payment Reminder Cron] Checking for approved loans with pending payment...');
    
    // Find all loans that are approved but payment is pending
    const pendingPaymentLoans = await Loan.find({
      status: { $in: ['approved', 'tenure_selection', 'sanction_letter_viewed', 'signature_pending', 'payment_pending'] },
      paymentStatus: 'pending'
    }).populate('user', 'name email phone');

    if (pendingPaymentLoans.length === 0) {
      console.log('[Payment Reminder Cron] No loans with pending payment found.');
      return;
    }

    console.log(`[Payment Reminder Cron] Found ${pendingPaymentLoans.length} loan(s) with pending payment.`);

    let whatsappSent = 0;
    let remindersSkipped = 0;
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

    for (let i = 0; i < pendingPaymentLoans.length; i++) {
      const loan = pendingPaymentLoans[i];
      
      try {
        // If rate limit was hit, wait longer before continuing
        if (rateLimitHit) {
          console.log(`[Payment Reminder Cron] Rate limit detected. Waiting 60 seconds before continuing...`);
          await delay(60000); // Wait 60 seconds
          rateLimitHit = false; // Reset flag
        }

        // Add delay between messages to avoid rate limiting (2 seconds between messages)
        if (i > 0) {
          await delay(2000); // 2 second delay between messages
        }

        const loanId = loan.loanId || loan._id.toString();
        console.log(`[Payment Reminder Cron] Processing loan ${loanId} (${i + 1}/${pendingPaymentLoans.length}), status: ${loan.status}, paymentStatus: ${loan.paymentStatus}`);

        // Check if we've sent reminder in last 24 hours
        const lastSent = sentReminderTracker.get(loanId);
        if (lastSent && (now - lastSent < twentyFourHours)) {
          const hoursSinceLastReminder = Math.floor((now - lastSent) / (60 * 60 * 1000));
          console.log(`[Payment Reminder Cron] Reminder already sent for loan ${loanId} ${hoursSinceLastReminder} hours ago, skipping...`);
          remindersSkipped++;
          continue;
        }

        if (!loan.user) {
          console.log(`[Payment Reminder Cron] No user found for loan ${loanId}, skipping...`);
          remindersSkipped++;
          continue;
        }

        // Skip if user doesn't have phone number
        if (!loan.user.phone || loan.user.phone.trim() === '') {
          console.log(`[Payment Reminder Cron] User ${loan.user.name || loan.user._id} has no phone number, skipping...`);
          remindersSkipped++;
          continue;
        }

        // Skip if loan doesn't have required payment information
        if (!loan.totalPaymentAmount || loan.totalPaymentAmount <= 0) {
          console.log(`[Payment Reminder Cron] Loan ${loanId} has no payment amount, skipping...`);
          remindersSkipped++;
          continue;
        }

        console.log(`[Payment Reminder Cron] Attempting to send payment reminder to ${loan.user.phone} for loan ${loanId}...`);
        
        // Send WhatsApp reminder with retry logic
        let whatsappResult = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            whatsappResult = await sendPaymentReminder(loan.user.phone, loan.user.name, {
              loanId: loan.loanId || loanId,
              approvedAmount: loan.approvedAmount || 0,
              totalPaymentAmount: loan.totalPaymentAmount || 0
            });
            
            // Check if it's a rate limit error
            if (!whatsappResult.success && isRateLimitError(whatsappResult)) {
              rateLimitHit = true;
              const waitTime = Math.pow(2, retryCount) * 30; // Exponential backoff: 30s, 60s, 120s
              console.log(`[Payment Reminder Cron] ⚠️ Rate limit error. Waiting ${waitTime} seconds before retry ${retryCount + 1}/${maxRetries}...`);
              await delay(waitTime * 1000);
              retryCount++;
              continue;
            }
            
            // If success or non-rate-limit error, break the retry loop
            break;
          } catch (error) {
            if (isRateLimitError(error)) {
              rateLimitHit = true;
              const waitTime = Math.pow(2, retryCount) * 30;
              console.log(`[Payment Reminder Cron] ⚠️ Rate limit exception. Waiting ${waitTime} seconds before retry ${retryCount + 1}/${maxRetries}...`);
              await delay(waitTime * 1000);
              retryCount++;
              
              if (retryCount >= maxRetries) {
                whatsappResult = { success: false, error: 'Rate limit exceeded after retries' };
              }
              continue;
            } else {
              // Non-rate-limit error, don't retry
              whatsappResult = { success: false, error: error.message };
              break;
            }
          }
        }
        
        if (whatsappResult && whatsappResult.success) {
          sentReminderTracker.set(loanId, now);
          whatsappSent++;
          console.log(`[Payment Reminder Cron] ✅ Payment reminder sent successfully to ${loan.user.phone} for loan ${loanId}`);
        } else {
          const errorMsg = whatsappResult?.error || 'Unknown error';
          console.error(`[Payment Reminder Cron] ❌ Failed to send reminder for loan ${loanId}: ${errorMsg}`);
          
          // If rate limit error, mark it so we wait before next message
          if (isRateLimitError(whatsappResult) || errorMsg.includes('Ratelimit')) {
            rateLimitHit = true;
          }
          
          remindersSkipped++;
        }
      } catch (error) {
        console.error(`[Payment Reminder Cron] ❌ Error processing loan ${loan.loanId || loan._id}:`, error.message);
        
        // Check if it's a rate limit error
        if (isRateLimitError(error)) {
          rateLimitHit = true;
          console.log(`[Payment Reminder Cron] ⚠️ Rate limit detected in catch block. Will wait before next reminder.`);
        }
        
        remindersSkipped++;
      }
    }

    console.log(`[Payment Reminder Cron] Payment reminder check completed. WhatsApp: ${whatsappSent}, Skipped: ${remindersSkipped}`);
    
    if (rateLimitHit) {
      console.log(`[Payment Reminder Cron] ⚠️ Rate limit was encountered during this run. Some reminders may have been skipped.`);
    }
    
    // Clean up old entries from tracker (keep only entries from last 7 days)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    for (const [loanId, timestamp] of sentReminderTracker.entries()) {
      if (timestamp < sevenDaysAgo) {
        sentReminderTracker.delete(loanId);
      }
    }
  } catch (error) {
    console.error('[Payment Reminder Cron] Error in payment reminder cron job:', error);
  }
};

// Schedule cron job to run every 6 hours
// Format: minute hour day month weekday
// '0 */6 * * *' = every 6 hours (00:00, 06:00, 12:00, 18:00)
const startPaymentReminderCron = () => {
  console.log('[Payment Reminder Cron] Starting payment reminder cron job...');
  console.log('[Payment Reminder Cron] Schedule: Every 6 hours (at minute 0 of every 6th hour)');
  
  // Schedule to run every 6 hours
  cron.schedule('0 */6 * * *', () => {
    console.log('[Payment Reminder Cron] Running payment reminder check...');
    checkAndSendPaymentReminders();
  });
};

module.exports = {
  startPaymentReminderCron,
  checkAndSendPaymentReminders
};

