import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { Project } from '@ms-gateway/db';

/**
 * PII Scrubbing Configuration
 */
interface PIIScrubbingConfig {
    enabled: boolean;
    level: 'low' | 'medium' | 'high';
    customPatterns?: Array<{ name: string; pattern: string; flags?: string }>;
}

/**
 * PII Pattern Definition
 */
interface PIIPattern {
    name: string;
    pattern: RegExp;
    mask: (match: string) => string;
    level: 'low' | 'medium' | 'high';
}

/**
 * PII Scrubbing Result
 */
interface PIIScrubbingResult {
    scrubbedContent: string;
    scrubbedCount: number;
    details: Array<{ type: string; count: number }>;
}

/**
 * PII Scrubbing Middleware
 * Captures raw request/response data for later scrubbing during log
 * This avoids scrubbing overhead if the request fails before logging
 */
export async function piiScrubber(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const project = c.get('project') as Project | undefined;

    if (!project) {
        await next();
        return;
    }

    // Check if PII scrubbing is enabled for this project
    const config: PIIScrubbingConfig = {
        enabled: project.pii_scrubbing_enabled !== 0, // Default enabled
        level: project.pii_scrubbing_level || 'medium',
        customPatterns: project.pii_custom_patterns ? JSON.parse(project.pii_custom_patterns) : undefined
    };

    if (!config.enabled) {
        await next();
        return;
    }

    // Capture RAW request body (NOT scrubbed yet - lazy scrubbing)
    const requestBody = await c.req.json().catch(() => ({}));
    const rawRequestBody = JSON.stringify(requestBody);

    // Store config and raw data in context for later scrubbing
    c.set('piiScrubbingConfig', config);
    c.set('piiRawRequest', rawRequestBody);

    await next();

    // Capture RAW response body (NOT scrubbed yet)
    const responseBody = c.get('responseBody');
    if (responseBody) {
        c.set('piiRawResponse', JSON.stringify(responseBody));
    }
}

/**
 * Scrub PII from content using configured patterns
 */
export function scrubPII(content: string, config: PIIScrubbingConfig): PIIScrubbingResult {
    let scrubbedContent = content;
    let totalScrubbed = 0;
    const details: Array<{ type: string; count: number }> = [];

    // If disabled, return original content without scrubbing
    if (!config.enabled) {
        return {
            scrubbedContent: content,
            scrubbedCount: 0,
            details: []
        };
    }

    // Get patterns based on scrubbing level
    const patterns = getPatternsForLevel(config.level);

    // Add custom patterns if provided
    if (config.customPatterns) {
        for (const custom of config.customPatterns) {
            patterns.push({
                name: custom.name,
                pattern: new RegExp(custom.pattern, custom.flags || 'gi'),
                mask: (match) => '*'.repeat(Math.min(match.length, 8)),
                level: 'medium' // Custom patterns use medium level
            });
        }
    }

    // Apply each pattern
    for (const piiPattern of patterns) {
        const matches = scrubbedContent.match(piiPattern.pattern);
        const count = matches ? matches.length : 0;

        if (count > 0) {
            scrubbedContent = scrubbedContent.replace(piiPattern.pattern, piiPattern.mask);
            totalScrubbed += count;
            details.push({ type: piiPattern.name, count });
        }
    }

    return {
        scrubbedContent,
        scrubbedCount: totalScrubbed,
        details
    };
}

/**
 * Get PII patterns based on scrubbing level
 */
