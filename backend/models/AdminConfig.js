const mongoose = require('mongoose');

const adminConfigSchema = new mongoose.Schema({
  depositAmount: {
    type: Number,
    default: 149
  },
  fileCharge: {
    type: Number,
    default: 99 // File processing charge
  },
  platformFee: {
    type: Number,
    default: 50 // Platform service fee
  },
  tax: {
    type: Number,
    default: 0 // Tax/GST amount
  },
  processingDays: {
    type: Number,
    default: 15
  },
  upiId: {
    type: String,
    default: '7211132000@ybl'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdminConfig', adminConfigSchema);
