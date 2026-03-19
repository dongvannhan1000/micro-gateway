export interface Project {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    model_aliases?: string; // JSON string: Record<string, string>
    pii_scrubbing_enabled?: number; // Boolean (0/1 for SQLite compatibility)
    pii_scrubbing_level?: 'low' | 'medium' | 'high';
    pii_custom_patterns?: string; // JSON string: Custom regex patterns
    created_at: string;
    updated_at: string;
    // Aggregated stats
    total_requests?: number;
    total_cost?: number;
    avg_latency?: number | null;
    security_events?: number;
    // Tier system for bulkhead concurrent request limits
    tier?: 'free' | 'pro' | 'custom';      // NEW (optional for backward compatibility)
    concurrent_limit?: number;             // NEW (optional for backward compatibility)
}

export interface GatewayKey {
    id: string;
    project_id: string;
    key_hash: string;
    key_hint: string;
    name: string;
    status: 'active' | 'revoked';
    monthly_limit_usd: number;  // Default: 10 (Free tier)
    current_month_usage_usd: number;
    rate_limit_per_min: number;  // Default: 30 (Free tier)
    rate_limit_per_day: number;  // Default: 3000 (Free tier)
    created_at: string;
    revoked_at?: string;
}

export interface ProviderConfig {
    id: string;
    project_id: string;
    provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'groq' | 'together';
    api_key_encrypted: string;
    is_default: boolean;
    created_at: string;
}

export interface RequestLog {
    id: string;
    project_id: string;
    gateway_key_id: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    latency_ms: number;
    status_code: number;
    prompt_injection_score?: number;
    request_id: string;
    ip_address?: string;
    user_agent?: string;
    pii_scrubbed_count?: number; // Number of PII items scrubbed
    pii_scrubbing_level?: string; // Scrubbing level used
    request_body_scrubbed?: string; // Scrubbed request body
    response_body_scrubbed?: string; // Scrubbed response body
    created_at: string;
}

export interface AlertRule {
    id: string;
    project_id: string;
    type: 'cost_threshold' | 'injection_detected' | 'rate_limit_hit';
    threshold?: number;
    action: 'email' | 'webhook' | 'block';
    target?: string;
    is_enabled: boolean;
    created_at: string;
}

export interface AlertHistory {
    id: string;
    project_id: string;
    rule_id: string;
    message: string;
    triggered_at: string;
}

export interface ModelPricing {
    id: string;
    provider: string;
    model_id: string;
    mode: 'chat' | 'embedding' | 'image_generation';
    input_per_1m: number;
    output_per_1m: number;
    output_per_image: number;
    max_input_tokens?: number;
    max_output_tokens?: number;
    is_custom: number;
    updated_at: string;
}

// ============================================================
// SETTINGS SYSTEM TYPES
// ============================================================

