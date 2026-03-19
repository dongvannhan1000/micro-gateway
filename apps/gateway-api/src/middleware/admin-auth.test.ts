import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminAuth } from './admin-auth';
import type { Env, Variables } from '../types';

// Mock jose library functions
vi.mock('jose', () => ({
    decodeProtectedHeader: vi.fn(),
    jwtVerify: vi.fn()
}));

import { decodeProtectedHeader, jwtVerify } from 'jose';

// Helper to create a valid JWT token for testing (for mock purposes)
function createTestToken(email: string, exp?: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        email,
        sub: 'user-id-123',
        exp: exp || Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test.supabase.co/auth/v1',
        aud: 'authenticated'
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
            ENVIRONMENT: 'test',
            ADMIN_EMAILS: 'admin@example.com,test-admin@example.com'
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

        // Reset mocks before each test
        vi.mocked(decodeProtectedHeader).mockReset();
        vi.mocked(jwtVerify).mockReset();
    });

    it('should allow requests from admin users', async () => {
        const adminToken = createTestToken('admin@example.com'); // Must match ADMIN_EMAILS

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${adminToken}`;
            return null;
        };

        let userSet = null;
        mockContext.set = (key: string, value: any) => {
            if (key === 'user') userSet = value;
        };

        // Mock jose functions to simulate successful verification
        vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'HS256' });
        vi.mocked(jwtVerify).mockResolvedValue({
            payload: {
                email: 'admin@example.com',
                sub: 'user-id-123',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000),
                iss: 'https://test.supabase.co/auth/v1',
                aud: 'authenticated'
            }
        });

        const nextMock = async () => {};
        await adminAuth(mockContext, nextMock);

        // Should set user context
        expect(userSet).toBeTruthy();
        expect(userSet.email).toBe('admin@example.com');
        expect(decodeProtectedHeader).toHaveBeenCalledWith(adminToken);
        expect(jwtVerify).toHaveBeenCalled();
    });

    it('should block requests from non-admin users', async () => {
        const userToken = createTestToken('user@example.com');

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${userToken}`;
            return null;
        };

        // Mock jose functions to simulate successful verification but non-admin email
        vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'HS256' });
        vi.mocked(jwtVerify).mockResolvedValue({
            payload: {
                email: 'user@example.com',
                sub: 'user-id-456',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000),
                iss: 'https://test.supabase.co/auth/v1',
                aud: 'authenticated'
            }
        });

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

        // Mock jose functions to throw error for invalid token
        vi.mocked(decodeProtectedHeader).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        const nextMock = async () => {};
        const result = await adminAuth(mockContext, nextMock);

        // Should return 401 for invalid token
        expect(result.status).toBe(401);
        expect(result.data.error.code).toBe('unauthorized');
        expect(result.data.error.message).toContain('Invalid or expired token');
    });

    it('should reject expired tokens', async () => {
        // Create expired token (exp in the past)
        const expiredToken = createTestToken('admin@example.com', Math.floor(Date.now() / 1000) - 3600);

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${expiredToken}`;
            return null;
        };

        // Mock jose functions to throw error for expired token
        vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'HS256' });
        vi.mocked(jwtVerify).mockRejectedValue(new Error('Token expired'));

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
            iat: Math.floor(Date.now() / 1000),
            iss: 'https://test.supabase.co/auth/v1',
            aud: 'authenticated'
            // No email field
        }));
        const signature = btoa('test-signature');
        const tokenNoEmail = `${header}.${payload}.${signature}`;

        mockContext.req.header = (name: string) => {
            if (name === 'Authorization') return `Bearer ${tokenNoEmail}`;
            return null;
        };

        // Mock jose functions to return payload without email
        vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'HS256' });
        vi.mocked(jwtVerify).mockResolvedValue({
            payload: {
                sub: 'user-id-123',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000),
                iss: 'https://test.supabase.co/auth/v1',
                aud: 'authenticated'
                // No email field
            }
        });

        const nextMock = async () => {};
        const result = await adminAuth(mockContext, nextMock);

        // Should return 401 for missing email
        expect(result.status).toBe(401);
        expect(result.data.error.code).toBe('unauthorized');
        expect(result.data.error.message).toContain('missing email');
    });
});
