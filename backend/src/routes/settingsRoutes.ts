import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Admin'));

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
