import { describe, it, expect } from 'vitest';
import { scrubPII } from './pii-scrub';

describe('PII Scrubber', () => {
    describe('Email Detection', () => {
        it('should scrub email addresses', () => {
            const input = 'Contact user@example.com for support';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('u***@example.com');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub multiple email addresses', () => {
            const input = 'Send email to user@example.com and admin@example.org';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBe(2);
        });

        it('should handle subdomains correctly', () => {
            const input = 'Email at user@mail.example.com';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('@mail.example.com');
        });
    });

    describe('Phone Number Detection', () => {
        it('should scrub 10-digit phone numbers', () => {
            const input = 'Call me at 1234567890';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('+***-***-');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub formatted phone numbers', () => {
            const input = 'Phone: (123) 456-7890';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub international numbers', () => {
            const input = 'Call +1-123-456-7890 today';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('Social Security Number Detection', () => {
        it('should scrub SSN with dashes', () => {
            const input = 'SSN: 123-45-6789';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('***-**-****');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub SSN with spaces', () => {
            const input = 'SSN: 123 45 6789';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('***-**-****');
        });
    });

    describe('Credit Card Detection', () => {
        it('should scrub Visa card numbers', () => {
            const input = 'Card: 4111111111111111';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('4111');
            expect(result.scrubbedContent).toContain('****');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub Mastercard numbers', () => {
            const input = 'Pay with 5412751234567890';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub Amex cards', () => {
            const input = 'Amex: 341234567890123';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should handle spaced card numbers', () => {
            const input = 'Card: 4111 1111 1111 1111';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('API Key Detection', () => {
        it('should scrub OpenAI API keys', () => {
            const input = 'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('sk-');
            expect(result.scrubbedContent).toContain('*');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub GitHub personal access tokens', () => {
            const input = 'Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz123456';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub AWS access keys', () => {
            const input = 'AWS Key: AKIAIOSFODNN7EXAMPLE';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('AKIA');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('Bearer Token Detection', () => {
        it('should scrub bearer tokens', () => {
            const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('Bearer ***REDACTED***');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('JWT Token Detection', () => {
        it('should scrub JWT tokens', () => {
            const input = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('***');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('IP Address Detection', () => {
        it('should scrub IPv4 addresses at medium level', () => {
            const input = 'Connect to 192.168.1.1';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('***.***');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should not scrub IPv4 addresses at low level', () => {
            const input = 'Connect to 192.168.1.1';
            const result = scrubPII(input, { enabled: true, level: 'low' });
            expect(result.scrubbedCount).toBe(0);
        });

        it('should scrub IPv6 addresses', () => {
            const input = 'IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toContain('****');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('High-Level Scrubbing', () => {
        it('should scrub secret key-value pairs at high level', () => {
            const input = '{"password": "mySecretPassword123", "username": "john"}';
            const result = scrubPII(input, { enabled: true, level: 'high' });
            expect(result.scrubbedContent).toContain('"password": "***REDACTED***"');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub API key in JSON at high level', () => {
            const input = '{"api_key": "sk-1234567890abcdef", "endpoint": "https://api.example.com"}';
            const result = scrubPII(input, { enabled: true, level: 'high' });
            expect(result.scrubbedContent).toContain('"api_key": "***REDACTED***"');
        });

        it('should scrub URLs with credentials', () => {
            const input = 'Connect to https://user:password@api.example.com/endpoint';
            const result = scrubPII(input, { enabled: true, level: 'high' });
            expect(result.scrubbedContent).toContain('://***:***@');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub private keys', () => {
            const input = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC==
-----END PRIVATE KEY-----`;
            const result = scrubPII(input, { enabled: true, level: 'high' });
            expect(result.scrubbedContent).toContain('***REDACTED***');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should scrub employee IDs at high level', () => {
            const input = 'Employee ID: 1234567';
            const result = scrubPII(input, { enabled: true, level: 'high' });
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('Custom Patterns', () => {
        it('should apply custom regex patterns', () => {
            const input = 'Ticket ID: TICKET-12345';
            const result = scrubPII(input, {
                enabled: true,
                level: 'medium',
                customPatterns: [
                    {
                        name: 'ticket_id',
                        pattern: '\\bTICKET-\\d{5}\\b',
                        flags: 'g'
                    }
                ]
            });
            expect(result.scrubbedContent).toContain('***');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should handle multiple custom patterns', () => {
            const input = 'Order #ORD-12345 and Ticket TICKET-67890';
            const result = scrubPII(input, {
                enabled: true,
                level: 'medium',
                customPatterns: [
                    { name: 'order_id', pattern: '\\bORD-\\d{5}\\b', flags: 'g' },
                    { name: 'ticket_id', pattern: '\\bTICKET-\\d{5}\\b', flags: 'g' }
                ]
            });
            expect(result.scrubbedCount).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Scrubbing Levels', () => {
        const complexInput = `
            Contact: user@example.com, Phone: 1234567890
            API Key: sk-1234567890abcdef
            IP: 192.168.1.1
            Password: secret123
        `;

        it('low level should only scrub basic PII', () => {
            const result = scrubPII(complexInput, { enabled: true, level: 'low' });
            // Should scrub email, phone, SSN, credit card
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('medium level should scrub more patterns', () => {
            const result = scrubPII(complexInput, { enabled: true, level: 'medium' });
            // Should include API keys, IPs
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('high level should scrub all patterns', () => {
            const result = scrubPII(complexInput, { enabled: true, level: 'high' });
            // Should include secrets, passwords, etc.
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty input', () => {
            const result = scrubPII('', { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toBe('');
            expect(result.scrubbedCount).toBe(0);
        });

        it('should handle input without PII', () => {
            const input = 'This is just regular text with no sensitive information';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedContent).toBe(input);
            expect(result.scrubbedCount).toBe(0);
        });

        it('should handle disabled scrubbing', () => {
            const input = 'Email: user@example.com';
            const result = scrubPII(input, { enabled: false, level: 'medium' });
            expect(result.scrubbedContent).toBe(input);
            expect(result.scrubbedCount).toBe(0);
        });

        it('should preserve JSON structure', () => {
            const input = '{"user": "john@example.com", "message": "Hello"}';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            // Should still be valid JSON structure (mostly)
            expect(result.scrubbedContent).toContain('{');
            expect(result.scrubbedContent).toContain('}');
        });
    });

    describe('Real-World Scenarios', () => {
        it('should scrub PII from chat completion request', () => {
            const input = JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'user',
                        content: 'My email is john@example.com and phone is 1234567890'
                    }
                ]
            });
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBeGreaterThanOrEqual(2);
        });

        it('should scrub multiple instances of same PII type', () => {
            const input = 'Contact user1@example.com or user2@example.com or user3@example.com';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.scrubbedCount).toBe(3);
        });

        it('should provide detailed scrubbing information', () => {
            const input = 'Email: user@example.com, Phone: 1234567890, Card: 4111111111111111';
            const result = scrubPII(input, { enabled: true, level: 'medium' });
            expect(result.details).toBeDefined();
            expect(result.details.length).toBeGreaterThan(0);
            expect(result.details[0]).toHaveProperty('type');
            expect(result.details[0]).toHaveProperty('count');
        });
    });

    describe('Performance', () => {
        it('should handle large text efficiently', () => {
            const largeInput = 'Contact user@example.com '.repeat(1000);
            const start = Date.now();
            const result = scrubPII(largeInput, { enabled: true, level: 'medium' });
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100); // Should complete in less than 100ms
            expect(result.scrubbedCount).toBe(1000);
        });
    });
});
