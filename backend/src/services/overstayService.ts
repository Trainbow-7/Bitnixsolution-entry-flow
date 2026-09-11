import { prisma } from '../prisma.js';
import { broadcastOverstayAlert } from '../controllers/checkinSessionController.js';

/**
 * Maps expected_duration to maximum threshold minutes before triggering an overstay alert.
 * Returns null if expected_duration is unspecified (no alert).
 */
export function getDurationThresholdMinutes(expectedDuration?: string | null): number | null {
  if (!expectedDuration) return null;
  switch (expectedDuration.trim()) {
    case '<15 min':
      return 15;
    case '15-30 min':
      return 30;
    case '30-60 min':
      return 60;
    case '1hr+':
      return 60; // Baseline threshold as per specification
    default:
      return null;
  }
}

/**
 * Periodically checks all 'In Progress' visitors who haven't yet been alerted for overstay.
 * Flags them in the database and broadcasts real-time SSE alerts to dashboard and terminals.
 */
export async function checkOverstayVisitors(): Promise<number> {
  try {
    const activeVisitors = await prisma.visitor.findMany({
      where: {
        status: 'In Progress',
        overstay_alerted: false,
        expected_duration: { not: null },
      },
      include: {
        staff_to_see: true,
        created_by_user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (activeVisitors.length === 0) {
      return 0;
    }

    const now = Date.now();
    let newlyAlertedCount = 0;

    for (const visitor of activeVisitors) {
      const thresholdMinutes = getDurationThresholdMinutes(visitor.expected_duration);
      if (thresholdMinutes === null) continue;

      const arrivalTime = new Date(visitor.arrival_datetime).getTime();
      const elapsedMinutes = Math.max(1, Math.floor((now - arrivalTime) / (60 * 1000)));

      if (elapsedMinutes >= thresholdMinutes) {
        // Mark as alerted in the database so each visitor is only alerted once
        const alertTimestamp = new Date();
        const updated = await prisma.visitor.update({
          where: { id: visitor.id },
          data: {
            overstay_alerted: true,
            overstay_alerted_at: alertTimestamp,
          },
          include: {
            staff_to_see: true,
            created_by_user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Broadcast real-time SSE alert to all connected dashboard and terminal clients
        broadcastOverstayAlert({
          visitor: {
            id: updated.id,
            full_name: updated.full_name,
            phone_number: updated.phone_number,
            department: updated.department,
            purpose_of_visit: updated.purpose_of_visit,
            staff_to_see: updated.staff_to_see?.name || null,
            staff_to_see_id: updated.staff_to_see_id,
            arrival_datetime: updated.arrival_datetime,
            expected_duration: updated.expected_duration,
            status: updated.status,
            check_in_method: updated.check_in_method,
            overstay_alerted: updated.overstay_alerted,
            overstay_alerted_at: updated.overstay_alerted_at,
          },
          elapsed_minutes: elapsedMinutes,
          threshold_minutes: thresholdMinutes,
          overdue_minutes: elapsedMinutes - thresholdMinutes,
          alerted_at: alertTimestamp,
        });

        newlyAlertedCount++;
        console.log(
          `[Overstay Service] Alert triggered for "${updated.full_name}" (${updated.department}) - Elapsed: ${elapsedMinutes}m, Limit: ${thresholdMinutes}m`
        );
      }
    }

    return newlyAlertedCount;
  } catch (error) {
    console.error('[Overstay Service] Error running overstay checks:', error);
    return 0;
  }
}

/**
 * Returns currently active (In Progress) visitors who are overstayed.
 * Used for initial frontend dashboard synchronization on load/refresh.
 */
export async function getActiveOverstayedVisitors() {
  const active = await prisma.visitor.findMany({
    where: {
      status: 'In Progress',
    },
    include: {
      staff_to_see: true,
      created_by_user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { arrival_datetime: 'asc' },
  });

  const now = Date.now();
  const overstayedList: any[] = [];

  for (const visitor of active) {
    const thresholdMinutes = getDurationThresholdMinutes(visitor.expected_duration);
    if (thresholdMinutes === null) continue;

    const arrivalTime = new Date(visitor.arrival_datetime).getTime();
    const elapsedMinutes = Math.max(1, Math.floor((now - arrivalTime) / (60 * 1000)));

    if (elapsedMinutes >= thresholdMinutes || visitor.overstay_alerted) {
      overstayedList.push({
        visitor: {
          id: visitor.id,
          full_name: visitor.full_name,
          phone_number: visitor.phone_number,
          department: visitor.department,
          purpose_of_visit: visitor.purpose_of_visit,
          staff_to_see: visitor.staff_to_see?.name || null,
          staff_to_see_id: visitor.staff_to_see_id,
          arrival_datetime: visitor.arrival_datetime,
          expected_duration: visitor.expected_duration,
          status: visitor.status,
          check_in_method: visitor.check_in_method,
          overstay_alerted: visitor.overstay_alerted,
          overstay_alerted_at: visitor.overstay_alerted_at,
        },
        elapsed_minutes: elapsedMinutes,
        threshold_minutes: thresholdMinutes,
        overdue_minutes: Math.max(0, elapsedMinutes - thresholdMinutes),
        alerted_at: visitor.overstay_alerted_at || new Date(),
      });
    }
  }

  return overstayedList;
}

let cronTimer: NodeJS.Timeout | null = null;

/**
 * Initializes background periodic overstay checking
 */
export function initOverstayCron(intervalMs: number = 30000): void {
  if (cronTimer) {
    clearInterval(cronTimer);
  }

  console.log(`[Overstay Service] Initialized background checker (interval: ${intervalMs / 1000}s)`);

  // Run initial check after 2 seconds
  setTimeout(() => {
    checkOverstayVisitors().catch((err) => console.error('[Overstay Service] Initial run error:', err));
  }, 2000);

  // Periodic recurring check
  cronTimer = setInterval(() => {
    checkOverstayVisitors().catch((err) => console.error('[Overstay Service] Periodic run error:', err));
  }, intervalMs);
}
