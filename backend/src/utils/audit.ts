import { prisma } from '../prisma.js';

export async function logAudit({
  userId,
  action,
  targetVisitorId,
  details,
}: {
  userId: string;
  action: string;
  targetVisitorId?: string | null;
  details?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        target_visitor_id: targetVisitorId || null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
