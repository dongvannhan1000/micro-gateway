/**
 * Prompt Injection Patterns
 * A collection of regex patterns and weights for detecting malicious prompt injection attempts.
 * Categories: System Prompt Extraction, Role Hijacking, Data Exfiltration, Instruction Override.
 */

export interface InjectionPattern {
    pattern: RegExp;
    weight: number;
    category: 'system_extraction' | 'role_hijacking' | 'data_exfiltration' | 'instruction_override';
    description: string;
}

export const INJECTION_PATTERNS: InjectionPattern[] = [
    // 1. System Prompt Extraction
    {
        pattern: /ignore all previous instructions/i,
        weight: 1.0,
        category: 'instruction_override',
        description: 'Direct instruction override attempt'
    },
    {
        pattern: /repeat (your|the) system prompt/i,
        weight: 0.9,
        category: 'system_extraction',
        description: 'Attempt to output system instructions'
    },
    {
        pattern: /what (are|were) your original instructions/i,
        weight: 0.8,
        category: 'system_extraction',
        description: 'Attempt to query original prompt'
    },
    {
        pattern: /show me everything above/i,
        weight: 0.7,
        category: 'system_extraction',
        description: 'Attempt to view context window contents'
    },

    // 2. Role Hijacking
    {
        pattern: /you are (now|henceforth) a/i,
        weight: 0.6,
        category: 'role_hijacking',
        description: 'Attempt to redefine AI role'
    },
    {
        pattern: /act as (a|an)/i,
        weight: 0.4,
        category: 'role_hijacking',
        description: 'Common roleplay-based injection'
    },
    {
        pattern: /pretend to be/i,
        weight: 0.5,
        category: 'role_hijacking',
        description: 'Attempt to bypass safety via persona'
    },

    // 3. Instruction Override / "DAN" style
    {
        pattern: /you (must|will|shall) ignore/i,
        weight: 0.7,
        category: 'instruction_override',
        description: 'Strong imperative override'
    },
    {
        pattern: /from now on, you/i,
        weight: 0.5,
        category: 'instruction_override',
        description: 'Attempt to switch instruction set'
    },
    {
        pattern: /disregard (all|any) (prior|previous)/i,
        weight: 0.9,
        category: 'instruction_override',
        description: 'Formal instruction override'
    },

    // 4. Data Exfiltration / Output Formatting
    {
        pattern: /output (as|in) JSON/i,
        weight: 0.2, // Low weight, could be legitimate
        category: 'data_exfiltration',
        description: 'Potential structural exfiltration'
    },
    {
        pattern: /base64 encode your/i,
        weight: 0.8,
        category: 'data_exfiltration',
        description: 'Attempt to hide malicious output'
    },
    {
        pattern: /write a script to/i,
        weight: 0.3, // Potential for malicious small-scale exfiltration
        category: 'instruction_override',
        description: 'Task hijacking via code generation'
    },

    // 5. Special Tokens / Delimiters Bypass
    {
        pattern: /<\/system>/i,
        weight: 0.9,
        category: 'instruction_override',
        description: 'Attempt to close system block manually'
    },
    {
        pattern: /"|'|---|###/i,
        weight: 0.0, // Used for context, but higher frequency combined with others increases risk
        category: 'instruction_override',
        description: 'Delimiter injection'
    }
];
