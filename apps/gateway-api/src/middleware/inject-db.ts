import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { D1Adapter, createRepositories } from '../repositories';

/**
 * Middleware to inject Repository instances into Hono context.
 * Creates a D1Adapter and all repositories from c.env.DB once per request.
 */
export async function injectDatabase(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const adapter = new D1Adapter(c.env.DB);
    c.set('repos', createRepositories(adapter));
    await next();
}
