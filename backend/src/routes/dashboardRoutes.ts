import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Admin'));

router.get('/stats', getDashboardStats);

export default router;
