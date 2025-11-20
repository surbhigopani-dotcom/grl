import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ArrowRight, Shield, Smartphone, Zap, Lock, CheckCircle, Target } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/login');
    }
  };

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
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "Easy Process",
      description: "Simple 3-step application form, no paperwork hassle"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "High Approval",
      description: "99% approval rate with transparent eligibility criteria"
    }
  ];

  const stats = [
    { value: "10K+", label: "Happy Customers" },
    { value: "₹50Cr+", label: "Loans Disbursed" },
    { value: "1 Min", label: "Approval Time" },
    { value: "99%", label: "Approval Rate" }
  ];

  const loanDetails = [
    { label: "Loan Amount", value: "₹10,000 - ₹5,00,000" },
    { label: "Processing Time", value: "15 Days" },
    { label: "File Processing Charge", value: "₹99" },
    { label: "Platform Service Fee", value: "₹50" },
    { label: "Deposit Amount", value: "₹149" },
    { label: "Total Charges", value: "₹298", highlight: true }
  ];

  const trustIndicators = [
    {
      icon: <Shield className="w-10 h-10" />,
      title: "Bank-Level Security",
      description: "256-bit SSL encryption protects all your data"
    },
    {
      icon: <CheckCircle className="w-10 h-10" />,
      title: "Verified Platform",
      description: "Authenticated and trusted by thousands"
    },
    {
      icon: <Lock className="w-10 h-10" />,
      title: "Data Privacy",
      description: "Your information is completely secure with us"
    },
    {
      icon: <Smartphone className="w-10 h-10" />,
      title: "24/7 Support",
      description: "We're always here to help you"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gradient">
              GROW ₹ LOAN
            </div>
            <div className="flex gap-3">
              {user ? (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/home")}
                    className="text-primary hover:text-primary-dark"
                  >
                    Dashboard
                  </Button>
                  <Button 
                    onClick={() => navigate("/applications")}
                    className="gradient-primary text-primary-foreground hover:opacity-90"
                  >
                    My Applications
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/login")}
                    className="text-primary hover:text-primary-dark"
                  >
                    Login
                  </Button>
                  <Button 
                    onClick={handleGetStarted}
                    className="gradient-primary text-primary-foreground hover:opacity-90"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20 px-4 text-white">
        <div className="container mx-auto text-center">
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 mb-6 animate-float">
            <span className="text-sm font-semibold">🚀 Quick & Easy Loans</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            Get Your Loan Approved<br />in Just 1 Minute
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-2xl mx-auto">
            Fast, secure, and hassle-free loan application process. Apply now and get instant approval!
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover-lift">
                <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={handleGetStarted}
              className="gradient-accent text-accent-foreground hover:opacity-90 text-lg px-8 py-6"
            >
              Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate("/login")}
              className="bg-white/10 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-6"
            >
              {user ? 'Go to Dashboard' : 'Login'}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose GrowLoan?</h2>
            <p className="text-xl text-muted-foreground">Everything you need for a smooth loan experience</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-card rounded-3xl p-8 hover-lift border border-border"
              >
                <div className="text-primary mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Get your loan in 3 simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: 1, title: "Complete Your Profile", desc: "Fill out our simple 3-step form with your details" },
              { step: 2, title: "Get Loan Offer", desc: "Receive an instant loan offer based on your profile" },
              { step: 3, title: "Quick Approval", desc: "1-minute validation and instant approval process" }
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute top-10 -right-4 w-8 h-8 text-primary" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loan Details */}
      <section className="py-20 px-4 gradient-hero text-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Loan Details & Charges</h2>
            <p className="text-xl text-white/90">Transparent pricing with no hidden fees</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {loanDetails.map((detail, index) => (
              <div 
                key={index} 
                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover-lift ${
                  detail.highlight ? 'bg-white/20 ring-2 ring-accent' : ''
                }`}
              >
                <div className="text-sm text-white/70 uppercase tracking-wide mb-2">{detail.label}</div>
                <div className={`text-3xl font-bold ${detail.highlight ? 'text-accent' : 'text-white'}`}>
                  {detail.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 px-4 bg-muted">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="text-center">
                <div className="text-primary mb-4 flex justify-center">{indicator.icon}</div>
                <h3 className="text-lg font-bold mb-2">{indicator.title}</h3>
                <p className="text-sm text-muted-foreground">{indicator.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 gradient-hero text-white text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Get Your Loan?</h2>
          <p className="text-xl mb-10 text-white/90">
            Join thousands of satisfied customers who trust GrowLoan for their financial needs
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="gradient-accent text-accent-foreground hover:opacity-90 text-xl px-10 py-7"
          >
            Apply Now - It's Free <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 GrowLoan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
