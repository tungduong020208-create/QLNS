/**
 * Route path constants
 */
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',

  // Employee routes
  EMPLOYEE_HOME: '/employee/home',
  EMPLOYEE_HANDOVER: '/employee/handover',
  EMPLOYEE_PEER_REVIEW: '/employee/peer-review',
  EMPLOYEE_PROFILE: '/employee/profile',

  // Manager routes
  MANAGER_DASHBOARD: '/admin/dashboard',
  MANAGER_APPROVAL: '/admin/approval',
  MANAGER_SCHEDULE: '/admin/schedule',
  MANAGER_HANDOVER: '/admin/handover',
  MANAGER_PEER_REVIEW: '/admin/peer-review',
  MANAGER_PROFILE: '/admin/profile',
} as const;

/**
 * Get the default home route based on user role
 */
export function getDefaultHomeRoute(role: 'manager' | 'employee'): string {
  return role === 'manager' ? ROUTES.MANAGER_DASHBOARD : ROUTES.EMPLOYEE_HOME;
}
