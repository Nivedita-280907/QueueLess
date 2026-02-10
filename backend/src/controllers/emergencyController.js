import EmergencyStatus from '../models/EmergencyStatus.js';
import QueueLog from '../models/QueueLog.js';

export const getEmergencyStatus = async (req, res) => {
  try {
    let status = await EmergencyStatus.findOne()
      .sort({ lastUpdatedAt: -1 })
      .populate('updatedBy', 'name role');

    if (!status) {
      // Return default status if none exists
      return res.json({
        success: true,
        data: {
          status: {
            status: 'normal',
            lastUpdatedAt: new Date(),
            updatedBy: null,
            notes: 'No updates yet',
            _informational: 'This status is informational only. For emergencies, please contact the emergency department directly.'
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        status: {
          ...status.toObject(),
          _informational: 'This status is informational only. For emergencies, please contact the emergency department directly.'
        }
      }
    });
  } catch (error) {
    console.error('Get emergency status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency status'
    });
  }
};

export const updateEmergencyStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['normal', 'alert', 'critical', 'Available', 'Limited', 'Full'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be normal, alert, or critical.'
      });
    }

    const emergencyStatus = await EmergencyStatus.create({
      status,
      notes: notes || '',
      lastUpdatedAt: new Date(),
      updatedBy: req.user._id
    });

    await emergencyStatus.populate('updatedBy', 'name role');

    await QueueLog.create({
      action: 'EMERGENCY_STATUS_UPDATE',
      details: { status, notes },
      actor: req.user._id
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('emergencyStatusUpdated', {
        status: emergencyStatus.status,
        lastUpdatedAt: emergencyStatus.lastUpdatedAt,
        updatedBy: emergencyStatus.updatedBy,
        notes: emergencyStatus.notes,
        _informational: 'This status is informational only.'
      });
    }

    res.json({
      success: true,
      message: 'Emergency status updated',
      data: { status: emergencyStatus }
    });
  } catch (error) {
    console.error('Update emergency status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency status'
    });
  }
};
