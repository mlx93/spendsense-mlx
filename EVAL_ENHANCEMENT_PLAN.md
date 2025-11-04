# Evaluation Harness Enhancement Plan

**Date:** November 2025  
**Objective:** Add export functionality, relevance aggregation, and CSV export to the evaluation harness

---

## Current State Analysis

### ✅ Already Implemented
1. **Coverage Metrics** - Computes users with persona and ≥3 signals
2. **Explainability Metrics** - Computes % recommendations with rationales
3. **Latency Metrics** - Computes average, P50, P95 latencies
4. **Auditability Metrics** - Computes % recommendations with decision traces
5. **JSON Export** - Saves metrics to `data/analytics/evaluation-metrics.json`
6. **Text Report** - Generates summary report to `data/analytics/evaluation-report.txt`

### ❌ Missing Features
1. **Relevance Metrics** - Relevance scores computed but not aggregated
2. **CSV Export** - Script placeholder exists but not implemented
3. **Per-User Decision Traces Export** - Traces exist in DB but not exported as files
4. **Relevance Score Storage** - Relevance scores computed but not stored in recommendations

---

## Implementation Plan

### Phase 1: Store Relevance Scores in Recommendations

**Goal:** Store relevance scores when recommendations are created so they can be aggregated later.

**Files to Modify:**
- `backend/src/ui/routes/recommendations.ts` - Store relevance score when creating recommendations

**Changes:**
1. When creating education recommendations from `matchContentToUser`, store the `relevanceScore` from `ContentMatch`
2. Add `relevance_score` field to `Recommendation` model (or store in `decision_trace` JSON)

**Option A: Add to Schema (Preferred)**
- Add `relevance_score: Decimal?` to `Recommendation` model
- Run migration: `npx prisma migrate dev --name add_relevance_score`

**Option B: Store in decision_trace JSON (Faster)**
- Add `relevanceScore` to `decisionTrace` object before storing

**Decision:** Use Option B (store in decision_trace) to avoid schema migration. Can migrate later if needed.

---

### Phase 2: Create Relevance Metrics Module

**Goal:** Compute relevance metrics (average, P50, P95) for all recommendations.

**New File:** `backend/src/eval/relevanceMetrics.ts`

**Implementation:**
```typescript
export interface RelevanceMetrics {
  averageRelevance: number;
  p50Relevance: number;
  p95Relevance: number;
  recommendationsWithScore: number;
  totalRecommendations: number;
  targetMet: boolean; // Target: ≥0.7 average
}

export async function computeRelevanceMetrics(): Promise<RelevanceMetrics> {
  // 1. Fetch all recommendations
  // 2. Extract relevance scores from decision_trace JSON
  // 3. Compute average, P50, P95
  // 4. Check if average >= 0.7 (target)
}
```

**Integration:**
- Add to `backend/scripts/eval-harness.ts`
- Add to `EvaluationResults` interface
- Add to console output and report generation

---

### Phase 3: Implement CSV Export

**Goal:** Export all metrics to CSV format for easy analysis.

**File to Modify:** `backend/scripts/eval-harness.ts`

**Implementation:**
1. Create function `exportMetricsToCSV(results: EvaluationResults): string`
2. Convert metrics object to CSV rows:
   - Header row: `Metric,Value,Target,Status`
   - Coverage: `Coverage (Users with Persona),X/Y (Z%),100%,PASS/FAIL`
   - Explainability: `Explainability (Rationales),X/Y (Z%),100%,PASS/FAIL`
   - Relevance: `Relevance (Avg Score),X,≥0.7,PASS/FAIL`
   - Latency: `Latency (Average ms),X,<5000,PASS/FAIL`
   - Auditability: `Auditability (Traces),X/Y (Z%),100%,PASS/FAIL`
3. Save to `data/analytics/evaluation-metrics.csv`

**CSV Format:**
```csv
Metric,Value,Target,Status
Coverage (Users with Persona),95/100 (95.0%),100%,FAIL
Coverage (Users with ≥3 Signals),87/100 (87.0%),100%,FAIL
Explainability (Rationales),450/450 (100.0%),100%,PASS
Relevance (Avg Score),0.72,≥0.7,PASS
Relevance (P50),0.75,≥0.7,PASS
Relevance (P95),0.90,≥0.7,PASS
Latency (Average ms),2341,<5000,PASS
Latency (P50 ms),2100,<5000,PASS
Latency (P95 ms),4500,<5000,PASS
Auditability (Traces),450/450 (100.0%),100%,PASS
```

