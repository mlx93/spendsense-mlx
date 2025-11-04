import { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { profileApi, Profile, transactionsApi, SpendingPatterns, recommendationsApi } from '../services/api';
import EmergencyFundCalculator from '../components/Calculators/EmergencyFundCalculator';
import DebtPayoffSimulator from '../components/Calculators/DebtPayoffSimulator';
import SubscriptionAuditTool from '../components/Calculators/SubscriptionAuditTool';
import LoadingOverlay from '../components/LoadingOverlay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber } from '../utils/format';

export default function InsightsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spendingPatterns, setSpendingPatterns] = useState<SpendingPatterns | null>(null);
  const [spendingPatternsCache, setSpendingPatternsCache] = useState<Record<number, SpendingPatterns>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingWindow, setUpdatingWindow] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<30 | 90 | 180>(30);

  const loadProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Load profile and initial spending patterns in parallel
      const [profileResponse, spendingResponse] = await Promise.all([
        profileApi.getProfile(user.id),
        transactionsApi.getSpendingPatterns(selectedWindow),
      ]);
      setProfile(profileResponse.data);
      setSpendingPatterns(spendingResponse.data);
      setSpendingPatternsCache({ [selectedWindow]: spendingResponse.data });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWindowChange = async (window: 30 | 90 | 180) => {
    if (window === selectedWindow) return;
    
    // Check cache first
    if (spendingPatternsCache[window]) {
      setSpendingPatterns(spendingPatternsCache[window]);
      setSelectedWindow(window);
      return;
    }

    // Load new data with overlay
    setUpdatingWindow(true);
    try {
      const spendingResponse = await transactionsApi.getSpendingPatterns(window);
      setSpendingPatterns(spendingResponse.data);
      setSpendingPatternsCache(prev => ({ ...prev, [window]: spendingResponse.data }));
      setSelectedWindow(window);
    } catch (error) {
      console.error('Error loading spending patterns:', error);
    } finally {
      setUpdatingWindow(false);
    }
  };

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    
    try {
      setRefreshing(true);
      setUpdatingWindow(true); // Show full-page overlay
      // Trigger refresh which regenerates signals and personas
      await recommendationsApi.getRecommendations(user.id, 'active', true);
      // Reload profile data to get updated signals
      await loadProfile();
    } catch (error) {
      console.error('Error refreshing insights:', error);
      alert('Failed to refresh insights. Please try again.');
    } finally {
      setRefreshing(false);
      setUpdatingWindow(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  if (loading && !profile) {
    return (
      <>
        <LoadingOverlay isLoading={true} message="Loading your insights..." />
        <div className="text-center py-12">Loading...</div>
      </>
    );
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
    <>
      <LoadingOverlay isLoading={refreshing || updatingWindow} message={refreshing ? "Refreshing insights..." : "Updating data..."} />
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Your Financial Insights</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Top Row: Category Breakdown (Left) + Financial Snapshot (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category Breakdown - Left Column */}
          {spendingPatterns && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Spending Patterns</h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleWindowChange(30)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedWindow === 30
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    1M
                  </button>
                  <button
                    onClick={() => handleWindowChange(90)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedWindow === 90
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    3M
                  </button>
                  <button
                    onClick={() => handleWindowChange(180)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedWindow === 180
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    6M
                  </button>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(spendingPatterns.categoryBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                        <tr key={category} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                            {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-semibold text-gray-900">
                            {formatCurrency(amount)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-gray-600">
                            {spendingPatterns.totalSpending > 0
                              ? `${((amount / spendingPatterns.totalSpending) * 100).toFixed(1)}%`
                              : '0%'}
                          </td>
                        </tr>
                      ))}
                    {/* Total Row */}
                    <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        Total
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-bold text-gray-900">
                        {formatCurrency(spendingPatterns.totalSpending)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-bold text-gray-900">
                        100.0%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Snapshot - Right Column */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Financial Snapshot</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Monthly Income</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(incomeSignal?.average_monthly_income || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Credit Utilization</p>
                <p className="text-lg font-bold text-gray-900">
                  {creditSignal?.max_utilization ? `${Math.round(creditSignal.max_utilization * 100)}%` : ''}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Savings Balance</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(savingsSignal?.savings_balance || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Subscriptions</p>
                <p className="text-lg font-bold text-gray-900">
                  {subscriptionSignal?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Spending by Month (Left) + Savings by Month (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Spending by Month Chart - Left */}
          {spendingPatterns && spendingPatterns.spendingByMonth && Object.keys(spendingPatterns.spendingByMonth).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Spending by Month</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={Object.entries(spendingPatterns.spendingByMonth)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, amount]) => {
                      // Format month as "Jan 2024"
                      const [year, monthNum] = month.split('-');
                      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      return {
                        month: monthName,
                        amount: Math.round(amount),
                      };
                    })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${formatNumber(value)}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Spending']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Savings by Month Chart - Right */}
          {(() => {
            // Check if savingsByMonth exists and has data
            const savingsByMonth = savingsSignal?.savingsByMonth;
            const hasSavingsData = savingsByMonth && typeof savingsByMonth === 'object' && Object.keys(savingsByMonth).length > 0;
            
            if (!hasSavingsData) {
              // Show placeholder if no data available
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">Savings by Month</h2>
                  <div className="flex items-center justify-center h-[250px] text-sm text-gray-500">
                    No savings data available. Refresh insights to generate chart.
                  </div>
                </div>
              );
            }
            
            // Filter months based on selectedWindow (1M=30, 3M=90, 6M=180 days)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - selectedWindow);
            // Get the month key for the cutoff date (inclusive - include the month that contains the cutoff date)
            const cutoffMonthKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Filter and sort months within the selected window
            // Include all months from cutoff month onwards (string comparison works for YYYY-MM format)
            const filteredMonths = Object.entries(savingsByMonth)
              .filter(([monthKey]) => monthKey >= cutoffMonthKey)
              .sort(([a], [b]) => a.localeCompare(b));
            
            // Debug logging in development
            if (import.meta.env.DEV) {
              const allMonthsData = Object.entries(savingsByMonth)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => ({ month: k, balance: v }));
              const filteredMonthsData = filteredMonths.map(([k, v]) => ({ month: k, balance: v }));
              console.log('[Savings Chart] Filtering:', {
                selectedWindow,
                cutoffDate: cutoffDate.toISOString().split('T')[0],
                cutoffMonthKey,
                totalMonths: Object.keys(savingsByMonth).length,
                filteredMonths: filteredMonths.length,
                allMonthsData,
                filteredMonthsData,
              });
            }
            
            if (filteredMonths.length === 0) {
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">Savings by Month</h2>
                  <div className="flex items-center justify-center h-[250px] text-sm text-gray-500">
                    No savings data for selected time period.
                  </div>
                </div>
              );
            }
            
            return (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Savings by Month</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={filteredMonths.map(([month, balance]) => {
                      // Format month as "Jan 2024"
                      const [year, monthNum] = month.split('-');
                      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      return {
                        month: monthName,
                        balance: Math.round(Number(balance)),
                      };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value > 0 ? `$${formatNumber(value)}` : ''}
                      domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Savings Balance']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    />
                    <Bar dataKey="balance" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>

        {/* Third Row: Savings Progress (Left) + Income Analysis (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Savings Progress - Left */}
          {savingsSignal && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Savings Progress</h2>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Current Balance</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(savingsSignal.savings_balance || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Monthly Inflow</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(savingsSignal.net_inflow || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Growth Rate</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {savingsSignal.growth_rate ? `${Math.round(savingsSignal.growth_rate * 100)}%` : '0%'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Emergency Coverage</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {savingsSignal.emergency_fund_coverage?.toFixed(1) || '0'} mo
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Income Analysis - Right */}
          {incomeSignal && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Income Analysis</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Pay Frequency</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {incomeSignal.frequency || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Median Pay Gap</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {incomeSignal.median_gap_days || 0} days
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Variability</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {incomeSignal.income_variability ? `${Math.round(incomeSignal.income_variability * 100)}%` : '0%'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 mb-0.5">Cash Flow Buffer</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {incomeSignal.cash_flow_buffer?.toFixed(1) || '0'} mo
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fourth Row: Spending Breakdown (Left) + Personas (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Spending Breakdown Stats - Left */}
          {spendingPatterns && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Spending Breakdown</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Recurring Spending</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(spendingPatterns.recurringVsOneTime.recurring)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">One-Time Spending</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(spendingPatterns.recurringVsOneTime.oneTime)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Total Spending</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(spendingPatterns.totalSpending)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Personas - Right */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Your Personas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profile.personas['30d'].primary && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold mb-1">Primary</p>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">
                    {profile.personas['30d'].primary.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-600">
                    Score: {Math.round((profile.personas['30d'].primary?.score || 0) * 100)}%
                  </p>
                </div>
              )}
              {profile.personas['30d'].secondary && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Secondary</p>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">
                    {profile.personas['30d'].secondary.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-600">
                    Score: {Math.round((profile.personas['30d'].secondary?.score || 0) * 100)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Details */}
        {subscriptionSignal && subscriptionSignal.count > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Subscriptions</h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-600 mb-0.5">Total</p>
                <p className="text-sm font-semibold text-gray-900">{subscriptionSignal.count}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-600 mb-0.5">Monthly Spend</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(subscriptionSignal.monthly_spend || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-600 mb-0.5">Share of Spending</p>
                <p className="text-sm font-semibold text-gray-900">
                  {subscriptionSignal.share_of_total ? `${Math.round(subscriptionSignal.share_of_total * 100)}%` : '0%'}
                </p>
              </div>
            </div>
            {subscriptionSignal.recurring_merchants && subscriptionSignal.recurring_merchants.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Recurring Merchants:</p>
                <div className="flex flex-wrap gap-2">
                  {subscriptionSignal.recurring_merchants.map((merchant: string, idx: number) => (
                    <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded-md text-xs text-gray-700">
                      {merchant}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Calculators */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Interactive Calculators</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EmergencyFundCalculator profile={profile} />
            <DebtPayoffSimulator profile={profile} />
          </div>
          
          {subscriptionSignal && subscriptionSignal.count > 0 && (
            <SubscriptionAuditTool profile={profile} />
          )}
        </div>
      </div>
    </>
  );
}
