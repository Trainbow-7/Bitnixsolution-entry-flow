import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'default',
          data_retention_months: 24,
          auto_archive_enabled: false,
          office_name: 'Bitnoxsolution Shared Office',
          tech_institute_name: 'Bitnox Technology Institute',
          dry_cleaning_name: 'Bitnox Premium Dry Cleaning',
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('getSettings error:', error);
    res.status(500).json({ error: 'Failed to retrieve system settings.' });
  }
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      data_retention_months,
      auto_archive_enabled,
      office_name,
      tech_institute_name,
      dry_cleaning_name,
    } = req.body;

    const current = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });

    const updated = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: {
        data_retention_months:
          data_retention_months !== undefined
            ? parseInt(String(data_retention_months), 10)
            : undefined,
        auto_archive_enabled:
          auto_archive_enabled !== undefined ? Boolean(auto_archive_enabled) : undefined,
        office_name: office_name !== undefined ? office_name.trim() : undefined,
        tech_institute_name:
          tech_institute_name !== undefined ? tech_institute_name.trim() : undefined,
        dry_cleaning_name:
          dry_cleaning_name !== undefined ? dry_cleaning_name.trim() : undefined,
      },
      create: {
        id: 'default',
        data_retention_months: parseInt(String(data_retention_months || 24), 10),
        auto_archive_enabled: Boolean(auto_archive_enabled),
        office_name: office_name || 'Bitnoxsolution Shared Office',
        tech_institute_name: tech_institute_name || 'Bitnox Technology Institute',
        dry_cleaning_name: dry_cleaning_name || 'Bitnox Premium Dry Cleaning',
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'update_settings',
      details: {
        before: current,
        after: updated,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateSettings error:', error);
    res.status(500).json({ error: 'Failed to update system settings.' });
  }
}
