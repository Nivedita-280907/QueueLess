import QueueEntry from '../models/QueueEntry.js';
import Doctor from '../models/Doctor.js';
import QueueLog from '../models/QueueLog.js';

// Helper: Calculate ETA range for a position in queue
const calculateETARange = (position, avgTime) => {
  if (position <= 0) return { min: 0, max: 0 };
  const baseETA = position * avgTime;
  const variance = Math.max(Math.round(avgTime * 0.3), 2);
  return {
    min: Math.max(0, baseETA - variance),
    max: baseETA + variance
  };
};

// Helper: Get full queue state for a doctor and emit socket event
const emitQueueUpdate = async (io, doctorId) => {
  const queue = await QueueEntry.find({
    doctorId,
    status: { $in: ['waiting', 'serving'] }
  })
    .populate('patientId', 'name email')
    .sort({ joinedAt: 1 });

  const doctor = await Doctor.findById(doctorId);
  const avgTime = doctor ? doctor.avgConsultationTime : 15;

  let waitingPosition = 0;
  const queueWithETA = queue.map((entry) => {
    if (entry.status === 'waiting') {
      waitingPosition++;
      const eta = calculateETARange(waitingPosition, avgTime);
      return { ...entry.toObject(), position: waitingPosition, eta };
    }
    return { ...entry.toObject(), position: 0, eta: { min: 0, max: 0 } };
  });

  io.emit('queueUpdated', {
    doctorId,
    queue: queueWithETA,
    totalWaiting: waitingPosition
  });
};

export const joinQueue = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user._id;

    // Check doctor exists and is active
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    if (!doctor.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not currently available. OPD session has not started.'
      });
    }

    // Check for duplicate entry
    const existingEntry = await QueueEntry.findOne({
      patientId,
      status: { $in: ['waiting', 'serving'] }
    });
    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'You are already in a queue. Please cancel your current entry first.'
      });
    }

    // Get next queue number for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastEntry = await QueueEntry.findOne({
      doctorId,
      joinedAt: { $gte: today }
    }).sort({ queueNumber: -1 });

    const queueNumber = lastEntry ? lastEntry.queueNumber + 1 : 1;

    const entry = await QueueEntry.create({
      patientId,
      doctorId,
      queueNumber,
      status: 'waiting',
      joinedAt: new Date()
    });

    await entry.populate('patientId', 'name email');

    await QueueLog.create({
      action: 'QUEUE_JOIN',
      details: {
        entryId: entry._id,
        doctorId,
        doctorName: doctor.name,
        queueNumber
      },
      actor: patientId
    });

    // Get position
    const waitingCount = await QueueEntry.countDocuments({
      doctorId,
      status: 'waiting',
      joinedAt: { $lte: entry.joinedAt }
    });

    const eta = calculateETARange(waitingCount, doctor.avgConsultationTime);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      await emitQueueUpdate(io, doctorId);
    }

    res.status(201).json({
      success: true,
      message: 'Successfully joined the queue',
      data: {
        entry: {
          ...entry.toObject(),
          position: waitingCount,
          eta
        }
      }
    });
  } catch (error) {
    console.error('Join queue error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already in this queue.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to join queue'
    });
  }
};

export const cancelQueue = async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await QueueEntry.findById(entryId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    // Patients can only cancel their own entries
    if (req.user.role === 'patient' && entry.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own queue entry'
      });
    }

    if (!['waiting', 'serving'].includes(entry.status)) {
      return res.status(400).json({
        success: false,
        message: 'This queue entry cannot be cancelled'
      });
    }

    entry.status = 'cancelled';
    await entry.save();

    await QueueLog.create({
      action: 'QUEUE_CANCEL',
      details: { entryId: entry._id, doctorId: entry.doctorId },
      actor: req.user._id
    });

    const io = req.app.get('io');
    if (io) {
      await emitQueueUpdate(io, entry.doctorId);
    }

    res.json({
      success: true,
      message: 'Queue entry cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel queue entry'
    });
  }
};

export const servePatient = async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await QueueEntry.findById(entryId).populate('patientId', 'name email');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    if (entry.status !== 'serving') {
      return res.status(400).json({
        success: false,
        message: 'Patient must be in serving status first. Call the patient first.'
      });
    }

    // Calculate consultation duration
    const servingStartTime = entry.servedAt || entry.joinedAt;
    const duration = Math.round((Date.now() - servingStartTime.getTime()) / 60000);

    entry.status = 'served';
    entry.completedAt = new Date();
    await entry.save();

    // Update doctor's average consultation time
    if (duration > 0 && duration < 120) {
      const doctor = await Doctor.findById(entry.doctorId);
      if (doctor) {
        doctor.updateAvgConsultationTime(duration);
        await doctor.save();
      }
    }

    await QueueLog.create({
      action: 'PATIENT_SERVED',
      details: { 
        entryId: entry._id, 
        doctorId: entry.doctorId,
        consultationDuration: duration 
      },
      actor: req.user._id
    });

    const io = req.app.get('io');
    if (io) {
      await emitQueueUpdate(io, entry.doctorId);
    }

    res.json({
      success: true,
      message: 'Patient marked as served',
      data: { entry }
    });
  } catch (error) {
    console.error('Serve patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve patient'
    });
  }
};

