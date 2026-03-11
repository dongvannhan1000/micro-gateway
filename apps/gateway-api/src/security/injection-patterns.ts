/**
 * Prompt Injection Detection Patterns (v2)
 * 
 * Design Principles:
 * - Only include patterns with CLEAR malicious intent (low false-positive risk)
 * - Use severity tiers: 'critical' (auto-block), 'high' (block with 2+ matches), 'medium' (flag only)
 * - Removed FP-prone patterns: "act as", "write a script to", "output as JSON", delimiters
 * - Each pattern documents WHY it's malicious and known FP scenarios
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
];
