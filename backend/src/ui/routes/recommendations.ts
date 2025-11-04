import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';
import { detectSubscriptions } from '../../features/subscriptionDetector';
import { analyzeSavings } from '../../features/savingsAnalyzer';
import { analyzeCredit } from '../../features/creditAnalyzer';
import { analyzeIncomeStability } from '../../features/incomeStabilityAnalyzer';
import { assignPersonas } from '../../personas/scoringEngine';
import { matchContentToUser } from '../../recommend/contentMatcher';
import { matchOffersToUser } from '../../recommend/offerMatcher';
import { generateRationale } from '../../recommend/rationaleGenerator';
import { reviewRecommendation } from '../../recommend/agenticReview';

const router = Router();
const prisma = new PrismaClient();

// Helper function to generate all user data (signals, personas, recommendations)
// Can be called when consent is granted or when refresh is requested
export async function generateUserData(userId: string): Promise<void> {
  console.log(`[generateUserData] Starting data generation for user ${userId}`);
  
  // Check consent FIRST - exit early if consent revoked
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { consent_status: true },
  });
  
  if (!user?.consent_status) {
    console.log(`[generateUserData] User ${userId} has revoked consent, aborting`);
    return; // Exit early
  }
  
  try {
    // Generate signals for both time windows first (regenerate before deleting old ones)
    // This ensures signals are available during the refresh process
    const newSignals: Array<{
      user_id: string;
      signal_type: string;
      window_days: number;
      data: string;
    }> = [];

    for (const windowDays of [30, 180]) {
      try {
        // Subscription signals
        const subscriptionSignal = await detectSubscriptions(userId, windowDays as 30 | 180);
        newSignals.push({
          user_id: userId,
          signal_type: 'subscription',
          window_days: windowDays,
          data: JSON.stringify(subscriptionSignal),
        });

        // Savings signals
        const savingsSignal = await analyzeSavings(userId, windowDays as 30 | 180);
        newSignals.push({
          user_id: userId,
          signal_type: 'savings',
          window_days: windowDays,
          data: JSON.stringify(savingsSignal),
        });

        // Credit signals
        const creditSignal = await analyzeCredit(userId, windowDays as 30 | 180);
        newSignals.push({
          user_id: userId,
          signal_type: 'credit',
          window_days: windowDays,
          data: JSON.stringify(creditSignal),
        });

        // Income signals
        const incomeSignal = await analyzeIncomeStability(userId, windowDays as 30 | 180);
        newSignals.push({
          user_id: userId,
          signal_type: 'income',
          window_days: windowDays,
          data: JSON.stringify(incomeSignal),
        });
      } catch (error: any) {
        console.error(`[generateUserData] Error generating signals for user ${userId}, window ${windowDays}:`, error);
        console.error(`[generateUserData] Error stack:`, error?.stack);
        // Continue with other signals even if one fails
      }
    }

    console.log(`[generateUserData] Generated ${newSignals.length} signals for user ${userId}`);

    // Now delete old signals and personas, then create new ones atomically
    // This minimizes the window where signals don't exist
    await prisma.signal.deleteMany({
      where: { user_id: userId },
    });
    
    // Create all new signals at once
    if (newSignals.length > 0) {
      await prisma.signal.createMany({
        data: newSignals,
      });
      console.log(`[generateUserData] Created ${newSignals.length} signals for user ${userId}`);
    } else {
      console.warn(`[generateUserData] No signals generated for user ${userId} - this may cause issues`);
    }
    
    await prisma.persona.deleteMany({
      where: { user_id: userId },
    });

    // Assign personas and save them to the database
    for (const windowDays of [30, 180]) {
      try {
        const assignment = await assignPersonas(userId, windowDays as 30 | 180);
        
        if (assignment.primary) {
          await prisma.persona.create({
            data: {
              user_id: userId,
              persona_type: assignment.primary.personaType,
              score: assignment.primary.score,
              rank: 1,
              window_days: windowDays,
              criteria_met: JSON.stringify(assignment.primary.criteriaMet),
            },
          });
          console.log(`[generateUserData] Created primary persona ${assignment.primary.personaType} for user ${userId}, window ${windowDays}`);
        } else {
          console.warn(`[generateUserData] No primary persona assigned for user ${userId}, window ${windowDays}`);
        }

        if (assignment.secondary) {
          await prisma.persona.create({
            data: {
              user_id: userId,
              persona_type: assignment.secondary.personaType,
              score: assignment.secondary.score,
              rank: 2,
              window_days: windowDays,
              criteria_met: JSON.stringify(assignment.secondary.criteriaMet),
            },
          });
        }
      } catch (error: any) {
        console.error(`[generateUserData] Error assigning personas for user ${userId}, window ${windowDays}:`, error);
        console.error(`[generateUserData] Error stack:`, error?.stack);
        throw error; // Re-throw to prevent continuing without personas
      }
    }

    // Get personas for recommendation generation
    const personas = await prisma.persona.findMany({
      where: { user_id: userId, window_days: 30, rank: { lte: 2 } },
      orderBy: { rank: 'asc' },
    });

    console.log(`[generateUserData] Found ${personas.length} personas for user ${userId}`);

    const primaryPersona = personas.find(p => p.rank === 1);
    if (!primaryPersona) {
      console.error(`[generateUserData] No primary persona found for user ${userId} - cannot generate recommendations`);
      console.error(`[generateUserData] This usually means user has no accounts/transactions or signals are all empty`);
      // No primary persona means no recommendations can be generated
      // Mark existing recommendations as hidden instead of deleting them
      await prisma.recommendation.updateMany({
        where: { user_id: userId, status: 'active' },
        data: { status: 'hidden' },
      });
      // Don't throw error - user might not have enough data yet
      // Return gracefully so consent/profile endpoints don't fail
      return;
    }

    console.log(`[generateUserData] Using primary persona ${primaryPersona.persona_type} for user ${userId}`);

  // Mark existing active recommendations as hidden (don't delete yet - prevents empty state)
  // We'll delete old hidden ones after new ones are successfully created
  await prisma.recommendation.updateMany({
    where: { 
      user_id: userId,
      status: 'active',
    },
    data: { status: 'hidden' },
  });

  // Get signals for recommendation matching
        const signals = await prisma.signal.findMany({
          where: { user_id: userId, window_days: 30 },
        });

        const signalsMap: Record<string, any> = {};
        for (const signal of signals) {
          signalsMap[signal.signal_type] = JSON.parse(signal.data);
        }

        // Match content - consider both primary and secondary personas for diversification
        const contentMatches = await matchContentToUser(
          userId,
          primaryPersona.persona_type,
          signalsMap
        );

        // Also get matches for secondary persona if it exists
        const secondaryPersona = personas.find(p => p.rank === 2);
        let secondaryMatches: any[] = [];
        if (secondaryPersona && Number(secondaryPersona.score) >= 0.3) {
          secondaryMatches = await matchContentToUser(
            userId,
            secondaryPersona.persona_type,
            signalsMap
          );
        }

        // Exclude dismissed/completed recommendations from matching
        const excludedRecommendations = await prisma.recommendation.findMany({
          where: {
            user_id: userId,
            status: { in: ['dismissed', 'completed'] },
          },
          select: { content_id: true, offer_id: true },
        });

        const excludedContentIds = new Set(
          excludedRecommendations
            .map(r => r.content_id)
            .filter(Boolean)
        );
        const excludedOfferIds = new Set(
          excludedRecommendations
            .map(r => r.offer_id)
            .filter(Boolean)
        );

        // Filter out excluded content from matches
        const filteredContentMatches = contentMatches.filter(
          m => !excludedContentIds.has(m.contentId)
        );
        const filteredSecondaryMatches = secondaryMatches.filter(
          m => !excludedContentIds.has(m.contentId)
        );

        // Diversify recommendations across signal types and personas
        // Fetch all content metadata upfront for efficient category detection
        const allContentIds = new Set([
          ...filteredContentMatches.map(m => m.contentId),
          ...filteredSecondaryMatches.map(m => m.contentId),
        ]);
        const contentMetadata = await prisma.content.findMany({
          where: { id: { in: Array.from(allContentIds) } },
          select: { id: true, signals: true, tags: true },
        });
        const contentMetadataMap = new Map(
          contentMetadata.map(c => [c.id, { signals: JSON.parse(c.signals || '[]'), tags: JSON.parse(c.tags || '[]') }])
        );
        
        const selectedMatches: any[] = [];
        const usedContentIds = new Set<string>();
        
        // Track which signal categories we've covered
        const signalCategoriesCovered = {
          credit: 0,
          subscription: 0,
          savings: 0,
          income: 0,
        };

        // Helper to determine content category
        const getContentCategory = (contentId: string): string | null => {
          const metadata = contentMetadataMap.get(contentId);
          if (!metadata) return null;
          
          const { signals, tags } = metadata;
          if (signals.some((s: string) => 
            s.includes('credit') || s.includes('utilization') || s.includes('debt') || s.includes('interest')
          ) || tags.some((t: string) => 
            t.includes('credit') || t.includes('debt') || t.includes('utilization')
          )) return 'credit';
          if (signals.some((s: string) => s.includes('subscription')) || 
              tags.some((t: string) => t.includes('subscription'))) return 'subscription';
          if (signals.some((s: string) => s.includes('savings') || s.includes('emergency')) || 
              tags.some((t: string) => t.includes('savings') || t.includes('emergency'))) return 'savings';
          if (signals.some((s: string) => s.includes('income') || s.includes('budget')) || 
              tags.some((t: string) => t.includes('income') || t.includes('budget'))) return 'income';
          return null;
        };

        // First pass: Prioritize diversity - get at least one from each available signal category
        for (const match of filteredContentMatches) {
          if (selectedMatches.length >= 5) break;
          if (usedContentIds.has(match.contentId)) continue;
          
          const category = getContentCategory(match.contentId);
          
          // Limit credit articles to max 2 unless very high relevance
          if (category === 'credit' && signalCategoriesCovered.credit >= 2 && match.relevanceScore < 0.85) {
            continue;
          }
          
          // Prioritize uncovered categories, but always take high-relevance items
          const shouldAdd = category && signalCategoriesCovered[category as keyof typeof signalCategoriesCovered] === 0 ||
                           match.relevanceScore >= 0.8 ||
                           selectedMatches.length < 3;
          
          if (shouldAdd) {
            selectedMatches.push(match);
            usedContentIds.add(match.contentId);
            if (category) signalCategoriesCovered[category as keyof typeof signalCategoriesCovered]++;
          }
        }

        // Second pass: Add secondary persona matches for diversity
        if (filteredSecondaryMatches.length > 0 && selectedMatches.length < 5) {
          for (const match of filteredSecondaryMatches) {
            if (selectedMatches.length >= 5) break;
            if (usedContentIds.has(match.contentId)) continue;
            
            const category = getContentCategory(match.contentId);
            
            // Add if it's a new category or if we don't have many of that category yet
            if (!category || signalCategoriesCovered[category as keyof typeof signalCategoriesCovered] < 2) {
              selectedMatches.push(match);
              usedContentIds.add(match.contentId);
              if (category) signalCategoriesCovered[category as keyof typeof signalCategoriesCovered]++;
            }
          }
        }

        // Final pass: Fill remaining slots with best matches regardless of category
        if (selectedMatches.length < 5) {
          for (const match of filteredContentMatches) {
            if (selectedMatches.length >= 5) break;
            if (usedContentIds.has(match.contentId)) continue;
            selectedMatches.push(match);
            usedContentIds.add(match.contentId);
          }
        }

        // Enforce minimum recommendation count (3-5 education items)
        if (selectedMatches.length < 3) {
          console.warn(`[generateUserData] Only ${selectedMatches.length} education matches found for user ${userId}, minimum is 3`);
          // Try to pad with any remaining matches, even if lower relevance
          const remainingMatches = filteredContentMatches.filter(
            m => !usedContentIds.has(m.contentId)
          );
          while (selectedMatches.length < 3 && remainingMatches.length > 0) {
            const match = remainingMatches.shift();
            if (match) {
              selectedMatches.push(match);
              usedContentIds.add(match.contentId);
            }
          }
          if (selectedMatches.length < 3) {
            console.warn(`[generateUserData] Cannot meet minimum of 3 education recommendations for user ${userId}. Only ${selectedMatches.length} available.`);
          }
        }

    // Create education recommendations
    console.log(`[generateUserData] Creating ${selectedMatches.length} education recommendations for user ${userId}`);
    let educationCount = 0;
    for (const match of selectedMatches) {
      if (!match) continue;

      try {
        const rationaleResult = await generateRationale(
          'education',
          match,
          signalsMap,
          primaryPersona.persona_type,
          userId
        );

        const reviewResult = await reviewRecommendation({
          rationale: rationaleResult.rationale,
          type: 'education',
          personaType: primaryPersona.persona_type,
        });

        // Build complete decision trace
        const decisionTrace = {
          signals_snapshot: {
            credit: signalsMap['credit'] || null,
            subscription: signalsMap['subscription'] || null,
            savings: signalsMap['savings'] || null,
            income: signalsMap['income'] || null,
          },
          persona_scores: {
            primary: {
              type: primaryPersona.persona_type,
              score: Number(primaryPersona.score),
            },
            secondary: secondaryPersona ? {
              type: secondaryPersona.persona_type,
              score: Number(secondaryPersona.score),
            } : null,
          },
          rule_path: [
            `content_filter:persona_fit=${match.personaFit}`,
            `content_filter:signal_overlap=${match.signalOverlap.toFixed(2)}`,
            `content_filter:relevance_score=${match.relevanceScore.toFixed(2)}`,
          ],
          eligibility_results: {
            passed: true,
            failed_rules: [],
          },
          rationale_template_id: rationaleResult.templateId,
          relevance_score: match.relevanceScore, // Store relevance score for metrics aggregation
          generated_at: new Date().toISOString(),
        };

        await prisma.recommendation.create({
          data: {
            user_id: userId,
            type: 'education',
            content_id: match.contentId,
            rationale: rationaleResult.rationale,
            persona_type: primaryPersona.persona_type,
            signals_used: JSON.stringify(match.signalsUsed || []),
            decision_trace: JSON.stringify(decisionTrace),
            status: reviewResult.approved ? 'active' : 'hidden',
            agentic_review_status: reviewResult.approved ? 'approved' : 'flagged',
            agentic_review_reason: reviewResult.reason || null,
          },
        });
        educationCount++;
      } catch (error: any) {
        console.error(`[generateUserData] Error creating education recommendation for user ${userId}:`, error);
        console.error(`[generateUserData] Error stack:`, error?.stack);
        // Continue with other recommendations even if one fails
      }
    }
    console.log(`[generateUserData] Created ${educationCount} education recommendations for user ${userId}`);

    // Match and create offer recommendations
    const offerMatches = await matchOffersToUser(
      userId,
      primaryPersona.persona_type,
      signalsMap
    );

    // Filter out excluded offers
    const filteredOfferMatches = offerMatches.filter(
      m => m.eligible && !excludedOfferIds.has(m.offerId)
    );

    console.log(`[generateUserData] Found ${filteredOfferMatches.length} eligible offer matches for user ${userId} (after filtering dismissed)`);
    
    // Enforce minimum offer count (1-3 offers)
    const minOffers = 1;
    const maxOffers = 3;
    const targetOfferCount = Math.min(Math.max(filteredOfferMatches.length, minOffers), maxOffers);
    
    if (filteredOfferMatches.length === 0) {
      console.warn(`[generateUserData] No eligible offers found for user ${userId}`);
    } else if (filteredOfferMatches.length < minOffers) {
      console.warn(`[generateUserData] Only ${filteredOfferMatches.length} eligible offers found for user ${userId}, minimum is ${minOffers}`);
    }
    
    let offerCount = 0;
    for (let i = 0; i < Math.min(filteredOfferMatches.length, targetOfferCount); i++) {
      const match = filteredOfferMatches[i];
      if (!match || !match.eligible) continue;

      try {
        const rationaleResult = await generateRationale(
          'offer',
          match,
          signalsMap,
          primaryPersona.persona_type,
          userId
        );

        const reviewResult = await reviewRecommendation({
          rationale: rationaleResult.rationale,
          type: 'offer',
          personaType: primaryPersona.persona_type,
        });

        // Build complete decision trace
        // For offers, calculate relevance score based on persona fit and signal match
        // Similar to content matching: persona_fit * 0.7 + signal_match * 0.3
        const offer = await prisma.offer.findUnique({ where: { id: match.offerId } });
        const requiredSignals = offer ? JSON.parse(offer.required_signals || '[]') : [];
        const offerRelevanceScore = match.personaFit ? 0.7 : 0;
        const signalMatchRatio = requiredSignals.length > 0
          ? (match.signalsUsed?.length || 0) / requiredSignals.length
          : (match.signalsUsed?.length || 0) > 0 ? 1 : 0;
        const calculatedRelevanceScore = offerRelevanceScore + (signalMatchRatio * 0.3);
        
        const decisionTrace = {
          signals_snapshot: {
            credit: signalsMap['credit'] || null,
            subscription: signalsMap['subscription'] || null,
            savings: signalsMap['savings'] || null,
            income: signalsMap['income'] || null,
          },
          persona_scores: {
            primary: {
              type: primaryPersona.persona_type,
              score: Number(primaryPersona.score),
            },
            secondary: secondaryPersona ? {
              type: secondaryPersona.persona_type,
              score: Number(secondaryPersona.score),
            } : null,
          },
          rule_path: [
            `offer_filter:persona_fit=${match.personaFit}`,
            `offer_filter:required_signals=${(match.signalsUsed || []).join(',')}`,
            `eligibility:passed=${match.eligible}`,
            ...(match.failedRules && match.failedRules.length > 0
              ? [`eligibility:failed_rules=${match.failedRules.map((r: any) => `${r.field}${r.operator}${r.value}`).join(',')}`]
              : []),
          ],
          eligibility_results: {
            passed: match.eligible,
            failed_rules: match.failedRules || [],
          },
          rationale_template_id: rationaleResult.templateId,
          relevance_score: calculatedRelevanceScore, // Store relevance score for metrics aggregation
          generated_at: new Date().toISOString(),
        };

        await prisma.recommendation.create({
          data: {
            user_id: userId,
            type: 'offer',
            offer_id: match.offerId,
            rationale: rationaleResult.rationale,
            persona_type: primaryPersona.persona_type,
            signals_used: JSON.stringify(match.signalsUsed || []),
            decision_trace: JSON.stringify(decisionTrace),
            status: reviewResult.approved ? 'active' : 'hidden',
            agentic_review_status: reviewResult.approved ? 'approved' : 'flagged',
            agentic_review_reason: reviewResult.reason || null,
          },
        });
        offerCount++;
      } catch (error: any) {
        console.error(`[generateUserData] Error creating offer recommendation for user ${userId}:`, error);
        console.error(`[generateUserData] Error stack:`, error?.stack);
        // Continue with other offers even if one fails
      }
    }
    console.log(`[generateUserData] Created ${offerCount} offer recommendations for user ${userId}`);
    
    // After successfully creating new recommendations, delete old hidden ones
    // This cleanup ensures we don't accumulate hidden recommendations over time
    // Only delete recommendations older than 1 minute to avoid race conditions
    await prisma.recommendation.deleteMany({
      where: {
        user_id: userId,
        status: 'hidden',
        created_at: {
          lt: new Date(Date.now() - 60000), // 1 minute ago
        },
      },
    });
    
    console.log(`[generateUserData] Successfully completed data generation for user ${userId} - ${educationCount} education, ${offerCount} offers`);
  } catch (error: any) {
    console.error(`[generateUserData] Fatal error generating user data for user ${userId}:`, error);
    console.error(`[generateUserData] Error stack:`, error?.stack);
    // Re-throw so caller knows generation failed
    throw error;
  }
}

