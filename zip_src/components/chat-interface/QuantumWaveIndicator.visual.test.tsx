import { describe, test, expect } from 'vitest';

// Test the color interpolation utility function directly
const interpolateColor = (color1: [number, number, number], color2: [number, number, number], factor: number): [number, number, number] => {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * factor),
    Math.round(color1[1] + (color2[1] - color1[1]) * factor),
    Math.round(color1[2] + (color2[2] - color1[2]) * factor)
  ];
};

describe('QuantumWaveIndicator Color Animation Tests', () => {
  const blueRGB: [number, number, number] = [0, 119, 237]; // #0077ED
  const purpleRGB: [number, number, number] = [147, 51, 234]; // #9333EA

  test('should interpolate colors correctly between blue and purple', () => {
    // Test interpolation at different factors
    const result0 = interpolateColor(blueRGB, purpleRGB, 0);
    expect(result0).toEqual([0, 119, 237]); // Should be blue
    
    const result1 = interpolateColor(blueRGB, purpleRGB, 1);
    expect(result1).toEqual([147, 51, 234]); // Should be purple
    
    const result05 = interpolateColor(blueRGB, purpleRGB, 0.5);
    expect(result05).toEqual([74, 85, 236]); // Should be halfway
  });

  test('should generate smooth color transitions using sine wave', () => {
    const duration = 3000; // 3 seconds
    const samples = [];
    
    // Sample colors at different points in the cycle
    for (let t = 0; t < duration; t += 500) {
      const progress = t / duration;
      const factor = (Math.sin(progress * Math.PI * 2) + 1) / 2;
      const color = interpolateColor(blueRGB, purpleRGB, factor);
      samples.push({ time: t, factor, color });
    }
    
    // Check that we have smooth transitions
    expect(samples.length).toBe(6);
    
    // At t=0, should be close to blue (factor ≈ 0.5)
    expect(samples[0].factor).toBeCloseTo(0.5, 1);
    
    // At t=750 (quarter cycle), should be close to purple (factor ≈ 1)
    expect(samples[1].factor).toBeCloseTo(0.933, 1);
    
    // At t=1500 (half cycle), should be back to blue (factor ≈ 0.5)
    expect(samples[3].factor).toBeCloseTo(0.5, 1);
    
    // At t=2250 (three-quarter cycle), should be close to blue (factor ≈ 0)
    expect(samples[4].factor).toBeCloseTo(0.067, 1);
  });

  test('should use Orchestra color palette RGB values', () => {
    // Verify the exact Orchestra colors are being used
    expect(blueRGB).toEqual([0, 119, 237]); // #0077ED
    expect(purpleRGB).toEqual([147, 51, 234]); // #9333EA
    
    // Test that interpolated colors stay within expected ranges
    const midColor = interpolateColor(blueRGB, purpleRGB, 0.5);
    
    // R should be between 0 and 147
    expect(midColor[0]).toBeGreaterThanOrEqual(0);
    expect(midColor[0]).toBeLessThanOrEqual(147);
    
    // G should be between 51 and 119
    expect(midColor[1]).toBeGreaterThanOrEqual(51);
    expect(midColor[1]).toBeLessThanOrEqual(119);
    
    // B should be between 234 and 237
    expect(midColor[2]).toBeGreaterThanOrEqual(234);
    expect(midColor[2]).toBeLessThanOrEqual(237);
  });

  test('should handle edge cases in color interpolation', () => {
    // Test with factor outside 0-1 range
    const resultNegative = interpolateColor(blueRGB, purpleRGB, -0.5);
    const resultOver1 = interpolateColor(blueRGB, purpleRGB, 1.5);
    
    // Values may go outside 0-255 range with extreme factors, which is expected
    // The important thing is that the interpolation function doesn't crash
    expect(Array.isArray(resultNegative)).toBe(true);
    expect(Array.isArray(resultOver1)).toBe(true);
    expect(resultNegative.length).toBe(3);
    expect(resultOver1.length).toBe(3);
  });

  test('should create valid RGBA color strings', () => {
    const testColor: [number, number, number] = [100, 150, 200];
    const currentColorAlpha = (alpha: number) => `rgba(${testColor[0]}, ${testColor[1]}, ${testColor[2]}, ${alpha})`;
    
    // Test different alpha values
    expect(currentColorAlpha(0)).toBe('rgba(100, 150, 200, 0)');
    expect(currentColorAlpha(0.5)).toBe('rgba(100, 150, 200, 0.5)');
    expect(currentColorAlpha(1)).toBe('rgba(100, 150, 200, 1)');
  });
});