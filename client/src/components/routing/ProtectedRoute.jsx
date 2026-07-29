/**
 * ProtectedRoute — redirects unauthenticated or unauthorised users.
 *
 * Usage:
 *   <ProtectedRoute>               → any authenticated user
 *   <ProtectedRoute roles={['admin']}> → admin only
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show nothing while the initial localStorage hydration is in progress to
  // avoid flashing the login page for authenticated users on hard refresh.
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
