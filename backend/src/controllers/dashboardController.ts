import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. KPI Counts
    const [today_total, currently_in_office, today_completed, today_cancelled] = await Promise.all([
      prisma.visitor.count({
        where: { arrival_datetime: { gte: startOfToday, lte: endOfToday } },
      }),
      prisma.visitor.count({
        where: { status: 'In Progress' },
      }),
      prisma.visitor.count({
        where: {
          status: 'Completed',
          arrival_datetime: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.visitor.count({
        where: {
          status: 'Cancelled',
          arrival_datetime: { gte: startOfToday, lte: endOfToday },
        },
      }),
    ]);

    // 2. Visits per day (Last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const recentVisitors = await prisma.visitor.findMany({
      where: { arrival_datetime: { gte: thirtyDaysAgo } },
      select: { arrival_datetime: true, department: true, purpose_of_visit: true },
    });

    const dayMap = new Map<string, { date: string; count: number; tech_institute: number; dry_cleaning: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const key = d.toISOString().split('T')[0];
      dayMap.set(key, { date: key, count: 0, tech_institute: 0, dry_cleaning: 0 });
    }

    recentVisitors.forEach((v) => {
      const key = new Date(v.arrival_datetime).toISOString().split('T')[0];
      if (dayMap.has(key)) {
        const entry = dayMap.get(key)!;
        entry.count++;
        if (v.department === 'Tech Institute') entry.tech_institute++;
        if (v.department === 'Dry Cleaning') entry.dry_cleaning++;
      }
    });

    const visits_per_day = Array.from(dayMap.values());

    // 3. Breakdown by purpose of visit
    const purposeCounts: Record<string, number> = {};
    recentVisitors.forEach((v) => {
      purposeCounts[v.purpose_of_visit] = (purposeCounts[v.purpose_of_visit] || 0) + 1;
    });
    const by_purpose = Object.entries(purposeCounts).map(([purpose, count]) => ({
      purpose,
      count,
    }));

    // 4. Breakdown by department
    const deptCounts: Record<string, number> = {};
    recentVisitors.forEach((v) => {
      deptCounts[v.department] = (deptCounts[v.department] || 0) + 1;
    });
    const by_department = Object.entries(deptCounts).map(([department, count]) => ({
      department,
      count,
    }));

    // 5. Peak visiting hours (8:00 to 19:00)
    const hourMap: Record<number, number> = {};
    for (let h = 8; h <= 19; h++) hourMap[h] = 0;

    recentVisitors.forEach((v) => {
      const h = new Date(v.arrival_datetime).getHours();
      if (h >= 8 && h <= 19) {
        hourMap[h] = (hourMap[h] || 0) + 1;
      }
    });

    const peak_hours = Object.entries(hourMap).map(([hourStr, count]) => {
      const h = parseInt(hourStr, 10);
      const label = `${h === 12 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      return { hour: h, label, count };
    });

    // 6. Staff workload (Past 30 days)
    const staffList = await prisma.staff.findMany({
      include: {
        visitors: {
          where: { arrival_datetime: { gte: thirtyDaysAgo } },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const staff_workload = staffList
      .map((s) => ({
        staff_id: s.id,
        staff_name: s.name,
        department: s.department,
        role_title: s.role_title,
        count: s.visitors.length,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      today_total,
      currently_in_office,
      today_completed,
      today_cancelled,
      visits_per_day,
      by_purpose,
      by_department,
      peak_hours,
      staff_workload,
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard analytics.' });
  }
}
