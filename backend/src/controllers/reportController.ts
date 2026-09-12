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

    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      layout: 'landscape',
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=bitnox_vms_report_${Date.now()}.pdf`
    );

    doc.pipe(res);

    const totalWidth = 782;
    const leftMargin = 30;

    // Header Banner
    doc.roundedRect(leftMargin, 25, totalWidth, 54, 4).fill('#0f172a');
    doc.roundedRect(leftMargin, 25, 6, 54, 2).fill('#00d2ff');

    doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold').text('BITNOXSOLUTION VISITOR MANAGEMENT SYSTEM', 48, 35);
    doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8').text(
      'Official Visitor Registry & Audit Log  •  Technology Institute & Dry Cleaning Service',
      48,
      54
    );

    const filterText = req.query.preset ? `Filter: ${req.query.preset}` : 'Filter: Custom / All';
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(
      `Generated: ${new Date().toLocaleString()}`,
      500,
      36,
      { width: 300, align: 'right' }
    );
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#38bdf8').text(
      `${filterText}  |  Total: ${visitors.length}`,
      500,
      52,
      { width: 300, align: 'right' }
    );

    // Summary Metric Badges
    const completed = visitors.filter((v) => v.status === 'Completed').length;
    const inProgress = visitors.filter((v) => v.status === 'In Progress').length;
    const cancelled = visitors.filter((v) => v.status === 'Cancelled').length;

    const cardW = (totalWidth - 3 * 14) / 4;
    const cardH = 44;
    const cardY = 90;

    const cards = [
      { label: 'TOTAL VISITOR ENTRIES', val: String(visitors.length), bg: '#f8fafc', border: '#cbd5e1', textCol: '#0f172a', lblCol: '#475569' },
      { label: 'COMPLETED VISITS', val: String(completed), bg: '#f0fdf4', border: '#86efac', textCol: '#15803d', lblCol: '#166534' },
      { label: 'CURRENTLY IN-OFFICE', val: String(inProgress), bg: '#fefce8', border: '#fde047', textCol: '#a16207', lblCol: '#854d0e' },
      { label: 'CANCELLED / VOIDED', val: String(cancelled), bg: '#fef2f2', border: '#fca5a5', textCol: '#b91c1c', lblCol: '#991b1b' },
    ];

    cards.forEach((c, i) => {
      const x = leftMargin + i * (cardW + 14);
      doc.roundedRect(x, cardY, cardW, cardH, 4).fillAndStroke(c.bg, c.border);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(c.lblCol).text(c.label, x + 10, cardY + 8);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(c.textCol).text(c.val, x + 10, cardY + 22);
    });

    // Reset coordinates for table
    doc.x = leftMargin;
    doc.y = 148;

    // Table
    const tableData = {
      headers: [
        { label: 'Visitor Name', property: 'name', width: 120 },
        { label: 'Phone Number', property: 'phone', width: 95 },
        { label: 'Department', property: 'dept', width: 95 },
        { label: 'Purpose of Visit', property: 'purpose', width: 120 },
        { label: 'Host / Staff', property: 'staff', width: 115 },
        { label: 'Arrival Time', property: 'arrival', width: 85 },
        { label: 'Checkout Time', property: 'checkout', width: 85 },
        { label: 'Status', property: 'status', width: 67 },
      ],
      datas: visitors.map((v) => {
        const arrTime = new Date(v.arrival_datetime);
        const arrivalStr = `${arrTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${arrTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const checkoutStr = v.checkout_datetime
          ? `${new Date(v.checkout_datetime).toLocaleDateString([], { month: 'short', day: 'numeric' })} ${new Date(v.checkout_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : (v.status === 'In Progress' ? 'Active' : '-');

        return {
          name: v.full_name,
          phone: v.phone_number,
          dept: v.department,
          purpose: v.purpose_of_visit,
          staff: v.staff_to_see?.name || 'Unassigned',
          arrival: arrivalStr,
          checkout: checkoutStr,
          status: v.status,
        };
      }),
    };

    await doc.table(tableData, {
      x: leftMargin,
      width: totalWidth,
      columnsSize: [120, 95, 95, 120, 115, 85, 85, 67],
      divider: {
        header: { disabled: false, width: 1, opacity: 0.8 },
        horizontal: { disabled: false, width: 0.5, opacity: 0.25 },
      },
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a'),
      prepareRow: (row, indexColumn, indexRow, rectRow) => {
        doc.font('Helvetica').fontSize(8).fillColor('#334155');
      },
    });

    // Page Footers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
        `Bitnoxsolution Visitor Management System  •  Confidential Registry Log  •  Page ${i + 1} of ${range.count}`,
        leftMargin,
        570,
        { width: totalWidth, align: 'center' }
      );
    }

    doc.end();
  } catch (error) {
    console.error('exportReportPDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF export.' });
  }
}
