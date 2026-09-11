import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { action, userId, search, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (action && action !== 'All') {
      where.action = String(action);
    }
    if (userId && userId !== 'All') {
      where.user_id = String(userId);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { action: { contains: q } },
        { details: { contains: q } },
        { user: { name: { contains: q } } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const take = Math.min(200, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * take;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
          target_visitor: {
            select: { id: true, full_name: true, department: true },
          },
        },
      }),
    ]);

    res.json({
      logs: logs.map((l) => ({
        ...l,
        details: l.details ? JSON.parse(l.details) : null,
      })),
      total,
      page: pageNum,
      limit: take,
      total_pages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit log entries.' });
  }
}
