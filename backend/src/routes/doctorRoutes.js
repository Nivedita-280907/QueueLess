import { Router } from 'express';
import { body } from 'express-validator';
import {
  createDoctor,
  getAllDoctors,
  getActiveDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  toggleDoctorSession,
  getMe,
  getPendingDoctors,
  approveDoctorApplication
} from '../controllers/doctorController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public route - get active doctors (for patients)
router.get('/active', authenticate, getActiveDoctors);

// Get doctor profile (for logged in doctor)
router.get('/me', authenticate, authorize('doctor'), getMe);

// Admin: Get pending applications
router.get('/applications', authenticate, authorize('admin'), getPendingDoctors);

// Admin: Approve/Reject application
router.patch('/applications/:id', authenticate, authorize('admin'), approveDoctorApplication);

// Get all doctors (staff + admin)
router.get('/', authenticate, getAllDoctors);

// Get single doctor
router.get('/:id', authenticate, getDoctorById);

// Admin only routes
router.post('/', [
  authenticate,
  authorize('admin'),
  body('name').trim().notEmpty().withMessage('Doctor name is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('avgConsultationTime').optional().isInt({ min: 1 }).withMessage('Consultation time must be a positive number'),
  validate
], createDoctor);

router.put('/:id', [
  authenticate,
  authorize('admin'),
  body('name').optional().trim().notEmpty().withMessage('Doctor name cannot be empty'),
  body('department').optional().trim().notEmpty().withMessage('Department cannot be empty'),
  body('avgConsultationTime').optional().isInt({ min: 1 }).withMessage('Consultation time must be a positive number'),
  validate
], updateDoctor);

router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);

// Staff and Doctor can toggle doctor sessions
router.patch('/:id/toggle-session', authenticate, authorize('staff', 'admin', 'doctor'), toggleDoctorSession);

export default router;
