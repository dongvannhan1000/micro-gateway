import { Project, GatewayKey } from '@ms-gateway/db';
import { Repositories } from './repositories';

export interface Env {
    DB: D1Database;
    RATE_LIMIT_KV: KVNamespace;
    ENVIRONMENT: string;
    SUPABASE_URL: string;
    SUPABASE_JWT_SECRET: string;
    ENCRYPTION_SECRET: string; // Used for encrypting/decrypting provider keys
    RESEND_API_KEY: string;
}

export interface Variables {
    correlationId?: string; // Request tracing ID
    user?: {
        id: string;
        email?: string;
    };
    project?: Project;
    gatewayKey?: GatewayKey;
    repos?: Repositories;
    promptInjectionScore?: number;
    anomalyDetected?: boolean;
    responseBody?: any; // Captured response for logging
    piiScrubbingConfig?: { // PII scrubbing configuration
        enabled: boolean;
        level: 'low' | 'medium' | 'high';
        customPatterns?: Array<{ name: string; pattern: string; flags?: string }>;
    };
    piiRawRequest?: string; // Raw request body for lazy scrubbing
    piiRawResponse?: string; // Raw response body for lazy scrubbing
}

