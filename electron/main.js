const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

let mainWindow;
let db;

const isDev = !app.isPackaged;
const useLocalDist = process.env.SMARTATTENDANCE_LOCAL === '1';
const dataDir = path.join(app.getPath('userData'), 'data');
const dbPath = path.join(dataDir, 'smartattendance.db');

function encodeDescriptor(descriptor) {
  return Buffer.from(JSON.stringify(Array.from(descriptor)), 'utf8').toString('base64');
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function validateStudent(payload, forUpdate = false) {
  const required = ['first_name', 'last_name', 'group_name', 'student_code'];
  for (const key of required) {
    if (!payload[key] || String(payload[key]).trim().length < 2) {
      throw new Error(`Invalid ${key}`);
    }
  }
  if (!forUpdate && (!Array.isArray(payload.descriptor) || payload.descriptor.length !== 128)) {
    throw new Error('Invalid face descriptor');
  }
}

async function seedDefaults() {
  const admin = await db.get('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (!admin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', passwordHash]);
  }

  const defaults = {
    school_name: 'SmartAttendance',
    threshold: '0.5',
    camera_id: ''
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.run(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}

async function initDb() {
  ensureDataDir();
  db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      group_name TEXT NOT NULL,
      student_code TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      descriptor TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id),
      UNIQUE(student_id, date)
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );
  `);
  await seedDefaults();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev && !useLocalDist) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

ipcMain.handle('auth:login', async (_, payload) => {
  const { username, password } = payload;
  if (!username || !password) return { ok: false, message: 'Missing credentials' };
  const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin) return { ok: false, message: 'Invalid credentials' };

  const isMatch = await bcrypt.compare(password, admin.password_hash);
  if (!isMatch) return { ok: false, message: 'Invalid credentials' };
  return { ok: true, admin: { id: admin.id, username: admin.username } };
});

ipcMain.handle('students:list', async () => db.all('SELECT * FROM students ORDER BY created_at DESC'));

ipcMain.handle('students:create', async (_, payload) => {
  validateStudent(payload);
  const stmt = `
    INSERT INTO students
      (first_name, last_name, group_name, student_code, phone, notes, descriptor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await db.run(stmt, [
    payload.first_name,
    payload.last_name,
    payload.group_name,
    payload.student_code,
    payload.phone || '',
    payload.notes || '',
    encodeDescriptor(payload.descriptor)
  ]);
  return { ok: true };
});

ipcMain.handle('students:update', async (_, payload) => {
  validateStudent(payload, true);
  const stmt = `
    UPDATE students SET
      first_name = ?, last_name = ?, group_name = ?, student_code = ?, phone = ?, notes = ?
    WHERE id = ?
  `;
  await db.run(stmt, [
    payload.first_name,
    payload.last_name,
    payload.group_name,
    payload.student_code,
    payload.phone || '',
    payload.notes || '',
    payload.id
  ]);
  return { ok: true };
});

ipcMain.handle('students:delete', async (_, id) => {
  await db.run('DELETE FROM students WHERE id = ?', [id]);
  return { ok: true };
});

ipcMain.handle('attendance:mark', async (_, payload) => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);
  const status = payload.status || 'PRESENT';
  try {
    await db.run(
      'INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
      [payload.student_id, date, time, status]
    );
    return { ok: true, duplicate: false, date, time };
  } catch {
    return { ok: true, duplicate: true, date, time };
  }
});

ipcMain.handle('attendance:today', async () => {
  const date = new Date().toISOString().slice(0, 10);
  return db.all(`
    SELECT a.id, a.date, a.time, a.status, s.first_name, s.last_name, s.group_name, s.student_code
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    WHERE a.date = ?
    ORDER BY a.time DESC
  `, [date]);
});

ipcMain.handle('attendance:stats', async () => {
  const date = new Date().toISOString().slice(0, 10);
  const total = await db.get('SELECT COUNT(*) AS count FROM students');
  const present = await db.get('SELECT COUNT(*) AS count FROM attendance WHERE date = ?', [date]);
  const late = await db.get('SELECT COUNT(*) AS count FROM attendance WHERE date = ? AND status = ?', [date, 'LATE']);
  return {
    totalStudents: total.count || 0,
    presentToday: present.count || 0,
    absentToday: Math.max((total.count || 0) - (present.count || 0), 0),
    lateToday: late.count || 0
  };
});

ipcMain.handle('attendance:report', async (_, filters) => {
  const conditions = [];
  const values = [];
  if (filters.fromDate) {
    conditions.push('a.date >= ?');
    values.push(filters.fromDate);
  }
  if (filters.toDate) {
    conditions.push('a.date <= ?');
    values.push(filters.toDate);
  }
  if (filters.groupName) {
    conditions.push('s.group_name = ?');
    values.push(filters.groupName);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.all(`
    SELECT a.date, a.time, a.status, s.first_name, s.last_name, s.group_name, s.student_code
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    ${whereSql}
    ORDER BY a.date DESC, a.time DESC
  `, values);
});

ipcMain.handle('settings:getAll', async () => {
  const rows = await db.all('SELECT key, value FROM settings');
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
});

ipcMain.handle('settings:set', async (_, payload) => {
  await db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [payload.key, payload.value]
  );
  return { ok: true };
});

ipcMain.handle('system:dbPath', async () => dbPath);

ipcMain.handle('system:backup', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Backup SQLite Database',
    defaultPath: `smartattendance-backup-${Date.now()}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  fs.copyFileSync(dbPath, result.filePath);
  return { ok: true, path: result.filePath };
});

ipcMain.handle('system:restore', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Restore SQLite Database',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };

  await db.close();
  fs.copyFileSync(result.filePaths[0], dbPath);
  await initDb();
  return { ok: true };
});

ipcMain.handle('system:factoryReset', async () => {
  await db.close();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  await initDb();
  return { ok: true };
});

app.whenReady().then(async () => {
  await initDb();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
