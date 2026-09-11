import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
