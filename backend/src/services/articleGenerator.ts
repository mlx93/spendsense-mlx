// Dynamic article generation service using OpenAI
// Generates personalized articles based on user's recommendation context

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const USE_LLM_STUB = process.env.USE_LLM_STUB === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0, // Deterministic output
  top_p: 1,
};

interface ArticleGenerationContext {
  userId: string;
  recommendationId: string;
  title: string;
  rationale: string;
  recommendationType: 'education' | 'offer';
  personaType: string;
  signals?: any;
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

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const systemPrompt = `You are a financial education writer for SpendSense. Generate clear, helpful, personalized articles about personal finance.

RULES:
1. Write in a supportive, educational tone - never shaming or judgmental
2. Use the user's specific financial context provided
3. Match the style and depth of the rationale provided
4. Write 800-1200 words of clear, actionable content
5. Include practical examples relevant to the user's situation
6. Use headings, bullet points, and clear structure
7. End with a supportive summary and next steps
8. NEVER give specific financial advice (no "you should")
9. Focus on education and understanding

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
- Provides actionable insights without giving direct advice
- Uses examples relevant to their financial profile
- Maintains a supportive, empowering tone

Format as Markdown with clear structure.`;

    const completion = await openai.chat.completions.create({
      ...OPENAI_CONFIG,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const generatedContent = completion.choices[0]?.message?.content || '';
    
    if (!generatedContent) {
      throw new Error('No content generated from OpenAI');
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

