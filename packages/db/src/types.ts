export interface Project {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    model_aliases?: string; // JSON string: Record<string, string>
    created_at: string;
    updated_at: string;
    // Aggregated stats
    total_requests?: number;
    total_cost?: number;
    avg_latency?: number | null;
    security_events?: number;
}

export interface GatewayKey {
    id: string;
    project_id: string;
    key_hash: string;
    key_hint: string;
    name: string;
    status: 'active' | 'revoked';
    monthly_limit_usd: number;
    current_month_usage_usd: number;
    rate_limit_per_min: number;
    rate_limit_per_day: number;
    created_at: string;
    revoked_at?: string;
}

export interface ProviderConfig {
    id: string;
    project_id: string;
    provider: 'openai' | 'anthropic' | 'google';
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
