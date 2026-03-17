import { Hono } from 'hono';
import { z } from 'zod';
import { Env, Variables } from '../../types';

const preferences = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const preferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().optional(),
  date_format: z.enum(['ISO', 'US', 'EU']).optional(),
  time_format: z.enum(['12h', '24h']).optional(),
  email_notifications_enabled: z.number().int().min(0).max(1).optional(),
  usage_alert_threshold: z.number().int().min(0).max(100).optional(),
  security_alerts_enabled: z.number().int().min(0).max(1).optional(),
  weekly_report_enabled: z.number().int().min(0).max(1).optional()
});

const notificationsSchema = z.object({
  email: z.object({
    enabled: z.boolean().optional(),
    security_alerts: z.boolean().optional(),
    usage_warnings: z.boolean().optional(),
    billing_updates: z.boolean().optional(),
    product_announcements: z.boolean().optional()
  }).optional(),
  push: z.object({
    enabled: z.boolean().optional(),
    security_alerts: z.boolean().optional(),
    usage_warnings: z.boolean().optional()
  }).optional(),
  webhook: z.object({
    enabled: z.boolean().optional(),
    url: z.string().url().nullable().optional(),
    events: z.array(z.string()).optional()
  }).optional()
});

// GET /api/management/user/preferences
preferences.get('/preferences', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const userPrefs = await repos.userProfile.getPreferences(user.id);

    if (!userPrefs) {
      // Return default preferences if none exist
      return c.json({
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        date_format: 'ISO',
        time_format: '24h'
      });
    }

    // Transform to API response format
    const response = {
      theme: userPrefs.theme,
      language: userPrefs.date_format === 'US' ? 'en' : 'en',
      timezone: 'UTC', // Default for now
      date_format: userPrefs.date_format,
      time_format: userPrefs.time_format
    };

    return c.json(response);
  } catch (error) {
    console.error('[Preferences] Failed to fetch preferences:', error);
    return c.json({
      error: 'Failed to fetch preferences',
      message: 'An error occurred while retrieving your preferences'
    }, 500);
  }
});

// PUT /api/management/user/preferences
preferences.put('/preferences', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const body = await c.req.json();
    const validatedData = preferencesSchema.safeParse(body);

    if (!validatedData.success) {
      return c.json({
        error: 'Validation error',
        message: 'Invalid preferences data',
        details: validatedData.error.issues
      }, 400);
    }

    await repos.userProfile.upsertPreferences(user.id, validatedData.data);

    // Get updated preferences
    const updatedPrefs = await repos.userProfile.getPreferences(user.id);

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: 'preferences_update',
      eventCategory: 'settings',
      description: 'User updated preferences',
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    const response = {
      success: true,
      preferences: {
        theme: updatedPrefs!.theme,
        language: 'en',
        timezone: 'UTC',
        date_format: updatedPrefs!.date_format,
        time_format: updatedPrefs!.time_format,
        updated_at: updatedPrefs!.updated_at
      }
    };

    return c.json(response);
  } catch (error) {
    console.error('[Preferences] Failed to update preferences:', error);
    return c.json({
      error: 'Failed to update preferences',
      message: 'An error occurred while updating your preferences'
    }, 500);
  }
});

// GET /api/management/user/notifications
preferences.get('/notifications', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const userPrefs = await repos.userProfile.getPreferences(user.id);

    if (!userPrefs) {
      // Return default notification settings
      return c.json({
        email: {
          enabled: true,
          security_alerts: true,
          usage_warnings: true,
          billing_updates: true,
          product_announcements: false
        },
        push: {
          enabled: false,
          security_alerts: false,
          usage_warnings: false
        },
        webhook: {
          enabled: false,
          url: null,
          events: []
        }
      });
    }

    // Parse notification categories from JSON if available
    let notificationCategories: any = {};
    if (userPrefs.notification_categories) {
      try {
        notificationCategories = JSON.parse(userPrefs.notification_categories);
      } catch {
        notificationCategories = {};
      }
    }

    const response = {
      email: {
        enabled: userPrefs.email_notifications_enabled === 1,
        security_alerts: userPrefs.security_alerts_enabled === 1,
        usage_warnings: notificationCategories.usage ?? true,
        billing_updates: notificationCategories.billing ?? true,
        product_announcements: notificationCategories.product ?? false
      },
      push: {
        enabled: false,
        security_alerts: false,
        usage_warnings: false
      },
      webhook: {
        enabled: false,
        url: null,
        events: []
      }
    };

    return c.json(response);
  } catch (error) {
    console.error('[Notifications] Failed to fetch settings:', error);
    return c.json({
      error: 'Failed to fetch notification settings',
      message: 'An error occurred while retrieving your notification settings'
    }, 500);
  }
});

// PUT /api/management/user/notifications
preferences.put('/notifications', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const body = await c.req.json();
    const validatedData = notificationsSchema.safeParse(body);

    if (!validatedData.success) {
      return c.json({
        error: 'Validation error',
        message: 'Invalid notification settings',
        details: validatedData.error.issues
      }, 400);
    }

    // Validate webhook URL if enabled
    if (validatedData.data.webhook?.enabled && validatedData.data.webhook.url) {
      try {
        new URL(validatedData.data.webhook.url);
      } catch {
        return c.json({
          error: 'Validation error',
          message: 'Invalid webhook URL'
        }, 400);
      }
    }

    // Convert notification settings to database format
    const notificationCategories: any = {};
    if (validatedData.data.email) {
      notificationCategories.security = validatedData.data.email.security_alerts;
      notificationCategories.usage = validatedData.data.email.usage_warnings;
      notificationCategories.billing = validatedData.data.email.billing_updates;
      notificationCategories.product = validatedData.data.email.product_announcements;
    }

    await repos.userProfile.upsertPreferences(user.id, {
      email_notifications_enabled: validatedData.data.email?.enabled ? 1 : 0,
      security_alerts_enabled: validatedData.data.email?.security_alerts ? 1 : 0,
      notification_categories: JSON.stringify(notificationCategories)
    });

    // Get updated preferences
    const updatedPrefs = await repos.userProfile.getPreferences(user.id);

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: 'notifications_update',
      eventCategory: 'settings',
      description: 'User updated notification settings',
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    const updatedCategories = updatedPrefs!.notification_categories
      ? JSON.parse(updatedPrefs!.notification_categories)
      : {};

    const response = {
      success: true,
      notifications: {
        email: {
          enabled: updatedPrefs!.email_notifications_enabled === 1,
          security_alerts: updatedPrefs!.security_alerts_enabled === 1,
          usage_warnings: updatedCategories.usage ?? true,
          billing_updates: updatedCategories.billing ?? true,
          product_announcements: updatedCategories.product ?? false
        },
        push: {
          enabled: false,
          security_alerts: false,
          usage_warnings: false
        },
        webhook: validatedData.data.webhook || {
          enabled: false,
          url: null,
          events: []
        },
        updated_at: updatedPrefs!.updated_at
      }
    };

    return c.json(response);
  } catch (error) {
    console.error('[Notifications] Failed to update settings:', error);
    return c.json({
      error: 'Failed to update notification settings',
      message: 'An error occurred while updating your notification settings'
    }, 500);
  }
});

export { preferences as preferencesRouter };
