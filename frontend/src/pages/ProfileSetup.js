import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { CheckCircle, Circle, ArrowLeft, Upload, X, FileImage } from 'lucide-react';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, updateProfile, fetchUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(10000); // Default amount
  const [uploading, setUploading] = useState({ aadhar: false, pan: false, selfie: false });
  const [documents, setDocuments] = useState({
    aadharCard: user?.aadharCardUrl || null,
    panCard: user?.panCardUrl || null,
    selfie: user?.selfieUrl || null
  });
  const aadharInputRef = useRef(null);
  const panInputRef = useRef(null);
  const selfieInputRef = useRef(null);
  
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
    panNumber: user?.panNumber || ''
  });

  const steps = [
    { number: 1, title: "Info" },
    { number: 2, title: "Address" },
    { number: 3, title: "Documents" },
    { number: 4, title: "Loan Amount" }
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
        toast.dismiss(); // Dismiss any existing toasts
        toast.error('Please fill all required fields');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.address || !formData.city || !formData.state || !formData.pincode || !formData.employmentType) {
        toast.dismiss(); // Dismiss any existing toasts
        toast.error('Please fill all required fields');
        return false;
      }
      if (formData.employmentType !== 'unemployed' && !formData.companyName) {
        toast.dismiss(); // Dismiss any existing toasts
        toast.error('Please enter company name');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.aadharNumber || !formData.panNumber) {
        toast.dismiss(); // Dismiss any existing toasts
        toast.error('Please enter Aadhar and PAN numbers');
        return false;
      }
      if (!documents.aadharCard || !documents.panCard || !documents.selfie) {
        toast.dismiss(); // Dismiss any existing toasts
        toast.error('Please upload all required documents (Aadhar, PAN, and Selfie)');
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

  const handleFileUpload = async (file, documentType) => {
    if (!file) return;

    // Dismiss any existing toasts to prevent duplicates
    toast.dismiss();

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size should be less than 50MB');
      return;
    }

    setUploading(prev => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }

      const response = await axios.post('/users/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 60000 // 60 seconds timeout for larger files
      });

      if (response.data && response.data.success) {
        const url = response.data.url;
        setDocuments(prev => ({ ...prev, [documentType]: url }));
        toast.dismiss(); // Dismiss any previous toasts
        toast.success(`${documentType === 'aadharCard' ? 'Aadhar' : documentType === 'panCard' ? 'PAN' : 'Selfie'} uploaded successfully!`);
      } else {
        throw new Error('Upload failed: Invalid response');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.dismiss(); // Dismiss any previous toasts
      
      // Handle specific error cases
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Upload timeout. Please try again with a smaller file or check your connection.');
      } else if (error.response) {
        // Server responded with error
        const errorMessage = error.response.data?.message || 'Failed to upload document';
        // Check if error message contains file size info
        if (errorMessage.toLowerCase().includes('file size') || errorMessage.toLowerCase().includes('too large')) {
          toast.error('File size too large. Maximum size is 50MB.');
        } else {
          toast.error(errorMessage);
        }
      } else if (error.request) {
        // Request made but no response
        toast.error('Network error. Please check your connection and try again.');
      } else {
        // Something else happened
        toast.error(error.message || 'Failed to upload document');
      }
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleFileChange = (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file, documentType);
    }
  };

  const removeDocument = (documentType) => {
    setDocuments(prev => ({ ...prev, [documentType]: null }));
    // Reset input
    if (documentType === 'aadharCard' && aadharInputRef.current) {
      aadharInputRef.current.value = '';
    } else if (documentType === 'panCard' && panInputRef.current) {
      panInputRef.current.value = '';
    } else if (documentType === 'selfie' && selfieInputRef.current) {
      selfieInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedAmount || selectedAmount < 10000) {
      toast.dismiss(); // Dismiss any existing toasts
      toast.error('Please select a valid loan amount (minimum ₹10,000)');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
        aadharCardUrl: documents.aadharCard,
        panCardUrl: documents.panCard,
        selfieUrl: documents.selfie
      };

      await updateProfile(profileData);
      await fetchUser();

      const loanResponse = await axios.post('/loans/apply', {
        requestedAmount: selectedAmount
      });

      const loan = loanResponse.data.loan;
      toast.dismiss(); // Dismiss any existing toasts
      toast.success('Profile completed! Validating your documents...');

      // Check loan status before trying to validate
      // If loan is already validating or approved, just navigate
      if (loan.status === 'validating' || loan.status === 'approved') {
        navigate('/home', { state: { validating: true, loanId: loan.id } });
      } else if (loan.status === 'pending') {
        // Only start validation if loan is pending
        try {
          await axios.post(`/loans/${loan.id}/validate`, {}, {
            skipErrorToast: true // Don't show error if validation fails
          });
          // Navigate to home with validation state
          navigate('/home', { state: { validating: true, loanId: loan.id } });
        } catch (error) {
          // If validation fails, just navigate without validation state
          // User can manually start validation from home page
          console.warn('Auto-validation failed (optional):', error.response?.data?.message || error.message);
          navigate('/home', { state: { loanId: loan.id } });
        }
      } else {
        // For any other status, just navigate
        navigate('/home', { state: { loanId: loan.id } });
      }
    } catch (error) {
      toast.dismiss(); // Dismiss any existing toasts
      toast.error(error.response?.data?.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with Back Arrow */}
      <div className="bg-[#14b8a6] py-4 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg md:text-xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Complete Your Profile
              </h1>
              <p className="text-white/90 text-xs md:text-sm mt-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Help us understand you better to offer the best loan
              </p>
            </div>
            <div className="w-9 md:w-10 flex-shrink-0" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4 pb-6">

        {/* Step Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep === step.number
                      ? 'bg-[#14b8a6] border-[#14b8a6] text-white shadow-md' 
                      : currentStep > step.number
                      ? 'bg-[#14b8a6] border-[#14b8a6] text-white'
                      : 'border-gray-300 bg-white text-gray-600'
                  }`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {currentStep > step.number ? (
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    ) : (
                      <span className={`font-bold text-sm md:text-base ${
                        currentStep === step.number ? 'text-white' : 'text-gray-600'
                      }`}>{step.number}</span>
                    )}
                  </div>
                  <span className={`text-xs md:text-sm mt-2 font-medium text-center ${
                    currentStep === step.number 
                      ? 'text-[#14b8a6] font-semibold' 
                      : currentStep > step.number
                      ? 'text-[#14b8a6]'
                      : 'text-gray-500'
                  }`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 md:mx-4 transition-all ${
                    currentStep > step.number ? 'bg-[#14b8a6]' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-lg border border-gray-200">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Personal Information
              </h2>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Full Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12 rounded-xl border-gray-300 focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Mobile Number
                </label>
                <Input
                  value={formData.phone}
                  disabled
                  className="h-12 rounded-xl bg-gray-50 border-gray-300"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="your@email.com"
                  className="h-12 rounded-xl border-gray-300 focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  className="h-12 rounded-xl border-gray-300 focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* Step 2: Address & Employment */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Address Details
              </h2>
              
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

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Document Details
              </h2>
              
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

              {/* Document Upload Section */}
              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-semibold">Upload Documents *</h3>
                
                {/* Aadhar Card Upload */}
                <div className="border-2 border-dashed border-[#14b8a6]/30 rounded-xl p-6 bg-[#14b8a6]/5">
                  <label className="block text-sm font-medium mb-3">Aadhar Card *</label>
                  {documents.aadharCard ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex items-center gap-3 p-3 bg-white rounded-lg border border-[#14b8a6]/20">
                        {documents.aadharCard && (documents.aadharCard.startsWith('http') || documents.aadharCard.startsWith('/')) ? (
                          <img 
                            src={documents.aadharCard.startsWith('/') 
                              ? `${process.env.NODE_ENV === 'production' ? window.location.origin : 'http://217.15.166.124:5000'}${documents.aadharCard}` 
                              : documents.aadharCard} 
                            alt="Aadhar Card" 
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="flex items-center gap-2 flex-1">
                          <FileImage className="w-5 h-5 text-[#14b8a6]" />
                          <span className="text-sm text-gray-700 flex-1 truncate">Aadhar Card uploaded</span>
                        </div>
                        <button
                          onClick={() => removeDocument('aadharCard')}
                          className="p-1 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={aadharInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'aadharCard')}
                        className="hidden"
                        id="aadhar-upload"
                      />
                      <label
                        htmlFor="aadhar-upload"
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#14b8a6] rounded-lg cursor-pointer hover:bg-[#14b8a6]/10 transition-colors"
                      >
                        {uploading.aadharCard ? (
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <span className="text-sm text-[#14b8a6]">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-[#14b8a6] mb-2" />
                            <span className="text-sm font-medium text-[#14b8a6]">Click to upload Aadhar Card</span>
                            <span className="text-xs text-gray-500 mt-1">JPEG, PNG, or WebP (Max 50MB)</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* PAN Card Upload */}
                <div className="border-2 border-dashed border-[#14b8a6]/30 rounded-xl p-6 bg-[#14b8a6]/5">
                  <label className="block text-sm font-medium mb-3">PAN Card *</label>
                  {documents.panCard ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex items-center gap-3 p-3 bg-white rounded-lg border border-[#14b8a6]/20">
                        {documents.panCard && (documents.panCard.startsWith('http') || documents.panCard.startsWith('/')) ? (
                          <img 
                            src={documents.panCard.startsWith('/') 
                              ? `${process.env.NODE_ENV === 'production' ? window.location.origin : 'http://217.15.166.124:5000'}${documents.panCard}` 
                              : documents.panCard} 
                            alt="PAN Card" 
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="flex items-center gap-2 flex-1">
                          <FileImage className="w-5 h-5 text-[#14b8a6]" />
                          <span className="text-sm text-gray-700 flex-1 truncate">PAN Card uploaded</span>
                        </div>
                        <button
                          onClick={() => removeDocument('panCard')}
                          className="p-1 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={panInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'panCard')}
                        className="hidden"
                        id="pan-upload"
                      />
                      <label
                        htmlFor="pan-upload"
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#14b8a6] rounded-lg cursor-pointer hover:bg-[#14b8a6]/10 transition-colors"
                      >
                        {uploading.panCard ? (
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <span className="text-sm text-[#14b8a6]">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-[#14b8a6] mb-2" />
                            <span className="text-sm font-medium text-[#14b8a6]">Click to upload PAN Card</span>
                            <span className="text-xs text-gray-500 mt-1">JPEG, PNG, or WebP (Max 50MB)</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* Selfie Upload */}
                <div className="border-2 border-dashed border-[#14b8a6]/30 rounded-xl p-6 bg-[#14b8a6]/5">
                  <label className="block text-sm font-medium mb-3">Selfie *</label>
                  {documents.selfie ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex items-center gap-3 p-3 bg-white rounded-lg border border-[#14b8a6]/20">
                        {documents.selfie && (documents.selfie.startsWith('http') || documents.selfie.startsWith('/')) ? (
                          <img 
                            src={documents.selfie.startsWith('/') 
                              ? `${process.env.NODE_ENV === 'production' ? window.location.origin : 'http://217.15.166.124:5000'}${documents.selfie}` 
                              : documents.selfie} 
                            alt="Selfie" 
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="flex items-center gap-2 flex-1">
                          <FileImage className="w-5 h-5 text-[#14b8a6]" />
                          <span className="text-sm text-gray-700 flex-1 truncate">Selfie uploaded</span>
                        </div>
                        <button
                          onClick={() => removeDocument('selfie')}
                          className="p-1 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={selfieInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={(e) => handleFileChange(e, 'selfie')}
                        className="hidden"
                        id="selfie-upload"
                      />
                      <label
                        htmlFor="selfie-upload"
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#14b8a6] rounded-lg cursor-pointer hover:bg-[#14b8a6]/10 transition-colors"
                      >
                        {uploading.selfie ? (
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <span className="text-sm text-[#14b8a6]">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-[#14b8a6] mb-2" />
                            <span className="text-sm font-medium text-[#14b8a6]">Click to upload Selfie</span>
                            <span className="text-xs text-gray-500 mt-1">JPEG, PNG, or WebP (Max 50MB)</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Loan Amount Selection */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Select Loan Amount
              </h2>
              
              {/* Loan Amount Selection with Slider */}
              <div className="p-8 bg-gradient-to-br from-[#14b8a6]/10 to-[#0d9488]/5 rounded-3xl border-2 border-[#14b8a6]/20">
                <div className="space-y-6">
                  {/* Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-600">Amount</span>
                      <span className="text-2xl font-bold text-[#14b8a6]">₹{selectedAmount.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="10000"
                      max="500000"
                      step="1000"
                      value={selectedAmount}
                      onChange={handleAmountChange}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${((selectedAmount - 10000) / (500000 - 10000)) * 100}%, #e5e7eb ${((selectedAmount - 10000) / (500000 - 10000)) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>₹10,000</span>
                      <span>₹5,00,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="rounded-xl px-6 md:px-8 border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Previous
              </Button>
            ) : (
              <div></div>
            )}
            
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl px-6 md:px-8 ml-auto font-semibold"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl px-6 md:px-8 ml-auto font-semibold"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
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
