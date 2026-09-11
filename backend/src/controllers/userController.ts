import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        linked_staff_id: true,
        linked_staff: {
          select: { id: true, name: true, department: true, role_title: true },
        },
        created_at: true,
        updated_at: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Failed to retrieve system users.' });
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role, linked_staff_id } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'Name, email, password, and role are required.' });
      return;
    }

    if (!['Receptionist', 'Staff', 'Admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be Receptionist, Staff, or Admin.' });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(409).json({ error: 'A user with this email address already exists.' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        role,
        linked_staff_id: role === 'Staff' ? linked_staff_id || null : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        linked_staff_id: true,
        linked_staff: true,
        created_at: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'create_user',
      details: { userId: newUser.id, email: newUser.email, role: newUser.role },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ error: 'Failed to create user account.' });
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, email, password, role, linked_staff_id } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (email) {
      const emailLower = email.toLowerCase().trim();
      if (emailLower !== existing.email) {
        const conflict = await prisma.user.findUnique({ where: { email: emailLower } });
        if (conflict) {
          res.status(409).json({ error: 'This email is already in use.' });
          return;
        }
        data.email = emailLower;
      }
    }
    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }
    if (role) {
      if (!['Receptionist', 'Staff', 'Admin'].includes(role)) {
        res.status(400).json({ error: 'Invalid role.' });
        return;
      }
      data.role = role;
      data.linked_staff_id = role === 'Staff' ? linked_staff_id || null : null;
    } else if (linked_staff_id !== undefined) {
      data.linked_staff_id = linked_staff_id || null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        linked_staff_id: true,
        linked_staff: true,
        updated_at: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'update_user',
      details: { userId: updated.id, email: updated.email, role: updated.role },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({ error: 'Failed to update user account.' });
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    if (req.user?.id === id) {
      res.status(400).json({ error: 'You cannot delete your own active account.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      userId: req.user!.id,
      action: 'delete_user',
      details: { userId: id, email: existing.email },
    });

    res.json({ message: 'User account deleted successfully.' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
}
