/**
 * Application root.
 *
 * Wraps the router in AuthProvider so every page has access to the auth
 * context. react-hot-toast is mounted once here so toasts are available
 * globally without additional setup in individual components.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import RegisterPage    from './pages/auth/RegisterPage';
import LoginPage       from './pages/auth/LoginPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import DashboardPage   from './pages/dashboard/DashboardPage';
import DonorDashboard    from './pages/dashboard/DonorDashboard';
import SeekerDashboard   from './pages/dashboard/SeekerDashboard';
import HospitalDashboard from './pages/dashboard/HospitalDashboard';
import AdminDashboard    from './pages/dashboard/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/register"     element={<RegisterPage />} />
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Generic /dashboard resolves to the role-specific dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleDashboard />
              </ProtectedRoute>
            }
          />

          {/* Donor dashboard (Phase 2) */}
          <Route
            path="/dashboard/donor"
            element={
              <ProtectedRoute roles={['donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Seeker dashboard (Phase 3) */}
          <Route
            path="/dashboard/seeker"
            element={
              <ProtectedRoute roles={['seeker']}>
                <SeekerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Hospital dashboard (Phase 4) */}
          <Route
            path="/dashboard/hospital"
            element={
              <ProtectedRoute roles={['hospital']}>
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin dashboard (Phase 5) */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Placeholder routes for roles built in Phases 3–5 */}
          <Route
            path="/dashboard/:role"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 fallback */}
          <Route
            path="*"
            element={
              <div
                style={{
                  minHeight: '100dvh',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-4)',
                }}
              >
                <span style={{ fontSize: '4rem' }}>🔍</span>
                <h2>Page not found</h2>
                <a href="/" className="btn btn-ghost">Go home</a>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>

      {/* Toast notifications — position top-right, dark theme */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-float)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
          },
        }}
      />
    </AuthProvider>
  );
}

/**
 * Reads the authenticated user's role and redirects to the correct dashboard.
 * This lets /dashboard work as a universal entry point regardless of role.
 */
function RoleDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const destinations = {
    donor:    '/dashboard/donor',
    seeker:   '/dashboard/seeker',
    hospital: '/dashboard/hospital',
    admin:    '/dashboard/admin',
  };

  return <Navigate to={destinations[user.role] || '/dashboard/donor'} replace />;
}

