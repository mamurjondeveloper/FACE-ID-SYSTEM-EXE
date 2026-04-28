import React, { useState } from 'react';
import { exportCsv, exportExcel, exportPdf } from '../services/reportService';

export default function ReportsPage() {
  const [filters, setFilters] = useState({ fromDate: '', toDate: '', groupName: '' });
  const [rows, setRows] = useState([]);

  const run = async () => {
    setRows(await window.desktopAPI.attendance.report(filters));
  };

  return (
    <div className="page-grid">
      <section className="glass card">
        <h3>Attendance Reports</h3>
        <div className="row">
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
          <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
          <input placeholder="Group" value={filters.groupName} onChange={(e) => setFilters({ ...filters, groupName: e.target.value })} />
          <button className="btn primary" onClick={run}>Filter</button>
        </div>
        <div className="row">
          <button className="btn" onClick={() => exportCsv(rows)}>Export CSV</button>
          <button className="btn" onClick={() => exportExcel(rows)}>Export Excel</button>
          <button className="btn" onClick={() => exportPdf(rows)}>Export PDF</button>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Time</th><th>Status</th><th>Name</th><th>Group</th><th>Code</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td><td>{r.time}</td><td>{r.status}</td>
                <td>{r.first_name} {r.last_name}</td><td>{r.group_name}</td><td>{r.student_code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