---

### Phase 4: Export Per-User Decision Traces

**Goal:** Export decision traces for each user to individual JSON files.

**New File:** `backend/src/eval/traceExporter.ts`

**Implementation:**
```typescript
export async function exportDecisionTraces(outputDir: string): Promise<void> {
  // 1. Create output directory: data/analytics/decision_traces/
  // 2. Fetch all users with recommendations
  // 3. For each user:
  //    - Fetch all recommendations with decision_trace
  //    - Build trace object:
  //      {
  //        userId: string,
  //        windowDays: 30 | 180,
  //        signals: { ... },
  //        personas: [ ... ],
  //        recommendations: [
  //          {
  //            id: string,
  //            type: 'education' | 'offer',
  //            contentId/offerId: string,
  //            relevanceScore: number,
  //            rationale: string,
  //            decisionTrace: { ... },
  //            createdAt: string
  //          }
  //        ]
  //      }
  //    - Save to: data/analytics/decision_traces/{userId}-30d.json
  //    - Save to: data/analytics/decision_traces/{userId}-180d.json
}
```

**Integration:**
- Add to `backend/scripts/eval-harness.ts`
- Add command-line flag: `--traces` to enable export
- Update `npm run eval:traces` script

---

### Phase 5: Update Eval Harness Main Script

**File:** `backend/scripts/eval-harness.ts`

**Changes:**
1. Import `computeRelevanceMetrics` and `exportDecisionTraces`
2. Add `relevance` to `EvaluationResults` interface
3. Compute relevance metrics in `runEvaluation()`
4. Add CSV export call
5. Add trace export call (conditional on flag)
6. Update console output to include relevance
7. Update `generateSummaryReport()` to include relevance

---

## File Structure After Implementation

```
backend/
├── src/
│   ├── eval/
│   │   ├── coverageMetrics.ts        ✅ Existing
│   │   ├── explainabilityMetrics.ts  ✅ Existing
│   │   ├── latencyMetrics.ts         ✅ Existing
│   │   ├── auditabilityMetrics.ts    ✅ Existing
│   │   ├── relevanceMetrics.ts       🆕 New
│   │   └── traceExporter.ts          🆕 New
│   └── ui/
│       └── routes/
│           └── recommendations.ts    🔧 Modify (store relevance)
├── scripts/
│   └── eval-harness.ts               🔧 Modify (add relevance, CSV, traces)
└── data/
    └── analytics/
        ├── evaluation-metrics.json   ✅ Existing
        ├── evaluation-metrics.csv    🆕 New
        ├── evaluation-report.txt     ✅ Existing
        └── decision_traces/          🆕 New
            ├── {userId}-30d.json
            └── {userId}-180d.json
```

---

## Testing Plan

1. **Unit Tests:**
   - Test `computeRelevanceMetrics()` with mock data
   - Test `exportDecisionTraces()` file generation
   - Test CSV export format

2. **Integration Tests:**
   - Run full eval harness and verify all outputs
   - Verify CSV file can be opened in Excel/Google Sheets
   - Verify trace JSON files are valid JSON

3. **Manual Verification:**
   - Run `npm run eval` and check all files generated
   - Verify relevance scores match contentMatcher calculations
   - Verify trace files contain expected data structure

---

## Implementation Order

1. ✅ Phase 1: Store relevance scores (store in decision_trace)
2. ✅ Phase 2: Create relevance metrics module
3. ✅ Phase 3: Implement CSV export
4. ✅ Phase 4: Export per-user decision traces
5. ✅ Phase 5: Update eval harness main script

**Estimated Time:** 2-3 hours

---

## Success Criteria

- [ ] Relevance metrics computed and reported (average, P50, P95)
- [ ] CSV file generated with all metrics
- [ ] Per-user decision traces exported as JSON files
- [ ] All existing functionality still works
- [ ] Console output includes relevance metrics
- [ ] Summary report includes relevance section
