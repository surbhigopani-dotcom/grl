import React from 'react';
import { Download, Share2, Printer } from 'lucide-react';
import { Button } from './ui/Button';

const LoanSanctionLetter = ({ loan, user }) => {
  const handleDownload = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Loan Sanction Letter - GrowLoan',
          text: `Your loan of ₹${loan.approvedAmount?.toLocaleString()} has been approved. Loan ID: GL-${loan.loanId}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || '0'}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 max-w-4xl mx-auto print:shadow-none print:p-8">
      {/* Action Buttons - Hidden in Print */}
      <div className="flex gap-3 mb-6 print:hidden">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          className="rounded-xl"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="rounded-xl"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Letter Content */}
      <div className="space-y-6 print:space-y-4">
        {/* Header */}
        <div className="text-center border-b-2 border-[#14b8a6]/30 pb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">GrowLoan</h1>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Vaishnavi Tech Park, South Tower, 3rd Floor,<br />
            Sarjapur Main Road, Bellandur, Bengaluru - 560103, Karnataka<br />
                    Email: support@growloan.in | Phone: +91 9108800605
          </p>
        </div>

        {/* Date */}
        <div className="text-right">
          <p className="text-gray-700 font-medium">
            Date: {formatDate(new Date())}
          </p>
        </div>

        {/* Subject */}
        <div>
          <p className="text-lg font-bold text-gray-800 mb-2">Subject: Loan Sanction Letter</p>
          <p className="text-lg font-bold text-gray-800">Loan ID: GL-{loan.loanId || loan._id?.slice(-8)}</p>
        </div>

        {/* Salutation */}
        <div>
          <p className="text-gray-700">
            Dear <strong>{user?.name || 'Valued Customer'}</strong>,
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p>
            We are pleased to inform you that your loan application has been reviewed and <strong className="text-green-600">APPROVED</strong> by our credit committee.
          </p>

          <p>
            Based on your application and the documents submitted, we are pleased to sanction a loan facility as per the details mentioned below:
          </p>

          {/* Loan Details Box */}
          <div className="bg-gradient-to-br from-[#14b8a6]/10 to-[#0d9488]/10 border-2 border-[#14b8a6]/30 rounded-xl p-6 my-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Loan Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Loan ID</p>
                <p className="text-lg font-bold text-gray-800">GL-{loan.loanId || loan._id?.slice(-8)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Application Date</p>
                <p className="text-lg font-bold text-gray-800">{formatDate(loan.appliedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Requested Amount</p>
                <p className="text-lg font-bold text-accent">{formatCurrency(loan.requestedAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Sanctioned Amount</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(loan.approvedAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Interest Rate</p>
                <p className="text-lg font-bold text-gray-800">{loan.interestRate || 12}% per annum</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tenure</p>
                <p className="text-lg font-bold text-gray-800">{loan.tenure || 24} months</p>
              </div>
              {loan.emiAmount > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monthly EMI</p>
                  <p className="text-2xl font-bold text-[#14b8a6]">{formatCurrency(loan.emiAmount)}</p>
                </div>
              )}
              {loan.totalAmount > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Amount (Principal + Interest)</p>
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(loan.totalAmount)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Charges Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 my-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Processing Charges</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">File Processing Charge:</span>
                <span className="font-semibold">{formatCurrency(loan.fileCharge || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Platform Service Fee:</span>
                <span className="font-semibold">{formatCurrency(loan.platformFee || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Deposit Amount:</span>
                <span className="font-semibold">{formatCurrency(loan.depositAmount || 0)}</span>
              </div>
              {loan.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax/GST:</span>
                  <span className="font-semibold">{formatCurrency(loan.tax || 0)}</span>
                </div>
              )}
              <div className="border-t-2 border-gray-300 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-800">Total Charges:</span>
                  <span className="text-xl font-bold text-accent">{formatCurrency(loan.totalPaymentAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <p>
            <strong>Important Instructions:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Please complete the payment of processing charges mentioned above to proceed with loan disbursement.</li>
            <li>You are required to provide your bank account details for loan disbursement.</li>
            <li>After payment verification, your loan will be processed and disbursed within 15 working days.</li>
            <li>This sanction letter is valid for 30 days from the date of issue.</li>
            <li>Please ensure all documents are complete and accurate.</li>
          </ol>

          <p>
            We look forward to serving you and helping you achieve your financial goals.
          </p>
        </div>

        {/* Closing */}
        <div className="mt-8 space-y-2">
          <p className="text-gray-700">
            Yours sincerely,
          </p>
          <div className="mt-6">
            <p className="font-bold text-gray-800">GrowLoan Team</p>
            <p className="text-sm text-gray-600">Authorized Signatory</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-4 mt-8 text-center text-xs text-gray-500">
          <p>
            This is a system-generated document. For any queries, please contact our customer support.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} GrowLoan. All rights reserved.
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default LoanSanctionLetter;

