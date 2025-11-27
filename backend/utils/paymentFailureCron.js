const cron = require('node-cron');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { sendPaymentFailureEmail } = require('./emailService');

// Track which loans we've already sent emails for (to avoid spam)
const sentEmailTracker = new Set();

// Function to send payment failure emails
const checkAndSendPaymentFailureEmails = async () => {
  try {
    console.log('[Cron] Checking for payment_failed loans...');
    
    // Find all loans with payment_failed status
    // Check both status and paymentStatus fields
    const failedLoans = await Loan.find({ 
      $or: [
        { status: 'payment_failed' },
        { paymentStatus: 'failed' }
      ]
    }).populate('user', 'name email phone');

    if (failedLoans.length === 0) {
      console.log('[Cron] No payment_failed loans found.');
      return;
    }

    console.log(`[Cron] Found ${failedLoans.length} payment_failed loan(s).`);

    let emailsSent = 0;
    let emailsSkipped = 0;
    let rateLimitHit = false;

    // Helper function to delay execution
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper function to check if error is rate limit
    const isRateLimitError = (error) => {
      // Check if email service returned isRateLimit flag
      if (error?.isRateLimit === true) {
        return true;
      }
      // Check error message/response for rate limit indicators
      return error?.message?.includes('Ratelimit') || 
             error?.response?.includes('Ratelimit') ||
             error?.code === 'ERATELIMIT' ||
             (error?.responseCode === 451 && error?.response?.includes('Ratelimit'));
    };

    for (let i = 0; i < failedLoans.length; i++) {
      const loan = failedLoans[i];
      
      try {
        // If rate limit was hit, wait longer before continuing
        if (rateLimitHit) {
          console.log(`[Cron] Rate limit detected. Waiting 60 seconds before continuing...`);
          await delay(60000); // Wait 60 seconds
          rateLimitHit = false; // Reset flag
        }

        // Add delay between emails to avoid rate limiting (2 seconds between emails)
        if (i > 0) {
          await delay(2000); // 2 second delay between emails
        }

        // Create unique key for this loan to track if we've sent email
        const loanKey = `${loan._id}_${loan.updatedAt?.getTime() || 0}`;
        
        console.log(`[Cron] Processing loan ${loan.loanId || loan._id} (${i + 1}/${failedLoans.length}), status: ${loan.status}, paymentStatus: ${loan.paymentStatus}`);
        
        // Check if we've already sent email for this loan (within last 24 hours)
        // We'll send email again if loan was updated (new failure)
        if (sentEmailTracker.has(loanKey)) {
          console.log(`[Cron] Email already sent for loan ${loan.loanId}, skipping...`);
          emailsSkipped++;
          continue;
        }

        if (!loan.user) {
          console.log(`[Cron] No user found for loan ${loan.loanId}, skipping...`);
          emailsSkipped++;
          continue;
        }

        if (!loan.user.email || loan.user.email.trim() === '') {
          console.log(`[Cron] User ${loan.user.name || loan.user._id} has no email address, skipping...`);
          emailsSkipped++;
          continue;
        }

        console.log(`[Cron] Attempting to send payment failure email to ${loan.user.email} for loan ${loan.loanId}...`);
        
        // Send email with retry logic
        let result = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            result = await sendPaymentFailureEmail(loan.user, loan);
            
            // Check if it's a rate limit error
            if (!result.success && isRateLimitError(result)) {
              rateLimitHit = true;
              const waitTime = Math.pow(2, retryCount) * 30; // Exponential backoff: 30s, 60s, 120s
              console.log(`[Cron] ⚠️ Rate limit error. Waiting ${waitTime} seconds before retry ${retryCount + 1}/${maxRetries}...`);
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
              console.log(`[Cron] ⚠️ Rate limit exception. Waiting ${waitTime} seconds before retry ${retryCount + 1}/${maxRetries}...`);
              await delay(waitTime * 1000);
              retryCount++;
              
              if (retryCount >= maxRetries) {
                result = { success: false, error: 'Rate limit exceeded after retries' };
              }
              continue;
            } else {
              // Non-rate-limit error, don't retry
              result = { success: false, error: error.message };
              break;
            }
          }
        }
        
        if (result && result.success) {
          sentEmailTracker.add(loanKey);
          emailsSent++;
          console.log(`[Cron] ✅ Payment failure email sent successfully to ${loan.user.email} for loan ${loan.loanId}`);
        } else {
          const errorMsg = result?.error || result?.message || 'Unknown error';
          console.error(`[Cron] ❌ Failed to send email for loan ${loan.loanId}: ${errorMsg}`);
          
          // If rate limit error, mark it so we wait before next email
          if (isRateLimitError(result) || errorMsg.includes('Ratelimit')) {
            rateLimitHit = true;
          }
          
          emailsSkipped++;
        }
      } catch (error) {
        console.error(`[Cron] ❌ Error processing loan ${loan.loanId || loan._id}:`, error.message);
        
        // Check if it's a rate limit error
        if (isRateLimitError(error)) {
          rateLimitHit = true;
          console.log(`[Cron] ⚠️ Rate limit detected in catch block. Will wait before next email.`);
        }
        
        emailsSkipped++;
      }
    }

    console.log(`[Cron] Payment failure email check completed. Sent: ${emailsSent}, Skipped: ${emailsSkipped}`);
    
    if (rateLimitHit) {
      console.log(`[Cron] ⚠️ Rate limit was encountered during this run. Some emails may have been skipped.`);
    }
    
    // Clean up old entries from tracker (keep only last 1000 entries to prevent memory issues)
    if (sentEmailTracker.size > 1000) {
      const entriesArray = Array.from(sentEmailTracker);
      sentEmailTracker.clear();
      // Keep last 500 entries
      entriesArray.slice(-500).forEach(entry => sentEmailTracker.add(entry));
    }
  } catch (error) {
    console.error('[Cron] Error in payment failure email cron job:', error);
  }
};

// Schedule cron job to run every hour
// Format: minute hour day month weekday
// '0 * * * *' = every hour at minute 0 (00:00, 01:00, 02:00, etc.)
const startPaymentFailureCron = () => {
  console.log('[Cron] Starting payment failure email cron job...');
  console.log('[Cron] Schedule: Every hour (at minute 0 of each hour)');
  
  // Run immediately on startup to check for failed payments
  checkAndSendPaymentFailureEmails();
  
  // Schedule to run every hour
  cron.schedule('0 * * * *', () => {
    console.log('[Cron] Running hourly payment failure email check...');
    checkAndSendPaymentFailureEmails();
  });
};

module.exports = {
  startPaymentFailureCron,
  checkAndSendPaymentFailureEmails
};

