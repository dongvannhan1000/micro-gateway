import { Hono } from 'hono';
import { z } from 'zod';
import { Env, Variables } from '../../types';

const billing = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/management/user/usage
billing.get('/usage', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;
  const period = c.req.query('period') || 'month';
  const projectId = c.req.query('project_id');

  // Validate period parameter
  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period)) {
    return c.json({
      error: 'Invalid period',
      message: 'Period must be one of: day, week, month, year'
    }, 400);
  }

  try {
    const usage = await repos.userUsage.getMetrics(user.id, {
      period: period as any,
      projectId
    });

    return c.json(usage);
  } catch (error) {
    console.error('[Billing] Failed to fetch usage:', error);
    return c.json({
      error: 'Failed to fetch usage',
      message: 'An error occurred while retrieving your usage metrics'
    }, 500);
  }
});

// GET /api/management/user/billing/history
billing.get('/billing/history', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;
  const limit = Math.min(parseInt(c.req.query('limit') || '12'), 24);
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await repos.userBilling.getInvoices(user.id, {
      limit,
      offset
    });

    return c.json(result);
  } catch (error) {
    console.error('[Billing] Failed to fetch billing history:', error);
    return c.json({
      error: 'Failed to fetch billing history',
      message: 'An error occurred while retrieving your billing history'
    }, 500);
  }
});

// GET /api/management/user/billing/invoices/:id
billing.get('/billing/invoices/:id', async (c) => {
  const user = c.get('user')!;
  const invoiceId = c.req.param('id');

  try {
    // TODO: Implement PDF generation
    // For now, return a placeholder response
    return c.json({
      error: 'Not implemented',
      message: 'Invoice PDF generation is not yet implemented'
    }, 501);

    // Future implementation:
    // const pdfBuffer = await repos.userBilling.generateInvoicePDF(invoiceId, user.id);
    // if (!pdfBuffer) {
    //   return c.json({ error: 'Invoice not found' }, 404);
    // }
    //
    // c.header('Content-Type', 'application/pdf');
    // c.header('Content-Disposition', `attachment; filename="invoice_${invoiceId}.pdf"`);
    // return c.body(pdfBuffer);
  } catch (error) {
    console.error('[Billing] Failed to generate invoice:', error);
    return c.json({
      error: 'Failed to generate invoice',
      message: 'An error occurred while generating the invoice'
    }, 500);
  }
});

// GET /api/management/user/quotas
billing.get('/quotas', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    // Get user data to check trial limits
    const userData = await repos.userProfile.findById(user.id);

    if (!userData) {
      return c.json({
        error: 'User not found',
        message: 'Unable to retrieve user information'
      }, 404);
    }

    // Get project count
    const projects = await repos.project.findAllByUser(user.id);
    const projectCount = projects.length;

    // Get gateway key count
    const gatewayKeys = await repos.gatewayKey.findAllByUser(user.id);
    const keyCount = gatewayKeys.length;

    // Calculate monthly usage from request logs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get usage metrics for current month
    const usageData = await repos.userUsage.getMetrics(user.id, {
      period: 'month'
    });

    // Free tier limits
    const freeTierLimits = {
      projects: 2,
      gateway_keys: 3,
      monthly_requests: 10000,
      monthly_spend_usd: 10.00
    };

    // Calculate remaining quotas
    const projectRemaining = Math.max(0, freeTierLimits.projects - projectCount);
    const keyRemaining = Math.max(0, freeTierLimits.gateway_keys - keyCount);

    // Get current month usage
    const currentRequests = usageData.summary.total_requests || 0;
    const currentSpend = usageData.summary.total_cost_usd || 0;

    const requestRemaining = Math.max(0, freeTierLimits.monthly_requests - currentRequests);
    const spendRemaining = Math.max(0, freeTierLimits.monthly_spend_usd - currentSpend);

    // Calculate reset date (first day of next month)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Generate usage warnings
    const warnings: any[] = [];

    if (projectRemaining === 0) {
      warnings.push({
        type: 'project_limit',
        message: 'You\'ve reached your project limit. Upgrade to create more projects.',
        severity: 'error'
      });
    } else if (projectRemaining === 1) {
      warnings.push({
        type: 'project_limit',
        message: 'You\'re approaching your project limit. Only 1 project remaining.',
        severity: 'warning'
      });
    }

    if (keyRemaining === 0) {
      warnings.push({
        type: 'key_limit',
        message: 'You\'ve reached your gateway key limit. Upgrade to create more keys.',
        severity: 'error'
      });
    } else if (keyRemaining === 1) {
      warnings.push({
        type: 'key_limit',
        message: 'You\'re approaching your gateway key limit. Only 1 key remaining.',
        severity: 'warning'
      });
    }

    if (currentRequests > freeTierLimits.monthly_requests) {
      warnings.push({
        type: 'monthly_requests',
        message: 'You\'ve exceeded your monthly request limit. Consider upgrading.',
        severity: 'warning'
      });
    } else if (currentRequests > freeTierLimits.monthly_requests * 0.8) {
      warnings.push({
        type: 'monthly_requests',
        message: 'You\'ve used 80% of your monthly request limit.',
        severity: 'warning'
      });
    }

    if (currentSpend > freeTierLimits.monthly_spend_usd * 0.8) {
      warnings.push({
        type: 'monthly_spend',
        message: `You've used 80% of your monthly spend limit ($${currentSpend.toFixed(2)} of $${freeTierLimits.monthly_spend_usd}).`,
        severity: 'warning'
      });
    }

    const response = {
      tier: 'free',
      limits: {
        projects: {
          max: freeTierLimits.projects,
          current: projectCount,
          remaining: projectRemaining
        },
        gateway_keys: {
          max: freeTierLimits.gateway_keys,
          current: keyCount,
          remaining: keyRemaining
        },
        monthly_requests: {
          max: freeTierLimits.monthly_requests,
          current: currentRequests,
          remaining: requestRemaining,
          reset_date: resetDate.toISOString()
        },
        monthly_spend_usd: {
          max: freeTierLimits.monthly_spend_usd,
          current: currentSpend,
          remaining: spendRemaining,
          reset_date: resetDate.toISOString()
        }
      },
      usage_warnings: warnings
    };

    return c.json(response);
  } catch (error) {
    console.error('[Billing] Failed to fetch quotas:', error);
    return c.json({
      error: 'Failed to fetch quotas',
      message: 'An error occurred while retrieving your quota information'
    }, 500);
  }
});

export { billing as billingRouter };
