const mongoose = require('mongoose');

const callbackRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  preferredTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  },
  preferredDate: {
    type: Date
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Generate request ID before saving
callbackRequestSchema.pre('save', async function(next) {
  if (!this.requestId) {
    const count = await mongoose.model('CallbackRequest').countDocuments();
    const startNumber = 1000;
    const nextNumber = startNumber + count + 1;
    this.requestId = `CBR${String(nextNumber).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CallbackRequest', callbackRequestSchema);

