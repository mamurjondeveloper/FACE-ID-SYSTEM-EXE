import React, { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({ school_name: '', threshold: '0.5', camera_id: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    window.desktopAPI.settings.getAll().then(setSettings);
  }, []);

  const save = async () => {
    for (const [key, value] of Object.entries(settings)) {
      await window.desktopAPI.settings.set({ key, value: String(value) });
    }
    setMessage('Settings saved');
  };

  const backup = async () => {
    const result = await window.desktopAPI.system.backupDb();
    setMessage(result.ok ? `Backup created: ${result.path}` : 'Backup cancelled');
  };

  const restore = async () => {
    const result = await window.desktopAPI.system.restoreDb();
    setMessage(result.ok ? 'Database restored' : 'Restore cancelled');
  };

  const factoryReset = async () => {
    const ok = confirm(
      'Full database reset qilinsinmi?\n\nBu amal students, attendance va settings maʼlumotlarini o‘chiradi. Default admin qayta yaratiladi: admin / admin123'
    );
    if (!ok) return;
    const result = await window.desktopAPI.system.factoryResetDb();
    if (result.ok) {
      setSettings(await window.desktopAPI.settings.getAll());
      setMessage('Database to‘liq reset qilindi.');
    } else {
      setMessage('Database reset bekor qilindi.');
    }
  };

  return (
    <div className="page-grid">
      <section className="glass card settings">
        <h3>Settings</h3>
        <label>School Name</label>
        <input value={settings.school_name || ''} onChange={(e) => setSettings({ ...settings, school_name: e.target.value })} />
        <label>Recognition Threshold (0.3 - 0.8)</label>
        <input type="number" min="0.3" max="0.8" step="0.01" value={settings.threshold || '0.5'} onChange={(e) => setSettings({ ...settings, threshold: e.target.value })} />
        <label>Preferred Camera ID</label>
        <input value={settings.camera_id || ''} onChange={(e) => setSettings({ ...settings, camera_id: e.target.value })} />
        <div className="row">
          <button className="btn primary" onClick={save}>Save</button>
          <button className="btn" onClick={backup}>Backup DB</button>
          <button className="btn danger" onClick={restore}>Restore DB</button>
          <button className="btn danger" onClick={factoryReset}>Factory Reset DB</button>
        </div>
        {message && <p>{message}</p>}
      </section>
    </div>
  );
}
