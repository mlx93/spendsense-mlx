# SpendSense - AI Tools and Prompts Documentation

**Version:** 1.0  
**Date:** November 5, 2025  
**Project:** SpendSense

---

## Overview

SpendSense uses OpenAI GPT-4o-mini for conversational AI capabilities. The system implements **function calling** (tool calling) to enable the LLM to access user data in a controlled, read-only manner. However, this feature is **not yet tested or production-ready** - the system currently runs in stub mode.

---

## AI Integration Status

### Current State
- ✅ **Infrastructure Built:** Tool calling code complete
- ✅ **Tool Definitions:** 9 read-only functions defined
- ✅ **Execution Logic:** Tool handlers implemented
- ⚠️ **Not Tested:** Not yet validated with real OpenAI API calls
- ⚠️ **Not in Production:** System runs in stub mode (`USE_LLM_STUB=true`)

### Stub Mode
When `USE_LLM_STUB=true` (default), the chat service returns template responses without making OpenAI API calls. This enables:
- Local development without API keys
- Testing without external dependencies
- Meets assignment requirement: "run locally without external dependencies"

---

## OpenAI Tool Calling Architecture

### Implementation Location
- **File:** `backend/src/services/chat/chatService.ts`
- **Model:** GPT-4o-mini
- **Temperature:** 0 (deterministic responses)
- **Top P:** 1

### Tool Definitions

The system defines 9 read-only function tools that the LLM can call:

#### 1. `get_user_signals`
**Purpose:** Retrieve user's behavioral signals for a specific time window.

**Parameters:**
- `signal_types` (optional array): Filter to specific signals (subscription, savings, credit, income)
- `window` (optional integer): Time window in days (30 or 180, default 30)

**Returns:** JSON object with signal data for requested types and window.

**Example Tool Call:**
```json
{
  "name": "get_user_signals",
  "arguments": {
    "signal_types": ["credit", "savings"],
    "window": 30
  }
}
```

#### 2. `get_user_recommendations`
**Purpose:** Get current active recommendations with rationales.

**Parameters:** None

**Returns:** Array of active recommendations with types, rationales, and IDs.

**Example Tool Call:**
```json
{
  "name": "get_user_recommendations",
  "arguments": {}
}
```

#### 3. `get_recommendation_details`
**Purpose:** Deep dive on specific recommendation with decision trace.

**Parameters:**
- `recommendation_id` (required string): Recommendation ID

**Returns:** Full recommendation details including decision trace JSON.

**Example Tool Call:**
```json
{
  "name": "get_recommendation_details",
  "arguments": {
    "recommendation_id": "rec_123abc"
  }
}
```

#### 4. `search_user_transactions`
**Purpose:** Filter transactions by criteria.

**Parameters:**
- `category` (optional string): Category filter
- `merchant` (optional string): Merchant name filter
- `date_range` (optional object): `{ start: "YYYY-MM-DD", end: "YYYY-MM-DD" }`
- `limit` (optional integer): Max results (default 50, max 100)

**Returns:** Array of matching transactions.

**Example Tool Call:**
```json
{
  "name": "search_user_transactions",
  "arguments": {
    "category": "food_and_drink",
    "date_range": {
      "start": "2025-10-01",
      "end": "2025-10-31"
    },
    "limit": 20
  }
}
```

#### 5. `get_user_accounts_summary`
**Purpose:** High-level account overview with balances and utilization.

**Parameters:** None

**Returns:** Summary of all accounts (checking, savings, credit cards) with balances and utilization percentages.

**Example Tool Call:**
```json
{
  "name": "get_user_accounts_summary",
  "arguments": {}
}
```

#### 6. `search_educational_content`
**Purpose:** Find relevant articles by topic keywords.

**Parameters:**
- `topic` (required string): Keywords to search

**Returns:** Array of matching educational content with titles, excerpts, and URLs.

**Example Tool Call:**
```json
{
  "name": "search_educational_content",
  "arguments": {
    "topic": "credit utilization"
  }
}
```

#### 7. `explain_financial_term`
**Purpose:** Define financial term in user's context.

**Parameters:**
- `term` (required string): Term to explain (e.g., "credit utilization")

**Returns:** Plain-language explanation tailored to user's data.

**Example Tool Call:**
```json
{
  "name": "explain_financial_term",
  "arguments": {
    "term": "credit utilization"
  }
}
```

#### 8. `check_offer_eligibility`
**Purpose:** Check if user qualifies for a specific offer (read-only).

**Parameters:**
- `offer_id` (required string): Offer ID

**Returns:** Eligibility status with passed/failed rules.

**Example Tool Call:**
```json
{
  "name": "check_offer_eligibility",
  "arguments": {
    "offer_id": "offer_123abc"
  }
}
```

