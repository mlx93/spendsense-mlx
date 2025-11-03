# SpendSense - Known Limitations

**Version:** 1.0  
**Date:** November 3, 2025  
**Project:** SpendSense

---

## Fairness Analysis

**Status:** Intentionally Deferred for MVP

Fairness parity checks are **not implemented** in the MVP. This decision was made because:

1. **No Demographic Data:** The synthetic data generator does not include demographic attributes (race, gender, age, etc.) that would be required for parity analysis.
2. **MVP Scope:** The assignment prompt indicates fairness metrics should be included "if synthetic data includes demographics." Since we're not generating demographics, we defer this feature.
3. **Future Enhancement:** If demographic attributes are added to the synthetic data generator in the future, simple demographic parity checks should be implemented for:
   - Persona assignment distribution
   - Offer exposure rates
   - Recommendation relevance scores

**Decision Recorded:** This limitation is documented in `/docs/DECISIONS.md` under "Fairness Analysis Deferral."

---

## Technical Limitations

### Data & Storage

- **SQLite Database:** Suitable for MVP (100 users, ~50K transactions) but not production-scale. For production, migrate to PostgreSQL or another distributed database.
- **No Parquet in Runtime:** Parquet export exists for offline analytics only. All runtime queries use SQLite with indices.
- **Static Data:** Synthetic data only; no live Plaid API integration.
- **No Real-Time Updates:** Recommendations are generated on-demand, not streamed in real-time.

### AI Integration

- **LLM Stub Mode:** The system supports a deterministic stub mode (`USE_LLM_STUB=true`) for local runs without OpenAI API calls. This is required by the assignment's "run locally without external dependencies" clause.
- **Chat Determinism:** While we use temperature=0 and strict tool-calling, LLM responses may still have minor variations. The system is designed to be as deterministic as possible, but complete determinism cannot be guaranteed with external APIs.
- **No LLM Content Generation:** Rationales are template-based (string formatting), not LLM-generated. This prioritizes explainability and determinism over natural language sophistication.

### Authentication & Security

- **No OAuth:** Google OAuth excluded for MVP privacy compliance. Synthetic users log in with mock email credentials only.
- **No 2FA:** Two-factor authentication not implemented.
- **No Password Reset:** Password reset functionality not included in MVP.
- **Simple Session Management:** JWT tokens expire after 24 hours; no refresh token mechanism.

### User Experience

- **Web Only:** No mobile app (desktop web browser only).
- **No Email Notifications:** Email alerts and notifications not implemented.
- **No Push Notifications:** Browser push notifications not implemented.
- **Chat Rate Limiting:** Maximum 100 messages per user per session (rate limiting).
- **Limited Content:** ~3-5 curated educational articles per persona (not 30+ as originally scoped).

### Operator View

- **Manual Override Only:** Operators can override persona assignments and hide recommendations, but cannot automatically bulk-approve or bulk-hide.
- **No Automated Workflows:** No scheduled batch jobs or automated recommendation refresh.
- **Limited Audit Export:** Audit logs exportable to CSV, but no advanced filtering or visualization.

### Testing & Quality

- **Minimum Test Coverage:** ≥10 tests (per assignment requirement), but not comprehensive coverage of all edge cases.
- **No Load Testing:** Performance testing only measures single-user latency (<5 seconds), not concurrent load.
- **No Integration Testing with Real Plaid:** All tests use synthetic data only.

---

## Scope Limitations (By Design)

The following features are **explicitly excluded** from MVP to meet the 2-day sprint timeline:

1. **Real Plaid API Integration:** Using synthetic data only (per assignment requirement).
2. **Email/Push Notifications:** Not in scope.
3. **Mobile App:** Web only.
4. **Multi-Language Support:** English only.
5. **Real-Time Transaction Streaming:** On-demand generation only.
6. **Investment Account Integration:** Checking, savings, credit cards, and basic liabilities only.
7. **Bill Pay Functionality:** Read-only analysis, no transaction processing.
8. **Account Aggregation from Multiple Banks:** Single synthetic bank per user.
9. **Social Features:** No sharing or community features.
10. **Gamification:** Basic calculators only; no badges, points, or challenges.
11. **Advanced ML Models:** Rules-based only (no neural networks or complex ML).

---

## Future Enhancements

See `/docs/DECISIONS.md` for prioritized roadmap of future enhancements.

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025

