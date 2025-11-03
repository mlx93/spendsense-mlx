// Tone validation using blocklist and LLM per Reqs PRD Section 6.3

import { checkToneBlocklist } from './toneBlocklist';

export interface ToneValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateTone(text: string): ToneValidationResult {
  // Check blocklist first
  const blocklistResult = checkToneBlocklist(text);
  
  if (blocklistResult.hasProhibitedPhrase) {
    return {
      valid: false,
      issues: blocklistResult.matchedPhrases,
    };
  }
  
  // TODO: Optional LLM-based compliance review (if USE_LLM_STUB=false)
  // Only run if blocklist passes
  
  return {
    valid: true,
    issues: [],
  };
}

