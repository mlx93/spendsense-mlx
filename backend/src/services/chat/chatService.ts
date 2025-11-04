// Chat service with OpenAI GPT-4o-mini integration
// Implements 9 read-only function tools per Architecture PRD Appendix

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();
const USE_LLM_STUB = process.env.USE_LLM_STUB === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a financial education assistant for SpendSense. Your role is to help users understand their spending patterns and financial behaviors through data and education.

CORE RULES:
1. NEVER give specific financial advice (no "you should", "I recommend", "best option")
2. ALWAYS explain using the user's actual data from function calls
3. Use empowering, educational tone - no shaming language
4. When users ask advice questions, redirect to education + data insights
5. Always include disclaimer for anything that could be construed as advice

YOU CAN:
- Explain user's behavioral signals and patterns
- Clarify why recommendations were made
- Point to educational content
- Help users understand financial terms in their context
- Show transaction patterns and trends

YOU CANNOT:
- Recommend specific financial products
- Tell users what to do with their money
- Make predictions about credit scores or loan approvals
- Access or modify user accounts
- Process transactions

When unsure, call get_content_disclaimer() and focus on education.`;

// Tool definitions for OpenAI function calling
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_user_signals',
      description: 'Returns user\'s behavioral signals for a specific time window',
      parameters: {
        type: 'object',
        properties: {
          signal_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: filter to specific signals (subscription, savings, credit, income)',
          },
          window: {
            type: 'integer',
            enum: [30, 180],
            description: 'Time window in days (30 or 180, default 30)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_user_recommendations',
      description: 'Returns current active recommendations with rationales',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_recommendation_details',
      description: 'Deep dive on specific recommendation with decision trace',
      parameters: {
        type: 'object',
        properties: {
          recommendation_id: { type: 'string', description: 'Recommendation ID' },
        },
        required: ['recommendation_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_user_transactions',
      description: 'Filter transactions by criteria',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category filter (optional)' },
          merchant: { type: 'string', description: 'Merchant name filter (optional)' },
          date_range: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' },
            },
          },
          limit: { type: 'integer', description: 'Max results (default 50, max 100)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_user_accounts_summary',
      description: 'High-level account overview with balances and utilization',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_educational_content',
      description: 'Find relevant articles by topic keywords',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Keywords to search' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'explain_financial_term',
      description: 'Define financial term in user\'s context',
      parameters: {
        type: 'object',
        properties: {
          term: { type: 'string', description: 'Term to explain (e.g., "credit utilization")' },
        },
        required: ['term'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_offer_eligibility',
      description: 'Check if user qualifies for a specific offer (read-only)',
      parameters: {
        type: 'object',
        properties: {
          offer_id: { type: 'string', description: 'Offer ID' },
        },
        required: ['offer_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_content_disclaimer',
      description: 'Return standard disclaimer text',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// Tool implementations
async function executeTool(
  toolName: string,
  args: any,
  userId: string,
  consentStatus: boolean
): Promise<any> {
  // All tools check consent first (except get_content_disclaimer)
  if (toolName !== 'get_content_disclaimer' && !consentStatus) {
    throw new Error('Consent required to access user data');
  }

  switch (toolName) {
    case 'get_user_signals': {
      const window = args.window || 30;
      const signalTypes = args.signal_types || ['subscription', 'savings', 'credit', 'income'];

      const signals = await prisma.signal.findMany({
        where: {
          user_id: userId,
          window_days: window,
          signal_type: { in: signalTypes },
        },
      });

      const result: any = { window };
      for (const signal of signals) {
        result[signal.signal_type] = JSON.parse(signal.data);
      }
      return result;
    }

    case 'get_user_recommendations': {
      const recommendations = await prisma.recommendation.findMany({
        where: {
          user_id: userId,
          status: 'active',
        },
        include: {
          content: true,
          offer: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      });

      return {
        recommendations: recommendations.map(rec => ({
          id: rec.id,
          type: rec.type,
          title: rec.type === 'education' ? rec.content?.title : rec.offer?.title,
          rationale: rec.rationale,
          personaType: rec.persona_type,
          url: rec.type === 'education' ? rec.content?.url : rec.offer?.url,
        })),
      };
    }

    case 'get_recommendation_details': {
      const rec = await prisma.recommendation.findFirst({
        where: {
          id: args.recommendation_id,
          user_id: userId,
        },
      });

      if (!rec) {
        throw new Error('Recommendation not found');
      }

      return {
        id: rec.id,
        type: rec.type,
        rationale: rec.rationale,
        decisionTrace: JSON.parse(rec.decision_trace),
      };
    }

    case 'search_user_transactions': {
      const accounts = await prisma.account.findMany({
        where: { user_id: userId },
      });
      const accountIds = accounts.map(a => a.account_id);

      const where: any = {
        account_id: { in: accountIds },
      };

      if (args.category) {
        where.personal_finance_category_primary = args.category;
      }

      if (args.merchant) {
        where.merchant_name = { contains: args.merchant };
      }

      if (args.date_range) {
        where.date = {
          gte: new Date(args.date_range.start),
          lte: new Date(args.date_range.end),
        };
      }

      const limit = Math.min(args.limit || 50, 100);
      const transactions = await prisma.transaction.findMany({
        where,
        take: limit,
        orderBy: { date: 'desc' },
      });

      return {
        transactions: transactions.map(t => ({
          id: t.transaction_id,
          date: t.date,
          amount: Number(t.amount),
          merchant_name: t.merchant_name,
          category: t.personal_finance_category_primary,
        })),
        total: transactions.length,
      };
    }

    case 'get_user_accounts_summary': {
      const accounts = await prisma.account.findMany({
        where: { user_id: userId },
      });

      return {
        accounts: accounts.map(acc => ({
          id: acc.account_id,
          type: acc.type,
          balance_current: Number(acc.balance_current),
          balance_limit: acc.balance_limit ? Number(acc.balance_limit) : null,
          utilization: acc.type === 'credit_card' && acc.balance_limit
            ? Number(acc.balance_current) / Number(acc.balance_limit)
            : null,
          masked_display: `ending in ${acc.account_id.slice(-4)}`,
        })),
      };
    }

    case 'search_educational_content': {
      const topicLower = args.topic.toLowerCase();
      // SQLite doesn't support case-insensitive mode, so we filter manually
      const allContent = await prisma.content.findMany({
        take: 100, // Get more than needed, then filter
      });

      const content = allContent
        .filter(c => 
          c.title.toLowerCase().includes(topicLower) ||
          c.editorial_summary.toLowerCase().includes(topicLower)
        )
        .slice(0, 10);

      return {
        content: content.map(c => ({
          id: c.id,
          title: c.title,
          source: c.source,
          url: c.url,
          excerpt: c.excerpt,
          tags: JSON.parse(c.tags),
        })),
      };
    }

    case 'explain_financial_term': {
      // Simple explanations for common terms
      const explanations: Record<string, string> = {
        'credit utilization': 'Credit utilization is the percentage of your available credit that you are using. It\'s calculated by dividing your current balance by your credit limit.',
        'emergency fund': 'An emergency fund is money set aside to cover unexpected expenses or financial emergencies, typically 3-6 months of living expenses.',
        'minimum payment': 'The minimum payment is the smallest amount you must pay on a credit card each month to keep your account in good standing.',
      };

      const term = args.term.toLowerCase();
      const explanation = explanations[term] || `Financial term: ${args.term}. This is a general financial concept.`;

      return {
        definition: explanation,
        term: args.term,
      };
    }

    case 'check_offer_eligibility': {
      const offer = await prisma.offer.findUnique({
        where: { id: args.offer_id },
      });

      if (!offer) {
        throw new Error('Offer not found');
      }

      // Get user signals for eligibility check
      const signals = await prisma.signal.findMany({
        where: { user_id: userId, window_days: 30 },
      });

      const signalsMap: Record<string, any> = {};
      for (const signal of signals) {
        signalsMap[signal.signal_type] = JSON.parse(signal.data);
      }

      const accounts = await prisma.account.findMany({
        where: { user_id: userId },
      });

      const creditSignal = signalsMap['credit'];
      const incomeSignal = signalsMap['income'];

      const userData = {
        max_utilization: creditSignal?.max_utilization || 0,
        annual_income: (incomeSignal?.average_monthly_income || 0) * 12,
        interest_charges_present: (creditSignal?.interest_charges || 0) > 0,
        is_overdue: creditSignal?.any_overdue || false,
      };

      const eligibilityRules = JSON.parse(offer.eligibility_rules || '[]');
      const failedRules: any[] = [];

      for (const rule of eligibilityRules) {
        const userValue = userData[rule.field as keyof typeof userData];
        let passed = false;

        switch (rule.operator) {
          case '>=':
            passed = userValue >= rule.value;
            break;
          case '==':
            passed = userValue === rule.value;
            break;
          case '!=':
            passed = userValue !== rule.value;
            break;
        }

        if (!passed) {
          failedRules.push(rule);
        }
      }

      return {
        eligible: failedRules.length === 0,
        reasons: failedRules.length === 0
          ? ['All eligibility requirements met']
          : failedRules.map(r => `Failed: ${r.field} ${r.operator} ${r.value}`),
        failed_rules: failedRules,
      };
    }

    case 'get_content_disclaimer': {
      return {
        disclaimer: 'This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.',
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export async function handleChatMessage(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  consentStatus: boolean
): Promise<{
  response: string;
  functionCalls: Array<{ name: string; args: any; result: any }>;
}> {
  // Check consent
  if (!consentStatus) {
    return {
      response: 'Please enable personalized insights by allowing SpendSense to analyze your data.',
      functionCalls: [],
    };
  }

  // Stub mode: return template response
  if (USE_LLM_STUB || !OPENAI_API_KEY) {
    return {
      response: 'I can help you understand your spending patterns. Try asking about your credit utilization, subscriptions, or savings.',
      functionCalls: [],
    };
  }

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Get recent conversation history (last 20 messages)
    const recentHistory = conversationHistory.slice(-20);

    // Prepare messages
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentHistory,
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      temperature: 0,
      top_p: 1,
    });

    const assistantMessage = completion.choices[0]?.message;
    let response = assistantMessage?.content || '';
    const functionCalls: Array<{ name: string; args: any; result: any }> = [];

    // Handle function calls
    if (assistantMessage?.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || '{}');

        try {
          const result = await executeTool(toolName, args, userId, consentStatus);
          functionCalls.push({
            name: toolName,
            args,
            result,
          });

          // Add function result to conversation
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error: any) {
          functionCalls.push({
            name: toolName,
            args,
            result: { error: error.message },
          });
        }
      }

      // Get final response after function calls
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0,
        top_p: 1,
      });

      response = finalCompletion.choices[0]?.message?.content || response;
    }

    return { response, functionCalls };
  } catch (error: any) {
    console.error('Chat error:', error);
    return {
      response: 'I encountered an error. Please try again.',
      functionCalls: [],
    };
  }
}

