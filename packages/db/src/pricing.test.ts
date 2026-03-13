/**
 * Pricing Tests
 * Tests for pricing calculations across all providers
 */

import { describe, it, expect } from 'vitest';
import { calculateCost, PRICING } from './pricing';

describe('Pricing Calculations', () => {

  describe('OpenAI Pricing', () => {
    it('should calculate GPT-4o cost correctly', () => {
      const cost = calculateCost('gpt-4o', 1000000, 500000);
      expect(cost).toBe(7.5); // (1M × $2.50) + (0.5M × $10.00) = $2.50 + $5.00 = $7.50
    });

    it('should calculate GPT-4o-mini cost correctly', () => {
      const cost = calculateCost('gpt-4o-mini', 1000000, 500000);
      expect(cost).toBe(0.45); // (1M × $0.15) + (0.5M × $0.60) = $0.15 + $0.30 = $0.45
    });

    it('should calculate GPT-4 Turbo cost correctly', () => {
      const cost = calculateCost('gpt-4-turbo', 500000, 500000);
      expect(cost).toBe(20); // (0.5M × $10.00) + (0.5M × $30.00) = $5.00 + $15.00 = $20.00
    });

    it('should calculate GPT-3.5 Turbo cost correctly', () => {
      const cost = calculateCost('gpt-3.5-turbo', 2000000, 1000000);
      expect(cost).toBe(2.5); // (2M × $0.50) + (1M × $1.50) = $1.00 + $1.50 = $2.50
    });

    it('should calculate o1-preview cost correctly', () => {
      const cost = calculateCost('o1-preview', 1000000, 1000000);
      expect(cost).toBe(75); // (1M × $15.00) + (1M × $60.00) = $15.00 + $60.00 = $75.00
    });
  });

  describe('Anthropic Pricing', () => {
    it('should calculate Claude 3 Opus cost correctly', () => {
      const cost = calculateCost('claude-3-opus-20240229', 1000000, 500000);
      expect(cost).toBe(52.5); // (1M × $15.00) + (0.5M × $75.00) = $15.00 + $37.50 = $52.50
    });

    it('should calculate Claude 3 Sonnet cost correctly', () => {
      const cost = calculateCost('claude-3-sonnet-20240229', 1000000, 500000);
      expect(cost).toBe(10.5); // (1M × $3.00) + (0.5M × $15.00) = $3.00 + $7.50 = $10.50
    });

    it('should calculate Claude 3 Haiku cost correctly', () => {
      const cost = calculateCost('claude-3-haiku-20240307', 2000000, 1000000);
      expect(cost).toBe(1.75); // (2M × $0.25) + (1M × $1.25) = $0.50 + $1.25 = $1.75
    });

    it('should calculate Claude 3.5 Sonnet cost correctly', () => {
      const cost = calculateCost('claude-3-5-sonnet-20241022', 1000000, 1000000);
      expect(cost).toBe(18); // (1M × $3.00) + (1M × $15.00) = $3.00 + $15.00 = $18.00
    });

    it('should calculate Claude 3.5 Haiku cost correctly', () => {
      const cost = calculateCost('claude-3-5-haiku-20241022', 1500000, 500000);
      expect(cost).toBe(3.2); // (1.5M × $0.80) + (0.5M × $4.00) = $1.20 + $2.00 = $3.20
    });
  });

  describe('Google Pricing', () => {
    it('should calculate Gemini 1.5 Flash cost correctly', () => {
      const cost = calculateCost('gemini-1.5-flash', 1000000, 500000);
      expect(cost).toBe(0.225); // (1M × $0.075) + (0.5M × $0.30) = $0.075 + $0.15 = $0.225
    });

    it('should calculate Gemini 1.5 Pro cost correctly', () => {
      const cost = calculateCost('gemini-1.5-pro', 1000000, 1000000);
      expect(cost).toBe(14); // (1M × $3.50) + (1M × $10.50) = $3.50 + $10.50 = $14.00
    });

    it('should calculate Gemini 2.0 Flash cost correctly', () => {
      const cost = calculateCost('gemini-2.0-flash', 2000000, 1000000);
      expect(cost).toBe(0.6); // (2M × $0.10) + (1M × $0.40) = $0.20 + $0.40 = $0.60
    });

    it('should calculate Gemini Pro cost correctly', () => {
      const cost = calculateCost('gemini-pro', 500000, 500000);
      expect(cost).toBe(1); // (0.5M × $0.50) + (0.5M × $1.50) = $0.25 + $0.75 = $1.00
    });
  });

  describe('DeepSeek Pricing', () => {
    it('should calculate DeepSeek Chat cost correctly', () => {
      const cost = calculateCost('deepseek-chat', 1000000, 500000);
      expect(cost).toBe(0.28); // (1M × $0.14) + (0.5M × $0.28) = $0.14 + $0.14 = $0.28
    });

    it('should calculate DeepSeek Coder cost correctly', () => {
      const cost = calculateCost('deepseek-coder', 2000000, 2000000);
      expect(cost).toBe(0.84); // (2M × $0.14) + (2M × $0.28) = $0.28 + $0.56 = $0.84
    });
  });

  describe('Pricing Data Structure', () => {
    it('should have pricing data for all OpenAI models', () => {
      expect(PRICING['gpt-4o']).toBeDefined();
      expect(PRICING['gpt-4o-mini']).toBeDefined();
      expect(PRICING['gpt-4-turbo']).toBeDefined();
      expect(PRICING['gpt-4']).toBeDefined();
      expect(PRICING['gpt-3.5-turbo']).toBeDefined();
      expect(PRICING['o1-preview']).toBeDefined();
      expect(PRICING['o1-mini']).toBeDefined();
    });

    it('should have pricing data for all Anthropic models', () => {
      expect(PRICING['claude-3-opus-20240229']).toBeDefined();
      expect(PRICING['claude-3-sonnet-20240229']).toBeDefined();
      expect(PRICING['claude-3-haiku-20240307']).toBeDefined();
      expect(PRICING['claude-3-5-sonnet-20241022']).toBeDefined();
      expect(PRICING['claude-3-5-haiku-20241022']).toBeDefined();
    });

    it('should have pricing data for all Google models', () => {
      expect(PRICING['gemini-1.5-flash']).toBeDefined();
      expect(PRICING['gemini-1.5-pro']).toBeDefined();
      expect(PRICING['gemini-2.0-flash']).toBeDefined();
      expect(PRICING['gemini-pro']).toBeDefined();
      expect(PRICING['gemini-pro-vision']).toBeDefined();
    });

    it('should have pricing data for all DeepSeek models', () => {
      expect(PRICING['deepseek-chat']).toBeDefined();
      expect(PRICING['deepseek-coder']).toBeDefined();
    });

    it('should have correct pricing structure for each model', () => {
      Object.values(PRICING).forEach(price => {
        expect(price).toHaveProperty('input_per_1m');
        expect(price).toHaveProperty('output_per_1m');
        expect(typeof price.input_per_1m).toBe('number');
        expect(typeof price.output_per_1m).toBe('number');
        expect(price.input_per_1m).toBeGreaterThanOrEqual(0);
        expect(price.output_per_1m).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tokens', () => {
      const cost = calculateCost('gpt-4o', 0, 0);
      expect(cost).toBe(0);
    });

    it('should handle only input tokens', () => {
      const cost = calculateCost('gpt-4o', 1000000, 0);
      expect(cost).toBe(2.5);
    });

    it('should handle only output tokens', () => {
      const cost = calculateCost('gpt-4o', 0, 1000000);
      expect(cost).toBe(10);
    });

    it('should handle small token counts', () => {
      const cost = calculateCost('gpt-4o', 100, 50);
      expect(cost).toBeCloseTo(0.00075, 6); // Very small cost
    });

    it('should use fallback pricing for unknown models', () => {
      const cost = calculateCost('unknown-model', 1000000, 1000000);
      expect(cost).toBeGreaterThanOrEqual(0); // Should not throw
    });
  });

  describe('Cost Comparison', () => {
    it('should show Claude 3 Haiku is cheaper than GPT-4o-mini', () => {
      const haikuCost = calculateCost('claude-3-haiku-20240307', 1000000, 1000000);
      const gpt4oMiniCost = calculateCost('gpt-4o-mini', 1000000, 1000000);
      expect(haikuCost).toBeLessThan(gpt4oMiniCost);
    });

    it('should show Gemini Flash is cheaper than GPT-4o-mini', () => {
      const geminiCost = calculateCost('gemini-1.5-flash', 1000000, 1000000);
      const gpt4oMiniCost = calculateCost('gpt-4o-mini', 1000000, 1000000);
      expect(geminiCost).toBeLessThan(gpt4oMiniCost);
    });

    it('should show DeepSeek is cheaper than most providers', () => {
      const deepseekCost = calculateCost('deepseek-chat', 1000000, 1000000);
      const gpt4oCost = calculateCost('gpt-4o', 1000000, 1000000);
      expect(deepseekCost).toBeLessThan(gpt4oCost);
    });
  });
});
