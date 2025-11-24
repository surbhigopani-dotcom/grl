import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Shield, Lock, Eye, FileText, Mail } from 'lucide-react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-page">
      <div className="privacy-header">
        <div className="container">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="header-content">
            <Shield className="header-icon" />
            <h1>Privacy Policy</h1>
            <p>Last updated: December 2024</p>
          </div>
        </div>
      </div>

      <div className="privacy-content">
        <div className="container">
          <div className="privacy-sections">
            <section className="privacy-section">
              <h2>1. Introduction</h2>
              <p>
                Welcome to GrowLoan. We are committed to protecting your privacy and ensuring the security 
                of your personal information. This Privacy Policy explains how we collect, use, disclose, 
                and safeguard your information when you use our loan services platform.
              </p>
              <p>
                By using GrowLoan, you agree to the collection and use of information in accordance with 
                this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            <section className="privacy-section">
              <h2>2. Information We Collect</h2>
              <h3>2.1 Personal Information</h3>
              <p>We collect the following types of personal information:</p>
              <ul>
                <li><strong>Identity Information:</strong> Name, date of birth, gender, Aadhaar number, PAN number</li>
                <li><strong>Contact Information:</strong> Phone number, email address, residential address</li>
                <li><strong>Financial Information:</strong> Bank account details, income information, employment details</li>
                <li><strong>Documentation:</strong> Identity proof, address proof, income proof, bank statements</li>
                <li><strong>Device Information:</strong> IP address, browser type, device identifiers, operating system</li>
                <li><strong>Usage Data:</strong> How you interact with our platform, pages visited, time spent</li>
              </ul>

              <h3>2.2 How We Collect Information</h3>
              <ul>
                <li>Directly from you when you register, apply for loans, or contact us</li>
                <li>Automatically through cookies and similar tracking technologies</li>
                <li>From third-party sources such as credit bureaus, banks, and verification agencies</li>
                <li>Through our mobile application and website</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>3. How We Use Your Information</h2>
              <p>We use your information for the following purposes:</p>
              <ul>
                <li><strong>Loan Processing:</strong> To evaluate your loan application, verify your identity, and assess creditworthiness</li>
                <li><strong>Service Delivery:</strong> To provide, maintain, and improve our loan services</li>
                <li><strong>Communication:</strong> To send you updates, notifications, and respond to your inquiries</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
                <li><strong>Fraud Prevention:</strong> To detect, prevent, and address fraud, security issues, and other harmful activities</li>
                <li><strong>Analytics:</strong> To analyze usage patterns and improve our services</li>
                <li><strong>Marketing:</strong> To send you promotional materials (with your consent) about our products and services</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>4. Information Sharing and Disclosure</h2>
              <p>We may share your information with:</p>
              <ul>
                <li><strong>Lending Partners:</strong> Banks and financial institutions for loan processing and disbursement</li>
                <li><strong>Credit Bureaus:</strong> To check your credit history and report loan-related information</li>
                <li><strong>Service Providers:</strong> Third-party vendors who assist in operations (payment processors, cloud services, etc.)</li>
                <li><strong>Legal Authorities:</strong> When required by law, court order, or government regulations</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>
              <p>
                We do not sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section className="privacy-section">
              <h2>5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information:
              </p>
              <ul>
                <li><strong>Encryption:</strong> 256-bit SSL encryption for data transmission</li>
                <li><strong>Secure Storage:</strong> Data stored in encrypted databases with restricted access</li>
                <li><strong>Access Controls:</strong> Limited access to personal information on a need-to-know basis</li>
                <li><strong>Regular Audits:</strong> Security audits and vulnerability assessments</li>
                <li><strong>Employee Training:</strong> Regular training on data protection and privacy</li>
              </ul>
              <p>
                However, no method of transmission over the internet or electronic storage is 100% secure. 
                While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="privacy-section">
              <h2>6. Your Rights and Choices</h2>
              <p>You have the following rights regarding your personal information:</p>
              <ul>
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                <li><strong>Objection:</strong> Object to processing of your information for certain purposes</li>
                <li><strong>Data Portability:</strong> Request transfer of your data to another service provider</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for marketing communications</li>
                <li><strong>Opt-Out:</strong> Opt-out of certain data collection practices</li>
              </ul>
              <p>
                To exercise these rights, please contact us at <a href="mailto:privacy@growloan.com">privacy@growloan.com</a> 
                or through our contact page.
              </p>
            </section>

            <section className="privacy-section">
              <h2>7. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your experience:
              </p>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for basic functionality</li>
                <li><strong>Analytics Cookies:</strong> To understand how you use our platform</li>
                <li><strong>Marketing Cookies:</strong> To deliver relevant advertisements (with consent)</li>
              </ul>
              <p>
                You can control cookies through your browser settings. However, disabling cookies may 
                affect certain features of our platform.
              </p>
            </section>

            <section className="privacy-section">
              <h2>8. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to:
              </p>
              <ul>
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Maintain security and prevent fraud</li>
              </ul>
              <p>
                When information is no longer needed, we securely delete or anonymize it in accordance 
                with our data retention policies.
              </p>
            </section>

            <section className="privacy-section">
              <h2>9. Children's Privacy</h2>
              <p>
                Our services are not intended for individuals under the age of 18. We do not knowingly 
                collect personal information from children. If you believe we have collected information 
                from a child, please contact us immediately.
              </p>
            </section>

            <section className="privacy-section">
              <h2>10. Third-Party Links</h2>
              <p>
                Our platform may contain links to third-party websites. We are not responsible for the 
                privacy practices of these external sites. We encourage you to review their privacy 
                policies before providing any information.
              </p>
            </section>

            <section className="privacy-section">
              <h2>11. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material 
                changes by:
              </p>
              <ul>
                <li>Posting the new policy on this page</li>
                <li>Updating the "Last updated" date</li>
                <li>Sending you an email notification (for significant changes)</li>
              </ul>
              <p>
                Your continued use of our services after changes become effective constitutes acceptance 
                of the updated policy.
              </p>
            </section>

            <section className="privacy-section">
              <h2>12. Contact Us</h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or our data 
                practices, please contact us:
              </p>
              <div className="contact-info">
                <div className="contact-item">
                  <Mail className="contact-icon" />
                  <div>
                    <strong>Email:</strong>
                    <a href="mailto:privacy@growloan.com">privacy@growloan.com</a>
                  </div>
                </div>
                <div className="contact-item">
                  <FileText className="contact-icon" />
                  <div>
                    <strong>Address:</strong>
                    <span>Vaishnavi Tech Park, South Tower, 3rd Floor,<br />
                    Sarjapur Main Road, Bellandur,<br />
                    Bengaluru - 560103, Karnataka, India</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="privacy-section">
              <h2>13. Grievance Redressal</h2>
              <p>
                If you have any grievances regarding the processing of your personal information, you 
                can file a complaint with our Grievance Officer:
              </p>
              <div className="contact-info">
                <div className="contact-item">
                  <Mail className="contact-icon" />
                  <div>
                    <strong>Grievance Officer:</strong>
                    <a href="mailto:grievance@growloan.com">grievance@growloan.com</a>
                  </div>
                </div>
                <p>
                  We will respond to your grievance within 30 days of receipt.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

