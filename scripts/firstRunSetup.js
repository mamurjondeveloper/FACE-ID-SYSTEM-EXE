const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const root = process.cwd();
const nodeModules = path.join(root, 'node_modules');
const modelsRoot = path.join(root, 'models');
const publicModels = path.join(root, 'public', 'models');
const tempDir = path.join(root, 'temp');
const appDataDir = path.join(os.homedir(), 'AppData', 'Roaming', 'SmartAttendance', 'data');
const dbPath = path.join(appDataDir, 'smartattendance.db');
const requiredModelFiles = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin'
];
const bundledModelDir = path.join(root, 'node_modules', '@vladmandic', 'face-api', 'model');
const minModelSizes = {
  'ssd_mobilenetv1_model-weights_manifest.json': 1000,
  'ssd_mobilenetv1_model.bin': 5000000,
  'face_landmark_68_model-weights_manifest.json': 500,
  'face_landmark_68_model.bin': 300000,
  'face_recognition_model-weights_manifest.json': 500,
  'face_recognition_model.bin': 6000000
};
const expectedManifestPath = {
  'ssd_mobilenetv1_model-weights_manifest.json': 'ssd_mobilenetv1_model.bin',
  'face_landmark_68_model-weights_manifest.json': 'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json': 'face_recognition_model.bin'
};

if (!fs.existsSync(nodeModules)) {
  console.log('node_modules not found. Run npm install first.');
  process.exit(1);
}

if (!fs.existsSync(modelsRoot)) fs.mkdirSync(modelsRoot, { recursive: true });
if (!fs.existsSync(publicModels)) fs.mkdirSync(publicModels, { recursive: true });
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Auto-fill missing/corrupt models from local installed package (offline-friendly).
if (!fs.existsSync(bundledModelDir)) {
  console.log('Bundled model directory not found. Run npm install first.');
  process.exit(1);
}
for (const file of requiredModelFiles) {
  const target = path.join(modelsRoot, file);
  const bundled = path.join(bundledModelDir, file);
  if (!fs.existsSync(bundled)) {
    console.log(`Missing bundled model file: ${file}`);
    process.exit(1);
  }
  // Always sync from bundled models to avoid stale shard-based manifests.
  fs.copyFileSync(bundled, target);
}

const invalid = requiredModelFiles.filter((f) => {
  const fp = path.join(modelsRoot, f);
  const size = fs.statSync(fp).size;
  return size < minModelSizes[f];
});
if (invalid.length > 0) {
  console.log('Invalid or incomplete face model files in models/:');
  for (const file of invalid) {
    const size = fs.statSync(path.join(modelsRoot, file)).size;
    console.log(` - ${file} (${size} bytes)`);
  }
  console.log('Delete invalid files and run start.bat again.');
  process.exit(1);
}

for (const file of requiredModelFiles) {
  fs.copyFileSync(path.join(modelsRoot, file), path.join(publicModels, file));
}

for (const [manifest, expectedPath] of Object.entries(expectedManifestPath)) {
  const manifestContent = fs.readFileSync(path.join(publicModels, manifest), 'utf8');
  if (!manifestContent.includes(expectedPath)) {
    console.log(`Manifest validation failed: ${manifest}`);
    process.exit(1);
  }
}

// Remove old shard format files if they exist to prevent accidental misuse.
const legacyShardFiles = [
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-shard1',
  'face_landmark_68_model-shard2',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];
for (const file of legacyShardFiles) {
  const p1 = path.join(modelsRoot, file);
  const p2 = path.join(publicModels, file);
  if (fs.existsSync(p1)) fs.unlinkSync(p1);
  if (fs.existsSync(p2)) fs.unlinkSync(p2);
}

for (const file of fs.readdirSync(tempDir)) {
  const fp = path.join(tempDir, file);
  if (fs.statSync(fp).isFile()) fs.unlinkSync(fp);
}

if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });

const initSql = `
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
  UNIQUE(student_id, date)
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);
`;

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.exec(initSql);
  const hash = bcrypt.hashSync('admin123', 10);
  db.run('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
  db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['school_name', 'SmartAttendance']);
  db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['threshold', '0.5']);
  db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['camera_id', '']);
});
db.close();

console.log('First-run setup completed. Database initialized.');
