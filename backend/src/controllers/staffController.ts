import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export async function getStaff(req: Request, res: Response): Promise<void> {
  try {
    const { department } = req.query;
    const where: any = {};
    if (department && department !== 'All') {
      where.department = String(department);
    }

    const staffList = await prisma.staff.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { visitors: true },
        },
      },
    });

    res.json(staffList);
  } catch (error) {
    console.error('getStaff error:', error);
    res.status(500).json({ error: 'Failed to retrieve staff list.' });
  }
}

export async function createStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, department, role_title } = req.body;
    if (!name || !department) {
      res.status(400).json({ error: 'Name and department are required.' });
      return;
    }

    const staff = await prisma.staff.create({
      data: {
        name: name.trim(),
        department,
        role_title: role_title ? role_title.trim() : null,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'create_staff',
      details: { staffId: staff.id, name: staff.name, department: staff.department },
    });

    res.status(201).json(staff);
  } catch (error) {
    console.error('createStaff error:', error);
    res.status(500).json({ error: 'Failed to create staff member.' });
  }
}

export async function updateStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, department, role_title } = req.body;

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        department: department !== undefined ? department : existing.department,
        role_title: role_title !== undefined ? role_title.trim() : existing.role_title,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'update_staff',
      details: { staffId: updated.id, name: updated.name, department: updated.department },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateStaff error:', error);
    res.status(500).json({ error: 'Failed to update staff member.' });
  }
}

export async function deleteStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    await prisma.staff.delete({ where: { id } });

    await logAudit({
      userId: req.user!.id,
      action: 'delete_staff',
      details: { staffId: id, name: existing.name },
    });

    res.json({ message: 'Staff member deleted successfully.' });
  } catch (error) {
    console.error('deleteStaff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member.' });
  }
}
