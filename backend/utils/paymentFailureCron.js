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
    const failedLoans = await Loan.find({ 
      status: 'payment_failed',
      paymentStatus: 'failed'
    }).populate('user', 'name email phone');

    if (failedLoans.length === 0) {
      console.log('[Cron] No payment_failed loans found.');
      return;
    }

    console.log(`[Cron] Found ${failedLoans.length} payment_failed loan(s).`);

    let emailsSent = 0;
    let emailsSkipped = 0;

    for (const loan of failedLoans) {
      try {
        // Create unique key for this loan to track if we've sent email
        const loanKey = `${loan._id}_${loan.updatedAt?.getTime() || 0}`;
        
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

        // Send email
        const result = await sendPaymentFailureEmail(loan.user, loan);
        
        if (result.success) {
          sentEmailTracker.add(loanKey);
          emailsSent++;
          console.log(`[Cron] Payment failure email sent to ${loan.user.email} for loan ${loan.loanId}`);
        } else {
          console.error(`[Cron] Failed to send email for loan ${loan.loanId}:`, result.error || result.message);
          emailsSkipped++;
        }
      } catch (error) {
        console.error(`[Cron] Error processing loan ${loan.loanId}:`, error);
        emailsSkipped++;
      }
    }

    console.log(`[Cron] Payment failure email check completed. Sent: ${emailsSent}, Skipped: ${emailsSkipped}`);
    
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
  
  // Run immediately on startup (optional - comment out if you don't want this)
  // checkAndSendPaymentFailureEmails();
  
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

