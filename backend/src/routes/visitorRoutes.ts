import { Router } from 'express';
import {
  checkInVisitor,
  checkOutVisitor,
  cancelVisitor,
  getCurrentlyInOffice,
  getMyVisitors,
  getVisitors,
  getVisitorById,
  updateVisitor,
  getOverstayAlerts,
} from '../controllers/visitorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Live office and alerts: Receptionist and Admin only
router.get('/currently-in-office', requireRole('Receptionist', 'Admin'), getCurrentlyInOffice);
router.get('/overstay-alerts', requireRole('Receptionist', 'Admin'), getOverstayAlerts);

// Scoped personal/staff visitors: Staff (own only) and Admin (full)
router.get('/my-visitors', requireRole('Staff', 'Admin'), getMyVisitors);

// Complete visitor history log across all departments: Receptionist and Admin only
router.get('/', requireRole('Receptionist', 'Admin'), getVisitors);

// Single visitor details: Receptionist and Admin full; Staff strictly limited to own assigned
router.get('/:id', requireRole('Receptionist', 'Admin', 'Staff'), getVisitorById);

// Check-in and visitor editing: Receptionist and Admin only
router.post('/checkin', requireRole('Receptionist', 'Admin'), checkInVisitor);
router.put('/:id', requireRole('Receptionist', 'Admin'), updateVisitor);

// Check-out and cancellation: Receptionist/Admin (all), Staff (own assigned only)
router.post('/:id/checkout', requireRole('Receptionist', 'Admin', 'Staff'), checkOutVisitor);
router.post('/:id/cancel', requireRole('Receptionist', 'Admin', 'Staff'), cancelVisitor);

export default router;
