import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const result = await window.desktopAPI.auth.login({ username, password });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onLogin(result.admin);
  };

  return (
    <div className="login-wrap">
      <form className="glass card login-card" onSubmit={submit}>
        <h2>Welcome Back</h2>
        <p>Offline attendance management</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" type="submit">Login</button>
      </form>
    </div>
  );
}
