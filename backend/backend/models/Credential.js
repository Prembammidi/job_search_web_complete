const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Credential schema for storing encrypted user credentials for job portals
 */
const CredentialSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  portal: {
    type: String,
    required: true,
    enum: ['linkedin', 'indeed', 'glassdoor', 'workday', 'greenhouse', 'lever', 'other']
  },
  credentials: {
    type: Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can only have one credential entry per portal
CredentialSchema.index({ user: 1, portal: 1 }, { unique: true });

module.exports = mongoose.model('Credential', CredentialSchema);
