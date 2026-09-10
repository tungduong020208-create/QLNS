import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { ROUTES, getDefaultHomeRoute } from '../routes';
import { isSessionValid, refreshSession } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  currentUser: User | null;
  isLoggedIn: boolean;
  requiredRole?: 'manager' | 'employee';
}

/**
 * Route Guard: Blocks access to protected routes if user is not authenticated.
 * 
 * SECURITY FIX: Previously only checked localStorage flag 'enterprise_hr_auth'
 * which could be set manually via DevTools. Now also validates:
 * - Session has not expired (30 min timeout)
 * - Auth token exists and is valid
 * - Refreshes session on each navigation (sliding window)
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  currentUser,
  isLoggedIn,
  requiredRole,
}) => {
  const location = useLocation();

  // SECURITY FIX: Refresh session on mount/navigation (sliding window)
  // Must be called BEFORE any conditional returns to follow React rules of hooks
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      refreshSession();
    }
  }, [location.pathname, isLoggedIn, currentUser]);

  // SECURITY FIX: Validate session is not expired
  // This prevents stale sessions from persisting indefinitely
  if (!isSessionValid()) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Not logged in → redirect to login
  if (!isLoggedIn || !currentUser) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Wrong role → redirect to correct home
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to={getDefaultHomeRoute(currentUser.role)} replace />;
  }

  return <>{children}</>;
};

/**
 * GuestRoute: Only accessible when NOT logged in (login page).
 * If already logged in, redirect to correct home.
 */
export const GuestRoute: React.FC<{
  children: React.ReactNode;
  currentUser: User | null;
  isLoggedIn: boolean;
}> = ({ children, currentUser, isLoggedIn }) => {
  if (isLoggedIn && currentUser) {
    return <Navigate to={getDefaultHomeRoute(currentUser.role)} replace />;
  }
  return <>{children}</>;
};
