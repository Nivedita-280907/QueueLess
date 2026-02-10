import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  avgConsultationTime: {
    type: Number,
    default: 15,
    min: [1, 'Average consultation time must be at least 1 minute']
  },
  consultationTimes: {
    type: [Number],
    default: []
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

doctorSchema.methods.updateAvgConsultationTime = function(duration) {
  this.consultationTimes.push(duration);
  // Keep last 20 consultation times for moving average
  if (this.consultationTimes.length > 20) {
    this.consultationTimes = this.consultationTimes.slice(-20);
  }
  const sum = this.consultationTimes.reduce((a, b) => a + b, 0);
  this.avgConsultationTime = Math.round(sum / this.consultationTimes.length);
  return this.avgConsultationTime;
};

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
