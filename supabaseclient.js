import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('[CivicDrive] Missing .env — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set.');
}

export const supabase = createClient(url, anonKey);

/**
 * Call this wherever violation detection happens in DriverDashboard.jsx
 */
export async function logViolation({ driverId, type, severity, sessionId }) {
  return supabase.from('violations').insert({
    driver_id: driverId,
    violation_type: type,
    severity,
    session_id: sessionId
  });
}

export async function updateDriverScore(driverId, score) {
  return supabase
    .from('driver_scores')
    .upsert({ driver_id: driverId, score, updated_at: new Date().toISOString() });
}

export async function updateLiveLocation(driverId, { latitude, longitude, speed, accuracy }) {
  return supabase
    .from('live_locations')
    .upsert({
      driver_id: driverId,
      latitude,
      longitude,
      speed,
      accuracy,
      updated_at: new Date().toISOString()
    });
}