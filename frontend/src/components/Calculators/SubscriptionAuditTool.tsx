import { useState, useEffect } from 'react';
import { Profile } from '../../services/api';

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

  useEffect(() => {
    // In a real implementation, this would come from the subscription signal's recurring_merchants
    // For now, create mock subscriptions based on the signal
    if (subscriptionSignal?.count > 0) {
      const mockSubs: Subscription[] = [];
      const monthlySpend = subscriptionSignal.monthly_spend || 0;
      const avgPerSub = monthlySpend / subscriptionSignal.count;
      
      for (let i = 0; i < subscriptionSignal.count; i++) {
        mockSubs.push({
          id: `sub_${i}`,
          name: `Subscription ${i + 1}`,
          amount: avgPerSub + (Math.random() - 0.5) * avgPerSub * 0.4, // Add some variance
          keeping: true,
        });
      }
      setSubscriptions(mockSubs);
    }
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
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Subscription Audit Tool</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Monthly</p>
            <p className="text-2xl font-bold text-gray-900">${totalMonthly.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Potential Savings</p>
            <p className="text-2xl font-bold text-green-600">${potentialSavings.toFixed(2)}/mo</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Annual Savings</p>
            <p className="text-2xl font-bold text-green-600">${annualSavings.toFixed(2)}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Subscriptions</h4>
          <div className="space-y-2">
            {subscriptions.length === 0 ? (
              <p className="text-sm text-gray-500">No subscriptions detected</p>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sub.keeping}
                      onChange={() => handleToggle(sub.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                      <p className="text-xs text-gray-500">${sub.amount.toFixed(2)}/month</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
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
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-gray-700">
              By canceling the selected subscriptions, you could save{' '}
              <strong>${potentialSavings.toFixed(2)}/month</strong> or{' '}
              <strong>${annualSavings.toFixed(2)}/year</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

