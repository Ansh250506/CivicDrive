import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DRIVERS = [
  { id: 'A-2291', name: 'Driver #A-2291', vehicle: 'GJ-01-AB-2291', status: 'Monitoring', score: 87, violations: 3, location: 'MG Road Junction', last: 'Just now' },
  { id: 'B-4810', name: 'Driver #B-4810', vehicle: 'GJ-01-CD-4810', status: 'Safe', score: 94, violations: 1, location: 'Station Road', last: '2 min ago' },
  { id: 'C-1174', name: 'Driver #C-1174', vehicle: 'GJ-01-EF-1174', status: 'Alert', score: 58, violations: 7, location: 'Ring Road', last: '4 min ago' },
  { id: 'D-3302', name: 'Driver #D-3302', vehicle: 'GJ-01-GH-3302', status: 'Offline', score: 76, violations: 2, location: 'University Road', last: '12 min ago' },
];

const EVENTS = [
  ['14:58:21', 'Phone use detected', 'A-2291', 'MG Road Junction', '92.4%', 'Flagged'],
  ['14:56:44', 'Seatbelt not detected', 'C-1174', 'Ring Road', '95.1%', 'Flagged'],
  ['14:54:10', 'Drowsiness detected', 'B-4810', 'Station Road', '89.8%', 'Review'],
  ['14:51:33', 'Monitoring session started', 'A-2291', 'MG Road Junction', '—', 'Active'],
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [liveEvents, setLiveEvents] = useState(EVENTS);
  const [liveLocation, setLiveLocation] = useState(null);

  useEffect(() => {
    function loadLocation() {
      try {
        const data = JSON.parse(localStorage.getItem('civicdrive_live_location') || 'null');
        setLiveLocation(data);
      } catch {
        setLiveLocation(null);
      }
    }
    loadLocation();
    const id = setInterval(loadLocation, 2000);
    return () => clearInterval(id);
  }, []);


  useEffect(() => {
    function loadEvents() {
      try {
        const detected = JSON.parse(localStorage.getItem('civicdrive_violations') || '[]');
        const mapped = detected.map((e) => [
          e.time,
          e.event,
          e.driver || 'A-2291',
          e.location || 'Live vehicle camera',
          e.confidence || '—',
          e.status || 'Flagged',
        ]);
        setLiveEvents([...mapped, ...EVENTS].slice(0, 20));
      } catch {
        setLiveEvents(EVENTS);
      }
    }

    loadEvents();
    const id = setInterval(loadEvents, 2000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DRIVERS;
    return DRIVERS.filter((d) => `${d.name} ${d.id} ${d.vehicle} ${d.location}`.toLowerCase().includes(q));
  }, [query]);

  function logout() {
    localStorage.removeItem('civicdrive_session');
    navigate('/login');
  }

  return (
    <div className="app-shell admin-shell">
      <aside className="sidebar">
        <div className="brand"><span className="dot"></span>CivicDrive</div>
        <nav className="side-nav">
          <Link to="/admin" className="active"><span className="ic">▣</span>Overview</Link>
          <a href="#drivers"><span className="ic">♙</span>All Drivers</a>
          <a href="#events"><span className="ic">⚠</span>Violations</a>
          <a href="#analytics"><span className="ic">▤</span>Analytics</a>
          <a href="#system"><span className="ic">⚙</span>System Status</a>
        </nav>
        <div className="side-foot">
          <span className="role-label">ADMIN ACCOUNT</span>
          <strong style={{ color: 'var(--text-primary)' }}>Traffic Admin</strong>
          <br />City control access enabled
          <button className="logout-link" onClick={logout}>Log out</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>Admin Control Center</h1>
            <div className="sub">City-wide driver monitoring, violation records and system status.</div>
          </div>
          <div className="status-pill"><span className="ring"></span>SYSTEM ONLINE</div>
        </div>

        <div className="admin-kpis" id="analytics">
          <div className="kpi glass"><span>ACTIVE DRIVERS</span><strong>128</strong><small>currently monitored</small></div>
          <div className="kpi glass"><span>VIOLATIONS TODAY</span><strong>342</strong><small>across all junctions</small></div>
          <div className="kpi glass"><span>AVG. SCORE</span><strong>82.6</strong><small>city driver score</small></div>
          <div className="kpi glass"><span>CAMERAS ONLINE</span><strong>48 / 50</strong><small>96% availability</small></div>
          <div className="kpi glass"><span>AUTO-DETECTION</span><strong>ACTIVE</strong><small>AI violation monitoring</small></div>
        </div>

        <div className="dash-grid" id="system">
          <div className="panel glass">
            <div className="panel-head"><h3>System Status</h3><span className="tag">Live</span></div>
            <div className="system-grid">
              <div className="system-item"><i></i><strong>Camera Network</strong><span>48 online · 2 maintenance</span></div>
              <div className="system-item"><i></i><strong>AI Vision Engine</strong><span>Processing normally</span></div>
              <div className="system-item"><i></i><strong>Violation Database</strong><span>Synced just now</span></div>
              <div className="system-item"><i></i><strong>Driver Authentication</strong><span>Operational</span></div>
            </div>
          </div>
          <div className="panel glass">
            <div className="panel-head"><h3>Today's Summary</h3><span className="tag">23 Sep 2026</span></div>
            <div className="summary-list">
              <div><span>Phone use</span><strong>96</strong></div>
              <div><span>Distraction</span><strong>74</strong></div>
              <div><span>Drowsiness</span><strong>61</strong></div>
              <div><span>Seatbelt</span><strong>111</strong></div>
            </div>
          </div>
        </div>

        <div className="panel glass admin-location-panel" id="live-location">
          <div className="panel-head">
            <h3>Live Driver Location</h3>
            <span className="tag">{liveLocation ? 'GPS · LIVE' : 'Waiting for driver GPS'}</span>
          </div>
          {liveLocation ? (
            <div className="admin-location-grid">
              <div>
                <span>DRIVER</span><strong>{liveLocation.driver}</strong>
              </div>
              <div>
                <span>VEHICLE</span><strong>{liveLocation.vehicle}</strong>
              </div>
              <div>
                <span>COORDINATES</span><strong>{liveLocation.current?.lat}, {liveLocation.current?.lon}</strong>
              </div>
              <div>
                <span>SPEED</span><strong>{liveLocation.current?.speed == null ? '—' : `${liveLocation.current.speed} km/h`}</strong>
              </div>
              <div>
                <span>ROUTE POINTS</span><strong>{liveLocation.route?.length || 0}</strong>
              </div>
              <div>
                <span>LAST UPDATE</span><strong>{liveLocation.updatedAt ? new Date(liveLocation.updatedAt).toLocaleTimeString('en-US', { hour12: false }) : '—'}</strong>
              </div>
              <a className="btn btn-ghost" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${liveLocation.current?.lat},${liveLocation.current?.lon}`}>
                View on Map ↗
              </a>
            </div>
          ) : (
            <div className="tracking-empty">No live GPS position received yet. The driver dashboard starts location tracking automatically with monitoring.</div>
          )}
        </div>

        <div className="auto-detection-banner active">
          <div className="auto-detection-icon">AI</div>
          <div>
            <strong>Automatic Violation Detection</strong>
            <span>Driver camera events are received automatically and appear in the admin event feed.</span>
          </div>
          <span className="badge badge-cyan">LIVE</span>
        </div>

        <div className="panel glass" id="drivers">
          <div className="panel-head">
            <h3>All Driver Information</h3>
            <input className="table-search" placeholder="Search driver, vehicle or location…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="table-scroll">
            <table className="log-table admin-table">
              <thead><tr><th>Driver</th><th>Vehicle</th><th>Status</th><th>Score</th><th>Violations</th><th>Location</th><th>Last update</th></tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td className="name">{d.name}</td>
                    <td>{d.vehicle}</td>
                    <td><span className={`badge ${d.status === 'Alert' ? 'badge-red' : d.status === 'Monitoring' ? 'badge-cyan' : 'badge-amber'}`}>{d.status}</span></td>
                    <td className="score-cell">{d.score}</td>
                    <td>{d.violations}</td>
                    <td>{d.location}</td>
                    <td>{d.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel glass" id="events">
          <div className="panel-head"><h3>Recent Violation & Monitoring Events</h3><span className="tag">Live feed</span></div>
          <div className="table-scroll">
            <table className="log-table admin-table">
              <thead><tr><th>Time</th><th>Event</th><th>Driver</th><th>Location</th><th>Confidence</th><th>Status</th></tr></thead>
              <tbody>
                {liveEvents.map((e, i) => (
                  <tr key={i}>
                    <td>{e[0]}</td><td className="name">{e[1]}</td><td>{e[2]}</td><td>{e[3]}</td><td>{e[4]}</td>
                    <td><span className={`badge ${e[5] === 'Active' ? 'badge-cyan' : e[5] === 'Review' ? 'badge-amber' : 'badge-red'}`}>{e[5]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
