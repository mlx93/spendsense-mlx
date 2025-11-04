# Persona Scores Explanation

## Why Persona Scores Don't Add Up to 100%

Persona scores in SpendSense represent **confidence/match scores** (ranging from 0.0 to 1.0, displayed as 0-100%), not percentages that must sum to 100%.

### How Persona Scoring Works

Each persona is scored independently based on how well a user's behavioral signals match that persona's criteria:

1. **High Utilization Persona:**
   - Scores based on: Credit utilization %, interest charges, overdue status, minimum payment patterns
   - Example: 80% utilization + interest charges + overdue = 50% match score

2. **Variable Income Persona:**
   - Scores based on: Income gap days, cash flow buffer, income frequency
   - Example: 45+ gap days + low cash buffer = 40% match score

3. **Subscription-Heavy Persona:**
   - Scores based on: Subscription count, monthly spend, share of total
   - Example: 5+ subscriptions + high spend = 50% match score

4. **Savings Builder Persona:**
   - Scores based on: Savings growth rate, net inflow, emergency fund coverage, low credit utilization
   - Example: Positive savings + low utilization = 45% match score

5. **Net Worth Maximizer Persona:**
   - Scores based on: Savings rate, monthly savings, total liquid savings, cash flow buffer, very low utilization
   - Example: 30%+ savings rate + high balance + low utilization = 70% match score

### Example Scores

**User with High Utilization + Variable Income:**
- Primary Persona: High Utilization (Score: 50%)
- Secondary Persona: Variable Income (Score: 30%)
- **Total: 80%** (not 100%)

**Why this makes sense:**
- The user has strong signals for both personas
- They're independently confident in each match
- A user can match multiple personas to varying degrees
- The scores reflect confidence, not a distribution

### Persona Assignment Rules

1. **Primary Persona:** Highest scoring persona (or Net Worth Maximizer if score ≥ 30%, due to prioritization)
2. **Secondary Persona:** Second-highest scoring persona, **only if score ≥ 30%**
3. **No Persona:** If no persona scores ≥ 0.1, default to "savings_builder" with 10% score

### Why Independent Scores?

This design allows users to:
- Match multiple personas simultaneously (e.g., high utilization + variable income)
- Have varying confidence levels across personas
- Receive diversified recommendations based on both primary and secondary personas
- Reflect the complexity of real financial behavior (people don't fit into single categories)

### Display in Operator View

When viewing a user in the Operator page:
- **Primary Persona:** Shows highest score (e.g., "high_utilization: 50%")
- **Secondary Persona:** Shows second-highest score if ≥ 30% (e.g., "variable_income: 30%")
- These scores are **independent** and don't need to sum to 100%

### Technical Details

- Scores are computed in `backend/src/personas/scoringEngine.ts`
- Each persona has a scoring algorithm that adds points based on criteria met
- Scores are capped at 1.0 (100%)
- Final scores are sorted and assigned ranks (1 = primary, 2 = secondary)

