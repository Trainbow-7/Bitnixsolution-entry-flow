import { Router } from 'express';
import {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/staffController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('Receptionist', 'Admin'), getStaff);
router.post('/', requireRole('Admin'), createStaff);
router.put('/:id', requireRole('Admin'), updateStaff);
router.delete('/:id', requireRole('Admin'), deleteStaff);

export default router;
