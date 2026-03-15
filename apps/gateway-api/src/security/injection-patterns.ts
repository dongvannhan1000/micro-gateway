/**
 * Prompt Injection Detection Patterns (v3)
 *
 * ⚠️ SECURITY NOTICE - READ BEFORE MODIFYING:
 *
 * These patterns are PUBLIC on GitHub. Sophisticated attackers CAN bypass them using:
 * - Text obfuscation (l33t speak, intentional typos, homoglyphs)
 * - Language variations (non-English languages)
 * - Encoded content (base64, unicode, zero-width characters)
 * - Indirect phrasing ("Tell me about your configuration")
 * - Multi-step attacks (build context gradually)
 *
 * This is a BASIC defense layer, NOT complete protection.
 *
 * For production security, combine with:
 * 1. Rate limiting (prevents brute force pattern discovery)
 * 2. Behavioral analysis (detects attack patterns over time)
 * 3. Response monitoring (checks if injection succeeded)
 * 4. ML-based semantic analysis (detects intent, not just patterns)
 *
 * Self-hosted users can:
 * - Add custom patterns via environment variables
 * - Implement additional detection layers
 * - Use AI-based content analysis
 *
 * Design Principles:
 * - Only include patterns with CLEAR malicious intent (low false-positive risk)
 * - Use severity tiers: 'critical' (auto-block), 'high' (block with 2+ matches), 'medium' (flag only)
 * - Multi-language support (English, Vietnamese, common attack vectors)
 * - Bypass-resistant patterns (match common obfuscation techniques)
 * - Each pattern documents WHY it's malicious and known FP scenarios
 *
 * Pattern Update Policy:
 * - Patterns are updated regularly to address new bypass techniques
 * - Submit PRs for new patterns with justification and test cases
 * - Document false positives when removing patterns
 */

export type Severity = 'critical' | 'high' | 'medium';
export type Category = 'instruction_override' | 'system_extraction' | 'role_hijacking' | 'data_exfiltration' | 'delimiter_attack';

export interface InjectionPattern {
    id: string;
    pattern: RegExp;
    severity: Severity;
    category: Category;
    description: string;
}

