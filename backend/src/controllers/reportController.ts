import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

function buildFilterWhere(query: any) {
  const { date_from, date_to, preset, department, purpose_of_visit, status, staff_id } = query;
  const where: any = {};

  if (department && department !== 'All') {
    where.department = String(department);
  }

  if (purpose_of_visit && purpose_of_visit !== 'All') {
    where.purpose_of_visit = String(purpose_of_visit);
  }

  if (status && status !== 'All') {
    where.status = String(status);
  }

  if (staff_id && staff_id !== 'All') {
    where.staff_to_see_id = String(staff_id);
  }

  const now = new Date();
  if (preset === 'Today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    where.arrival_datetime = { gte: startOfDay, lte: endOfDay };
  } else if (preset === 'This Week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    where.arrival_datetime = { gte: monday };
  } else if (preset === 'This Month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    where.arrival_datetime = { gte: firstDay };
  } else if (date_from || date_to) {
    where.arrival_datetime = {};
    if (date_from) where.arrival_datetime.gte = new Date(String(date_from));
    if (date_to) {
      const toDate = new Date(String(date_to));
      toDate.setHours(23, 59, 59, 999);
      where.arrival_datetime.lte = toDate;
    }
  }

  return where;
}

export async function getReportData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const where = buildFilterWhere(req.query);

    const [total, visitors] = await Promise.all([
      prisma.visitor.count({ where }),
      prisma.visitor.findMany({
        where,
        orderBy: { arrival_datetime: 'desc' },
        include: {
          staff_to_see: true,
          created_by_user: { select: { name: true } },
        },
      }),
    ]);

    const completed = visitors.filter((v) => v.status === 'Completed').length;
    const inProgress = visitors.filter((v) => v.status === 'In Progress').length;
    const cancelled = visitors.filter((v) => v.status === 'Cancelled').length;

    const techCount = visitors.filter((v) => v.department === 'Tech Institute').length;
    const dryCleanCount = visitors.filter((v) => v.department === 'Dry Cleaning').length;

    res.json({
      summary: {
        total,
        completed,
        inProgress,
        cancelled,
        techCount,
        dryCleanCount,
      },
      visitors,
    });
  } catch (error) {
    console.error('getReportData error:', error);
    res.status(500).json({ error: 'Failed to generate report preview.' });
  }
}

