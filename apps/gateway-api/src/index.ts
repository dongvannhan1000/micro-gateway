import { Hono } from 'hono';
import { Env, Variables } from './types';
import { gatewayRouter } from './gateway';
import { managementRouter } from './management';
import { injectDatabase } from './middleware/inject-db';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Basic Health Check (Following User Rules for logging/output)
app.get('/', (c) => {
  return c.text(`[GatewayService] Action: Server check (v1.0.0 Status: Ready)`);
});

// Startup Validation Middleware
let isBootstrapped = false;
app.use('*', async (c, next) => {
    if (!isBootstrapped) {
        const requiredSecrets: (keyof Env)[] = ['SUPABASE_JWT_SECRET', 'ENCRYPTION_SECRET', 'RESEND_API_KEY'];
        const missing = requiredSecrets.filter(s => !c.env[s]);
        
        if (missing.length > 0) {
            console.error(`[GatewayService] Action: bootstrap failed (Metadata: missing_secrets=${missing.join(',')})`);
            return c.json({ 
                error: 'Server configuration error', 
                message: 'Internal configuration is incomplete.' 
            }, 500);
        }
        isBootstrapped = true;
    }
    await next();
});

// Inject Database Repositories (available via c.get('repos'))
app.use('*', injectDatabase);

app.get('/health', (c) => c.json({
  status: 'ok',
  environment: c.env.ENVIRONMENT,
  timestamp: new Date().toISOString()
}));

// Mount Routers
app.route('/v1', gatewayRouter);      // OpenAI-compatible Proxy
app.route('/api', managementRouter);  // Internal Management API

export default app;

