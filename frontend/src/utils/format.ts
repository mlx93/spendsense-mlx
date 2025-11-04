/**
 * Format a number as currency with commas for thousands
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with commas (for non-currency amounts)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Extract last 4 numeric digits from an account ID
 * Falls back to last 4 characters if no numeric digits found
 */
export function extractLast4Digits(accountId: string): string {
  // Extract all numeric digits
  const digits = accountId.replace(/\D/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  }
  // Fallback to last 4 characters if not enough digits
  return accountId.slice(-4);
}

