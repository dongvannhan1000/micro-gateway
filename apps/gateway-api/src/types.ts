import { Project, ApiKey } from '@ms-gateway/db';

export interface Env {
    DB: D1Database;
    RATE_LIMIT_KV: KVNamespace;
    ENVIRONMENT: string;
    SUPABASE_URL: string;
    SUPABASE_JWT_SECRET: string;
    ENCRYPTION_SECRET: string; // Used for encrypting/decrypting provider keys
}

export interface Variables {
    user?: {
        id: string;
        email?: string;
    };
    project?: Project;
    apiKey?: ApiKey;
}
