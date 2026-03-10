import { Hono } from 'hono';
import { Env, Variables } from './types';
import { gatewayRouter } from './gateway';
import { managementRouter } from './management';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Basic Health Check (Following User Rules for logging/output)
app.get('/', (c) => {
  return c.text(`[Nest] [GatewayService] Action: Server check (v1.0.0 Status: Ready)`);
});

app.get('/health', (c) => c.json({
  status: 'ok',
  environment: c.env.ENVIRONMENT,
  timestamp: new Date().toISOString()
}));

// Mount Routers
app.route('/v1', gatewayRouter);      // OpenAI-compatible Proxy
app.route('/api', managementRouter);  // Internal Management API

export default app;