export async function exportReportExcel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const where = buildFilterWhere(req.query);

    const visitors = await prisma.visitor.findMany({
      where,
      orderBy: { arrival_datetime: 'desc' },
      include: {
        staff_to_see: true,
        created_by_user: { select: { name: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bitnoxsolution VMS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Visitor Records');

    // Title Block
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BITNOXSOLUTION - VISITOR MANAGEMENT REPORT';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Dark slate
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Report Subtitle / Generated info
    worksheet.mergeCells('A2:I2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Generated on: ${new Date().toLocaleString()} | Total Records: ${visitors.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]); // Blank line

    // Header row
    const headers = [
      'Visitor Name',
      'Phone Number',
      'Email',
      'Department',
      'Purpose of Visit',
      'Staff Assigned',
      'Arrival Time',
      'Checkout Time',
      'Status',
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // Indigo brand
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'medium', color: { argb: 'FF312E81' } },
      };
    });

    // Data rows
    visitors.forEach((v, index) => {
      const row = worksheet.addRow([
        v.full_name,
        v.phone_number,
        v.email || 'N/A',
        v.department,
        v.purpose_of_visit,
        v.staff_to_see?.name || 'Unassigned',
        new Date(v.arrival_datetime).toLocaleString(),
        v.checkout_datetime ? new Date(v.checkout_datetime).toLocaleString() : 'Active',
        v.status,
      ]);

      row.height = 22;
      const isEven = index % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle' };
        if (colNumber === 4 || colNumber === 9) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    // Auto-fit column widths
    worksheet.columns = [
      { width: 24 }, // Name
      { width: 18 }, // Phone
      { width: 26 }, // Email
      { width: 18 }, // Dept
      { width: 24 }, // Purpose
      { width: 22 }, // Staff
      { width: 22 }, // Arrival
      { width: 22 }, // Checkout
      { width: 14 }, // Status
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=bitnox_vms_report_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('exportReportExcel error:', error);
    res.status(500).json({ error: 'Failed to generate Excel export.' });
  }
}

export async function exportReportPDF(req: AuthRequest, res: Response): Promise<void> {
  try {
    const where = buildFilterWhere(req.query);

    const visitors = await prisma.visitor.findMany({
      where,
      orderBy: { arrival_datetime: 'desc' },
      include: {
        staff_to_see: true,
      },
    });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=bitnox_vms_report_${Date.now()}.pdf`
    );

    doc.pipe(res);

    // Header Banner
    doc.rect(30, 30, 535, 55).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(18).text('BITNOXSOLUTION VISITOR MANAGEMENT', 45, 42);
    doc.fontSize(9).fillColor('#94a3b8').text('Shared Office: Technology Training Institute & Dry Cleaning Service', 45, 64);

    // Report Summary
    doc.moveDown(2);
    doc.fillColor('#0f172a').fontSize(12).text('Visitor Records Summary Report', 35, 100);
    doc.fontSize(9).fillColor('#475569').text(
      `Generated on: ${new Date().toLocaleString()} | Filter: ${req.query.preset || 'Custom'} | Records: ${visitors.length}`,
      35,
      116
    );

    // Summary Metric Badges
    const completed = visitors.filter((v) => v.status === 'Completed').length;
    const inProgress = visitors.filter((v) => v.status === 'In Progress').length;
    const cancelled = visitors.filter((v) => v.status === 'Cancelled').length;

    doc.rect(35, 135, 110, 35).fill('#f1f5f9');
    doc.fillColor('#334155').fontSize(8).text('TOTAL VISITS', 45, 142);
    doc.fontSize(14).fillColor('#0f172a').text(String(visitors.length), 45, 153);

    doc.rect(155, 135, 110, 35).fill('#f0fdf4');
    doc.fillColor('#15803d').fontSize(8).text('COMPLETED', 165, 142);
    doc.fontSize(14).fillColor('#166534').text(String(completed), 165, 153);

    doc.rect(275, 135, 110, 35).fill('#fef3c7');
    doc.fillColor('#b45309').fontSize(8).text('IN PROGRESS', 285, 142);
    doc.fontSize(14).fillColor('#92400e').text(String(inProgress), 285, 153);

    doc.rect(395, 135, 110, 35).fill('#fee2e2');
    doc.fillColor('#b91c1c').fontSize(8).text('CANCELLED', 405, 142);
    doc.fontSize(14).fillColor('#991b1b').text(String(cancelled), 405, 153);

    doc.y = 185;

    // Table
    const tableData = {
      title: '',
      headers: [
        { label: 'Name', property: 'name', width: 90 },
        { label: 'Phone', property: 'phone', width: 75 },
        { label: 'Department', property: 'dept', width: 75 },
        { label: 'Purpose', property: 'purpose', width: 95 },
        { label: 'Staff Assigned', property: 'staff', width: 85 },
        { label: 'Arrival', property: 'arrival', width: 60 },
        { label: 'Status', property: 'status', width: 55 },
      ],
      datas: visitors.slice(0, 100).map((v) => {
        const arrTime = new Date(v.arrival_datetime);
        const timeStr = `${arrTime.toLocaleDateString([], { month: 'numeric', day: 'numeric' })} ${arrTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return {
          name: v.full_name,
          phone: v.phone_number,
          dept: v.department === 'Tech Institute' ? 'Tech Inst.' : 'Dry Clean',
          purpose: v.purpose_of_visit,
          staff: v.staff_to_see?.name || '-',
          arrival: timeStr,
          status: v.status,
        };
      }),
    };

    await doc.table(tableData, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b'),
      prepareRow: (row, indexColumn, indexRow, rectRow) => doc.font('Helvetica').fontSize(8).fillColor('#334155'),
    });

    doc.end();
  } catch (error) {
    console.error('exportReportPDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF export.' });
  }
}
