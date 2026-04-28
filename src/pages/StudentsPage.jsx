import React, { useEffect, useState } from 'react';
import { getDescriptorFromFile } from '../services/faceService';

const initial = {
  first_name: '', last_name: '', group_name: '', student_code: '', phone: '', notes: ''
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initial);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => setStudents(await window.desktopAPI.students.list());
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      if (editingId) {
        await window.desktopAPI.students.update({ ...form, id: editingId });
        setMessage('Student updated.');
      } else {
        if (!imageFile) {
          throw new Error('Yangi student uchun rasm tanlang.');
        }
        setMessage('Rasm tekshirilmoqda, iltimos kuting...');
        const descriptor = await getDescriptorFromFile(imageFile);
        await window.desktopAPI.students.create({ ...form, descriptor });
        setMessage('Student muvaffaqiyatli qo‘shildi.');
      }
      setForm(initial);
      setImageFile(null);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err?.message || 'Qo‘shishda xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (s) => {
    setEditingId(s.id);
    setForm(s);
  };

  const remove = async (id) => {
    if (!confirm('Delete this student?')) return;
    await window.desktopAPI.students.remove(id);
    await refresh();
  };

  return (
    <div className="page-grid two-col">
      <section className="glass card">
        <h3>{editingId ? 'Edit Student' : 'Add Student'}</h3>
        <form className="form-grid" onSubmit={submit}>
          {Object.keys(initial).map((k) => (
            <input
              key={k}
              placeholder={k.replace('_', ' ').toUpperCase()}
              value={form[k] || ''}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              required={!['phone', 'notes'].includes(k)}
            />
          ))}
          {!editingId && <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} required />}
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
          </button>
        </form>
        {message && <p>{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>
      <section className="glass card">
        <h3>Students</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Group</th><th>ID</th><th>Action</th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.first_name} {s.last_name}</td>
                <td>{s.group_name}</td>
                <td>{s.student_code}</td>
                <td>
                  <button className="btn" onClick={() => edit(s)}>Edit</button>
                  <button className="btn danger" onClick={() => remove(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
