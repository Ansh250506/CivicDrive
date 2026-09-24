import { useRef, useState, useEffect, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Link, useNavigate } from 'react-router-dom';

// Note: this is a front-end demo. Wire violation events to Supabase inserts
// (table: violations) and score updates (table: driver_scores) where marked below.

const VIOLATION_TYPES = [
  { label: 'Phone use detected', icon: '📵', badge: 'badge-red', color: '#ff5d5d' },
  { label: 'Driver distracted', icon: '👀', badge: 'badge-amber', color: '#ffb020' },
  { label: 'Drowsiness detected', icon: '💤', badge: 'badge-amber', color: '#ffb020' },
  { label: 'Seatbelt not detected', icon: '🚫', badge: 'badge-red', color: '#ff5d5d' },
];

const CIRCUMFERENCE = 477;

function timeNow() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState({ name: 'Driver', vehicle: '' });

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('civicdrive_session'));
      if (s) setSession(s);
    } catch (e) {}
  }, []);
  const videoRef = useRef(null);
  const ignitionStartedRef = useRef(false);
  const [monitoring, setMonitoring] = useState(false);
  const [ignitionDetected, setIgnitionDetected] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceTracking, setFaceTracking] = useState(false);
  const [faceBox, setFaceBox] = useState(null);
  const [eyePoint, setEyePoint] = useState(null);
  const [faceTrackingError, setFaceTrackingError] = useState('');
  const faceLandmarkerRef = useRef(null);
  const faceRafRef = useRef(null);
  const [camTag, setCamTag] = useState('Awaiting permission');
  const [score, setScore] = useState(87);
  const [violationsToday, setViolationsToday] = useState(0);
  const [alertActive, setAlertActive] = useState(false);
  const [alertLabel, setAlertLabel] = useState('DRIVER · TRACKED');
  const [feed, setFeed] = useState([
    { icon: '✓', title: 'Session started', sub: 'No violations yet — drive safe.', color: '#2dd7e0', time: timeNow() },
  ]);
  const [logs, setLogs] = useState([
    { time: timeNow(), event: 'Monitoring session started', confidence: '—', badge: 'badge-cyan', status: 'Active' },
  ]);

  // Automatic driver movement tracking using the browser/vehicle GPS.
  // The driver does not manually start/stop this tracker; it follows the
  // monitoring session and stores the latest position + route locally so the
  // Admin dashboard can see the live movement.
  const [tracking, setTracking] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [locationError, setLocationError] = useState('');

  const distanceMeters = useCallback((a, b) => {
    if (!a || !b) return 0;
    const R = 6371000;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }, []);

  const saveLocation = useCallback((position) => {
    const point = {
      lat: Number(position.coords.latitude.toFixed(6)),
      lon: Number(position.coords.longitude.toFixed(6)),
      accuracy: Math.round(position.coords.accuracy || 0),
      speed: position.coords.speed == null ? null : Number((position.coords.speed * 3.6).toFixed(1)),
      heading: position.coords.heading == null ? null : Math.round(position.coords.heading),
      timestamp: new Date(position.timestamp || Date.now()).toISOString(),
    };

    setLocationData(point);
    setRoutePoints((previous) => {
      const last = previous[previous.length - 1];
      if (last && distanceMeters(last, point) < 8) return previous;
      const next = [...previous, point].slice(-100);
      const total = next.slice(1).reduce((sum, p, i) => sum + distanceMeters(next[i], p), 0);
      try {
        localStorage.setItem('civicdrive_live_location', JSON.stringify({
          driver: session.name,
          vehicle: session.vehicle,
          current: point,
          route: next,
          totalDistanceMeters: Math.round(total),
          updatedAt: point.timestamp,
          status: 'Moving / Monitoring',
        }));
      } catch {}
      return next;
    });
  }, [distanceMeters]);

  // Start GPS tracking automatically once monitoring starts.
  useEffect(() => {
    if (!monitoring) return;
    if (!('geolocation' in navigator)) {
      setLocationError('GPS/location is not supported by this browser.');
      return;
    }

    setTracking(true);
    setLocationError('');
    const watchId = navigator.geolocation.watchPosition(
      saveLocation,
      (error) => {
        setTracking(false);
        const messages = {
          1: 'Location permission was denied. Enable location permission for live route tracking.',
          2: 'Current location is unavailable.',
          3: 'Location request timed out. Retrying automatically.',
        };
        setLocationError(messages[error.code] || 'Unable to read the driver location.');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setTracking(false);
    };
  }, [monitoring, saveLocation]);

  const openCurrentLocation = () => {
    if (!locationData) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lon}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const pushFeed = useCallback((icon, title, sub, color) => {
    setFeed((f) => [{ icon, title, sub, color, time: timeNow() }, ...f]);
  }, []);

  const pushLog = useCallback((event, confidence, badge, status) => {
    setLogs((l) => [{ time: timeNow(), event, confidence, badge, status }, ...l]);
  }, []);

  const flagTamperEvent = useCallback((reason = 'Camera feed blocked or stopped') => {
    pushFeed('⛔', 'Monitoring evasion flagged', reason, '#ff5d5d');
    pushLog('Monitoring evasion attempt', '—', 'badge-red', 'Flagged');
    setScore((s) => Math.max(0, s - 15));
    setViolationsToday((v) => v + 1);
  }, [pushFeed, pushLog]);

  async function startMonitoring() {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCamTag('Live · Auto');
      setMonitoring(true);
      setIgnitionDetected(true);

      pushFeed('✓', 'Ignition detected · monitoring locked', 'Camera feed activated automatically. Driver controls cannot stop the monitoring session.', '#2dd7e0');
      pushLog('Automatic monitoring started', '—', 'badge-cyan', 'Locked');

      const track = stream.getVideoTracks()[0];
      track.addEventListener('ended', () => flagTamperEvent('Camera feed interrupted or permission revoked'));
    } catch (err) {
      setCamTag('Camera unavailable');
      setCameraError('Camera access is required for CivicDrive monitoring. Check browser camera permissions.');
      pushFeed('⚠', 'Camera activation failed', 'Monitoring could not start automatically.', '#ffb020');
      pushLog('Automatic camera activation failed', '—', 'badge-amber', 'Blocked');
    }
  }

  // --- Vehicle ignition handshake ---
  // In the real ITMS, call startMonitoring() from the vehicle/IoT ignition event.
  // This demo treats opening the Live Monitor as the ignition event so the camera
  // starts automatically without exposing a manual stop control.
  useEffect(() => {
    const ignitionTimer = setTimeout(() => {
      if (ignitionStartedRef.current) return;
      ignitionStartedRef.current = true;
      setIgnitionDetected(true);
      startMonitoring();
    }, 650);

    return () => clearTimeout(ignitionTimer);
  }, []); // intentionally runs once per dashboard session

  // --- Heartbeat: proves the session stayed active without interruption ---
  // In production: ping Supabase every few seconds and flag gaps server-side.
  useEffect(() => {
    if (!monitoring) return;
    const id = setInterval(() => {
      if (document.hidden) flagTamperEvent('Tab hidden during active session');
    }, 4000);
    return () => clearInterval(id);
  }, [monitoring, flagTamperEvent]);

  function recordViolation(v, confidence, source = 'AI auto-detection') {
    setAlertLabel(v.label.toUpperCase());
    setAlertActive(true);
    setTimeout(() => setAlertActive(false), 900);

    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: timeNow(),
      event: v.label,
      driver: session.name,
      location: 'Live vehicle camera',
      confidence,
      status: 'Flagged',
      source,
    };

    pushFeed(v.icon, v.label, `Confidence ${confidence} · ${source}`, v.color);
    pushLog(v.label, confidence, v.badge, 'Detected');
    setViolationsToday((n) => n + 1);
    setScore((s) => Math.max(0, s - (6 + Math.random() * 6)));

    // Keep the demo event available to the Admin side.
    try {
      const existing = JSON.parse(localStorage.getItem('civicdrive_violations') || '[]');
      localStorage.setItem('civicdrive_violations', JSON.stringify([event, ...existing].slice(0, 50)));
    } catch {}

    // Production integration:
    // supabase.from('violations').insert(event)
    // supabase.from('driver_scores').update({ current_score: score })
  }

  function simulateViolation() {
    if (!monitoring) {
      pushFeed('ℹ', 'Start monitoring first', 'Camera must be active to detect violations.', '#ffb020');
      return;
    }
    const v = VIOLATION_TYPES[Math.floor(Math.random() * VIOLATION_TYPES.length)];
    const confidence = (88 + Math.random() * 11).toFixed(1) + '%';
    recordViolation(v, confidence, 'Manual test detection');
  }

  // High-resolution face/eye tracking overlay. The box follows the detected
  // face rather than staying at a fixed camera position. This is a visual
  // tracking layer; production violation classification should run server-side
  // or in a dedicated vision pipeline.
  useEffect(() => {
    if (!monitoring || !videoRef.current) return;
    let cancelled = false;

    async function setupFaceTracking() {
      try {
        setFaceTrackingError('');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        faceLandmarkerRef.current = landmarker;
        setFaceTracking(true);

        const detect = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const detector = faceLandmarkerRef.current;
          if (!video || !detector || video.readyState < 2) {
            faceRafRef.current = requestAnimationFrame(detect);
            return;
          }
          try {
            const result = detector.detectForVideo(video, performance.now());
            const landmarks = result.faceLandmarks?.[0];
            if (landmarks?.length) {
              const xs = landmarks.map((p) => p.x);
              const ys = landmarks.map((p) => p.y);
              const minX = Math.max(0, Math.min(...xs) - 0.035);
              const minY = Math.max(0, Math.min(...ys) - 0.05);
              const maxX = Math.min(1, Math.max(...xs) + 0.035);
              const maxY = Math.min(1, Math.max(...ys) + 0.05);
              setFaceBox({ left: minX * 100, top: minY * 100, width: (maxX - minX) * 100, height: (maxY - minY) * 100 });

              const leftEye = landmarks[33];
              const rightEye = landmarks[263];
              if (leftEye && rightEye) {
                setEyePoint({ x: ((leftEye.x + rightEye.x) / 2) * 100, y: ((leftEye.y + rightEye.y) / 2) * 100 });
              }
            } else {
              setFaceBox(null);
              setEyePoint(null);
            }
          } catch {
            // Keep the camera usable even if one detection frame fails.
          }
          faceRafRef.current = requestAnimationFrame(detect);
        };
        detect();
      } catch (error) {
        setFaceTracking(false);
        setFaceTrackingError('Face tracking model could not load. Camera monitoring remains active.');
      }
    }

    setupFaceTracking();
    return () => {
      cancelled = true;
      if (faceRafRef.current) cancelAnimationFrame(faceRafRef.current);
      faceRafRef.current = null;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      setFaceTracking(false);
      setFaceBox(null);
      setEyePoint(null);
    };
  }, [monitoring]);

  // Automatic violation detection is mandatory and cannot be disabled by the driver.
  // A production version should replace this timer with an actual computer-vision
  // model (for example MediaPipe/YOLO) running on camera frames.
  useEffect(() => {
    if (!monitoring) return;

    const id = setInterval(() => {
      // Avoid firing on every tick: the demo engine checks periodically.
      if (Math.random() > 0.42) return;
      const v = VIOLATION_TYPES[Math.floor(Math.random() * VIOLATION_TYPES.length)];
      const confidence = (89 + Math.random() * 10).toFixed(1) + '%';
      recordViolation(v, confidence);
    }, 12000);

    return () => clearInterval(id);
  }, [monitoring]);

  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const scoreColor = score > 70 ? 'var(--cyan)' : score > 40 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="dot"></span>CivicDrive</div>
        <nav className="side-nav">
          <Link to="/driver" className="active"><span className="ic">▣</span>My Live Status</Link>
          <a href="#violations"><span className="ic">☰</span>My Violations</a>
          <a href="#score"><span className="ic">◈</span>My Driver Score</a>
          <a href="#tracking"><span className="ic">⌖</span>Live Movement</a>
          <a href="#history"><span className="ic">▤</span>My History</a>
        </nav>
        <div className="side-foot">
          <span className="role-label">DRIVER ACCOUNT</span>
          <strong style={{ color: 'var(--text-primary)' }}>Driver #A-2291</strong>
          <br />Vehicle: {session.vehicle || 'Not assigned'}
          <button className="logout-link" onClick={() => { localStorage.removeItem('civicdrive_session'); navigate('/login'); }}>Log out</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>Live Monitor</h1>
            <div className="sub">Vehicle-linked monitoring starts automatically when ignition is detected. The camera cannot be stopped from this interface.</div>
          </div>
          <div className={`status-pill ${monitoring ? 'is-live' : 'is-waiting'}`}>
            <span className="ring"></span>{monitoring ? 'MONITORING ACTIVE' : 'INITIALIZING CAMERA'}
          </div>
        </div>

        <div className="info-strip">
          <div><span>DRIVER</span><strong>{session.name}</strong></div>
          <div><span>VEHICLE</span><strong>{session.vehicle || 'Not assigned'}</strong></div>
          <div><span>SESSION</span><strong>Active · Auto monitored</strong></div>
          <div><span>ACCOUNT</span><strong>Verified</strong></div>
        </div>

        <div className="traffic-signal-panel">
          <div className="traffic-signal-copy">
            <span className="traffic-kicker">TRAFFIC MANAGEMENT SIGNAL</span>
            <strong>MG Road Junction · Signal phase monitored</strong>
            <small>Signal state is shown as a traffic-control reference for the active vehicle session.</small>
          </div>
          <div className="signal-lights" aria-label="Traffic signal status">
            <span className="signal-light red"></span>
            <span className="signal-light amber"></span>
            <span className="signal-light green active"></span>
          </div>
          <div className="signal-state"><span>ACTIVE PHASE</span><strong>GO · 18s</strong></div>
        </div>

        <div className={`auto-detection-banner ${monitoring ? 'active' : ''}`}>
          <div className="auto-detection-icon">AI</div>
          <div>
            <strong>Automatic Violation Detection</strong>
            <span>{monitoring
              ? 'AI camera monitoring is mandatory. Every detected violation is added to the violation list automatically.'
              : 'Automatic detection will start when camera monitoring starts.'}</span>
          </div>
          <span className={`badge ${monitoring ? 'badge-cyan' : 'badge-amber'}`}>
            {monitoring ? 'LOCKED · ACTIVE' : 'WAITING'}
          </span>
        </div>

        <div className="panel glass movement-panel" id="tracking">
          <div className="panel-head">
            <h3>Live Driver Movement Tracking</h3>
            <span className={`tag ${tracking ? 'tracking-live' : ''}`}>{tracking ? 'GPS · LIVE' : 'WAITING'}</span>
          </div>
          <div className="tracking-grid">
            <div className="tracking-map">
              <div className="route-grid"></div>
              <div className="route-line">
                {routePoints.length > 1 && routePoints.slice(-30).map((p, i, arr) => {
                  const minLat = Math.min(...arr.map(x => x.lat));
                  const maxLat = Math.max(...arr.map(x => x.lat));
                  const minLon = Math.min(...arr.map(x => x.lon));
                  const maxLon = Math.max(...arr.map(x => x.lon));
                  const x = maxLon === minLon ? 50 : ((p.lon - minLon) / (maxLon - minLon)) * 86 + 7;
                  const y = maxLat === minLat ? 50 : (1 - (p.lat - minLat) / (maxLat - minLat)) * 76 + 12;
                  return <span key={`${p.timestamp}-${i}`} style={{ left: `${x}%`, top: `${y}%` }} />;
                })}
              </div>
              <div className="tracking-center">
                <span className={`location-pulse ${tracking ? 'active' : ''}`}>●</span>
                <strong>{locationData ? 'DRIVER LOCATION' : 'WAITING FOR GPS'}</strong>
                <small>{locationData ? `${locationData.lat}, ${locationData.lon}` : 'GPS position will appear automatically'}</small>
              </div>
            </div>
            <div className="tracking-stats">
              <div><span>STATUS</span><strong>{tracking ? 'TRACKING ACTIVE' : 'WAITING'}</strong></div>
              <div><span>SPEED</span><strong>{locationData?.speed == null ? '—' : `${locationData.speed} km/h`}</strong></div>
              <div><span>ACCURACY</span><strong>{locationData?.accuracy ? `±${locationData.accuracy} m` : '—'}</strong></div>
              <div><span>ROUTE POINTS</span><strong>{routePoints.length}</strong></div>
              <div><span>LAST UPDATE</span><strong>{locationData ? new Date(locationData.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '—'}</strong></div>
              {locationError && <div className="tracking-error">{locationError}</div>}
              <button className="btn btn-ghost" type="button" onClick={openCurrentLocation} disabled={!locationData}>Open current location ↗</button>
            </div>
          </div>
        </div>

        <div className="dash-grid">
          <div className="panel glass">
            <div className="panel-head">
              <h3>Camera Feed</h3>
              <span className="tag">{camTag}</span>
            </div>
            <div className="cam-view">
              <div className="grid-lines"></div>
              <video ref={videoRef} autoPlay muted playsInline style={{ display: monitoring ? 'block' : 'none' }} />
              {!monitoring && (
                <div className="cam-empty">
                  <div className="ignition-loader"><span></span><span></span><span></span></div>
                  <strong>{cameraError ? 'CAMERA ACCESS REQUIRED' : 'DETECTING IGNITION…'}</strong>
                  <div>{cameraError || 'CivicDrive will activate the driver camera automatically.'}</div>
                </div>
              )}
              {monitoring && <div className="sweep"></div>}
              {monitoring && (
                <>
                  <div className="camera-live-corner"><span></span> LIVE · AUTO-LOCKED</div>
                  <div
                    className={`frame-box face-track-box${alertActive ? ' alert' : ''}`}
                    data-label={faceBox ? alertLabel : 'SEARCHING FOR DRIVER'}
                    style={faceBox ? {
                      display: 'block', left: `${faceBox.left}%`, top: `${faceBox.top}%`,
                      width: `${faceBox.width}%`, height: `${faceBox.height}%`
                    } : { display: 'block', left: '28%', top: '18%', width: '44%', height: '64%' }}
                  ></div>
                  {eyePoint && <span className="eye-track-point" style={{ left: `${eyePoint.x}%`, top: `${eyePoint.y}%` }}></span>}
                  <div className="ai-chip"><span className="ai-dot"></span> AI VISION · FACE + EYE TRACK</div>
                  <div className="camera-resolution">1920 × 1080 · HIGH-RES DETECTION</div>
                </>
              )}
            </div>
            <div className="cam-controls">
              <div className={`ignition-state ${monitoring ? 'active' : ''}`}>
                <span className="ignition-icon">◉</span>
                <div>
                  <strong>{monitoring ? 'IGNITION LINKED' : 'WAITING FOR IGNITION'}</strong>
                  <small>{monitoring ? 'Monitoring is mandatory during this session' : 'Automatic activation in progress'}</small>
                </div>
              </div>
              <div className="face-track-status">
                <span className={faceTracking ? 'face-live-dot' : ''}></span>
                <div><strong>{faceTracking ? 'FACE / EYE TRACKING ACTIVE' : 'FACE TRACKING INITIALIZING'}</strong><small>{faceTrackingError || 'Detection frame follows the driver face automatically.'}</small></div>
              </div>
              <div className="auto-detect-controls">
                <span className="badge badge-cyan auto-detect-locked">🔒 AUTO-DETECT LOCKED</span>
                <button className="btn btn-ghost btn-action" onClick={simulateViolation}>
                  Test Violation <span>↗</span>
                </button>
              </div>
            </div>
          </div>

          <div id="score" className="panel glass">
            <div className="panel-head"><h3>Driver Behaviour Score</h3><span className="tag">Live</span></div>
            <div className="score-wrap">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
                <circle
                  cx="90" cy="90" r="76" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14"
                  strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
                  transform="rotate(-90 90 90)" style={{ transition: 'stroke-dashoffset .6s ease' }}
                />
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2dd7e0" />
                    <stop offset="100%" stopColor="#8b7cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ marginTop: -128, color: scoreColor }} className="gauge-num">{Math.round(score)}</div>
              <div style={{ marginTop: 44 }} className="gauge-cap">out of 100 · updated in real time</div>
              <div className="gauge-legend">
                <span><i style={{ background: 'var(--cyan)' }}></i>Safe</span>
                <span><i style={{ background: 'var(--amber)' }}></i>Caution</span>
                <span><i style={{ background: 'var(--red)' }}></i>High risk</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-grid">
          <div id="violations" className="panel glass">
            <div className="panel-head"><h3>Live Violation Feed</h3><span className="tag">{violationsToday} today</span></div>
            <div className="feed-list">
              {feed.map((f, i) => (
                <div className="feed-row" key={i}>
                  <div className="fi" style={{ background: `${f.color}22`, color: f.color }}>{f.icon}</div>
                  <div className="fd"><div className="ft">{f.title}</div><div className="fs">{f.sub}</div></div>
                  <div className="fc">{f.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel trend-wrap glass">
            <div className="panel-head"><h3>Weekly Violation Trend</h3><span className="tag">7 days</span></div>
            <svg className="trend-svg" viewBox="0 0 320 130" preserveAspectRatio="none">
              <polyline points="0,90 45,70 90,95 135,55 180,75 225,40 270,58 320,30" fill="none" stroke="var(--cyan)" strokeWidth="2.5" />
              <polygon points="0,90 45,70 90,95 135,55 180,75 225,40 270,58 320,30 320,130 0,130" fill="url(#areaGrad)" opacity="0.5" />
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd7e0" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2dd7e0" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 6 }}>
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
        </div>

        <div className="bottom-grid">
          <div className="panel glass">
            <div className="panel-head"><h3>Detection Rules Active</h3></div>
            <div className="rule-list">
              <div className="rule-item">Phone-use detection<span className="on">ON</span></div>
              <div className="rule-item">Distraction / look-away<span className="on">ON</span></div>
              <div className="rule-item">Drowsiness detection<span className="on">ON</span></div>
              <div className="rule-item">Seatbelt check<span className="on">ON</span></div>
              <div className="rule-item">Feed-tamper detection<span className="on">ON</span></div>
            </div>
          </div>

          <div id="history" className="panel glass">
            <div className="panel-head"><h3>My Recent Log Entries</h3><span className="tag">Synced to Supabase</span></div>
            <table className="log-table">
              <thead><tr><th>Time</th><th>Event</th><th>Confidence</th><th>Status</th></tr></thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i}>
                    <td>{l.time}</td>
                    <td className="name">{l.event}</td>
                    <td>{l.confidence}</td>
                    <td><span className={`badge ${l.badge}`}>{l.status}</span></td>
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
