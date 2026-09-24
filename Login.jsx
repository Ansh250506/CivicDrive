import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const DEMO_USERS = {
  driver: {
    email: 'driver@civicdrive.local',
    password: 'driver123',
    name: 'Driver #A-2291',
    role: 'driver',
    vehicle: 'GJ-01-AB-2291',
  },
  admin: {
    email: 'admin@civicdrive.local',
    password: 'admin123',
    name: 'Traffic Admin',
    role: 'admin',
  },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('driver');
  const [email, setEmail] = useState(DEMO_USERS.driver.email);
  const [password, setPassword] = useState(DEMO_USERS.driver.password);
  const [error, setError] = useState('');

  function selectRole(nextRole) {
    setRole(nextRole);
    setEmail(DEMO_USERS[nextRole].email);
    setPassword(DEMO_USERS[nextRole].password);
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const user = DEMO_USERS[role];

    if (email.trim().toLowerCase() !== user.email || password !== user.password) {
      setError('Invalid demo credentials. Use the credentials shown below.');
      return;
    }

    localStorage.setItem(
      'civicdrive_session',
      JSON.stringify({
        name: user.name,
        email: user.email,
        role: user.role,
        vehicle: user.vehicle || null,
        loggedInAt: new Date().toISOString(),
      })
    );

    const requested = location.state?.from;
    const destination = requested && (role === 'admin' ? requested === '/admin' : requested === '/driver')
      ? requested
      : role === 'admin' ? '/admin' : '/driver';

    navigate(destination, { replace: true });
  }

  return (
    <div className="auth-page">
      <nav className="nav glass auth-nav">
        <Link to="/" className="brand"><span className="dot"></span>CivicDrive</Link>
        <Link to="/" className="btn btn-ghost">← Home</Link>
      </nav>

      <main className="auth-wrap">
        <section className="auth-card glass">
          <div className="auth-badge">SECURE ACCESS</div>
          <h1>Sign in to CivicDrive</h1>
          <p className="auth-sub">Choose your side. Driver accounts see personal driving status and records; Admin accounts see city-wide monitoring information.</p>

          <div className="role-switch">
            <button type="button" className={role === 'driver' ? 'role-btn active' : 'role-btn'} onClick={() => selectRole('driver')}>
              <span>🚗</span>
              <div><strong>Driver Side</strong><small>My status & records</small></div>
            </button>
            <button type="button" className={role === 'admin' ? 'role-btn active' : 'role-btn'} onClick={() => selectRole('admin')}>
              <span>🛡️</span>
              <div><strong>Admin Side</strong><small>All traffic information</small></div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
            </label>
            <label>Password
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button className="btn btn-primary auth-submit" type="submit">Login as {role === 'admin' ? 'Admin' : 'Driver'} →</button>
          </form>

          <div className="demo-box">
            <strong>Demo login</strong>
            <span>{DEMO_USERS[role].email}</span>
            <span>{DEMO_USERS[role].password}</span>
          </div>
        </section>

        <aside className="auth-info">
          <span className="eyebrow-line"><span className="tag">ROLE-BASED ACCESS</span></span>
          <h2>One system.<br /><em>Two secure sides.</em></h2>
          <div className="auth-feature"><b>01</b><div><strong>Driver</strong><p>View your live monitoring status, behaviour score, violations, vehicle and session history.</p></div></div>
          <div className="auth-feature"><b>02</b><div><strong>Admin</strong><p>View driver status, violations, scores, active sessions and city-level traffic analytics.</p></div></div>
          <div className="auth-feature"><b>03</b><div><strong>Protected routes</strong><p>Each dashboard is available only after a successful login with the matching role.</p></div></div>
        </aside>
      </main>
    </div>
  );
}
