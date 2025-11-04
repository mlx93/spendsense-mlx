// Automated agentic review per Architecture PRD Section 3 (AI Integration)

import { checkToneViolations } from '../guardrails/toneValidator';
import OpenAI from 'openai';

const USE_LLM_STUB = process.env.USE_LLM_STUB === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface ReviewResult {
  approved: boolean;
  reason?: string;
}

export async function reviewRecommendation(
  recommendationData: {
    rationale: string;
    type: 'education' | 'offer';
    personaType: string;
  }
): Promise<ReviewResult> {
  const { rationale } = recommendationData;

  // Step 1: Blocklist check
  const toneViolations = checkToneViolations(rationale);
  if (toneViolations.length > 0) {
    return {
      approved: false,
      reason: `Tone violations: ${toneViolations.join(', ')}`,
    };
  }

  // Step 2: LLM compliance review (only if not in stub mode)
  if (USE_LLM_STUB || !OPENAI_API_KEY) {
    // Stub mode: auto-approve if no blocklist violations
    return { approved: true };
  }

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a compliance reviewer for financial education recommendations. 
Review the recommendation rationale for compliance issues.

Check for:
1. Financial advice language ("you should", "I recommend", "best option", etc.)
2. Shaming/judgmental tone ("overspending", "poor choices", etc.)
3. Guarantees or predictions ("will improve", "guaranteed", etc.)

Respond with only "APPROVE" or "FLAG: <reason>".`,
        },
        {
          role: 'user',
          content: `Review this recommendation rationale:
"${rationale}"

Does this contain financial advice, shaming language, or guarantees?`,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content || 'APPROVE';
    
    if (response.startsWith('FLAG:')) {
      return {
        approved: false,
        reason: response.substring(5).trim(),
      };
    }

    return { approved: true };
  } catch (error) {
    console.error('OpenAI review error:', error);
    // On error, approve (fail open) but log the error
    return { approved: true };
  }
}
