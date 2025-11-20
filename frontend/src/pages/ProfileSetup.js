import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { CheckCircle, Circle } from 'lucide-react';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, updateProfile, fetchUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(10000); // Default amount
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    employmentType: user?.employmentType || '',
    companyName: user?.companyName || '',
    aadharNumber: user?.aadharNumber || '',
    panNumber: user?.panNumber || '',
    bankAccountNumber: user?.bankAccountNumber || '',
    ifscCode: user?.ifscCode || '',
    additionalDetails: user?.additionalDetails || ''
  });

  const steps = [
    { number: 1, title: "Personal Info" },
    { number: 2, title: "Address & Employment" },
    { number: 3, title: "Documents & Loan Amount" }
  ];


  const handleAmountChange = (e) => {
    const amount = parseInt(e.target.value);
    setSelectedAmount(amount);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.name || !formData.email || !formData.dateOfBirth) {
        toast.error('Please fill all required fields');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.address || !formData.city || !formData.state || !formData.pincode || !formData.employmentType) {
        toast.error('Please fill all required fields');
        return false;
      }
      if (formData.employmentType !== 'unemployed' && !formData.companyName) {
        toast.error('Please enter company name');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!formData.aadharNumber || !formData.panNumber) {
      toast.error('Aadhar and PAN details are required');
      return;
    }

    if (!selectedAmount || selectedAmount < 10000) {
      toast.error('Please select a valid loan amount (minimum ₹10,000)');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null
      };

      await updateProfile(profileData);
      await fetchUser();

      const loanResponse = await axios.post('/loans/apply', {
        requestedAmount: selectedAmount
      });

      const loan = loanResponse.data.loan;
      toast.success('Profile completed! Validating your documents...');

      // Start validation immediately
      try {
        await axios.post(`/loans/${loan.id}/validate`);
        // Navigate to home with validation state
        navigate('/home', { state: { validating: true, loanId: loan.id } });
      } catch (error) {
        console.error('Auto-validation error:', error);
        navigate('/home');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Complete Your Profile</h1>
          <p className="text-muted-foreground text-lg">Help us understand you better to offer the best loan</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep >= step.number 
                      ? 'gradient-primary border-transparent text-white' 
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="font-bold">{step.number}</span>
                    )}
                  </div>
                  <span className={`text-sm mt-2 font-medium ${
                    currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-4 transition-all ${
                    currentStep > step.number ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-3xl p-8 shadow-lg border border-border">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mobile Number</label>
                <Input
                  value={formData.phone}
                  disabled
                  className="h-12 rounded-xl bg-muted"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="your@email.com"
                  className="h-12 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth *</label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  className="h-12 rounded-xl"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* Step 2: Address & Employment */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Address & Employment Details</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Address *</label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter your complete address"
                  className="rounded-xl min-h-[100px]"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">City *</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="City"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">State *</label>
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="State"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Pincode *</label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit pincode"
                  className="h-12 rounded-xl"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Employment Type *</label>
                <Select 
                  value={formData.employmentType} 
                  onChange={(e) => updateField("employmentType", e.target.value)}
                  className="h-12 rounded-xl"
                >
                  <option value="">Select employment type</option>
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="business">Business</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              {formData.employmentType && formData.employmentType !== 'unemployed' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name *</label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    placeholder="Enter company name"
                    className="h-12 rounded-xl"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Documents & Loan Offer */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Document Details</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Aadhar Card Number *</label>
                  <Input
                    value={formData.aadharNumber}
                    onChange={(e) => updateField("aadharNumber", e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="12-digit Aadhar number"
                    className="h-12 rounded-xl"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">PAN Card Number *</label>
                  <Input
                    value={formData.panNumber}
                    onChange={(e) => updateField("panNumber", e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="10-character PAN"
                    className="h-12 rounded-xl uppercase"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Bank Account Number</label>
                  <Input
                    value={formData.bankAccountNumber}
                    onChange={(e) => updateField("bankAccountNumber", e.target.value)}
                    placeholder="Optional"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">IFSC Code</label>
                  <Input
                    value={formData.ifscCode}
                    onChange={(e) => updateField("ifscCode", e.target.value.toUpperCase())}
                    placeholder="Optional"
                    className="h-12 rounded-xl uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Additional Details</label>
                <Textarea
                  value={formData.additionalDetails}
                  onChange={(e) => updateField("additionalDetails", e.target.value)}
                  placeholder="Any additional information (optional)"
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              {/* Loan Amount Selection with Slider */}
              <div className="mt-8 p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border-2 border-primary/20">
                <h3 className="text-2xl font-bold mb-6 text-center">Select Loan Amount</h3>
                
                <div className="space-y-6">
                  {/* Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-muted-foreground">Amount</span>
                      <span className="text-2xl font-bold text-primary">₹{selectedAmount.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="10000"
                      max="500000"
                      step="1000"
                      value={selectedAmount}
                      onChange={handleAmountChange}
                      className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((selectedAmount - 10000) / (500000 - 10000)) * 100}%, hsl(var(--muted)) ${((selectedAmount - 10000) / (500000 - 10000)) * 100}%, hsl(var(--muted)) 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>₹10,000</span>
                      <span>₹5,00,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="rounded-xl px-8"
              >
                Previous
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                className="gradient-primary text-primary-foreground rounded-xl px-8 ml-auto"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="gradient-primary text-primary-foreground rounded-xl px-8 ml-auto"
                disabled={loading || !selectedAmount || selectedAmount < 10000}
              >
                {loading ? 'Submitting...' : 'Submit & Apply for Loan'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
