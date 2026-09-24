import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole]         = useState('driver');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  function selectRole(nextRole) {
    setRole(nextRole);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    // ── Admin: keep a single hardcoded admin account ──────────────
    if (role === 'admin') {
      if (email.trim().toLowerCase() === 'admin@civicdrive.local' && password === 'admin123') {
        localStorage.setItem('civicdrive_session', JSON.stringify({
          name: 'Traffic Admin',
          email: 'admin@civicdrive.local',
          role: 'admin',
          vehicle: null,
          loggedInAt: new Date().toISOString(),
        }));
        navigate('/admin', { replace: true });
        return;
      }
      setError('Invalid admin credentials.');
      return;
    }

    // ── Driver: check against Supabase drivers table ───────────────
    setLoading(true);
    const { data, error: dbError } = await supabase
      .from('drivers')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .single();
    setLoading(false);

    if (dbError || !data) {
      setError('Invalid email or password. Please try again or sign up.');
      return;
    }

    localStorage.setItem('civicdrive_session', JSON.stringify({
      name: data.name,
      email: data.email,
      role: data.role || 'driver',
      vehicle: data.vehicle_id || null,
      loggedInAt: new Date().toISOString(),
    }));

    const requested = location.state?.from;
    const destination = requested === '/driver' ? '/driver' : '/driver';
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
          <p className="auth-sub">
            Choose your side. Driver accounts see personal driving status and records; Admin accounts see city-wide monitoring information.
          </p>

          <div className="role-switch">
            <button type="button" className={role === 'driver' ? 'role-btn active' : 'role-btn'} onClick={() => selectRole('driver')}>
              <span>🚗</span>
              <div><strong>Driver Side</strong><small>My status &amp; records</small></div>
            </button>
            <button type="button" className={role === 'admin' ? 'role-btn active' : 'role-btn'} onClick={() => selectRole('admin')}>
              <span>🛡️</span>
              <div><strong>Admin Side</strong><small>All traffic information</small></div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder={role === 'admin' ? 'admin@civicdrive.local' : 'your@email.com'}
                autoComplete="username"
                required
              />
            </label>
            <label>Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : `Login as ${role === 'admin' ? 'Admin' : 'Driver'} →`}
            </button>
          </form>

          {role === 'admin' && (
            <div className="demo-box">
              <strong>Admin credentials</strong>
              <span>admin@civicdrive.local</span>
              <span>admin123</span>
            </div>
          )}

          {role === 'driver' && (
            <p style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.7, fontSize: '0.875rem' }}>
              No account?{' '}
              <Link to="/signup" style={{ color: 'inherit', textDecoration: 'underline' }}>Sign up as a driver</Link>
            </p>
          )}
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
