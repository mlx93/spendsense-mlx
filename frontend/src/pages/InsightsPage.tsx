import { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { profileApi, Profile } from '../services/api';

export default function InsightsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const response = await profileApi.getProfile(user.id);
      setProfile(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!profile) {
    return <div className="text-center py-12">No profile data available</div>;
  }

  const signals30d = profile.signals['30d'];
  const creditSignal = signals30d?.credit;
  const savingsSignal = signals30d?.savings;
  const subscriptionSignal = signals30d?.subscription;
  const incomeSignal = signals30d?.income;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Your Financial Insights</h1>

      {/* Financial Snapshot */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Monthly Income</p>
            <p className="text-2xl font-bold text-gray-900">
              ${incomeSignal?.average_monthly_income?.toFixed(0) || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Credit Utilization</p>
            <p className="text-2xl font-bold text-gray-900">
              {creditSignal?.max_utilization ? `${Math.round(creditSignal.max_utilization * 100)}%` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Savings Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              ${savingsSignal?.savings_balance?.toFixed(0) || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Subscriptions</p>
            <p className="text-2xl font-bold text-gray-900">
              {subscriptionSignal?.count || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Credit Health */}
      {creditSignal && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Health</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Max Utilization</span>
              <span className="font-semibold">
                {creditSignal.max_utilization ? `${Math.round(creditSignal.max_utilization * 100)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Utilization</span>
              <span className="font-semibold">
                {creditSignal.avg_utilization ? `${Math.round(creditSignal.avg_utilization * 100)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Interest Charges</span>
              <span className="font-semibold">${creditSignal.interest_charges?.toFixed(2) || '0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum Payment Only</span>
              <span className="font-semibold">{creditSignal.minimum_payment_only ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Any Overdue</span>
              <span className="font-semibold">{creditSignal.any_overdue ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Savings Progress */}
      {savingsSignal && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Savings Progress</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Current Balance</span>
              <span className="font-semibold">${savingsSignal.savings_balance?.toFixed(2) || '0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Net Inflow</span>
              <span className="font-semibold">${savingsSignal.net_inflow?.toFixed(2) || '0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Growth Rate</span>
              <span className="font-semibold">
                {savingsSignal.growth_rate ? `${Math.round(savingsSignal.growth_rate * 100)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Emergency Fund Coverage</span>
              <span className="font-semibold">
                {savingsSignal.emergency_fund_coverage?.toFixed(1) || '0'} months
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Income Analysis */}
      {incomeSignal && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Income Analysis</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Pay Frequency</span>
              <span className="font-semibold capitalize">{incomeSignal.frequency || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Median Pay Gap</span>
              <span className="font-semibold">{incomeSignal.median_gap_days || 0} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Income Variability</span>
              <span className="font-semibold">
                {incomeSignal.income_variability ? `${Math.round(incomeSignal.income_variability * 100)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cash Flow Buffer</span>
              <span className="font-semibold">
                {incomeSignal.cash_flow_buffer?.toFixed(1) || '0'} months
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Details */}
      {subscriptionSignal && subscriptionSignal.count > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscriptions</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Subscriptions</span>
              <span className="font-semibold">{subscriptionSignal.count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Spend</span>
              <span className="font-semibold">${subscriptionSignal.monthly_spend?.toFixed(2) || '0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Share of Total Spending</span>
              <span className="font-semibold">
                {subscriptionSignal.share_of_total ? `${Math.round(subscriptionSignal.share_of_total * 100)}%` : '0%'}
              </span>
            </div>
            {subscriptionSignal.recurring_merchants && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Recurring Merchants:</p>
                <div className="flex flex-wrap gap-2">
                  {subscriptionSignal.recurring_merchants.map((merchant: string, idx: number) => (
                    <span key={idx} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                      {merchant}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Personas</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">30-Day Window</h3>
            {profile.personas['30d'].primary && (
              <div className="bg-blue-50 p-4 rounded">
                <p className="font-semibold">Primary: {profile.personas['30d'].primary.type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-600">
                  Score: {Math.round((profile.personas['30d'].primary?.score || 0) * 100)}%
                </p>
              </div>
            )}
            {profile.personas['30d'].secondary && (
              <div className="bg-gray-50 p-4 rounded mt-2">
                <p className="font-semibold">Secondary: {profile.personas['30d'].secondary.type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-600">
                  Score: {Math.round((profile.personas['30d'].secondary?.score || 0) * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
