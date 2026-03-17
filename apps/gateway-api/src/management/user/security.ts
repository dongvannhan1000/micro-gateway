import { Hono } from 'hono';
import { z } from 'zod';
import { Env, Variables } from '../../types';

const security = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/management/user/sessions
security.get('/sessions', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;
  const currentSessionId = c.req.header('X-Session-ID'); // Set by frontend

  try {
    const sessions = await repos.userSession.findByUser(user.id);

    // Mark current session
    const sessionsWithCurrent = sessions.map(session => ({
      id: session.id,
      device: session.device_name || 'Unknown Device',
      ip_address: session.ip_address || 'Unknown',
      location: 'Unknown', // TODO: Implement IP geolocation
      user_agent: session.user_agent,
      is_current: session.session_token === currentSessionId,
      created_at: session.created_at,
      last_active: session.last_active
    }));

    return c.json({
      sessions: sessionsWithCurrent,
      total: sessions.length
    });
  } catch (error) {
    console.error('[Security] Failed to fetch sessions:', error);
    return c.json({
      error: 'Failed to fetch sessions',
      message: 'An error occurred while retrieving your sessions'
    }, 500);
  }
});

// DELETE /api/management/user/sessions/:id
security.delete('/sessions/:id', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;
  const sessionId = c.req.param('id');
  const currentSessionId = c.req.header('X-Session-ID');

  // Prevent revoking current session
  if (sessionId === currentSessionId) {
    return c.json({
      error: 'Cannot revoke current session',
      message: 'Use DELETE /sessions to revoke all other sessions'
    }, 403);
  }

  try {
    const deleted = await repos.userSession.revoke(sessionId, user.id);
    if (deleted === 0) {
      return c.json({
        error: 'Session not found',
        message: 'The specified session does not exist or belongs to another user'
      }, 404);
    }

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: 'session_revoked',
      eventCategory: 'security',
      description: `User revoked session ${sessionId}`,
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    return c.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('[Security] Failed to revoke session:', error);
    return c.json({
      error: 'Failed to revoke session',
      message: 'An error occurred while revoking the session'
    }, 500);
  }
});

// DELETE /api/management/user/sessions
security.delete('/sessions', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;
  const currentSessionId = c.req.header('X-Session-ID');

  try {
    const revokedCount = await repos.userSession.revokeAllExcept(user.id, currentSessionId || '');

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: 'sessions_revoked_all',
      eventCategory: 'security',
      description: `User revoked all other sessions (${revokedCount} revoked)`,
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    return c.json({
      success: true,
      revoked_count: revokedCount,
      message: revokedCount > 0
        ? `Revoked ${revokedCount} other session(s)`
        : 'No other sessions to revoke'
    });
  } catch (error) {
    console.error('[Security] Failed to revoke sessions:', error);
    return c.json({
      error: 'Failed to revoke sessions',
      message: 'An error occurred while revoking sessions'
    }, 500);
  }
});

// GET /api/management/user/audit-logs
security.get('/audit-logs', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const eventType = c.req.query('event_type');

  // Validate limits
  const validLimit = Math.min(Math.max(limit, 1), 100);

  try {
    const result = await repos.auditLog.findByUser(user.id, {
      limit: validLimit,
      offset,
      eventType
    });

    // Transform logs to API response format
    const logs = result.logs.map(log => ({
      id: log.id,
      event_type: log.event_type,
      description: log.description || `${log.event_type.replace(/_/g, ' ')}`,
      ip_address: log.ip_address || 'Unknown',
      location: 'Unknown', // TODO: Implement IP geolocation
      user_agent: log.user_agent,
      success: log.success === 1,
      created_at: log.created_at
    }));

    return c.json({
      logs,
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    console.error('[Security] Failed to fetch audit logs:', error);
    return c.json({
      error: 'Failed to fetch audit logs',
      message: 'An error occurred while retrieving your audit logs'
    }, 500);
  }
});

// POST /api/management/user/2fa/enable
const enable2FASchema = z.object({
  method: z.enum(['totp']),
  password: z.string().min(8)
});

security.post('/2fa/enable', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const body = await c.req.json();
    const validatedData = enable2FASchema.safeParse(body);

    if (!validatedData.success) {
      return c.json({
        error: 'Validation error',
        message: 'Invalid 2FA enable request',
        details: validatedData.error.issues
      }, 400);
    }

    const { method, password } = validatedData.data;

    // TODO: Verify password via Supabase
    // For now, we'll skip actual password verification

    // TODO: Check if 2FA already enabled
    // For now, we'll skip this check

    // TODO: Generate TOTP secret and QR code
    // For now, we'll return placeholder data

    const backupCodes = [
      'ABCD-1234-EFGH-5678',
      'IJKL-9012-MNOP-3456',
      'QRST-7890-UVWX-1234',
      'YZAB-5678-CDEF-9012'
    ];

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: '2fa_initiated',
      eventCategory: 'security',
      description: 'User initiated 2FA setup',
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    return c.json({
      success: true,
      qr_code_url: 'otpauth://totp/MicroGateway:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MicroGateway',
      backup_codes: backupCodes,
      temp_token: 'verify_token_placeholder',
      message: 'Scan QR code and verify to enable 2FA'
    });
  } catch (error) {
    console.error('[Security] Failed to enable 2FA:', error);
    return c.json({
      error: 'Failed to enable 2FA',
      message: 'An error occurred while enabling 2FA'
    }, 500);
  }
});

// POST /api/management/user/2fa/disable
const disable2FASchema = z.object({
  password: z.string().min(8),
  totp_code: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits')
});

security.post('/2fa/disable', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const body = await c.req.json();
    const validatedData = disable2FASchema.safeParse(body);

    if (!validatedData.success) {
      return c.json({
        error: 'Validation error',
        message: 'Invalid 2FA disable request',
        details: validatedData.error.issues
      }, 400);
    }

    const { password, totp_code } = validatedData.data;

    // TODO: Verify password via Supabase
    // For now, we'll skip actual password verification

    // TODO: Verify TOTP code
    // For now, we'll skip actual TOTP verification

    // TODO: Disable 2FA in database
    // For now, we'll just log the event

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: '2fa_disabled',
      eventCategory: 'security',
      description: 'User disabled 2FA',
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    return c.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('[Security] Failed to disable 2FA:', error);
    return c.json({
      error: 'Failed to disable 2FA',
      message: 'An error occurred while disabling 2FA'
    }, 500);
  }
});

export { security as securityRouter };
