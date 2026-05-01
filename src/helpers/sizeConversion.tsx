interface ConversionResult {
  value: string;
  isValid: boolean;
  error?: string;
}

type UnitType = 'metric' | 'imperial' | 'unknown';

function sanitizeInput(input: string): string {
  // Handle common quote variations and normalize
  return input
    .trim()
    .replace(/[''`]/g, "'")  // Normalize various apostrophes to standard single quote
    .replace(/[""]/g, '"')   // Normalize various quotes to standard double quote
    .replace(/\s+/g, ' ')    // Normalize multiple spaces to single space
    .toLowerCase();
}

function detectUnitType(sanitizedInput: string): UnitType {
  // Check for metric indicators
  if (/\d+(\.\d+)?\s*(cm|m|meter|metre)/.test(sanitizedInput)) {
    return 'metric';
  }
  
  // Check for imperial indicators
  if (/\d+.*['""]|ft|feet|in|inches/.test(sanitizedInput)) {
    return 'imperial';
  }
  
  // If it's just a number, assume imperial (inches)
  if (/^\d+(\.\d+)?\s*$/.test(sanitizedInput)) {
    return 'imperial';
  }
  
  return 'unknown';
}

function toClosestFraction(decimal: number): string {
  const commonDenominators: number[] = [2, 3, 4, 8, 16, 32, 64];
  let bestFraction: string = Math.round(decimal).toString();
  let minError: number = Math.abs(decimal - Math.round(decimal));
  
  // If the decimal is very close to a whole number, just return the whole number
  if (minError < 0.001) {
    return Math.round(decimal).toString();
  }
  
  for (const denominator of commonDenominators) {
    const numerator: number = Math.round(decimal * denominator);
    const fractionValue: number = numerator / denominator;
    const error: number = Math.abs(decimal - fractionValue);
    
    if (error < minError) {
      minError = error;
      
      if (numerator === 0) {
        bestFraction = "0";
      } else if (numerator === denominator) {
        bestFraction = "1";
      } else if (numerator > denominator) {
        const whole: number = Math.floor(numerator / denominator);
        const remainder: number = numerator % denominator;
        
        if (remainder === 0) {
          bestFraction = whole.toString();
        } else {
          bestFraction = `${whole} ${remainder}/${denominator}`;
        }
      } else {
        bestFraction = `${numerator}/${denominator}`;
      }
    }
  }
  
  return bestFraction;
}

function parseImperialToInches(input: string): number {
  const cleaned: string = input.replace(/['"]/g, '').replace(/ft|feet|in|inches/g, '').trim();
  
  // Try to match patterns like "4 6", "4.5 6", etc. (feet inches)
  const feetInchesMatch = cleaned.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/);
  if (feetInchesMatch) {
    const feet: number = parseFloat(feetInchesMatch[1]);
    const inches: number = parseFloat(feetInchesMatch[2]);
    return feet * 12 + inches;
  }
  
  // Check if original input had foot indicators
  const hasFeetIndicator = /ft|feet|'/.test(input);
  if (hasFeetIndicator && !feetInchesMatch) {
    // Just feet, no inches
    const feetMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
    if (feetMatch) {
      return parseFloat(feetMatch[1]) * 12;
    }
  }
  
  // Otherwise, assume inches
  const inchesMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (inchesMatch) {
    return parseFloat(inchesMatch[1]);
  }
  
  return 0;
}

function parseMetricToCm(input: string): number {
  const numberMatch = input.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return 0;
  
  const value: number = parseFloat(numberMatch[1]);
  
  // Check if it's meters (not cm)
  if (/\d+(\.\d+)?\s*m(?!m)/.test(input)) {
    return value * 100; // Convert meters to cm
  }
  
  return value; // Assume cm
}

function convertMetricToImperial(cm: number): string {
  const inches: number = cm / 2.54;
  const fractionInches: string = toClosestFraction(inches);
  return `${fractionInches}"`;
}

function convertImperialToMetric(inches: number): string {
  const cm: number = inches * 2.54;
  return `${Math.round(cm * 100) / 100}cm`;
}

export function convertUnits(rawInput: string): ConversionResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      value: '',
      isValid: false,
      error: 'Input must be a non-empty string'
    };
  }
  
  const sanitizedInput: string = sanitizeInput(rawInput);
  const unitType: UnitType = detectUnitType(sanitizedInput);
  
  try {
    switch (unitType) {
      case 'metric': {
        const cm: number = parseMetricToCm(sanitizedInput);
        if (cm <= 0) {
          return {
            value: '',
            isValid: false,
            error: 'Invalid metric measurement'
          };
        }
        
        const result: string = convertMetricToImperial(cm);
        return { value: result, isValid: true };
      }
      
      case 'imperial': {
        const inches: number = parseImperialToInches(sanitizedInput);
        if (inches <= 0) {
          return {
            value: '',
            isValid: false,
            error: 'Invalid imperial measurement'
          };
        }
        
        const result: string = convertImperialToMetric(inches);
        return { value: result, isValid: true };
      }
      
      default:
        return {
          value: '',
          isValid: false,
          error: 'Unable to detect unit type. Please use formats like: 70cm, 1.83m, 24", 4\', 6\' 2"'
        };
    }
  } catch (error) {
    console.log("error in size conversion helper: ", error)
    return {
      value: '',
      isValid: false,
      error: 'Error processing input'
    };
  }
}