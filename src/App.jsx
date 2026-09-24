
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function ProtectedRoute({ role, children }) {
  const location = useLocation();
  let session = null;

  try {
    session = JSON.parse(localStorage.getItem('civicdrive_session') || 'null');
  } catch {
    session = null;
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && session.role !== role) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/driver'} replace />;
  }

  return children;
}

function RoleRedirect() {
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem('civicdrive_session') || 'null');
  } catch {}
  return session
    ? <Navigate to={session.role === 'admin' ? '/admin' : '/driver'} replace />
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/driver"
        element={
          <ProtectedRoute role="driver">
            <DriverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      {/* Keep the old dashboard URL working, but protect it as the Driver side. */}
      <Route path="/dashboard" element={<Navigate to="/driver" replace />} />
      <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </>
  );
}
