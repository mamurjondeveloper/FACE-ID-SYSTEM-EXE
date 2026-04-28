import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/students', label: 'Students' },
  { to: '/live', label: 'Live Camera' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' }
];

export default function Layout({ children, onLogout }) {
  return (
    <div className="app-shell">
      <aside className="sidebar glass">
        <h1>SmartAttendance</h1>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="btn danger" onClick={onLogout}>Logout</button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
