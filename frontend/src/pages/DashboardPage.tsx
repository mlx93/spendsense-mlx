import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { recommendationsApi, profileApi, Recommendation } from '../services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [refreshStatus, setRefreshStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Array<{ type: 'critical' | 'warning' | 'info'; message: string }>>([]);

  useEffect(() => {
    if (user && user.consentStatus) {
      // Only load data if user has consented (consent modal handled at app level)
        loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load profile to check alerts
      const profileResponse = await profileApi.getProfile(user.id);

      // Generate alerts based on profile
      const newAlerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string }> = [];
      const creditSignal = profileResponse.data.signals['30d']?.credit;
      
      if (creditSignal?.any_overdue) {
        newAlerts.push({
          type: 'critical',
          message: 'One or more credit cards are overdue. Please make payments immediately.',
        });
      } else if (creditSignal?.max_utilization > 0.8) {
        newAlerts.push({
          type: 'critical',
          message: `High credit utilization detected (${Math.round(creditSignal.max_utilization * 100)}%). Consider paying down balances.`,
        });
      } else if (creditSignal?.max_utilization > 0.5) {
        newAlerts.push({
          type: 'warning',
          message: `Credit utilization is ${Math.round(creditSignal.max_utilization * 100)}%. Keeping it below 30% may help your credit score.`,
        });
      }

      const savingsSignal = profileResponse.data.signals['30d']?.savings;
      if (savingsSignal?.savings_balance < 100) {
        newAlerts.push({
          type: 'critical',
          message: 'Low savings balance detected. Building an emergency fund is important.',
        });
      } else if (savingsSignal?.emergency_fund_coverage < 3) {
        newAlerts.push({
          type: 'info',
          message: `Your emergency fund covers ${savingsSignal.emergency_fund_coverage.toFixed(1)} months. Experts recommend 3-6 months.`,
        });
      }

      const subscriptionSignal = profileResponse.data.signals['30d']?.subscription;
      if (subscriptionSignal?.count >= 3) {
        newAlerts.push({
          type: 'info',
          message: `You have ${subscriptionSignal.count} recurring subscriptions totaling $${subscriptionSignal.monthly_spend.toFixed(2)}/month.`,
        });
      }

      setAlerts(newAlerts.slice(0, 2)); // Max 2 alerts

      // Load recommendations
      const recsResponse = await recommendationsApi.getRecommendations(user.id, 'active');
      setRecommendations(recsResponse.data.recommendations);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    try {
      setRefreshing(true);
      setRefreshProgress(0);
      setRefreshStatus('Analyzing your transactions...');
      
      // Trigger refresh - this starts background generation and returns immediately
      await recommendationsApi.getRecommendations(user.id, 'active', true);
      
      // Simulate progress with realistic steps
      const steps = [
        { progress: 20, status: 'Detecting spending patterns...' },
        { progress: 40, status: 'Analyzing credit utilization...' },
        { progress: 60, status: 'Identifying savings opportunities...' },
        { progress: 80, status: 'Generating personalized recommendations...' },
        { progress: 95, status: 'Finalizing insights...' },
      ];
      
      let currentStep = 0;
      progressInterval = setInterval(() => {
        if (currentStep < steps.length) {
          setRefreshProgress(steps[currentStep].progress);
          setRefreshStatus(steps[currentStep].status);
          currentStep++;
        } else {
          if (progressInterval) clearInterval(progressInterval);
        }
      }, 500); // Update every 500ms for smooth animation
      
      // Wait 3 seconds for background generation to complete, then reload data
      // This gives the backend time to generate new signals/personas/recommendations
      // Use retry logic in case generation takes a bit longer
      timeoutId = setTimeout(async () => {
        if (progressInterval) clearInterval(progressInterval);
        setRefreshProgress(100);
        setRefreshStatus('Loading your insights...');
        
        // Retry loading data up to 3 times with exponential backoff
        let retries = 0;
        const maxRetries = 3;
        const retryDelay = 1000; // Start with 1 second delay
        
        const attemptLoadData = async (): Promise<void> => {
          try {
            await loadData();
            setRefreshStatus('Complete!');
            // Clear status after a brief moment
            setTimeout(() => {
              setRefreshProgress(0);
              setRefreshStatus('');
            }, 500);
            setRefreshing(false);
          } catch (error: any) {
            console.error(`Error reloading data after refresh (attempt ${retries + 1}):`, error);
            
            // If it's a 500 error and we haven't exceeded retries, try again
            if (retries < maxRetries && (error?.response?.status === 500 || error?.response?.status === 404)) {
              retries++;
              setRefreshStatus(`Retrying... (${retries}/${maxRetries})`);
              // Exponential backoff: 1s, 2s, 4s
              setTimeout(() => attemptLoadData(), retryDelay * Math.pow(2, retries - 1));
            } else {
              // Final failure - show error but don't block UI
              setRefreshStatus('Some data may still be updating. Please refresh again if needed.');
              setTimeout(() => {
                setRefreshProgress(0);
                setRefreshStatus('');
                // Still reload to show what we have
                loadData().catch(() => {
                  // Ignore errors on final attempt
                });
              }, 2000);
              setRefreshing(false);
            }
          }
        };
        
        await attemptLoadData();
      }, 3000);
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
      if (progressInterval) clearInterval(progressInterval);
      if (timeoutId) clearTimeout(timeoutId);
      alert('Failed to refresh recommendations. Please try again.');
      setRefreshing(false);
      setRefreshProgress(0);
      setRefreshStatus('');
    }
  };

  const handleAction = async (recId: string, action: string) => {
    try {
      await recommendationsApi.submitFeedback(recId, action);
      if (action === 'dismissed' || action === 'completed') {
        setRecommendations(recs => recs.filter(r => r.id !== recId));
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!user?.consentStatus) {
    return (
      <div className="text-center py-12">
        <p className="text-lg mb-4">Enable personalized insights by allowing SpendSense to analyze your data.</p>
        <button
          onClick={async () => {
            await profileApi.updateConsent(true);
            loadData();
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          Enable Insights
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Critical Alert Banners */}
      {alerts.map((alert, idx) => {
        // Determine topic for "Learn more" link based on alert type
        let learnMoreTopic = '';
        if (alert.message.includes('credit') || alert.message.includes('utilization') || alert.message.includes('overdue')) {
          learnMoreTopic = 'credit';
        } else if (alert.message.includes('savings') || alert.message.includes('emergency fund')) {
          learnMoreTopic = 'savings';
        } else if (alert.message.includes('subscription')) {
          learnMoreTopic = 'budgeting';
        }

        return (
          <div
            key={idx}
            className={`p-4 rounded-md ${
              alert.type === 'critical'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : alert.type === 'warning'
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {alert.type === 'critical' && '🔴 '}
                {alert.type === 'warning' && '🟡 '}
                {alert.type === 'info' && 'ℹ️ '}
                {alert.message}
              </div>
              {learnMoreTopic && (
                <Link
                  to={`/library?topic=${learnMoreTopic}`}
                  className="ml-4 text-sm font-medium underline hover:no-underline whitespace-nowrap"
                >
                  Learn more →
                </Link>
              )}
            </div>
          </div>
        );
      })}

      {/* Recommendations Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">For You Today</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
        
        {/* Progress Bar */}
        {refreshing && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{refreshStatus || 'Generating insights...'}</span>
              <span className="text-sm text-gray-500">{refreshProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${refreshProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This usually takes 3-5 seconds. We're analyzing your latest transactions and updating your personalized recommendations.
            </p>
          </div>
        )}
        {recommendations.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            You're doing great! Check back later for new insights.
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{rec.title}</h3>
                    {expandedId === rec.id ? (
                      <div>
                        <p className="text-gray-700 mb-4">{rec.rationale}</p>
                        <p className="text-sm text-gray-500 mt-4">
                          This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-600">{rec.rationale.substring(0, 100)}...</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {expandedId !== rec.id ? (
                    <button
                      onClick={() => setExpandedId(rec.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Expand
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedId(null)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Collapse
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(rec.id, 'dismissed')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleAction(rec.id, 'saved')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Save for Later
                  </button>
                  <Link
                    to={`/article/${rec.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Learn More →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
