'use client';

import { fetchGateway } from '@/utils/api';

/**
 * User API client for settings page
 * All functions require Supabase session token for authentication
 */

// Profile APIs
export async function getUserProfile(token: string) {
  return fetchGateway('/api/management/user/profile', token);
}

export async function updateUserProfile(token: string, data: {
  full_name?: string;
  bio?: string;
  company?: string;
  location?: string;
  timezone?: string;
  language?: string;
}) {
  return fetchGateway('/api/management/user/profile', token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function changePassword(token: string, currentPassword: string, newPassword: string) {
  return fetchGateway('/api/management/user/change-password', token, {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// Usage & Billing APIs
export async function getUserUsage(token: string, period: 'day' | 'week' | 'month' | 'year' = 'month', projectId?: string) {
  const params = new URLSearchParams({ period });
  if (projectId) params.append('project_id', projectId);
  return fetchGateway(`/api/management/user/usage?${params.toString()}`, token);
}

export async function getUserQuotas(token: string) {
  return fetchGateway('/api/management/user/quotas', token);
}

// Project Analytics APIs
export async function getAnalyticsSummary(token: string, projectId: string) {
  return fetchGateway(`/api/projects/${projectId}/analytics/summary`, token);
}

export async function getDailyUsage(token: string, projectId: string, days: number = 14) {
  return fetchGateway(`/api/projects/${projectId}/analytics/usage`, token);
}

export async function getSecurityLogs(token: string, projectId: string, limit: number = 50) {
  return fetchGateway(`/api/projects/${projectId}/analytics/security`, token);
}

// Gateway Key APIs
export async function getGatewayKeys(token: string, projectId: string) {
  return fetchGateway(`/api/projects/${projectId}/gateway-keys`, token);
}

export async function createGatewayKey(token: string, projectId: string, data: {
  name: string;
  monthly_limit_usd?: number;
}) {
  return fetchGateway(`/api/projects/${projectId}/gateway-keys`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteGatewayKey(token: string, projectId: string, keyId: string) {
  return fetchGateway(`/api/projects/${projectId}/gateway-keys/${keyId}`, token, {
    method: 'DELETE',
  });
}

// Notification Preferences (placeholder for future implementation)
export async function getNotificationPreferences(token: string) {
  // TODO: Implement when backend endpoint is ready
  return fetchGateway('/api/management/user/notifications', token);
}

export async function updateNotificationPreferences(token: string, preferences: {
  emailNotifications: boolean;
  securityAlerts: boolean;
  usageAlerts: boolean;
  usageThreshold: number;
}) {
  // TODO: Implement when backend endpoint is ready
  return fetchGateway('/api/management/user/notifications', token, {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
}

// Session Management (placeholder for future implementation)
export async function getActiveSessions(token: string) {
  // TODO: Implement when backend endpoint is ready
  return [];
}

export async function revokeSession(token: string, sessionId: string) {
  // TODO: Implement when backend endpoint is ready
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
}

export async function revokeAllOtherSessions(token: string) {
  // TODO: Implement when backend endpoint is ready
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
}
