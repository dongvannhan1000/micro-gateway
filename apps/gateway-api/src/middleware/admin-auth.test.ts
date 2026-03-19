import { describe, it, expect, beforeEach } from 'vitest';
import { adminAuth } from './admin-auth';
import type { Env, Variables } from '../types';

// Helper to create a valid JWT token for testing
function createTestToken(email: string, exp?: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        email,
        sub: 'user-id-123',
        exp: exp || Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000)
    }));
    const signature = btoa('test-signature');
    return `${header}.${payload}.${signature}`;
}

describe('Admin Auth Middleware', () => {
    let mockEnv: Env;
    let mockContext: any;

    beforeEach(() => {
        mockEnv = {
            SUPABASE_JWT_SECRET: 'test-secret',
            SUPABASE_URL: 'https://test.supabase.co',
            ENVIRONMENT: 'test'
        } as unknown as Env;

        mockContext = {
            req: {
                header: (name: string) => {
                    if (name === 'Authorization') return null;
                    return null;
                },
                method: 'GET'
            },
            env: mockEnv,
            set: (key: string, value: any) => {},
            json: (data: any, status?: number) => ({
                status: status || 200,
                data
            })
        };
    });

    it('should allow requests from admin users', async () => {
        const adminToken = createTestToken('your-email@example.com'); // Must match ADMIN_EMAILS

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${adminToken}`;
            return null;
        };

        let userSet = null;
        mockContext.set = (key: string, value: any) => {
            if (key === 'user') userSet = value;
        };

        const nextMock = async () => {};
        await adminAuth(mockContext, nextMock);

        // Should set user context
        expect(userSet).toBeTruthy();
        expect(userSet.email).toBe('your-email@example.com');
    });

    it('should block requests from non-admin users', async () => {
        const userToken = createTestToken('user@example.com');

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${userToken}`;
            return null;
        };

        const nextMock = async () => {};
        const result = await adminAuth(mockContext, nextMock);

        // Should return 403 for non-admin user
        expect(result.status).toBe(403);
        expect(result.data.error.code).toBe('forbidden');
        expect(result.data.error.message).toContain('Admin access required');
    });

    it('should require authentication', async () => {
        // No Authorization header
        const nextMock = async () => {};
        const result = await adminAuth(mockContext, nextMock);

        // Should return 401 for missing Authorization header
        expect(result.status).toBe(401);
        expect(result.data.error.code).toBe('unauthorized');
        expect(result.data.error.message).toContain('Authentication required');
    });

    it('should reject invalid tokens', async () => {
        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return 'Bearer invalid-token-format';
            return null;
        };

        const nextMock = async () => {};
        const result = await adminAuth(mockContext, nextMock);

        // Should return 401 for invalid token
        expect(result.status).toBe(401);
        expect(result.data.error.code).toBe('unauthorized');
        expect(result.data.error.message).toContain('Invalid or expired token');
    });

    it('should reject expired tokens', async () => {
        // Create expired token (exp in the past)
        const expiredToken = createTestToken('your-email@example.com', Math.floor(Date.now() / 1000) - 3600);

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${expiredToken}`;
            return null;
        };

        const nextMock = async () => {};
        const result = await adminAuth(mockContext, nextMock);

        // Should return 401 for expired token
        expect(result.status).toBe(401);
        expect(result.data.error.code).toBe('unauthorized');
        expect(result.data.error.message).toContain('Invalid or expired token');
    });

    it('should reject tokens without email claim', async () => {
        // Create token without email
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'user-id-123',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
            // No email field
        }));
        const signature = btoa('test-signature');
        const tokenNoEmail = `${header}.${payload}.${signature}`;

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${tokenNoEmail}`;
            return null;
        };

        const nextMock = async () => {};
        const result = await adminAuth(mockContext, nextMock);

        // Should return 401 for missing email
        expect(result.status).toBe(401);
        expect(result.data.error.code).toBe('unauthorized');
        expect(result.data.error.message).toContain('missing email');
    });
});
