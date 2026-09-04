import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { ROUTES, getDefaultHomeRoute } from '../routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  currentUser: User | null;
  isLoggedIn: boolean;
  requiredRole?: 'manager' | 'employee';
}

/**
 * Route Guard: Blocks access to protected routes if user is not authenticated.
 * Redirects to /login if not logged in.
 * If requiredRole is specified, also checks the user has the right role.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  currentUser,
  isLoggedIn,
  requiredRole,
}) => {
  const location = useLocation();

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
