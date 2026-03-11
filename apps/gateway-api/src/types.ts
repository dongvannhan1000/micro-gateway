import { Project, GatewayKey } from '@ms-gateway/db';

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
    user?: {
        id: string;
        email?: string;
    };
    project?: Project;
    gatewayKey?: GatewayKey;
    promptInjectionScore?: number;
    anomalyDetected?: boolean;
}
