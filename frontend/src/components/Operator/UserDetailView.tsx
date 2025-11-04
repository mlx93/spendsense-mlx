import { useState, useEffect } from 'react';
import { operatorApi } from '../../services/api';

interface UserDetail {
  user: {
    id: string;
    email: string;
    consentStatus: boolean;
    createdAt: string;
  };
  accounts?: Array<{
    accountId: string;
    balance: number;
    limit: number | null;
    utilization: number | null;
  }>;
  signals: {
    '30d': any;
    '180d': any;
  };
  personas: {
    '30d': {
      primary: { type: string; score: number; criteria_met?: string[] } | null;
      secondary: { type: string; score: number; criteria_met?: string[] } | null;
    };
    '180d': {
      primary: { type: string; score: number; criteria_met?: string[] } | null;
      secondary: { type: string; score: number; criteria_met?: string[] } | null;
    };
  };
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    rationale: string;
    decisionTrace?: any;
    agenticReviewStatus: string;
  }>;
}

interface UserDetailViewProps {
  userId: string;
  onClose: () => void;
}

// Helper function to render key signals for each persona type
function renderKeySignals(personaType: string, signals: any, accounts?: Array<{ accountId: string; balance: number; limit: number | null; utilization: number | null }>, score?: number) {
  const creditSignal = signals?.credit || {};
  const subscriptionSignal = signals?.subscription || {};
  const savingsSignal = signals?.savings || {};
  const incomeSignal = signals?.income || {};

  switch (personaType) {
    case 'high_utilization': {
      const maxUtilAccount = accounts?.reduce((max, acc) => 
        (!max || (acc.utilization && acc.utilization > (max.utilization || 0))) ? acc : max, 
        null as typeof accounts[0] | null
      );
      
      return (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Key Flags</p>
          {score !== undefined && (
            <p className="text-xs text-gray-600 text-center mb-1.5">Score: {score}%</p>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs max-w-md mx-auto">
            {maxUtilAccount && (
              <>
                <span className="text-gray-600">Max Credit Utilization:</span>
                <span className="font-semibold text-red-600 text-right">
                  {maxUtilAccount.utilization ? Math.round(maxUtilAccount.utilization * 100) : 0}%
                </span>
              </>
            )}
            {maxUtilAccount && (
              <>
                <span className="text-gray-600">Balance:</span>
                <span className="font-medium text-gray-900 text-right">${Math.round(maxUtilAccount.balance).toLocaleString()}</span>
              </>
            )}
            {maxUtilAccount && maxUtilAccount.limit && (
              <>
                <span className="text-gray-600">Limit:</span>
                <span className="font-medium text-gray-900 text-right">${Math.round(maxUtilAccount.limit).toLocaleString()}</span>
              </>
            )}
            {creditSignal.interest_charges > 0 && (
              <>
                <span className="text-gray-600">Monthly Interest Charges:</span>
                <span className="font-semibold text-red-600 text-right">${creditSignal.interest_charges.toFixed(2)}</span>
              </>
            )}
            {creditSignal.any_overdue && (
              <>
                <span className="text-gray-600">Payment Status:</span>
                <span className="font-semibold text-red-600 text-right">⚠️ Overdue</span>
              </>
            )}
            {creditSignal.minimum_payment_only && (
              <>
                <span className="text-gray-600">Payment Pattern:</span>
                <span className="font-semibold text-orange-600 text-right">Making minimum payments only</span>
              </>
            )}
            {creditSignal.max_utilization && (
              <>
                <span className="text-gray-600">Avg Utilization:</span>
                <span className="font-medium text-gray-900 text-right">{Math.round(creditSignal.max_utilization * 100)}%</span>
              </>
            )}
          </div>
        </div>
      );
    }

    case 'variable_income': {
      return (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Key Flags</p>
          {score !== undefined && (
            <p className="text-xs text-gray-600 text-center mb-1.5">Score: {score}%</p>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs max-w-md mx-auto">
            {incomeSignal.median_gap_days && (
              <>
                <span className="text-gray-600">Median Gap Between Paychecks:</span>
                <span className="font-semibold text-yellow-600 text-right">{incomeSignal.median_gap_days} days</span>
              </>
            )}
            {incomeSignal.cash_flow_buffer !== undefined && (
              <>
                <span className="text-gray-600">Cash Flow Buffer:</span>
                <span className={`font-semibold text-right ${incomeSignal.cash_flow_buffer < 1.0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {incomeSignal.cash_flow_buffer.toFixed(1)} months
                </span>
              </>
            )}
            {incomeSignal.frequency && (
              <>
                <span className="text-gray-600">Income Frequency:</span>
                <span className="font-medium text-gray-900 text-right capitalize">{incomeSignal.frequency.replace(/_/g, ' ')}</span>
              </>
            )}
            {incomeSignal.average_monthly_income && (
              <>
                <span className="text-gray-600">Avg Monthly Income:</span>
                <span className="font-medium text-gray-900 text-right">${Math.round(incomeSignal.average_monthly_income).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      );
    }

    case 'subscription_heavy': {
      return (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Key Flags</p>
          {score !== undefined && (
            <p className="text-xs text-gray-600 text-center mb-1.5">Score: {score}%</p>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs max-w-md mx-auto">
            {subscriptionSignal.count > 0 && (
              <>
                <span className="text-gray-600">Active Subscriptions:</span>
                <span className="font-semibold text-purple-600 text-right">{subscriptionSignal.count}</span>
              </>
            )}
            {subscriptionSignal.monthly_spend > 0 && (
              <>
                <span className="text-gray-600">Monthly Subscription Spend:</span>
                <span className="font-semibold text-purple-600 text-right">${Math.round(subscriptionSignal.monthly_spend)}</span>
              </>
            )}
            {subscriptionSignal.share_of_total > 0 && (
              <>
                <span className="text-gray-600">Share of Total Spending:</span>
                <span className="font-medium text-gray-900 text-right">{Math.round(subscriptionSignal.share_of_total * 100)}%</span>
              </>
            )}
            {subscriptionSignal.recurring_merchants && subscriptionSignal.recurring_merchants.length > 0 && (
              <>
                <span className="text-gray-600">Top Merchants:</span>
                <span className="font-medium text-gray-900 text-right">
                  {subscriptionSignal.recurring_merchants.slice(0, 3).join(', ')}
                  {subscriptionSignal.recurring_merchants.length > 3 && ` +${subscriptionSignal.recurring_merchants.length - 3}`}
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    case 'savings_builder': {
      return (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Key Flags</p>
          {score !== undefined && (
            <p className="text-xs text-gray-600 text-center mb-1.5">Score: {score}%</p>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs max-w-md mx-auto">
            {savingsSignal.net_inflow !== undefined && (
              <>
                <span className="text-gray-600">Monthly Net Inflow:</span>
                <span className={`font-semibold text-right ${savingsSignal.net_inflow > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  ${savingsSignal.net_inflow > 0 ? '+' : ''}{Math.round(savingsSignal.net_inflow)}
                </span>
              </>
            )}
            {savingsSignal.growth_rate !== undefined && (
              <>
                <span className="text-gray-600">Savings Growth Rate:</span>
                <span className="font-semibold text-green-600 text-right">
                  {savingsSignal.growth_rate > 0 ? '+' : ''}{(savingsSignal.growth_rate * 100).toFixed(1)}%
                </span>
              </>
            )}
            {savingsSignal.emergency_fund_coverage !== undefined && (
              <>
                <span className="text-gray-600">Emergency Fund Coverage:</span>
                <span className="font-medium text-gray-900 text-right">{savingsSignal.emergency_fund_coverage.toFixed(1)} months</span>
              </>
            )}
            {savingsSignal.savings_balance !== undefined && (
              <>
                <span className="text-gray-600">Total Savings Balance:</span>
                <span className="font-medium text-gray-900 text-right">${Math.round(savingsSignal.savings_balance).toLocaleString()}</span>
              </>
            )}
            {accounts && accounts.length > 0 && (
              <>
                <span className="text-gray-600">Credit Utilization:</span>
                <span className="font-medium text-green-600 text-right">
                  {accounts.reduce((max, acc) => Math.max(max, acc.utilization || 0), 0) < 0.3 ? '< 30%' : 'Moderate'}
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    case 'net_worth_maximizer': {
      const savingsRate = incomeSignal.average_monthly_income > 0 
        ? (savingsSignal.net_inflow || 0) / incomeSignal.average_monthly_income 
        : 0;
      
      return (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Key Flags</p>
          {score !== undefined && (
            <p className="text-xs text-gray-600 text-center mb-1.5">Score: {score}%</p>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs max-w-md mx-auto">
            {savingsRate > 0 && (
              <>
                <span className="text-gray-600">Savings Rate:</span>
                <span className="font-semibold text-blue-600 text-right">{Math.round(savingsRate * 100)}%</span>
              </>
            )}
            {savingsSignal.net_inflow > 0 && (
              <>
                <span className="text-gray-600">Monthly Savings:</span>
                <span className="font-semibold text-blue-600 text-right">${Math.round(savingsSignal.net_inflow).toLocaleString()}</span>
              </>
            )}
            {savingsSignal.savings_balance !== undefined && (
              <>
                <span className="text-gray-600">Total Liquid Savings:</span>
                <span className="font-semibold text-blue-600 text-right">${Math.round(savingsSignal.savings_balance).toLocaleString()}</span>
              </>
            )}
            {incomeSignal.cash_flow_buffer !== undefined && (
              <>
                <span className="text-gray-600">Cash Flow Buffer:</span>
                <span className="font-semibold text-blue-600 text-right">{incomeSignal.cash_flow_buffer.toFixed(1)} months</span>
              </>
            )}
            {accounts && accounts.length > 0 && (
              <>
                <span className="text-gray-600">Credit Utilization:</span>
                <span className="font-semibold text-green-600 text-right">
                  {accounts.reduce((max, acc) => Math.max(max, acc.utilization || 0), 0) < 0.1 ? '< 10%' : '< 20%'}
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export default function UserDetailView({ userId, onClose }: UserDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'recommendations' | 'audit'>('overview');
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<'30d' | '180d'>('30d');

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  const loadUserDetail = async () => {
    try {
      setLoading(true);
      const response = await operatorApi.getUserDetail(userId);
      setDetail(response.data);
    } catch (error) {
      console.error('Error loading user detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!detail) {
    return <div className="text-center py-12">User not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Details: {detail.user.email}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {(['overview', 'signals', 'recommendations', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-medium text-sm">{detail.user.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Consent Status</p>
              <p className={`font-medium ${detail.user.consentStatus ? 'text-green-600' : 'text-red-600'}`}>
                {detail.user.consentStatus ? 'Consented' : 'Not Consented'}
              </p>
            </div>
          </div>

          {/* Persona Assignments */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Persona Assignments (30d)</h3>
            {detail.personas['30d'].primary && (
              <div className="bg-blue-50 p-3 rounded mb-2">
                <p className="font-semibold text-gray-900 text-sm mb-0.5">
                  Primary: {detail.personas['30d'].primary.type.replace(/_/g, ' ')}
                </p>
                {renderKeySignals(detail.personas['30d'].primary.type, detail.signals['30d'], detail.accounts, Math.round(detail.personas['30d'].primary.score * 100))}
              </div>
            )}
            {detail.personas['30d'].secondary && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold text-gray-900 text-sm mb-0.5">
                  Secondary: {detail.personas['30d'].secondary.type.replace(/_/g, ' ')}
                </p>
                {renderKeySignals(detail.personas['30d'].secondary.type, detail.signals['30d'], detail.accounts, Math.round(detail.personas['30d'].secondary.score * 100))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500">Active Recommendations</p>
            <p className="text-2xl font-bold">{detail.recommendations.filter(r => r.status === 'active').length}</p>
          </div>
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedWindow('30d')}
              className={`px-4 py-2 rounded ${selectedWindow === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedWindow('180d')}
              className={`px-4 py-2 rounded ${selectedWindow === '180d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              180 Days
            </button>
          </div>
          <div className="space-y-4">
            {detail.signals[selectedWindow] && Object.entries(detail.signals[selectedWindow]).map(([key, value]) => (
              <div key={key} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 capitalize">{key.replace(/_/g, ' ')}</h4>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {detail.recommendations.map((rec) => {
            const relevanceScore = rec.decisionTrace?.relevance_score;
            const hasRelevanceScore = typeof relevanceScore === 'number';
            
            return (
            <div key={rec.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                    {hasRelevanceScore && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-gray-500">Relevance:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          relevanceScore >= 0.8 ? 'bg-green-100 text-green-800' :
                          relevanceScore >= 0.7 ? 'bg-blue-100 text-blue-800' :
                          relevanceScore >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(relevanceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{rec.rationale}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.status === 'active' ? 'bg-green-100 text-green-800' :
                      rec.status === 'hidden' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rec.status}
                    </span>
                    {rec.agenticReviewStatus === 'flagged' && (
                      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                        FLAGGED
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRec(selectedRec === rec.id ? null : rec.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {selectedRec === rec.id ? 'Hide Trace' : 'View Trace'}
                </button>
              </div>
              {selectedRec === rec.id && rec.decisionTrace && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-semibold text-gray-900 mb-2">Decision Trace</h5>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(rec.decisionTrace, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="text-center py-12 text-gray-500">
          Audit log feature coming soon. This would show operator actions on this user.
        </div>
      )}
    </div>
  );
}

