import React, { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0, absentToday: 0, lateToday: 0 });
  const [todayRows, setTodayRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      setStats(await window.desktopAPI.attendance.stats());
      setTodayRows(await window.desktopAPI.attendance.today());
    };
    load();
  }, []);

  return (
    <div className="page-grid">
      <div className="cards">
        <Card title="Total Students" value={stats.totalStudents} />
        <Card title="Present Today" value={stats.presentToday} />
        <Card title="Absent Today" value={stats.absentToday} />
        <Card title="Late Today" value={stats.lateToday} />
      </div>
      <section className="glass card">
        <h3>Today Attendance</h3>
        <Table rows={todayRows} />
      </section>
      <section className="glass card">
        <h3>Recent Activity</h3>
        <Table rows={todayRows.slice(0, 10)} />
      </section>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="glass card metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Table({ rows }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Group</th><th>Status</th><th>Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.student_code}-${r.time}`}>
            <td>{r.first_name} {r.last_name}</td>
            <td>{r.group_name}</td>
            <td>{r.status}</td>
            <td>{r.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
