# SpendSense Project Brief

## Overview
SpendSense is an explainable, consent-aware financial education platform that provides personalized recommendations based on behavioral analysis of transaction data. The platform helps users understand their spending patterns, identify areas for improvement, and provides actionable financial education content and partner offers.

## Core Goals
1. **Explainability:** All recommendations include clear rationales explaining why they were suggested
2. **Consent-Aware:** Users must explicitly consent before data analysis begins
3. **Transparency:** Users can see the behavioral signals that drive their persona assignment
4. **Safety:** Guardrails ensure recommendations are appropriate, eligible, and non-shaming
5. **Human Oversight:** Operator dashboard allows manual review and override of automated decisions

## Key Features
- **Behavioral Signal Detection:** Analyzes transactions to detect subscriptions, savings patterns, credit utilization, and income stability
- **Invisible Personas:** Assigns users to one of 5 persona types without labeling them
- **Personalized Recommendations:** 3-5 educational articles + 1-3 partner offers per user
- **Interactive Calculators:** Emergency fund, debt payoff, and subscription audit tools
- **Chat Assistant:** AI-powered financial guidance with 9 read-only function tools
- **Spending Patterns Visualization:** Charts showing category breakdown and recurring vs one-time spending
- **Consent Management:** Users can grant or revoke consent at any time

## Success Criteria
- ✅ 100 synthetic users with realistic transaction data
- ✅ Signal detection for 4 behavioral patterns (30d and 180d windows)
- ✅ Persona assignment with primary and secondary personas
- ✅ Personalized recommendations with rationales and decision traces
- ✅ Full-stack application (React frontend + Express backend)
- ✅ Operator dashboard for oversight
- ✅ Evaluation metrics (coverage, explainability, latency, auditability)

## Technical Requirements
- TypeScript throughout (type safety)
- Plaid-compatible data structure
- Deterministic results (fixed seeds for reproducibility)
- Template-based rationales (not LLM-generated for consistency)
- JWT authentication
- CORS-enabled for frontend-backend communication
- Vercel deployment ready

## Current Status
**Implementation:** ✅ Complete (November 2024)
**Database:** Seeded with 100 users, 318 accounts, 189K+ transactions, 407 recommendations
**Test Coverage:** 19 tests passing across 8 test suites
**Deployment:** Vercel production deployment configured

