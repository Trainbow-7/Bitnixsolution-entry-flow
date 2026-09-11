import { Router } from 'express';
import {
  getReportData,
  exportReportExcel,
  exportReportPDF,
} from '../controllers/reportController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Admin'));

router.get('/data', getReportData);
router.get('/export/excel', exportReportExcel);
router.get('/export/pdf', exportReportPDF);

export default router;
