import mongoose from 'mongoose';

const emergencyStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['normal', 'alert', 'critical', 'Available', 'Limited', 'Full'],
    default: 'normal',
    required: true
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true
});

const EmergencyStatus = mongoose.model('EmergencyStatus', emergencyStatusSchema);
export default EmergencyStatus;