export const callNextPatient = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Check if someone is already being served
    const currentlyServing = await QueueEntry.findOne({
      doctorId,
      status: 'serving'
    });
    if (currentlyServing) {
      return res.status(400).json({
        success: false,
        message: 'A patient is currently being served. Please complete or skip them first.'
      });
    }

    // Get next waiting patient (FIFO)
    const nextEntry = await QueueEntry.findOne({
      doctorId,
      status: 'waiting'
    })
      .sort({ joinedAt: 1 })
      .populate('patientId', 'name email');

    if (!nextEntry) {
      return res.status(404).json({
        success: false,
        message: 'No patients waiting in queue'
      });
    }

    nextEntry.status = 'serving';
    nextEntry.servedAt = new Date();
    await nextEntry.save();

    await QueueLog.create({
      action: 'PATIENT_SERVING',
      details: { entryId: nextEntry._id, doctorId },
      actor: req.user._id
    });

    const io = req.app.get('io');
    if (io) {
      await emitQueueUpdate(io, doctorId);
      // Notify the patient specifically
      io.emit('patientCalled', {
        patientId: nextEntry.patientId._id,
        doctorId,
        message: 'It is your turn! Please proceed to the doctor.'
      });
    }

    res.json({
      success: true,
      message: `Called patient: ${nextEntry.patientId.name}`,
      data: { entry: nextEntry }
    });
  } catch (error) {
    console.error('Call next patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to call next patient'
    });
  }
};

export const skipPatient = async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await QueueEntry.findById(entryId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    if (!['waiting', 'serving'].includes(entry.status)) {
      return res.status(400).json({
        success: false,
        message: 'This patient cannot be skipped'
      });
    }

    entry.status = 'skipped';
    await entry.save();

    await QueueLog.create({
      action: 'PATIENT_SKIPPED',
      details: { entryId: entry._id, doctorId: entry.doctorId },
      actor: req.user._id
    });

    const io = req.app.get('io');
    if (io) {
      await emitQueueUpdate(io, entry.doctorId);
    }

    res.json({
      success: true,
      message: 'Patient skipped',
      data: { entry }
    });
  } catch (error) {
    console.error('Skip patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip patient'
    });
  }
};

export const getQueueByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const queue = await QueueEntry.find({
      doctorId,
      status: { $in: ['waiting', 'serving'] }
    })
      .populate('patientId', 'name email')
      .sort({ joinedAt: 1 });

    const avgTime = doctor.avgConsultationTime;
    let waitingPosition = 0;

    const queueWithETA = queue.map((entry) => {
      if (entry.status === 'waiting') {
        waitingPosition++;
        const eta = calculateETARange(waitingPosition, avgTime);
        return { ...entry.toObject(), position: waitingPosition, eta };
      }
      return { ...entry.toObject(), position: 0, eta: { min: 0, max: 0 } };
    });

    res.json({
      success: true,
      data: {
        doctor: {
          _id: doctor._id,
          name: doctor.name,
          department: doctor.department,
          isActive: doctor.isActive,
          avgConsultationTime: doctor.avgConsultationTime
        },
        queue: queueWithETA,
        totalWaiting: waitingPosition
      }
    });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue'
    });
  }
};

export const getMyQueueStatus = async (req, res) => {
  try {
    const patientId = req.user._id;

    const entry = await QueueEntry.findOne({
      patientId,
      status: { $in: ['waiting', 'serving'] }
    }).populate('doctorId', 'name department avgConsultationTime isActive');

    if (!entry) {
      return res.json({
        success: true,
        data: { entry: null, message: 'You are not currently in any queue' }
      });
    }

    // Calculate position
    let position = 0;
    if (entry.status === 'waiting') {
      position = await QueueEntry.countDocuments({
        doctorId: entry.doctorId._id,
        status: 'waiting',
        joinedAt: { $lte: entry.joinedAt }
      });
    }

    const eta = entry.status === 'waiting' 
      ? calculateETARange(position, entry.doctorId.avgConsultationTime)
      : { min: 0, max: 0 };

    res.json({
      success: true,
      data: {
        entry: {
          ...entry.toObject(),
          position,
          eta
        }
      }
    });
  } catch (error) {
    console.error('Get my queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue status'
    });
  }
};

export const getTodayStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalServed, totalWaiting, totalSkipped, totalCancelled] = await Promise.all([
      QueueEntry.countDocuments({ status: 'served', joinedAt: { $gte: today } }),
      QueueEntry.countDocuments({ status: 'waiting', joinedAt: { $gte: today } }),
      QueueEntry.countDocuments({ status: 'skipped', joinedAt: { $gte: today } }),
      QueueEntry.countDocuments({ status: 'cancelled', joinedAt: { $gte: today } })
    ]);

    // Get per-doctor stats
    const doctors = await Doctor.find();
    const doctorStats = await Promise.all(
      doctors.map(async (doctor) => {
        const [served, waiting, skipped] = await Promise.all([
          QueueEntry.countDocuments({ doctorId: doctor._id, status: 'served', joinedAt: { $gte: today } }),
          QueueEntry.countDocuments({ doctorId: doctor._id, status: 'waiting' }),
          QueueEntry.countDocuments({ doctorId: doctor._id, status: 'skipped', joinedAt: { $gte: today } })
        ]);
        return {
          doctor: { _id: doctor._id, name: doctor.name, department: doctor.department, isActive: doctor.isActive },
          served,
          waiting,
          skipped,
          avgConsultationTime: doctor.avgConsultationTime
        };
      })
    );

    // Recent logs
    const recentLogs = await QueueLog.find({ timestamp: { $gte: today } })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('actor', 'name role');

    res.json({
      success: true,
      data: {
        summary: { totalServed, totalWaiting, totalSkipped, totalCancelled },
        doctorStats,
        recentLogs
      }
    });
  } catch (error) {
    console.error('Get today stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};