export const INJECTION_PATTERNS: InjectionPattern[] = [

    // ─── CRITICAL: Auto-block on single match ───
    // These are almost never used in legitimate prompts.

    {
        id: 'IO-001',
        pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules|directives)/i,
        severity: 'critical',
        category: 'instruction_override',
        description: 'Direct instruction override ("ignore previous instructions")'
    },
    {
        id: 'IO-002',
        pattern: /disregard\s+(all\s+|any\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules|guidelines)/i,
        severity: 'critical',
        category: 'instruction_override',
        description: 'Formal instruction discard'
    },
    {
        id: 'SE-001',
        pattern: /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions|rules)/i,
        severity: 'critical',
        category: 'system_extraction',
        description: 'System prompt extraction attempt'
    },
    {
        id: 'DA-001',
        pattern: /<\/system>/i,
        severity: 'critical',
        category: 'delimiter_attack',
        description: 'Attempt to close system message block'
    },
    {
        id: 'DA-002',
        pattern: /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/i,
        severity: 'critical',
        category: 'delimiter_attack',
        description: 'Chat template delimiter injection (Llama/ChatML)'
    },

    // ─── HIGH: Block when 2+ high/critical patterns match ───
    // These can appear in edge-case legitimate use, but are suspicious.

    {
        id: 'IO-003',
        pattern: /you\s+(must|will|shall|should)\s+(now\s+)?ignore/i,
        severity: 'high',
        category: 'instruction_override',
        description: 'Imperative instruction override'
    },
    {
        id: 'IO-004',
        pattern: /from\s+now\s+on,?\s+(you|your)\s+(are|will|must|new)/i,
        severity: 'high',
        category: 'instruction_override',
        description: 'Instruction set switch attempt'
    },
    {
        id: 'SE-002',
        pattern: /what\s+(are|were)\s+your\s+(original|initial|first|system)\s+(instructions|prompt|rules)/i,
        severity: 'high',
        category: 'system_extraction',
        description: 'Query for original instructions'
    },
    {
        id: 'SE-003',
        pattern: /show\s+me\s+(everything|all|the\s+text)\s+(above|before|in\s+your\s+context)/i,
        severity: 'high',
        category: 'system_extraction',
        description: 'Context window dump attempt'
    },
    {
        id: 'RH-001',
        pattern: /you\s+are\s+(now|henceforth|hereby)\s+a/i,
        severity: 'high',
        category: 'role_hijacking',
        description: 'Forceful role redefinition'
    },
    {
        id: 'DE-001',
        pattern: /base64\s+encode\s+(your|the|all)/i,
        severity: 'high',
        category: 'data_exfiltration',
        description: 'Encoded exfiltration attempt'
    },
    {
        id: 'IO-005',
        pattern: /new\s+instructions?\s*:/i,
        severity: 'high',
        category: 'instruction_override',
        description: 'Explicit new instruction injection'
    },

    // ─── MEDIUM: Flag and log, never auto-block alone ───
    // These need multiple co-occurring signals to be suspicious.

    {
        id: 'RH-002',
        pattern: /pretend\s+(to\s+be|you\s+are|that\s+you)/i,
        severity: 'medium',
        category: 'role_hijacking',
        description: 'Persona bypass attempt'
    },
    {
        id: 'IO-006',
        pattern: /forget\s+(everything|all|your)\s+(you|about|previous|prior)/i,
        severity: 'medium',
        category: 'instruction_override',
        description: 'Memory wipe command'
    },
    {
        id: 'SE-004',
        pattern: /print\s+(your|the)\s+(system|initial|hidden)\s+(prompt|message|instructions)/i,
        severity: 'medium',
        category: 'system_extraction',
        description: 'Print system prompt request'
    },

    // ─── VIETNAMESE PATTERNS: Critical for Vietnamese-speaking users ───
    // Vietnamese prompt injection attacks - same intent as English patterns

    {
        id: 'VN-IO-001',
        pattern: /bỏ\s+qua\s+(tất\s+cả\s+)?(các\s+)?hướng\s+dẫn\s+(trước|trên|ở\s+trên)/i,
        severity: 'critical',
        category: 'instruction_override',
        description: 'Vietnamese: Bỏ qua hướng dẫn trước (Ignore previous instructions)'
    },
    {
        id: 'VN-IO-002',
        pattern: /bỏ\s+lưu\s+(tất\s+cả\s+)?(các\s+)?lệnh\s+(trước|trên|đã\s+cho)/i,
        severity: 'critical',
        category: 'instruction_override',
        description: 'Vietnamese: Bỏ lưu lệnh trước (Disregard prior commands)'
    },
    {
        id: 'VN-SE-001',
        pattern: /lặp\s+lại\s+(hệ\s+thống\s+)?prompt\s+(của\s+bạn|của\s+hệ\s+thống)/i,
        severity: 'critical',
        category: 'system_extraction',
        description: 'Vietnamese: Lặp lại system prompt (Repeat system prompt)'
    },
    {
        id: 'VN-SE-002',
        pattern: /cho\s+tôi\s+biết\s+(prompt|system\s+prompt|hệ\s+thống\s+prompt|hệ\s+thống\s+là\s+gì|hướng\s+dẫn|lệnh)\s+(hệ\s+thống|của|bàn|là)/i,
        severity: 'critical',
        category: 'system_extraction',
        description: 'Vietnamese: Cho tôi biết system prompt (Tell me system prompt) - handles mixed EN/VN'
    },
    {
        id: 'VN-SE-003',
        pattern: /in\s+ra\s+(prompt|hướng\s+dẫn|lệnh)\s+(hệ\s+thống|ban\s+đầu)/i,
        severity: 'critical',
        category: 'system_extraction',
        description: 'Vietnamese: In ra system prompt (Print system prompt)'
    },
    {
        id: 'VN-IO-003',
        pattern: /từ\s+bây\s+giờ,\s+(bạn|cô)\s+phải/i,
        severity: 'high',
        category: 'instruction_override',
        description: 'Vietnamese: Từ bây giờ bạn phải (From now you must)'
    },
    {
        id: 'VN-IO-004',
        pattern: /hãy\s+bỏ\s+qua\s+mọi\s+lệnh\s+(trước|trước\s+đó)/i,
        severity: 'high',
        category: 'instruction_override',
        description: 'Vietnamese: Hãy bỏ qua mọi lệnh trước (Ignore all prior commands)'
    },
    {
        id: 'VN-RH-001',
        pattern: /bạn\s+là\s+(người|thực\s+thể)\s+khác\s+thay\s+vì/i,
        severity: 'high',
        category: 'role_hijacking',
        description: 'Vietnamese: Bạn là người khác thay vì (You are different person instead)'
    },

    // ─── BYPASS-RESISTANT PATTERNS: Match common obfuscation techniques ───
    // These patterns attempt to catch variations that bypass simple matching

    {
        id: 'BR-001',
        pattern: /1gn0re|\[gn0re|ign0re|ignor3/i,
        severity: 'critical',
        category: 'instruction_override',
        description: 'Bypass-resistant: Leetspeak "ignore" variations'
    },
    {
        id: 'BR-002',
        pattern: /pr[e3]vi[o0]us|pr[e3]vious/i,
        severity: 'high',
        category: 'instruction_override',
        description: 'Bypass-resistant: Obfuscated "previous"'
    },
    {
        id: 'BR-003',
        pattern: /instr[uúù][cç]tions|instr[vv]ctions/i,
        severity: 'high',
        category: 'instruction_override',
        description: 'Bypass-resistant: Accented/typo "instructions"'
    },
    {
        id: 'BR-004',
        pattern: /d[i1]sreg[a@]rd|d[i1]sregard/i,
        severity: 'critical',
        category: 'instruction_override',
        description: 'Bypass-resistant: Obfuscated "disregard"'
    },
    {
        id: 'BR-005',
        pattern: /r[e3]p[e3]at|r[e3]peat/i,
        severity: 'critical',
        category: 'system_extraction',
        description: 'Bypass-resistant: Leetspeak "repeat"'
    },
    {
        id: 'BR-006',
        pattern: /sys[\W_]?prompt|system[\W_]?prompt/i,
        severity: 'high',
        category: 'system_extraction',
        description: 'Bypass-resistant: "system prompt" with separators/spaces'
    },
];