// POST /api/feedback - Record user action on recommendation
router.post('/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { recommendation_id, action } = req.body;

    if (!recommendation_id || !action) {
      return res.status(400).json({
        error: 'recommendation_id and action required',
        code: 'VALIDATION_ERROR',
        details: {},
      });
    }

    // Verify user owns this recommendation
    const recommendation = await prisma.recommendation.findFirst({
      where: {
        id: recommendation_id,
        user_id: userId,
      },
    });

    if (!recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    // Map action to status
    const statusMap: Record<string, string> = {
      dismissed: 'dismissed',
      completed: 'completed',
      saved: 'saved',
      clicked: 'active',
      undismiss: 'active', // Add undismiss action that restores to active
    };

    const newStatus = statusMap[action] || recommendation.status;

    await prisma.recommendation.update({
      where: { id: recommendation_id },
      data: { status: newStatus },
    });

    await prisma.userFeedback.create({
      data: {
        user_id: userId,
        recommendation_id,
        action,
      },
    });

    res.json({
      success: true,
      recommendation: {
        id: recommendation_id,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      error: 'Failed to record feedback',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// GET /api/recommendations/:userId - Get personalized recommendations
router.get('/:userId', authenticateToken, requireConsent, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const { status, refresh } = req.query;

    // Verify user can only access their own recommendations (or operator can access any)
    if (req.userId !== userId && req.userRole !== 'operator') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // If refresh=true, start data generation in background (non-blocking)
    // This allows the endpoint to return quickly while generation happens asynchronously
    if (refresh === 'true') {
      // Use setImmediate to ensure this runs in the next event loop tick
      // This prevents any synchronous errors from affecting the current request
      setImmediate(() => {
        generateUserData(userId).catch((error) => {
          console.error(`Error generating user data for user ${userId} during refresh:`, error);
          console.error('Error stack:', error?.stack);
          // Don't throw - generation happens in background, user can retry if needed
        });
      });
      // Return immediately with existing recommendations
      // Frontend can reload after a short delay to see updated data
    }

    // Get recommendations
    // Note: During refresh, generateUserData runs in background and may delete recommendations
    // We fetch existing ones here, and frontend will reload after generation completes
    const whereClause: any = { user_id: userId };
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = 'active'; // Default to active
    }

    let recommendations: Array<{
      id: string;
      type: string;
      rationale: string | null;
      persona_type: string;
      status: string;
      created_at: Date;
      content: any;
      offer: any;
    }> = [];
    try {
      recommendations = await prisma.recommendation.findMany({
      where: whereClause,
      include: {
        content: true,
        offer: true,
      },
      orderBy: { created_at: 'desc' },
    });
    } catch (dbError: any) {
      console.error('Error fetching recommendations from database:', dbError);
      // If database query fails, return empty array rather than failing the entire request
      recommendations = [];
    }

    const formatted = recommendations.map(rec => {
      try {
      const base = {
        id: rec.id,
        type: rec.type,
          rationale: rec.rationale || '',
        personaType: rec.persona_type,
        status: rec.status,
        createdAt: rec.created_at,
      };

      if (rec.type === 'education' && rec.content) {
        // Parse tags from content to determine category
        let category = 'Education';
        try {
          const tags = JSON.parse(rec.content.tags || '[]');
          if (tags.some((tag: string) => ['credit', 'utilization', 'debt'].some(t => tag.toLowerCase().includes(t)))) {
            category = 'Credit';
          } else if (tags.some((tag: string) => ['savings', 'emergency'].some(t => tag.toLowerCase().includes(t)))) {
            category = 'Savings';
          } else if (tags.some((tag: string) => ['budget', 'spending'].some(t => tag.toLowerCase().includes(t)))) {
            category = 'Budgeting';
          } else if (tags.some((tag: string) => ['income', 'paycheck'].some(t => tag.toLowerCase().includes(t)))) {
            category = 'Income';
          } else if (tags.some((tag: string) => ['subscription'].some(t => tag.toLowerCase().includes(t)))) {
            category = 'Subscriptions';
          } else if (tags.some((tag: string) => ['invest', 'wealth'].some(t => tag.toLowerCase().includes(t)))) {
            category = 'Investing';
          }
        } catch (err) {
          // Keep default category if parsing fails
        }
        return {
          ...base,
            title: rec.content.title || 'Untitled',
            excerpt: rec.content.excerpt || '',
            url: rec.content.url || '',
            category,
        };
      } else if (rec.type === 'offer' && rec.offer) {
        return {
          ...base,
            title: rec.offer.title || 'Untitled Offer',
            description: rec.offer.description || '',
            url: rec.offer.url || '',
            category: 'Offer',
        };
      }

      return base;
      } catch (formatError: any) {
        console.error(`Error formatting recommendation ${rec.id}:`, formatError);
        // Return a minimal valid recommendation object
        return {
          id: rec.id,
          type: rec.type || 'education',
          rationale: rec.rationale || '',
          personaType: rec.persona_type || '',
          status: rec.status || 'active',
          createdAt: rec.created_at,
          title: 'Untitled',
          excerpt: '',
          url: '',
        };
      }
    });

    res.json({
      userId,
      recommendations: formatted,
      disclaimer: 'This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.',
    });
  } catch (error: any) {
    console.error('Recommendations error:', error);
    console.error('Error stack:', error?.stack);
    const errorDetails: any = {
      errorMessage: error?.message,
      errorCode: error?.code,
    };
    try {
      errorDetails.userId = req.params.userId;
      errorDetails.status = req.query.status;
      errorDetails.refresh = req.query.refresh;
    } catch (e) {
      // Ignore if req is not available
    }
    console.error('Error details:', errorDetails);
    res.status(500).json({
      error: 'Failed to fetch recommendations',
      code: 'INTERNAL_ERROR',
      details: {
        message: error?.message || 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack }),
      },
    });
  }
});

export default router;
