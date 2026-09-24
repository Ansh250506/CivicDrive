import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [vehicle, setVehicle]   = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !vehicle) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { error: dbError } = await supabase.from('drivers').insert({
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
      phone:      phone.trim() || null,
      vehicle_id: vehicle.trim().toUpperCase(),
      password,                          // store hash in production; demo stores plain
      role:       'driver',
      created_at: new Date().toISOString(),
    });

    setLoading(false);

    if (dbError) {
      if (dbError.code === '23505') {
        setError('An account with this email already exists.');
      } else {
        setError(dbError.message || 'Something went wrong. Please try again.');
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/login'), 2000);
  }

  return (
    <div className="auth-page">
      <nav className="nav glass auth-nav">
        <Link to="/" className="brand"><span className="dot"></span>CivicDrive</Link>
        <Link to="/login" className="btn btn-ghost">← Login</Link>
      </nav>

      <main className="auth-wrap">
        <section className="auth-card glass">
          <div className="auth-badge">DRIVER REGISTRATION</div>
          <h1>Create your account</h1>
          <p className="auth-sub">
            Register as a CivicDrive driver. Your data will be securely stored and linked to your vehicle.
          </p>

          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <strong>Account created!</strong>
              <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>Redirecting you to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <label>Full Name *
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  required
                />
              </label>

              <label>Email *
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </label>

              <label>Vehicle ID *
                <input
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  type="text"
                  placeholder="e.g. GJ-01-AB-1234"
                  required
                />
              </label>

              <label>Password *
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label>Confirm Password *
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                />
              </label>

              {error && <div className="auth-error">{error}</div>}

              <button
                className="btn btn-primary auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Registering…' : 'Register as Driver →'}
              </button>

              <p style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.7, fontSize: '0.875rem' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>Sign in</Link>
              </p>
            </form>
          )}
        </section>

        <aside className="auth-info">
          <span className="eyebrow-line"><span className="tag">DRIVER ONBOARDING</span></span>
          <h2>Join the<br /><em>CivicDrive network.</em></h2>
          <div className="auth-feature"><b>01</b><div><strong>Real-time monitoring</strong><p>Your driving behaviour is tracked live and scored for safety compliance.</p></div></div>
          <div className="auth-feature"><b>02</b><div><strong>Violation alerts</strong><p>Get notified instantly about violations tied to your vehicle and session.</p></div></div>
          <div className="auth-feature"><b>03</b><div><strong>Secure &amp; verified</strong><p>Your data is stored securely. Only you and authorised admins can see your records.</p></div></div>
        </aside>
      </main>
    </div>
  );
}
