import { Router } from 'express';
import { body } from 'express-validator';
import {
  joinQueue,
  cancelQueue,
  servePatient,
  callNextPatient,
  skipPatient,
  getQueueByDoctor,
  getMyQueueStatus,
  getTodayStats
} from '../controllers/queueController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Patient routes
router.post('/join', [
  authenticate,
  authorize('patient'),
  body('doctorId').notEmpty().withMessage('Doctor ID is required').isMongoId().withMessage('Invalid doctor ID'),
  validate
], joinQueue);

router.patch('/cancel/:entryId', authenticate, cancelQueue);

router.get('/my-status', authenticate, authorize('patient'), getMyQueueStatus);

// Staff & Doctor routes
router.get('/doctor/:doctorId', authenticate, getQueueByDoctor);

router.patch('/serve/:entryId', authenticate, authorize('staff', 'admin', 'doctor'), servePatient);

router.patch('/call-next/:doctorId', authenticate, authorize('staff', 'admin', 'doctor'), callNextPatient);

router.patch('/skip/:entryId', authenticate, authorize('staff', 'admin', 'doctor'), skipPatient);

// Analytics
router.get('/stats/today', authenticate, authorize('admin', 'staff', 'doctor'), getTodayStats);

export default router;