#### 9. `get_content_disclaimer`
**Purpose:** Return standard disclaimer text.

**Parameters:** None

**Returns:** Standard disclaimer: "This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."

**Example Tool Call:**
```json
{
  "name": "get_content_disclaimer",
  "arguments": {}
}
```

---

## System Prompt

The system prompt enforces strict guardrails for the LLM:

```
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
```

---

## Tool Execution Flow

### 1. User Message Received
User sends message to `/api/chat` endpoint.

### 2. Consent Check
All tools (except `get_content_disclaimer`) require user consent. If consent not granted, return error.

### 3. Stub Mode Check
If `USE_LLM_STUB=true` or no `OPENAI_API_KEY`, return template response without API call.

### 4. OpenAI API Call
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [systemPrompt, ...conversationHistory, userMessage],
  tools: TOOLS,
  temperature: 0,
  top_p: 1,
});
```

### 5. Tool Call Handling
If LLM requests tool calls:
- Parse tool name and arguments
- Execute tool function with user ID and arguments
- Return results to LLM
- LLM generates final response incorporating tool results

### 6. Response Returned
Return LLM response with function call log to frontend.

---

## Security & Privacy

### Read-Only Access
All tools are **read-only** - they cannot modify user data or accounts.

### Consent Enforcement
All data-accessing tools check consent status before execution.

### User Isolation
Tool execution scoped to authenticated user ID - users cannot access other users' data.

### No Financial Advice
System prompt explicitly prohibits financial advice. Tools provide data only, not recommendations.

---

## Testing Status

### ✅ Completed
- Tool definitions created
- Tool execution functions implemented
- Consent checking logic
- Stub mode functionality

### ⚠️ Not Yet Tested
- Real OpenAI API calls with tool calling
- Tool call parsing and execution
- Error handling for API failures
- Edge cases (missing parameters, invalid tool calls)
- Multi-turn conversations with tool calls

### 📋 Testing Plan (Future)
1. Unit tests for each tool function
2. Integration tests with OpenAI API (test environment)
3. End-to-end tests with real user scenarios
4. Error handling tests (API failures, invalid parameters)
5. Performance tests (latency, rate limiting)

---

## Usage Examples

### Example 1: User Asks About Credit Utilization
**User:** "What's my credit utilization?"

**Expected Flow:**
1. LLM calls `get_user_signals` with `signal_types: ["credit"]`
2. Tool returns credit signals including utilization percentages
3. LLM calls `explain_financial_term` with `term: "credit utilization"`
4. LLM generates response explaining user's specific utilization in context

### Example 2: User Asks About Recommendations
**User:** "Why did I get recommended this article?"

**Expected Flow:**
1. LLM calls `get_user_recommendations` to see active recommendations
2. LLM calls `get_recommendation_details` for specific recommendation
3. LLM explains rationale using decision trace data

### Example 3: User Searches Transactions
**User:** "Show me my spending on restaurants last month"

**Expected Flow:**
1. LLM calls `search_user_transactions` with category and date range
2. Tool returns matching transactions
3. LLM summarizes spending patterns

---

## Configuration

### Environment Variables
```env
# OpenAI API Key (required if USE_LLM_STUB=false)
OPENAI_API_KEY="sk-..."

# Enable/disable stub mode (default: true)
USE_LLM_STUB="true"
```

### Code Configuration
```typescript
// backend/src/services/chat/chatService.ts
const USE_LLM_STUB = process.env.USE_LLM_STUB === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
```

---

## Future Enhancements

### Planned
1. **Content Generation:** Use LLM to generate educational article summaries
2. **Personalized Explanations:** Generate custom explanations for user's specific situation
3. **Natural Language Queries:** Allow users to ask questions in natural language

### Not Planned
- LLM-generated recommendations (templates provide better explainability)
- LLM-based persona assignment (rules-based provides better transparency)
- LLM analysis of external content (pre-tagged metadata provides better auditability)

---

## Known Limitations

1. **Not Production-Ready:** Tool calling not yet tested with real API calls
2. **Stub Mode Only:** System currently runs in stub mode by default
3. **No Error Handling:** API failure handling not yet implemented
4. **No Rate Limiting:** OpenAI API rate limits not yet handled
5. **No Caching:** Tool results not cached (may repeat API calls)

---

## Conclusion

The OpenAI tool calling infrastructure is **built but not yet tested**. The system is designed to enable conversational AI that can access user data in a controlled, read-only manner while maintaining strict guardrails against financial advice.

**Next Steps:**
1. Test tool calling with OpenAI API in development environment
2. Validate error handling and edge cases
3. Add comprehensive tests
4. Deploy to production once validated

---

**Document Version:** 1.0  
**Last Updated:** November 5, 2025

