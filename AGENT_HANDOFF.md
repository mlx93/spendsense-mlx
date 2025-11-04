# Agent Handoff: Evaluation Harness Enhancement Implementation

## Context Introduction

SpendSense is a financial education platform that analyzes transaction data to provide personalized recommendations with explainable rationales. The evaluation harness (`backend/scripts/eval-harness.ts`) currently computes and reports coverage, explainability, latency, and auditability metrics successfully, meeting all requirements (100% compliance verified). However, three enhancements remain to complete the evaluation system: (1) relevance metrics aggregation (relevance scores are computed during content matching but not stored/aggregated in the evaluation), (2) CSV export functionality (currently only JSON export exists), and (3) per-user decision trace export (traces exist in the database but aren't exported as separate JSON files per user). The implementation plan in `EVAL_ENHANCEMENT_PLAN.md` provides a detailed 5-phase approach with code examples, file locations, and testing strategies. All existing evaluation functionality works correctly—these are additive enhancements that will not break current behavior.

---

## Key Files to Reference

- **Implementation Plan:** `EVAL_ENHANCEMENT_PLAN.md` - Complete 5-phase implementation plan
- **Current Eval Harness:** `backend/scripts/eval-harness.ts` - Main evaluation script
- **Content Matcher:** `backend/src/recommend/contentMatcher.ts` - Computes relevance scores (store in decision_trace)
- **Recommendations Route:** `backend/src/ui/routes/recommendations.ts` - Where recommendations are created
- **Existing Eval Modules:** `backend/src/eval/` - Coverage, explainability, latency, auditability modules (use as templates)
- **Decision Trace Structure:** Check `recommendations.decision_trace` JSON field structure in database

---

## Success Criteria

- [ ] Relevance scores stored in decision_trace when recommendations are created
- [ ] New `relevanceMetrics.ts` module computes average, P50, P95 relevance scores
- [ ] CSV export generates `evaluation-metrics.csv` with all metrics in tabular format
- [ ] Per-user decision traces exported to `data/analytics/decision_traces/{userId}-{window}d.json`
- [ ] All existing evaluation functionality still works
- [ ] Console output and summary report include relevance metrics
