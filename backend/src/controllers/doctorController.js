import Doctor from '../models/Doctor.js';
import QueueEntry from '../models/QueueEntry.js';
import QueueLog from '../models/QueueLog.js';
import User from '../models/User.js';

export const createDoctor = async (req, res) => {
  try {
    const { name, department, avgConsultationTime } = req.body;

    // Generate email for doctor login
    const emailSlug = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const email = `dr.${emailSlug}@hospital.com`;
    const password = 'doctor123'; // Default password

    // Check if user already exists
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password,
        role: 'doctor'
      });
    }

    const doctor = await Doctor.create({
      name,
      department,
      avgConsultationTime: avgConsultationTime || 15,
      userId: user._id
    });

    await QueueLog.create({
      action: 'DOCTOR_CREATED',
      details: { doctorId: doctor._id, name: doctor.name, department: doctor.department },
      actor: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: { 
        doctor,
        credentials: { email, password }
      }
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create doctor'
    });
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ department: 1, name: 1 });
    
    // Get waiting counts for each active doctor
    const doctorsWithCounts = await Promise.all(
      doctors.map(async (doctor) => {
        const waitingCount = await QueueEntry.countDocuments({
          doctorId: doctor._id,
          status: 'waiting'
        });
        return {
          ...doctor.toObject(),
          waitingCount
        };
      })
    );

    res.json({
      success: true,
      data: { doctors: doctorsWithCounts }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors'
    });
  }
};

export const getActiveDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true }).sort({ department: 1, name: 1 });
    
    const doctorsWithCounts = await Promise.all(
      doctors.map(async (doctor) => {
        const waitingCount = await QueueEntry.countDocuments({
          doctorId: doctor._id,
          status: 'waiting'
        });
        return {
          ...doctor.toObject(),
          waitingCount
        };
      })
    );

    res.json({
      success: true,
      data: { doctors: doctorsWithCounts }
    });
  } catch (error) {
    console.error('Get active doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active doctors'
    });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const waitingCount = await QueueEntry.countDocuments({
      doctorId: doctor._id,
      status: 'waiting'
    });

    res.json({
      success: true,
      data: { 
        doctor: { ...doctor.toObject(), waitingCount } 
      }
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor'
    });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { name, department, avgConsultationTime } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { name, department, avgConsultationTime },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    await QueueLog.create({
      action: 'DOCTOR_UPDATED',
      details: { doctorId: doctor._id, name: doctor.name },
      actor: req.user._id
    });

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: { doctor }
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update doctor'
    });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check for active queue entries
    const activeEntries = await QueueEntry.countDocuments({
      doctorId: doctor._id,
      status: { $in: ['waiting', 'serving'] }
    });

    if (activeEntries > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete doctor with active queue entries. Clear the queue first.'
      });
    }

    // Ideally, also delete the linked user account, but let's keep it simple for now
    if (doctor.userId) {
       await User.findByIdAndDelete(doctor.userId);
    }

    await Doctor.findByIdAndDelete(req.params.id);

    await QueueLog.create({
      action: 'DOCTOR_DELETED',
      details: { doctorId: doctor._id, name: doctor.name },
      actor: req.user._id
    });

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete doctor'
    });
  }
};

export const toggleDoctorSession = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.isActive = !doctor.isActive;
    await doctor.save();

    const action = doctor.isActive ? 'DOCTOR_SESSION_START' : 'DOCTOR_SESSION_STOP';
    await QueueLog.create({
      action,
      details: { doctorId: doctor._id, name: doctor.name },
      actor: req.user._id
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('doctorSessionUpdated', {
        doctorId: doctor._id,
        isActive: doctor.isActive,
        doctorName: doctor.name
      });
    }

    res.json({
      success: true,
      message: `Doctor session ${doctor.isActive ? 'started' : 'stopped'}`,
      data: { doctor }
    });
  } catch (error) {
    console.error('Toggle session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle doctor session'
    });
  }
};

export const getMe = async (req, res) => {
  try {
    console.log('Debug getMe - User:', req.user?._id);
    const doctor = await Doctor.findOne({ userId: req.user._id });
    console.log('Debug getMe - Doctor:', doctor);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found for this user'
      });
    }

    res.json({
      success: true,
      data: { doctor }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor profile'
    });
  }
};

export const getPendingDoctors = async (req, res) => {
  try {
    const { status } = req.query;
    // If asking for pending approvals
    if (status === 'pending') {
       // Find doctors whose associated user has status 'pending'
       // We can populate user and filter
       const doctors = await Doctor.find().populate('userId', 'email status name role');
       const pendingDoctors = doctors.filter(doc => doc.userId && doc.userId.status === 'pending');
       
       return res.json({
          success: true, 
          data: { doctors: pendingDoctors } 
       });
    }
    
    // Default behavior might fall back to other logic or error
    return res.status(400).json({ success: false, message: 'Invalid status query' });

  } catch (error) {
    console.error('Get pending doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals'
    });
  }
};

export const approveDoctorApplication = async (req, res) => {
  try {
    const { id } = req.params; // Doctor ID
    const { action } = req.body; // 'approve' or 'reject'

    const doctor = await Doctor.findById(id);
    if (!doctor) {
       return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (!doctor.userId) {
       return res.status(400).json({ success: false, message: 'Doctor not linked to user' });
    }

    const newStatus = action === 'approve' ? 'active' : 'rejected';
    
    await User.findByIdAndUpdate(doctor.userId, { status: newStatus });

    if (newStatus === 'rejected') {
       // Maybe delete doctor profile if rejected? or keep it
       // Let's keep it for record but inactive
    }

    res.json({
      success: true,
      message: `Doctor application ${newStatus}`
    });

  } catch (error) {
    console.error('Approve doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process application'
    });
  }
};
