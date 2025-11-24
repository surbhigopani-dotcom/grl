import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import cityscapeImage from '../img/cityScapeMsite.a5d03026.png';
import { 
  Menu, 
  X, 
  ArrowRight, 
  Shield, 
  Smartphone, 
  Zap, 
  Lock, 
  CheckCircle, 
  Target,
  GraduationCap,
  TrendingUp,
  DollarSign,
  FileText,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Apple,
  Play
} from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMoreProducts, setShowMoreProducts] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/login');
    }
  };

  const loanTypes = [
    { icon: <TrendingUp className="w-6 h-6" />, title: "Personal Loans", desc: "Quick funds for your needs" },
    { icon: <DollarSign className="w-6 h-6" />, title: "Business Loans", desc: "Grow your business" },
    { icon: <FileText className="w-6 h-6" />, title: "Home Loans", desc: "Your dream home awaits" },
    { icon: <Target className="w-6 h-6" />, title: "Education Loans", desc: "Invest in your future" }
  ];

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "Get your loan approved in just 1 minute with our automated system"
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "100% Secure",
      description: "Bank-level 256-bit SSL encryption protects your data"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Mobile Friendly",
      description: "Apply anytime, anywhere from your phone or computer"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Flexible Amounts",
      description: "Borrow anywhere from ₹10,000 to ₹5,00,000"
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-circle">
              <span className="logo-text">G</span>
            </div>
            <span className="logo-brand">GrowLoan</span>
          </div>
          
          <div className="nav-links-desktop">
            <a href="#products" className="nav-link">Loans</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#support" className="nav-link">Support</a>
            <div className="nav-search">
              <span className="search-icon-text">Q</span>
              <span className="search-text">Search GrowLoan...</span>
            </div>
            {user ? (
              <Button 
                onClick={() => navigate("/home")}
                className="nav-login-btn"
              >
                Dashboard
              </Button>
            ) : (
              <Button 
                onClick={() => navigate("/login")}
                className="nav-login-btn"
              >
                Login / Sign up
              </Button>
            )}
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a href="#products" onClick={() => setMobileMenuOpen(false)}>Loans</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#support" onClick={() => setMobileMenuOpen(false)}>Support</a>
            {user ? (
              <Button onClick={() => { navigate("/home"); setMobileMenuOpen(false); }}>
                Dashboard
              </Button>
            ) : (
              <Button onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}>
                Login / Sign up
              </Button>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">GrowLoan your wealth</h1>
          <p className="hero-subtitle">Built for a Growing India.</p>
          <div className="hero-cta-wrapper">
            <div className="hero-cta">
              <Button 
                size="lg"
                onClick={handleGetStarted}
                className="hero-btn-primary"
              >
                Get started
              </Button>
              <div className="hero-badge">
                <div className="badge-text">
                  <strong>India's #1 Loan Platform</strong>
                  <span>Trusted by 5+ crore borrowers</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-illustration">
            <div className="illustration-placeholder">
              <img 
                src={cityscapeImage} 
                alt="GrowLoan Cityscape" 
                className="cityscape-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="features-content">
            <div className="features-left">
              <h2 className="section-title">Indian markets at your fingertips</h2>
              <p className="section-description">
                Long-term or short-term, high risk or low risk. Be the kind of borrower you want to be.
              </p>
              <div className="loan-types-list">
                {loanTypes.map((type, index) => (
                  <div key={index} className="loan-type-item">
                    <div className="loan-type-icon">{type.icon}</div>
                    <div className="loan-type-content">
                      <h3>{type.title}</h3>
                      <p>{type.desc}</p>
                    </div>
                    <ArrowRight className="arrow-icon" />
                  </div>
                ))}
              </div>
            </div>
            <div className="features-right">
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="phone-app-header">
                    <div className="phone-logo">
                      <div className="phone-logo-circle">
                        <span>G</span>
                      </div>
                      <span className="phone-logo-text">GrowLoan</span>
                    </div>
                    <Menu className="phone-menu-icon" />
                  </div>
                  <div className="phone-content-area">
                    <div className="phone-form-container">
                      <h3 className="phone-form-title">Apply for Loan</h3>
                      <div className="phone-price-large">₹50,000</div>
                      <div className="phone-options">
                        <button className="phone-option active">Personal</button>
                        <button className="phone-option">Business</button>
                      </div>
                      <div className="phone-form">
                        <div className="phone-field">
                          <label>Loan Amount</label>
                          <input type="text" value="50000" readOnly />
                        </div>
                        <div className="phone-field">
                          <label>Tenure</label>
                          <select>
                            <option>12 Months</option>
                            <option>24 Months</option>
                            <option>36 Months</option>
                          </select>
                        </div>
                        <div className="phone-field">
                          <label>Interest Rate</label>
                          <input type="text" value="12% p.a." readOnly />
                        </div>
                        <button className="phone-submit-btn">APPLY NOW</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className="education-section">
        <div className="container">
          <div className="education-content">
            <GraduationCap className="education-icon" />
            <h2 className="section-title">Finance simplified, in your language.</h2>
            <div className="education-links">
              <a href="#" className="education-link">
                <span>YouTube</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#" className="education-link">
                <span>GrowLoan Digest</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-grid">
            {features.map((feature, index) => (
              <div key={index} className="trust-card">
                <div className="trust-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-main">
              <div className="footer-logo-section">
                <div className="footer-logo">
                  <div className="logo-circle">
                    <span className="logo-text">G</span>
                  </div>
                  <span className="logo-brand">GrowLoan</span>
                </div>
                <p className="footer-address">
                  Vaishnavi Tech Park, South Tower, 3rd Floor,<br />
                  Sarjapur Main Road, Bellandur,<br />
                  Bengaluru - 560103 Karnataka
                </p>
                <div className="footer-contact">
                  <div className="contact-section">
                    <h4>Contact Us</h4>
                    <div className="social-icons">
                      <a href="#" aria-label="Twitter"><Twitter /></a>
                      <a href="#" aria-label="Instagram"><Instagram /></a>
                      <a href="#" aria-label="LinkedIn"><Linkedin /></a>
                      <a href="#" aria-label="YouTube"><Youtube /></a>
                    </div>
                  </div>
                  <div className="contact-section">
                    <h4>Download the App</h4>
                    <div className="app-icons">
                      <a href="#" aria-label="App Store"><Apple /></a>
                      <a href="#" aria-label="Play Store"><Play /></a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="footer-links">
                <div className="footer-column">
                  <h4>GROWLOAN</h4>
                  <ul>
                    <li><a href="#about">About Us</a></li>
                    <li><a href="#pricing">Pricing</a></li>
                    <li><a href="#blog">Blog</a></li>
                    <li><a href="#media">Media & Press</a></li>
                    <li><a href="#careers">Careers</a></li>
                    <li><Link to="/contact">Help & Support</Link></li>
                    <li><a href="#trust">Trust & Safety</a></li>
                    <li><a href="#investor">Investor Relations</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h4>PRODUCTS</h4>
                  <ul>
                    <li><a href="#personal-loans">Personal Loans</a></li>
                    <li><a href="#business-loans">Business Loans</a></li>
                    <li><a href="#home-loans">Home Loans</a></li>
                    <li><a href="#education-loans">Education Loans</a></li>
                    <li><a href="#quick-loans">Quick Loans</a></li>
                    <li><a href="#loan-calculator">Loan Calculator</a></li>
                    <li><a href="#emi-calculator">EMI Calculator</a></li>
                    <li><a href="#eligibility">Eligibility Check</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h4>LOAN TYPES</h4>
                  <ul>
                    <li><a href="#secured">Secured Loans</a></li>
                    <li><a href="#unsecured">Unsecured Loans</a></li>
                    <li><a href="#short-term">Short Term Loans</a></li>
                    <li><a href="#long-term">Long Term Loans</a></li>
                    <li><a href="#instant">Instant Loans</a></li>
                    {showMoreProducts && (
                      <>
                        <li><a href="#gold">Gold Loans</a></li>
                        <li><a href="#vehicle">Vehicle Loans</a></li>
                        <li><a href="#medical">Medical Loans</a></li>
                      </>
                    )}
                    <li>
                      <button 
                        className="show-more-btn"
                        onClick={() => setShowMoreProducts(!showMoreProducts)}
                      >
                        {showMoreProducts ? 'Show Less' : 'Show More'}
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h4>CALCULATORS</h4>
                  <ul>
                    <li><a href="#emi">EMI Calculator</a></li>
                    <li><a href="#eligibility">Eligibility Calculator</a></li>
                    <li><a href="#interest">Interest Calculator</a></li>
                    <li><a href="#prepayment">Prepayment Calculator</a></li>
                    <li><a href="#tax">Tax Calculator</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h4>SUPPORT</h4>
                  <ul>
                    <li><Link to="/contact">Contact Us</Link></li>
                    <li><a href="#faq">FAQ</a></li>
                    <li><a href="#help">Help Center</a></li>
                    <li><a href="#track">Track Application</a></li>
                    <li><a href="#complaint">File Complaint</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h4>LEGAL</h4>
                  <ul>
                    <li><Link to="/privacy">Privacy Policy</Link></li>
                    <li><a href="#terms">Terms & Conditions</a></li>
                    <li><a href="#disclosure">Disclosure</a></li>
                    <li><a href="#grievance">Grievance Policy</a></li>
                    <li><a href="#security">Security Practices</a></li>
                    <li><a href="#regulatory">Regulatory Info</a></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="footer-disclaimer">
              <div className="disclaimer-section">
                <h4>About GrowLoan</h4>
                <p>
                  GrowLoan is India's leading digital lending platform, providing quick and easy access to loans 
                  for millions of Indians. We offer transparent, secure, and hassle-free loan services with 
                  competitive interest rates and flexible repayment options.
                </p>
              </div>
              <div className="disclaimer-section">
                <h4>Secure Transactions on GrowLoan</h4>
                <p>
                  All transactions on GrowLoan are secured with bank-level 256-bit SSL encryption. 
                  Your personal and financial information is protected with industry-leading security measures. 
                  We are committed to maintaining the highest standards of data privacy and security.
                </p>
              </div>
              <div className="disclaimer-section">
                <h4>Attention Borrowers</h4>
                <p>
                  Please be cautious of unauthorized emails, SMS, or calls claiming to be from GrowLoan. 
                  We will never ask for your password, OTP, or sensitive information via email or phone. 
                  Always verify communications through our official channels.
                </p>
              </div>
              <div className="disclaimer-section">
                <h4>Disclaimer</h4>
                <p>
                  GrowLoan is a registered NBFC (Non-Banking Financial Company) licensed by the Reserve Bank of India. 
                  All loan products are subject to eligibility criteria and credit assessment. Interest rates and 
                  terms may vary based on individual credit profiles. Please read all terms and conditions carefully 
                  before applying for any loan product. Past performance does not guarantee future results.
                </p>
              </div>
            </div>

            <div className="footer-copyright">
              <p>© 2024 GrowLoan. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
