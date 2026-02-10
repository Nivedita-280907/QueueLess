import { Router } from 'express';
import { body } from 'express-validator';
import { getEmergencyStatus, updateEmergencyStatus } from '../controllers/emergencyController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Anyone authenticated can view emergency status
router.get('/', authenticate, getEmergencyStatus);

// Only staff can update emergency status
router.post('/', [
  authenticate,
  authorize('staff', 'admin'),
  body('status').isIn(['normal', 'alert', 'critical', 'Available', 'Limited', 'Full']).withMessage('Status must be normal, alert, or critical'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  validate
], updateEmergencyStatus);

export default router;
