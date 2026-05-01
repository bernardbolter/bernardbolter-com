// New output structure for the requested function
interface ConvertedSizeOutput {
  widthMetric: string;
  heightMetric: string;
  // CHANGED: These are now string | null
  widthImperialInches: string | null;
  heightImperialInches: string | null;
  widthImperialFraction: string;
  heightImperialFraction: string;
  // CHANGED: These are now string | null
  widthPixels: string | null;
  heightPixels: string | null;
}

// Greatest Common Divisor helper for fraction simplification
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

// Helper to convert fractions (like "5/8") or mixed numbers (like "11 5/8") to decimal inches.
function parseInputImperialToInches(input: string): number {
    const sanitized = input.trim().replace(/'/g, '').replace(/"/g, ''); // Remove common unit indicators
    
    // 1. Check for mixed number format: "11 5/8"
    const mixedMatch = sanitized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
        const whole = parseInt(mixedMatch[1], 10);
        const numerator = parseInt(mixedMatch[2], 10);
        const denominator = parseInt(mixedMatch[3], 10);
        if (denominator === 0) return 0;
        return whole + (numerator / denominator);
    }
    
    // 2. Check for fraction format: "5/8" 
    const fractionMatch = sanitized.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
        const numerator = parseInt(fractionMatch[1], 10);
        const denominator = parseInt(fractionMatch[2], 10);
        if (denominator === 0) return 0;
        return numerator / denominator;
    }
    
    // 3. Check for simple decimal or whole number: "11.625" or "11"
    const decimal = parseFloat(sanitized);
    if (!isNaN(decimal)) {
        return decimal;
    }
    
    return 0;
}

// Helper to determine the best fraction, limiting the highest denominator for display to 8 (1/8th precision).
function getFraction(decimalPart: number): { whole: number, fraction: string } {
  const commonDenominators: number[] = [2, 4, 8]; 
  let bestFraction: string = "";
  let minError: number = 1; // Initialize with maximum possible error
  
  if (decimalPart < 0.001 || decimalPart > 0.999) {
    // If very close to 0 or 1, handle rounding (will be fixed below if > 0.999)
    return { whole: Math.round(decimalPart), fraction: "" }; 
  }
  
  // Look for the best match within the limited denominators
  for (const denominator of commonDenominators) {
    const numerator: number = Math.round(decimalPart * denominator);
    const fractionValue: number = numerator / denominator;
    const error: number = Math.abs(decimalPart - fractionValue);
    
    if (error < minError) {
      minError = error;
      
      if (numerator === 0) {
        bestFraction = "";
      } else if (numerator === denominator) {
        bestFraction = "1"; 
      } else {
        // Simplify the fraction
        const commonDivisor: number = gcd(numerator, denominator);
        bestFraction = `${numerator / commonDivisor}/${denominator / commonDivisor}`;
      }
    }
  }

  // If rounding pushed the fraction to 1, return the whole number increment
  if (bestFraction === "1") {
    return { whole: 1, fraction: "" };
  }
  
  return { whole: 0, fraction: bestFraction };
}

// Function to take a decimal inch value and split it for the desired output format
function splitImperialInches(inches: number): { whole: number, fraction: string } {
  let wholeInches: number = Math.floor(inches);
  const decimalPart: number = inches - wholeInches;
  
  const fractionResult = getFraction(decimalPart);
  
  // If the fraction rounded up to 1, add it to the whole number
  wholeInches += fractionResult.whole;
  
  return {
    whole: wholeInches,
    fraction: fractionResult.fraction,
  };
}


// The main refactored function
export function convertSizeForDisplay(width: string, height: string, unit: string): ConvertedSizeOutput {
  const defaultOutput: ConvertedSizeOutput = {
    widthMetric: '',
    heightMetric: '',
    widthImperialInches: null,
    heightImperialInches: null,
    widthImperialFraction: '',
    heightImperialFraction: '',
    widthPixels: null,
    heightPixels: null,
  };
  
  const normalizedUnit = unit.toLowerCase();
  
  if (normalizedUnit === 'pixels') {
    const numericWidth = parseFloat(width);
    const numericHeight = parseFloat(height);
    
    return {
      ...defaultOutput,
      // CONVERTING numbers to strings for output
      widthPixels: isNaN(numericWidth) || numericWidth <= 0 ? null : String(numericWidth),
      heightPixels: isNaN(numericHeight) || numericHeight <= 0 ? null : String(numericHeight),
    };
  } 
  
  let wImperialInchesDecimal: number = 0;
  let hImperialInchesDecimal: number = 0;
  let wMetricCm: number = 0;
  let hMetricCm: number = 0;

  // --- Conversion Logic ---
  if (normalizedUnit === 'metric') {
    // Input is assumed to be numeric CM value (e.g., "50")
    wMetricCm = parseFloat(width);
    hMetricCm = parseFloat(height);
    
    if (isNaN(wMetricCm) || wMetricCm <= 0 || isNaN(hMetricCm) || hMetricCm <= 0) {
        return defaultOutput;
    }
    
    // Metric to Imperial Conversion
    wImperialInchesDecimal = wMetricCm / 2.54;
    hImperialInchesDecimal = hMetricCm / 2.54;
    
  } else if (normalizedUnit === 'imperial') {
    // Input can be a mixed fraction string (e.g., "11 5/8")
    wImperialInchesDecimal = parseInputImperialToInches(width);
    hImperialInchesDecimal = parseInputImperialToInches(height);
    
    if (wImperialInchesDecimal <= 0 || hImperialInchesDecimal <= 0) {
        return defaultOutput;
    }
    
    // Imperial to Metric Conversion
    wMetricCm = wImperialInchesDecimal * 2.54;
    hMetricCm = hImperialInchesDecimal * 2.54;
    
  } else {
    // Unknown or unsupported unit
    return defaultOutput;
  }
  
  // --- Output Formatting ---
  
  // Metric (always round to one decimal)
  const wMetricString = `${Math.round(wMetricCm * 10) / 10}cm`;
  const hMetricString = `${Math.round(hMetricCm * 10) / 10}cm`;
  
  // Imperial Split
  const wImperialSplit = splitImperialInches(wImperialInchesDecimal);
  const hImperialSplit = splitImperialInches(hImperialInchesDecimal);
  
  return {
    ...defaultOutput,
    widthMetric: wMetricString,
    heightMetric: hMetricString,
    // CONVERTING numbers to strings for output
    widthImperialInches: String(wImperialSplit.whole),
    heightImperialInches: String(hImperialSplit.whole),
    widthImperialFraction: wImperialSplit.fraction,
    heightImperialFraction: hImperialSplit.fraction,
  };
}