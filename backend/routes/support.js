const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');
const CallbackRequest = require('../models/CallbackRequest');
const User = require('../models/User');

// @route   POST /api/support/ticket
// @desc    Create a support ticket
// @access  Private
router.post('/ticket', auth, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required').isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, subject, message, category } = req.body;

    const ticket = new SupportTicket({
      user: req.user._id,
      name,
      email,
      phone: phone || req.user.phone || '',
      subject,
      message,
      category: category || 'general'
    });

    await ticket.save();

    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error while creating ticket' });
  }
});

// @route   GET /api/support/tickets
// @desc    Get user's support tickets
// @access  Private
router.get('/tickets', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error while fetching tickets' });
  }
});

// @route   GET /api/support/ticket/:ticketId
// @desc    Get a specific support ticket
// @access  Private
router.get('/ticket/:ticketId', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      ticketId: req.params.ticketId,
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error while fetching ticket' });
  }
});

// @route   POST /api/support/callback
// @desc    Request a callback
// @access  Private
router.post('/callback', auth, [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('preferredTime').optional().isIn(['morning', 'afternoon', 'evening', 'anytime']).withMessage('Invalid preferred time')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, preferredTime, preferredDate, reason } = req.body;

    const callbackRequest = new CallbackRequest({
      user: req.user._id,
      name,
      phone,
      email: email || req.user.email || '',
      preferredTime: preferredTime || 'anytime',
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      reason: reason || ''
    });

    await callbackRequest.save();

    res.json({
      success: true,
      message: 'Callback request submitted successfully. We will contact you soon.',
      request: {
        id: callbackRequest._id,
        requestId: callbackRequest.requestId,
        status: callbackRequest.status,
        createdAt: callbackRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Create callback request error:', error);
    res.status(500).json({ message: 'Server error while creating callback request' });
  }
});

// @route   GET /api/support/callbacks
// @desc    Get user's callback requests
// @access  Private
router.get('/callbacks', auth, async (req, res) => {
  try {
    const callbacks = await CallbackRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      callbacks
    });
  } catch (error) {
    console.error('Get callbacks error:', error);
    res.status(500).json({ message: 'Server error while fetching callback requests' });
  }
});

module.exports = router;

