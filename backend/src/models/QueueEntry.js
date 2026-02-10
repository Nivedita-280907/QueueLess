import mongoose from 'mongoose';

const queueEntrySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient ID is required']
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor ID is required']
  },
  status: {
    type: String,
    enum: ['waiting', 'serving', 'served', 'skipped', 'cancelled'],
    default: 'waiting'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  servedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  queueNumber: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate active queue entries
queueEntrySchema.index(
  { patientId: 1, doctorId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'waiting' }
  }
);

queueEntrySchema.index({ doctorId: 1, status: 1, joinedAt: 1 });

const QueueEntry = mongoose.model('QueueEntry', queueEntrySchema);
export default QueueEntry;
