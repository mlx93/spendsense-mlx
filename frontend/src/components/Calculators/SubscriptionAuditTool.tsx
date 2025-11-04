import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Profile, transactionsApi } from '../../services/api';
import { formatCurrency } from '../../utils/format';

interface SubscriptionAuditToolProps {
  profile: Profile;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  keeping: boolean;
}

export default function SubscriptionAuditTool({ profile }: SubscriptionAuditToolProps) {
  const subscriptionSignal = profile.signals['30d']?.subscription;
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!subscriptionSignal?.recurring_merchants || subscriptionSignal.recurring_merchants.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Get transactions to calculate individual subscription amounts
        const spendingData = await transactionsApi.getSpendingPatterns(30);
        
        // Group transactions by merchant and calculate monthly averages for recurring merchants
        const merchantTotals: Record<string, number> = {};
        const merchantCounts: Record<string, number> = {};
        
        spendingData.data.transactions.forEach(txn => {
          if (txn.merchant && subscriptionSignal.recurring_merchants.includes(txn.merchant)) {
            merchantTotals[txn.merchant] = (merchantTotals[txn.merchant] || 0) + txn.amount;
            merchantCounts[txn.merchant] = (merchantCounts[txn.merchant] || 0) + 1;
          }
        });

        // Calculate average monthly spend per merchant
        const subs: Subscription[] = subscriptionSignal.recurring_merchants.map((merchant: string, idx: number) => {
          const total = merchantTotals[merchant] || 0;
          const count = merchantCounts[merchant] || 1;
          // Average per transaction, multiplied by estimated monthly frequency (4 for weekly, 1 for monthly)
          const avgPerTransaction = count > 0 ? total / count : 0;
          // Estimate monthly: assume weekly subscriptions occur ~4x/month, monthly occur ~1x/month
          const estimatedMonthly = avgPerTransaction * (count >= 3 ? 4 : 1);
          
          return {
            id: `sub_${idx}`,
            name: merchant,
            amount: estimatedMonthly > 0 ? estimatedMonthly : (subscriptionSignal.monthly_spend || 0) / subscriptionSignal.count,
            keeping: true,
          };
        });

        setSubscriptions(subs);
      } catch (error) {
        console.error('Error loading subscriptions:', error);
        // Fallback to estimated amounts
        const monthlySpend = subscriptionSignal.monthly_spend || 0;
        const avgPerSub = monthlySpend / subscriptionSignal.count;
        const fallbackSubs = subscriptionSignal.recurring_merchants.map((merchant: string, idx: number) => ({
          id: `sub_${idx}`,
          name: merchant,
          amount: avgPerSub,
          keeping: true,
        }));
        setSubscriptions(fallbackSubs);
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptions();
  }, [subscriptionSignal]);

  const handleToggle = (id: string) => {
    setSubscriptions(subs =>
      subs.map(sub => sub.id === id ? { ...sub, keeping: !sub.keeping } : sub)
    );
  };

  const totalMonthly = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const potentialSavings = subscriptions
    .filter(sub => !sub.keeping)
    .reduce((sum, sub) => sum + sub.amount, 0);
  const annualSavings = potentialSavings * 12;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Subscription Audit Tool</h3>
      
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500">Total Monthly</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalMonthly)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Potential Savings</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(potentialSavings)}/mo</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Annual Savings</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(annualSavings)}</p>
          </div>
        </div>

        <div className="border-t pt-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Your Subscriptions</h4>
          <div className="space-y-1.5">
            {loading ? (
              <p className="text-sm text-gray-500">Loading subscriptions...</p>
            ) : subscriptions.length === 0 ? (
              <p className="text-sm text-gray-500">No subscriptions detected</p>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={sub.keeping}
                      onChange={() => handleToggle(sub.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(sub.amount)}/month</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      sub.keeping
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {sub.keeping ? 'Keeping' : 'Consider Canceling'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {potentialSavings > 0 && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-gray-700">
              By canceling the selected subscriptions, you could save{' '}
              <strong>{formatCurrency(potentialSavings)}/month</strong> or{' '}
              <strong>{formatCurrency(annualSavings)}/year</strong>.
            </p>
          </div>
        )}

        {/* Formula Transparency */}
        <details className="mt-2">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
            ▸ Show calculation formula
          </summary>
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono space-y-0.5">
            <p>Total Monthly = Σ(All Subscription Amounts)</p>
            <p>Potential Savings = Σ(Canceled Subscription Amounts)</p>
            <p>Annual Savings = Potential Savings × 12</p>
          </div>
        </details>

        {/* Take Action Button */}
        <div className="pt-3 border-t">
          <Link
            to="/library?topic=budgeting&search=subscription"
            className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Learn About Subscription Management →
          </Link>
        </div>
      </div>
    </div>
  );
}

