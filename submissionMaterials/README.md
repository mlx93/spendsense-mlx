# Submission Materials

This folder contains all documentation and evaluation artifacts required for the SpendSense project submission.

## Documentation Files

### Core Documentation
- **DECISIONS.md** - Key architectural decisions and their rationales
- **LIMITATIONS.md** - Known limitations and scope exclusions
- **SCHEMA.md** - Complete data model and database schema documentation

### Technical Documentation
- **TECHNICAL_WRITEUP.md** - Brief technical writeup (1-2 pages) covering tech stack, architecture, and key decisions
- **AI_TOOLS_AND_PROMPTS.md** - Documentation of AI tools (OpenAI) and prompts used, including tool calling infrastructure

## Evaluation Artifacts

### Metrics Files
- **evaluation-metrics.json** - Evaluation metrics in JSON format
- **evaluation-metrics.csv** - Evaluation metrics in CSV format
- **evaluation-report.txt** - Brief summary report (1-2 pages) with evaluation results

### Metrics Included
- **Coverage:** % of users with assigned persona and ≥3 detected behaviors (100%)
- **Explainability:** % of recommendations with plain-language rationales (100%)
- **Latency:** Time to generate recommendations per user (<5 seconds, P95 = 884ms)
- **Auditability:** % of recommendations with decision traces (100%)

### Decision Traces
Per-user decision traces are available in `backend/data/analytics/decision_traces/` directory (not included in this folder due to volume).

## Requirements Compliance

All code quality and documentation requirements are met:

✅ Clear modular structure  
✅ One-command setup (`npm run dev`)  
✅ Concise README with setup instructions  
✅ ≥10 unit/integration tests (19 tests)  
✅ Deterministic behavior (DATA_SEED=1337)  
✅ Decision log (`DECISIONS.md`)  
✅ Explicit limitations documented (`LIMITATIONS.md`)  
✅ Standard "not financial advice" disclaimer  
✅ Performance metrics and benchmarks  
✅ Test cases and validation results  
✅ Data model/schema documentation (`SCHEMA.md`)  
✅ Evaluation report (JSON/CSV + summary)  
✅ Brief technical writeup (`TECHNICAL_WRITEUP.md`)  
✅ AI tools and prompts documentation (`AI_TOOLS_AND_PROMPTS.md`)

---

**Last Updated:** November 5, 2025

