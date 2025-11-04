// Dynamic article generation service using OpenAI
// Generates personalized articles based on user's recommendation context
// Uses function calling to ensure compliance with SpendSense guardrails

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { validateTone } from '../guardrails/toneValidator';

const prisma = new PrismaClient();
const USE_LLM_STUB = process.env.USE_LLM_STUB === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0, // Deterministic output
  top_p: 1,
};

// Function tools for compliance checking
const COMPLIANCE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'validate_tone',
      description: 'Check if article text contains prohibited phrases, shaming language, or judgmental tone. Returns list of violations found.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The article text to validate',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_financial_advice',
      description: 'Check if article contains financial advice language (e.g., "you should", "I recommend", "best option"). Returns violations found.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The article text to check for financial advice language',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'verify_disclaimer',
      description: 'Verify that the article includes the required disclaimer about educational content and not financial advice.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The article text to check for disclaimer',
          },
        },
        required: ['text'],
      },
    },
  },
];

interface ArticleGenerationContext {
  userId: string;
  recommendationId: string | null;
  title: string;
  rationale: string;
  recommendationType: 'education' | 'offer';
  personaType: string;
  signals?: any;
  contentId?: string;
}

export async function generateArticle(context: ArticleGenerationContext): Promise<{
  content: string;
  title: string;
  generatedAt: string;
}> {
  if (USE_LLM_STUB || !OPENAI_API_KEY) {
    // Stub for development/testing
    return {
      content: `# ${context.title}\n\nThis is a stub article for: ${context.rationale}\n\n[Article content would be generated here]`,
      title: context.title,
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    // Fetch user's signals and account data for context
    const signals = await prisma.signal.findMany({
      where: { user_id: context.userId, window_days: 30 },
    });

    const signalsMap: any = {};
    for (const signal of signals) {
      signalsMap[signal.signal_type] = signal.data ? JSON.parse(signal.data) : null;
    }

    // Build context for article generation
    let userContext = '';
    if (signalsMap.credit) {
      const credit = signalsMap.credit;
      userContext += `Credit: ${credit.max_utilization ? Math.round(credit.max_utilization * 100) : 0}% utilization`;
      if (credit.interest_charges) {
        userContext += `, $${credit.interest_charges.toFixed(2)}/month in interest charges`;
      }
      userContext += '. ';
    }
    if (signalsMap.subscription) {
      const sub = signalsMap.subscription;
      userContext += `Subscriptions: ${sub.count || 0} active subscriptions totaling $${(sub.monthly_spend || 0).toFixed(2)}/month. `;
    }
    if (signalsMap.savings) {
      const savings = signalsMap.savings;
      userContext += `Savings: ${savings.emergency_fund_coverage ? savings.emergency_fund_coverage.toFixed(1) : 0} months of expenses covered. `;
    }
    if (signalsMap.income) {
      const income = signalsMap.income;
      userContext += `Income: ${income.frequency || 'regular'} income, ${income.cash_buffer ? income.cash_buffer.toFixed(1) : 0} months cash buffer. `;
    }

    const systemPrompt = `You are a financial education writer for SpendSense. Generate clear, helpful, personalized articles about personal finance.

CRITICAL RULES (MUST FOLLOW):
1. NEVER give specific financial advice - avoid phrases like "you should", "I recommend", "best option", "you must", "you need to"
2. Use empowering, educational tone - NO shaming language (no "overspending", "wasteful", "poor choices", "bad with money")
3. Avoid judgmental phrases - use neutral, supportive language
4. Use the user's specific financial context provided
5. Match the style and depth of the rationale provided
6. Write 800-1200 words of clear, actionable content
7. Include practical examples relevant to the user's situation
8. Use headings, bullet points, and clear structure
9. End with a supportive summary and next steps
10. Focus on education and understanding, not directives

REQUIRED DISCLAIMER:
Every article MUST end with: "This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."

VALIDATION WORKFLOW:
1. Generate the article draft
2. Use validate_tone() to check for prohibited phrases and shaming language
3. Use check_financial_advice() to detect any advice-giving language
4. Use verify_disclaimer() to ensure disclaimer is present
5. If any violations are found, revise the article to remove them
6. Re-validate until all checks pass

The article should expand on the rationale: "${context.rationale}"

Write in Markdown format with proper headings (## for main sections, ### for subsections).`;

    const userPrompt = `Generate a personalized article titled "${context.title}".

User's Financial Context:
${userContext || 'General financial education'}

Rationale for Recommendation:
${context.rationale}

Persona Type: ${context.personaType}
Recommendation Type: ${context.recommendationType}

Write an educational article that:
- Explains the topic clearly
- Relates it to the user's specific situation (using the context above)
- Provides actionable insights WITHOUT giving direct advice
- Uses examples relevant to their financial profile
- Maintains a supportive, empowering tone (NO shaming or judgment)
- Includes the required disclaimer at the end

After generating the draft, use the validation tools to ensure compliance before finalizing.

Format as Markdown with clear structure.`;

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Function handlers for compliance checking
    const functionHandlers: Record<string, (args: any) => any> = {
      validate_tone: (args: { text: string }) => {
        const result = validateTone(args.text);
        return {
          valid: result.valid,
          violations: result.issues,
          message: result.valid 
            ? 'No tone violations found'
            : `Found ${result.issues.length} tone violation(s): ${result.issues.join(', ')}`,
        };
      },
      check_financial_advice: (args: { text: string }) => {
        const lowerText = args.text.toLowerCase();
        const advicePhrases = [
          'you should', 'i recommend', 'i advise', 'i suggest you',
          'the best option is', 'you must', 'you need to', 'do this',
          'make sure you', 'you have to', 'required', 'necessary',
        ];
        const violations = advicePhrases.filter(phrase => lowerText.includes(phrase));
        return {
          valid: violations.length === 0,
          violations,
          message: violations.length === 0
            ? 'No financial advice language detected'
            : `Found ${violations.length} financial advice phrase(s): ${violations.join(', ')}`,
        };
      },
      verify_disclaimer: (args: { text: string }) => {
        const lowerText = args.text.toLowerCase();
        const hasDisclaimer = lowerText.includes('educational content') && 
                              lowerText.includes('not financial advice');
        return {
          valid: hasDisclaimer,
          message: hasDisclaimer
            ? 'Required disclaimer found'
            : 'Missing required disclaimer. Article must end with: "This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."',
        };
      },
    };

    // Generate article with function calling for compliance
    let generatedContent = '';
    let validationAttempts = 0;
    const maxAttempts = 3;

    while (validationAttempts < maxAttempts) {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // Add previous validation feedback if this is a retry
      if (validationAttempts > 0) {
        messages.push({
          role: 'assistant',
          content: 'I need to revise the article to fix compliance issues.',
        });
        messages.push({
          role: 'user',
          content: 'Please revise the article to address all compliance violations found in the previous validation.',
        });
      }

      const completion = await openai.chat.completions.create({
        ...OPENAI_CONFIG,
        messages,
        tools: COMPLIANCE_TOOLS,
        tool_choice: validationAttempts === 0 ? 'auto' : 'required', // Require tool use on retries
      });

      const message = completion.choices[0]?.message;
      
      // Handle function calls
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolResults: any[] = [];
        
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          if (functionHandlers[functionName]) {
            const result = functionHandlers[functionName](functionArgs);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool' as const,
              name: functionName,
              content: JSON.stringify(result),
            });
          }
        }

        // Continue conversation with tool results
        messages.push(message);
        messages.push(...toolResults);

        const finalCompletion = await openai.chat.completions.create({
          ...OPENAI_CONFIG,
          messages,
        });

        generatedContent = finalCompletion.choices[0]?.message?.content || '';
      } else {
        // No function calls - use content directly
        generatedContent = message?.content || '';
      }

      // Validate the generated content
      const toneCheck = functionHandlers.validate_tone({ text: generatedContent });
      const adviceCheck = functionHandlers.check_financial_advice({ text: generatedContent });
      const disclaimerCheck = functionHandlers.verify_disclaimer({ text: generatedContent });

      const allValid = toneCheck.valid && adviceCheck.valid && disclaimerCheck.valid;

      if (allValid || validationAttempts >= maxAttempts - 1) {
        // Either all checks pass or we've exhausted retries
        if (!allValid) {
          console.warn('Article validation warnings:', {
            tone: toneCheck.violations,
            advice: adviceCheck.violations,
            disclaimer: !disclaimerCheck.valid,
          });
          // Append disclaimer if missing
          if (!disclaimerCheck.valid) {
            generatedContent += '\n\n**Disclaimer:** This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.';
          }
        }
        break;
      }

      validationAttempts++;
    }
    
    if (!generatedContent) {
      throw new Error('No content generated from OpenAI');
    }

    // Final validation before returning
    const finalToneCheck = validateTone(generatedContent);
    if (!finalToneCheck.valid) {
      console.error('Final article still contains tone violations:', finalToneCheck.issues);
      // Log but don't fail - let operator review handle it
    }

    return {
      content: generatedContent,
      title: context.title,
      generatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Article generation error:', error);
    // Fallback to a basic article structure
    return {
      content: `# ${context.title}\n\n## Overview\n\n${context.rationale}\n\n## Understanding Your Situation\n\nBased on your financial profile, this topic is relevant to your current circumstances.\n\n## Key Concepts\n\n[Article generation temporarily unavailable. Please check back later.]`,
      title: context.title,
      generatedAt: new Date().toISOString(),
    };
  }
}

