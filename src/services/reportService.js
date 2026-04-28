import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportCsv(rows) {
  const headers = ['Date', 'Time', 'Status', 'First Name', 'Last Name', 'Group', 'Student Code'];
  const content = [
    headers.join(','),
    ...rows.map((r) =>
      [r.date, r.time, r.status, r.first_name, r.last_name, r.group_name, r.student_code]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `attendance-${Date.now()}.csv`);
}

export async function exportExcel(rows) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Attendance');
  ws.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Time', key: 'time', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'First Name', key: 'first_name', width: 16 },
    { header: 'Last Name', key: 'last_name', width: 16 },
    { header: 'Group', key: 'group_name', width: 16 },
    { header: 'Student Code', key: 'student_code', width: 18 }
  ];
  rows.forEach((r) => ws.addRow(r));
  const buf = await workbook.xlsx.writeBuffer();
  triggerDownload(new Blob([buf]), `attendance-${Date.now()}.xlsx`);
}

export function exportPdf(rows) {
  const doc = new jsPDF();
  doc.text('SmartAttendance Report', 14, 12);
  autoTable(doc, {
    startY: 18,
    head: [['Date', 'Time', 'Status', 'First Name', 'Last Name', 'Group', 'Student Code']],
    body: rows.map((r) => [r.date, r.time, r.status, r.first_name, r.last_name, r.group_name, r.student_code])
  });
  doc.save(`attendance-${Date.now()}.pdf`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