function getPatternsForLevel(level: 'low' | 'medium' | 'high'): PIIPattern[] {
    const basePatterns: PIIPattern[] = [
        {
            name: 'email',
            pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
            mask: (email) => {
                const [local, domain] = email.split('@');
                if (local.length <= 4) {
                    return `${local.charAt(0)}***@${domain}`;
                }
                const maskedLocal = local.charAt(0) + '***' + local.slice(-1);
                return `${maskedLocal}@${domain}`;
            },
            level: 'low'
        },
        {
            name: 'phone',
            pattern: /\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b/g,
            mask: (phone) => {
                const digits = phone.replace(/\D/g, '');
                if (digits.length === 10) {
                    return `+***-***-${digits.slice(-4)}`;
                }
                return phone.replace(/\d(?=.{4})/g, '*');
            },
            level: 'low'
        },
        {
            name: 'ssn',
            pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
            mask: () => '***-**-****',
            level: 'low'
        },
        {
            name: 'credit_card',
            pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b|\b(?:4[0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}|5[1-5][0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4})\b/g,
            mask: (card) => {
                const digits = card.replace(/\D/g, '');
                if (digits.length >= 13) {
                    return `${digits.slice(0, 4)}${'*'.repeat(Math.max(digits.length - 8, 4))}${digits.slice(-4)}`;
                }
                return '****-****-****-****';
            },
            level: 'low'
        },
        {
            name: 'api_key',
            pattern: /\b(sk-[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,}|gho_[a-zA-Z0-9]{36,}|ghu_[a-zA-Z0-9]{36,}|AKIA[0-9A-Z]{16})\b/g,
            mask: (key) => {
                if (key.startsWith('sk-')) {
                    const prefix = key.slice(0, 3);
                    const suffix = key.slice(-3);
                    const maskedLength = Math.min(key.length - 6, 20);
                    return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
                }
                return `${key.slice(0, 4)}${'*'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
            },
            level: 'medium'
        },
        {
            name: 'bearer_token',
            pattern: /Bearer\s+([a-zA-Z0-9\-._~+/]+=*)/gi,
            mask: () => 'Bearer ***REDACTED***',
            level: 'medium'
        },
        {
            name: 'ipv4',
            pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
            mask: (ip) => {
                const parts = ip.split('.');
                return `${parts[0]}.${parts[1]}.***.***`;
            },
            level: 'medium'
        },
        {
            name: 'ipv6',
            pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
            mask: () => '****:****:****:****:****:****:****:****',
            level: 'medium'
        },
        {
            name: 'jwt_token',
            pattern: /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
            mask: (jwt) => {
                const parts = jwt.split('.');
                return `${parts[0]}.***.***`;
            },
            level: 'medium'
        },
        {
            name: 'aws_key_id',
            pattern: /\bAKIA[0-9A-Z]{16}\b/g,
            mask: () => 'AKIA****************',
            level: 'medium'
        },
        {
            name: 'secret_key',
            pattern: /\b(secret[_-]?key|apikey|api[_-]?key|password|pass|pwd)[\s=:]+[^\s"'`<>]{8,}\b/gi,
            mask: (match) => {
                const [key, ...valueParts] = match.split(/[\s=:]+/);
                return `${key}=${'*'.repeat(8)}`;
            },
            level: 'high'
        },
        {
            name: 'json_sensitive',
            pattern: /"(?:password|secret|token|api_key|credit_card|ssn|social_security)"\s*:\s*"[^"]*"/gi,
            mask: (match) => {
                const [key] = match.split(':');
                return `${key}: "***REDACTED***"`;
            },
            level: 'high'
        },
        {
            name: 'url_with_credentials',
            pattern: /\bhttps?:\/\/[^\s:"<>]*:[^\s@"<>]*@[^\s/"<>]+\.[^\s/"<>]+\b/gi,
            mask: (url) => {
                return url.replace(/:\/\/[^:@]+:[^@]+@/, '://***:***@');
            },
            level: 'high'
        },
        {
            name: 'json_web_key',
            pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
            mask: () => '-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----',
            level: 'high'
        },
        {
            name: 'generic_sensitive_data',
            pattern: /\b(?:user(?:_?\s?id)|employee(?:_?\s?id)|account(?:_?\s?number))[\s=:]+\d{5,}\b/gi,
            mask: (match) => {
                const [key, ...valueParts] = match.split(/[\s=:]+/);
                const value = valueParts.join('');
                if (value.length <= 2) {
                    return `${key.trim()}=***`;
                }
                return `${key.trim()}=${value.charAt(0)}${'*'.repeat(Math.min(value.length - 2, 6))}${value.slice(-1)}`;
            },
            level: 'high'
        }
    ];

    // Filter patterns based on level
    return basePatterns.filter(p => {
        if (level === 'low') return p.level === 'low';
        if (level === 'medium') return p.level === 'low' || p.level === 'medium';
        return true; // High includes all
    });
}

/**
 * Extract and scrub PII from context
 * This performs lazy scrubbing only when logging
 */
export function scrubPIIForLogging(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const config = c.get('piiScrubbingConfig') as PIIScrubbingConfig | undefined;
    const rawRequest = c.get('piiRawRequest') as string | undefined;
    const rawResponse = c.get('piiRawResponse') as string | undefined;

    if (!config || !config.enabled) {
        return {
            requestScrubbed: undefined,
            responseScrubbed: undefined,
            requestCount: 0,
            responseCount: 0,
            totalScrubbed: 0
        };
    }

    let requestScrubbed: string | undefined;
    let responseScrubbed: string | undefined;
    let requestCount = 0;
    let responseCount = 0;

    // Scrub request if present
    if (rawRequest) {
        const requestResult = scrubPII(rawRequest, config);
        requestScrubbed = requestResult.scrubbedContent;
        requestCount = requestResult.scrubbedCount;
    }

    // Scrub response if present
    if (rawResponse) {
        const responseResult = scrubPII(rawResponse, config);
        responseScrubbed = responseResult.scrubbedContent;
        responseCount = responseResult.scrubbedCount;
    }

    const totalScrubbed = requestCount + responseCount;

    // Log scrubbing activity
    if (totalScrubbed > 0) {
        console.log(`[Gateway] [PIIScrubber] Scrubbed ${totalScrubbed} PII items (level: ${config.level})`);
    }

    return {
        requestScrubbed,
        responseScrubbed,
        requestCount,
        responseCount,
        totalScrubbed
    };
}
