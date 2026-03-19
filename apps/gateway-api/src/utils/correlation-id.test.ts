import { describe, it, expect } from 'vitest';
import { generateCorrelationId, getCorrelationId } from './correlation-id';

describe('Correlation ID', () => {
    it('should generate a unique UUID', () => {
        const id1 = generateCorrelationId();
        const id2 = generateCorrelationId();

        expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(id1).not.toBe(id2);
    });

    it('should return existing correlation ID from context', () => {
        const mockContext = new Map();
        const testId = 'test-correlation-id-123';
        mockContext.set('correlationId', testId);

        const id = getCorrelationId(mockContext);
        expect(id).toBe(testId);
    });

    it('should generate new ID if none exists in context', () => {
        const mockContext = new Map();
        const id = getCorrelationId(mockContext);

        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(mockContext.get('correlationId')).toBe(id);
    });
});