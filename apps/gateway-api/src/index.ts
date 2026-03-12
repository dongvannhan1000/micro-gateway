import { Hono } from 'hono';
import { Env, Variables } from './types';
import { gatewayRouter } from './gateway';
import { managementRouter } from './management';
import { injectDatabase } from './middleware/inject-db';
import { scheduled } from './cron/monthly-reset';

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

// Security Headers Middleware
app.use('*', async (c, next) => {
  await next();

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');

  // Enforce HTTPS for 1 year including subdomains
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Prevent XSS and data injection
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");

  // Enable XSS filter (legacy browsers)
  c.header('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable browser features
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
});

app.get('/health', (c) => c.json({
  status: 'ok',
  environment: c.env.ENVIRONMENT,
  timestamp: new Date().toISOString()
}));

// Mount Routers
app.route('/v1', gatewayRouter);      // OpenAI-compatible Proxy
app.route('/api', managementRouter);  // Internal Management API

// Export default app for HTTP requests
export default app;

// Export scheduled handler for Cloudflare Workers Cron Triggers
// This will be invoked by the cron schedule defined in wrangler.toml
export { scheduled };


