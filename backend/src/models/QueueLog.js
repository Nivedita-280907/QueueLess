import mongoose from 'mongoose';

const queueLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'QUEUE_JOIN',
      'QUEUE_CANCEL', 
      'PATIENT_SERVED',
      'PATIENT_SKIPPED',
      'PATIENT_SERVING',
      'DOCTOR_SESSION_START',
      'DOCTOR_SESSION_STOP',
      'EMERGENCY_STATUS_UPDATE',
      'DOCTOR_CREATED',
      'DOCTOR_UPDATED',
      'DOCTOR_DELETED'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

queueLogSchema.index({ timestamp: -1 });
queueLogSchema.index({ action: 1, timestamp: -1 });

const QueueLog = mongoose.model('QueueLog', queueLogSchema);
export default QueueLog;
