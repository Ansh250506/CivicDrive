# CivicDrive — React (Vite) Frontend

## Run it
```
npm install
npm run dev
```
Opens at `http://localhost:5173`. Click **Open Dashboard** and grant camera permission. The Live Monitor treats the dashboard session as the demo ignition event and automatically activates the camera; there is no manual stop control. Use **Test Violation** to test the detection UI; the driver cannot disable automatic detection.

## Structure
- `src/pages/Landing.jsx` — pitch/landing page, with animated count-up stats
- `src/pages/Dashboard.jsx` — live monitor: webcam panel, score gauge, violation feed,
  trend chart, rules list, log table — all driven by React state
- `src/styles/style.css` — shared design tokens + landing styles
- `src/styles/dashboard.css` — dashboard app-shell styles
- Routing via `react-router-dom` (`/` and `/dashboard`)

## Wire it to Supabase
1. `npm install @supabase/supabase-js`
2. Create `src/lib/supabaseClient.js`:
   ```js
   import { createClient } from '@supabase/supabase-js';
   export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
   ```
3. Add a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. In `Dashboard.jsx`, the two `--- Wire here ---` comments inside `simulateViolation()`
   are where you replace the demo logic with real `supabase.from('violations').insert()`
   and `supabase.from('driver_scores').update()` calls — and where you'd plug in your
   actual CV model (MediaPipe/TensorFlow.js) instead of the "Simulate Violation" button.

## Build for deployment
```
npm run build
```
Outputs a static `dist/` folder — deploy to Vercel or Netlify.


## Vehicle ignition integration
The frontend cannot directly sense a real vehicle ignition from a normal browser. For a real deployment, connect an OBD-II/CAN/vehicle IoT gateway to your backend and call the dashboard monitoring start flow when an authenticated ignition-on event arrives. The UI intentionally exposes no manual stop button; camera interruption/revocation is logged as a monitoring-evasion event.


## Automatic Violation Detection
The Driver dashboard includes an automatic violation-detection demo. When camera monitoring is active, mandatory Auto-Detect periodically generates demo detection events and stores them in localStorage so the Admin dashboard can display them in its live event feed. Replace the demo timer with a real computer-vision model and backend/Supabase insert in production.


## Automatic Driver Movement Tracking
The Driver Dashboard now starts browser GPS tracking automatically when monitoring starts. It uses `navigator.geolocation.watchPosition()` to record the current coordinates, speed, accuracy, timestamp and recent route points. The latest location is stored in `localStorage` under `civicdrive_live_location` so the Admin Dashboard can display the driver's current coordinates and open them in Google Maps.

For a production ITMS deployment, replace the localStorage transport with authenticated backend/WebSocket/Supabase updates and enforce server-side access control and retention policies.


## Traffic signal + high-resolution face tracking update
- Traffic-management signal UI added to the Driver dashboard.
- Camera requests up to 1920×1080 for higher-resolution detection when supported by the device.
- MediaPipe Face Landmarker follows the driver's face and eye midpoint in the live camera overlay.
- Face tracking is visual tracking only; it does not claim to determine a driver's gaze direction.
- Install the new vision dependency with `npm install` before running the project.
- The Face Landmarker model/wasm are loaded from the official MediaPipe CDN/model hosting at runtime.
