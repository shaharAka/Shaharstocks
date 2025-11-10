/**
 * Integrated Score Calculation Tests
 * 
 * Validates the mathematical integration of micro and macro analysis scores.
 * Formula: integratedScore = Math.max(0, Math.min(100, Math.round(microScore × macroFactor)))
 */

import { describe, it, expect } from "vitest";

describe("Integrated Score Calculation", () => {
  // Helper function to calculate integrated score
  const calculateIntegratedScore = (microScore: number, macroFactor: number): number => {
    const rawScore = microScore * macroFactor;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  };

  describe("Normal Cases", () => {
    it("should calculate score correctly for typical values", () => {
      // Micro: 78, Macro: 0.95 → 78 × 0.95 = 74.1 → 74
      expect(calculateIntegratedScore(78, 0.95)).toBe(74);
      
      // Micro: 85, Macro: 1.05 → 85 × 1.05 = 89.25 → 89
      expect(calculateIntegratedScore(85, 1.05)).toBe(89);
      
      // Micro: 60, Macro: 0.80 → 60 × 0.80 = 48.0 → 48
      expect(calculateIntegratedScore(60, 0.80)).toBe(48);
    });

    it("should handle neutral macro factor (1.0)", () => {
      // When macro is neutral, integrated score equals micro score
      expect(calculateIntegratedScore(75, 1.0)).toBe(75);
      expect(calculateIntegratedScore(82, 1.0)).toBe(82);
      expect(calculateIntegratedScore(50, 1.0)).toBe(50);
    });

    it("should handle positive macro environment (>1.0)", () => {
      // Strong market conditions boost the score
      expect(calculateIntegratedScore(70, 1.10)).toBe(77); // 77.0
      expect(calculateIntegratedScore(80, 1.15)).toBe(92); // 92.0
      expect(calculateIntegratedScore(65, 1.20)).toBe(78); // 78.0
    });

    it("should handle negative macro environment (<1.0)", () => {
      // Weak market conditions reduce the score
      expect(calculateIntegratedScore(85, 0.90)).toBe(77); // 76.5 → 77
      expect(calculateIntegratedScore(70, 0.85)).toBe(60); // 59.5 → 60
      expect(calculateIntegratedScore(90, 0.75)).toBe(68); // 67.5 → 68
    });
  });

  describe("Boundary Cases", () => {
    it("should clamp to maximum 100", () => {
      // Very strong stock in very strong market
      expect(calculateIntegratedScore(95, 1.30)).toBe(100); // 123.5 → 100 (clamped)
      expect(calculateIntegratedScore(100, 1.20)).toBe(100); // 120.0 → 100 (clamped)
      expect(calculateIntegratedScore(90, 1.50)).toBe(100); // 135.0 → 100 (clamped)
    });

    it("should clamp to minimum 0", () => {
      // Edge case: negative macro factor (crisis scenario)
      expect(calculateIntegratedScore(80, -0.50)).toBe(0); // -40.0 → 0 (clamped)
      expect(calculateIntegratedScore(50, -1.00)).toBe(0); // -50.0 → 0 (clamped)
    });

    it("should handle zero values", () => {
      expect(calculateIntegratedScore(0, 1.0)).toBe(0);
      expect(calculateIntegratedScore(75, 0)).toBe(0);
      expect(calculateIntegratedScore(0, 0)).toBe(0);
    });

    it("should handle edge of clamping range", () => {
      // Just below max
      expect(calculateIntegratedScore(99, 1.0)).toBe(99);
      expect(calculateIntegratedScore(98, 1.02)).toBe(100); // 99.96 → 100
      
      // Just above min
      expect(calculateIntegratedScore(1, 1.0)).toBe(1);
      expect(calculateIntegratedScore(2, 0.4)).toBe(1); // 0.8 → 1
    });
  });

  describe("Rounding Behavior", () => {
    it("should round to nearest integer (.5 rounds up)", () => {
      // Test .5 boundary using exact fractions to avoid floating-point drift
      expect(calculateIntegratedScore(75, 149/150)).toBe(75); // 74.5 → 75 (rounded up)
      expect(calculateIntegratedScore(75, 0.992)).toBe(74); // 74.4 → 74 (rounded down)
      
      // More examples with exact values
      expect(calculateIntegratedScore(75, 1.0)).toBe(75); // 75.0 exactly
      expect(calculateIntegratedScore(65, 1.0)).toBe(65); // 65.0 exactly
    });

    it("should handle precise decimal results", () => {
      expect(calculateIntegratedScore(73, 1.0274)).toBe(75); // 75.0 exactly
      expect(calculateIntegratedScore(82, 0.8537)).toBe(70); // 70.0 exactly
      expect(calculateIntegratedScore(91, 1.0989)).toBe(100); // 100.0 exactly
    });
  });

  describe("Real-World Scenarios", () => {
    it("should handle strong stock in weak market", () => {
      // Excellent fundamentals but poor market conditions
      const microScore = 92; // Strong buy
      const macroFactor = 0.75; // Weak market
      const result = calculateIntegratedScore(microScore, macroFactor);
      
      expect(result).toBe(69); // 92 × 0.75 = 69.0
      expect(result).toBeLessThan(microScore); // Market drags down the stock
    });

    it("should handle weak stock in strong market", () => {
      // Mediocre fundamentals but excellent market conditions
      const microScore = 55; // Hold/Neutral
      const macroFactor = 1.25; // Strong market
      const result = calculateIntegratedScore(microScore, macroFactor);
      
      expect(result).toBe(69); // 55 × 1.25 = 68.75 → 69
      expect(result).toBeGreaterThan(microScore); // Market lifts the stock
    });

    it("should handle crisis scenario", () => {
      // Market crash scenario
      const microScore = 80; // Would normally be strong
      const macroFactor = 0.50; // Severe market downturn
      const result = calculateIntegratedScore(microScore, macroFactor);
      
      expect(result).toBe(40); // 80 × 0.50 = 40.0
      expect(result).toBe(microScore / 2); // Score cut in half
    });

    it("should handle boom scenario", () => {
      // Bull market boom
      const microScore = 75; // Decent fundamentals
      const macroFactor = 1.30; // Strong bull market
      const result = calculateIntegratedScore(microScore, macroFactor);
      
      expect(result).toBe(98); // 75 × 1.30 = 97.5 → 98
    });
  });

  describe("Symmetry and Consistency", () => {
    it("should be commutative for equivalent transformations", () => {
      // Doubling micro and halving macro should give same result
      const score1 = calculateIntegratedScore(50, 1.0);
      const score2 = calculateIntegratedScore(100, 0.5);
      
      expect(score1).toBe(score2); // Both should be 50
    });

    it("should maintain relative ordering", () => {
      // Higher micro score should generally yield higher integrated score
      const score1 = calculateIntegratedScore(60, 0.95);
      const score2 = calculateIntegratedScore(70, 0.95);
      const score3 = calculateIntegratedScore(80, 0.95);
      
      expect(score1).toBeLessThan(score2);
      expect(score2).toBeLessThan(score3);
    });

    it("should be monotonic for fixed macro factor", () => {
      const macroFactor = 0.90;
      const scores = [50, 60, 70, 80, 90].map(micro => 
        calculateIntegratedScore(micro, macroFactor)
      );
      
      // Each score should be >= previous score
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      }
    });
  });

  describe("Type Safety and Input Validation", () => {
    it("should handle floating point micro scores", () => {
      expect(calculateIntegratedScore(78.5, 0.95)).toBe(75); // 74.575 → 75
      expect(calculateIntegratedScore(82.3, 1.05)).toBe(86); // 86.415 → 86
    });

    it("should handle floating point macro factors", () => {
      expect(calculateIntegratedScore(75, 0.956789)).toBe(72); // 71.759175 → 72
      expect(calculateIntegratedScore(80, 1.123456)).toBe(90); // 89.87648 → 90
    });

    it("should handle very small macro factors", () => {
      expect(calculateIntegratedScore(90, 0.01)).toBe(1); // 0.9 → 1
      expect(calculateIntegratedScore(100, 0.001)).toBe(0); // 0.1 → 0
    });

    it("should handle very large macro factors", () => {
      expect(calculateIntegratedScore(50, 3.0)).toBe(100); // 150.0 → 100 (clamped)
      expect(calculateIntegratedScore(40, 2.5)).toBe(100); // 100.0 exactly
      expect(calculateIntegratedScore(30, 2.0)).toBe(60); // 60.0 exactly
    });
  });
});
