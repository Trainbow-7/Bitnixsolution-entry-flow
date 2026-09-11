import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Admin'));

router.get('/', getAuditLogs);

export default router;
