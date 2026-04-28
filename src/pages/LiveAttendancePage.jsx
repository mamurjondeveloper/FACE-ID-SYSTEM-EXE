import React, { useEffect, useRef, useState } from 'react';
import { recognizeFromVideo } from '../services/faceService';

function decodeDescriptor(encoded) {
  return JSON.parse(atob(encoded));
}

export default function LiveAttendancePage() {
  const videoRef = useRef(null);
  const cameraWrapRef = useRef(null);
  const intervalRef = useRef(null);
  const [students, setStudents] = useState([]);
  const [lastMatch, setLastMatch] = useState(null);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState({ threshold: '0.5', camera_id: '' });
  const [cams, setCams] = useState([]);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await window.desktopAPI.students.list();
      setStudents(data.map((s) => ({ ...s, descriptor: decodeDescriptor(s.descriptor) })));
      setSettings(await window.desktopAPI.settings.getAll());
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCams(devices.filter((d) => d.kind === 'videoinput'));
    };
    load();
    return () => {
      stop();
    };
  }, []);

  const start = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: settings.camera_id ? { deviceId: { exact: settings.camera_id } } : true
      });
      videoRef.current.srcObject = stream;
      setRunning(true);
      intervalRef.current = setInterval(scan, 1500);
    } catch (err) {
      setCameraError(err?.message || 'Camera ochilmadi.');
    }
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    setRunning(false);
  };

  const scan = async () => {
    if (!students.length || !videoRef.current) return;
    try {
      const match = await recognizeFromVideo(videoRef.current, students, Number(settings.threshold || 0.5));
      if (!match) return;
      const result = await window.desktopAPI.attendance.mark({ student_id: match.id, status: 'PRESENT' });
      if (!result.duplicate) {
        setLastMatch({ ...match, time: result.time });
      }
    } catch (err) {
      setCameraError(err?.message || 'Aniqlashda xatolik.');
    }
  };

  const openFullscreen = async () => {
    try {
      if (cameraWrapRef.current?.requestFullscreen) {
        await cameraWrapRef.current.requestFullscreen();
      }
    } catch (err) {
      setCameraError(err?.message || 'Full screen yoqilmadi.');
    }
  };

  return (
    <div className="page-grid two-col">
      <section className="glass card">
        <h3>Live Camera</h3>
        <div className="camera-stage" ref={cameraWrapRef}>
          <video ref={videoRef} autoPlay muted playsInline className="camera" />
        </div>
        <div className="row">
          <button className="btn primary" onClick={start} disabled={running}>Start</button>
          <button className="btn danger" onClick={stop} disabled={!running}>Stop</button>
          <button className="btn" onClick={openFullscreen}>Full Screen</button>
        </div>
        {cameraError && <p className="error">{cameraError}</p>}
        <select value={settings.camera_id || ''} onChange={(e) => setSettings({ ...settings, camera_id: e.target.value })}>
          <option value="">Default Camera</option>
          {cams.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label || c.deviceId}</option>)}
        </select>
      </section>
      <section className="glass card">
        <h3>Last Recognized</h3>
        {lastMatch ? (
          <>
            <p><strong>{lastMatch.first_name} {lastMatch.last_name}</strong></p>
            <p>Group: {lastMatch.group_name}</p>
            <p>Student ID: {lastMatch.student_code}</p>
            <p>Marked at: {lastMatch.time}</p>
          </>
        ) : <p>No student recognized yet.</p>}
      </section>
    </div>
  );
}
