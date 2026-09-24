import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function useCountUp(target, decimals = 0, duration = 900) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = decimals ? current.toFixed(decimals) : Math.round(current).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, decimals, duration]);

  return ref;
}

export default function Landing() {
  const violationsRef = useCountUp(2148, 0);
  const speedRef = useCountUp(0.4, 1);
  const uptimeRef = useCountUp(99.1, 1);

  return (
    <>
      <nav className="nav glass">
        <div className="brand"><span className="dot"></span>CivicDrive</div>
        <div className="nav-links">
          <a href="#problem">Problem</a>
          <a href="#how">How it works</a>
          <a href="#impact">Impact</a>
        </div>
        <Link to="/login" className="btn btn-primary">Login</Link>
      </nav>

      <header className="wrap hero">
        <div>
          <div className="eyebrow-line">
            Built for TechSprint 2.0 &nbsp;·&nbsp; <span className="tag">Smart Cities / Road Safety</span>
          </div>
          <h1 className="headline">
            Every junction camera becomes a traffic officer that <em>never blinks.</em>
          </h1>
          <p className="lede">
            CivicDrive watches driver behaviour in real time through an ordinary camera, detects
            violations as they happen, scores every driver, and makes the record impossible to fake or switch off.
          </p>
          <div className="hero-cta">
            <Link to="/login" className="btn btn-primary">Login to CivicDrive →</Link>
            <a href="#how" className="btn btn-ghost">How detection works</a>
          </div>
        </div>

        <div className="hero-visual glass">
          <div className="mini-status">
            <div className="live"><span className="ring"></span>MONITORING ACTIVE</div>
            <div style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Cam 04 · MG Road Jn</div>
          </div>
          <div className="scan-box">
            <div className="grid-lines"></div>
            <div className="frame-box"></div>
            <div className="sweep"></div>
          </div>
          <div className="hero-stat-row">
            <div className="stat"><div className="num" ref={violationsRef}>0</div><div className="lbl">violations logged today</div></div>
            <div className="stat"><div className="num"><span ref={speedRef}>0</span>s</div><div className="lbl">avg. detection time</div></div>
            <div className="stat"><div className="num"><span ref={uptimeRef}>0</span>%</div><div className="lbl">uptime this week</div></div>
          </div>
        </div>
      </header>

      <section className="section wrap" id="problem">
        <div className="section-head">
          <h2>Manual traffic enforcement doesn't scale to metro chaos.</h2>
          <p>A handful of constables can't watch every junction, every hour, in a city of millions. Violations go unrecorded, behaviour never improves, and enforcement stays reactive instead of preventive.</p>
        </div>

        <div className="feature-grid">
          <div className="feature-card glass">
            <div className="icon-badge ic-amber">◉</div>
            <h3>Nothing is caught in real time</h3>
            <p>Most violations are reported after the fact — by a complaint or a post-incident review — long after the risk has passed.</p>
          </div>
          <div className="stack">
            <div className="feature-card glass">
              <div className="icon-badge ic-cyan">⌗</div>
              <h3>No accountability over time</h3>
              <p>A driver who breaks the same rule five times looks identical to one who never has, on paper.</p>
            </div>
            <div className="feature-card glass">
              <div className="icon-badge ic-violet">⬡</div>
              <h3>No city-wide visibility</h3>
              <p>Authorities can't see patterns across junctions — where violations cluster, and when.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section wrap" id="how">
        <div className="section-head">
          <h2>From camera frame to logged violation, in under a second.</h2>
          <p>A genuinely sequential pipeline — each stage feeds the next.</p>
        </div>
        <div className="flow glass">
          <div className="flow-step">
            <div className="step-index">01 — Capture</div>
            <h4>Continuous camera feed</h4>
            <p>The webcam stream runs throughout the session, not a single snapshot.</p>
          </div>
          <div className="flow-connector">→</div>
          <div className="flow-step">
            <div className="step-index">02 — Detect</div>
            <h4>On-device vision model</h4>
            <p>Flags phone use, distraction, drowsiness and missing seatbelt frame by frame.</p>
          </div>
          <div className="flow-connector">→</div>
          <div className="flow-step">
            <div className="step-index">03 — Verify</div>
            <h4>Confidence + anti-tamper check</h4>
            <p>Confirms the detection is genuine and the feed hasn't been blocked or spoofed.</p>
          </div>
          <div className="flow-connector">→</div>
          <div className="flow-step">
            <div className="step-index">04 — Log &amp; Score</div>
            <h4>Written to the record</h4>
            <p>Snapshot, timestamp and confidence are stored; the driver's score updates instantly.</p>
          </div>
        </div>
      </section>

      <section className="section wrap" id="impact">
        <div className="impact-band glass">
          <div className="imp"><div className="big">24/7</div><div className="cap">continuous monitoring, no shift gaps</div></div>
          <div className="imp"><div className="big">0</div><div className="cap">new hardware required at junctions</div></div>
          <div className="imp"><div className="big">6</div><div className="cap">violation types detected on-device</div></div>
          <div className="imp"><div className="big">100%</div><div className="cap">tamper attempts logged as events</div></div>
        </div>
      </section>

      <footer className="wrap">
        <div className="foot-row">
          <span>CivicDrive — Integrated Traffic Management System</span>
          <span>TechSprint 2.0 Submission</span>
        </div>
      </footer>
    </>
  );
}
