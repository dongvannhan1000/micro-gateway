import { Hono } from 'hono';
import { Env, Variables } from '../../types';
import { profileRouter } from './profile';
import { preferencesRouter } from './preferences';
import { securityRouter } from './security';
import { billingRouter } from './billing';

const userSettings = new Hono<{ Bindings: Env; Variables: Variables }>();

// Mount sub-routers
userSettings.route('/', profileRouter);
userSettings.route('/', preferencesRouter);
userSettings.route('/', securityRouter);
userSettings.route('/', billingRouter);

export { userSettings as userSettingsRouter };