export interface User {
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    location?: string;
    timezone?: string;
    language?: string;
    trial_start_date?: string;
    trial_requests_used?: number;
    trial_max_requests?: number;
    profile_updated_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface UserPreferences {
    id: string;
    user_id: string;
    email_notifications_enabled: number; // Boolean (0/1)
    usage_alert_threshold: number; // Percentage (0-100)
    security_alerts_enabled: number; // Boolean (0/1)
    weekly_report_enabled: number; // Boolean (0/1)
    notification_categories?: string; // JSON: {"security": true, "billing": true}
    theme: 'light' | 'dark' | 'system';
    date_format: 'ISO' | 'US' | 'EU';
    time_format: '12h' | '24h';
    created_at: string;
    updated_at: string;
}

export interface UserSession {
    id: string;
    user_id: string;
    session_token: string;
    device_type?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    device_name?: string;
    browser?: string; // chrome, firefox, safari, edge
    os?: string; // windows, macos, linux, ios, android
    ip_address?: string;
    user_agent?: string;
    last_active: string;
    is_active: number; // Boolean (0/1)
    created_at: string;
    expires_at: string;
}

export interface UserTwoFactor {
    id: string;
    user_id: string;
    method: 'totp' | 'sms' | 'email' | 'none';
    secret?: string; // Encrypted
    phone?: string; // Encrypted
    backup_codes?: string; // JSON array of encrypted codes
    is_enabled: number; // Boolean (0/1)
    verified_at?: string;
    created_at: string;
    updated_at: string;
}

export interface SecurityAuditLog {
    id: string;
    user_id: string;
    event_type: string;
    event_category: 'auth' | 'security' | 'billing' | 'settings' | 'api';
    description?: string;
    metadata?: string; // JSON
    severity: 'info' | 'warning' | 'critical';
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface UsageMetrics {
    id: string;
    user_id: string;
    project_id?: string;
    date: string; // YYYY-MM-DD
    provider?: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'groq' | 'together';
    api_calls: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    avg_latency_ms?: number;
    success_requests: number;
    error_requests: number;
    created_at: string;
    updated_at: string;
}

export interface BillingHistory {
    id: string;
    user_id: string;
    invoice_id: string;
    period_start: string; // YYYY-MM-DD
    period_end: string; // YYYY-MM-DD
    subtotal_usd: number;
    tax_usd: number;
    total_usd: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    invoice_url?: string;
    payment_method?: string;
    line_items?: string; // JSON
    created_at: string;
    paid_at?: string;
}

export interface UsageQuota {
    id: string;
    user_id: string;
    quota_type: 'api_calls' | 'tokens' | 'cost' | 'projects' | 'keys';
    limit_value: number;
    current_value: number;
    period_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'lifetime';
    reset_date?: string; // YYYY-MM-DD
    tier: 'free' | 'pro' | 'enterprise';
    created_at: string;
    updated_at: string;
}

export interface NotificationHistory {
    id: string;
    user_id: string;
    notification_type: 'email' | 'webhook' | 'in_app';
    category: 'security' | 'billing' | 'usage' | 'system';
    subject?: string;
    message: string;
    metadata?: string; // JSON
    status: 'pending' | 'sent' | 'failed' | 'bounced';
    retry_count: number;
    sent_at?: string;
    created_at: string;
}

export interface WebhookIntegration {
    id: string;
    user_id: string;
    name: string;
    url: string;
    secret?: string;
    events?: string; // JSON array
    is_active: number; // Boolean (0/1)
    last_triggered_at?: string;
    failure_count: number;
    created_at: string;
    updated_at: string;
}

// ============================================================
// VIEW TYPES (Aggregated Data)
// ============================================================

export interface UserProfileSummary {
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    company?: string;
    location?: string;
    timezone?: string;
    language?: string;
    profile_updated_at?: string;
    email_notifications_enabled?: number;
    security_alerts_enabled?: number;
    theme?: string;
    total_projects: number;
    total_keys: number;
}

export interface UserUsageSummary {
    user_id: string;
    date: string;
    total_api_calls: number;
    total_tokens: number;
    total_cost_usd: number;
    total_success: number;
    total_errors: number;
}

export interface RecentSecurityEvent {
    user_id: string;
    event_type: string;
    event_category: string;
    description?: string;
    severity: 'info' | 'warning' | 'critical';
    created_at: string;
}

export interface ActiveSession {
    id: string;
    user_id: string;
    device_name?: string;
    ip_address?: string;
    last_active: string;
    created_at: string;
    email: string;
}

// ============================================================
// HELPER TYPES FOR API REQUESTS/RESPONSES
// ============================================================

export interface UpdateUserProfileRequest {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    location?: string;
    timezone?: string;
    language?: string;
}

export interface UpdateUserPreferencesRequest {
    email_notifications_enabled?: boolean;
    usage_alert_threshold?: number;
    security_alerts_enabled?: boolean;
    weekly_report_enabled?: boolean;
    notification_categories?: Record<string, boolean>;
    theme?: 'light' | 'dark' | 'system';
    date_format?: 'ISO' | 'US' | 'EU';
    time_format?: '12h' | '24h';
}

export interface NotificationCategories {
    security: boolean;
    billing: boolean;
    usage: boolean;
    system: boolean;
}

export interface UsageStats {
    today: {
        api_calls: number;
        tokens: number;
        cost_usd: number;
    };
    this_month: {
        api_calls: number;
        tokens: number;
        cost_usd: number;
    };
    this_year: {
        api_calls: number;
        tokens: number;
        cost_usd: number;
    };
}
