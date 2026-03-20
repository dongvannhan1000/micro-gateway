'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

type AlertScope = 'project' | 'key';

interface AlertRule {
  id: string;
  type: string;
  scope: AlertScope;
  gateway_key_id?: string;
  threshold?: number;
  action: string;
  target?: string;
  is_enabled: boolean;
}

interface GatewayKey {
  id: string;
  name: string;
  current_month_usage_usd: number;
  monthly_limit_usd: number;
}

interface AlertsTabProps {
  projectId: string;
  token: string;
}

export function AlertsTab({ projectId, token }: AlertsTabProps) {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [type, setType] = useState<'cost_threshold' | 'injection_detected'>('cost_threshold');
  const [scope, setScope] = useState<AlertScope>('project');
  const [gatewayKeyId, setGatewayKeyId] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('10');
  const [action, setAction] = useState<'email' | 'webhook'>('email');
  const [target, setTarget] = useState<string>('');

  useEffect(() => {
    fetchAlerts();
    fetchGatewayKeys();
  }, [projectId]);

  async function fetchAlerts() {
    try {
      const response = await fetch(`/api/projects/${projectId}/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchGatewayKeys() {
    try {
      const response = await fetch(`/api/projects/${projectId}/gateway-keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch keys:', error);
    }
  }

  async function handleCreateAlert(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!scope || (scope === 'key' && !gatewayKeyId)) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          scope,
          gateway_key_id: scope === 'key' ? gatewayKeyId : null,
          threshold: type === 'cost_threshold' ? parseFloat(threshold) : 0,
          action,
          target
        })
      });

      if (response.ok) {
        await fetchAlerts();
        setShowCreateForm(false);
        // Reset form
        setScope('project');
        setGatewayKeyId('');
        setThreshold('10');
        setTarget('');
      } else {
        const error = await response.json();
        alert(`Failed to create alert: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('Failed to create alert');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAlert(alertId: string) {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
      alert('Failed to delete alert');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
        <span className="ml-3 text-muted">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient mb-1">Alert Rules</h2>
          <p className="text-sm text-muted">
            Configure cost and security alerts for your project
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary px-6 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateAlert} className="glass-card border-glass-border/40 p-6 space-y-4">
          <h3 className="font-semibold text-lg">Create Alert Rule</h3>

          {/* Alert Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-widest">
              Alert Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="input-field bg-background/30"
              required
            >
              <option value="cost_threshold">Cost Threshold</option>
              <option value="injection_detected">Prompt Injection Detected</option>
            </select>
          </div>

          {/* Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
              Alert Scope <span className="text-red-400">*</span>
            </label>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as AlertScope);
                if (e.target.value === 'project') {
                  setGatewayKeyId('');
                }
              }}
              className="input-field bg-background/30"
              required
            >
              <option value="project">Project Level (All Keys)</option>
              <option value="key">Specific Gateway Key</option>
            </select>
            <p className="text-xs text-muted">
              {scope === 'project'
                ? 'Alert will trigger based on total usage across ALL gateway keys in this project'
                : 'Alert will trigger based on usage of a specific gateway key'}
            </p>
          </div>

          {/* Key Selector (conditional) */}
          {scope === 'key' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                Select Gateway Key <span className="text-red-400">*</span>
              </label>
              <select
                value={gatewayKeyId}
                onChange={(e) => setGatewayKeyId(e.target.value)}
                className="input-field bg-background/30"
                required
              >
                <option value="">Select a key...</option>
                {keys.map((key) => (
                  <option
                    key={key.id}
                    value={key.id}
                    title={`Spent: $${key.current_month_usage_usd.toFixed(2)} / Limit: $${key.monthly_limit_usd}`}
                  >
                    {key.name} (${key.current_month_usage_usd.toFixed(2)} / ${key.monthly_limit_usd})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Threshold (only for cost_threshold) */}
          {type === 'cost_threshold' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                Cost Threshold (USD) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="input-field bg-background/30"
                required
              />
            </div>
          )}

          {/* Action */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-widest">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as any)}
              className="input-field bg-background/30"
              required
            >
              <option value="email">Send Email</option>
              <option value="webhook">Webhook (Coming Soon)</option>
            </select>
          </div>

          {/* Target (email) */}
          {action === 'email' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="input-field bg-background/30"
                placeholder="admin@example.com"
                required
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving || !scope || (scope === 'key' && !gatewayKeyId)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Alert'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-secondary flex-1"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="glass-card border-glass-border/40 p-12 text-center">
          <Bell className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
          <p className="text-muted font-medium">No alert rules configured</p>
          <p className="text-sm text-muted mt-2">
            Create an alert to get notified about cost thresholds or security events
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-card border-glass-border/40 p-4 flex items-start justify-between hover:border-accent-blue/30 transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <AlertTriangle className="w-4 h-4 text-accent-blue" />
                  <span className="font-semibold">
                    {alert.type === 'cost_threshold' ? 'Cost Threshold' : 'Prompt Injection'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    alert.scope === 'project'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {alert.scope === 'project' ? 'Project Level' : 'Key Level'}
                  </span>
                  {!alert.is_enabled && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">
                  {alert.type === 'cost_threshold'
                    ? `Alert when spending exceeds $${alert.threshold}`
                    : 'Alert on high-risk prompt injection attempts'}
                  {alert.scope === 'key' && ` (Specific key)`}
                </p>
                {alert.action === 'email' && (
                  <p className="text-xs text-muted mt-1">
                    Notify: {alert.target}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDeleteAlert(alert.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-400/10 rounded-lg"
                title="Delete alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
