import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { ArrowLeft, Mail, Phone, MapPin, MessageSquare, HelpCircle, Clock, Send, Ticket, PhoneCall, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Loader } from '../components/ui/Loader';

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' or 'callback'
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const [ticketForm, setTicketForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: '',
    message: '',
    category: 'general'
  });

  const [callbackForm, setCallbackForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    preferredTime: 'anytime',
    preferredDate: '',
    reason: ''
  });

  useEffect(() => {
    if (user) {
      setTicketForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
      setCallbackForm(prev => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      }));
    }
    fetchTickets();
    fetchCallbacks();
  }, [user]);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get('/support/tickets');
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchCallbacks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get('/support/callbacks');
      setCallbacks(response.data.callbacks || []);
    } catch (error) {
      console.error('Error fetching callbacks:', error);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    
    if (!ticketForm.name || !ticketForm.email || !ticketForm.subject || !ticketForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (ticketForm.message.length < 10) {
      toast.error('Message must be at least 10 characters');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to create a ticket');
        navigate('/login');
        return;
      }

      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post('/support/ticket', ticketForm);
      
      toast.success(`Ticket created successfully! Ticket ID: ${response.data.ticket.ticketId}`);
      setTicketForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        subject: '',
        message: '',
        category: 'general'
      });
      await fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!callbackForm.name || !callbackForm.phone) {
      toast.error('Please fill in name and phone number');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to request a callback');
        navigate('/login');
        return;
      }

      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post('/support/callback', callbackForm);
      
      toast.success(`Callback request submitted! Request ID: ${response.data.request.requestId}`);
      setCallbackForm({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        preferredTime: 'anytime',
        preferredDate: '',
        reason: ''
      });
      await fetchCallbacks();
    } catch (error) {
      console.error('Error creating callback request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit callback request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'in_progress':
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'resolved':
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'closed':
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#14b8a6] py-4 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Contact & Support
              </h1>
              <p className="text-white/90 text-xs md:text-sm mt-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                We're here to help you 24/7
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 md:py-6">
        {/* Tabs */}
        <div className="bg-white rounded-2xl p-1 mb-4 md:mb-6 shadow-lg border border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('ticket')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'ticket'
                  ? 'bg-[#14b8a6] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              <div className="flex items-center justify-center gap-2">
                <Ticket className="w-4 h-4" />
                <span>Create Ticket</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('callback')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'callback'
                  ? 'bg-[#14b8a6] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              <div className="flex items-center justify-center gap-2">
                <PhoneCall className="w-4 h-4" />
                <span>Request Callback</span>
              </div>
            </button>
          </div>
        </div>

        {/* Ticket Form */}
        {activeTab === 'ticket' && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Create Support Ticket
            </h2>
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Name *
                  </label>
                  <Input
                    name="name"
                    type="text"
                    value={ticketForm.name}
                    onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                    placeholder="Your full name"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Email *
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={ticketForm.email}
                    onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                    placeholder="your.email@example.com"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Phone Number
                </label>
                <Input
                  name="phone"
                  type="tel"
                  value={ticketForm.phone}
                  onChange={(e) => setTicketForm({ ...ticketForm, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Category
                </label>
                <Select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  className="h-12 rounded-xl"
                >
                  <option value="general">General Inquiry</option>
                  <option value="loan_inquiry">Loan Inquiry</option>
                  <option value="payment_issue">Payment Issue</option>
                  <option value="technical_support">Technical Support</option>
                  <option value="account_issue">Account Issue</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Subject *
                </label>
                <Input
                  name="subject"
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="What is this regarding?"
                  required
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Message *
                </label>
                <Textarea
                  name="message"
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  placeholder="Tell us how we can help you... (minimum 10 characters)"
                  rows={6}
                  required
                  className="rounded-xl"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-12 text-base font-semibold"
                disabled={loading}
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create Ticket
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Callback Form */}
        {activeTab === 'callback' && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Request a Callback
            </h2>
            <form onSubmit={handleCallbackSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Name *
                  </label>
                  <Input
                    name="name"
                    type="text"
                    value={callbackForm.name}
                    onChange={(e) => setCallbackForm({ ...callbackForm, name: e.target.value })}
                    placeholder="Your full name"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Phone Number *
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={callbackForm.phone}
                    onChange={(e) => setCallbackForm({ ...callbackForm, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Email
                </label>
                <Input
                  name="email"
                  type="email"
                  value={callbackForm.email}
                  onChange={(e) => setCallbackForm({ ...callbackForm, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Preferred Time
                  </label>
                  <Select
                    value={callbackForm.preferredTime}
                    onChange={(e) => setCallbackForm({ ...callbackForm, preferredTime: e.target.value })}
                    className="h-12 rounded-xl"
                  >
                    <option value="anytime">Anytime</option>
                    <option value="morning">Morning (9 AM - 12 PM)</option>
                    <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                    <option value="evening">Evening (5 PM - 8 PM)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Preferred Date (Optional)
                  </label>
                  <Input
                    name="preferredDate"
                    type="date"
                    value={callbackForm.preferredDate}
                    onChange={(e) => setCallbackForm({ ...callbackForm, preferredDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Reason for Callback (Optional)
                </label>
                <Textarea
                  name="reason"
                  value={callbackForm.reason}
                  onChange={(e) => setCallbackForm({ ...callbackForm, reason: e.target.value })}
                  placeholder="Briefly describe why you need a callback..."
                  rows={4}
                  className="rounded-xl"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-12 text-base font-semibold"
                disabled={loading}
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Request Callback
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* My Tickets */}
        {tickets.length > 0 && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              My Support Tickets
            </h2>
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Ticket ID: {ticket.ticketId}
                      </div>
                      <div className="font-bold text-base text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        {ticket.subject}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {ticket.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {ticket.message.substring(0, 100)}...
                  </div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Created: {formatDate(ticket.createdAt)}
                  </div>
                  {ticket.adminResponse && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-semibold text-[#14b8a6] mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Admin Response:
                      </div>
                      <div className="text-sm text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        {ticket.adminResponse}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Callback Requests */}
        {callbacks.length > 0 && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              My Callback Requests
            </h2>
            <div className="space-y-3">
              {callbacks.map((callback) => (
                <div key={callback._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Request ID: {callback.requestId}
                      </div>
                      <div className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        {callback.phone} - {callback.preferredTime}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(callback.status)}`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {callback.status.toUpperCase()}
                    </div>
                  </div>
                  {callback.reason && (
                    <div className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {callback.reason}
                    </div>
                  )}
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Requested: {formatDate(callback.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Contact Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#14b8a6] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Office Address
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Vaishnavi Tech Park, South Tower, 3rd Floor,<br />
                  Sarjapur Main Road, Bellandur,<br />
                  Bengaluru - 560103, Karnataka, India
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#14b8a6] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Phone
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  <a href="tel:+919108800605" className="text-[#14b8a6] hover:underline font-semibold">+91 9108800605</a><br />
                  <span className="text-xs text-gray-500">Mon-Sat, 9 AM - 6 PM IST</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#14b8a6] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Email
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  <a href="mailto:support@growloan.com" className="text-[#14b8a6] hover:underline">support@growloan.com</a>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#14b8a6] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Business Hours
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Monday - Friday: 9:00 AM - 6:00 PM<br />
                  Saturday: 10:00 AM - 4:00 PM<br />
                  Sunday: Closed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
