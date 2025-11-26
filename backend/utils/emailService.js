const nodemailer = require('nodemailer');

// Hostinger SMTP Configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'no-reply@growwloan.online',
      pass: 'Heric@1211$'
    }
  });
};

// Format currency in Indian format
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Format date in Indian format
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Send loan approval email
const sendLoanApprovalEmail = async (user, loan) => {
  try {
    if (!user.email || user.email.trim() === '') {
      console.log(`Skipping email for user ${user.name} - no email address`);
      return { success: false, message: 'User email not available' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"GrowLoan" <no-reply@growwloan.online>',
      to: user.email,
      subject: `🎉 Congratulations! Your Loan Application ${loan.loanId} Has Been Approved`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .loan-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; }
            .value { font-weight: 700; color: #14b8a6; }
            .button { display: inline-block; padding: 12px 30px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Loan Approved!</h1>
              <p>Congratulations on your loan approval</p>
            </div>
            <div class="content">
              <p>Dear ${user.name},</p>
              
              <p>We are pleased to inform you that your loan application has been <strong>approved</strong>!</p>
              
              <div class="loan-details">
                <h3 style="margin-top: 0; color: #14b8a6;">Loan Details</h3>
                <div class="detail-row">
                  <span class="label">Loan ID:</span>
                  <span class="value">${loan.loanId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Requested Amount:</span>
                  <span class="value">${formatCurrency(loan.requestedAmount)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Approved Amount:</span>
                  <span class="value">${formatCurrency(loan.approvedAmount)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Approval Date:</span>
                  <span class="value">${formatDate(loan.approvedAt)}</span>
                </div>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Select your loan tenure and EMI preferences</li>
                <li>Review and sign the sanction letter</li>
                <li>Complete the payment process</li>
              </ol>
              
              <p style="text-align: center;">
                <a href="https://growwloan.online/home" class="button">View Loan Details</a>
              </p>
              
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br><strong>GrowLoan Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} GrowLoan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Loan approval email sent to ${user.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending loan approval email:', error);
    return { success: false, error: error.message };
  }
};

// Send payment submission email
const sendPaymentSubmissionEmail = async (user, loan) => {
  try {
    if (!user.email || user.email.trim() === '') {
      console.log(`Skipping email for user ${user.name} - no email address`);
      return { success: false, message: 'User email not available' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"GrowLoan" <no-reply@growwloan.online>',
      to: user.email,
      subject: `Payment Received - Loan ${loan.loanId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; }
            .value { font-weight: 700; color: #14b8a6; }
            .total-row { background: #f0fdfa; padding: 15px; border-radius: 6px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .status-badge { display: inline-block; padding: 6px 12px; background: #fef3c7; color: #92400e; border-radius: 20px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💳 Payment Received</h1>
              <p>Your payment is being processed</p>
            </div>
            <div class="content">
              <p>Dear ${user.name},</p>
              
              <p>We have received your payment for loan <strong>${loan.loanId}</strong>. Your payment is currently under verification.</p>
              
              <div class="payment-details">
                <h3 style="margin-top: 0; color: #14b8a6;">Payment Details</h3>
                <div class="detail-row">
                  <span class="label">Loan ID:</span>
                  <span class="value">${loan.loanId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment ID:</span>
                  <span class="value">${loan.paymentId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment Date:</span>
                  <span class="value">${formatDate(loan.paymentAt)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment Method:</span>
                  <span class="value">${loan.paymentMethod || 'Online'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Deposit Amount:</span>
                  <span class="value">${formatCurrency(loan.depositAmount)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">File Charge:</span>
                  <span class="value">${formatCurrency(loan.fileCharge)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Platform Fee:</span>
                  <span class="value">${formatCurrency(loan.platformFee)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Tax:</span>
                  <span class="value">${formatCurrency(loan.tax)}</span>
                </div>
                <div class="total-row">
                  <div class="detail-row" style="border-bottom: none;">
                    <span class="label" style="font-size: 16px;">Total Amount Paid:</span>
                    <span class="value" style="font-size: 18px;">${formatCurrency(loan.totalPaymentAmount)}</span>
                  </div>
                </div>
                <div style="margin-top: 15px; text-align: center;">
                  <span class="status-badge">⏳ Payment Under Verification</span>
                </div>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Our team will verify your payment</li>
                <li>Once verified, your loan will move to processing stage</li>
                <li>You will receive a confirmation email once payment is verified</li>
                <li>Expected processing time: ${loan.expectedCompletionDate ? formatDate(loan.expectedCompletionDate) : '15 days'}</li>
              </ul>
              
              <p>If you have any questions about your payment, please contact our support team.</p>
              
              <p>Best regards,<br><strong>GrowLoan Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} GrowLoan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Payment submission email sent to ${user.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending payment submission email:', error);
    return { success: false, error: error.message };
  }
};

// Send sanction letter email
const sendSanctionLetterEmail = async (user, loan) => {
  try {
    if (!user.email || user.email.trim() === '') {
      console.log(`Skipping email for user ${user.name} - no email address`);
      return { success: false, message: 'User email not available' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"GrowLoan" <no-reply@growwloan.online>',
      to: user.email,
      subject: `Sanction Letter Available - Loan ${loan.loanId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .loan-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; }
            .value { font-weight: 700; color: #14b8a6; }
            .button { display: inline-block; padding: 12px 30px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📄 Sanction Letter Ready</h1>
              <p>Your loan sanction letter is available</p>
            </div>
            <div class="content">
              <p>Dear ${user.name},</p>
              
              <p>Your loan sanction letter for loan <strong>${loan.loanId}</strong> is now available for review and signature.</p>
              
              <div class="loan-details">
                <h3 style="margin-top: 0; color: #14b8a6;">Loan Summary</h3>
                <div class="detail-row">
                  <span class="label">Loan ID:</span>
                  <span class="value">${loan.loanId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Approved Amount:</span>
                  <span class="value">${formatCurrency(loan.approvedAmount)}</span>
                </div>
                ${loan.tenure ? `
                <div class="detail-row">
                  <span class="label">Tenure:</span>
                  <span class="value">${loan.tenure} months</span>
                </div>
                <div class="detail-row">
                  <span class="label">EMI Amount:</span>
                  <span class="value">${formatCurrency(loan.emiAmount)}</span>
                </div>
                ` : ''}
                ${loan.interestRate ? `
                <div class="detail-row">
                  <span class="label">Interest Rate:</span>
                  <span class="value">${loan.interestRate}%</span>
                </div>
                ` : ''}
              </div>
              
              <div class="info-box">
                <strong>⚠️ Important:</strong> Please review the sanction letter carefully and provide your digital signature to proceed with the payment.
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Review the sanction letter details</li>
                <li>Provide your digital signature</li>
                <li>Complete the payment process</li>
              </ol>
              
              <p style="text-align: center;">
                <a href="https://growwloan.online/sanction-letter/${loan._id}" class="button">View Sanction Letter</a>
              </p>
              
              <p>If you have any questions about the sanction letter, please contact our support team.</p>
              
              <p>Best regards,<br><strong>GrowLoan Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} GrowLoan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Sanction letter email sent to ${user.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending sanction letter email:', error);
    return { success: false, error: error.message };
  }
};

// Send payment approval confirmation email
const sendPaymentApprovalEmail = async (user, loan) => {
  try {
    if (!user.email || user.email.trim() === '') {
      console.log(`Skipping email for user ${user.name} - no email address`);
      return { success: false, message: 'User email not available' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"GrowLoan" <no-reply@growwloan.online>',
      to: user.email,
      subject: `✅ Payment Verified - Loan ${loan.loanId} Processing Started`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; }
            .value { font-weight: 700; color: #10b981; }
            .success-badge { display: inline-block; padding: 8px 16px; background: #d1fae5; color: #065f46; border-radius: 20px; font-size: 14px; font-weight: 600; }
            .timeline { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .timeline-item { padding: 10px 0; border-left: 3px solid #10b981; padding-left: 20px; margin-left: 10px; }
            .timeline-item:last-child { border-left: 3px solid #d1d5db; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Verified!</h1>
              <p>Your loan is now being processed</p>
            </div>
            <div class="content">
              <p>Dear ${user.name},</p>
              
              <p>Great news! Your payment for loan <strong>${loan.loanId}</strong> has been verified and your loan is now in the processing stage.</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <span class="success-badge">✅ Payment Verified Successfully</span>
              </div>
              
              <div class="payment-details">
                <h3 style="margin-top: 0; color: #10b981;">Payment Confirmation</h3>
                <div class="detail-row">
                  <span class="label">Loan ID:</span>
                  <span class="value">${loan.loanId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment ID:</span>
                  <span class="value">${loan.paymentId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Total Amount Paid:</span>
                  <span class="value">${formatCurrency(loan.totalPaymentAmount)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment Status:</span>
                  <span class="value">✅ Verified</span>
                </div>
              </div>
              
              <div class="timeline">
                <h3 style="margin-top: 0; color: #10b981;">Processing Timeline</h3>
                <div class="timeline-item">
                  <strong>✅ Payment Verified</strong><br>
                  <span style="color: #6b7280; font-size: 14px;">${formatDate(new Date())}</span>
                </div>
                <div class="timeline-item">
                  <strong>⏳ Loan Processing</strong><br>
                  <span style="color: #6b7280; font-size: 14px;">Started on ${formatDate(loan.processingStartDate)}</span>
                </div>
                <div class="timeline-item">
                  <strong>📅 Expected Completion</strong><br>
                  <span style="color: #6b7280; font-size: 14px;">${formatDate(loan.expectedCompletionDate)}</span>
                </div>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Your loan application is being processed by our team</li>
                <li>We will verify all your documents and details</li>
                <li>You will receive updates on the processing status</li>
                <li>Once processing is complete, the loan amount will be disbursed to your bank account</li>
              </ul>
              
              <p><strong>Expected Processing Time:</strong> ${loan.expectedCompletionDate ? `Your loan will be processed by ${formatDate(loan.expectedCompletionDate)}` : '15 working days'}</p>
              
              <p>You can track your loan status anytime by logging into your account.</p>
              
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br><strong>GrowLoan Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} GrowLoan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Payment approval email sent to ${user.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending payment approval email:', error);
    return { success: false, error: error.message };
  }
};

// Send payment failure email
const sendPaymentFailureEmail = async (user, loan) => {
  try {
    if (!user.email || user.email.trim() === '') {
      console.log(`Skipping email for user ${user.name} - no email address`);
      return { success: false, message: 'User email not available' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"GrowLoan" <no-reply@growwloan.online>',
      to: user.email,
      subject: `⚠️ Payment Failed - Loan ${loan.loanId} - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .loan-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; }
            .value { font-weight: 700; color: #ef4444; }
            .button { display: inline-block; padding: 14px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .button:hover { background: #dc2626; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .warning-badge { display: inline-block; padding: 8px 16px; background: #fef2f2; color: #991b1b; border-radius: 20px; font-size: 14px; font-weight: 600; border: 2px solid #ef4444; }
            .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .step-item { padding: 10px 0; border-left: 3px solid #ef4444; padding-left: 15px; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Payment Failed</h1>
              <p>Action Required to Complete Your Loan</p>
            </div>
            <div class="content">
              <p>Dear ${user.name},</p>
              
              <div class="alert-box">
                <div style="text-align: center; margin-bottom: 15px;">
                  <span class="warning-badge">⚠️ Payment Verification Failed</span>
                </div>
                <p style="margin: 0; font-size: 16px;"><strong>Your payment for loan ${loan.loanId} could not be verified.</strong></p>
                ${loan.remarks ? `<p style="margin: 10px 0 0 0; color: #6b7280;">Reason: ${loan.remarks}</p>` : ''}
              </div>
              
              <p>To complete your loan process, please retry the payment. Your loan application will remain on hold until the payment is successfully verified.</p>
              
              <div class="loan-details">
                <h3 style="margin-top: 0; color: #ef4444;">Loan Details</h3>
                <div class="detail-row">
                  <span class="label">Loan ID:</span>
                  <span class="value">${loan.loanId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Approved Amount:</span>
                  <span class="value">${formatCurrency(loan.approvedAmount)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Total Payment Required:</span>
                  <span class="value">${formatCurrency(loan.totalPaymentAmount)}</span>
                </div>
                ${loan.paymentId ? `
                <div class="detail-row">
                  <span class="label">Previous Payment ID:</span>
                  <span class="value" style="font-size: 12px;">${loan.paymentId}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="steps">
                <h3 style="margin-top: 0; color: #ef4444;">What You Need to Do:</h3>
                <div class="step-item">
                  <strong>1. Click the button below</strong><br>
                  <span style="color: #6b7280; font-size: 14px;">You will be redirected to the payment page</span>
                </div>
                <div class="step-item">
                  <strong>2. Complete the payment</strong><br>
                  <span style="color: #6b7280; font-size: 14px;">Use the UPI ID or payment method shown</span>
                </div>
                <div class="step-item">
                  <strong>3. Verify payment</strong><br>
                  <span style="color: #6b7280; font-size: 14px;">Our team will verify and process your loan</span>
                </div>
              </div>
              
              <p style="text-align: center;">
                <a href="https://growwloan.online/home" class="button">🔄 Retry Payment Now</a>
              </p>
              <p style="text-align: center; margin-top: 10px; color: #6b7280; font-size: 14px;">
                Click the button above to go to your dashboard and complete the payment. You'll see a "Complete Payment Now" button for your failed payment.
              </p>
              
              <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>💡 Important:</strong>
                <ul style="margin: 10px 0 0 20px; padding: 0;">
                  <li>Please ensure you have sufficient balance before making the payment</li>
                  <li>Double-check the UPI ID or payment details before confirming</li>
                  <li>Keep the payment receipt/screenshot for your records</li>
                  <li>If payment fails again, please contact our support team</li>
                </ul>
              </div>
              
              <p>If you have already made the payment, please wait for our team to verify it. If you continue to face issues, please contact our support team immediately.</p>
              
              <p>Best regards,<br><strong>GrowLoan Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>Need help? Contact us at support@growwloan.online</p>
              <p>&copy; ${new Date().getFullYear()} GrowLoan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Payment failure email sent to ${user.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending payment failure email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendLoanApprovalEmail,
  sendPaymentSubmissionEmail,
  sendSanctionLetterEmail,
  sendPaymentApprovalEmail,
  sendPaymentFailureEmail
};

